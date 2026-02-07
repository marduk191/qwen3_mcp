import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";

export const mediaTools = [
  {
    name: "read_image",
    description:
      "Read an image file and return it as base64 for vision models. Supports PNG, JPG, GIF, WebP. Also returns image metadata.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the image file",
        },
        max_size: {
          type: "number",
          description: "Max dimension to resize to (optional, helps with large images)",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "read_pdf",
    description:
      "Extract text content from a PDF file. Returns the text from all pages.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the PDF file",
        },
        pages: {
          type: "string",
          description: "Page range to extract (e.g., '1-5', '1,3,5', or 'all'). Default: all",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "take_screenshot",
    description:
      "Take a screenshot of the current screen or a specific window. Requires external tool (nircmd on Windows, screencapture on Mac).",
    inputSchema: {
      type: "object",
      properties: {
        output_path: {
          type: "string",
          description: "Path to save the screenshot",
        },
        region: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            width: { type: "number" },
            height: { type: "number" },
          },
          description: "Screen region to capture (optional)",
        },
      },
      required: ["output_path"],
    },
  },
];

function getImageMimeType(ext) {
  const types = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
  };
  return types[ext.toLowerCase()] || "application/octet-stream";
}

async function extractPdfText(filePath) {
  // Try multiple methods to extract PDF text

  // Method 1: Try pdftotext (poppler-utils)
  try {
    const text = await runCommand("pdftotext", ["-layout", filePath, "-"]);
    if (text.trim()) return text;
  } catch (e) {
    // pdftotext not available
  }

  // Method 2: Try pdf2txt.py (pdfminer)
  try {
    const text = await runCommand("pdf2txt.py", [filePath]);
    if (text.trim()) return text;
  } catch (e) {
    // pdf2txt not available
  }

  // Method 3: Try python with PyPDF2 or pdfplumber
  try {
    const pythonScript = `
import sys
try:
    import pdfplumber
    with pdfplumber.open(sys.argv[1]) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                print(text)
except ImportError:
    try:
        import PyPDF2
        with open(sys.argv[1], 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                print(page.extract_text())
    except ImportError:
        print("ERROR: No PDF library available. Install pdfplumber or PyPDF2.")
        sys.exit(1)
`;
    const text = await runCommand("python", ["-c", pythonScript, filePath]);
    if (text.trim() && !text.includes("ERROR:")) return text;
  } catch (e) {
    // Python method failed
  }

  // Method 4: Basic binary extraction (last resort)
  try {
    const buffer = await fs.readFile(filePath);
    const text = buffer.toString("utf-8");
    // Extract readable strings
    const strings = text.match(/[\x20-\x7E]{20,}/g) || [];
    if (strings.length > 0) {
      return "Note: Basic text extraction (install pdftotext for better results)\n\n" +
        strings.join("\n");
    }
  } catch (e) {
    // Binary extraction failed
  }

  return "Could not extract text from PDF. Install one of: pdftotext (poppler-utils), pdfplumber (pip), or PyPDF2 (pip)";
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { shell: true });
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
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Command failed with code ${code}`));
      }
    });

    proc.on("error", reject);
  });
}

export async function handleMediaTool(name, args) {
  switch (name) {
    case "read_image": {
      const filePath = args.file_path;
      const ext = path.extname(filePath);
      const mimeType = getImageMimeType(ext);

      const buffer = await fs.readFile(filePath);
      const base64 = buffer.toString("base64");
      const stat = await fs.stat(filePath);

      // Return both metadata and base64 data
      // Vision models can use the base64 directly
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              file: filePath,
              mime_type: mimeType,
              size_bytes: stat.size,
              base64_length: base64.length,
              data_url: `data:${mimeType};base64,${base64}`,
            }, null, 2),
          },
          {
            type: "image",
            data: base64,
            mimeType: mimeType,
          },
        ],
      };
    }

    case "read_pdf": {
      const text = await extractPdfText(args.file_path);

      return {
        content: [
          {
            type: "text",
            text: `PDF: ${args.file_path}\n${"═".repeat(40)}\n\n${text}`,
          },
        ],
      };
    }

    case "take_screenshot": {
      const outputPath = args.output_path;
      const platform = process.platform;

      try {
        if (platform === "win32") {
          // Windows: use nircmd or PowerShell
          try {
            await runCommand("nircmd", ["savescreenshot", outputPath]);
          } catch {
            // Fallback to PowerShell
            const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bitmap.Save('${outputPath.replace(/'/g, "''")}')
`;
            await runCommand("powershell", ["-Command", psScript]);
          }
        } else if (platform === "darwin") {
          // macOS: use screencapture
          await runCommand("screencapture", ["-x", outputPath]);
        } else {
          // Linux: try multiple tools
          try {
            await runCommand("gnome-screenshot", ["-f", outputPath]);
          } catch {
            try {
              await runCommand("scrot", [outputPath]);
            } catch {
              await runCommand("import", ["-window", "root", outputPath]);
            }
          }
        }

        return {
          content: [{ type: "text", text: `Screenshot saved to: ${outputPath}` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Screenshot failed: ${error.message}` }],
          isError: true,
        };
      }
    }

    default:
      throw new Error(`Unknown media tool: ${name}`);
  }
}
