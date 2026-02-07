import { spawn } from "child_process";
import { platform } from "os";
import { getWorkingDir } from "../utils/paths.js";

// Track running processes
const sessions = new Map();
let sessionCounter = 0;

export const bashTools = [
  {
    name: "execute_command",
    description:
      "Execute a shell command. Use this for running builds, tests, git commands, npm scripts, and any terminal operations. Commands run in the working directory.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The shell command to execute",
        },
        cwd: {
          type: "string",
          description: "Working directory for the command (default: project working directory)",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 30000 = 30 seconds)",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "run_shell_command",
    description:
      "Execute a shell command (alias for execute_command). Use this for running builds, tests, git commands, npm scripts, and any terminal operations.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The shell command to execute",
        },
        cwd: {
          type: "string",
          description: "Working directory for the command",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 30000)",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "execute_background",
    description:
      "Start a long-running command in the background (like dev servers). Returns a session ID to check output later.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command to run in background",
        },
        cwd: {
          type: "string",
          description: "Working directory for the command",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "read_output",
    description: "Read output from a background command session.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID from execute_background",
        },
      },
      required: ["session_id"],
    },
  },
  {
    name: "kill_session",
    description: "Kill a background command session.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID to kill",
        },
      },
      required: ["session_id"],
    },
  },
  {
    name: "list_sessions",
    description: "List all active background command sessions.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

function getShell() {
  if (platform() === "win32") {
    return { shell: "cmd.exe", shellFlag: "/c" };
  }
  return { shell: "/bin/bash", shellFlag: "-c" };
}

async function runCommand(command, cwd, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const { shell, shellFlag } = getShell();

    // On Windows, normalize paths for cmd.exe compatibility
    let processedCommand = command;
    if (platform() === "win32") {
      processedCommand = command
        // First normalize double backslashes to single: K:\\path -> K:\path
        .replace(/\\\\/g, '\\')
        // Convert forward slashes to backslashes in paths: K:/path -> K:\path
        .replace(/([A-Za-z]:)(\/[^\s"'|><&]*)/g, (match, drive, pathPart) => {
          return drive + pathPart.replace(/\//g, '\\');
        })
        // Remove quotes around paths (they cause issues with some Windows commands)
        .replace(/"([A-Za-z]:\\[^"]+)"/g, '$1');
    }

    const proc = spawn(shell, [shellFlag, processedCommand], {
      cwd: cwd || getWorkingDir(),
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    const MAX_OUTPUT = 20000; // Limit to prevent WebSocket timeouts

    proc.stdout.on("data", (data) => {
      if (stdout.length < MAX_OUTPUT) {
        stdout += data.toString();
      }
    });

    proc.stderr.on("data", (data) => {
      if (stderr.length < MAX_OUTPUT) {
        stderr += data.toString();
      }
    });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        stdout: stdout.slice(0, MAX_OUTPUT),
        stderr: stderr.slice(0, MAX_OUTPUT),
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function handleBashTool(name, args) {
  switch (name) {
    case "execute_command":
    case "run_shell_command": {
      const cwd = args.cwd || getWorkingDir();
      const result = await runCommand(
        args.command,
        cwd,
        args.timeout || 30000
      );

      let output = `[Working directory: ${cwd}]\n\n`;
      if (result.stdout) {
        output += result.stdout;
      }
      if (result.stderr) {
        output += (result.stdout ? "\n\n--- STDERR ---\n" : "") + result.stderr;
      }
      if (!result.stdout && !result.stderr) {
        output += "(no output)";
      }
      output += `\n\n[Exit code: ${result.exitCode}]`;

      return {
        content: [{ type: "text", text: output }],
      };
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
        // Keep last 50KB of output
        if (session.output.length > 50000) {
          session.output = session.output.slice(-50000);
        }
      });

      proc.stderr.on("data", (data) => {
        session.output += data.toString();
        if (session.output.length > 50000) {
          session.output = session.output.slice(-50000);
        }
      });

      proc.on("close", (code) => {
        session.exitCode = code;
        session.endTime = new Date().toISOString();
      });

      sessions.set(sessionId, session);

      return {
        content: [
          {
            type: "text",
            text: `Background session started: ${sessionId}\nPID: ${proc.pid}\nDirectory: ${cwd}\nCommand: ${args.command}`,
          },
        ],
      };
    }

    case "read_output": {
      const session = sessions.get(args.session_id);
      if (!session) {
        return {
          content: [{ type: "text", text: `Session not found: ${args.session_id}` }],
          isError: true,
        };
      }

      let status = session.exitCode !== undefined ? `Exited (${session.exitCode})` : "Running";

      return {
        content: [
          {
            type: "text",
            text: `Session: ${session.id}\nStatus: ${status}\nDirectory: ${session.cwd}\nCommand: ${session.command}\n\n--- Output ---\n${session.output || "(no output yet)"}`,
          },
        ],
      };
    }

    case "kill_session": {
      const session = sessions.get(args.session_id);
      if (!session) {
        return {
          content: [{ type: "text", text: `Session not found: ${args.session_id}` }],
          isError: true,
        };
      }

      try {
        if (platform() === "win32") {
          spawn("taskkill", ["/pid", session.pid.toString(), "/f", "/t"]);
        } else {
          process.kill(-session.pid, "SIGTERM");
        }
      } catch (e) {
        // Process may have already exited
      }

      sessions.delete(args.session_id);

      return {
        content: [{ type: "text", text: `Session killed: ${args.session_id}` }],
      };
    }

    case "list_sessions": {
      if (sessions.size === 0) {
        return {
          content: [{ type: "text", text: "No active sessions" }],
        };
      }

      const list = Array.from(sessions.values()).map((s) => ({
        id: s.id,
        command: s.command,
        cwd: s.cwd,
        pid: s.pid,
        status: s.exitCode !== undefined ? `Exited (${s.exitCode})` : "Running",
        startTime: s.startTime,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
      };
    }

    default:
      throw new Error(`Unknown bash tool: ${name}`);
  }
}
