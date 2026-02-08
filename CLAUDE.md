# Qwen3 MCP Server

A Model Context Protocol (MCP) server that gives LM Studio's Qwen3 (or any local LLM) full coding agent capabilities including 80+ tools for file operations, command execution, git, web search, memory, planning, and a full skills system.

## Two Server Modes

### HTTP Mode (Browser Chat)
```batch
start-chat.bat
# Open http://localhost:3847/chat.html
```

### MCP Mode (LM Studio Direct)
Add to `~/.lmstudio/mcp-servers.json`:
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

Replace `<YOUR_PATH>` with the actual installation path.

## Project Structure

```
qwen3-mcp/
├── src/
│   ├── index.js           # MCP server (stdio, uses @modelcontextprotocol/sdk)
│   └── tools/             # Tool implementations
│       ├── filesystem.js  # read_file, write_file, list_directory, etc.
│       ├── edit.js        # edit_file, insert_at_line, replace_lines
│       ├── bash.js        # execute_command, execute_background
│       ├── git.js         # git_status, git_commit, git_push, etc.
│       ├── search.js      # glob_search, grep_search, find_definition
│       ├── web.js         # web_search, web_image_search, web_fetch
│       ├── memory.js      # memory_store, memory_recall, scratchpad_*
│       ├── planning.js    # plan_create, plan_status, plan_step_complete
│       ├── tasks.js       # task_add, task_list, task_update
│       ├── thinking.js    # think, reason, evaluate_options
│       ├── context.js     # conversation_log, conversation_context
│       ├── interaction.js # ask_user, confirm, present_choices
│       ├── media.js       # read_image, read_pdf, take_screenshot
│       ├── notebook.js    # notebook_read, notebook_edit_cell
│       ├── comfyui.js     # 32 ComfyUI workflow tools
│       ├── github-blog.js # Jekyll blog tools
│       └── skills.js      # list_skills, load_skill, install_skill
├── frontend/
│   ├── server.js          # HTTP server (port 3847) with all tools
│   ├── chat.html          # Browser chat interface
│   └── index.html         # Image viewer interface
├── skills/                # Installed agent skills (16)
│   ├── chrome-extension/  # Chrome extension development (MV3)
│   ├── code-review/       # Code review methodology
│   ├── comfyui-nodes/     # ComfyUI custom node development (V1 + V3 API)
│   ├── comfyui-workflow/  # ComfyUI workflow creation (SD1.5/SDXL/SD3.5/Flux)
│   ├── differential-review/ # Security-focused diff review
│   ├── docx/              # Word document creation (Anthropic)
│   ├── frontend-design/   # Frontend UI/UX
│   ├── github-blog/       # Jekyll blog for GitHub Pages
│   ├── mcp-builder/       # Build MCP servers
│   ├── modern-python/     # Python tooling (Trail of Bits)
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
| `edit_file` | Find and replace text in files (params: `file_path`, `old_string`, `new_string`) |
| `list_directory` | List directory contents |
| `create_directory` | Create directories (recursive) |
| `delete_file` | Delete files |
| `move_file` | Move/rename files |
| `copy_file` | Copy files |
| `file_info` | Get file metadata (size, dates) |
| `get_working_directory` | Get current working directory |
| `set_working_directory` | Set working directory |

### Edit Tools
| Tool | Description |
|------|-------------|
| `edit_file` | Find/replace text |
| `insert_at_line` | Insert at specific line |
| `replace_lines` | Replace line range |
| `append_to_file` | Append to file |
| `prepend_to_file` | Prepend to file |

### Search Tools
| Tool | Description |
|------|-------------|
| `glob_search` | Find files by pattern (params: `pattern`, `cwd`) |
| `grep_search` | Search file contents with regex (params: `pattern`, `path`) |
| `find_definition` | Find code definitions (params: `name`, `path`) |

### Command Execution
| Tool | Description |
|------|-------------|
| `execute_command` | Run shell commands (params: `command`, `cwd`, `timeout`) |
| `execute_background` | Run in background |
| `read_output` | Read background output |
| `kill_session` | Kill background process |
| `list_sessions` | List running processes |

### Git Tools
| Tool | Description |
|------|-------------|
| `git_status` | Repository status |
| `git_diff` | Show changes (staged/unstaged) |
| `git_log` | Commit history |
| `git_add` | Stage files |
| `git_commit` | Create commits |
| `git_branch` | List/create branches |
| `git_checkout` | Switch branches |
| `git_push` | Push to remote |
| `git_pull` | Pull from remote |
| `git_clone` | Clone repositories |

### Web Tools
| Tool | Description |
|------|-------------|
| `web_search` | DuckDuckGo search (params: `query`) |
| `web_image_search` | Bing image search with download |
| `web_fetch` | Fetch webpage content (params: `url`) |
| `web_fetch_image` | Download image from URL |

### Memory Tools
| Tool | Description |
|------|-------------|
| `memory_store` | Store notes with tags |
| `memory_recall` | Search notes by query/tag |
| `memory_list` | List all stored notes |
| `memory_delete` | Delete a note |
| `scratchpad_write` | Write to named scratchpad |
| `scratchpad_read` | Read scratchpad |
| `scratchpad_list` | List scratchpads |
| `context_save` | Save conversation context |
| `context_load` | Load saved context |

### Planning Tools
| Tool | Description |
|------|-------------|
| `plan_create` | Create execution plan with steps (params: `goal`, `steps`) |
| `plan_status` | Show current plan progress |
| `plan_step_complete` | Mark step complete |
| `plan_step_skip` | Skip a step |
| `plan_complete` | Mark plan complete |
| `plan_abandon` | Abandon plan |
| `plan_history` | Show past plans |

### Task Tools
| Tool | Description |
|------|-------------|
| `task_list` | List all tasks |
| `task_add` | Add new task |
| `task_update` | Update task status |
| `task_delete` | Delete task |
| `task_clear` | Clear completed/all tasks |
| `task_bulk_add` | Add multiple tasks |

### Thinking Tools
| Tool | Description |
|------|-------------|
| `think` | Record thinking note |
| `reason` | Structured problem reasoning |
| `evaluate_options` | Evaluate multiple options |

### Interaction Tools
| Tool | Description |
|------|-------------|
| `ask_user` | Ask user a question |
| `confirm` | Ask for confirmation |
| `present_choices` | Present multiple choices |
| `notify_user` | Send notification |

### Media Tools
| Tool | Description |
|------|-------------|
| `read_image` | Read image as base64 |
| `read_pdf` | Extract text from PDF |
| `take_screenshot` | Capture screenshot |

### Notebook Tools
| Tool | Description |
|------|-------------|
| `notebook_read` | Read Jupyter notebook |
| `notebook_edit_cell` | Edit notebook cell |
| `notebook_insert_cell` | Insert new cell |
| `notebook_create` | Create new notebook |

### Skills Tools
| Tool | Description |
|------|-------------|
| `list_skills` | List installed skills |
| `load_skill` | Load skill instructions |
| `install_skill` | Install from GitHub URL |

### GitHub Blog Tools
| Tool | Description |
|------|-------------|
| `blog_init` | Initialize a GitHub Pages blog with navigation, categories, and modern styling |
| `blog_post_create` | Create a new blog post with frontmatter and optional category |
| `blog_page_create` | Create a static page (About, Contact, etc.) |
| `blog_category_create` | Create a category page that lists posts |
| `blog_post_list` | List all blog posts and drafts |
| `blog_nav_update` | Update navigation menu links |
| `blog_deploy` | Deploy to GitHub Pages (git add, commit, push) |
| `blog_config` | Update blog configuration (title, description, etc.) |
| `blog_theme` | Apply theme preset (dark, light, ocean, forest, sunset, minimal, neon, vintage) or custom colors |
| `blog_theme_list` | List available theme presets and Jekyll themes |
| `blog_jekyll_theme` | Apply a Jekyll remote theme from GitHub |

### Utility Tools
| Tool | Description |
|------|-------------|
| `get_current_time` | Current date/time |
| `calculator` | Math expressions (sqrt, sin, etc.) |

## API Endpoints (HTTP Mode)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Image viewer UI |
| `/chat.html` | GET | Chat interface |
| `/tool` | POST | Execute a tool `{name, args}` |
| `/skills` | GET | List all skills (JSON) |
| `/skill?name=X` | GET | Get skill details |
| `/search?q=X` | GET | Search images |
| `/local?folder=X` | GET | List local images |
| `/image?path=X` | GET | Serve local image |

## GitHub Blog System

Create and manage a full Jekyll-powered blog for GitHub Pages with navigation menu, categories, and theming.

### Quick Start

```
"Create a blog at K:/my-blog called 'My Tech Blog'"
"Add a post about JavaScript async/await"
"Apply the dark theme"
"Deploy to GitHub"
```

### Theme Presets

| Preset | Description |
|--------|-------------|
| `light` | Clean white background with blue accents |
| `dark` | Dark blue/slate theme with bright accents |
| `ocean` | Cyan/teal color scheme on dark background |
| `forest` | Green nature-inspired dark theme |
| `sunset` | Warm orange tones on dark background |
| `minimal` | Black and white, ultra-clean |
| `neon` | Purple accents on pure black |
| `vintage` | Warm sepia/cream tones |

### Jekyll Remote Themes

Use popular Jekyll themes from GitHub:

| Theme | Description |
|-------|-------------|
| `minima` | Default Jekyll theme, clean and simple |
| `cayman` | Green header with white content |
| `just-the-docs` | Documentation-focused with search |
| `minimal-mistakes` | Feature-rich, highly customizable |
| `chirpy` | Modern blog with TOC and dark mode |
| `beautiful` | Clean, beautiful, easy to use |

### Usage Examples

```
# Initialize a new blog
blog_init path="K:/my-blog" title="My Blog" github_username="myuser"

