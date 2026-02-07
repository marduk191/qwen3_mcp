import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { resolvePath, getWorkingDir } from "../utils/paths.js";

export const searchTools = [
  {
    name: "glob_search",
    description:
      "Find files matching a glob pattern. Use patterns like '**/*.js' for all JS files, 'src/**/*.ts' for TypeScript in src folder.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Glob pattern (e.g., '**/*.js', 'src/**/*.tsx')",
        },
        cwd: {
          type: "string",
          description: "Base directory to search from (default: working directory)",
        },
        ignore: {
          type: "array",
          items: { type: "string" },
          description: "Patterns to ignore (default: node_modules, .git)",
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "grep_search",
    description:
      "Search for a pattern in files. Returns matching lines with file paths and line numbers. Supports regex.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Search pattern (regex supported)",
        },
        path: {
          type: "string",
          description: "File or directory to search in (default: working directory)",
        },
        file_pattern: {
          type: "string",
          description: "Glob pattern to filter files (e.g., '*.ts')",
        },
        case_insensitive: {
          type: "boolean",
          description: "Case insensitive search (default: false)",
        },
        context: {
          type: "number",
          description: "Lines of context around matches",
        },
        max_results: {
          type: "number",
          description: "Maximum results to return (default: 100)",
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "find_definition",
    description:
      "Search for function, class, or variable definitions in code. Looks for common patterns like 'function name', 'class Name', 'const name ='.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the function, class, or variable to find",
        },
        path: {
          type: "string",
          description: "Directory to search in (default: working directory)",
        },
        file_pattern: {
          type: "string",
          description: "File pattern (e.g., '*.ts', '*.py')",
        },
      },
      required: ["name"],
    },
  },
];

async function getFiles(dir, filePattern, ignore) {
  const defaultIgnore = ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"];
  const ignorePatterns = ignore || defaultIgnore;

  const baseDir = dir || getWorkingDir();
  const pattern = filePattern
    ? path.join(baseDir, "**", filePattern)
    : path.join(baseDir, "**/*");

  const files = await glob(pattern, {
    ignore: ignorePatterns,
    nodir: true,
    absolute: true,
  });

  return files;
}

async function searchInFile(filePath, regex, context = 0, maxResults = 100) {
  const results = [];

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length && results.length < maxResults; i++) {
      if (regex.test(lines[i])) {
        const startLine = Math.max(0, i - context);
        const endLine = Math.min(lines.length - 1, i + context);

        let matchText = "";
        for (let j = startLine; j <= endLine; j++) {
          const prefix = j === i ? ">" : " ";
          matchText += `${prefix} ${j + 1}: ${lines[j]}\n`;
        }

        results.push({
          file: filePath,
          line: i + 1,
          match: lines[i].trim(),
          context: context > 0 ? matchText.trim() : undefined,
        });
      }
    }
  } catch (e) {
    // Skip files that can't be read (binary, permissions, etc.)
  }

  return results;
}

export async function handleSearchTool(name, args) {
  switch (name) {
    case "glob_search": {
      const baseDir = resolvePath(args.cwd || ".");
      const defaultIgnore = ["**/node_modules/**", "**/.git/**"];
      const files = await glob(args.pattern, {
        cwd: baseDir,
        ignore: args.ignore || defaultIgnore,
        nodir: true,
      });

      if (files.length === 0) {
        return {
          content: [{ type: "text", text: "No files found matching pattern" }],
        };
      }

      const output = files.slice(0, 500).join("\n");
      const suffix = files.length > 500 ? `\n\n... and ${files.length - 500} more files` : "";

      return {
        content: [{ type: "text", text: output + suffix }],
      };
    }

    case "grep_search": {
      const flags = args.case_insensitive ? "gi" : "g";
      const regex = new RegExp(args.pattern, flags);
      const searchPath = resolvePath(args.path || ".");
      const maxResults = args.max_results || 100;

      // Check if it's a file or directory
      const stat = await fs.stat(searchPath);
      let files;

      if (stat.isFile()) {
        files = [searchPath];
      } else {
        files = await getFiles(searchPath, args.file_pattern);
      }

      const allResults = [];

      for (const file of files) {
        if (allResults.length >= maxResults) break;

        const remaining = maxResults - allResults.length;
        const results = await searchInFile(file, regex, args.context || 0, remaining);
        allResults.push(...results);
      }

      if (allResults.length === 0) {
        return {
          content: [{ type: "text", text: "No matches found" }],
        };
      }

      let output = "";
      for (const r of allResults) {
        if (r.context) {
          output += `\n${r.file}:\n${r.context}\n`;
        } else {
          output += `${r.file}:${r.line}: ${r.match}\n`;
        }
      }

      if (allResults.length >= maxResults) {
        output += `\n(Results limited to ${maxResults})`;
      }

      return {
        content: [{ type: "text", text: output.trim() }],
      };
    }

    case "find_definition": {
      const searchPath = resolvePath(args.path || ".");
      const defName = args.name;

      // Common definition patterns
      const patterns = [
        `function\\s+${defName}\\s*\\(`,
        `class\\s+${defName}\\s*(extends|implements|\\{)`,
        `const\\s+${defName}\\s*=`,
        `let\\s+${defName}\\s*=`,
        `var\\s+${defName}\\s*=`,
        `def\\s+${defName}\\s*\\(`,
        `async\\s+function\\s+${defName}\\s*\\(`,
        `${defName}\\s*:\\s*function`,
        `${defName}\\s*=\\s*\\(.*\\)\\s*=>`,
        `${defName}\\s*=\\s*async\\s*\\(`,
        `export\\s+(default\\s+)?(function|class|const|let)\\s+${defName}`,
        `interface\\s+${defName}\\s*\\{`,
        `type\\s+${defName}\\s*=`,
      ];

      const combinedPattern = patterns.join("|");
      const regex = new RegExp(combinedPattern, "g");

      const files = await getFiles(searchPath, args.file_pattern);
      const results = [];

      for (const file of files) {
        if (results.length >= 50) break;
        const fileResults = await searchInFile(file, regex, 2, 50 - results.length);
        results.push(...fileResults);
      }

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: `No definition found for: ${defName}` }],
        };
      }

      let output = `Definitions of '${defName}':\n\n`;
      for (const r of results) {
        output += `${r.file}:${r.line}\n`;
        if (r.context) {
          output += `${r.context}\n\n`;
        }
      }

      return {
        content: [{ type: "text", text: output.trim() }],
      };
    }

    default:
      throw new Error(`Unknown search tool: ${name}`);
  }
}
