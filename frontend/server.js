/**
 * Qwen3 MCP Server - Complete Tool Server
 * Gives LM Studio's Qwen3 (or any local LLM) full coding capabilities
 *
 * Run with: node frontend/server.js
 */

import http from "http";
import https from "https";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, exec } from "child_process";
import { platform } from "os";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3847;
const SKILLS_DIR = path.join(__dirname, "..", "skills");
const MEMORY_DIR = path.join(os.homedir(), ".lmstudio-mcp-memory");
const PLANS_FILE = path.join(os.homedir(), ".lmstudio-mcp-plans.json");
const TASKS_FILE = path.join(os.homedir(), ".lmstudio-mcp-tasks.json");

// Default working directory for file operations
let workingDir = process.cwd();

// Background sessions
const sessions = new Map();
let sessionCounter = 0;

// In-memory state
let currentPlan = null;
let tasks = [];
let conversationLog = [];
let summaries = [];

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getWorkingDir() {
  return workingDir;
}

function setWorkingDir(dir) {
  workingDir = dir;
}

function resolvePath(p) {
  if (!p) return workingDir;
  if (path.isAbsolute(p)) return p;
  return path.resolve(workingDir, p);
}

function getShell() {
  if (platform() === "win32") {
    return { shell: "cmd.exe", shellFlag: "/c" };
  }
  return { shell: "/bin/bash", shellFlag: "-c" };
}

// HTTP request helper
function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const parsedUrl = new URL(url);

    const req = lib.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (url.startsWith("https") ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0",
        "Accept": options.accept || "*/*",
        ...options.headers,
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, options).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}

