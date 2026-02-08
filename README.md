Note: This is still under development and is a preview.
Currently testing on Qwen3 Coder Next REAP 40B A3B from here https://huggingface.co/lovedheart/Qwen3-Coder-Next-REAP-40B-A3B-GGUF/resolve/main/Qwen3-Coder-Next-REAP-40B-A3B-Q4_K_XL.gguf

# Qwen3 MCP Server

A complete MCP server that gives LM Studio's Qwen3 (or any local LLM) full coding agent capabilities including 80+ tools for file operations, command execution, git, web search, memory, planning, and a full skills system.

## Features

- **Two Server Modes**:
  - **HTTP Mode** - Browser-based chat at http://localhost:3847/chat.html
  - **MCP Mode** - Direct integration with LM Studio's MCP interface

- **80+ Tools** including:
  - File operations (read, write, edit, search, glob)
  - Command execution (shell, background processes)
  - Git operations (status, diff, commit, branch, push, pull)
  - Web tools (search, image search, URL fetch)
  - Memory & planning (notes, scratchpads, task lists, plans)
  - Media (read images, PDFs, screenshots)
  - Jupyter notebook support
  - ComfyUI integration (32 workflow tools)
  - GitHub Blog (Jekyll blog creation, themes, deployment)

- **Tool Name Aliases** - Server-side routing handles common model hallucinations (e.g., `edit` -> `edit_file`, `bash` -> `execute_command`)

- **Skills System** - 16 pre-installed skills + install more from [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)

## Quick Start

### HTTP Mode (Browser Chat)

```batch
# Start the server
start-chat.bat

# Open in browser
http://localhost:3847/chat.html
```

### MCP Mode (LM Studio Direct)

Add to your LM Studio MCP config (`~/.lmstudio/mcp-servers.json`):

```json
{
  "mcpServers": {
    "qwen3-mcp": {
      "command": "node",
      "args": ["<YOUR_PATH>/src/index.js"],
      "cwd": "<YOUR_PATH>"
    }
  }
}
```

Replace `<YOUR_PATH>` with the actual path where you installed the server.

Then restart LM Studio.

## Installation

### Prerequisites
- Node.js 18+
- LM Studio with a model loaded (Qwen3 recommended)

### Quick Setup (Windows)

```batch
cd <YOUR_PATH>
setup.bat
```

This will:
1. Install npm dependencies
2. Create required directories
3. Configure LM Studio MCP automatically

### Manual Setup

```bash
# Install dependencies
npm install

# Setup MCP config for LM Studio
npm run setup
```

### npm Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | Configure LM Studio MCP |
| `npm run start` | Start HTTP server (port 3847) |
| `npm run mcp` | Run MCP server directly (stdio) |
| `npm run dev` | Start with auto-reload |

## Project Structure

```
qwen3-mcp/
├── src/
│   ├── index.js           # MCP server (stdio mode)
│   └── tools/             # Tool implementations
│       ├── filesystem.js  # File operations
│       ├── edit.js        # File editing
│       ├── bash.js        # Command execution
│       ├── git.js         # Git operations
│       ├── search.js      # Glob/grep search
│       ├── web.js         # Web search, fetch
│       ├── memory.js      # Notes, scratchpads
│       ├── planning.js    # Plans, task tracking
│       ├── tasks.js       # Todo lists
│       ├── thinking.js    # Reasoning tools
│       ├── context.js     # Conversation context
│       ├── interaction.js # User prompts
│       ├── media.js       # Images, PDFs
│       ├── notebook.js    # Jupyter support
│       ├── comfyui.js     # ComfyUI workflows
│       ├── github-blog.js # Jekyll blog tools
│       └── skills.js      # Skills system
├── frontend/
│   ├── server.js          # HTTP server (port 3847)
│   ├── chat.html          # Browser chat interface
│   └── index.html         # Image viewer interface
├── skills/                # Installed skills (16)
│   ├── chrome-extension/  # Chrome extension development (MV3)
│   ├── code-review/       # Code review methodology
│   ├── comfyui-nodes/     # ComfyUI custom node development
│   ├── comfyui-workflow/  # ComfyUI workflow creation
│   ├── differential-review/ # Security-focused diff review
│   ├── docx/              # Word document creation
│   ├── frontend-design/   # Frontend UI/UX
│   ├── github-blog/       # Jekyll blog for GitHub Pages
│   ├── mcp-builder/       # Build MCP servers
│   ├── modern-python/     # Python tooling (uv, ruff)
│   ├── react-best-practices/ # React patterns (Vercel)
│   ├── shadcn-ui/         # Modern component library
│   ├── static-analysis/   # CodeQL, Semgrep, SARIF
│   ├── testing-handbook-skills/ # Fuzzers, sanitizers
│   ├── web-artifacts-builder/ # HTML/React prototypes
│   └── web-design-guidelines/ # UI/UX fundamentals
├── start-chat.bat         # Start HTTP server
├── stop-chat.bat          # Stop server
├── restart-chat.bat       # Restart server
└── install-skill.bat      # Install skills from GitHub
```

