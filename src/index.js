#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { fileTools, handleFileTool } from "./tools/filesystem.js";
import { bashTools, handleBashTool } from "./tools/bash.js";
import { gitTools, handleGitTool } from "./tools/git.js";
import { searchTools, handleSearchTool } from "./tools/search.js";
import { editTools, handleEditTool } from "./tools/edit.js";
import { webTools, handleWebTool } from "./tools/web.js";
import { notebookTools, handleNotebookTool } from "./tools/notebook.js";
import { mediaTools, handleMediaTool } from "./tools/media.js";
import { taskTools, handleTaskTool } from "./tools/tasks.js";
import { memoryTools, handleMemoryTool } from "./tools/memory.js";
import { thinkingTools, handleThinkingTool } from "./tools/thinking.js";
import { planningTools, handlePlanningTool } from "./tools/planning.js";
import { interactionTools, handleInteractionTool } from "./tools/interaction.js";
import { contextTools, handleContextTool } from "./tools/context.js";
import { comfyuiTools, handleComfyuiTool } from "./tools/comfyui.js";
import { skillsTools, handleSkillsTool } from "./tools/skills.js";
import { githubBlogTools, handleGithubBlogTool } from "./tools/github-blog.js";

const server = new Server(
  {
    name: "qwen3-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Combine all tools
const allTools = [
  ...fileTools,
  ...bashTools,
  ...gitTools,
  ...searchTools,
  ...editTools,
  ...webTools,
  ...notebookTools,
  ...mediaTools,
  ...taskTools,
  ...memoryTools,
  ...thinkingTools,
  ...planningTools,
  ...interactionTools,
  ...contextTools,
  ...comfyuiTools,
  ...skillsTools,
  ...githubBlogTools,
];

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: allTools };
});

// Common tool name aliases - models often hallucinate shorter names
const TOOL_ALIASES = {
  edit: "edit_file",
  read: "read_file",
  write: "write_file",
  search: "grep_search",
  grep: "grep_search",
  glob: "glob_search",
  find: "find_definition",
  run: "execute_command",
  exec: "execute_command",
  bash: "execute_command",
  shell: "execute_command",
  list: "list_directory",
  ls: "list_directory",
  delete: "delete_file",
  rm: "delete_file",
  move: "move_file",
  mv: "move_file",
  copy: "copy_file",
  cp: "copy_file",
  mkdir: "create_directory",
};

// Common parameter name aliases - models use different param names
function normalizeArgs(toolName, args) {
  const normalized = { ...args };

  // file_path aliases
  if (!normalized.file_path && (normalized.path || normalized.filepath || normalized.filename || normalized.file)) {
    normalized.file_path = normalized.path || normalized.filepath || normalized.filename || normalized.file;
  }

  // edit_file: pattern/replacement -> old_string/new_string
  if (toolName === "edit_file") {
    if (!normalized.old_string && (normalized.pattern || normalized.search || normalized.find || normalized.original)) {
      normalized.old_string = normalized.pattern || normalized.search || normalized.find || normalized.original;
    }
    if (!normalized.new_string && (normalized.replacement || normalized.replace || normalized.new_text || normalized.with)) {
      normalized.new_string = normalized.replacement || normalized.replace || normalized.new_text || normalized.with;
    }
  }

  // write_file: text -> content
  if (toolName === "write_file") {
    if (!normalized.content && normalized.text) {
      normalized.content = normalized.text;
    }
  }

  // execute_command: cmd -> command
  if (toolName === "execute_command") {
    if (!normalized.command && (normalized.cmd || normalized.shell_command || normalized.script)) {
      normalized.command = normalized.cmd || normalized.shell_command || normalized.script;
    }
  }

  // grep_search: regex/search -> pattern
  if (toolName === "grep_search") {
    if (!normalized.pattern && (normalized.regex || normalized.search || normalized.query || normalized.text)) {
      normalized.pattern = normalized.regex || normalized.search || normalized.query || normalized.text;
    }
  }

  return normalized;
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  let { name, arguments: args } = request.params;

  // Resolve aliases
  if (TOOL_ALIASES[name]) {
    const resolvedName = TOOL_ALIASES[name];
    console.error(`Tool alias: "${name}" -> "${resolvedName}"`);
    name = resolvedName;
  }

  // Normalize argument names
  args = normalizeArgs(name, args);

  try {
    // Route to appropriate handler
    if (fileTools.some((t) => t.name === name)) {
      return await handleFileTool(name, args);
    }
    if (bashTools.some((t) => t.name === name)) {
      return await handleBashTool(name, args);
    }
    if (gitTools.some((t) => t.name === name)) {
      return await handleGitTool(name, args);
    }
    if (searchTools.some((t) => t.name === name)) {
      return await handleSearchTool(name, args);
    }
    if (editTools.some((t) => t.name === name)) {
      return await handleEditTool(name, args);
    }
    if (webTools.some((t) => t.name === name)) {
      return await handleWebTool(name, args);
    }
    if (notebookTools.some((t) => t.name === name)) {
      return await handleNotebookTool(name, args);
    }
    if (mediaTools.some((t) => t.name === name)) {
      return await handleMediaTool(name, args);
    }
    if (taskTools.some((t) => t.name === name)) {
      return await handleTaskTool(name, args);
    }
    if (memoryTools.some((t) => t.name === name)) {
      return await handleMemoryTool(name, args);
    }
    if (thinkingTools.some((t) => t.name === name)) {
      return await handleThinkingTool(name, args);
    }
    if (planningTools.some((t) => t.name === name)) {
      return await handlePlanningTool(name, args);
    }
    if (interactionTools.some((t) => t.name === name)) {
      return await handleInteractionTool(name, args);
    }
    if (contextTools.some((t) => t.name === name)) {
      return await handleContextTool(name, args);
    }
    if (comfyuiTools.some((t) => t.name === name)) {
      return await handleComfyuiTool(name, args);
    }
    if (skillsTools.some((t) => t.name === name)) {
      return await handleSkillsTool(name, args);
    }
    if (githubBlogTools.some((t) => t.name === name)) {
      return await handleGithubBlogTool(name, args);
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LM Studio Claude MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
