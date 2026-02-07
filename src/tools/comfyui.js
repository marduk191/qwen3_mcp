/**
 * ComfyUI-specific tools
 * Workflow management, node inspection, and API interaction
 */

import fs from "fs/promises";
import path from "path";
import http from "http";
import { resolvePath, getWorkingDir } from "../utils/paths.js";

// Default ComfyUI server
const COMFY_HOST = process.env.COMFY_HOST || "127.0.0.1";
const COMFY_PORT = process.env.COMFY_PORT || "8188";

export const comfyuiTools = [
  {
    name: "comfy_read_workflow",
    description:
      "Read and parse a ComfyUI workflow JSON file. Returns the nodes, their types, connections, and settings in a readable format.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "comfy_list_nodes",
    description:
      "List all nodes in a ComfyUI workflow with their types and key parameters.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
        filter_type: {
          type: "string",
          description: "Filter nodes by type (e.g., 'KSampler', 'CLIPTextEncode')",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "comfy_edit_node",
    description:
      "Edit a specific node's inputs/settings in a ComfyUI workflow.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
        node_id: {
          type: "string",
          description: "ID of the node to edit",
        },
        inputs: {
          type: "object",
          description: "New input values to set (e.g., { 'steps': 30, 'cfg': 7.5 })",
        },
      },
      required: ["file_path", "node_id", "inputs"],
    },
  },
  {
    name: "comfy_find_node",
    description:
      "Find nodes in a workflow by type, title, or input values.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
        node_type: {
          type: "string",
          description: "Node class type to find",
        },
        title: {
          type: "string",
          description: "Node title to search for",
        },
        has_input: {
          type: "string",
          description: "Find nodes that have this input name",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "comfy_get_prompts",
    description:
      "Extract all text prompts (positive and negative) from a workflow.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "comfy_set_prompt",
    description:
      "Set a text prompt in a CLIPTextEncode node.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
        node_id: {
          type: "string",
          description: "ID of the CLIPTextEncode node",
        },
        text: {
          type: "string",
          description: "New prompt text",
        },
      },
      required: ["file_path", "node_id", "text"],
    },
  },
  {
    name: "comfy_get_samplers",
    description:
      "Get all KSampler nodes and their settings (steps, cfg, sampler, scheduler, denoise).",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "comfy_set_sampler",
    description:
      "Update KSampler settings (steps, cfg, seed, sampler_name, scheduler, denoise).",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
        node_id: {
          type: "string",
          description: "ID of the KSampler node",
        },
        steps: { type: "number" },
        cfg: { type: "number" },
        seed: { type: "number" },
        sampler_name: { type: "string" },
        scheduler: { type: "string" },
        denoise: { type: "number" },
      },
      required: ["file_path", "node_id"],
    },
  },
  {
    name: "comfy_get_checkpoints",
    description:
      "Find all checkpoint loader nodes and their selected models.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "comfy_set_checkpoint",
    description:
      "Change the checkpoint/model in a loader node.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
        node_id: {
          type: "string",
          description: "ID of the checkpoint loader node",
        },
        ckpt_name: {
          type: "string",
          description: "Name of the checkpoint file",
        },
      },
      required: ["file_path", "node_id", "ckpt_name"],
    },
  },
  {
    name: "comfy_get_image_size",
    description:
      "Find image dimension nodes (EmptyLatentImage, etc.) and their sizes.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "comfy_set_image_size",
    description:
      "Set image dimensions in EmptyLatentImage or similar nodes.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
        node_id: {
          type: "string",
          description: "ID of the image size node",
        },
        width: { type: "number" },
        height: { type: "number" },
        batch_size: { type: "number" },
      },
      required: ["file_path", "node_id"],
    },
  },
  {
    name: "comfy_api_queue",
    description:
      "Queue a workflow for execution via ComfyUI API. Returns the prompt ID.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file to queue",
        },
        client_id: {
          type: "string",
          description: "Client ID for tracking (optional)",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "comfy_api_status",
    description:
      "Check ComfyUI server status and queue.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "comfy_api_history",
    description:
      "Get execution history from ComfyUI.",
    inputSchema: {
      type: "object",
      properties: {
        prompt_id: {
          type: "string",
          description: "Specific prompt ID to get history for (optional)",
        },
        limit: {
          type: "number",
          description: "Number of history entries to return (default: 10)",
        },
      },
    },
  },
  {
    name: "comfy_api_interrupt",
    description:
      "Interrupt the current generation.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "comfy_list_models",
    description:
      "List available models/checkpoints in ComfyUI.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["checkpoints", "loras", "vae", "controlnet", "embeddings"],
          description: "Type of models to list (default: checkpoints)",
        },
      },
    },
  },
  {
    name: "comfy_analyze_workflow",
    description:
      "Analyze a workflow and provide a summary of its structure, including the generation pipeline, models used, and key settings.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "comfy_clone_workflow",
    description:
      "Clone a workflow to a new file, optionally with modifications.",
    inputSchema: {
      type: "object",
      properties: {
        source_path: {
          type: "string",
          description: "Path to the source workflow",
        },
        dest_path: {
          type: "string",
          description: "Path for the new workflow",
        },
        modifications: {
          type: "object",
          description: "Node modifications to apply: { node_id: { input: value } }",
        },
      },
      required: ["source_path", "dest_path"],
    },
  },
  {
    name: "comfy_get_loras",
    description:
      "Get all LoRA loader nodes and their settings (lora_name, strength_model, strength_clip).",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "comfy_set_lora",
    description:
      "Update LoRA settings (lora_name, strength_model, strength_clip).",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
        node_id: {
          type: "string",
          description: "ID of the LoRA loader node",
        },
        lora_name: { type: "string" },
        strength_model: { type: "number" },
        strength_clip: { type: "number" },
      },
      required: ["file_path", "node_id"],
    },
  },
  {
    name: "comfy_add_lora",
    description:
      "Add a LoRA loader node to a workflow (inserts between model loader and sampler).",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
        lora_name: {
          type: "string",
          description: "Name of the LoRA file",
        },
        strength_model: {
          type: "number",
          description: "Model strength (default: 1.0)",
        },
        strength_clip: {
          type: "number",
          description: "CLIP strength (default: 1.0)",
        },
      },
      required: ["file_path", "lora_name"],
    },
  },
  {
    name: "comfy_get_controlnets",
    description:
      "Get all ControlNet nodes and their settings.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "comfy_set_controlnet",
    description:
      "Update ControlNet settings (control_net_name, strength, start_percent, end_percent).",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
        node_id: {
          type: "string",
          description: "ID of the ControlNet node",
        },
        control_net_name: { type: "string" },
        strength: { type: "number" },
        start_percent: { type: "number" },
        end_percent: { type: "number" },
      },
      required: ["file_path", "node_id"],
    },
  },
  {
    name: "comfy_set_seed",
    description:
      "Set the seed in all KSampler nodes, or randomize them.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
        seed: {
          type: "number",
          description: "Seed value (-1 for random)",
        },
        node_id: {
          type: "string",
          description: "Specific node ID (optional, applies to all samplers if not set)",
        },
      },
      required: ["file_path", "seed"],
    },
  },
  {
    name: "comfy_batch_generate",
    description:
      "Queue multiple generations with variations (different seeds, prompts, or settings).",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
        count: {
          type: "number",
          description: "Number of generations",
        },
        vary_seed: {
          type: "boolean",
          description: "Use different random seed for each (default: true)",
        },
        prompts: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of prompts to cycle through",
        },
      },
      required: ["file_path", "count"],
    },
  },
  {
    name: "comfy_get_outputs",
    description:
      "Get output/save nodes and their settings (filename_prefix, output path).",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "comfy_set_output",
    description:
      "Set output filename prefix in SaveImage nodes.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the workflow JSON file",
        },
        node_id: {
          type: "string",
          description: "ID of the SaveImage node (optional, applies to all if not set)",
        },
        filename_prefix: {
          type: "string",
          description: "Filename prefix for saved images",
        },
      },
      required: ["file_path", "filename_prefix"],
    },
  },
  {
    name: "comfy_get_custom_nodes",
    description:
      "List installed custom node packages in ComfyUI.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "comfy_view_image",
    description:
      "Get the path to the most recent generated image or a specific image from history.",
    inputSchema: {
      type: "object",
      properties: {
        prompt_id: {
          type: "string",
          description: "Prompt ID to get images from (optional, uses latest if not set)",
        },
      },
    },
  },
  {
    name: "comfy_compare_workflows",
    description:
      "Compare two workflows and show the differences.",
    inputSchema: {
      type: "object",
      properties: {
        file_path_1: {
          type: "string",
          description: "Path to first workflow",
        },
        file_path_2: {
          type: "string",
          description: "Path to second workflow",
        },
      },
      required: ["file_path_1", "file_path_2"],
    },
  },
  {
    name: "comfy_extract_metadata",
    description:
      "Extract workflow/generation metadata from a PNG image created by ComfyUI.",
    inputSchema: {
      type: "object",
      properties: {
        image_path: {
          type: "string",
          description: "Path to the PNG image",
        },
      },
      required: ["image_path"],
    },
  },
  {
    name: "comfy_create_workflow",
    description:
      "Create a basic workflow from scratch with common settings.",
    inputSchema: {
      type: "object",
      properties: {
        output_path: {
          type: "string",
          description: "Path for the new workflow file",
        },
        checkpoint: {
          type: "string",
          description: "Checkpoint model name",
        },
        positive_prompt: {
          type: "string",
          description: "Positive prompt text",
        },
        negative_prompt: {
          type: "string",
          description: "Negative prompt text",
        },
        width: { type: "number", description: "Image width (default: 512)" },
        height: { type: "number", description: "Image height (default: 512)" },
        steps: { type: "number", description: "Sampling steps (default: 20)" },
        cfg: { type: "number", description: "CFG scale (default: 7)" },
        sampler: { type: "string", description: "Sampler name (default: euler)" },
        scheduler: { type: "string", description: "Scheduler (default: normal)" },
      },
      required: ["output_path", "checkpoint", "positive_prompt"],
    },
  },
];