// JSON file helpers
async function loadJson(file, defaultValue = {}) {
  try {
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

async function saveJson(file, data) {
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// ═══════════════════════════════════════════════════════════════
// WEB SEARCH & IMAGES
// ═══════════════════════════════════════════════════════════════

// Bing image search (SafeSearch OFF)
async function searchImages(query) {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1&safeSearch=off`;
  const html = (await fetchUrl(url)).toString();

  const results = [];
  const regex = /murl&quot;:&quot;(https?:[^&]+?)&quot;/gi;
  let match;

  while ((match = regex.exec(html)) !== null && results.length < 20) {
    let imgUrl = match[1].replace(/\\u002f/g, "/").replace(/\\\//g, "/");
    try { imgUrl = decodeURIComponent(imgUrl); } catch {}
    results.push({ url: imgUrl, title: `Image ${results.length + 1}` });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
// SKILLS MANAGEMENT
// ═══════════════════════════════════════════════════════════════

async function listSkills() {
  const skills = [];
  try {
    const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(SKILLS_DIR, entry.name);
        const skill = { name: entry.name, path: skillPath };

        const instructionFiles = ['SKILL.md', 'skill.md', 'README.md', 'readme.md', 'instructions.md', 'INSTRUCTIONS.md'];
        for (const f of instructionFiles) {
          try {
            const content = await fs.readFile(path.join(skillPath, f), 'utf-8');
            skill.instructionFile = f;
            const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
            skill.description = lines[0]?.substring(0, 200) || 'No description';
            break;
          } catch {}
        }

        if (!skill.instructionFile) {
          skill.description = 'No instruction file found';
        }

        skills.push(skill);
      }
    }
  } catch (e) {
    // Skills directory doesn't exist
  }
  return skills;
}

async function loadSkill(skillName) {
  const skillPath = path.join(SKILLS_DIR, skillName);
  const result = { name: skillName, instructions: '', files: [], dependencies: [] };

  try {
    const instructionFiles = ['SKILL.md', 'skill.md', 'README.md', 'readme.md', 'instructions.md', 'INSTRUCTIONS.md'];
    for (const f of instructionFiles) {
      try {
        result.instructions = await fs.readFile(path.join(skillPath, f), 'utf-8');
        result.instructionFile = f;
        break;
      } catch {}
    }

    const entries = await fs.readdir(skillPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        result.files.push(entry.name);
      } else if (entry.isDirectory()) {
        result.files.push(entry.name + '/');
      }
    }

    if (result.instructions) {
      const npmMatches = result.instructions.match(/npm install[^\n`]*/g);
      if (npmMatches) {
        result.dependencies.push(...npmMatches.map(m => m.trim()));
      }
      const pipMatches = result.instructions.match(/pip install[^\n`]*/g);
      if (pipMatches) {
        result.dependencies.push(...pipMatches.map(m => m.trim()));
      }
      const tools = ['pandoc', 'LibreOffice', 'soffice', 'pdftoppm', 'ffmpeg', 'imagemagick'];
      for (const tool of tools) {
        if (result.instructions.toLowerCase().includes(tool.toLowerCase())) {
          result.dependencies.push(`Requires: ${tool}`);
        }
      }
    }

    return result;
  } catch (e) {
    return { error: `Skill not found: ${skillName}` };
  }
}

async function installSkillFromGithub(repoUrl) {
  let user, repoName, branch, subPath, skillName;

  const treeMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)/);
  if (treeMatch) {
    user = treeMatch[1];
    repoName = treeMatch[2];
    branch = treeMatch[3];
    subPath = treeMatch[4].replace(/\/$/, '');
    skillName = subPath.split('/').pop();
  } else {
    const repoMatch = repoUrl.match(/(?:https?:\/\/)?(?:github\.com\/)?([^\/]+)\/([^\/\s]+)/);
    if (!repoMatch) {
      return { error: 'Invalid GitHub URL format.' };
    }
    user = repoMatch[1];
    repoName = repoMatch[2].replace(/\.git$/, '');
    branch = 'main';
    subPath = null;
    skillName = repoName.replace(/^skill-/, '').replace(/-skill$/, '').replace(/^claude-code-skill-/, '');
  }

  const targetDir = path.join(SKILLS_DIR, skillName);

  try {
    await fs.access(targetDir);
    return { error: `Skill "${skillName}" already exists at ${targetDir}.` };
  } catch {}

  await fs.mkdir(SKILLS_DIR, { recursive: true });

  const tryDownload = async (branchName) => {
    const zipUrl = `https://github.com/${user}/${repoName}/archive/refs/heads/${branchName}.zip`;
    return await fetchUrl(zipUrl);
  };

  let zipBuffer;
  try {
    zipBuffer = await tryDownload(branch);
  } catch (e) {
    if (branch === 'main') {
      try {
        branch = 'master';
        zipBuffer = await tryDownload('master');
      } catch (e2) {
        return { error: `Failed to download: ${e2.message}` };
      }
    } else {
      return { error: `Failed to download: ${e.message}` };
    }
  }

  const tempZip = path.join(SKILLS_DIR, `${skillName}-temp.zip`);
  await fs.writeFile(tempZip, zipBuffer);

  const extractedRoot = `${repoName}-${branch}`;
  const sourcePath = subPath ? `${extractedRoot}/${subPath}` : extractedRoot;
  const tempScript = path.join(SKILLS_DIR, `install-${skillName}.ps1`);

  const psScript = `
$ErrorActionPreference = 'Stop'
$tempDir = Join-Path $env:TEMP "skill-extract-$(Get-Random)"
try {
    Expand-Archive -Path "${tempZip}" -DestinationPath $tempDir -Force
    $source = Join-Path $tempDir "${sourcePath.replace(/\//g, '\\')}"
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination "${targetDir}" -Recurse
        Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
        Remove-Item -Force "${tempZip}" -ErrorAction SilentlyContinue
        Remove-Item -Force "${tempScript}" -ErrorAction SilentlyContinue
        Write-Output "SUCCESS"
    } else {
        Write-Output "ERROR: Path not found"
    }
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
`;

  await fs.writeFile(tempScript, psScript);

  return new Promise((resolve) => {
    exec(`powershell -ExecutionPolicy Bypass -File "${tempScript}"`, { timeout: 60000 }, async (error, stdout, stderr) => {
      const output = stdout.trim();
      try { await fs.unlink(tempScript); } catch {}

      if (error || !output.includes('SUCCESS')) {
        resolve({ result: `Downloaded but extraction failed. Manual extract: ${tempZip}` });
        return;
      }

      try {
        await fs.access(targetDir);
        const skill = await loadSkill(skillName);
        let response = `Skill "${skillName}" installed!\nLocation: ${targetDir}\n`;
        if (skill.files) response += `Files: ${skill.files.join(', ')}\n`;
        if (skill.dependencies?.length > 0) {
          response += `\nDependencies:\n`;
          skill.dependencies.forEach(d => response += `  ${d}\n`);
        }
        resolve({ result: response });
      } catch (e) {
        resolve({ result: `Installation may have succeeded. Check ${targetDir}` });
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// COMMAND EXECUTION
// ═══════════════════════════════════════════════════════════════

async function runCommand(command, cwd, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const { shell, shellFlag } = getShell();
    const proc = spawn(shell, [shellFlag, command], {
      cwd: cwd || getWorkingDir(),
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        stdout: stdout.slice(0, 100000),
        stderr: stderr.slice(0, 100000),
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function runGit(args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", args, {
      cwd: cwd || getWorkingDir(),
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout || stderr || "(success, no output)");
      } else {
        reject(new Error(stderr || stdout || `Git exited with code ${code}`));
      }
    });

    proc.on("error", reject);
  });
}

// ═══════════════════════════════════════════════════════════════
// TOOL EXECUTION
// ═══════════════════════════════════════════════════════════════

async function executeTool(name, args) {
  try {
    switch (name) {
      // ─────────────────────────────────────────────────────────
      // SKILLS TOOLS
      // ─────────────────────────────────────────────────────────
      case "list_skills": {
        const skills = await listSkills();
        if (skills.length === 0) {
          return { result: `No skills installed.\n\nSkills directory: ${SKILLS_DIR}\n\nInstall with install_skill tool.` };
        }
        let response = `Installed Skills (${skills.length}):\n${'═'.repeat(50)}\n\n`;
        for (const s of skills) {
          response += `📦 ${s.name}\n   ${s.description}\n`;
          if (s.instructionFile) response += `   File: ${s.instructionFile}\n`;
          response += '\n';
        }
        return { result: response, skills };
      }

      case "load_skill": {
        const skill = await loadSkill(args.name);
        if (skill.error) return { result: skill.error, error: true };
        let response = `Skill: ${skill.name}\n${'═'.repeat(50)}\n\n`;
        response += `Files: ${skill.files.join(', ')}\n\n`;
        if (skill.dependencies?.length > 0) {
          response += `Dependencies:\n`;
          skill.dependencies.forEach(d => response += `  • ${d}\n`);
          response += '\n';
        }
        response += `Instructions:\n${'─'.repeat(50)}\n${skill.instructions}`;
        return { result: response, skill };
      }

      case "install_skill": {
        return await installSkillFromGithub(args.url);
      }

      // ─────────────────────────────────────────────────────────
      // TIME & CALCULATOR
      // ─────────────────────────────────────────────────────────
      case "get_current_time": {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' };
        return { result: `Current time: ${now.toLocaleDateString('en-US', options)}\nISO: ${now.toISOString()}\nUnix: ${Math.floor(now.getTime() / 1000)}` };
      }

      case "calculator": {
        try {
          const expr = args.expression
            .replace(/\^/g, '**')
            .replace(/sqrt/g, 'Math.sqrt')
            .replace(/sin/g, 'Math.sin')
            .replace(/cos/g, 'Math.cos')
            .replace(/tan/g, 'Math.tan')
            .replace(/log/g, 'Math.log10')
            .replace(/ln/g, 'Math.log')
            .replace(/abs/g, 'Math.abs')
            .replace(/floor/g, 'Math.floor')
            .replace(/ceil/g, 'Math.ceil')
            .replace(/round/g, 'Math.round')
            .replace(/pi/gi, 'Math.PI')
            .replace(/e(?![a-z])/gi, 'Math.E');

          if (!/^[0-9+\-*/().Math\s,sqrtincoablgflreudPIE]+$/.test(expr)) {
            return { result: `Invalid expression: ${args.expression}`, error: true };
          }

          const result = eval(expr);
          return { result: `${args.expression} = ${result}` };
        } catch (e) {
          return { result: `Calculation error: ${e.message}`, error: true };
        }
      }

      // ─────────────────────────────────────────────────────────
      // WEB TOOLS
      // ─────────────────────────────────────────────────────────
      case "fetch_url": {
        try {
          const html = (await fetchUrl(args.url)).toString();
          let text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();

          if (text.length > 10000) text = text.substring(0, 10000) + '\n\n... (truncated)';
          return { result: `Content from ${args.url}:\n\n${text}` };
        } catch (e) {
          return { result: `Failed to fetch URL: ${e.message}`, error: true };
        }
      }

      case "web_image_search": {
        const images = await searchImages(args.query);
        const results = images.slice(0, args.max_results || 10);
        const downloadCount = Math.min(args.download_count || 3, 5, results.length);
        const downloaded = [];

        const downloadDir = process.env.IMAGE_DOWNLOAD_DIR ||
          (process.platform === 'win32'
            ? `${process.env.USERPROFILE}\\lmstudio-images`
            : `${process.env.HOME}/lmstudio-images`);

        try {
          await fs.mkdir(downloadDir, { recursive: true });
          for (let i = 0; i < downloadCount; i++) {
            try {
              const imgUrl = results[i].url;
              const buffer = await fetchUrl(imgUrl, { accept: "image/*" });
              let ext = "jpg";
              const urlLower = imgUrl.toLowerCase();
              if (urlLower.includes(".png")) ext = "png";
              else if (urlLower.includes(".gif")) ext = "gif";
              else if (urlLower.includes(".webp")) ext = "webp";

              const safeQuery = args.query.replace(/[^a-z0-9]/gi, "_").substring(0, 30);
              const filename = `${safeQuery}_${i + 1}_${Date.now()}.${ext}`;
              const filepath = `${downloadDir}/${filename}`.replace(/\//g, path.sep);

              await fs.writeFile(filepath, buffer);
              downloaded.push(filepath);
            } catch (e) {}
          }
        } catch (e) {}

        let response = `Found ${results.length} images for "${args.query}".\n\n`;
        if (downloaded.length > 0) {
          response += `Downloaded ${downloaded.length} image(s):\n`;
          for (const fp of downloaded) response += `${fp}\n`;
          response += "\n";
        }
        response += "Image URLs:\n";
        results.forEach((r, i) => { response += `${i + 1}. ${r.url}\n`; });
        return { result: response, images: results, downloaded };
      }

      case "web_search": {
        const maxResults = args.max_results || 10;
        const results = [];

        try {
          const ddgUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(args.query)}&kp=-2`;
          const html = (await fetchUrl(ddgUrl)).toString();

          const resultRegex = /uddg=([^&"]+)[^"]*"[^>]*class=['"]result-link['"][^>]*>([^<]+)</gi;
          let match;

          while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
            try {
              const url = decodeURIComponent(match[1]);
              const title = match[2].trim();
              if (url.includes('duckduckgo.com/y.js') || url.includes('bing.com/aclick')) continue;
              if (title.length < 3) continue;
              results.push({ title, url, snippet: '' });
            } catch (e) { continue; }
          }

          const snippetRegex = /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;
          let snippetIndex = 0;
          while ((match = snippetRegex.exec(html)) !== null && snippetIndex < results.length) {
            const snippet = match[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
            if (snippet.length > 10 && results[snippetIndex]) {
              results[snippetIndex].snippet = snippet;
              snippetIndex++;
            }
          }
        } catch (e) {}

        if (results.length > 0) {
          let response = `Web search results for "${args.query}":\n\n`;
          results.forEach((r, i) => {
            response += `${i + 1}. ${r.title}\n   ${r.url}\n`;
            if (r.snippet) response += `   ${r.snippet}\n`;
            response += '\n';
          });
          return { result: response };
        }

        return { result: `No results found for "${args.query}". Try rephrasing.` };
      }

      case "wikipedia": {
        const topic = args.topic;

        try {
          const pageUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic.replace(/ /g, '_'))}`;
          const data = JSON.parse((await fetchUrl(pageUrl)).toString());

          if (data.extract && data.extract.length > 50) {
            let response = `Wikipedia: ${data.title}\n${'═'.repeat(50)}\n\n`;
            response += data.extract;
            if (data.content_urls?.desktop?.page) {
              response += `\n\nRead more: ${data.content_urls.desktop.page}`;
            }
            return { result: response };
          }
        } catch (e) {}

        if (args.search !== false) {
          try {
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&srlimit=5`;
            const searchData = JSON.parse((await fetchUrl(searchUrl)).toString());

            if (searchData.query?.search?.length > 0) {
              const firstResult = searchData.query.search[0];
              try {
                const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstResult.title.replace(/ /g, '_'))}`;
                const summaryData = JSON.parse((await fetchUrl(summaryUrl)).toString());

                if (summaryData.extract) {
                  let response = `Wikipedia: ${summaryData.title}\n${'═'.repeat(50)}\n\n`;
                  response += summaryData.extract;
                  if (summaryData.content_urls?.desktop?.page) {
                    response += `\n\nRead more: ${summaryData.content_urls.desktop.page}`;
                  }
                  return { result: response };
                }
              } catch (e) {}

              let response = `Wikipedia search results for "${topic}":\n\n`;
              for (const r of searchData.query.search) {
                const snippet = r.snippet.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
                response += `• ${r.title}\n  https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}\n  ${snippet}\n\n`;
              }
              return { result: response };
            }
          } catch (e) {}
        }

        return { result: `No Wikipedia article found for "${topic}".` };
      }

      // ─────────────────────────────────────────────────────────
      // FILESYSTEM TOOLS
      // ─────────────────────────────────────────────────────────
      case "read_file": {
        const filePath = resolvePath(args.file_path || args.path || args.filepath || args.file);
        if (!filePath) return { result: "Error: No file path provided", error: true };
        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split("\n");
        const offset = (args.offset || args.start_line || 1) - 1;
        const limit = args.limit || args.max_lines || lines.length;
        const selectedLines = lines.slice(offset, offset + limit);
        const numberedLines = selectedLines.map((line, i) => `${String(offset + i + 1).padStart(6)}\t${line}`).join("\n");
        return { result: numberedLines };
      }

      case "write_file": {
        const filePath = resolvePath(args.file_path || args.path || args.filepath || args.file);
        if (!filePath) return { result: "Error: No file path provided", error: true };
        const content = args.content ?? args.text ?? args.data ?? "";
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, content, "utf-8");
        return { result: `File written: ${filePath}` };
      }

      case "list_directory": {
        const dirPath = resolvePath(args.path || ".");
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const list = entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name)).sort().join("\n");
        return { result: list || "(empty directory)" };
      }

      case "create_directory": {
        const dirPath = resolvePath(args.path);
        await fs.mkdir(dirPath, { recursive: true });
        return { result: `Directory created: ${dirPath}` };
      }

      case "delete_file": {
        const targetPath = resolvePath(args.path);
        await fs.rm(targetPath, { recursive: false });
        return { result: `Deleted: ${targetPath}` };
      }

      case "move_file": {
        const sourcePath = resolvePath(args.source);
        const destPath = resolvePath(args.destination);
        await fs.rename(sourcePath, destPath);
        return { result: `Moved: ${sourcePath} -> ${destPath}` };
      }

      case "copy_file": {
        const sourcePath = resolvePath(args.source);
        const destPath = resolvePath(args.destination);
        await fs.copyFile(sourcePath, destPath);
        return { result: `Copied: ${sourcePath} -> ${destPath}` };
      }

      case "file_info": {
        const targetPath = resolvePath(args.path);
        const stat = await fs.stat(targetPath);
        const info = {
          path: targetPath,
          type: stat.isDirectory() ? "directory" : "file",
          size: stat.size,
          modified: stat.mtime.toISOString(),
          created: stat.birthtime.toISOString(),
        };
        return { result: JSON.stringify(info, null, 2) };
      }

      case "get_working_directory": {
        return { result: `Working directory: ${getWorkingDir()}` };
      }

      case "set_working_directory": {
        const newDir = resolvePath(args.path);
        const stat = await fs.stat(newDir);
        if (!stat.isDirectory()) {
          return { result: `Not a directory: ${newDir}`, error: true };
        }
        setWorkingDir(newDir);
        return { result: `Working directory set to: ${newDir}` };
      }

      // ─────────────────────────────────────────────────────────
      // EDIT TOOLS
      // ─────────────────────────────────────────────────────────
      case "edit_file": {
        const filePath = resolvePath(args.file_path);
        const content = await fs.readFile(filePath, "utf-8");

        if (!content.includes(args.old_string)) {
          return { result: `Error: String to replace not found in file.`, error: true };
        }

        if (!args.replace_all) {
          const count = content.split(args.old_string).length - 1;
          if (count > 1) {
            return { result: `Error: String appears ${count} times. Use replace_all or be more specific.`, error: true };
          }
        }

        let newContent;
        if (args.replace_all) {
          newContent = content.split(args.old_string).join(args.new_string);
        } else {
          newContent = content.replace(args.old_string, args.new_string);
        }

        await fs.writeFile(filePath, newContent, "utf-8");
        return { result: `File edited: ${filePath}` };
      }

      case "insert_at_line": {
        const filePath = resolvePath(args.file_path);
        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split("\n");
        const insertIndex = args.line - 1;

        if (insertIndex < 0 || insertIndex > lines.length) {
          return { result: `Invalid line number: ${args.line}`, error: true };
        }

        const newLines = args.content.split("\n");
        lines.splice(insertIndex, 0, ...newLines);
        await fs.writeFile(filePath, lines.join("\n"), "utf-8");
        return { result: `Inserted ${newLines.length} line(s) at line ${args.line}` };
      }

      case "replace_lines": {
        const filePath = resolvePath(args.file_path);
        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split("\n");
        const start = args.start_line - 1;
        const end = args.end_line;

        if (start < 0 || end > lines.length || start >= end) {
          return { result: `Invalid line range: ${args.start_line}-${args.end_line}`, error: true };
        }

        const newLines = args.content.split("\n");
        lines.splice(start, end - start, ...newLines);
        await fs.writeFile(filePath, lines.join("\n"), "utf-8");
        return { result: `Replaced lines ${args.start_line}-${args.end_line}` };
      }

      case "append_to_file": {
        const filePath = resolvePath(args.file_path);
        const content = await fs.readFile(filePath, "utf-8");
        const newContent = content.endsWith("\n") ? content + args.content : content + "\n" + args.content;
        await fs.writeFile(filePath, newContent, "utf-8");
        return { result: `Content appended to: ${filePath}` };
      }

      case "prepend_to_file": {
        const filePath = resolvePath(args.file_path);
        const content = await fs.readFile(filePath, "utf-8");
        const newContent = args.content + "\n" + content;
        await fs.writeFile(filePath, newContent, "utf-8");
        return { result: `Content prepended to: ${filePath}` };
      }

      // ─────────────────────────────────────────────────────────
      // BASH/COMMAND TOOLS
      // ─────────────────────────────────────────────────────────
      case "execute_command":
      case "run_shell_command": {
        const cwd = args.cwd || getWorkingDir();
        const result = await runCommand(args.command, cwd, args.timeout || 120000);

        let output = `[Working directory: ${cwd}]\n\n`;
        if (result.stdout) output += result.stdout;
        if (result.stderr) output += (result.stdout ? "\n\n--- STDERR ---\n" : "") + result.stderr;
        if (!result.stdout && !result.stderr) output += "(no output)";
        output += `\n\n[Exit code: ${result.exitCode}]`;

        return { result: output };
      }

      case "execute_background": {
        const sessionId = `bg_${++sessionCounter}`;
        const { shell, shellFlag } = getShell();
        const cwd = args.cwd || getWorkingDir();

        const proc = spawn(shell, [shellFlag, args.command], {
          cwd: cwd,
          env: process.env,
          detached: true,
        });

        const session = {
          id: sessionId,
          command: args.command,
          cwd: cwd,
          pid: proc.pid,
          process: proc,
          output: "",
          startTime: new Date().toISOString(),
        };

        proc.stdout.on("data", (data) => {
          session.output += data.toString();
          if (session.output.length > 50000) session.output = session.output.slice(-50000);
        });

        proc.stderr.on("data", (data) => {
          session.output += data.toString();
          if (session.output.length > 50000) session.output = session.output.slice(-50000);
        });

        proc.on("close", (code) => {
          session.exitCode = code;
          session.endTime = new Date().toISOString();
        });

        sessions.set(sessionId, session);
        return { result: `Background session started: ${sessionId}\nPID: ${proc.pid}\nCommand: ${args.command}` };
      }

      case "read_output": {
        const session = sessions.get(args.session_id);
        if (!session) return { result: `Session not found: ${args.session_id}`, error: true };
        const status = session.exitCode !== undefined ? `Exited (${session.exitCode})` : "Running";
        return { result: `Session: ${session.id}\nStatus: ${status}\n\n${session.output || "(no output yet)"}` };
      }

      case "kill_session": {
        const session = sessions.get(args.session_id);
        if (!session) return { result: `Session not found: ${args.session_id}`, error: true };

        try {
          if (platform() === "win32") {
            spawn("taskkill", ["/pid", session.pid.toString(), "/f", "/t"]);
          } else {
            process.kill(-session.pid, "SIGTERM");
          }
        } catch (e) {}

        sessions.delete(args.session_id);
        return { result: `Session killed: ${args.session_id}` };
      }

      case "list_sessions": {
        if (sessions.size === 0) return { result: "No active sessions" };
        const list = Array.from(sessions.values()).map((s) => ({
          id: s.id,
          command: s.command,
          status: s.exitCode !== undefined ? `Exited (${s.exitCode})` : "Running",
        }));
        return { result: JSON.stringify(list, null, 2) };
      }

      // ─────────────────────────────────────────────────────────
      // SEARCH TOOLS
      // ─────────────────────────────────────────────────────────
      case "glob_search": {
        // Simple glob implementation using fs
        const baseDir = resolvePath(args.cwd || ".");
        const pattern = args.pattern;

        // For simple patterns, use recursive readdir
        const files = [];
        const walk = async (dir, depth = 0) => {
          if (depth > 10) return; // Max depth
          try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              const relativePath = path.relative(baseDir, fullPath);

              // Skip common ignored directories
              if (entry.isDirectory()) {
                if (['node_modules', '.git', 'dist', 'build', '__pycache__'].includes(entry.name)) continue;
                await walk(fullPath, depth + 1);
              } else {
                // Simple pattern matching
                const ext = path.extname(entry.name);
                if (pattern.includes('*')) {
                  const patternExt = pattern.replace('**/', '').replace('*', '');
                  if (patternExt && !entry.name.endsWith(patternExt)) continue;
                }
                files.push(relativePath);
              }
            }
          } catch (e) {}
        };

        await walk(baseDir);

        if (files.length === 0) return { result: "No files found matching pattern" };
        const output = files.slice(0, 500).join("\n");
        const suffix = files.length > 500 ? `\n\n... and ${files.length - 500} more files` : "";
        return { result: output + suffix };
      }

      case "grep_search": {
        const searchPath = resolvePath(args.path || ".");
        const flags = args.case_insensitive ? "gi" : "g";
        const regex = new RegExp(args.pattern, flags);
        const maxResults = args.max_results || 100;
        const results = [];

        const searchInFile = async (filePath) => {
          try {
            const content = await fs.readFile(filePath, "utf-8");
            const lines = content.split("\n");
            for (let i = 0; i < lines.length && results.length < maxResults; i++) {
              if (regex.test(lines[i])) {
                results.push({ file: filePath, line: i + 1, match: lines[i].trim() });
              }
            }
          } catch (e) {}
        };

        const stat = await fs.stat(searchPath);
        if (stat.isFile()) {
          await searchInFile(searchPath);
        } else {
          const walk = async (dir) => {
            if (results.length >= maxResults) return;
            try {
              const entries = await fs.readdir(dir, { withFileTypes: true });
              for (const entry of entries) {
                if (results.length >= maxResults) return;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                  if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
                    await walk(fullPath);
                  }
                } else {
                  if (args.file_pattern) {
                    const ext = args.file_pattern.replace('*', '');
                    if (!entry.name.endsWith(ext)) continue;
                  }
                  await searchInFile(fullPath);
                }
              }
            } catch (e) {}
          };
          await walk(searchPath);
        }

        if (results.length === 0) return { result: "No matches found" };
        let output = "";
        for (const r of results) {
          output += `${r.file}:${r.line}: ${r.match}\n`;
        }
        return { result: output.trim() };
      }

      case "find_definition": {
        const searchPath = resolvePath(args.path || ".");
        const defName = args.name;

        const patterns = [
          `function\\s+${defName}\\s*\\(`,
          `class\\s+${defName}\\s*(extends|implements|\\{)`,
          `const\\s+${defName}\\s*=`,
          `let\\s+${defName}\\s*=`,
          `def\\s+${defName}\\s*\\(`,
          `export\\s+(default\\s+)?(function|class|const|let)\\s+${defName}`,
          `interface\\s+${defName}\\s*\\{`,
          `type\\s+${defName}\\s*=`,
        ];

        const combinedPattern = patterns.join("|");
        const regex = new RegExp(combinedPattern, "g");
        const results = [];

        const searchInFile = async (filePath) => {
          try {
            const content = await fs.readFile(filePath, "utf-8");
            const lines = content.split("\n");
            for (let i = 0; i < lines.length && results.length < 50; i++) {
              if (regex.test(lines[i])) {
                results.push({ file: filePath, line: i + 1, match: lines[i].trim() });
              }
            }
          } catch (e) {}
        };

        const walk = async (dir) => {
          if (results.length >= 50) return;
          try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
              if (results.length >= 50) return;
              const fullPath = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
                  await walk(fullPath);
                }
              } else {
                if (args.file_pattern) {
                  const ext = args.file_pattern.replace('*', '');
                  if (!entry.name.endsWith(ext)) continue;
                }
                await searchInFile(fullPath);
              }
            }
          } catch (e) {}
        };

        await walk(searchPath);

        if (results.length === 0) return { result: `No definition found for: ${defName}` };
        let output = `Definitions of '${defName}':\n\n`;
        for (const r of results) {
          output += `${r.file}:${r.line}: ${r.match}\n`;
        }
        return { result: output.trim() };
      }

      // ─────────────────────────────────────────────────────────
      // GIT TOOLS
      // ─────────────────────────────────────────────────────────
      case "git_status": {
        const result = await runGit(["status"], args.cwd);
        return { result };
      }

      case "git_diff": {
        const diffArgs = ["diff"];
        if (args.staged) diffArgs.push("--cached");
        if (args.file) diffArgs.push(args.file);
        const result = await runGit(diffArgs, args.cwd);
        return { result };
      }

      case "git_log": {
        const logArgs = ["log", `-n${args.count || 10}`];
        if (args.oneline !== false) logArgs.push("--oneline");
        const result = await runGit(logArgs, args.cwd);
        return { result };
      }

      case "git_add": {
        const result = await runGit(["add", ...args.files], args.cwd);
        return { result };
      }

      case "git_commit": {
        const result = await runGit(["commit", "-m", args.message], args.cwd);
        return { result };
      }

      case "git_branch": {
        const branchArgs = ["branch"];
        if (args.delete && args.name) branchArgs.push("-d", args.name);
        else if (args.name) branchArgs.push(args.name);
        const result = await runGit(branchArgs, args.cwd);
        return { result };
      }

      case "git_checkout": {
        const checkoutArgs = ["checkout"];
        if (args.create) checkoutArgs.push("-b");
        checkoutArgs.push(args.target);
        const result = await runGit(checkoutArgs, args.cwd);
        return { result };
      }

      case "git_push": {
        const pushArgs = ["push"];
        if (args.setUpstream) pushArgs.push("-u");
        if (args.remote) pushArgs.push(args.remote);
        if (args.branch) pushArgs.push(args.branch);
        const result = await runGit(pushArgs, args.cwd);
        return { result };
      }

      case "git_pull": {
        const pullArgs = ["pull"];
        if (args.remote) pullArgs.push(args.remote);
        if (args.branch) pullArgs.push(args.branch);
        const result = await runGit(pullArgs, args.cwd);
        return { result };
      }

      case "git_clone": {
        const cloneArgs = ["clone", args.url];
        if (args.directory) cloneArgs.push(args.directory);
        const result = await runGit(cloneArgs, process.cwd());
        return { result };
      }

      // ─────────────────────────────────────────────────────────
      // THINKING/REASONING TOOLS
      // ─────────────────────────────────────────────────────────
      case "think": {
        const category = args.category ? `[${args.category.toUpperCase()}] ` : "";
        return { result: `${category}Thinking recorded.\n\n${args.thought}` };
      }

      case "reason": {
        let output = `Problem: ${args.problem}\n\nReasoning:\n`;
        args.steps.forEach((step, i) => { output += `${i + 1}. ${step}\n`; });
        output += `\nConclusion: ${args.conclusion}`;
        return { result: output };
      }

      case "evaluate_options": {
        let output = `Decision: ${args.context}\n\n`;
        args.options.forEach((opt, i) => {
          output += `Option ${i + 1}: ${opt.name}\n`;
          if (opt.pros?.length) {
            output += "  Pros:\n";
            opt.pros.forEach((p) => (output += `    + ${p}\n`));
          }
          if (opt.cons?.length) {
            output += "  Cons:\n";
            opt.cons.forEach((c) => (output += `    - ${c}\n`));
          }
          output += "\n";
        });
        output += `Recommendation: ${args.recommendation}`;
        return { result: output };
      }

      // ─────────────────────────────────────────────────────────
      // TASK MANAGEMENT TOOLS
      // ─────────────────────────────────────────────────────────
      case "task_list": {
        tasks = await loadJson(TASKS_FILE, []);
        let filtered = tasks;
        if (args.filter && args.filter !== "all") {
          filtered = tasks.filter((t) => t.status === args.filter);
        }

        if (filtered.length === 0) return { result: "No tasks found." };

        const statusIcons = { pending: "○", in_progress: "◐", completed: "●" };
        let output = "Tasks:\n" + "─".repeat(50) + "\n";

        for (const task of filtered) {
          const icon = statusIcons[task.status] || "?";
          output += `${icon} [${task.id}] ${task.status.toUpperCase().padEnd(12)} ${task.description}\n`;
        }

        const counts = {
          pending: filtered.filter((t) => t.status === "pending").length,
          in_progress: filtered.filter((t) => t.status === "in_progress").length,
          completed: filtered.filter((t) => t.status === "completed").length,
        };

        output += "─".repeat(50) + "\n";
        output += `Total: ${filtered.length} | Pending: ${counts.pending} | In Progress: ${counts.in_progress} | Completed: ${counts.completed}`;
        return { result: output };
      }

      case "task_add": {
        tasks = await loadJson(TASKS_FILE, []);
        const newId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
        const newTask = {
          id: newId,
          description: args.description,
          status: args.status || "pending",
          created: new Date().toISOString(),
        };
        tasks.push(newTask);
        await saveJson(TASKS_FILE, tasks);
        return { result: `Added task [${newId}]: ${args.description}` };
      }

      case "task_update": {
        tasks = await loadJson(TASKS_FILE, []);
        const task = tasks.find((t) => t.id === args.task_id);
        if (!task) return { result: `Task not found: ${args.task_id}`, error: true };

        if (args.status) task.status = args.status;
        if (args.description) task.description = args.description;
        task.updated = new Date().toISOString();

        await saveJson(TASKS_FILE, tasks);
        return { result: `Updated task [${args.task_id}]: ${task.status} - ${task.description}` };
      }

      case "task_delete": {
        tasks = await loadJson(TASKS_FILE, []);
        const index = tasks.findIndex((t) => t.id === args.task_id);
        if (index === -1) return { result: `Task not found: ${args.task_id}`, error: true };

        tasks.splice(index, 1);
        await saveJson(TASKS_FILE, tasks);
        return { result: `Deleted task [${args.task_id}]` };
      }

      case "task_clear": {
        tasks = await loadJson(TASKS_FILE, []);
        const completedOnly = args.completed_only !== false;

        if (completedOnly) {
          const before = tasks.length;
          tasks = tasks.filter((t) => t.status !== "completed");
          const removed = before - tasks.length;
          await saveJson(TASKS_FILE, tasks);
          return { result: `Cleared ${removed} completed tasks` };
        } else {
          const count = tasks.length;
          tasks = [];
          await saveJson(TASKS_FILE, tasks);
          return { result: `Cleared all ${count} tasks` };
        }
      }

      case "task_bulk_add": {
        tasks = await loadJson(TASKS_FILE, []);
        const added = [];
        let nextId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;

        for (const desc of args.tasks) {
          const newTask = { id: nextId++, description: desc, status: "pending", created: new Date().toISOString() };
          tasks.push(newTask);
          added.push(newTask.id);
        }

        await saveJson(TASKS_FILE, tasks);
        return { result: `Added ${added.length} tasks: [${added.join(", ")}]` };
      }

      // ─────────────────────────────────────────────────────────
      // MEMORY TOOLS
      // ─────────────────────────────────────────────────────────
      case "memory_store": {
        await fs.mkdir(MEMORY_DIR, { recursive: true });
        const notes = await loadJson(path.join(MEMORY_DIR, "notes.json"), {});
        notes[args.key] = {
          value: args.value,
          tags: args.tags || [],
          created: notes[args.key]?.created || new Date().toISOString(),
          updated: new Date().toISOString(),
        };
        await saveJson(path.join(MEMORY_DIR, "notes.json"), notes);
        return { result: `Stored memory: "${args.key}"` };
      }

      case "memory_recall": {
        const notes = await loadJson(path.join(MEMORY_DIR, "notes.json"), {});

        if (args.key) {
          const note = notes[args.key];
          if (!note) return { result: `Memory not found: "${args.key}"` };
          return { result: `[${args.key}]\nTags: ${note.tags.join(", ") || "none"}\n\n${note.value}` };
        }

        const results = [];
        const searchLower = (args.search || "").toLowerCase();
        const tagFilter = args.tag?.toLowerCase();

        for (const [key, note] of Object.entries(notes)) {
          const matchesSearch = !searchLower || key.toLowerCase().includes(searchLower) ||
            note.value.toLowerCase().includes(searchLower) ||
            note.tags.some((t) => t.toLowerCase().includes(searchLower));
          const matchesTag = !tagFilter || note.tags.some((t) => t.toLowerCase() === tagFilter);

          if (matchesSearch && matchesTag) results.push({ key, ...note });
        }

        if (results.length === 0) return { result: "No matching memories found" };

        let output = `Found ${results.length} memories:\n\n`;
        for (const r of results) {
          output += `[${r.key}] (${r.tags.join(", ") || "no tags"})\n`;
          output += r.value.slice(0, 200) + (r.value.length > 200 ? "..." : "") + "\n\n";
        }
        return { result: output.trim() };
      }

      case "memory_list": {
        const notes = await loadJson(path.join(MEMORY_DIR, "notes.json"), {});
        const keys = Object.keys(notes);

        if (keys.length === 0) return { result: "No stored memories" };

        let output = "Stored memories:\n" + "─".repeat(40) + "\n";
        for (const key of keys.sort()) {
          const note = notes[key];
          if (args.tag && !note.tags.includes(args.tag)) continue;
          output += `• ${key}`;
          if (note.tags.length > 0) output += ` [${note.tags.join(", ")}]`;
          output += "\n";
        }
        return { result: output };
      }

      case "memory_delete": {
        const notes = await loadJson(path.join(MEMORY_DIR, "notes.json"), {});
        if (!notes[args.key]) return { result: `Memory not found: "${args.key}"`, error: true };

        delete notes[args.key];
        await saveJson(path.join(MEMORY_DIR, "notes.json"), notes);
        return { result: `Deleted memory: "${args.key}"` };
      }

      case "scratchpad_write": {
        await fs.mkdir(MEMORY_DIR, { recursive: true });
        const padName = args.name || "default";
        const padFile = path.join(MEMORY_DIR, `scratchpad_${padName}.txt`);

        if (args.append) {
          let existing = "";
          try { existing = await fs.readFile(padFile, "utf-8"); } catch {}
          await fs.writeFile(padFile, existing + args.content);
        } else {
          await fs.writeFile(padFile, args.content);
        }
        return { result: `Wrote to scratchpad: ${padName}` };
      }

      case "scratchpad_read": {
        const padName = args.name || "default";
        const padFile = path.join(MEMORY_DIR, `scratchpad_${padName}.txt`);

        try {
          const content = await fs.readFile(padFile, "utf-8");
          return { result: `Scratchpad [${padName}]:\n${"─".repeat(40)}\n${content}` };
        } catch {
          return { result: `Scratchpad "${padName}" is empty or doesn't exist` };
        }
      }

      case "scratchpad_list": {
        try {
          const files = await fs.readdir(MEMORY_DIR);
          const pads = files
            .filter((f) => f.startsWith("scratchpad_") && f.endsWith(".txt"))
            .map((f) => f.replace("scratchpad_", "").replace(".txt", ""));

          if (pads.length === 0) return { result: "No scratchpads found" };
          return { result: `Scratchpads:\n${pads.map((p) => `• ${p}`).join("\n")}` };
        } catch {
          return { result: "No scratchpads found" };
        }
      }

      case "context_save": {
        const contexts = await loadJson(path.join(MEMORY_DIR, "context.json"), {});
        contexts[args.project] = {
          summary: args.summary,
          key_points: args.key_points || [],
          next_steps: args.next_steps || [],
          saved: new Date().toISOString(),
        };
        await saveJson(path.join(MEMORY_DIR, "context.json"), contexts);
        return { result: `Saved context for project: ${args.project}` };
      }

      case "context_load": {
        const contexts = await loadJson(path.join(MEMORY_DIR, "context.json"), {});
        const ctx = contexts[args.project];

        if (!ctx) return { result: `No saved context for project: ${args.project}` };

        let output = `Project: ${args.project}\nLast saved: ${ctx.saved}\n${"═".repeat(40)}\n\n`;
        output += `Summary:\n${ctx.summary}\n\n`;

        if (ctx.key_points.length > 0) {
          output += "Key Points:\n";
          ctx.key_points.forEach((p) => (output += `• ${p}\n`));
          output += "\n";
        }

        if (ctx.next_steps.length > 0) {
          output += "Next Steps:\n";
          ctx.next_steps.forEach((s, i) => (output += `${i + 1}. ${s}\n`));
        }

        return { result: output };
      }

      // ─────────────────────────────────────────────────────────
      // PLANNING TOOLS
      // ─────────────────────────────────────────────────────────
      case "plan_create": {
        if (currentPlan && !currentPlan.completed && !currentPlan.abandoned) {
          return { result: `There's already an active plan. Complete or abandon it first.`, error: true };
        }

        currentPlan = {
          goal: args.goal,
          context: args.context,
          steps: args.steps.map((s) => ({
            description: s.description,
            verification: s.verification,
            completed: false,
            skipped: false,
          })),
          created: new Date().toISOString(),
        };

        let output = `Plan created!\n\nGoal: ${currentPlan.goal}\n${"═".repeat(50)}\n\n`;
        currentPlan.steps.forEach((step, i) => {
          output += `○ [${i}] ${step.description}\n`;
          if (step.verification) output += `      Verify: ${step.verification}\n`;
        });
        return { result: output };
      }

      case "plan_status": {
        if (!currentPlan) return { result: "No active plan." };

        let output = `Plan: ${currentPlan.goal}\n${"═".repeat(50)}\n\n`;
        if (currentPlan.context) output += `Context: ${currentPlan.context}\n\n`;

        currentPlan.steps.forEach((step, i) => {
          let status = "○";
          if (step.completed) status = "●";
          if (step.skipped) status = "◌";
          output += `${status} [${i}] ${step.description}\n`;
          if (step.result) output += `      Result: ${step.result}\n`;
        });

        const completed = currentPlan.steps.filter((s) => s.completed).length;
        const skipped = currentPlan.steps.filter((s) => s.skipped).length;
        output += `\nProgress: ${completed}/${currentPlan.steps.length} completed`;
        if (skipped > 0) output += `, ${skipped} skipped`;

        return { result: output };
      }

      case "plan_step_complete": {
        if (!currentPlan) return { result: "No active plan.", error: true };

        const step = currentPlan.steps[args.step_index];
        if (!step) return { result: `Invalid step index: ${args.step_index}`, error: true };

        step.completed = true;
        step.result = args.result;
        step.notes = args.notes;

        const nextStep = currentPlan.steps.find((s) => !s.completed && !s.skipped);
        let response = `Step ${args.step_index} completed.\n`;
        if (nextStep) {
          const nextIndex = currentPlan.steps.indexOf(nextStep);
          response += `Next step [${nextIndex}]: ${nextStep.description}`;
        } else {
          response += "All steps completed! Use plan_complete to finish.";
        }

        return { result: response };
      }

      case "plan_step_skip": {
        if (!currentPlan) return { result: "No active plan.", error: true };

        const step = currentPlan.steps[args.step_index];
        if (!step) return { result: `Invalid step index: ${args.step_index}`, error: true };

        step.skipped = true;
        step.skipReason = args.reason;
        return { result: `Step ${args.step_index} skipped: ${args.reason}` };
      }

      case "plan_complete": {
        if (!currentPlan) return { result: "No active plan.", error: true };

        currentPlan.completed = true;
        currentPlan.completedAt = new Date().toISOString();
        currentPlan.summary = args.summary;

        if (args.save !== false) {
          const data = await loadJson(PLANS_FILE, { history: [] });
          data.history.unshift(currentPlan);
          data.history = data.history.slice(0, 20);
          await saveJson(PLANS_FILE, data);
        }

        const finalPlan = currentPlan;
        currentPlan = null;

        return { result: `Plan completed!\n\nGoal: ${finalPlan.goal}\nSummary: ${args.summary}` };
      }

      case "plan_abandon": {
        if (!currentPlan) return { result: "No active plan.", error: true };

        currentPlan.abandoned = true;
        currentPlan = null;
        return { result: `Plan abandoned: ${args.reason}` };
      }

      case "plan_history": {
        const data = await loadJson(PLANS_FILE, { history: [] });
        const limit = args.limit || 5;
        const plans = data.history.slice(0, limit);

        if (plans.length === 0) return { result: "No plan history." };

        let output = "Plan History:\n" + "═".repeat(50) + "\n\n";
        plans.forEach((plan, i) => {
          output += `${i + 1}. ${plan.goal}\n`;
          output += `   Completed: ${plan.completedAt}\n`;
          if (plan.summary) output += `   Summary: ${plan.summary}\n`;
          output += "\n";
        });

        return { result: output };
      }

      // ─────────────────────────────────────────────────────────
      // CONVERSATION CONTEXT TOOLS
      // ─────────────────────────────────────────────────────────
      case "conversation_log": {
        const entry = {
          content: args.entry,
          type: args.type || "finding",
          importance: args.importance || "medium",
          timestamp: new Date().toISOString(),
        };
        conversationLog.push(entry);
        return { result: `Logged [${entry.type}]: ${entry.content}` };
      }

      case "conversation_summarize": {
        if (conversationLog.length === 0) return { result: "No conversation entries to summarize." };

        const byType = {};
        for (const entry of conversationLog) {
          if (!byType[entry.type]) byType[entry.type] = [];
          byType[entry.type].push(entry);
        }

        let summary = "Conversation Summary\n" + "═".repeat(50) + "\n\n";

        if (byType.decision) {
          summary += "Decisions Made:\n";
          byType.decision.forEach((e) => { summary += `  • ${e.content}\n`; });
          summary += "\n";
        }

        if (byType.action) {
          summary += "Actions Taken:\n";
          byType.action.forEach((e) => { summary += `  • ${e.content}\n`; });
          summary += "\n";
        }

        if (byType.finding) {
          summary += "Key Findings:\n";
          byType.finding.forEach((e) => { summary += `  • ${e.content}\n`; });
          summary += "\n";
        }

        summary += `Total entries: ${conversationLog.length}`;

        summaries.push({ summary, timestamp: new Date().toISOString(), entryCount: conversationLog.length });

        if (args.clear_log) {
          conversationLog = [];
          summary += "\n\n(Log cleared)";
        }

        return { result: summary };
      }

      case "conversation_context": {
        let output = "Current Conversation Context\n" + "═".repeat(50) + "\n\n";

        if (summaries.length > 0) {
          output += "Previous Summaries:\n" + "─".repeat(40) + "\n";
          summaries.forEach((s, i) => {
            output += `[${i + 1}] ${s.timestamp}\n${s.summary}\n\n`;
          });
        }

        if (conversationLog.length > 0) {
          output += "Current Log:\n" + "─".repeat(40) + "\n";
          conversationLog.forEach((e) => {
            output += `[${e.type}] ${e.content}\n`;
          });
        }

        if (conversationLog.length === 0 && summaries.length === 0) {
          output += "(No context logged yet)";
        }

        return { result: output };
      }

      // ─────────────────────────────────────────────────────────
      // INTERACTION TOOLS
      // ─────────────────────────────────────────────────────────
      case "ask_user": {
        let prompt = `\n${"═".repeat(50)}\n❓ QUESTION FOR USER\n${"═".repeat(50)}\n\n`;
        if (args.context) prompt += `Context: ${args.context}\n\n`;
        prompt += `${args.question}\n`;
        if (args.options?.length > 0) {
          prompt += "\nOptions:\n";
          args.options.forEach((opt, i) => { prompt += `  ${i + 1}. ${opt}\n`; });
        }
        if (args.default) prompt += `\nDefault: ${args.default}\n`;
        prompt += "\n" + "─".repeat(50) + "\n[Waiting for user response...]\n";
        return { result: prompt };
      }

      case "confirm": {
        let prompt = `\n${"═".repeat(50)}\n⚠️  CONFIRMATION REQUIRED\n${"═".repeat(50)}\n\n`;
        prompt += `Action: ${args.action}\n`;
        if (args.consequences) prompt += `\nConsequences: ${args.consequences}\n`;
        if (args.alternatives?.length > 0) {
          prompt += "\nAlternatives:\n";
          args.alternatives.forEach((alt) => { prompt += `  • ${alt}\n`; });
        }
        prompt += "\nPlease confirm: [yes/no]\n" + "─".repeat(50) + "\n";
        return { result: prompt };
      }

      case "present_choices": {
        let prompt = `\n${"═".repeat(50)}\n📋 CHOOSE AN OPTION\n${"═".repeat(50)}\n\n`;
        prompt += `${args.prompt}\n\n`;
        args.choices.forEach((choice, i) => {
          const rec = choice.recommended ? " ⭐ RECOMMENDED" : "";
          prompt += `${i + 1}. ${choice.label}${rec}\n`;
          if (choice.description) prompt += `   ${choice.description}\n`;
          prompt += "\n";
        });
        if (args.allow_custom) prompt += `${args.choices.length + 1}. Other (provide custom answer)\n\n`;
        prompt += "Enter your choice:\n" + "─".repeat(50) + "\n";
        return { result: prompt };
      }

      case "notify_user": {
        const icons = { info: "ℹ️", success: "✅", warning: "⚠️", error: "❌" };
        const icon = icons[args.type] || icons.info;
        return { result: `\n${icon} ${args.message}\n` };
      }

      // ─────────────────────────────────────────────────────────
      // MEDIA TOOLS
      // ─────────────────────────────────────────────────────────
      case "read_image": {
        const filePath = resolvePath(args.file_path);
        const ext = path.extname(filePath);
        const mimeTypes = {
          ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
          ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
        };
        const mimeType = mimeTypes[ext.toLowerCase()] || "application/octet-stream";

        const buffer = await fs.readFile(filePath);
        const base64 = buffer.toString("base64");
        const stat = await fs.stat(filePath);

        return {
          result: JSON.stringify({
            file: filePath,
            mime_type: mimeType,
            size_bytes: stat.size,
            base64_length: base64.length,
            data_url: `data:${mimeType};base64,${base64}`,
          }, null, 2)
        };
      }

      case "read_pdf": {
        const filePath = resolvePath(args.file_path);

        // Try pdftotext
        try {
          const result = await runCommand(`pdftotext -layout "${filePath}" -`, getWorkingDir(), 30000);
          if (result.stdout.trim()) {
            return { result: `PDF: ${filePath}\n${"═".repeat(40)}\n\n${result.stdout}` };
          }
        } catch (e) {}

        // Basic extraction fallback
        try {
          const buffer = await fs.readFile(filePath);
          const text = buffer.toString("utf-8");
          const strings = text.match(/[\x20-\x7E]{20,}/g) || [];
          if (strings.length > 0) {
            return { result: `PDF: ${filePath} (basic extraction)\n${"═".repeat(40)}\n\n${strings.join("\n")}` };
          }
        } catch (e) {}

        return { result: "Could not extract text from PDF. Install pdftotext for better results." };
      }

      case "take_screenshot": {
        const outputPath = args.output_path;

        try {
          if (platform() === "win32") {
            const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bitmap.Save('${outputPath.replace(/'/g, "''")}')
`;
            await runCommand(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, getWorkingDir(), 30000);
          } else if (platform() === "darwin") {
            await runCommand(`screencapture -x "${outputPath}"`, getWorkingDir(), 30000);
          } else {
            await runCommand(`gnome-screenshot -f "${outputPath}"`, getWorkingDir(), 30000);
          }
          return { result: `Screenshot saved to: ${outputPath}` };
        } catch (error) {
          return { result: `Screenshot failed: ${error.message}`, error: true };
        }
      }

      // ─────────────────────────────────────────────────────────
      // NOTEBOOK TOOLS
      // ─────────────────────────────────────────────────────────
      case "notebook_read": {
        const content = await fs.readFile(args.file_path, "utf-8");
        const notebook = JSON.parse(content);

        let output = `Notebook: ${args.file_path}\n`;
        output += `Kernel: ${notebook.metadata?.kernelspec?.name || "unknown"}\n`;
        output += `Cells: ${notebook.cells?.length || 0}\n`;
        output += "═".repeat(40) + "\n\n";

        if (notebook.cells) {
          notebook.cells.forEach((cell, i) => {
            const type = cell.cell_type;
            const source = Array.isArray(cell.source) ? cell.source.join("") : cell.source;
            output += `[${i}] ${type.toUpperCase()}\n${"─".repeat(40)}\n${source}\n\n`;
          });
        }

        return { result: output };
      }

      case "notebook_edit_cell": {
        const content = await fs.readFile(args.file_path, "utf-8");
        const notebook = JSON.parse(content);

        if (!notebook.cells || args.cell_index >= notebook.cells.length) {
          return { result: `Invalid cell index: ${args.cell_index}`, error: true };
        }

        if (args.delete) {
          notebook.cells.splice(args.cell_index, 1);
          await fs.writeFile(args.file_path, JSON.stringify(notebook, null, 2));
          return { result: `Deleted cell ${args.cell_index}` };
        }

        const cell = notebook.cells[args.cell_index];
        if (args.new_source !== undefined) {
          cell.source = args.new_source.split("\n");
          if (cell.cell_type === "code") {
            cell.outputs = [];
            cell.execution_count = null;
          }
        }

        if (args.cell_type) {
          cell.cell_type = args.cell_type;
        }

        await fs.writeFile(args.file_path, JSON.stringify(notebook, null, 2));
        return { result: `Updated cell ${args.cell_index}` };
      }

      case "notebook_insert_cell": {
        const content = await fs.readFile(args.file_path, "utf-8");
        const notebook = JSON.parse(content);

        if (!notebook.cells) notebook.cells = [];

        const newCell = {
          cell_type: args.cell_type || "code",
          metadata: {},
          source: args.source.split("\n"),
        };

        if (newCell.cell_type === "code") {
          newCell.execution_count = null;
          newCell.outputs = [];
        }

        const index = args.cell_index === -1 || args.cell_index === undefined
          ? notebook.cells.length : args.cell_index;

        notebook.cells.splice(index, 0, newCell);
        await fs.writeFile(args.file_path, JSON.stringify(notebook, null, 2));
        return { result: `Inserted cell at index ${index}` };
      }

      case "notebook_create": {
        const notebook = {
          nbformat: 4,
          nbformat_minor: 5,
          metadata: {
            kernelspec: {
              display_name: args.kernel === "python3" ? "Python 3" : args.kernel || "Python 3",
              language: "python",
              name: args.kernel || "python3",
            },
          },
          cells: [],
        };

        if (args.cells) {
          for (const cellDef of args.cells) {
            const cell = {
              cell_type: cellDef.type || "code",
              metadata: {},
              source: (cellDef.source || "").split("\n"),
            };
            if (cell.cell_type === "code") {
              cell.execution_count = null;
              cell.outputs = [];
            }
            notebook.cells.push(cell);
          }
        }

        await fs.writeFile(args.file_path, JSON.stringify(notebook, null, 2));
        return { result: `Created notebook: ${args.file_path}` };
      }

      // ─────────────────────────────────────────────────────────
      // GITHUB BLOG TOOLS
      // ─────────────────────────────────────────────────────────
      case "blog_init": {
        const blogPath = resolvePath(args.path);
        const title = args.title;
        const description = args.description || "";
        const author = args.author || "";
        const githubUsername = args.github_username || "";

        // Create directory structure
        await fs.mkdir(blogPath, { recursive: true });
        await fs.mkdir(path.join(blogPath, "_posts"), { recursive: true });
        await fs.mkdir(path.join(blogPath, "_drafts"), { recursive: true });
        await fs.mkdir(path.join(blogPath, "_layouts"), { recursive: true });
        await fs.mkdir(path.join(blogPath, "_includes"), { recursive: true });
        await fs.mkdir(path.join(blogPath, "assets", "css"), { recursive: true });
        await fs.mkdir(path.join(blogPath, "assets", "images"), { recursive: true });

        // Create _config.yml
        const config = `# Site settings
title: "${title}"
description: "${description}"
author: "${author}"
${githubUsername ? `url: "https://${githubUsername}.github.io"` : ""}
baseurl: ""

# Build settings
markdown: kramdown
permalink: /:title/

# Defaults
defaults:
  - scope:
      path: ""
      type: "posts"
    values:
      layout: "post"
  - scope:
      path: ""
      type: "pages"
    values:
      layout: "page"

plugins:
  - jekyll-feed
  - jekyll-seo-tag

exclude:
  - Gemfile
  - Gemfile.lock
  - README.md
  - node_modules
`;
        await fs.writeFile(path.join(blogPath, "_config.yml"), config);

        // Create default layout
        const defaultLayout = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ page.title | default: site.title }}</title>
  <link rel="stylesheet" href="{{ '/assets/css/style.css' | relative_url }}">
</head>
<body>
  {% include header.html %}
  <main class="container">
    {{ content }}
  </main>
  {% include footer.html %}
</body>
</html>`;
        await fs.writeFile(path.join(blogPath, "_layouts", "default.html"), defaultLayout);

        // Create post layout
        const postLayout = `---
layout: default
---
<article class="post">
  <header class="post-header">
    <h1>{{ page.title }}</h1>
    <time datetime="{{ page.date | date_to_xmlschema }}">{{ page.date | date: "%B %d, %Y" }}</time>
    {% if page.tags %}
    <div class="tags">
      {% for tag in page.tags %}
      <span class="tag">{{ tag }}</span>
      {% endfor %}
    </div>
    {% endif %}
  </header>
  <div class="post-content">
    {{ content }}
  </div>
</article>`;
        await fs.writeFile(path.join(blogPath, "_layouts", "post.html"), postLayout);

        // Create page layout
        const pageLayout = `---
layout: default
---
<article class="page">
  <h1>{{ page.title }}</h1>
  {{ content }}
</article>`;
        await fs.writeFile(path.join(blogPath, "_layouts", "page.html"), pageLayout);

        // Create header include
        const header = `<header class="site-header">
  <div class="container">
    <a href="{{ '/' | relative_url }}" class="site-title">{{ site.title }}</a>
    <nav class="site-nav">
      <a href="{{ '/' | relative_url }}">Home</a>
      <a href="{{ '/categories/' | relative_url }}">Categories</a>
    </nav>
  </div>
</header>`;
        await fs.writeFile(path.join(blogPath, "_includes", "header.html"), header);

        // Create footer include
        const footer = `<footer class="site-footer">
  <div class="container">
    <p>&copy; {{ 'now' | date: "%Y" }} {{ site.author | default: site.title }}</p>
  </div>
</footer>`;
        await fs.writeFile(path.join(blogPath, "_includes", "footer.html"), footer);

        // Create default CSS
        const css = `:root {
  --primary: #3b82f6;
  --bg: #0f172a;
  --bg-secondary: #1e293b;
  --text: #f1f5f9;
  --text-light: #94a3b8;
  --border: #334155;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}
.container { max-width: 800px; margin: 0 auto; padding: 0 20px; }
.site-header {
  background: var(--bg-secondary);
  padding: 20px 0;
  border-bottom: 1px solid var(--border);
}
.site-header .container { display: flex; justify-content: space-between; align-items: center; }
.site-title { color: var(--text); text-decoration: none; font-weight: bold; font-size: 1.25rem; }
.site-nav a { color: var(--text-light); text-decoration: none; margin-left: 20px; }
.site-nav a:hover { color: var(--primary); }
main { padding: 40px 0; }
.post-header { margin-bottom: 30px; }
.post-header h1 { color: var(--text); margin-bottom: 10px; }
.post-header time { color: var(--text-light); }
.tags { margin-top: 10px; }
.tag { background: var(--bg-secondary); padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; margin-right: 8px; }
.post-content { color: var(--text); }
.post-content h2, .post-content h3 { margin-top: 30px; margin-bottom: 15px; }
.post-content p { margin-bottom: 15px; }
.post-content a { color: var(--primary); }
.post-content pre { background: var(--bg-secondary); padding: 15px; border-radius: 8px; overflow-x: auto; margin: 20px 0; }
.post-content code { background: var(--bg-secondary); padding: 2px 6px; border-radius: 4px; }
.site-footer { padding: 40px 0; border-top: 1px solid var(--border); color: var(--text-light); text-align: center; }
`;
        await fs.writeFile(path.join(blogPath, "assets", "css", "style.css"), css);

        // Create index.html
        const index = `---
layout: default
title: Home
---
<h1>{{ site.title }}</h1>
<p>{{ site.description }}</p>
<h2>Recent Posts</h2>
<div class="post-list">
{% for post in site.posts limit:10 %}
  <article class="post-card">
    <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
    <time>{{ post.date | date: "%B %d, %Y" }}</time>
    <p>{{ post.excerpt | strip_html | truncate: 150 }}</p>
  </article>
{% endfor %}
</div>`;
        await fs.writeFile(path.join(blogPath, "index.html"), index);

        // Create categories page using site.tags
        const categories = `---
layout: default
title: Categories
permalink: /categories/
---
<h1>Categories</h1>
<div class="categories-list">
  {% for tag in site.tags %}
    {% assign tag_name = tag | first %}
    {% assign posts = tag | last %}
    <a href="#{{ tag_name | slugify }}" class="category-card">
      <h3>{{ tag_name }}</h3>
      <span class="count">{{ posts.size }} posts</span>
    </a>
  {% endfor %}
</div>

{% for tag in site.tags %}
  {% assign tag_name = tag | first %}
  {% assign posts = tag | last %}
  <section id="{{ tag_name | slugify }}" class="category-section">
    <h2>{{ tag_name }}</h2>
    <div class="post-list">
      {% for post in posts %}
        <article class="post-card">
          <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
          <time>{{ post.date | date: "%B %d, %Y" }}</time>
        </article>
      {% endfor %}
    </div>
  </section>
{% endfor %}`;
        await fs.writeFile(path.join(blogPath, "categories.html"), categories);

        return { result: `Blog initialized at ${blogPath}!\n\nStructure created:\n- _config.yml\n- _layouts/ (default, post, page)\n- _includes/ (header, footer)\n- _posts/\n- _drafts/\n- assets/css/style.css\n- index.html\n- categories.html\n\nNext: Create posts with blog_post_create` };
      }

      case "blog_post_create": {
        const blogPath = resolvePath(args.blog_path);
        const title = args.title;
        const content = args.content;
        const tags = args.tags || [];
        const draft = args.draft || false;

        const date = new Date().toISOString().split("T")[0];
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const filename = `${date}-${slug}.md`;
        const folder = draft ? "_drafts" : "_posts";
        const filePath = path.join(blogPath, folder, filename);

        const frontmatter = `---
layout: post
title: ${title}
date: ${date}
${tags.length > 0 ? `tags:\n${tags.map(t => `  - ${t}`).join("\n")}` : ""}
---

${content}
`;
        await fs.writeFile(filePath, frontmatter);
        return { result: `Post created: ${filePath}` };
      }

      case "blog_page_create": {
        const blogPath = resolvePath(args.blog_path);
        const title = args.title;
        const content = args.content;
        const permalink = args.permalink || `/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/`;

        const frontmatter = `---
layout: page
title: ${title}
permalink: ${permalink}
---

${content}
`;
        const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
        await fs.writeFile(path.join(blogPath, filename), frontmatter);
        return { result: `Page created: ${path.join(blogPath, filename)}` };
      }

      case "blog_post_list": {
        const blogPath = resolvePath(args.blog_path);
        let output = "Blog Posts:\n" + "═".repeat(50) + "\n\n";

        // List posts
        try {
          const posts = await fs.readdir(path.join(blogPath, "_posts"));
          if (posts.length > 0) {
            output += "Published:\n";
            for (const post of posts.sort().reverse()) {
              output += `  • ${post}\n`;
            }
          } else {
            output += "No published posts.\n";
          }
        } catch (e) {
          output += "No _posts folder.\n";
        }

        // List drafts
        try {
          const drafts = await fs.readdir(path.join(blogPath, "_drafts"));
          if (drafts.length > 0) {
            output += "\nDrafts:\n";
            for (const draft of drafts.sort().reverse()) {
              output += `  • ${draft}\n`;
            }
          }
        } catch (e) {}

        return { result: output };
      }

      case "blog_theme": {
        const blogPath = resolvePath(args.blog_path);
        const preset = args.preset;

        const themePresets = {
          light: { primary: "#2563eb", bg: "#ffffff", bgSecondary: "#f3f4f6", text: "#1f2937", textLight: "#6b7280", border: "#e5e7eb" },
          dark: { primary: "#3b82f6", bg: "#0f172a", bgSecondary: "#1e293b", text: "#f1f5f9", textLight: "#94a3b8", border: "#334155" },
          ocean: { primary: "#06b6d4", bg: "#0c1929", bgSecondary: "#132f4c", text: "#e0f2fe", textLight: "#7dd3fc", border: "#1e4976" },
          forest: { primary: "#22c55e", bg: "#0a1f0a", bgSecondary: "#14291a", text: "#dcfce7", textLight: "#86efac", border: "#1e4620" },
          sunset: { primary: "#f97316", bg: "#1c1412", bgSecondary: "#2d211c", text: "#fef3c7", textLight: "#fdba74", border: "#44322a" },
          minimal: { primary: "#171717", bg: "#fafafa", bgSecondary: "#f5f5f5", text: "#171717", textLight: "#525252", border: "#e5e5e5" },
          neon: { primary: "#a855f7", bg: "#09090b", bgSecondary: "#18181b", text: "#fafafa", textLight: "#a1a1aa", border: "#27272a" },
          vintage: { primary: "#b45309", bg: "#fefce8", bgSecondary: "#fef9c3", text: "#422006", textLight: "#854d0e", border: "#fde047" },
        };

        let theme;
        if (preset && themePresets[preset]) {
          theme = themePresets[preset];
        } else {
          theme = {
            primary: args.primary_color || "#3b82f6",
            bg: args.bg_color || "#0f172a",
            bgSecondary: args.bg_secondary || "#1e293b",
            text: args.text_color || "#f1f5f9",
            textLight: args.text_light || "#94a3b8",
            border: args.border_color || "#334155",
          };
        }

        // Read existing CSS
        const cssPath = path.join(blogPath, "assets", "css", "style.css");
        let css;
        try {
          css = await fs.readFile(cssPath, "utf-8");
        } catch (e) {
          css = `:root { }`;
        }

        // Update CSS variables
        css = css.replace(/:root\s*\{[^}]*\}/, `:root {
  --primary: ${theme.primary};
  --bg: ${theme.bg};
  --bg-secondary: ${theme.bgSecondary};
  --text: ${theme.text};
  --text-light: ${theme.textLight};
  --border: ${theme.border};
}`);

        await fs.writeFile(cssPath, css);
        return { result: `Theme applied: ${preset || "custom"}\n\nColors:\n- Primary: ${theme.primary}\n- Background: ${theme.bg}\n- Text: ${theme.text}` };
      }

      case "blog_theme_list": {
        const output = `Available Theme Presets:
═══════════════════════════════════════════════════

CUSTOM PRESETS (use with blog_theme preset="name"):
  • light    - Clean white background with blue accents
  • dark     - Dark blue/slate theme with bright accents
  • ocean    - Cyan/teal color scheme on dark background
  • forest   - Green nature-inspired dark theme
  • sunset   - Warm orange tones on dark background
  • minimal  - Black and white, ultra-clean
  • neon     - Purple accents on pure black
  • vintage  - Warm sepia/cream tones

JEKYLL THEMES (use with blog_jekyll_theme):
  • minima           - Default Jekyll theme, clean and simple
  • cayman           - Green header with white content
  • minimal-mistakes - Feature-rich, highly customizable
  • chirpy           - Modern blog with TOC and dark mode
  • beautiful        - Clean, beautiful, easy to use

CUSTOM COLORS:
  blog_theme blog_path="path" primary_color="#ff6600" bg_color="#1a1a1a"
`;
        return { result: output };
      }

      case "blog_config": {
        const blogPath = resolvePath(args.blog_path);
        const configPath = path.join(blogPath, "_config.yml");

        let config = await fs.readFile(configPath, "utf-8");

        if (args.title) config = config.replace(/^title:.*$/m, `title: "${args.title}"`);
        if (args.description) config = config.replace(/^description:.*$/m, `description: "${args.description}"`);
        if (args.author) config = config.replace(/^author:.*$/m, `author: "${args.author}"`);
        if (args.url) config = config.replace(/^url:.*$/m, `url: "${args.url}"`);

        await fs.writeFile(configPath, config);
        return { result: `Config updated at ${configPath}` };
      }

      case "blog_deploy": {
        const blogPath = resolvePath(args.blog_path);
        const message = args.message || "Update blog";

        try {
          await runGit(["add", "."], blogPath);
          await runGit(["commit", "-m", message], blogPath);
          const pushResult = await runGit(["push"], blogPath);
          return { result: `Deployed!\n\n${pushResult}` };
        } catch (e) {
          return { result: `Deploy error: ${e.message}`, error: true };
        }
      }

      // ─────────────────────────────────────────────────────────
      // DEFAULT
      // ─────────────────────────────────────────────────────────
      default:
        return { result: `Unknown tool: ${name}`, error: true };
    }
  } catch (e) {
    return { result: `Error: ${e.message}`, error: true };
  }
}

