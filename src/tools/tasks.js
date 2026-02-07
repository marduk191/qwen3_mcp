import fs from "fs/promises";
import path from "path";
import os from "os";

// Store tasks in memory and persist to file
let tasks = [];
const TASKS_FILE = path.join(os.homedir(), ".lmstudio-mcp-tasks.json");

export const taskTools = [
  {
    name: "todo_write",
    description:
      "Update the todo list with tasks. Can accept: todos array, tasks array, or a single task string.",
    inputSchema: {
      type: "object",
      properties: {
        todos: {
          type: "array",
          description: "Array of todo items",
        },
        tasks: {
          type: "array",
          description: "Alias for todos - array of task items",
        },
        task: {
          type: "string",
          description: "Single task to add",
        },
        content: {
          type: "string",
          description: "Single task content to add",
        },
      },
    },
  },
  {
    name: "task_list",
    description:
      "List all current tasks/todos. Shows task status (pending, in_progress, completed), descriptions, and IDs.",
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          enum: ["all", "pending", "in_progress", "completed"],
          description: "Filter tasks by status (default: all)",
        },
      },
    },
  },
  {
    name: "task_add",
    description:
      "Add a new task to the todo list. Use this to plan and track work.",
    inputSchema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Task description",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress"],
          description: "Initial status (default: pending)",
        },
      },
      required: ["description"],
    },
  },
  {
    name: "task_update",
    description:
      "Update an existing task's status or description.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: {
          type: "number",
          description: "Task ID to update",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed"],
          description: "New status",
        },
        description: {
          type: "string",
          description: "New description",
        },
      },
      required: ["task_id"],
    },
  },
  {
    name: "task_delete",
    description: "Delete a task from the list.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: {
          type: "number",
          description: "Task ID to delete",
        },
      },
      required: ["task_id"],
    },
  },
  {
    name: "task_clear",
    description: "Clear all completed tasks or all tasks.",
    inputSchema: {
      type: "object",
      properties: {
        completed_only: {
          type: "boolean",
          description: "Only clear completed tasks (default: true)",
        },
      },
    },
  },
  {
    name: "task_bulk_add",
    description: "Add multiple tasks at once. Useful for planning.",
    inputSchema: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Array of task descriptions",
        },
      },
      required: ["tasks"],
    },
  },
];

async function loadTasks() {
  try {
    const data = await fs.readFile(TASKS_FILE, "utf-8");
    tasks = JSON.parse(data);
  } catch {
    tasks = [];
  }
}

async function saveTasks() {
  await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

function formatTasks(taskList) {
  if (taskList.length === 0) {
    return "No tasks found.";
  }

  const statusIcons = {
    pending: "○",
    in_progress: "◐",
    completed: "●",
  };

  let output = "Tasks:\n";
  output += "─".repeat(50) + "\n";

  for (const task of taskList) {
    const icon = statusIcons[task.status] || "?";
    const statusLabel = task.status.toUpperCase().padEnd(12);
    output += `${icon} [${task.id}] ${statusLabel} ${task.description}\n`;
  }

  const counts = {
    pending: taskList.filter((t) => t.status === "pending").length,
    in_progress: taskList.filter((t) => t.status === "in_progress").length,
    completed: taskList.filter((t) => t.status === "completed").length,
  };

  output += "─".repeat(50) + "\n";
  output += `Total: ${taskList.length} | Pending: ${counts.pending} | In Progress: ${counts.in_progress} | Completed: ${counts.completed}`;

  return output;
}

export async function handleTaskTool(name, args) {
  await loadTasks();

  switch (name) {
    case "todo_write": {
      // Accept various formats: todos, tasks, task, content
      let todoList = args.todos || args.tasks || [];

      // Handle single task string
      if (args.task) {
        todoList = [{ content: args.task, status: "pending" }];
      }
      if (args.content) {
        todoList = [{ content: args.content, status: "pending" }];
      }

      // Handle array of strings
      if (todoList.length > 0 && typeof todoList[0] === 'string') {
        todoList = todoList.map(t => ({ content: t, status: "pending" }));
      }

      // Replace all tasks with the provided todos
      tasks = todoList.map((todo, index) => ({
        id: index + 1,
        description: todo.content || todo.description || todo.text || String(todo),
        status: todo.status || "pending",
        priority: todo.priority || "medium",
        created: new Date().toISOString(),
      }));
      await saveTasks();

      return {
        content: [{ type: "text", text: formatTasks(tasks) }],
      };
    }

    case "task_list": {
      let filtered = tasks;
      if (args.filter && args.filter !== "all") {
        filtered = tasks.filter((t) => t.status === args.filter);
      }

      return {
        content: [{ type: "text", text: formatTasks(filtered) }],
      };
    }

    case "task_add": {
      const newId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
      const newTask = {
        id: newId,
        description: args.description,
        status: args.status || "pending",
        created: new Date().toISOString(),
      };

      tasks.push(newTask);
      await saveTasks();

      return {
        content: [{ type: "text", text: `Added task [${newId}]: ${args.description}` }],
      };
    }

    case "task_update": {
      const task = tasks.find((t) => t.id === args.task_id);
      if (!task) {
        return {
          content: [{ type: "text", text: `Task not found: ${args.task_id}` }],
          isError: true,
        };
      }

      if (args.status) {
        task.status = args.status;
      }
      if (args.description) {
        task.description = args.description;
      }
      task.updated = new Date().toISOString();

      await saveTasks();

      return {
        content: [{ type: "text", text: `Updated task [${args.task_id}]: ${task.status} - ${task.description}` }],
      };
    }

    case "task_delete": {
      const index = tasks.findIndex((t) => t.id === args.task_id);
      if (index === -1) {
        return {
          content: [{ type: "text", text: `Task not found: ${args.task_id}` }],
          isError: true,
        };
      }

      tasks.splice(index, 1);
      await saveTasks();

      return {
        content: [{ type: "text", text: `Deleted task [${args.task_id}]` }],
      };
    }

    case "task_clear": {
      const completedOnly = args.completed_only !== false;

      if (completedOnly) {
        const before = tasks.length;
        tasks = tasks.filter((t) => t.status !== "completed");
        const removed = before - tasks.length;
        await saveTasks();
        return {
          content: [{ type: "text", text: `Cleared ${removed} completed tasks` }],
        };
      } else {
        const count = tasks.length;
        tasks = [];
        await saveTasks();
        return {
          content: [{ type: "text", text: `Cleared all ${count} tasks` }],
        };
      }
    }

    case "task_bulk_add": {
      const added = [];
      let nextId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;

      for (const desc of args.tasks) {
        const newTask = {
          id: nextId++,
          description: desc,
          status: "pending",
          created: new Date().toISOString(),
        };
        tasks.push(newTask);
        added.push(newTask.id);
      }

      await saveTasks();

      return {
        content: [{ type: "text", text: `Added ${added.length} tasks: [${added.join(", ")}]` }],
      };
    }

    default:
      throw new Error(`Unknown task tool: ${name}`);
  }
}