## Available Tools (80+)

### File Operations
| Tool | Description |
|------|-------------|
| `read_file` | Read file contents with line numbers (params: `file_path`, `offset`, `limit`) |
| `write_file` | Write/create files (params: `file_path`, `content`) |
| `edit_file` | Find and replace in files (params: `file_path`, `old_string`, `new_string`) |
| `list_directory` | List directory contents (params: `path`) |
| `create_directory` | Create directories (params: `path`) |
| `delete_file` | Delete files (params: `path`) |
| `move_file` | Move/rename files (params: `source`, `destination`) |
| `copy_file` | Copy files (params: `source`, `destination`) |
| `file_info` | Get file metadata (params: `path`) |
| `get_working_directory` | Get current working directory |
| `set_working_directory` | Set working directory (params: `path`) |

### Edit Tools
| Tool | Description |
|------|-------------|
| `insert_at_line` | Insert at specific line (params: `file_path`, `line`, `content`) |
| `replace_lines` | Replace line range (params: `file_path`, `start_line`, `end_line`, `content`) |
| `append_to_file` | Append to file (params: `file_path`, `content`) |
| `prepend_to_file` | Prepend to file (params: `file_path`, `content`) |

### Search
| Tool | Description |
|------|-------------|
| `glob_search` | Find files by pattern (params: `pattern`, `cwd`) |
| `grep_search` | Search file contents with regex (params: `pattern`, `path`) |
| `find_definition` | Find code definitions (params: `name`, `path`) |

### Command Execution
| Tool | Description |
|------|-------------|
| `execute_command` | Run shell commands (params: `command`, `cwd`, `timeout`) |
| `execute_background` | Run commands in background (params: `command`, `cwd`) |
| `read_output` | Read background process output (params: `session_id`) |
| `kill_session` | Kill background process (params: `session_id`) |
| `list_sessions` | List running processes |

### Git
| Tool | Description |
|------|-------------|
| `git_status` | Repository status |
| `git_diff` | Show changes |
| `git_log` | Commit history |
| `git_add` | Stage files |
| `git_commit` | Create commits |
| `git_branch` | List/create branches |
| `git_checkout` | Switch branches |
| `git_push` | Push to remote |
| `git_pull` | Pull from remote |
| `git_clone` | Clone repositories |

### Web
| Tool | Description |
|------|-------------|
| `web_search` | DuckDuckGo search (params: `query`) |
| `web_image_search` | Bing image search with download (params: `query`) |
| `web_fetch` | Fetch webpage content (params: `url`) |
| `web_fetch_image` | Download image from URL (params: `url`) |

### Memory & Planning
| Tool | Description |
|------|-------------|
| `memory_store` | Store notes with tags |
| `memory_recall` | Search notes |
| `memory_list` | List all notes |
| `scratchpad_write` | Write to scratchpad |
| `scratchpad_read` | Read scratchpad |
| `plan_create` | Create execution plans (params: `goal`, `steps`) |
| `plan_status` | Check plan progress |
| `task_add` | Add todo items |
| `task_list` | List todos |

### GitHub Blog
| Tool | Description |
|------|-------------|
| `blog_init` | Initialize a Jekyll blog for GitHub Pages |
| `blog_post_create` | Create a new blog post |
| `blog_page_create` | Create a static page |
| `blog_category_create` | Create a category page |
| `blog_post_list` | List all blog posts |
| `blog_nav_update` | Update navigation menu |
| `blog_deploy` | Deploy to GitHub Pages |
| `blog_config` | Update blog configuration |
| `blog_theme` | Apply theme preset or custom colors |
| `blog_theme_list` | List available themes |
| `blog_jekyll_theme` | Apply a Jekyll remote theme |