// ═══════════════════════════════════════════════════════════════
// LOCAL IMAGE UTILITIES
// ═══════════════════════════════════════════════════════════════

async function listLocalImages(folder) {
  const images = [];
  const exts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];

  try {
    const entries = await fs.readdir(folder, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (exts.includes(ext)) {
          images.push(path.join(folder, entry.name));
        }
      }
    }
    const stats = await Promise.all(images.map(async p => ({ path: p, mtime: (await fs.stat(p)).mtime })));
    stats.sort((a, b) => b.mtime - a.mtime);
    return stats.map(s => s.path);
  } catch (e) {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// HTTP SERVER
// ═══════════════════════════════════════════════════════════════

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // Serve frontend
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = await fs.readFile(path.join(__dirname, "index.html"), "utf-8");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
      return;
    }

    if (url.pathname === "/chat.html" || url.pathname === "/chat") {
      const html = await fs.readFile(path.join(__dirname, "chat.html"), "utf-8");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
      return;
    }

    // Search endpoint
    if (url.pathname === "/search") {
      const query = url.searchParams.get("q");
      if (!query) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing query" }));
        return;
      }

      const images = await searchImages(query);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ images }));
      return;
    }

    // Tool execution endpoint
    if (url.pathname === "/tool" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
      }

      try {
        const { name, args } = JSON.parse(body);
        const result = await executeTool(name, args || {});
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    // Local folder endpoint
    if (url.pathname === "/local") {
      const folder = url.searchParams.get("folder");
      if (!folder) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing folder" }));
        return;
      }

      const images = await listLocalImages(folder);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ images }));
      return;
    }

    // Serve local image
    if (url.pathname === "/image") {
      const imgPath = url.searchParams.get("path");
      if (!imgPath) {
        res.writeHead(400);
        res.end("Missing path");
        return;
      }

      try {
        const data = await fs.readFile(imgPath);
        const ext = path.extname(imgPath).toLowerCase();
        const mimeTypes = {
          ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
          ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
        };
        res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
      return;
    }

    // Skills API endpoints
    if (url.pathname === "/skills") {
      const skills = await listSkills();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ skills }));
      return;
    }

    if (url.pathname === "/skill" && req.method === "GET") {
      const name = url.searchParams.get("name");
      if (!name) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing skill name" }));
        return;
      }
      const skill = await loadSkill(name);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(skill));
      return;
    }

    // 404
    res.writeHead(404);
    res.end("Not found");

  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  }
});

