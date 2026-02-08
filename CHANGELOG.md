# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-02-08

### Added
- **Chrome extension skill** - Comprehensive MV3 Chrome extension development guide (1200+ lines)
- **GitHub blog skill** - Jekyll blog creation, themes, deployment for GitHub Pages
- **Auto-load skill detection** - Model automatically loads relevant skills based on request keywords
- **Tool name aliases** - Server-side routing for common model hallucinations (edit->edit_file, bash->execute_command, etc.)
- **Parameter normalization** - Server-side remapping of alternative parameter names

### Changed
- **ComfyUI nodes skill** upgraded to v2.0.0 - Added V3 API section, error handling, device management, publishing guide
- **ComfyUI workflow skill** completely rewritten - From 70 lines to 640+ lines covering SD1.5/SDXL/SD3.5/Flux, all samplers/schedulers, LoRA, ControlNet, IPAdapter, custom sampling
- **System prompt** rewritten with correct tool names and parameter names
- **Documentation** updated across all files (README, TOOLS, SKILLS, CLAUDE.md, SYSTEM_PROMPT)

### Fixed
- System prompt had wrong parameter names (old_text/new_text instead of old_string/new_string)
- System prompt listed non-existent tool aliases as actual tools
- TOOLS.md had incorrect parameter names (start_line/max_lines, working_dir, base_path, symbol, topic)
- Skills count updated from 14/15 to 16 across all docs

## [1.0.0] - 2025-01-01

### Added
- MCP server (stdio) for LM Studio integration via `@modelcontextprotocol/sdk`
- HTTP server with browser chat interface on port 3847
- **File operations**: read, write, edit, copy, move, delete, list, info
- **Edit tools**: find/replace, insert at line, replace lines, append, prepend
- **Search tools**: glob patterns, grep with regex, find definitions
- **Command execution**: shell commands, background processes, session management
- **Git tools**: status, diff, log, add, commit, branch, checkout, push, pull, clone
- **Web tools**: DuckDuckGo search, Bing image search, web fetch, Wikipedia
- **Memory system**: persistent notes with tags, scratchpads, context save/load
- **Planning tools**: create plans with steps, track progress, history
- **Task management**: add, list, update, delete, bulk operations
- **Thinking tools**: structured reasoning, option evaluation
- **Interaction tools**: ask user, confirm, present choices, notifications
- **Media tools**: image reading, PDF text extraction, screenshots
- **Notebook tools**: Jupyter notebook read, edit, insert, create
- **ComfyUI integration**: 32 tools for workflow management and image generation
- **Skills system**: install, load, and manage agent skill packages from GitHub
- **GitHub Blog tools**: Jekyll blog creation, posts, pages, categories, themes, deployment
- **Utility tools**: current time, calculator
- 15 pre-installed skills (code review, React, web design, ComfyUI, Python, and more)
- Batch scripts for Windows: start, stop, restart, setup, install skills
- Comprehensive documentation: README, TOOLS.md, SYSTEM_PROMPT.md, SKILLS.md
