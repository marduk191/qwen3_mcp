/**
 * Planning and workflow tools
 * Multi-step planning with approval workflow
 */

import fs from "fs/promises";
import path from "path";
import os from "os";

const PLANS_FILE = path.join(os.homedir(), ".lmstudio-mcp-plans.json");

let currentPlan = null;

export const planningTools = [
  {
    name: "plan_create",
    description:
      "Create a multi-step plan for a complex task. Use this BEFORE starting any complex work. Break the task into clear steps that can be executed and verified one at a time.",
    inputSchema: {
      type: "object",
      properties: {
        goal: {
          type: "string",
          description: "The overall goal to accomplish",
        },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              verification: { type: "string" },
            },
          },
          description: "Ordered steps with descriptions and how to verify completion",
        },
        context: {
          type: "string",
          description: "Additional context or constraints",
        },
      },
      required: ["goal", "steps"],
    },
  },
  {
    name: "plan_status",
    description: "Check the current plan status and see which steps are completed.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "plan_step_complete",
    description: "Mark a plan step as completed. Include what was done and any notes.",
    inputSchema: {
      type: "object",
      properties: {
        step_index: {
          type: "number",
          description: "Index of the step to mark complete (0-based)",
        },
        result: {
          type: "string",
          description: "What was accomplished",
        },
        notes: {
          type: "string",
          description: "Any notes or issues encountered",
        },
      },
      required: ["step_index", "result"],
    },
  },
  {
    name: "plan_step_skip",
    description: "Skip a plan step that is no longer needed or not applicable.",
    inputSchema: {
      type: "object",
      properties: {
        step_index: {
          type: "number",
          description: "Index of the step to skip",
        },
        reason: {
          type: "string",
          description: "Why this step is being skipped",
        },
      },
      required: ["step_index", "reason"],
    },
  },
  {
    name: "plan_modify",
    description: "Modify the current plan - add, remove, or update steps.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["add_step", "remove_step", "update_step", "reorder"],
          description: "Modification action",
        },
        step_index: {
          type: "number",
          description: "Step index for remove/update actions",
        },
        new_step: {
          type: "object",
          properties: {
            description: { type: "string" },
            verification: { type: "string" },
          },
          description: "New step details for add/update",
        },
        insert_at: {
          type: "number",
          description: "Where to insert new step (for add_step)",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "plan_complete",
    description: "Mark the entire plan as complete and summarize what was accomplished.",
    inputSchema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Summary of what was accomplished",
        },
        save: {
          type: "boolean",
          description: "Save plan to history (default: true)",
        },
      },
      required: ["summary"],
    },
  },
  {
    name: "plan_abandon",
    description: "Abandon the current plan if it's no longer relevant.",
    inputSchema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Why the plan is being abandoned",
        },
      },
      required: ["reason"],
    },
  },
  {
    name: "plan_history",
    description: "View previously completed plans.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of plans to show (default: 5)",
        },
      },
    },
  },
];

