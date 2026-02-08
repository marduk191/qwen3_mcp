# MCP Tools Reference

Complete reference for all 80+ tools available in the MCP server.

## File Operations

### read_file
Read file contents with line numbers.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | Yes | Path to file |
| offset | number | No | Line to start from (1-indexed) |
| limit | number | No | Maximum lines to read (default: 500) |

### write_file
Write content to a file (creates if doesn't exist).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | Yes | Path to file |
| content | string | Yes | Content to write |

### edit_file
Find and replace text in a file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | Yes | Path to file |
| old_string | string | Yes | Text to find |
| new_string | string | Yes | Replacement text |
| replace_all | boolean | No | Replace all occurrences |

### list_directory
List contents of a directory.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | No | Directory path (default: working dir) |

### create_directory
Create a directory (recursive).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | Directory path to create |

### delete_file
Delete a file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | Path to file |

### move_file
Move or rename a file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| source | string | Yes | Source path |
| destination | string | Yes | Destination path |

### copy_file
Copy a file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| source | string | Yes | Source path |
| destination | string | Yes | Destination path |

### file_info
Get file metadata (size, dates).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | Path to file |

### get_working_directory
Get current working directory.

### set_working_directory
Set working directory.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | New working directory |

---

## Edit Tools

### insert_at_line
Insert text at a specific line.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | Yes | Path to file |
| line | number | Yes | Line number |
| content | string | Yes | Content to insert |

### replace_lines
Replace a range of lines.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | Yes | Path to file |
| start_line | number | Yes | Start line |
| end_line | number | Yes | End line |
| content | string | Yes | Replacement content |

### append_to_file
Append content to end of file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | Yes | Path to file |
| content | string | Yes | Content to append |

### prepend_to_file
Prepend content to start of file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | Yes | Path to file |
| content | string | Yes | Content to prepend |

---

## Search Tools

### glob_search
Find files matching a glob pattern.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| pattern | string | Yes | Glob pattern (e.g., `**/*.js`) |
| cwd | string | No | Base directory for search |
| ignore | array | No | Patterns to ignore |

### grep_search
Search file contents with regex.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| pattern | string | Yes | Regex pattern |
| path | string | No | Directory to search |
| file_pattern | string | No | File pattern filter (e.g., `*.py`) |
| case_insensitive | boolean | No | Case-insensitive search |
| context | number | No | Lines of context around matches |
| max_results | number | No | Maximum results to return |

### find_definition
Find code definition (function, class, etc.).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Symbol name to find |
| path | string | No | Directory to search |
| file_pattern | string | No | File pattern filter |

---

## Command Execution

### execute_command
Run a shell command.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| command | string | Yes | Command to execute |
| cwd | string | No | Working directory |
| timeout | number | No | Timeout in ms (default: 30000) |

### execute_background
Run command in background.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| command | string | Yes | Command to execute |
| cwd | string | No | Working directory |

### read_output
Read output from background session.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| session_id | string | Yes | Session ID |

### kill_session
Kill a background session.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| session_id | string | Yes | Session ID |

### list_sessions
List all background sessions.

---

## Git Tools

### git_status
Show repository status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | No | Repository path |

### git_diff
Show changes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | No | Repository path |
| staged | boolean | No | Show only staged changes |
| file | string | No | Specific file to diff |

### git_log
Show commit history.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | No | Repository path |
| count | number | No | Number of commits |

### git_add
Stage files for commit.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| files | array | Yes | Files to stage |
| path | string | No | Repository path |

### git_commit
Create a commit.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| message | string | Yes | Commit message |
| path | string | No | Repository path |

### git_branch
List or create branches.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | No | Branch name to create |
| path | string | No | Repository path |

### git_checkout
Switch branches or restore files.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | Yes | Branch/commit to checkout |
| create | boolean | No | Create new branch |
| path | string | No | Repository path |

### git_push
Push to remote.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| remote | string | No | Remote name (default: origin) |
| branch | string | No | Branch name |
| path | string | No | Repository path |

### git_pull
Pull from remote.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| remote | string | No | Remote name (default: origin) |
| branch | string | No | Branch name |
| path | string | No | Repository path |

### git_clone
Clone a repository.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| url | string | Yes | Repository URL |
| destination | string | No | Local path |

---

## Web Tools

### web_search
Search the web (DuckDuckGo, SafeSearch off).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Search query |
| max_results | number | No | Maximum results (default: 10) |

### web_image_search
Search and download images (Bing, SafeSearch off).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Search query |
| max_results | number | No | Maximum results |
| download | boolean | No | Whether to download images |
| download_count | number | No | Images to download (max: 5) |

### web_fetch
Fetch webpage content as text.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| url | string | Yes | URL to fetch |
| max_length | number | No | Max characters (default: 50000) |

### web_fetch_image
Download image from URL.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| url | string | Yes | Image URL |

---

## Memory Tools

### memory_store
Store a note with optional tags.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| key | string | Yes | Note identifier |
| value | string | Yes | Note content |
| tags | array | No | Tags for searching |

### memory_recall
Search stored notes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | No | Search query |
| tag | string | No | Filter by tag |

### memory_list
List all stored notes.

### memory_delete
Delete a note.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| key | string | Yes | Note identifier |

### scratchpad_write
Write to a named scratchpad.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Scratchpad name |
| content | string | Yes | Content to write |
| append | boolean | No | Append instead of overwrite |

### scratchpad_read
Read from a scratchpad.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Scratchpad name |

### scratchpad_list
List all scratchpads.

### context_save
Save conversation context.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Context name |
| context | object | Yes | Context data |

### context_load
Load saved context.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Context name |

---

## Planning Tools

### plan_create
Create an execution plan with steps.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| goal | string | Yes | Plan goal |
| steps | array | Yes | Array of step objects |
| context | string | No | Additional context |

### plan_status
Show current plan progress.

### plan_step_complete
Mark a step as complete.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| step_index | number | Yes | Step index |
| result | string | No | Step result |

### plan_step_skip
Skip a plan step.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| step_index | number | Yes | Step index |
| reason | string | No | Reason for skipping |

### plan_complete
Mark entire plan complete.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| summary | string | No | Completion summary |

### plan_abandon
Abandon current plan.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reason | string | No | Reason for abandoning |

### plan_history
Show past plans.

---

## Task Tools

### task_list
List all tasks.

### task_add
Add a new task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| description | string | Yes | Task description |
| priority | string | No | Priority level |

### task_update
Update a task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| task_id | number | Yes | Task ID |
| status | string | No | New status |
| notes | string | No | Additional notes |

### task_delete
Delete a task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| task_id | number | Yes | Task ID |

### task_clear
Clear tasks.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| completed_only | boolean | No | Only clear completed |

### task_bulk_add
Add multiple tasks at once.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tasks | array | Yes | Array of task descriptions |

---

## Thinking Tools

### think
Record a thinking note.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| thought | string | Yes | Thought content |

### reason
Structured problem reasoning.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| problem | string | Yes | Problem statement |
| considerations | array | Yes | Things to consider |
| conclusion | string | Yes | Conclusion |

### evaluate_options
Evaluate multiple options.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| question | string | Yes | Question to evaluate |
| options | array | Yes | Options with pros/cons |

---

## Interaction Tools

### ask_user
Ask the user a question.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| question | string | Yes | Question to ask |
| options | array | No | Multiple choice options |
| default | string | No | Default answer |

### confirm
Ask for confirmation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| action | string | Yes | Action to confirm |
| consequences | string | No | Consequences description |

### present_choices
Present multiple choices to user.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| prompt | string | Yes | Choice prompt |
| choices | array | Yes | Array of choice objects |

### notify_user
Send a notification.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| message | string | Yes | Notification message |
| type | string | No | Type: info, success, warning, error |

---

## Media Tools

### read_image
Read image as base64.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | Yes | Path to image |

### read_pdf
Extract text from PDF.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | Yes | Path to PDF |

### take_screenshot
Capture a screenshot.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| output_path | string | No | Output file path |

---

## Notebook Tools

### notebook_read
Read Jupyter notebook.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | Yes | Path to .ipynb file |

### notebook_edit_cell
Edit a notebook cell.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | Yes | Path to notebook |
| cell_index | number | Yes | Cell index |
| source | string | Yes | New cell source |
| cell_type | string | No | Cell type (code/markdown) |

### notebook_insert_cell
Insert a new cell.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | Yes | Path to notebook |
| source | string | Yes | Cell source |
| index | number | No | Insert position |
| cell_type | string | No | Cell type |

### notebook_create
Create a new notebook.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | Yes | Path for new notebook |
| cells | array | No | Initial cells |

---

## GitHub Blog Tools

### blog_init
Initialize a Jekyll blog for GitHub Pages.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | Blog directory path |
| title | string | Yes | Blog title |
| github_username | string | Yes | GitHub username |

### blog_post_create
Create a new blog post.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blog_path | string | Yes | Blog directory path |
| title | string | Yes | Post title |
| content | string | Yes | Post content (markdown) |
| category | string | No | Post category |

### blog_page_create
Create a static page (About, Contact, etc.).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blog_path | string | Yes | Blog directory path |
| title | string | Yes | Page title |
| content | string | Yes | Page content |

### blog_category_create
Create a category page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blog_path | string | Yes | Blog directory path |
| name | string | Yes | Category name |

### blog_post_list
List all blog posts and drafts.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blog_path | string | Yes | Blog directory path |

### blog_nav_update
Update navigation menu links.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blog_path | string | Yes | Blog directory path |
| links | array | Yes | Navigation links |

### blog_deploy
Deploy to GitHub Pages.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blog_path | string | Yes | Blog directory path |
| message | string | No | Commit message |

### blog_config
Update blog configuration.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blog_path | string | Yes | Blog directory path |

### blog_theme
Apply theme preset or custom colors.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blog_path | string | Yes | Blog directory path |
| preset | string | No | Theme preset name |
| primary_color | string | No | Custom primary color |
| bg_color | string | No | Custom background color |

### blog_theme_list
List available theme presets and Jekyll themes.

### blog_jekyll_theme
Apply a Jekyll remote theme from GitHub.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blog_path | string | Yes | Blog directory path |
| theme | string | Yes | Theme name |

---

## Skills Tools

### list_skills
List installed skills.

### load_skill
Load a skill's instructions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Skill name |

### install_skill
Install skill from GitHub.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| url | string | Yes | GitHub URL |

---

## Utility Tools

### get_current_time
Get current date and time.

### calculator
Evaluate math expressions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| expression | string | Yes | Math expression |

**Supported functions:** sqrt, sin, cos, tan, log, ln, abs, floor, ceil, round, pi, e

---

## API Testing

```bash
# HTTP Server
curl -X POST http://localhost:3847/tool \
  -H "Content-Type: application/json" \
  -d '{"name":"get_current_time","args":{}}'

# List skills
curl http://localhost:3847/skills

# MCP Server (stdin/stdout)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node src/index.js
```