# Create a post
blog_post_create blog_path="K:/my-blog" title="Hello World" content="..." category="tutorials"

# Apply a theme
blog_theme blog_path="K:/my-blog" preset="dark"

# Or use custom colors
blog_theme blog_path="K:/my-blog" primary_color="#ff6600" bg_color="#1a1a1a"

# Use a Jekyll theme
blog_jekyll_theme blog_path="K:/my-blog" theme="minimal-mistakes"
```

## Skills System

Skills are instruction packages from [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) that teach the AI specialized tasks. Skills auto-load when the model detects a matching request.

### Installed Skills (16)

**Code Quality & Security:**
| Skill | Description |
|-------|-------------|
| `code-review` | Thorough code review methodology |
| `differential-review` | Security-focused diff review with git history |
| `static-analysis` | CodeQL, Semgrep, SARIF vulnerability detection |
| `testing-handbook-skills` | Fuzzers, sanitizers, coverage (Trail of Bits) |

**Web Development:**
| Skill | Description |
|-------|-------------|
| `react-best-practices` | React patterns (Vercel) |
| `web-design-guidelines` | UI/UX design fundamentals |
| `shadcn-ui` | Modern component library |
| `frontend-design` | Frontend UI/UX development |
| `web-artifacts-builder` | HTML/React prototypes with Tailwind |

**ComfyUI & Creative:**
| Skill | Description |
|-------|-------------|
| `comfyui-nodes` | ComfyUI custom node development (V1 + V3 API) |
| `comfyui-workflow` | ComfyUI workflow creation (SD1.5/SDXL/SD3.5/Flux) |

**Development Tools:**
| Skill | Description |
|-------|-------------|
| `chrome-extension` | Chrome extension development (Manifest V3) |
| `mcp-builder` | Build MCP servers |
| `modern-python` | Python tooling (uv, ruff, pytest) |
| `docx` | Word document creation |
| `github-blog` | Create Jekyll blogs for GitHub Pages |

### Installing Skills

```batch
# From command line
install-skill.bat https://github.com/anthropics/skills/tree/main/skills/docx
install-skill.bat https://github.com/trailofbits/skills/tree/main/plugins/static-analysis

