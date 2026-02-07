import { spawn } from "child_process";
import { platform } from "os";

export const gitTools = [
  {
    name: "git_status",
    description: "Show the working tree status - modified, staged, and untracked files.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: {
          type: "string",
          description: "Repository directory path",
        },
      },
    },
  },
  {
    name: "git_diff",
    description: "Show changes between commits, commit and working tree, etc.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: {
          type: "string",
          description: "Repository directory path",
        },
        staged: {
          type: "boolean",
          description: "Show staged changes (--cached)",
        },
        file: {
          type: "string",
          description: "Specific file to diff",
        },
      },
    },
  },
  {
    name: "git_log",
    description: "Show commit history.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: {
          type: "string",
          description: "Repository directory path",
        },
        count: {
          type: "number",
          description: "Number of commits to show (default: 10)",
        },
        oneline: {
          type: "boolean",
          description: "Show condensed output (default: true)",
        },
      },
    },
  },
  {
    name: "git_add",
    description: "Stage files for commit.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: {
          type: "string",
          description: "Repository directory path",
        },
        files: {
          type: "array",
          items: { type: "string" },
          description: "Files to stage (use ['.'] for all)",
        },
      },
      required: ["files"],
    },
  },
  {
    name: "git_commit",
    description: "Create a new commit with staged changes.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: {
          type: "string",
          description: "Repository directory path",
        },
        message: {
          type: "string",
          description: "Commit message",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "git_branch",
    description: "List, create, or delete branches.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: {
          type: "string",
          description: "Repository directory path",
        },
        name: {
          type: "string",
          description: "Branch name to create (omit to list branches)",
        },
        delete: {
          type: "boolean",
          description: "Delete the branch",
        },
      },
    },
  },
  {
    name: "git_checkout",
    description: "Switch branches or restore files.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: {
          type: "string",
          description: "Repository directory path",
        },
        target: {
          type: "string",
          description: "Branch name or commit hash",
        },
        create: {
          type: "boolean",
          description: "Create new branch (-b flag)",
        },
      },
      required: ["target"],
    },
  },
  {
    name: "git_push",
    description: "Push commits to remote repository.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: {
          type: "string",
          description: "Repository directory path",
        },
        remote: {
          type: "string",
          description: "Remote name (default: origin)",
        },
        branch: {
          type: "string",
          description: "Branch to push",
        },
        setUpstream: {
          type: "boolean",
          description: "Set upstream (-u flag)",
        },
      },
    },
  },
  {
    name: "git_pull",
    description: "Pull changes from remote repository.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: {
          type: "string",
          description: "Repository directory path",
        },
        remote: {
          type: "string",
          description: "Remote name (default: origin)",
        },
        branch: {
          type: "string",
          description: "Branch to pull",
        },
      },
    },
  },
  {
    name: "git_clone",
    description: "Clone a repository.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Repository URL to clone",
        },
        directory: {
          type: "string",
          description: "Target directory",
        },
      },
      required: ["url"],
    },
  },
];

async function runGit(args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", args, {
      cwd: cwd || process.cwd(),
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout || stderr || "(success, no output)");
      } else {
        reject(new Error(stderr || stdout || `Git exited with code ${code}`));
      }
    });

    proc.on("error", reject);
  });
}

export async function handleGitTool(name, args) {
  try {
    let result;

    switch (name) {
      case "git_status":
        result = await runGit(["status"], args.cwd);
        break;

      case "git_diff": {
        const diffArgs = ["diff"];
        if (args.staged) diffArgs.push("--cached");
        if (args.file) diffArgs.push(args.file);
        result = await runGit(diffArgs, args.cwd);
        break;
      }

      case "git_log": {
        const logArgs = ["log"];
        logArgs.push(`-n${args.count || 10}`);
        if (args.oneline !== false) logArgs.push("--oneline");
        result = await runGit(logArgs, args.cwd);
        break;
      }

      case "git_add":
        result = await runGit(["add", ...args.files], args.cwd);
        break;

      case "git_commit":
        result = await runGit(["commit", "-m", args.message], args.cwd);
        break;

      case "git_branch": {
        const branchArgs = ["branch"];
        if (args.delete && args.name) {
          branchArgs.push("-d", args.name);
        } else if (args.name) {
          branchArgs.push(args.name);
        }
        result = await runGit(branchArgs, args.cwd);
        break;
      }

      case "git_checkout": {
        const checkoutArgs = ["checkout"];
        if (args.create) checkoutArgs.push("-b");
        checkoutArgs.push(args.target);
        result = await runGit(checkoutArgs, args.cwd);
        break;
      }

      case "git_push": {
        const pushArgs = ["push"];
        if (args.setUpstream) pushArgs.push("-u");
        if (args.remote) pushArgs.push(args.remote);
        if (args.branch) pushArgs.push(args.branch);
        result = await runGit(pushArgs, args.cwd);
        break;
      }

      case "git_pull": {
        const pullArgs = ["pull"];
        if (args.remote) pullArgs.push(args.remote);
        if (args.branch) pullArgs.push(args.branch);
        result = await runGit(pullArgs, args.cwd);
        break;
      }

      case "git_clone": {
        const cloneArgs = ["clone", args.url];
        if (args.directory) cloneArgs.push(args.directory);
        result = await runGit(cloneArgs, process.cwd());
        break;
      }

      default:
        throw new Error(`Unknown git tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Git error: ${error.message}` }],
      isError: true,
    };
  }
}
