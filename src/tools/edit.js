import fs from "fs/promises";
import { resolvePath } from "../utils/paths.js";

export const editTools = [
  {
    name: "edit_file",
    description:
      "Make a precise edit to a file by replacing an exact string with new content. You must provide the exact text to replace, including whitespace and indentation. Use read_file first to see the current content.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file to edit",
        },
        old_string: {
          type: "string",
          description: "Exact string to find and replace (must be unique in the file)",
        },
        new_string: {
          type: "string",
          description: "String to replace it with",
        },
        replace_all: {
          type: "boolean",
          description: "Replace all occurrences (default: false, replaces first only)",
        },
      },
      required: ["file_path", "old_string", "new_string"],
    },
  },
  {
    name: "insert_at_line",
    description: "Insert content at a specific line number in a file.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file",
        },
        line: {
          type: "number",
          description: "Line number to insert at (1-indexed)",
        },
        content: {
          type: "string",
          description: "Content to insert",
        },
      },
      required: ["file_path", "line", "content"],
    },
  },
  {
    name: "replace_lines",
    description: "Replace a range of lines with new content.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file",
        },
        start_line: {
          type: "number",
          description: "Starting line number (1-indexed, inclusive)",
        },
        end_line: {
          type: "number",
          description: "Ending line number (1-indexed, inclusive)",
        },
        content: {
          type: "string",
          description: "New content to replace the lines with",
        },
      },
      required: ["file_path", "start_line", "end_line", "content"],
    },
  },
  {
    name: "append_to_file",
    description: "Append content to the end of a file.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file",
        },
        content: {
          type: "string",
          description: "Content to append",
        },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "prepend_to_file",
    description: "Add content to the beginning of a file.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file",
        },
        content: {
          type: "string",
          description: "Content to prepend",
        },
      },
      required: ["file_path", "content"],
    },
  },
];

export async function handleEditTool(name, args) {
  switch (name) {
    case "edit_file": {
      const filePath = resolvePath(args.file_path);
      const content = await fs.readFile(filePath, "utf-8");

      // Check if old_string exists
      if (!content.includes(args.old_string)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: The string to replace was not found in the file.\n\nMake sure you're using the exact text including whitespace and indentation. Use read_file first to see the current content.`,
            },
          ],
          isError: true,
        };
      }

      // Check if old_string is unique (when not replacing all)
      if (!args.replace_all) {
        const count = content.split(args.old_string).length - 1;
        if (count > 1) {
          return {
            content: [
              {
                type: "text",
                text: `Error: The string to replace appears ${count} times. Provide more context to make it unique, or set replace_all to true.`,
              },
            ],
            isError: true,
          };
        }
      }

      let newContent;
      if (args.replace_all) {
        newContent = content.split(args.old_string).join(args.new_string);
      } else {
        newContent = content.replace(args.old_string, args.new_string);
      }

      await fs.writeFile(filePath, newContent, "utf-8");

      return {
        content: [{ type: "text", text: `File edited: ${filePath}` }],
      };
    }

    case "insert_at_line": {
      const filePath = resolvePath(args.file_path);
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");
      const insertIndex = args.line - 1;

      if (insertIndex < 0 || insertIndex > lines.length) {
        return {
          content: [{ type: "text", text: `Invalid line number: ${args.line}` }],
          isError: true,
        };
      }

      const newLines = args.content.split("\n");
      lines.splice(insertIndex, 0, ...newLines);

      await fs.writeFile(filePath, lines.join("\n"), "utf-8");

      return {
        content: [
          { type: "text", text: `Inserted ${newLines.length} line(s) at line ${args.line}` },
        ],
      };
    }

    case "replace_lines": {
      const filePath = resolvePath(args.file_path);
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");
      const start = args.start_line - 1;
      const end = args.end_line;

      if (start < 0 || end > lines.length || start >= end) {
        return {
          content: [{ type: "text", text: `Invalid line range: ${args.start_line}-${args.end_line}` }],
          isError: true,
        };
      }

      const newLines = args.content.split("\n");
      lines.splice(start, end - start, ...newLines);

      await fs.writeFile(filePath, lines.join("\n"), "utf-8");

      return {
        content: [
          {
            type: "text",
            text: `Replaced lines ${args.start_line}-${args.end_line} with ${newLines.length} line(s)`,
          },
        ],
      };
    }

    case "append_to_file": {
      const filePath = resolvePath(args.file_path);
      const content = await fs.readFile(filePath, "utf-8");
      const newContent = content.endsWith("\n")
        ? content + args.content
        : content + "\n" + args.content;

      await fs.writeFile(filePath, newContent, "utf-8");

      return {
        content: [{ type: "text", text: `Content appended to: ${filePath}` }],
      };
    }

    case "prepend_to_file": {
      const filePath = resolvePath(args.file_path);
      const content = await fs.readFile(filePath, "utf-8");
      const newContent = args.content + "\n" + content;

      await fs.writeFile(filePath, newContent, "utf-8");

      return {
        content: [{ type: "text", text: `Content prepended to: ${filePath}` }],
      };
    }

    default:
      throw new Error(`Unknown edit tool: ${name}`);
  }
}