# In chat
"Install skill from https://github.com/anthropics/skills/tree/main/skills/pptx"
```

### Using Skills

Skills auto-load when they match your request. You can also load them manually:

```
"What skills do I have?"
"Load the code-review skill"
"Load the comfyui-nodes skill"
"Use the docx skill to create a report"
```

### Popular Skills

**Anthropic Official:**
- `https://github.com/anthropics/skills/tree/main/skills/docx` - Word documents
- `https://github.com/anthropics/skills/tree/main/skills/pptx` - PowerPoint
- `https://github.com/anthropics/skills/tree/main/skills/xlsx` - Excel
- `https://github.com/anthropics/skills/tree/main/skills/pdf` - PDF handling

**Trail of Bits Security:**
- `https://github.com/trailofbits/skills/tree/main/plugins/static-analysis`
- `https://github.com/trailofbits/skills/tree/main/plugins/modern-python`
- `https://github.com/trailofbits/skills/tree/main/plugins/code-review`

**Vercel:**
- `https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices`

## LM Studio Configuration

### HTTP Mode
1. Load a model in LM Studio (Qwen3 recommended)
2. Enable the API server (default: `http://localhost:1234`)
3. Run `start-chat.bat`
4. Open http://localhost:3847/chat.html
5. Enter API token if authentication is enabled

