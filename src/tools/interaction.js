/**
 * User interaction tools
 * Ask questions, get confirmation, present choices
 */

export const interactionTools = [
  {
    name: "ask_user",
    description:
      "Ask the user a question and wait for their response. Use this when you need clarification, confirmation, or input before proceeding. The question will be displayed to the user and their response will be returned.",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The question to ask the user",
        },
        context: {
          type: "string",
          description: "Additional context to help the user understand why you're asking",
        },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of choices to present",
        },
        default: {
          type: "string",
          description: "Default value if user doesn't provide one",
        },
      },
      required: ["question"],
    },
  },
  {
    name: "confirm",
    description:
      "Ask the user to confirm an action before proceeding. Use this for destructive or irreversible operations.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Description of the action to confirm",
        },
        consequences: {
          type: "string",
          description: "What will happen if confirmed",
        },
        alternatives: {
          type: "array",
          items: { type: "string" },
          description: "Alternative actions the user could choose instead",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "present_choices",
    description:
      "Present multiple options to the user and let them choose. Use when there are multiple valid approaches.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "What decision needs to be made",
        },
        choices: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              description: { type: "string" },
              recommended: { type: "boolean" },
            },
          },
          description: "Available choices with descriptions",
        },
        allow_custom: {
          type: "boolean",
          description: "Allow user to provide a custom answer",
        },
      },
      required: ["prompt", "choices"],
    },
  },
  {
    name: "notify_user",
    description:
      "Send a notification or status update to the user. Use for important information that doesn't require a response.",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The message to display",
        },
        type: {
          type: "string",
          enum: ["info", "success", "warning", "error"],
          description: "Type of notification",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "request_input",
    description:
      "Request specific input from the user (like a file path, API key, or configuration value).",
    inputSchema: {
      type: "object",
      properties: {
        field: {
          type: "string",
          description: "What input is needed",
        },
        description: {
          type: "string",
          description: "Why this input is needed",
        },
        format: {
          type: "string",
          description: "Expected format (e.g., 'file path', 'URL', 'number')",
        },
        example: {
          type: "string",
          description: "Example of valid input",
        },
        required: {
          type: "boolean",
          description: "Whether this input is required",
        },
      },
      required: ["field"],
    },
  },
];

export async function handleInteractionTool(name, args) {
  switch (name) {
    case "ask_user": {
      let prompt = `\n${"═".repeat(50)}\n`;
      prompt += "❓ QUESTION FOR USER\n";
      prompt += "═".repeat(50) + "\n\n";

      if (args.context) {
        prompt += `Context: ${args.context}\n\n`;
      }

      prompt += `${args.question}\n`;

      if (args.options && args.options.length > 0) {
        prompt += "\nOptions:\n";
        args.options.forEach((opt, i) => {
          prompt += `  ${i + 1}. ${opt}\n`;
        });
      }

      if (args.default) {
        prompt += `\nDefault: ${args.default}\n`;
      }

      prompt += "\n" + "─".repeat(50);
      prompt += "\n[Waiting for user response...]\n";

      return {
        content: [{ type: "text", text: prompt }],
      };
    }

    case "confirm": {
      let prompt = `\n${"═".repeat(50)}\n`;
      prompt += "⚠️  CONFIRMATION REQUIRED\n";
      prompt += "═".repeat(50) + "\n\n";

      prompt += `Action: ${args.action}\n`;

      if (args.consequences) {
        prompt += `\nConsequences: ${args.consequences}\n`;
      }

      if (args.alternatives && args.alternatives.length > 0) {
        prompt += "\nAlternatives:\n";
        args.alternatives.forEach((alt, i) => {
          prompt += `  • ${alt}\n`;
        });
      }

      prompt += "\nPlease confirm: [yes/no]\n";
      prompt += "─".repeat(50) + "\n";

      return {
        content: [{ type: "text", text: prompt }],
      };
    }

    case "present_choices": {
      let prompt = `\n${"═".repeat(50)}\n`;
      prompt += "📋 CHOOSE AN OPTION\n";
      prompt += "═".repeat(50) + "\n\n";

      prompt += `${args.prompt}\n\n`;

      args.choices.forEach((choice, i) => {
        const rec = choice.recommended ? " ⭐ RECOMMENDED" : "";
        prompt += `${i + 1}. ${choice.label}${rec}\n`;
        if (choice.description) {
          prompt += `   ${choice.description}\n`;
        }
        prompt += "\n";
      });

      if (args.allow_custom) {
        prompt += `${args.choices.length + 1}. Other (provide custom answer)\n\n`;
      }

      prompt += "Enter your choice (number or description):\n";
      prompt += "─".repeat(50) + "\n";

      return {
        content: [{ type: "text", text: prompt }],
      };
    }

    case "notify_user": {
      const icons = {
        info: "ℹ️",
        success: "✅",
        warning: "⚠️",
        error: "❌",
      };

      const icon = icons[args.type] || icons.info;

      return {
        content: [
          {
            type: "text",
            text: `\n${icon} ${args.message}\n`,
          },
        ],
      };
    }

    case "request_input": {
      let prompt = `\n${"═".repeat(50)}\n`;
      prompt += "📝 INPUT REQUIRED\n";
      prompt += "═".repeat(50) + "\n\n";

      prompt += `Field: ${args.field}`;
      if (args.required === false) {
        prompt += " (optional)";
      }
      prompt += "\n";

      if (args.description) {
        prompt += `Description: ${args.description}\n`;
      }

      if (args.format) {
        prompt += `Format: ${args.format}\n`;
      }

      if (args.example) {
        prompt += `Example: ${args.example}\n`;
      }

      prompt += "\nPlease provide the value:\n";
      prompt += "─".repeat(50) + "\n";

      return {
        content: [{ type: "text", text: prompt }],
      };
    }

    default:
      throw new Error(`Unknown interaction tool: ${name}`);
  }
}
