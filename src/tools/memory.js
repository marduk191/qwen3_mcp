import fs from "fs/promises";
import path from "path";
import os from "os";

const MEMORY_DIR = path.join(os.homedir(), ".lmstudio-mcp-memory");
const NOTES_FILE = path.join(MEMORY_DIR, "notes.json");
const CONTEXT_FILE = path.join(MEMORY_DIR, "context.json");

export const memoryTools = [
  {
    name: "memory_store",
    description:
      "Store a piece of information in persistent memory. Use this to remember important context, decisions, or facts across sessions.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Unique key/name for this memory",
        },
        value: {
          type: "string",
          description: "The information to remember",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tags for organization",
        },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "memory_recall",
    description:
      "Recall information from persistent memory by key or search.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Exact key to recall",
        },
        search: {
          type: "string",
          description: "Search term to find in keys, values, or tags",
        },
        tag: {
          type: "string",
          description: "Filter by tag",
        },
      },
    },
  },
  {
    name: "memory_list",
    description: "List all stored memories with their keys and tags.",
    inputSchema: {
      type: "object",
      properties: {
        tag: {
          type: "string",
          description: "Filter by tag",
        },
      },
    },
  },
  {
    name: "memory_delete",
    description: "Delete a memory by key.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Key of the memory to delete",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "scratchpad_write",
    description:
      "Write to a scratchpad file. Use for temporary notes, planning, or working through problems. Content persists between sessions.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Scratchpad name (default: 'default')",
        },
        content: {
          type: "string",
          description: "Content to write",
        },
        append: {
          type: "boolean",
          description: "Append instead of overwrite (default: false)",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "scratchpad_read",
    description: "Read from a scratchpad file.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Scratchpad name (default: 'default')",
        },
      },
    },
  },
  {
    name: "scratchpad_list",
    description: "List all available scratchpads.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "context_save",
    description:
      "Save conversation context/summary for later sessions. Use to maintain continuity across conversations.",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Project name to save context for",
        },
        summary: {
          type: "string",
          description: "Summary of current work/conversation",
        },
        key_points: {
          type: "array",
          items: { type: "string" },
          description: "Key points to remember",
        },
        next_steps: {
          type: "array",
          items: { type: "string" },
          description: "Planned next steps",
        },
      },
      required: ["project", "summary"],
    },
  },
  {
    name: "context_load",
    description: "Load saved context for a project to continue previous work.",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Project name to load context for",
        },
      },
      required: ["project"],
    },
  },
];

async function ensureDir() {
  await fs.mkdir(MEMORY_DIR, { recursive: true });
}