### MCP Mode
1. Add to `~/.lmstudio/mcp-servers.json`:
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
2. Restart LM Studio
3. Tools appear automatically in model context

## Configuration

### Server Port
Edit `frontend/server.js`:
```javascript
const PORT = 3847;
```

### Image Download Directory
Default: `C:\Users\<username>\lmstudio-images`

Override with environment variable:
```batch
set IMAGE_DOWNLOAD_DIR=D:\my-images
node frontend/server.js
```

### Skills Directory
Located in `skills/` subfolder of the installation directory.

Both servers (HTTP and MCP) share this directory.

## Troubleshooting

### Server won't start
```batch
# Check if port is in use
netstat -ano | findstr :3847

# Kill existing process
powershell -Command "Get-NetTCPConnection -LocalPort 3847 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
```

### Tools not working in chat
1. Check browser console (F12) for errors
2. Verify server is running: `curl http://localhost:3847/skills`
3. Check LM Studio is running with a model loaded
4. Verify API token if authentication is enabled

### MCP not connecting
1. Check LM Studio console for errors
2. Verify path in mcp-servers.json
3. Test manually: `node src/index.js` (should print to stderr)

### read_file Timeouts / WebSocket Errors
The `read_file` tool defaults to 500 lines to prevent LM Studio WebSocket timeouts.
For large files, use pagination with `offset` and `limit` parameters:
```json
{"name": "read_file", "arguments": {"file_path": "path/to/file", "offset": 1, "limit": 100}}
{"name": "read_file", "arguments": {"file_path": "path/to/file", "offset": 101, "limit": 100}}
```

### Tool Name Errors
The server has built-in tool name aliases that route common model mistakes (e.g., `edit` -> `edit_file`, `bash` -> `execute_command`). If errors persist, check the system prompt in `SYSTEM_PROMPT.md`.

### Skill installation fails
1. Check the GitHub URL is correct and public
2. Try manual installation:
   ```batch
   cd skills
   git clone https://github.com/user/repo skill-name
   ```

### Search returning no results
- DuckDuckGo Lite may be rate-limited; wait and retry
- Check internet connection
- Try a different search query

## Development

### Adding Tools to MCP Server

1. Create or edit file in `src/tools/`
2. Export `toolsArray` and `handleTool` function
3. Import and register in `src/index.js`

Example tool file:
```javascript
export const myTools = [
  {
    name: "my_tool",
    description: "Description for the AI",
    inputSchema: {
      type: "object",
      properties: {
        param1: { type: "string", description: "Parameter description" }
      },
      required: ["param1"]
    }
  }
];

export async function handleMyTool(name, args) {
  switch (name) {
    case "my_tool":
      return { content: [{ type: "text", text: `Result: ${args.param1}` }] };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

### Adding Tools to HTTP Server

1. Add tool handler in `frontend/server.js` (`executeTool` function)
2. Add tool definition in `frontend/chat.html` (tools array)

### Testing Tools

```bash
# Test HTTP server tool
curl -X POST http://localhost:3847/tool \
  -H "Content-Type: application/json" \
  -d '{"name":"get_current_time","args":{}}'

# Test MCP server (sends to stdin, reads from stdout)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node src/index.js
```

## Files Reference

### src/index.js
MCP server entry point using `@modelcontextprotocol/sdk`:
- Imports all tool modules
- Registers tools with MCP server
- Routes tool calls to handlers (with alias support)
- Uses stdio transport

### src/tools/*.js
Individual tool implementations:
- Each exports `*Tools` array (tool definitions)
- Each exports `handle*Tool` function (execution)
- Uses MCP response format: `{ content: [{ type: "text", text: "..." }] }`

### frontend/server.js
HTTP server with all tools merged:
- Serves chat.html and index.html
- `/tool` endpoint for tool execution
- `/skills` endpoint for skills API
- Uses simple `{ result: "..." }` response format

### frontend/chat.html
Browser chat interface:
- Tool definitions for LM Studio API
- Message rendering with image support
- Settings persistence (localStorage)
- Tool calling loop with retry logic
