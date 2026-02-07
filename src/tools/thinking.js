/**
 * Thinking and reasoning tools
 * Helps the model think through problems before acting
 */

export const thinkingTools = [
  {
    name: "think",
    description:
      "Use this tool to think through a problem step-by-step before taking action. Write out your reasoning, consider alternatives, and plan your approach. This helps with complex tasks that require careful thought. The thinking is logged but not shown to the user directly.",
    inputSchema: {
      type: "object",
      properties: {
        thought: {
          type: "string",
          description: "Your reasoning, analysis, or thought process",
        },
        category: {
          type: "string",
          enum: ["analysis", "planning", "debugging", "decision", "review"],
          description: "Type of thinking (optional)",
        },
      },
      required: ["thought"],
    },
  },
  {
    name: "reason",
    description:
      "Break down a complex problem into logical steps. Use this when you need to analyze something carefully before deciding what to do.",
    inputSchema: {
      type: "object",
      properties: {
        problem: {
          type: "string",
          description: "The problem or question to reason about",
        },
        steps: {
          type: "array",
          items: { type: "string" },
          description: "Step-by-step reasoning",
        },
        conclusion: {
          type: "string",
          description: "Final conclusion or decision",
        },
      },
      required: ["problem", "steps", "conclusion"],
    },
  },
  {
    name: "evaluate_options",
    description:
      "Compare multiple options or approaches. Use this when deciding between different solutions or strategies.",
    inputSchema: {
      type: "object",
      properties: {
        context: {
          type: "string",
          description: "What decision needs to be made",
        },
        options: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              pros: { type: "array", items: { type: "string" } },
              cons: { type: "array", items: { type: "string" } },
            },
          },
          description: "Options to evaluate with pros/cons",
        },
        recommendation: {
          type: "string",
          description: "Recommended option and why",
        },
      },
      required: ["context", "options", "recommendation"],
    },
  },
];

export async function handleThinkingTool(name, args) {
  switch (name) {
    case "think": {
      const category = args.category ? `[${args.category.toUpperCase()}] ` : "";

      // Return the thinking - this helps the model "see" its own thoughts
      // and continue reasoning
      return {
        content: [
          {
            type: "text",
            text: `${category}Thinking recorded.\n\n${args.thought}`,
          },
        ],
      };
    }

    case "reason": {
      let output = `Problem: ${args.problem}\n\n`;
      output += "Reasoning:\n";
      args.steps.forEach((step, i) => {
        output += `${i + 1}. ${step}\n`;
      });
      output += `\nConclusion: ${args.conclusion}`;

      return {
        content: [{ type: "text", text: output }],
      };
    }

    case "evaluate_options": {
      let output = `Decision: ${args.context}\n\n`;

      args.options.forEach((opt, i) => {
        output += `Option ${i + 1}: ${opt.name}\n`;
        if (opt.pros?.length) {
          output += "  Pros:\n";
          opt.pros.forEach((p) => (output += `    + ${p}\n`));
        }
        if (opt.cons?.length) {
          output += "  Cons:\n";
          opt.cons.forEach((c) => (output += `    - ${c}\n`));
        }
        output += "\n";
      });

      output += `Recommendation: ${args.recommendation}`;

      return {
        content: [{ type: "text", text: output }],
      };
    }

    default:
      throw new Error(`Unknown thinking tool: ${name}`);
  }
}