// ═══════════════════════════════════════════════════════════════
// MCP PROTOCOL SUPPORT (stdio mode)
// ═══════════════════════════════════════════════════════════════

const MCP_TOOLS = [
  { name: "list_skills", description: "List all installed skills", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "load_skill", description: "Load a skill's instructions", inputSchema: { type: "object", properties: { name: { type: "string", description: "Skill name" } }, required: ["name"] } },
  { name: "install_skill", description: "Install a skill from GitHub URL", inputSchema: { type: "object", properties: { url: { type: "string", description: "GitHub URL" } }, required: ["url"] } },
  { name: "get_current_time", description: "Get current date and time", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "calculator", description: "Evaluate a math expression", inputSchema: { type: "object", properties: { expression: { type: "string", description: "Math expression" } }, required: ["expression"] } },
  { name: "fetch_url", description: "Fetch content from a URL", inputSchema: { type: "object", properties: { url: { type: "string", description: "URL to fetch" } }, required: ["url"] } },
  { name: "web_search", description: "Search the web using DuckDuckGo", inputSchema: { type: "object", properties: { query: { type: "string", description: "Search query" } }, required: ["query"] } },
  { name: "web_image_search", description: "Search and download images", inputSchema: { type: "object", properties: { query: { type: "string", description: "Search query" }, count: { type: "number", description: "Number of images" } }, required: ["query"] } },
  { name: "wikipedia", description: "Search Wikipedia", inputSchema: { type: "object", properties: { topic: { type: "string", description: "Topic to search" } }, required: ["topic"] } },
  { name: "read_file", description: "Read a file's contents", inputSchema: { type: "object", properties: { file_path: { type: "string", description: "Path to file" }, start_line: { type: "number" }, max_lines: { type: "number" } }, required: ["file_path"] } },
  { name: "write_file", description: "Write content to a file", inputSchema: { type: "object", properties: { file_path: { type: "string", description: "Path to file" }, content: { type: "string", description: "Content to write" } }, required: ["file_path", "content"] } },
  { name: "edit_file", description: "Edit a file by replacing text", inputSchema: { type: "object", properties: { file_path: { type: "string" }, old_string: { type: "string" }, new_string: { type: "string" } }, required: ["file_path", "old_string", "new_string"] } },
  { name: "list_directory", description: "List directory contents", inputSchema: { type: "object", properties: { path: { type: "string", description: "Directory path" } }, required: [] } },
  { name: "create_directory", description: "Create a directory", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "delete_file", description: "Delete a file", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "move_file", description: "Move/rename a file", inputSchema: { type: "object", properties: { source: { type: "string" }, destination: { type: "string" } }, required: ["source", "destination"] } },
  { name: "copy_file", description: "Copy a file", inputSchema: { type: "object", properties: { source: { type: "string" }, destination: { type: "string" } }, required: ["source", "destination"] } },
  { name: "file_info", description: "Get file information", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "get_working_directory", description: "Get current working directory", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "set_working_directory", description: "Set working directory", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "insert_at_line", description: "Insert text at a specific line", inputSchema: { type: "object", properties: { file_path: { type: "string" }, line: { type: "number" }, content: { type: "string" } }, required: ["file_path", "line", "content"] } },
  { name: "replace_lines", description: "Replace a range of lines", inputSchema: { type: "object", properties: { file_path: { type: "string" }, start_line: { type: "number" }, end_line: { type: "number" }, content: { type: "string" } }, required: ["file_path", "start_line", "end_line", "content"] } },
  { name: "append_to_file", description: "Append content to a file", inputSchema: { type: "object", properties: { file_path: { type: "string" }, content: { type: "string" } }, required: ["file_path", "content"] } },
  { name: "prepend_to_file", description: "Prepend content to a file", inputSchema: { type: "object", properties: { file_path: { type: "string" }, content: { type: "string" } }, required: ["file_path", "content"] } },
  { name: "execute_command", description: "Execute a shell command", inputSchema: { type: "object", properties: { command: { type: "string" }, working_dir: { type: "string" }, timeout: { type: "number" } }, required: ["command"] } },
  { name: "execute_background", description: "Execute command in background", inputSchema: { type: "object", properties: { command: { type: "string" }, working_dir: { type: "string" } }, required: ["command"] } },
  { name: "read_output", description: "Read output from background session", inputSchema: { type: "object", properties: { session_id: { type: "string" } }, required: ["session_id"] } },
  { name: "kill_session", description: "Kill a background session", inputSchema: { type: "object", properties: { session_id: { type: "string" } }, required: ["session_id"] } },
  { name: "list_sessions", description: "List all background sessions", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "glob_search", description: "Find files matching a glob pattern", inputSchema: { type: "object", properties: { pattern: { type: "string" }, base_path: { type: "string" } }, required: ["pattern"] } },
  { name: "grep_search", description: "Search for pattern in files", inputSchema: { type: "object", properties: { pattern: { type: "string" }, path: { type: "string" }, include: { type: "string" } }, required: ["pattern"] } },
  { name: "find_definition", description: "Find code definition", inputSchema: { type: "object", properties: { symbol: { type: "string" }, path: { type: "string" } }, required: ["symbol"] } },
  { name: "git_status", description: "Show git status", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: [] } },
  { name: "git_diff", description: "Show git diff", inputSchema: { type: "object", properties: { path: { type: "string" }, staged: { type: "boolean" }, file: { type: "string" } }, required: [] } },
  { name: "git_log", description: "Show git log", inputSchema: { type: "object", properties: { path: { type: "string" }, count: { type: "number" } }, required: [] } },
  { name: "git_add", description: "Stage files for commit", inputSchema: { type: "object", properties: { files: { type: "array", items: { type: "string" } }, path: { type: "string" } }, required: ["files"] } },
  { name: "git_commit", description: "Create a git commit", inputSchema: { type: "object", properties: { message: { type: "string" }, path: { type: "string" } }, required: ["message"] } },
  { name: "git_branch", description: "List or create branches", inputSchema: { type: "object", properties: { name: { type: "string" }, path: { type: "string" } }, required: [] } },
  { name: "git_checkout", description: "Switch branches or restore files", inputSchema: { type: "object", properties: { target: { type: "string" }, create: { type: "boolean" }, path: { type: "string" } }, required: ["target"] } },
  { name: "git_push", description: "Push to remote", inputSchema: { type: "object", properties: { remote: { type: "string" }, branch: { type: "string" }, path: { type: "string" } }, required: [] } },
  { name: "git_pull", description: "Pull from remote", inputSchema: { type: "object", properties: { remote: { type: "string" }, branch: { type: "string" }, path: { type: "string" } }, required: [] } },
  { name: "git_clone", description: "Clone a repository", inputSchema: { type: "object", properties: { url: { type: "string" }, destination: { type: "string" } }, required: ["url"] } },
  { name: "think", description: "Record a thinking note", inputSchema: { type: "object", properties: { thought: { type: "string" } }, required: ["thought"] } },
  { name: "reason", description: "Structured reasoning about a problem", inputSchema: { type: "object", properties: { problem: { type: "string" }, considerations: { type: "array", items: { type: "string" } }, conclusion: { type: "string" } }, required: ["problem", "considerations", "conclusion"] } },
  { name: "evaluate_options", description: "Evaluate multiple options", inputSchema: { type: "object", properties: { question: { type: "string" }, options: { type: "array" } }, required: ["question", "options"] } },
  { name: "task_list", description: "List all tasks", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "task_add", description: "Add a new task", inputSchema: { type: "object", properties: { description: { type: "string" }, priority: { type: "string" } }, required: ["description"] } },
  { name: "task_update", description: "Update a task", inputSchema: { type: "object", properties: { task_id: { type: "number" }, status: { type: "string" }, notes: { type: "string" } }, required: ["task_id"] } },
  { name: "task_delete", description: "Delete a task", inputSchema: { type: "object", properties: { task_id: { type: "number" } }, required: ["task_id"] } },
  { name: "task_clear", description: "Clear completed or all tasks", inputSchema: { type: "object", properties: { completed_only: { type: "boolean" } }, required: [] } },
  { name: "task_bulk_add", description: "Add multiple tasks at once", inputSchema: { type: "object", properties: { tasks: { type: "array", items: { type: "string" } } }, required: ["tasks"] } },
  { name: "memory_store", description: "Store a note in memory", inputSchema: { type: "object", properties: { key: { type: "string" }, value: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["key", "value"] } },
  { name: "memory_recall", description: "Recall notes from memory", inputSchema: { type: "object", properties: { query: { type: "string" }, tag: { type: "string" } }, required: [] } },
  { name: "memory_list", description: "List all stored memories", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "memory_delete", description: "Delete a memory", inputSchema: { type: "object", properties: { key: { type: "string" } }, required: ["key"] } },
  { name: "scratchpad_write", description: "Write to a named scratchpad", inputSchema: { type: "object", properties: { name: { type: "string" }, content: { type: "string" }, append: { type: "boolean" } }, required: ["name", "content"] } },
  { name: "scratchpad_read", description: "Read from a scratchpad", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "scratchpad_list", description: "List all scratchpads", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "context_save", description: "Save conversation context", inputSchema: { type: "object", properties: { name: { type: "string" }, context: { type: "object" } }, required: ["name", "context"] } },
  { name: "context_load", description: "Load saved context", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "plan_create", description: "Create a new plan", inputSchema: { type: "object", properties: { goal: { type: "string" }, context: { type: "string" }, steps: { type: "array" } }, required: ["goal", "steps"] } },
  { name: "plan_status", description: "Show current plan status", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "plan_step_complete", description: "Mark a plan step as complete", inputSchema: { type: "object", properties: { step_index: { type: "number" }, result: { type: "string" } }, required: ["step_index"] } },
  { name: "plan_step_skip", description: "Skip a plan step", inputSchema: { type: "object", properties: { step_index: { type: "number" }, reason: { type: "string" } }, required: ["step_index"] } },
  { name: "plan_complete", description: "Mark entire plan as complete", inputSchema: { type: "object", properties: { summary: { type: "string" } }, required: [] } },
  { name: "plan_abandon", description: "Abandon current plan", inputSchema: { type: "object", properties: { reason: { type: "string" } }, required: [] } },
  { name: "plan_history", description: "Show plan history", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "conversation_log", description: "Log a conversation message", inputSchema: { type: "object", properties: { role: { type: "string" }, content: { type: "string" } }, required: ["role", "content"] } },
  { name: "conversation_summarize", description: "Summarize recent conversation", inputSchema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] } },
  { name: "conversation_context", description: "Get conversation context", inputSchema: { type: "object", properties: { last_n: { type: "number" } }, required: [] } },
  { name: "ask_user", description: "Ask the user a question", inputSchema: { type: "object", properties: { question: { type: "string" }, options: { type: "array" }, default: { type: "string" } }, required: ["question"] } },
  { name: "confirm", description: "Ask user for confirmation", inputSchema: { type: "object", properties: { action: { type: "string" }, consequences: { type: "string" } }, required: ["action"] } },
  { name: "present_choices", description: "Present choices to user", inputSchema: { type: "object", properties: { prompt: { type: "string" }, choices: { type: "array" } }, required: ["prompt", "choices"] } },
  { name: "notify_user", description: "Send a notification to user", inputSchema: { type: "object", properties: { message: { type: "string" }, type: { type: "string" } }, required: ["message"] } },
  { name: "read_image", description: "Read an image file as base64", inputSchema: { type: "object", properties: { file_path: { type: "string" } }, required: ["file_path"] } },
  { name: "read_pdf", description: "Extract text from a PDF", inputSchema: { type: "object", properties: { file_path: { type: "string" } }, required: ["file_path"] } },
  { name: "take_screenshot", description: "Take a screenshot", inputSchema: { type: "object", properties: { output_path: { type: "string" } }, required: [] } },
  { name: "notebook_read", description: "Read a Jupyter notebook", inputSchema: { type: "object", properties: { file_path: { type: "string" } }, required: ["file_path"] } },
  { name: "notebook_edit_cell", description: "Edit a notebook cell", inputSchema: { type: "object", properties: { file_path: { type: "string" }, cell_index: { type: "number" }, source: { type: "string" }, cell_type: { type: "string" } }, required: ["file_path", "cell_index", "source"] } },
  { name: "notebook_insert_cell", description: "Insert a new notebook cell", inputSchema: { type: "object", properties: { file_path: { type: "string" }, index: { type: "number" }, source: { type: "string" }, cell_type: { type: "string" } }, required: ["file_path", "source"] } },
  { name: "notebook_create", description: "Create a new notebook", inputSchema: { type: "object", properties: { file_path: { type: "string" }, cells: { type: "array" } }, required: ["file_path"] } },
];