async function loadPlans() {
  try {
    const data = await fs.readFile(PLANS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { history: [] };
  }
}

async function savePlans(data) {
  await fs.writeFile(PLANS_FILE, JSON.stringify(data, null, 2));
}

function formatPlan(plan) {
  if (!plan) return "No active plan.";

  let output = `Plan: ${plan.goal}\n`;
  output += "═".repeat(50) + "\n";

  if (plan.context) {
    output += `Context: ${plan.context}\n\n`;
  }

  plan.steps.forEach((step, i) => {
    let status = "○"; // pending
    if (step.completed) status = "●"; // done
    if (step.skipped) status = "◌"; // skipped

    output += `${status} [${i}] ${step.description}\n`;

    if (step.verification) {
      output += `      Verify: ${step.verification}\n`;
    }

    if (step.result) {
      output += `      Result: ${step.result}\n`;
    }

    if (step.notes) {
      output += `      Notes: ${step.notes}\n`;
    }

    if (step.skipped) {
      output += `      Skipped: ${step.skipReason}\n`;
    }
  });

  const completed = plan.steps.filter((s) => s.completed).length;
  const skipped = plan.steps.filter((s) => s.skipped).length;
  const remaining = plan.steps.length - completed - skipped;

  output += "\n" + "─".repeat(50) + "\n";
  output += `Progress: ${completed}/${plan.steps.length} completed`;
  if (skipped > 0) output += `, ${skipped} skipped`;
  if (remaining > 0) output += `, ${remaining} remaining`;

  return output;
}

export async function handlePlanningTool(name, args) {
  switch (name) {
    case "plan_create": {
      if (currentPlan && !currentPlan.completed && !currentPlan.abandoned) {
        return {
          content: [
            {
              type: "text",
              text: `There's already an active plan. Complete or abandon it first.\n\n${formatPlan(currentPlan)}`,
            },
          ],
        };
      }

      currentPlan = {
        goal: args.goal,
        context: args.context,
        steps: args.steps.map((s) => ({
          description: s.description,
          verification: s.verification,
          completed: false,
          skipped: false,
        })),
        created: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: "text",
            text: `Plan created!\n\n${formatPlan(currentPlan)}`,
          },
        ],
      };
    }

    case "plan_status": {
      return {
        content: [{ type: "text", text: formatPlan(currentPlan) }],
      };
    }

    case "plan_step_complete": {
      if (!currentPlan) {
        return {
          content: [{ type: "text", text: "No active plan." }],
          isError: true,
        };
      }

      const step = currentPlan.steps[args.step_index];
      if (!step) {
        return {
          content: [{ type: "text", text: `Invalid step index: ${args.step_index}` }],
          isError: true,
        };
      }

      step.completed = true;
      step.result = args.result;
      step.notes = args.notes;
      step.completedAt = new Date().toISOString();

      // Find next pending step
      const nextStep = currentPlan.steps.find((s) => !s.completed && !s.skipped);

      let response = `Step ${args.step_index} completed: ${step.description}\n`;
      if (nextStep) {
        const nextIndex = currentPlan.steps.indexOf(nextStep);
        response += `\nNext step [${nextIndex}]: ${nextStep.description}`;
      } else {
        response += "\nAll steps completed! Use plan_complete to finish.";
      }

      return {
        content: [{ type: "text", text: response }],
      };
    }

    case "plan_step_skip": {
      if (!currentPlan) {
        return {
          content: [{ type: "text", text: "No active plan." }],
          isError: true,
        };
      }

      const step = currentPlan.steps[args.step_index];
      if (!step) {
        return {
          content: [{ type: "text", text: `Invalid step index: ${args.step_index}` }],
          isError: true,
        };
      }

      step.skipped = true;
      step.skipReason = args.reason;

      return {
        content: [
          {
            type: "text",
            text: `Step ${args.step_index} skipped: ${args.reason}`,
          },
        ],
      };
    }

    case "plan_modify": {
      if (!currentPlan) {
        return {
          content: [{ type: "text", text: "No active plan." }],
          isError: true,
        };
      }

      switch (args.action) {
        case "add_step": {
          const newStep = {
            description: args.new_step.description,
            verification: args.new_step.verification,
            completed: false,
            skipped: false,
          };

          if (args.insert_at !== undefined) {
            currentPlan.steps.splice(args.insert_at, 0, newStep);
          } else {
            currentPlan.steps.push(newStep);
          }

          return {
            content: [{ type: "text", text: `Step added.\n\n${formatPlan(currentPlan)}` }],
          };
        }

        case "remove_step": {
          currentPlan.steps.splice(args.step_index, 1);
          return {
            content: [{ type: "text", text: `Step removed.\n\n${formatPlan(currentPlan)}` }],
          };
        }

        case "update_step": {
          const step = currentPlan.steps[args.step_index];
          if (args.new_step.description) step.description = args.new_step.description;
          if (args.new_step.verification) step.verification = args.new_step.verification;
          return {
            content: [{ type: "text", text: `Step updated.\n\n${formatPlan(currentPlan)}` }],
          };
        }

        default:
          return {
            content: [{ type: "text", text: `Unknown action: ${args.action}` }],
            isError: true,
          };
      }
    }

    case "plan_complete": {
      if (!currentPlan) {
        return {
          content: [{ type: "text", text: "No active plan." }],
          isError: true,
        };
      }

      currentPlan.completed = true;
      currentPlan.completedAt = new Date().toISOString();
      currentPlan.summary = args.summary;

      if (args.save !== false) {
        const data = await loadPlans();
        data.history.unshift(currentPlan);
        // Keep last 20 plans
        data.history = data.history.slice(0, 20);
        await savePlans(data);
      }

      const finalPlan = currentPlan;
      currentPlan = null;

      return {
        content: [
          {
            type: "text",
            text: `Plan completed!\n\nGoal: ${finalPlan.goal}\nSummary: ${args.summary}`,
          },
        ],
      };
    }

    case "plan_abandon": {
      if (!currentPlan) {
        return {
          content: [{ type: "text", text: "No active plan." }],
          isError: true,
        };
      }

      currentPlan.abandoned = true;
      currentPlan.abandonReason = args.reason;
      currentPlan = null;

      return {
        content: [{ type: "text", text: `Plan abandoned: ${args.reason}` }],
      };
    }

    case "plan_history": {
      const data = await loadPlans();
      const limit = args.limit || 5;
      const plans = data.history.slice(0, limit);

      if (plans.length === 0) {
        return {
          content: [{ type: "text", text: "No plan history." }],
        };
      }

      let output = "Plan History:\n" + "═".repeat(50) + "\n\n";

      plans.forEach((plan, i) => {
        output += `${i + 1}. ${plan.goal}\n`;
        output += `   Completed: ${plan.completedAt}\n`;
        output += `   Steps: ${plan.steps.length}\n`;
        if (plan.summary) {
          output += `   Summary: ${plan.summary}\n`;
        }
        output += "\n";
      });

      return {
        content: [{ type: "text", text: output }],
      };
    }

    default:
      throw new Error(`Unknown planning tool: ${name}`);
  }
}
