/**
 * Context and conversation management tools
 * Summarization, compression, and context tracking
 */

import fs from "fs/promises";
import path from "path";
import os from "os";

const CONTEXT_DIR = path.join(os.homedir(), ".lmstudio-mcp-memory");
const SUMMARIES_FILE = path.join(CONTEXT_DIR, "summaries.json");

// In-memory conversation tracking
let conversationLog = [];
let summaries = [];

export const contextTools = [
  {
    name: "conversation_log",
    description:
      "Log an important point from the conversation for later summarization. Use this to track key decisions, findings, or actions taken.",
    inputSchema: {
      type: "object",
      properties: {
        entry: {
          type: "string",
          description: "The point to log",
        },
        type: {
          type: "string",
          enum: ["decision", "action", "finding", "requirement", "question", "answer"],
          description: "Type of entry",
        },
        importance: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Importance level",
        },
      },
      required: ["entry"],
    },
  },
  {
    name: "conversation_summarize",
    description:
      "Create a summary of the conversation so far. Use this when context is getting long or before starting a new phase of work.",
    inputSchema: {
      type: "object",
      properties: {
        focus: {
          type: "string",
          description: "What aspect to focus the summary on",
        },
        include_actions: {
          type: "boolean",
          description: "Include actions taken (default: true)",
        },
        include_decisions: {
          type: "boolean",
          description: "Include decisions made (default: true)",
        },
        clear_log: {
          type: "boolean",
          description: "Clear the log after summarizing (default: false)",
        },
      },
    },
  },
  {
    name: "conversation_checkpoint",
    description:
      "Create a checkpoint of current progress that can be restored later. Useful for long sessions or before risky operations.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for this checkpoint",
        },
        state: {
          type: "object",
          description: "Current state to save",
        },
        notes: {
          type: "string",
          description: "Notes about current progress",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "conversation_restore",
    description: "Restore context from a previous checkpoint.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Checkpoint name to restore",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "conversation_context",
    description:
      "Get the current conversation context including log entries and any active summaries.",
    inputSchema: {
      type: "object",
      properties: {
        include_log: {
          type: "boolean",
          description: "Include full log entries (default: true)",
        },
        include_summaries: {
          type: "boolean",
          description: "Include previous summaries (default: true)",
        },
      },
    },
  },
  {
    name: "batch_tools",
    description:
      "Execute multiple tool calls in sequence. Use this to run several operations together. Returns results from all tools.",
    inputSchema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Description of what this batch accomplishes",
        },
        tools: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              args: { type: "object" },
            },
          },
          description: "Array of tool calls to execute",
        },
        stop_on_error: {
          type: "boolean",
          description: "Stop execution if any tool fails (default: true)",
        },
      },
      required: ["tools"],
    },
  },
];

async function ensureDir() {
  await fs.mkdir(CONTEXT_DIR, { recursive: true });
}