// Helper: Load workflow JSON
async function loadWorkflow(filePath) {
  const resolved = resolvePath(filePath);
  const content = await fs.readFile(resolved, "utf-8");
  return JSON.parse(content);
}

// Helper: Save workflow JSON
async function saveWorkflow(filePath, workflow) {
  const resolved = resolvePath(filePath);
  await fs.writeFile(resolved, JSON.stringify(workflow, null, 2));
}

// Helper: HTTP request to ComfyUI API
function comfyRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: COMFY_HOST,
      port: COMFY_PORT,
      path: endpoint,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Helper: Convert API format to prompt format
function workflowToPrompt(workflow) {
  // If it's already in API format (has numbered keys with class_type)
  if (workflow["1"]?.class_type || workflow["2"]?.class_type) {
    return workflow;
  }

  // If it's in web UI format (has nodes array)
  if (workflow.nodes && Array.isArray(workflow.nodes)) {
    const prompt = {};
    for (const node of workflow.nodes) {
      const inputs = {};

      // Get widget values
      if (node.widgets_values) {
        const widgetNames = getWidgetNames(node.type);
        node.widgets_values.forEach((val, i) => {
          if (widgetNames[i]) {
            inputs[widgetNames[i]] = val;
          }
        });
      }

      // Get connections
      if (node.inputs) {
        for (const input of node.inputs) {
          if (input.link !== null && workflow.links) {
            const link = workflow.links.find(l => l[0] === input.link);
            if (link) {
              inputs[input.name] = [String(link[1]), link[2]];
            }
          }
        }
      }

      prompt[String(node.id)] = {
        class_type: node.type,
        inputs: inputs,
      };
    }
    return prompt;
  }

  return workflow;
}

// Widget name mappings for common nodes
function getWidgetNames(nodeType) {
  const mappings = {
    "KSampler": ["seed", "control_after_generate", "steps", "cfg", "sampler_name", "scheduler", "denoise"],
    "KSamplerAdvanced": ["add_noise", "noise_seed", "control_after_generate", "steps", "cfg", "sampler_name", "scheduler", "start_at_step", "end_at_step", "return_with_leftover_noise"],
    "CLIPTextEncode": ["text"],
    "EmptyLatentImage": ["width", "height", "batch_size"],
    "CheckpointLoaderSimple": ["ckpt_name"],
    "LoraLoader": ["lora_name", "strength_model", "strength_clip"],
    "VAELoader": ["vae_name"],
    "SaveImage": ["filename_prefix"],
    "LoadImage": ["image", "upload"],
  };
  return mappings[nodeType] || [];
}