async function loadJson(file, defaultValue = {}) {
  try {
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

async function saveJson(file, data) {
  await ensureDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

export async function handleMemoryTool(name, args) {
  await ensureDir();

  switch (name) {
    case "memory_store": {
      const notes = await loadJson(NOTES_FILE, {});

      notes[args.key] = {
        value: args.value,
        tags: args.tags || [],
        created: notes[args.key]?.created || new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      await saveJson(NOTES_FILE, notes);

      return {
        content: [{ type: "text", text: `Stored memory: "${args.key}"` }],
      };
    }

    case "memory_recall": {
      const notes = await loadJson(NOTES_FILE, {});

      if (args.key) {
        const note = notes[args.key];
        if (!note) {
          return {
            content: [{ type: "text", text: `Memory not found: "${args.key}"` }],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `[${args.key}]\nTags: ${note.tags.join(", ") || "none"}\nUpdated: ${note.updated}\n\n${note.value}`,
            },
          ],
        };
      }

      // Search
      const results = [];
      const searchLower = (args.search || "").toLowerCase();
      const tagFilter = args.tag?.toLowerCase();

      for (const [key, note] of Object.entries(notes)) {
        const matchesSearch =
          !searchLower ||
          key.toLowerCase().includes(searchLower) ||
          note.value.toLowerCase().includes(searchLower) ||
          note.tags.some((t) => t.toLowerCase().includes(searchLower));

        const matchesTag =
          !tagFilter || note.tags.some((t) => t.toLowerCase() === tagFilter);

        if (matchesSearch && matchesTag) {
          results.push({ key, ...note });
        }
      }

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: "No matching memories found" }],
        };
      }

      let output = `Found ${results.length} memories:\n\n`;
      for (const r of results) {
        output += `[${r.key}] (${r.tags.join(", ") || "no tags"})\n`;
        output += r.value.slice(0, 200) + (r.value.length > 200 ? "..." : "") + "\n\n";
      }

      return {
        content: [{ type: "text", text: output.trim() }],
      };
    }

    case "memory_list": {
      const notes = await loadJson(NOTES_FILE, {});
      const keys = Object.keys(notes);

      if (keys.length === 0) {
        return {
          content: [{ type: "text", text: "No stored memories" }],
        };
      }

      let output = "Stored memories:\n" + "─".repeat(40) + "\n";

      for (const key of keys.sort()) {
        const note = notes[key];
        if (args.tag && !note.tags.includes(args.tag)) continue;
        output += `• ${key}`;
        if (note.tags.length > 0) {
          output += ` [${note.tags.join(", ")}]`;
        }
        output += "\n";
      }

      return {
        content: [{ type: "text", text: output }],
      };
    }

    case "memory_delete": {
      const notes = await loadJson(NOTES_FILE, {});

      if (!notes[args.key]) {
        return {
          content: [{ type: "text", text: `Memory not found: "${args.key}"` }],
          isError: true,
        };
      }

      delete notes[args.key];
      await saveJson(NOTES_FILE, notes);

      return {
        content: [{ type: "text", text: `Deleted memory: "${args.key}"` }],
      };
    }

    case "scratchpad_write": {
      const padName = args.name || "default";
      const padFile = path.join(MEMORY_DIR, `scratchpad_${padName}.txt`);

      if (args.append) {
        let existing = "";
        try {
          existing = await fs.readFile(padFile, "utf-8");
        } catch {
          // File doesn't exist yet
        }
        await fs.writeFile(padFile, existing + args.content);
      } else {
        await fs.writeFile(padFile, args.content);
      }

      return {
        content: [{ type: "text", text: `Wrote to scratchpad: ${padName}` }],
      };
    }

    case "scratchpad_read": {
      const padName = args.name || "default";
      const padFile = path.join(MEMORY_DIR, `scratchpad_${padName}.txt`);

      try {
        const content = await fs.readFile(padFile, "utf-8");
        return {
          content: [{ type: "text", text: `Scratchpad [${padName}]:\n${"─".repeat(40)}\n${content}` }],
        };
      } catch {
        return {
          content: [{ type: "text", text: `Scratchpad "${padName}" is empty or doesn't exist` }],
        };
      }
    }

    case "scratchpad_list": {
      const files = await fs.readdir(MEMORY_DIR);
      const pads = files
        .filter((f) => f.startsWith("scratchpad_") && f.endsWith(".txt"))
        .map((f) => f.replace("scratchpad_", "").replace(".txt", ""));

      if (pads.length === 0) {
        return {
          content: [{ type: "text", text: "No scratchpads found" }],
        };
      }

      return {
        content: [{ type: "text", text: `Scratchpads:\n${pads.map((p) => `• ${p}`).join("\n")}` }],
      };
    }

    case "context_save": {
      const contexts = await loadJson(CONTEXT_FILE, {});

      contexts[args.project] = {
        summary: args.summary,
        key_points: args.key_points || [],
        next_steps: args.next_steps || [],
        saved: new Date().toISOString(),
      };

      await saveJson(CONTEXT_FILE, contexts);

      return {
        content: [{ type: "text", text: `Saved context for project: ${args.project}` }],
      };
    }

    case "context_load": {
      const contexts = await loadJson(CONTEXT_FILE, {});
      const ctx = contexts[args.project];

      if (!ctx) {
        return {
          content: [{ type: "text", text: `No saved context for project: ${args.project}` }],
        };
      }

      let output = `Project: ${args.project}\n`;
      output += `Last saved: ${ctx.saved}\n`;
      output += "═".repeat(40) + "\n\n";
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

      return {
        content: [{ type: "text", text: output }],
      };
    }

    default:
      throw new Error(`Unknown memory tool: ${name}`);
  }
}
