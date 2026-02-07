import fs from "fs/promises";
import path from "path";
import { resolvePath, getWorkingDir } from "../utils/paths.js";

export const fileTools = [
  {
    name: "read_file",
    description:
      "Read the contents of a file. Returns the file content with line numbers. Default limit is 500 lines to prevent timeouts. Use offset/limit for large files.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Absolute or relative path to the file to read",
        },
        offset: {
          type: "number",
          description: "Line number to start reading from (1-indexed, default: 1)",
        },
        limit: {
          type: "number",
          description: "Maximum number of lines to read (default: 500)",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "write_file",
    description:
      "Create a new file or completely overwrite an existing file with new content. Use edit_file for partial modifications.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file to write",
        },
        path: {
          type: "string",
          description: "Alias for file_path",
        },
        content: {
          type: "string",
          description: "Complete content to write to the file",
        },
        file_content: {
          type: "string",
          description: "Alias for content",
        },
        text: {
          type: "string",
          description: "Alias for content",
        },
      },
    },
  },
  {
    name: "list_directory",
    description:
      "List files and directories in a given path. Returns names with type indicators (/ for directories).",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path to list (default: working directory)",
        },
        recursive: {
          type: "boolean",
          description: "Whether to list recursively (default: false)",
        },
      },
    },
  },
  {
    name: "list_dir",
    description:
      "List files and directories (alias for list_directory).",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path to list",
        },
      },
    },
  },
  {
    name: "create_directory",
    description: "Create a new directory, including parent directories if needed.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path of the directory to create",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file or empty directory.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to delete",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "move_file",
    description: "Move or rename a file or directory.",
    inputSchema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description: "Source path",
        },
        destination: {
          type: "string",
          description: "Destination path",
        },
      },
      required: ["source", "destination"],
    },
  },
  {
    name: "copy_file",
    description: "Copy a file to a new location.",
    inputSchema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description: "Source file path",
        },
        destination: {
          type: "string",
          description: "Destination file path",
        },
      },
      required: ["source", "destination"],
    },
  },
  {
    name: "file_info",
    description: "Get metadata about a file (size, modification time, type).",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file or directory",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "get_working_directory",
    description: "Get the current working directory that all file operations are restricted to.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Helper to get path from various parameter names Qwen3 might use
function getPath(args, ...names) {
  for (const name of names) {
    if (args[name]) return args[name];
  }
  return null;
}

export async function handleFileTool(name, args) {
  switch (name) {
    case "read_file": {
      // Accept: file_path, path, filepath, file
      const inputPath = getPath(args, 'file_path', 'path', 'filepath', 'file');
      if (!inputPath) {
        throw new Error('Missing required parameter: file_path');
      }
      const filePath = resolvePath(inputPath);
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");
      const offset = (args.offset || args.start || 1) - 1;
      // Default limit to 500 lines to prevent WebSocket timeouts in LM Studio
      const limit = args.limit || args.lines || args.count || Math.min(500, lines.length);
      const selectedLines = lines.slice(offset, offset + limit);
      const totalLines = lines.length;

      const numberedLines = selectedLines
        .map((line, i) => `${String(offset + i + 1).padStart(6)}\t${line}`)
        .join("\n");

      // Add info about truncation if file is large
      let result = numberedLines;
      if (totalLines > offset + limit) {
        result += `\n\n--- Showing lines ${offset + 1}-${offset + selectedLines.length} of ${totalLines} total ---`;
        result += `\n--- Use offset and limit parameters to read more ---`;
      }

      return {
        content: [{ type: "text", text: result }],
      };
    }

    case "write_file": {
      // Accept: file_path, path, filepath, file
      const inputPath = getPath(args, 'file_path', 'path', 'filepath', 'file');
      if (!inputPath) {
        throw new Error('Missing required parameter: file_path');
      }
      // Accept: content, file_content, text, data
      let content = args.content || args.file_content || args.text || args.data;
      if (content === undefined) {
        throw new Error('Missing required parameter: content');
      }
      // If content is an object, stringify it (handles JSON objects passed by model)
      if (typeof content === 'object') {
        content = JSON.stringify(content, null, 2);
      }
      const filePath = resolvePath(inputPath);
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, String(content), "utf-8");
      return {
        content: [{ type: "text", text: `File written: ${filePath}` }],
      };
    }

    case "list_directory":
    case "list_dir": {
      const dirPath = resolvePath(args.path || args.directory || ".");
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const list = entries
        .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
        .sort()
        .join("\n");
      return {
        content: [{ type: "text", text: list || "(empty directory)" }],
      };
    }

    case "create_directory": {
      const dirPath = resolvePath(args.path);
      await fs.mkdir(dirPath, { recursive: true });
      return {
        content: [{ type: "text", text: `Directory created: ${dirPath}` }],
      };
    }

    case "delete_file": {
      const targetPath = resolvePath(args.path);
      await fs.rm(targetPath, { recursive: false });
      return {
        content: [{ type: "text", text: `Deleted: ${targetPath}` }],
      };
    }

    case "move_file": {
      const sourcePath = resolvePath(args.source);
      const destPath = resolvePath(args.destination);
      await fs.rename(sourcePath, destPath);
      return {
        content: [
          { type: "text", text: `Moved: ${sourcePath} -> ${destPath}` },
        ],
      };
    }

    case "copy_file": {
      const sourcePath = resolvePath(args.source);
      const destPath = resolvePath(args.destination);
      await fs.copyFile(sourcePath, destPath);
      return {
        content: [
          { type: "text", text: `Copied: ${sourcePath} -> ${destPath}` },
        ],
      };
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
      return {
        content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
      };
    }

    case "get_working_directory": {
      return {
        content: [{ type: "text", text: `Working directory: ${getWorkingDir()}` }],
      };
    }

    default:
      throw new Error(`Unknown file tool: ${name}`);
  }
}
