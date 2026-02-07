#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, "..");

function setup() {
  console.log("============================================");
  console.log("  Qwen3 MCP Server - Setup");
  console.log("============================================\n");

  // LM Studio config path
  const lmstudioDir = path.join(os.homedir(), ".lmstudio");
  const mcpConfigPath = path.join(lmstudioDir, "mcp-servers.json");

  // Create .lmstudio directory if needed
  if (!fs.existsSync(lmstudioDir)) {
    fs.mkdirSync(lmstudioDir, { recursive: true });
    console.log(`[OK] Created ${lmstudioDir}`);
  }

  // Build MCP config
  const indexPath = path.join(projectDir, "src", "index.js").replace(/\\/g, "/");
  const serverConfig = {
    command: "node",
    args: [indexPath],
    cwd: projectDir.replace(/\\/g, "/")
  };

  let mcpConfig = { mcpServers: {} };

  // Merge with existing config if present
  if (fs.existsSync(mcpConfigPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(mcpConfigPath, "utf-8"));
      if (existing.mcpServers) {
        mcpConfig = existing;
      }
      console.log("[OK] Found existing MCP config");
    } catch (e) {
      console.log("[WARN] Could not parse existing config, creating new one");
    }
  }

  // Add our server
  mcpConfig.mcpServers["qwen3-mcp"] = serverConfig;

  // Write config
  fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
  console.log(`[OK] MCP config written to ${mcpConfigPath}`);

  // Create directories
  const skillsDir = path.join(projectDir, "skills");
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
    console.log("[OK] Created skills directory");
  }

  const memoryDir = path.join(os.homedir(), ".lmstudio-mcp-memory");
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
    console.log("[OK] Created memory directory");
  }

  console.log("\n============================================");
  console.log("  Setup Complete!");
  console.log("============================================\n");
  console.log("MCP Server configured:");
  console.log(`  Name: qwen3-mcp`);
  console.log(`  Path: ${indexPath}\n`);
  console.log("To start HTTP server (browser chat):");
  console.log("  npm run start");
  console.log("  Then open http://localhost:3847/chat.html\n");
  console.log("For LM Studio MCP mode:");
  console.log("  Restart LM Studio - the MCP server should appear\n");
}

setup();