export async function handleComfyuiTool(name, args) {
  try {
    switch (name) {
      case "comfy_read_workflow": {
        const workflow = await loadWorkflow(args.file_path);

        let output = `Workflow: ${args.file_path}\n${"═".repeat(50)}\n\n`;

        // Handle both formats
        const nodes = workflow.nodes || Object.entries(workflow).map(([id, node]) => ({
          id,
          type: node.class_type,
          inputs: node.inputs,
        }));

        output += `Total nodes: ${nodes.length}\n\n`;

        // Group by type
        const byType = {};
        for (const node of nodes) {
          const type = node.type || node.class_type;
          if (!byType[type]) byType[type] = [];
          byType[type].push(node);
        }

        for (const [type, typeNodes] of Object.entries(byType).sort()) {
          output += `${type} (${typeNodes.length})\n`;
          for (const node of typeNodes) {
            output += `  [${node.id}] ${node.title || ""}\n`;
          }
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_list_nodes": {
        const workflow = await loadWorkflow(args.file_path);
        const nodes = workflow.nodes || Object.entries(workflow).map(([id, node]) => ({
          id,
          type: node.class_type,
          inputs: node.inputs,
        }));

        let filtered = nodes;
        if (args.filter_type) {
          filtered = nodes.filter(n =>
            (n.type || n.class_type)?.toLowerCase().includes(args.filter_type.toLowerCase())
          );
        }

        let output = `Nodes${args.filter_type ? ` matching "${args.filter_type}"` : ""}:\n\n`;

        for (const node of filtered) {
          const type = node.type || node.class_type;
          output += `[${node.id}] ${type}`;
          if (node.title) output += ` "${node.title}"`;
          output += "\n";

          // Show key inputs
          const inputs = node.inputs || {};
          const inputEntries = Object.entries(inputs).filter(([k, v]) =>
            typeof v !== "object" || !Array.isArray(v)
          );
          if (inputEntries.length > 0) {
            for (const [key, val] of inputEntries.slice(0, 5)) {
              const displayVal = typeof val === "string" && val.length > 50
                ? val.slice(0, 50) + "..."
                : val;
              output += `    ${key}: ${displayVal}\n`;
            }
          }
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_edit_node": {
        const workflow = await loadWorkflow(args.file_path);

        // Handle both formats
        let node;
        if (workflow.nodes) {
          node = workflow.nodes.find(n => String(n.id) === String(args.node_id));
        } else {
          node = workflow[args.node_id];
        }

        if (!node) {
          return {
            content: [{ type: "text", text: `Node not found: ${args.node_id}` }],
            isError: true,
          };
        }

        // Update inputs
        if (workflow.nodes) {
          // Web UI format - need to update widgets_values
          const widgetNames = getWidgetNames(node.type);
          for (const [key, value] of Object.entries(args.inputs)) {
            const idx = widgetNames.indexOf(key);
            if (idx !== -1 && node.widgets_values) {
              node.widgets_values[idx] = value;
            }
          }
        } else {
          // API format
          Object.assign(node.inputs, args.inputs);
        }

        await saveWorkflow(args.file_path, workflow);

        return {
          content: [{ type: "text", text: `Updated node ${args.node_id}: ${JSON.stringify(args.inputs)}` }],
        };
      }

      case "comfy_find_node": {
        const workflow = await loadWorkflow(args.file_path);
        const nodes = workflow.nodes || Object.entries(workflow).map(([id, node]) => ({
          id,
          type: node.class_type,
          inputs: node.inputs,
          title: node._meta?.title,
        }));

        let results = nodes;

        if (args.node_type) {
          results = results.filter(n =>
            (n.type || n.class_type)?.toLowerCase().includes(args.node_type.toLowerCase())
          );
        }

        if (args.title) {
          results = results.filter(n =>
            n.title?.toLowerCase().includes(args.title.toLowerCase())
          );
        }

        if (args.has_input) {
          results = results.filter(n => {
            const inputs = n.inputs || {};
            return Object.keys(inputs).some(k =>
              k.toLowerCase().includes(args.has_input.toLowerCase())
            );
          });
        }

        if (results.length === 0) {
          return { content: [{ type: "text", text: "No matching nodes found" }] };
        }

        let output = `Found ${results.length} nodes:\n\n`;
        for (const node of results) {
          output += `[${node.id}] ${node.type || node.class_type}`;
          if (node.title) output += ` "${node.title}"`;
          output += "\n";
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_get_prompts": {
        const workflow = await loadWorkflow(args.file_path);
        const nodes = workflow.nodes || Object.entries(workflow).map(([id, node]) => ({
          id,
          type: node.class_type,
          inputs: node.inputs,
          widgets_values: node.widgets_values,
        }));

        const promptNodes = nodes.filter(n =>
          (n.type || n.class_type)?.includes("CLIPTextEncode") ||
          (n.type || n.class_type)?.includes("TextEncode")
        );

        let output = "Text Prompts:\n" + "═".repeat(50) + "\n\n";

        for (const node of promptNodes) {
          let text;
          if (node.widgets_values) {
            text = node.widgets_values[0];
          } else if (node.inputs?.text) {
            text = node.inputs.text;
          }

          output += `[${node.id}] ${node.type || node.class_type}`;
          if (node.title) output += ` "${node.title}"`;
          output += "\n";
          output += `${text || "(empty)"}\n\n`;
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_set_prompt": {
        const workflow = await loadWorkflow(args.file_path);

        let node;
        if (workflow.nodes) {
          node = workflow.nodes.find(n => String(n.id) === String(args.node_id));
          if (node && node.widgets_values) {
            node.widgets_values[0] = args.text;
          }
        } else {
          node = workflow[args.node_id];
          if (node) {
            node.inputs.text = args.text;
          }
        }

        if (!node) {
          return {
            content: [{ type: "text", text: `Node not found: ${args.node_id}` }],
            isError: true,
          };
        }

        await saveWorkflow(args.file_path, workflow);

        return {
          content: [{ type: "text", text: `Updated prompt in node ${args.node_id}` }],
        };
      }

      case "comfy_get_samplers": {
        const workflow = await loadWorkflow(args.file_path);
        const nodes = workflow.nodes || Object.entries(workflow).map(([id, node]) => ({
          id,
          type: node.class_type,
          inputs: node.inputs,
          widgets_values: node.widgets_values,
        }));

        const samplers = nodes.filter(n =>
          (n.type || n.class_type)?.includes("KSampler")
        );

        let output = "KSampler Nodes:\n" + "═".repeat(50) + "\n\n";

        for (const node of samplers) {
          output += `[${node.id}] ${node.type || node.class_type}\n`;

          if (node.widgets_values) {
            const names = getWidgetNames(node.type || node.class_type);
            names.forEach((name, i) => {
              if (node.widgets_values[i] !== undefined) {
                output += `  ${name}: ${node.widgets_values[i]}\n`;
              }
            });
          } else if (node.inputs) {
            for (const [key, val] of Object.entries(node.inputs)) {
              if (typeof val !== "object") {
                output += `  ${key}: ${val}\n`;
              }
            }
          }
          output += "\n";
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_set_sampler": {
        const workflow = await loadWorkflow(args.file_path);

        const updates = {};
        if (args.steps !== undefined) updates.steps = args.steps;
        if (args.cfg !== undefined) updates.cfg = args.cfg;
        if (args.seed !== undefined) updates.seed = args.seed;
        if (args.sampler_name !== undefined) updates.sampler_name = args.sampler_name;
        if (args.scheduler !== undefined) updates.scheduler = args.scheduler;
        if (args.denoise !== undefined) updates.denoise = args.denoise;

        let node;
        if (workflow.nodes) {
          node = workflow.nodes.find(n => String(n.id) === String(args.node_id));
          if (node && node.widgets_values) {
            const names = getWidgetNames(node.type);
            for (const [key, val] of Object.entries(updates)) {
              const idx = names.indexOf(key);
              if (idx !== -1) {
                node.widgets_values[idx] = val;
              }
            }
          }
        } else {
          node = workflow[args.node_id];
          if (node) {
            Object.assign(node.inputs, updates);
          }
        }

        if (!node) {
          return {
            content: [{ type: "text", text: `Node not found: ${args.node_id}` }],
            isError: true,
          };
        }

        await saveWorkflow(args.file_path, workflow);

        return {
          content: [{ type: "text", text: `Updated sampler ${args.node_id}: ${JSON.stringify(updates)}` }],
        };
      }

      case "comfy_get_checkpoints": {
        const workflow = await loadWorkflow(args.file_path);
        const nodes = workflow.nodes || Object.entries(workflow).map(([id, node]) => ({
          id,
          type: node.class_type,
          inputs: node.inputs,
          widgets_values: node.widgets_values,
        }));

        const loaders = nodes.filter(n =>
          (n.type || n.class_type)?.includes("CheckpointLoader") ||
          (n.type || n.class_type)?.includes("UNETLoader")
        );

        let output = "Checkpoint Loaders:\n" + "═".repeat(50) + "\n\n";

        for (const node of loaders) {
          output += `[${node.id}] ${node.type || node.class_type}\n`;

          let ckptName;
          if (node.widgets_values) {
            ckptName = node.widgets_values[0];
          } else if (node.inputs?.ckpt_name) {
            ckptName = node.inputs.ckpt_name;
          }

          output += `  Model: ${ckptName || "unknown"}\n\n`;
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_set_checkpoint": {
        const workflow = await loadWorkflow(args.file_path);

        let node;
        if (workflow.nodes) {
          node = workflow.nodes.find(n => String(n.id) === String(args.node_id));
          if (node && node.widgets_values) {
            node.widgets_values[0] = args.ckpt_name;
          }
        } else {
          node = workflow[args.node_id];
          if (node) {
            node.inputs.ckpt_name = args.ckpt_name;
          }
        }

        if (!node) {
          return {
            content: [{ type: "text", text: `Node not found: ${args.node_id}` }],
            isError: true,
          };
        }

        await saveWorkflow(args.file_path, workflow);

        return {
          content: [{ type: "text", text: `Set checkpoint to: ${args.ckpt_name}` }],
        };
      }

      case "comfy_get_image_size": {
        const workflow = await loadWorkflow(args.file_path);
        const nodes = workflow.nodes || Object.entries(workflow).map(([id, node]) => ({
          id,
          type: node.class_type,
          inputs: node.inputs,
          widgets_values: node.widgets_values,
        }));

        const sizeNodes = nodes.filter(n =>
          (n.type || n.class_type)?.includes("EmptyLatentImage") ||
          (n.type || n.class_type)?.includes("LatentUpscale") ||
          (n.type || n.class_type)?.includes("ImageScale")
        );

        let output = "Image Size Nodes:\n" + "═".repeat(50) + "\n\n";

        for (const node of sizeNodes) {
          output += `[${node.id}] ${node.type || node.class_type}\n`;

          if (node.widgets_values) {
            const [width, height, batch] = node.widgets_values;
            output += `  Size: ${width} x ${height}\n`;
            if (batch) output += `  Batch: ${batch}\n`;
          } else if (node.inputs) {
            if (node.inputs.width) output += `  Width: ${node.inputs.width}\n`;
            if (node.inputs.height) output += `  Height: ${node.inputs.height}\n`;
            if (node.inputs.batch_size) output += `  Batch: ${node.inputs.batch_size}\n`;
          }
          output += "\n";
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_set_image_size": {
        const workflow = await loadWorkflow(args.file_path);

        let node;
        if (workflow.nodes) {
          node = workflow.nodes.find(n => String(n.id) === String(args.node_id));
          if (node && node.widgets_values) {
            if (args.width !== undefined) node.widgets_values[0] = args.width;
            if (args.height !== undefined) node.widgets_values[1] = args.height;
            if (args.batch_size !== undefined) node.widgets_values[2] = args.batch_size;
          }
        } else {
          node = workflow[args.node_id];
          if (node) {
            if (args.width !== undefined) node.inputs.width = args.width;
            if (args.height !== undefined) node.inputs.height = args.height;
            if (args.batch_size !== undefined) node.inputs.batch_size = args.batch_size;
          }
        }

        if (!node) {
          return {
            content: [{ type: "text", text: `Node not found: ${args.node_id}` }],
            isError: true,
          };
        }

        await saveWorkflow(args.file_path, workflow);

        const changes = [];
        if (args.width !== undefined) changes.push(`width=${args.width}`);
        if (args.height !== undefined) changes.push(`height=${args.height}`);
        if (args.batch_size !== undefined) changes.push(`batch=${args.batch_size}`);

        return {
          content: [{ type: "text", text: `Updated image size: ${changes.join(", ")}` }],
        };
      }

      case "comfy_api_queue": {
        const workflow = await loadWorkflow(args.file_path);
        const prompt = workflowToPrompt(workflow);

        const body = {
          prompt: prompt,
          client_id: args.client_id || "mcp-client",
        };

        const result = await comfyRequest("POST", "/prompt", body);

        return {
          content: [{ type: "text", text: `Queued workflow. Prompt ID: ${result.prompt_id}` }],
        };
      }

      case "comfy_api_status": {
        const [queue, system] = await Promise.all([
          comfyRequest("GET", "/queue"),
          comfyRequest("GET", "/system_stats"),
        ]);

        let output = "ComfyUI Status\n" + "═".repeat(50) + "\n\n";
        output += `Queue running: ${queue.queue_running?.length || 0}\n`;
        output += `Queue pending: ${queue.queue_pending?.length || 0}\n\n`;

        if (system.system) {
          output += `OS: ${system.system.os}\n`;
          output += `Python: ${system.system.python_version}\n`;
        }

        if (system.devices) {
          output += "\nDevices:\n";
          for (const device of system.devices) {
            output += `  ${device.name}: ${device.type}\n`;
            if (device.vram_total) {
              output += `    VRAM: ${Math.round(device.vram_free / 1024 / 1024)}MB free / ${Math.round(device.vram_total / 1024 / 1024)}MB total\n`;
            }
          }
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_api_history": {
        let endpoint = "/history";
        if (args.prompt_id) {
          endpoint += `/${args.prompt_id}`;
        }

        const history = await comfyRequest("GET", endpoint);
        const limit = args.limit || 10;

        let output = "Execution History\n" + "═".repeat(50) + "\n\n";

        const entries = Object.entries(history).slice(0, limit);

        for (const [promptId, data] of entries) {
          output += `Prompt: ${promptId}\n`;
          if (data.status) {
            output += `  Status: ${data.status.status_str || "unknown"}\n`;
            if (data.status.messages) {
              for (const msg of data.status.messages.slice(0, 3)) {
                output += `  ${msg[0]}: ${JSON.stringify(msg[1]).slice(0, 100)}\n`;
              }
            }
          }
          output += "\n";
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_api_interrupt": {
        await comfyRequest("POST", "/interrupt");
        return {
          content: [{ type: "text", text: "Interrupted current generation" }],
        };
      }

      case "comfy_list_models": {
        const type = args.type || "checkpoints";
        const endpoint = `/object_info`;

        const info = await comfyRequest("GET", endpoint);

        let models = [];

        if (type === "checkpoints" && info.CheckpointLoaderSimple) {
          models = info.CheckpointLoaderSimple.input.required.ckpt_name[0];
        } else if (type === "loras" && info.LoraLoader) {
          models = info.LoraLoader.input.required.lora_name[0];
        } else if (type === "vae" && info.VAELoader) {
          models = info.VAELoader.input.required.vae_name[0];
        } else if (type === "controlnet" && info.ControlNetLoader) {
          models = info.ControlNetLoader.input.required.control_net_name[0];
        } else if (type === "embeddings" && info.CLIPTextEncode) {
          // Embeddings are typically listed differently
          models = ["(check embeddings folder)"];
        }

        let output = `Available ${type}:\n` + "═".repeat(50) + "\n\n";

        if (Array.isArray(models)) {
          models.forEach((m, i) => {
            output += `${i + 1}. ${m}\n`;
          });
        } else {
          output += "Could not retrieve model list\n";
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_analyze_workflow": {
        const workflow = await loadWorkflow(args.file_path);
        const nodes = workflow.nodes || Object.entries(workflow).map(([id, node]) => ({
          id,
          type: node.class_type,
          inputs: node.inputs,
          widgets_values: node.widgets_values,
        }));

        let output = `Workflow Analysis: ${args.file_path}\n`;
        output += "═".repeat(50) + "\n\n";

        // Count node types
        const typeCounts = {};
        for (const node of nodes) {
          const type = node.type || node.class_type;
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        }

        output += `Total Nodes: ${nodes.length}\n\n`;

        // Models
        const checkpoints = nodes.filter(n => (n.type || n.class_type)?.includes("CheckpointLoader"));
        if (checkpoints.length > 0) {
          output += "Models:\n";
          for (const cp of checkpoints) {
            const name = cp.widgets_values?.[0] || cp.inputs?.ckpt_name || "unknown";
            output += `  • ${name}\n`;
          }
          output += "\n";
        }

        // LoRAs
        const loras = nodes.filter(n => (n.type || n.class_type)?.includes("LoraLoader"));
        if (loras.length > 0) {
          output += "LoRAs:\n";
          for (const lora of loras) {
            const name = lora.widgets_values?.[0] || lora.inputs?.lora_name || "unknown";
            const strength = lora.widgets_values?.[1] || lora.inputs?.strength_model || "?";
            output += `  • ${name} (strength: ${strength})\n`;
          }
          output += "\n";
        }

        // Samplers
        const samplers = nodes.filter(n => (n.type || n.class_type)?.includes("KSampler"));
        if (samplers.length > 0) {
          output += "Sampling:\n";
          for (const sampler of samplers) {
            const wv = sampler.widgets_values || [];
            const inp = sampler.inputs || {};
            output += `  • Steps: ${wv[2] || inp.steps || "?"}, CFG: ${wv[3] || inp.cfg || "?"}\n`;
            output += `    Sampler: ${wv[4] || inp.sampler_name || "?"}, Scheduler: ${wv[5] || inp.scheduler || "?"}\n`;
          }
          output += "\n";
        }

        // Image size
        const latent = nodes.find(n => (n.type || n.class_type) === "EmptyLatentImage");
        if (latent) {
          const wv = latent.widgets_values || [];
          const inp = latent.inputs || {};
          output += `Image Size: ${wv[0] || inp.width || "?"} x ${wv[1] || inp.height || "?"}\n\n`;
        }

        // Pipeline type
        output += "Pipeline Type: ";
        if (typeCounts["KSamplerAdvanced"]) {
          output += "Advanced (multi-pass)\n";
        } else if (typeCounts["KSampler"]) {
          output += "Standard\n";
        } else {
          output += "Unknown\n";
        }

        // Special nodes
        const special = [];
        if (typeCounts["ControlNetLoader"] || typeCounts["ControlNetApply"]) special.push("ControlNet");
        if (typeCounts["IPAdapterLoader"] || typeCounts["IPAdapter"]) special.push("IP-Adapter");
        if (typeCounts["UpscaleModelLoader"]) special.push("Upscaling");
        if (typeCounts["FaceDetailer"] || typeCounts["FaceRestoreModelLoader"]) special.push("Face Enhancement");
        if (typeCounts["AnimateDiffLoader"]) special.push("AnimateDiff");

        if (special.length > 0) {
          output += `Features: ${special.join(", ")}\n`;
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_clone_workflow": {
        const workflow = await loadWorkflow(args.source_path);

        // Apply modifications if provided
        if (args.modifications) {
          for (const [nodeId, changes] of Object.entries(args.modifications)) {
            if (workflow.nodes) {
              const node = workflow.nodes.find(n => String(n.id) === String(nodeId));
              if (node && node.widgets_values) {
                const widgetNames = getWidgetNames(node.type);
                for (const [key, value] of Object.entries(changes)) {
                  const idx = widgetNames.indexOf(key);
                  if (idx !== -1) {
                    node.widgets_values[idx] = value;
                  }
                }
              }
            } else if (workflow[nodeId]) {
              Object.assign(workflow[nodeId].inputs, changes);
            }
          }
        }

        await saveWorkflow(args.dest_path, workflow);

        return {
          content: [{ type: "text", text: `Cloned workflow to: ${args.dest_path}${args.modifications ? " (with modifications)" : ""}` }],
        };
      }

      case "comfy_get_loras": {
        const workflow = await loadWorkflow(args.file_path);
        const nodes = workflow.nodes || Object.entries(workflow).map(([id, node]) => ({
          id,
          type: node.class_type,
          inputs: node.inputs,
          widgets_values: node.widgets_values,
        }));

        const loraNodes = nodes.filter(n =>
          (n.type || n.class_type)?.includes("LoraLoader")
        );

        let output = "LoRA Loaders:\n" + "═".repeat(50) + "\n\n";

        if (loraNodes.length === 0) {
          output += "No LoRA loaders found in workflow.\n";
        } else {
          for (const node of loraNodes) {
            output += `[${node.id}] ${node.type || node.class_type}\n`;

            if (node.widgets_values) {
              const [lora_name, strength_model, strength_clip] = node.widgets_values;
              output += `  LoRA: ${lora_name || "none"}\n`;
              output += `  Model Strength: ${strength_model ?? 1.0}\n`;
              output += `  CLIP Strength: ${strength_clip ?? 1.0}\n`;
            } else if (node.inputs) {
              output += `  LoRA: ${node.inputs.lora_name || "none"}\n`;
              output += `  Model Strength: ${node.inputs.strength_model ?? 1.0}\n`;
              output += `  CLIP Strength: ${node.inputs.strength_clip ?? 1.0}\n`;
            }
            output += "\n";
          }
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_set_lora": {
        const workflow = await loadWorkflow(args.file_path);

        let node;
        if (workflow.nodes) {
          node = workflow.nodes.find(n => String(n.id) === String(args.node_id));
          if (node && node.widgets_values) {
            if (args.lora_name !== undefined) node.widgets_values[0] = args.lora_name;
            if (args.strength_model !== undefined) node.widgets_values[1] = args.strength_model;
            if (args.strength_clip !== undefined) node.widgets_values[2] = args.strength_clip;
          }
        } else {
          node = workflow[args.node_id];
          if (node) {
            if (args.lora_name !== undefined) node.inputs.lora_name = args.lora_name;
            if (args.strength_model !== undefined) node.inputs.strength_model = args.strength_model;
            if (args.strength_clip !== undefined) node.inputs.strength_clip = args.strength_clip;
          }
        }

        if (!node) {
          return {
            content: [{ type: "text", text: `Node not found: ${args.node_id}` }],
            isError: true,
          };
        }

        await saveWorkflow(args.file_path, workflow);

        const changes = [];
        if (args.lora_name !== undefined) changes.push(`lora=${args.lora_name}`);
        if (args.strength_model !== undefined) changes.push(`model_str=${args.strength_model}`);
        if (args.strength_clip !== undefined) changes.push(`clip_str=${args.strength_clip}`);

        return {
          content: [{ type: "text", text: `Updated LoRA: ${changes.join(", ")}` }],
        };
      }

      case "comfy_add_lora": {
        const workflow = await loadWorkflow(args.file_path);

        // Find highest node ID
        let maxId = 0;
        if (workflow.nodes) {
          for (const node of workflow.nodes) {
            if (node.id > maxId) maxId = node.id;
          }
        } else {
          for (const id of Object.keys(workflow)) {
            const numId = parseInt(id);
            if (!isNaN(numId) && numId > maxId) maxId = numId;
          }
        }

        const newId = maxId + 1;
        const strength_model = args.strength_model ?? 1.0;
        const strength_clip = args.strength_clip ?? 1.0;

        if (workflow.nodes) {
          // Web UI format
          const newNode = {
            id: newId,
            type: "LoraLoader",
            pos: [200, 200],
            size: [315, 126],
            widgets_values: [args.lora_name, strength_model, strength_clip],
            inputs: [
              { name: "model", type: "MODEL", link: null },
              { name: "clip", type: "CLIP", link: null },
            ],
            outputs: [
              { name: "MODEL", type: "MODEL", links: [], slot_index: 0 },
              { name: "CLIP", type: "CLIP", links: [], slot_index: 1 },
            ],
          };
          workflow.nodes.push(newNode);
        } else {
          // API format
          workflow[String(newId)] = {
            class_type: "LoraLoader",
            inputs: {
              lora_name: args.lora_name,
              strength_model: strength_model,
              strength_clip: strength_clip,
            },
          };
        }

        await saveWorkflow(args.file_path, workflow);

        return {
          content: [{ type: "text", text: `Added LoRA loader [${newId}]: ${args.lora_name} (strength: ${strength_model}/${strength_clip})\nNote: You'll need to connect this node in the workflow editor.` }],
        };
      }

      case "comfy_get_controlnets": {
        const workflow = await loadWorkflow(args.file_path);
        const nodes = workflow.nodes || Object.entries(workflow).map(([id, node]) => ({
          id,
          type: node.class_type,
          inputs: node.inputs,
          widgets_values: node.widgets_values,
        }));

        const cnNodes = nodes.filter(n =>
          (n.type || n.class_type)?.includes("ControlNet")
        );

        let output = "ControlNet Nodes:\n" + "═".repeat(50) + "\n\n";

        if (cnNodes.length === 0) {
          output += "No ControlNet nodes found in workflow.\n";
        } else {
          for (const node of cnNodes) {
            output += `[${node.id}] ${node.type || node.class_type}\n`;

            if (node.widgets_values) {
              output += `  Values: ${JSON.stringify(node.widgets_values)}\n`;
            }
            if (node.inputs) {
              const scalarInputs = Object.entries(node.inputs).filter(([k, v]) => typeof v !== "object");
              for (const [key, val] of scalarInputs) {
                output += `  ${key}: ${val}\n`;
              }
            }
            output += "\n";
          }
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_set_controlnet": {
        const workflow = await loadWorkflow(args.file_path);

        let node;
        if (workflow.nodes) {
          node = workflow.nodes.find(n => String(n.id) === String(args.node_id));
        } else {
          node = workflow[args.node_id];
        }

        if (!node) {
          return {
            content: [{ type: "text", text: `Node not found: ${args.node_id}` }],
            isError: true,
          };
        }

        const updates = {};
        if (args.control_net_name !== undefined) updates.control_net_name = args.control_net_name;
        if (args.strength !== undefined) updates.strength = args.strength;
        if (args.start_percent !== undefined) updates.start_percent = args.start_percent;
        if (args.end_percent !== undefined) updates.end_percent = args.end_percent;

        if (workflow.nodes) {
          // For web UI format, we need to handle widgets_values appropriately
          // This varies by ControlNet node type, so we just update inputs if available
          if (!node.inputs) node.inputs = {};
          Object.assign(node.inputs, updates);
        } else {
          Object.assign(node.inputs, updates);
        }

        await saveWorkflow(args.file_path, workflow);

        return {
          content: [{ type: "text", text: `Updated ControlNet: ${JSON.stringify(updates)}` }],
        };
      }

      case "comfy_set_seed": {
        const workflow = await loadWorkflow(args.file_path);
        const seed = args.seed === -1 ? Math.floor(Math.random() * 2147483647) : args.seed;

        let updated = [];

        if (workflow.nodes) {
          for (const node of workflow.nodes) {
            if ((node.type || node.class_type)?.includes("KSampler")) {
              if (args.node_id && String(node.id) !== String(args.node_id)) continue;

              if (node.widgets_values) {
                node.widgets_values[0] = seed;
                updated.push(node.id);
              }
            }
          }
        } else {
          for (const [id, node] of Object.entries(workflow)) {
            if (node.class_type?.includes("KSampler")) {
              if (args.node_id && id !== args.node_id) continue;

              node.inputs.seed = seed;
              updated.push(id);
            }
          }
        }

        await saveWorkflow(args.file_path, workflow);

        return {
          content: [{ type: "text", text: `Set seed to ${seed} in nodes: ${updated.join(", ")}` }],
        };
      }

      case "comfy_batch_generate": {
        const workflow = await loadWorkflow(args.file_path);
        const prompt = workflowToPrompt(workflow);
        const count = args.count || 1;
        const varySeed = args.vary_seed !== false;

        const results = [];

        for (let i = 0; i < count; i++) {
          // Clone the prompt for each generation
          const batchPrompt = JSON.parse(JSON.stringify(prompt));

          // Vary seed if requested
          if (varySeed) {
            for (const node of Object.values(batchPrompt)) {
              if (node.class_type?.includes("KSampler") && node.inputs) {
                node.inputs.seed = Math.floor(Math.random() * 2147483647);
              }
            }
          }

          // Apply prompt variation if provided
          if (args.prompts && args.prompts.length > 0) {
            const promptText = args.prompts[i % args.prompts.length];
            for (const node of Object.values(batchPrompt)) {
              if (node.class_type === "CLIPTextEncode" && node.inputs) {
                // Only update the first/positive prompt found
                node.inputs.text = promptText;
                break;
              }
            }
          }

          const body = {
            prompt: batchPrompt,
            client_id: `mcp-batch-${i}`,
          };

          try {
            const result = await comfyRequest("POST", "/prompt", body);
            results.push({ index: i + 1, prompt_id: result.prompt_id });
          } catch (error) {
            results.push({ index: i + 1, error: error.message });
          }
        }

        let output = `Batch generation queued: ${count} images\n` + "═".repeat(50) + "\n\n";
        for (const r of results) {
          if (r.error) {
            output += `#${r.index}: Error - ${r.error}\n`;
          } else {
            output += `#${r.index}: ${r.prompt_id}\n`;
          }
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_get_outputs": {
        const workflow = await loadWorkflow(args.file_path);
        const nodes = workflow.nodes || Object.entries(workflow).map(([id, node]) => ({
          id,
          type: node.class_type,
          inputs: node.inputs,
          widgets_values: node.widgets_values,
        }));

        const outputNodes = nodes.filter(n =>
          (n.type || n.class_type)?.includes("SaveImage") ||
          (n.type || n.class_type)?.includes("PreviewImage") ||
          (n.type || n.class_type)?.includes("Output")
        );

        let output = "Output Nodes:\n" + "═".repeat(50) + "\n\n";

        if (outputNodes.length === 0) {
          output += "No output/save nodes found in workflow.\n";
        } else {
          for (const node of outputNodes) {
            output += `[${node.id}] ${node.type || node.class_type}\n`;

            if (node.widgets_values) {
              output += `  Filename prefix: ${node.widgets_values[0] || "ComfyUI"}\n`;
            } else if (node.inputs?.filename_prefix) {
              output += `  Filename prefix: ${node.inputs.filename_prefix}\n`;
            }
            output += "\n";
          }
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_set_output": {
        const workflow = await loadWorkflow(args.file_path);
        let updated = [];

        if (workflow.nodes) {
          for (const node of workflow.nodes) {
            if ((node.type || node.class_type)?.includes("SaveImage")) {
              if (args.node_id && String(node.id) !== String(args.node_id)) continue;

              if (node.widgets_values) {
                node.widgets_values[0] = args.filename_prefix;
                updated.push(node.id);
              }
            }
          }
        } else {
          for (const [id, node] of Object.entries(workflow)) {
            if (node.class_type?.includes("SaveImage")) {
              if (args.node_id && id !== args.node_id) continue;

              node.inputs.filename_prefix = args.filename_prefix;
              updated.push(id);
            }
          }
        }

        await saveWorkflow(args.file_path, workflow);

        return {
          content: [{ type: "text", text: `Set filename prefix to "${args.filename_prefix}" in nodes: ${updated.join(", ") || "none found"}` }],
        };
      }

      case "comfy_get_custom_nodes": {
        try {
          const info = await comfyRequest("GET", "/object_info");

          // Group nodes by category/package
          const categories = {};
          let totalNodes = 0;

          for (const [nodeName, nodeInfo] of Object.entries(info)) {
            totalNodes++;
            const category = nodeInfo.category || "Uncategorized";
            const topCategory = category.split("/")[0];

            if (!categories[topCategory]) {
              categories[topCategory] = [];
            }
            categories[topCategory].push(nodeName);
          }

          let output = "Installed Custom Nodes\n" + "═".repeat(50) + "\n\n";
          output += `Total node types: ${totalNodes}\n\n`;

          // Show categories with counts
          const sortedCategories = Object.entries(categories).sort((a, b) => b[1].length - a[1].length);

          for (const [category, nodes] of sortedCategories.slice(0, 20)) {
            output += `${category}: ${nodes.length} nodes\n`;
          }

          if (sortedCategories.length > 20) {
            output += `... and ${sortedCategories.length - 20} more categories\n`;
          }

          return { content: [{ type: "text", text: output }] };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Could not fetch custom nodes: ${error.message}\nMake sure ComfyUI is running.` }],
            isError: true,
          };
        }
      }

      case "comfy_view_image": {
        try {
          let history;
          if (args.prompt_id) {
            history = await comfyRequest("GET", `/history/${args.prompt_id}`);
          } else {
            history = await comfyRequest("GET", "/history");
          }

          // Find images in the most recent execution
          const entries = Object.entries(history);
          if (entries.length === 0) {
            return {
              content: [{ type: "text", text: "No execution history found." }],
            };
          }

          // Get the most recent entry if no specific prompt_id
          const [promptId, data] = args.prompt_id
            ? [args.prompt_id, history[args.prompt_id]]
            : entries[entries.length - 1];

          if (!data || !data.outputs) {
            return {
              content: [{ type: "text", text: `No outputs found for prompt: ${promptId}` }],
            };
          }

          let output = `Images from prompt ${promptId}:\n` + "═".repeat(50) + "\n\n";

          for (const [nodeId, nodeOutput] of Object.entries(data.outputs)) {
            if (nodeOutput.images) {
              for (const img of nodeOutput.images) {
                output += `Node [${nodeId}]:\n`;
                output += `  Filename: ${img.filename}\n`;
                output += `  Subfolder: ${img.subfolder || "(root)"}\n`;
                output += `  Type: ${img.type}\n`;
                output += `  URL: http://${COMFY_HOST}:${COMFY_PORT}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || "")}&type=${img.type}\n\n`;
              }
            }
          }

          return { content: [{ type: "text", text: output }] };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error fetching images: ${error.message}` }],
            isError: true,
          };
        }
      }

      case "comfy_compare_workflows": {
        const workflow1 = await loadWorkflow(args.file_path_1);
        const workflow2 = await loadWorkflow(args.file_path_2);

        const nodes1 = workflow1.nodes || Object.entries(workflow1).map(([id, node]) => ({
          id, type: node.class_type, inputs: node.inputs, widgets_values: node.widgets_values,
        }));
        const nodes2 = workflow2.nodes || Object.entries(workflow2).map(([id, node]) => ({
          id, type: node.class_type, inputs: node.inputs, widgets_values: node.widgets_values,
        }));

        let output = `Workflow Comparison\n`;
        output += "═".repeat(50) + "\n\n";
        output += `File 1: ${args.file_path_1} (${nodes1.length} nodes)\n`;
        output += `File 2: ${args.file_path_2} (${nodes2.length} nodes)\n\n`;

        // Count node types in each
        const types1 = {};
        const types2 = {};

        for (const n of nodes1) {
          const t = n.type || n.class_type;
          types1[t] = (types1[t] || 0) + 1;
        }
        for (const n of nodes2) {
          const t = n.type || n.class_type;
          types2[t] = (types2[t] || 0) + 1;
        }

        // Find differences in node types
        const allTypes = new Set([...Object.keys(types1), ...Object.keys(types2)]);
        const typeDiffs = [];

        for (const type of allTypes) {
          const c1 = types1[type] || 0;
          const c2 = types2[type] || 0;
          if (c1 !== c2) {
            typeDiffs.push({ type, file1: c1, file2: c2 });
          }
        }

        if (typeDiffs.length > 0) {
          output += "Node Type Differences:\n";
          for (const diff of typeDiffs) {
            output += `  ${diff.type}: ${diff.file1} → ${diff.file2}\n`;
          }
          output += "\n";
        } else {
          output += "Node types are identical.\n\n";
        }

        // Compare key settings for matching nodes
        output += "Key Setting Differences:\n";

        // Compare samplers
        const samplers1 = nodes1.filter(n => (n.type || n.class_type)?.includes("KSampler"));
        const samplers2 = nodes2.filter(n => (n.type || n.class_type)?.includes("KSampler"));

        if (samplers1.length > 0 && samplers2.length > 0) {
          const s1 = samplers1[0];
          const s2 = samplers2[0];

          const getVal = (node, idx, key) => {
            if (node.widgets_values) return node.widgets_values[idx];
            if (node.inputs) return node.inputs[key];
            return "?";
          };

          const settings = [
            { name: "steps", idx: 2 },
            { name: "cfg", idx: 3 },
            { name: "sampler_name", idx: 4 },
            { name: "scheduler", idx: 5 },
            { name: "denoise", idx: 6 },
          ];

          for (const s of settings) {
            const v1 = getVal(s1, s.idx, s.name);
            const v2 = getVal(s2, s.idx, s.name);
            if (v1 !== v2) {
              output += `  ${s.name}: ${v1} → ${v2}\n`;
            }
          }
        }

        // Compare image sizes
        const latent1 = nodes1.find(n => (n.type || n.class_type) === "EmptyLatentImage");
        const latent2 = nodes2.find(n => (n.type || n.class_type) === "EmptyLatentImage");

        if (latent1 && latent2) {
          const w1 = latent1.widgets_values?.[0] || latent1.inputs?.width;
          const w2 = latent2.widgets_values?.[0] || latent2.inputs?.width;
          const h1 = latent1.widgets_values?.[1] || latent1.inputs?.height;
          const h2 = latent2.widgets_values?.[1] || latent2.inputs?.height;

          if (w1 !== w2 || h1 !== h2) {
            output += `  Image size: ${w1}x${h1} → ${w2}x${h2}\n`;
          }
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_extract_metadata": {
        const imagePath = resolvePath(args.image_path);
        const buffer = await fs.readFile(imagePath);

        // PNG metadata is stored in tEXt chunks
        // ComfyUI stores workflow in "workflow" and prompt in "prompt"
        let output = `Metadata from: ${args.image_path}\n` + "═".repeat(50) + "\n\n";

        // Simple PNG chunk parser
        const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

        if (!buffer.slice(0, 8).equals(PNG_SIGNATURE)) {
          return {
            content: [{ type: "text", text: "Not a valid PNG file." }],
            isError: true,
          };
        }

        let offset = 8;
        const metadata = {};

        while (offset < buffer.length) {
          const length = buffer.readUInt32BE(offset);
          const type = buffer.slice(offset + 4, offset + 8).toString("ascii");

          if (type === "tEXt" || type === "iTXt") {
            const data = buffer.slice(offset + 8, offset + 8 + length);
            const nullIndex = data.indexOf(0);
            if (nullIndex !== -1) {
              const key = data.slice(0, nullIndex).toString("ascii");
              let value;

              if (type === "iTXt") {
                // iTXt has compression flag and other fields
                const compressionFlag = data[nullIndex + 1];
                const nullIndex2 = data.indexOf(0, nullIndex + 4);
                const nullIndex3 = data.indexOf(0, nullIndex2 + 1);
                value = data.slice(nullIndex3 + 1).toString("utf8");
              } else {
                value = data.slice(nullIndex + 1).toString("latin1");
              }

              metadata[key] = value;
            }
          }

          if (type === "IEND") break;
          offset += 12 + length;
        }

        if (metadata.workflow) {
          try {
            const workflow = JSON.parse(metadata.workflow);
            output += "Workflow found! Nodes:\n";
            const nodes = workflow.nodes || Object.entries(workflow).map(([id, n]) => ({
              id, type: n.class_type
            }));
            for (const node of nodes.slice(0, 10)) {
              output += `  [${node.id}] ${node.type || node.class_type}\n`;
            }
            if (nodes.length > 10) {
              output += `  ... and ${nodes.length - 10} more nodes\n`;
            }
            output += "\n";
          } catch {
            output += "Workflow data found but could not parse.\n\n";
          }
        }

        if (metadata.prompt) {
          try {
            const prompt = JSON.parse(metadata.prompt);
            output += "Prompt data found.\n";
            output += `  Nodes in prompt: ${Object.keys(prompt).length}\n\n`;
          } catch {
            output += "Prompt data found but could not parse.\n\n";
          }
        }

        if (Object.keys(metadata).length === 0) {
          output += "No ComfyUI metadata found in this image.\n";
        } else {
          output += `\nAll metadata keys: ${Object.keys(metadata).join(", ")}\n`;
        }

        return { content: [{ type: "text", text: output }] };
      }

      case "comfy_create_workflow": {
        const checkpoint = args.checkpoint;
        const positivePrompt = args.positive_prompt;
        const negativePrompt = args.negative_prompt || "";
        const width = args.width || 512;
        const height = args.height || 512;
        const steps = args.steps || 20;
        const cfg = args.cfg || 7;
        const sampler = args.sampler || "euler";
        const scheduler = args.scheduler || "normal";

        // Create a basic workflow in API format
        const workflow = {
          "1": {
            class_type: "CheckpointLoaderSimple",
            inputs: {
              ckpt_name: checkpoint,
            },
          },
          "2": {
            class_type: "CLIPTextEncode",
            inputs: {
              text: positivePrompt,
              clip: ["1", 1],
            },
          },
          "3": {
            class_type: "CLIPTextEncode",
            inputs: {
              text: negativePrompt,
              clip: ["1", 1],
            },
          },
          "4": {
            class_type: "EmptyLatentImage",
            inputs: {
              width: width,
              height: height,
              batch_size: 1,
            },
          },
          "5": {
            class_type: "KSampler",
            inputs: {
              seed: Math.floor(Math.random() * 2147483647),
              steps: steps,
              cfg: cfg,
              sampler_name: sampler,
              scheduler: scheduler,
              denoise: 1,
              model: ["1", 0],
              positive: ["2", 0],
              negative: ["3", 0],
              latent_image: ["4", 0],
            },
          },
          "6": {
            class_type: "VAEDecode",
            inputs: {
              samples: ["5", 0],
              vae: ["1", 2],
            },
          },
          "7": {
            class_type: "SaveImage",
            inputs: {
              filename_prefix: "ComfyUI",
              images: ["6", 0],
            },
          },
        };

        await saveWorkflow(args.output_path, workflow);

        let output = `Created workflow: ${args.output_path}\n` + "═".repeat(50) + "\n\n";
        output += `Checkpoint: ${checkpoint}\n`;
        output += `Positive: ${positivePrompt.slice(0, 50)}${positivePrompt.length > 50 ? "..." : ""}\n`;
        output += `Negative: ${negativePrompt.slice(0, 50)}${negativePrompt.length > 50 ? "..." : ""}\n`;
        output += `Size: ${width} x ${height}\n`;
        output += `Steps: ${steps}, CFG: ${cfg}\n`;
        output += `Sampler: ${sampler}, Scheduler: ${scheduler}\n`;

        return { content: [{ type: "text", text: output }] };
      }

      default:
        throw new Error(`Unknown ComfyUI tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `ComfyUI error: ${error.message}` }],
      isError: true,
    };
  }
}