function sendMcpResponse(response) {
  const json = JSON.stringify(response);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
}

async function handleMcpMessage(message) {
  const { id, method, params } = message;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "qwen3-mcp-server", version: "1.0.0" }
        }
      };

    case "notifications/initialized":
      return null; // No response needed

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: MCP_TOOLS }
      };

    case "tools/call":
      try {
        const result = await executeTool(params.name, params.arguments || {});
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: result.result || JSON.stringify(result) }],
            isError: !!result.error
          }
        };
      } catch (e) {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: `Error: ${e.message}` }],
            isError: true
          }
        };
      }

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown method: ${method}` }
      };
  }
}

function startMcpMode() {
  let buffer = "";

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", async (chunk) => {
    buffer += chunk;

    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;

      const header = buffer.slice(0, headerEnd);
      const match = header.match(/Content-Length: (\d+)/i);
      if (!match) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(match[1], 10);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;

      if (buffer.length < messageEnd) break;

      const messageStr = buffer.slice(messageStart, messageEnd);
      buffer = buffer.slice(messageEnd);

      try {
        const message = JSON.parse(messageStr);
        const response = await handleMcpMessage(message);
        if (response) sendMcpResponse(response);
      } catch (e) {
        sendMcpResponse({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" }
        });
      }
    }
  });

  process.stderr.write("Qwen3 MCP Server running in MCP mode (stdio)\n");
}

// ═══════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════

if (process.argv.includes("--mcp")) {
  // MCP stdio mode for LM Studio
  startMcpMode();
} else {
  // HTTP server mode for chat.html
  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║           Qwen3 MCP Server - Claude Code Capabilities                ║
╠══════════════════════════════════════════════════════════════════════╣
║  HTTP Mode: http://localhost:${PORT}                                    ║
║  MCP Mode:  node server.js --mcp                                     ║
║                                                                      ║
║  Tools available: 80+                                                ║
║  • File operations (read, write, edit, search)                       ║
║  • Command execution (bash, git)                                     ║
║  • Web tools (search, wikipedia, fetch)                              ║
║  • Skills system (awesome-agent-skills compatible)                   ║
║  • Memory & planning tools                                           ║
║  • Notebook support                                                  ║
╚══════════════════════════════════════════════════════════════════════╝
`);
  });
}