async function loadSummaries() {
  try {
    const data = await fs.readFile(SUMMARIES_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { checkpoints: {}, history: [] };
  }
}

async function saveSummaries(data) {
  await ensureDir();
  await fs.writeFile(SUMMARIES_FILE, JSON.stringify(data, null, 2));
}

export async function handleContextTool(name, args) {
  switch (name) {
    case "conversation_log": {
      const entry = {
        content: args.entry,
        type: args.type || "finding",
        importance: args.importance || "medium",
        timestamp: new Date().toISOString(),
      };

      conversationLog.push(entry);

      return {
        content: [
          {
            type: "text",
            text: `Logged [${entry.type}]: ${entry.content}`,
          },
        ],
      };
    }

    case "conversation_summarize": {
      if (conversationLog.length === 0) {
        return {
          content: [{ type: "text", text: "No conversation entries to summarize." }],
        };
      }

      // Group by type
      const byType = {};
      for (const entry of conversationLog) {
        if (!byType[entry.type]) byType[entry.type] = [];
        byType[entry.type].push(entry);
      }

      let summary = "Conversation Summary\n";
      summary += "═".repeat(50) + "\n\n";

      if (args.focus) {
        summary += `Focus: ${args.focus}\n\n`;
      }

      // Decisions
      if ((args.include_decisions !== false) && byType.decision) {
        summary += "Decisions Made:\n";
        byType.decision.forEach((e) => {
          summary += `  • ${e.content}\n`;
        });
        summary += "\n";
      }

      // Actions
      if ((args.include_actions !== false) && byType.action) {
        summary += "Actions Taken:\n";
        byType.action.forEach((e) => {
          summary += `  • ${e.content}\n`;
        });
        summary += "\n";
      }

      // Findings
      if (byType.finding) {
        summary += "Key Findings:\n";
        byType.finding.forEach((e) => {
          summary += `  • ${e.content}\n`;
        });
        summary += "\n";
      }

      // Requirements
      if (byType.requirement) {
        summary += "Requirements:\n";
        byType.requirement.forEach((e) => {
          summary += `  • ${e.content}\n`;
        });
        summary += "\n";
      }

      // Q&A
      if (byType.question || byType.answer) {
        summary += "Questions & Answers:\n";
        (byType.question || []).forEach((e) => {
          summary += `  Q: ${e.content}\n`;
        });
        (byType.answer || []).forEach((e) => {
          summary += `  A: ${e.content}\n`;
        });
        summary += "\n";
      }

      summary += `Total entries: ${conversationLog.length}`;

      // Store summary
      summaries.push({
        summary,
        timestamp: new Date().toISOString(),
        entryCount: conversationLog.length,
      });

      // Clear if requested
      if (args.clear_log) {
        conversationLog = [];
        summary += "\n\n(Log cleared)";
      }

      return {
        content: [{ type: "text", text: summary }],
      };
    }

    case "conversation_checkpoint": {
      const data = await loadSummaries();

      data.checkpoints[args.name] = {
        log: [...conversationLog],
        summaries: [...summaries],
        state: args.state || {},
        notes: args.notes,
        created: new Date().toISOString(),
      };

      await saveSummaries(data);

      return {
        content: [
          {
            type: "text",
            text: `Checkpoint saved: "${args.name}"\nEntries: ${conversationLog.length}\nSummaries: ${summaries.length}`,
          },
        ],
      };
    }

    case "conversation_restore": {
      const data = await loadSummaries();
      const checkpoint = data.checkpoints[args.name];

      if (!checkpoint) {
        return {
          content: [{ type: "text", text: `Checkpoint not found: "${args.name}"` }],
          isError: true,
        };
      }

      conversationLog = checkpoint.log || [];
      summaries = checkpoint.summaries || [];

      let output = `Restored checkpoint: "${args.name}"\n`;
      output += `Created: ${checkpoint.created}\n`;
      output += `Entries: ${conversationLog.length}\n`;
      output += `Summaries: ${summaries.length}\n`;

      if (checkpoint.notes) {
        output += `\nNotes: ${checkpoint.notes}`;
      }

      return {
        content: [{ type: "text", text: output }],
      };
    }

    case "conversation_context": {
      let output = "Current Conversation Context\n";
      output += "═".repeat(50) + "\n\n";

      if (args.include_summaries !== false && summaries.length > 0) {
        output += "Previous Summaries:\n";
        output += "─".repeat(40) + "\n";
        summaries.forEach((s, i) => {
          output += `[${i + 1}] ${s.timestamp}\n`;
          output += s.summary + "\n\n";
        });
      }

      if (args.include_log !== false && conversationLog.length > 0) {
        output += "Current Log:\n";
        output += "─".repeat(40) + "\n";
        conversationLog.forEach((e) => {
          const imp = e.importance === "high" ? "❗" : e.importance === "low" ? "  " : " ";
          output += `${imp}[${e.type}] ${e.content}\n`;
        });
      }

      if (conversationLog.length === 0 && summaries.length === 0) {
        output += "(No context logged yet)";
      }

      return {
        content: [{ type: "text", text: output }],
      };
    }

    case "batch_tools": {
      // This is a meta-tool - it returns instructions for the model
      // The actual execution would need to be handled by the caller
      let output = `Batch Execution: ${args.description || "Multiple tools"}\n`;
      output += "═".repeat(50) + "\n\n";

      output += "Tools to execute:\n";
      args.tools.forEach((tool, i) => {
        output += `${i + 1}. ${tool.name}\n`;
        output += `   Args: ${JSON.stringify(tool.args)}\n`;
      });

      output += `\nStop on error: ${args.stop_on_error !== false}\n`;
      output += "\nNote: Execute each tool in sequence and collect results.";

      return {
        content: [{ type: "text", text: output }],
      };
    }

    default:
      throw new Error(`Unknown context tool: ${name}`);
  }
}
