import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import https from "https";
import http from "http";

const SKILLS_DIR = path.join(process.cwd(), "skills");

export const skillsTools = [
  {
    name: "list_skills",
    description: "List all installed skills. Skills are instruction packages that teach the AI specialized tasks like creating documents, code review, etc.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "load_skill",
    description: "Load a skill's instructions to learn how to perform a task. Use when user asks to 'use the [name] skill', 'load skill [name]', or when you need specialized instructions. After loading, follow the skill's instructions.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the skill to load (e.g., 'docx', 'code-review', 'modern-python')",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "install_skill",
    description: "Install a new skill from a GitHub URL. Supports full repos (github.com/user/repo) and subdirectories (github.com/user/repo/tree/main/path/to/skill). Popular: anthropics/skills (docx, pptx, xlsx, pdf), trailofbits/skills (security).",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "GitHub URL of the skill to install",
        },
      },
      required: ["url"],
    },
  },
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const request = lib.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 30000,
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return fetchUrl(response.headers.location).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    });
    request.on("error", reject);
    request.on("timeout", () => { request.destroy(); reject(new Error("Timeout")); });
  });
}

async function listSkills() {
  const skills = [];
  try {
    const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(SKILLS_DIR, entry.name);
        const skill = { name: entry.name, path: skillPath };

        const instructionFiles = ["SKILL.md", "skill.md", "README.md", "readme.md", "instructions.md"];
        for (const f of instructionFiles) {
          try {
            const content = await fs.readFile(path.join(skillPath, f), "utf-8");
            skill.instructionFile = f;
            const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
            skill.description = lines[0]?.substring(0, 200) || "No description";
            break;
          } catch {}
        }

        if (!skill.instructionFile) {
          skill.description = "No instruction file found";
        }

        skills.push(skill);
      }
    }
  } catch (e) {
    // Skills directory doesn't exist yet
  }
  return skills;
}

async function loadSkill(skillName) {
  const skillPath = path.join(SKILLS_DIR, skillName);
  const result = { name: skillName, instructions: "", files: [], dependencies: [] };

  try {
    const instructionFiles = ["SKILL.md", "skill.md", "README.md", "readme.md", "instructions.md"];
    for (const f of instructionFiles) {
      try {
        result.instructions = await fs.readFile(path.join(skillPath, f), "utf-8");
        result.instructionFile = f;
        break;
      } catch {}
    }

    const entries = await fs.readdir(skillPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        result.files.push(entry.name);
      } else if (entry.isDirectory()) {
        result.files.push(entry.name + "/");
      }
    }

    if (result.instructions) {
      const npmMatches = result.instructions.match(/npm install[^\n`]*/g);
      if (npmMatches) {
        result.dependencies.push(...npmMatches.map((m) => m.trim()));
      }
      const pipMatches = result.instructions.match(/pip install[^\n`]*/g);
      if (pipMatches) {
        result.dependencies.push(...pipMatches.map((m) => m.trim()));
      }
      const tools = ["pandoc", "LibreOffice", "soffice", "pdftoppm", "ffmpeg", "imagemagick"];
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
    subPath = treeMatch[4].replace(/\/$/, "");
    skillName = subPath.split("/").pop();
  } else {
    const repoMatch = repoUrl.match(/(?:https?:\/\/)?(?:github\.com\/)?([^\/]+)\/([^\/\s]+)/);
    if (!repoMatch) {
      return { error: "Invalid GitHub URL format." };
    }
    user = repoMatch[1];
    repoName = repoMatch[2].replace(/\.git$/, "");
    branch = "main";
    subPath = null;
    skillName = repoName.replace(/^skill-/, "").replace(/-skill$/, "");
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
    if (branch === "main") {
      try {
        branch = "master";
        zipBuffer = await tryDownload("master");
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
    $source = Join-Path $tempDir "${sourcePath.replace(/\//g, "\\")}"
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
    exec(`powershell -ExecutionPolicy Bypass -File "${tempScript}"`, { timeout: 60000 }, async (error, stdout) => {
      const output = stdout.trim();
      try { await fs.unlink(tempScript); } catch {}

      if (error || !output.includes("SUCCESS")) {
        resolve({ result: `Downloaded but extraction failed. Manual extract: ${tempZip}`, isError: true });
        return;
      }

      try {
        await fs.access(targetDir);
        const skill = await loadSkill(skillName);
        let response = `Skill "${skillName}" installed!\nLocation: ${targetDir}\n`;
        if (skill.files) response += `Files: ${skill.files.join(", ")}\n`;
        if (skill.dependencies?.length > 0) {
          response += `\nDependencies:\n`;
          skill.dependencies.forEach((d) => (response += `  ${d}\n`));
        }
        resolve({ result: response });
      } catch (e) {
        resolve({ result: `Installation may have succeeded. Check ${targetDir}` });
      }
    });
  });
}

export async function handleSkillsTool(name, args) {
  switch (name) {
    case "list_skills": {
      const skills = await listSkills();
      if (skills.length === 0) {
        return {
          content: [{ type: "text", text: `No skills installed.\n\nSkills directory: ${SKILLS_DIR}\n\nInstall with install_skill tool.` }],
        };
      }
      let response = `Installed Skills (${skills.length}):\n${"═".repeat(50)}\n\n`;
      for (const s of skills) {
        response += `📦 ${s.name}\n   ${s.description}\n`;
        if (s.instructionFile) response += `   File: ${s.instructionFile}\n`;
        response += "\n";
      }
      return {
        content: [{ type: "text", text: response }],
      };
    }

    case "load_skill": {
      const skill = await loadSkill(args.name);
      if (skill.error) {
        return {
          content: [{ type: "text", text: skill.error }],
          isError: true,
        };
      }
      let response = `Skill: ${skill.name}\n${"═".repeat(50)}\n\n`;
      response += `Files: ${skill.files.join(", ")}\n\n`;
      if (skill.dependencies?.length > 0) {
        response += `Dependencies:\n`;
        skill.dependencies.forEach((d) => (response += `  • ${d}\n`));
        response += "\n";
      }
      response += `Instructions:\n${"─".repeat(50)}\n${skill.instructions}`;
      return {
        content: [{ type: "text", text: response }],
      };
    }

    case "install_skill": {
      const result = await installSkillFromGithub(args.url);
      return {
        content: [{ type: "text", text: result.result || result.error }],
        isError: !!result.error || !!result.isError,
      };
    }

    default:
      throw new Error(`Unknown skills tool: ${name}`);
  }
}