### Skills
| Tool | Description |
|------|-------------|
| `list_skills` | List installed skills |
| `load_skill` | Load skill instructions |
| `install_skill` | Install from GitHub |

### Utilities
| Tool | Description |
|------|-------------|
| `get_current_time` | Current date/time |
| `calculator` | Math expressions |
| `think` | Record thinking notes |
| `ask_user` | Prompt user for input |

## Skills System

Skills are instruction packages that teach the AI specialized tasks. The model auto-detects which skill to load based on your request.

### Installed Skills (16)

**Code Quality & Security:**
- **code-review** - Code review methodology
- **differential-review** - Security-focused diff review
- **static-analysis** - CodeQL, Semgrep, SARIF
- **testing-handbook-skills** - Fuzzers, sanitizers, coverage

**Web Development:**
- **react-best-practices** - React patterns (Vercel)
- **web-design-guidelines** - UI/UX fundamentals
- **shadcn-ui** - Modern component library
- **frontend-design** - Frontend UI/UX
- **web-artifacts-builder** - HTML/React prototypes

**ComfyUI & Creative:**
- **comfyui-nodes** - Custom node development (V1 + V3 API)
- **comfyui-workflow** - Workflow creation (SD1.5/SDXL/SD3.5/Flux)

**Development Tools:**
- **chrome-extension** - Chrome extension development (MV3)
- **mcp-builder** - Build MCP servers
- **modern-python** - Python tooling (uv, ruff, pytest)
- **docx** - Word document creation
- **github-blog** - Jekyll blogs for GitHub Pages

### Install More Skills

```batch
install-skill.bat https://github.com/anthropics/skills/tree/main/skills/pptx
```

### Using Skills

Skills auto-load when they match your request. You can also load them manually:

```
"What skills do I have?"
"Load the comfyui-nodes skill"
"Use the docx skill to create a report"
```

## Configuration

### HTTP Server Port
Edit `frontend/server.js`:
```javascript
const PORT = 3847;
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `IMAGE_DOWNLOAD_DIR` | `~/lmstudio-images` | Image download location |

### LM Studio Setup (HTTP Mode)

1. Load a model (Qwen3 recommended)
2. Enable API server (default: localhost:1234)
3. Open http://localhost:3847/chat.html
4. Enter API token if authentication is enabled

### LM Studio Setup (MCP Mode)

1. Add MCP config (see Quick Start above)
2. Restart LM Studio
3. Tools appear automatically in model context

## API Endpoints (HTTP Mode)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Image viewer UI |
| `/chat.html` | GET | Chat interface |
| `/tool` | POST | Execute tool `{name, args}` |
| `/skills` | GET | List skills (JSON) |
| `/skill?name=X` | GET | Get skill details |

### Testing

```bash
# Test a tool
curl -X POST http://localhost:3847/tool \
  -H "Content-Type: application/json" \
  -d '{"name":"get_current_time","args":{}}'

# List skills
curl http://localhost:3847/skills
```

## Troubleshooting

### Server Issues
```batch
# Check if running
curl http://localhost:3847/skills

# Restart
restart-chat.bat

# Force stop
stop-chat.bat
```

### MCP Connection Issues
1. Check LM Studio console for errors
2. Verify path in mcp-servers.json is correct
3. Run `node src/index.js` manually to test

### read_file Timeouts / WebSocket Errors
The `read_file` tool defaults to 500 lines to prevent LM Studio WebSocket timeouts.
For large files, use pagination:
```
read_file with offset=1, limit=100    # Lines 1-100
read_file with offset=101, limit=100  # Lines 101-200
```

### Tool Name Errors
If the model calls wrong tool names (e.g., `edit` instead of `edit_file`), the server has built-in aliases that route common mistakes. If you still see errors, update the system prompt in LM Studio — see `SYSTEM_PROMPT.md` for the correct prompt.

### Tool Errors
1. Check browser console (F12) for HTTP mode
2. Verify working directory permissions
3. Check LM Studio model supports function calling

## License

MIT
