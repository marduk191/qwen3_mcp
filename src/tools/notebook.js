import fs from "fs/promises";

export const notebookTools = [
  {
    name: "notebook_read",
    description:
      "Read a Jupyter notebook (.ipynb) file. Returns all cells with their type, source code, and outputs.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the .ipynb file",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "notebook_edit_cell",
    description:
      "Edit a specific cell in a Jupyter notebook. Can replace content, change cell type, or delete the cell.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the .ipynb file",
        },
        cell_index: {
          type: "number",
          description: "Index of the cell to edit (0-based)",
        },
        new_source: {
          type: "string",
          description: "New source content for the cell",
        },
        cell_type: {
          type: "string",
          enum: ["code", "markdown", "raw"],
          description: "Change the cell type (optional)",
        },
        delete: {
          type: "boolean",
          description: "Delete this cell instead of editing",
        },
      },
      required: ["file_path", "cell_index"],
    },
  },
  {
    name: "notebook_insert_cell",
    description: "Insert a new cell into a Jupyter notebook at a specific position.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the .ipynb file",
        },
        cell_index: {
          type: "number",
          description: "Position to insert the cell (0-based). Use -1 to append at end.",
        },
        source: {
          type: "string",
          description: "Source content for the new cell",
        },
        cell_type: {
          type: "string",
          enum: ["code", "markdown", "raw"],
          description: "Type of cell (default: code)",
        },
      },
      required: ["file_path", "source"],
    },
  },
  {
    name: "notebook_create",
    description: "Create a new Jupyter notebook with optional initial cells.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path for the new .ipynb file",
        },
        kernel: {
          type: "string",
          description: "Kernel name (default: python3)",
        },
        cells: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["code", "markdown", "raw"] },
              source: { type: "string" },
            },
          },
          description: "Initial cells to add",
        },
      },
      required: ["file_path"],
    },
  },
];

function createEmptyNotebook(kernel = "python3") {
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: kernel === "python3" ? "Python 3" : kernel,
        language: kernel === "python3" ? "python" : kernel,
        name: kernel,
      },
      language_info: {
        name: kernel === "python3" ? "python" : kernel,
      },
    },
    cells: [],
  };
}

function createCell(type = "code", source = "") {
  const cell = {
    cell_type: type,
    metadata: {},
    source: source.split("\n"),
  };

  if (type === "code") {
    cell.execution_count = null;
    cell.outputs = [];
  }

  return cell;
}

function formatCell(cell, index) {
  const type = cell.cell_type;
  const source = Array.isArray(cell.source) ? cell.source.join("") : cell.source;
  const outputs = cell.outputs || [];

  let output = `[${index}] ${type.toUpperCase()}\n`;
  output += "─".repeat(40) + "\n";
  output += source + "\n";

  if (outputs.length > 0) {
    output += "\n→ Output:\n";
    for (const out of outputs) {
      if (out.text) {
        output += (Array.isArray(out.text) ? out.text.join("") : out.text);
      } else if (out.data) {
        if (out.data["text/plain"]) {
          const text = out.data["text/plain"];
          output += (Array.isArray(text) ? text.join("") : text);
        } else {
          output += `[${Object.keys(out.data).join(", ")}]`;
        }
      } else if (out.ename) {
        output += `Error: ${out.ename}: ${out.evalue}`;
      }
      output += "\n";
    }
  }

  return output;
}

export async function handleNotebookTool(name, args) {
  switch (name) {
    case "notebook_read": {
      const content = await fs.readFile(args.file_path, "utf-8");
      const notebook = JSON.parse(content);

      let output = `Notebook: ${args.file_path}\n`;
      output += `Kernel: ${notebook.metadata?.kernelspec?.name || "unknown"}\n`;
      output += `Cells: ${notebook.cells?.length || 0}\n`;
      output += "═".repeat(40) + "\n\n";

      if (notebook.cells) {
        notebook.cells.forEach((cell, i) => {
          output += formatCell(cell, i) + "\n";
        });
      }

      return {
        content: [{ type: "text", text: output }],
      };
    }

    case "notebook_edit_cell": {
      const content = await fs.readFile(args.file_path, "utf-8");
      const notebook = JSON.parse(content);

      if (!notebook.cells || args.cell_index >= notebook.cells.length) {
        return {
          content: [{ type: "text", text: `Invalid cell index: ${args.cell_index}` }],
          isError: true,
        };
      }

      if (args.delete) {
        notebook.cells.splice(args.cell_index, 1);
        await fs.writeFile(args.file_path, JSON.stringify(notebook, null, 2));
        return {
          content: [{ type: "text", text: `Deleted cell ${args.cell_index}` }],
        };
      }

      const cell = notebook.cells[args.cell_index];

      if (args.new_source !== undefined) {
        cell.source = args.new_source.split("\n").map((line, i, arr) =>
          i < arr.length - 1 ? line + "\n" : line
        );
        // Clear outputs when source changes
        if (cell.cell_type === "code") {
          cell.outputs = [];
          cell.execution_count = null;
        }
      }

      if (args.cell_type) {
        cell.cell_type = args.cell_type;
        if (args.cell_type === "code" && !cell.outputs) {
          cell.outputs = [];
          cell.execution_count = null;
        } else if (args.cell_type !== "code") {
          delete cell.outputs;
          delete cell.execution_count;
        }
      }

      await fs.writeFile(args.file_path, JSON.stringify(notebook, null, 2));

      return {
        content: [{ type: "text", text: `Updated cell ${args.cell_index}` }],
      };
    }

    case "notebook_insert_cell": {
      const content = await fs.readFile(args.file_path, "utf-8");
      const notebook = JSON.parse(content);

      if (!notebook.cells) {
        notebook.cells = [];
      }

      const newCell = createCell(args.cell_type || "code", args.source);
      const index = args.cell_index === -1 || args.cell_index === undefined
        ? notebook.cells.length
        : args.cell_index;

      notebook.cells.splice(index, 0, newCell);

      await fs.writeFile(args.file_path, JSON.stringify(notebook, null, 2));

      return {
        content: [{ type: "text", text: `Inserted cell at index ${index}` }],
      };
    }

    case "notebook_create": {
      const notebook = createEmptyNotebook(args.kernel);

      if (args.cells) {
        for (const cellDef of args.cells) {
          notebook.cells.push(createCell(cellDef.type || "code", cellDef.source || ""));
        }
      }

      await fs.writeFile(args.file_path, JSON.stringify(notebook, null, 2));

      return {
        content: [{ type: "text", text: `Created notebook: ${args.file_path}` }],
      };
    }

    default:
      throw new Error(`Unknown notebook tool: ${name}`);
  }
}
