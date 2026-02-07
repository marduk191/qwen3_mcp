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

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

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
