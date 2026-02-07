# GitHub Blog Skill

Create and manage Jekyll-powered blogs for GitHub Pages with navigation menus, categories, theming, and easy deployment.

**Note:** All templates are GitHub Pages compatible - no Ruby installation required locally. Just write posts and deploy!

## Overview

This skill enables you to:
- Initialize complete blog websites with modern styling
- Create posts, pages, and category pages
- Apply theme presets or custom colors
- Use Jekyll remote themes from GitHub
- Deploy to GitHub Pages

## Available Tools

### `blog_init`
Initialize a new GitHub Pages blog with full website structure.

**Parameters:**
- `path` (required): Directory path for the blog
- `title` (required): Blog/website title
- `description`: Site description
- `author`: Author name
- `github_username`: GitHub username (for URL generation)
- `nav_links`: Array of `{title, url}` for navigation menu

**Example:**
```
blog_init
  path: "K:/my-blog"
  title: "My Tech Blog"
  description: "Thoughts on programming and technology"
  author: "John Doe"
  github_username: "johndoe"
```

**Creates:**
```
my-blog/
├── _config.yml           # Site configuration
├── _data/navigation.yml  # Menu links
├── _layouts/             # Page templates
│   ├── default.html
│   ├── home.html
│   ├── post.html
│   ├── page.html
│   └── category.html
├── _posts/               # Blog posts
├── _drafts/              # Unpublished drafts
├── _categories/          # Category pages
├── assets/
│   ├── css/style.css     # Styling
│   ├── js/main.js        # Mobile menu
│   └── images/           # Image storage
├── index.html            # Home page
├── blog.html             # Posts listing with pagination
├── categories.html       # Categories index
├── about.md              # About page
├── Gemfile               # Ruby dependencies
└── README.md             # Documentation
```

---

### `blog_post_create`
Create a new blog post with frontmatter.

**Parameters:**
- `blog_path` (required): Path to the blog directory
- `title` (required): Post title
- `content` (required): Post content in Markdown
- `category`: Post category (creates category page if new)
- `tags`: Array of tags
- `draft`: Boolean, save as draft (default: false)
- `image`: Featured image URL

**Example:**
```
blog_post_create
  blog_path: "K:/my-blog"
  title: "Getting Started with Python"
  content: "Python is a versatile programming language..."
  category: "tutorials"
  tags: ["python", "programming", "beginners"]
  image: "/assets/images/python-intro.jpg"
```

**Output file:** `_posts/2024-01-15-getting-started-with-python.md`

---

### `blog_page_create`
Create a static page (About, Contact, Services, etc.).

**Parameters:**
- `blog_path` (required): Path to the blog directory
- `title` (required): Page title
- `content` (required): Page content in Markdown
- `permalink`: URL path (default: `/title-slug/`)
- `add_to_nav`: Add to navigation menu (default: true)

**Example:**
```
blog_page_create
  blog_path: "K:/my-blog"
  title: "Contact"
  content: "Email me at contact@example.com..."
  permalink: "/contact/"
```

---

### `blog_category_create`
Create a category page that lists all posts in that category.

**Parameters:**
- `blog_path` (required): Path to the blog directory
- `name` (required): Category name
- `description`: Category description

**Example:**
```
blog_category_create
  blog_path: "K:/my-blog"
  name: "Tutorials"
  description: "Step-by-step guides and how-tos"
```

---

### `blog_post_list`
List all blog posts and optionally drafts.

**Parameters:**
- `blog_path` (required): Path to the blog directory
- `include_drafts`: Include draft posts (default: false)

---

### `blog_nav_update`
Update the navigation menu links.

**Parameters:**
- `blog_path` (required): Path to the blog directory
- `links` (required): Array of `{title, url}` objects

**Example:**
```
blog_nav_update
  blog_path: "K:/my-blog"
  links: [
    {title: "Home", url: "/"},
    {title: "Blog", url: "/blog/"},
    {title: "Projects", url: "/projects/"},
    {title: "About", url: "/about/"}
  ]
```

---

### `blog_config`
Update blog configuration settings.

**Parameters:**
- `blog_path` (required): Path to the blog directory
- `title`: New site title
- `description`: New site description
- `author`: New author name
- `url`: New site URL

---

### `blog_theme`
Apply a theme preset or custom colors.

**Parameters:**
- `blog_path` (required): Path to the blog directory
- `preset`: Theme preset name (see below)
- `primary_color`: Custom primary/accent color (hex)
- `bg_color`: Custom background color (hex)
- `text_color`: Custom text color (hex)
- `font`: Font family preset
- `border_radius`: Border radius preset

**Theme Presets:**

| Preset | Style |
|--------|-------|
| `light` | Clean white with blue accents (#2563eb) |
| `dark` | Dark slate with bright blue (#3b82f6) |
| `ocean` | Deep blue with cyan accents (#06b6d4) |
| `forest` | Dark green nature theme (#22c55e) |
| `sunset` | Warm orange on dark (#f97316) |
| `minimal` | Black and white, ultra-clean |
| `neon` | Purple on pure black (#a855f7) |
| `vintage` | Sepia/cream warm tones (#b45309) |

**Font Options:**
- `system` - System UI fonts (default)
- `serif` - Georgia, Times
- `mono` - Consolas, monospace
- `rounded` - Nunito, Quicksand

**Border Radius Options:**
- `none` - Sharp corners
- `small` - 0.25rem
- `medium` - 0.5rem (default)
- `large` - 1rem
- `full` - Fully rounded (9999px)

**Examples:**
```
# Apply preset
blog_theme
  blog_path: "K:/my-blog"
  preset: "dark"

# Custom colors
blog_theme
  blog_path: "K:/my-blog"
  primary_color: "#ff6600"
  bg_color: "#0a0a0a"
  text_color: "#e0e0e0"
  font: "mono"
  border_radius: "large"
```

---

### `blog_theme_list`
List all available theme presets, fonts, and Jekyll themes.

No parameters required.

---

### `blog_jekyll_theme`
Apply a Jekyll remote theme from GitHub.

**Parameters:**
- `blog_path` (required): Path to the blog directory
- `theme` (required): Theme name or GitHub repo

**Built-in Themes:**

| Theme | Description |
|-------|-------------|
| `minima` | Default Jekyll, clean and simple |
| `cayman` | Green header, white content |
| `slate` | Dark blue/gray professional |
| `architect` | Blueprint-style design |
| `tactile` | Textured paper look |
| `modernist` | Red accents, clean layout |
| `just-the-docs` | Documentation site with search |
| `minimal-mistakes` | Feature-rich, customizable |
| `chirpy` | Modern blog with TOC, dark mode |
| `beautiful` | Clean and beautiful |

**Examples:**
```
# Use built-in theme
blog_jekyll_theme
  blog_path: "K:/my-blog"
  theme: "minimal-mistakes"

# Use any GitHub theme
blog_jekyll_theme
  blog_path: "K:/my-blog"
  theme: "poole/hyde"
```

**Note:** Jekyll themes replace custom CSS styling. To revert, remove `remote_theme` from `_config.yml` and run `blog_theme`.

---

### `blog_deploy`
Deploy the blog to GitHub Pages.

**Parameters:**
- `blog_path` (required): Path to the blog directory
- `commit_message`: Git commit message (default: "Update blog")

**Example:**
```
blog_deploy
  blog_path: "K:/my-blog"
  commit_message: "Add new tutorial post"
```

**Actions:**
1. `git add -A`
2. `git commit -m "message"`
3. `git push origin main` (or master)

---

## Workflow Examples

### Create a New Blog from Scratch

```
1. blog_init path="K:/tech-blog" title="Tech Insights" github_username="myuser"
2. blog_theme blog_path="K:/tech-blog" preset="dark"
3. blog_post_create blog_path="K:/tech-blog" title="Welcome" content="Hello world!"
4. blog_deploy blog_path="K:/tech-blog"
```

### Add Multiple Posts in a Category

```
1. blog_category_create blog_path="K:/tech-blog" name="JavaScript" description="JS tutorials"
2. blog_post_create blog_path="K:/tech-blog" title="Intro to ES6" content="..." category="JavaScript"
3. blog_post_create blog_path="K:/tech-blog" title="Async/Await Guide" content="..." category="JavaScript"
4. blog_deploy blog_path="K:/tech-blog" commit_message="Add JavaScript tutorials"
```

### Switch to a Professional Theme

```
1. blog_jekyll_theme blog_path="K:/tech-blog" theme="minimal-mistakes"
2. blog_deploy blog_path="K:/tech-blog"
```

### Create a Documentation Site

```
1. blog_init path="K:/docs" title="Project Docs"
2. blog_jekyll_theme blog_path="K:/docs" theme="just-the-docs"
3. blog_page_create blog_path="K:/docs" title="Getting Started" content="..."
4. blog_page_create blog_path="K:/docs" title="API Reference" content="..."
```

---

## GitHub Pages Setup

After deploying, enable GitHub Pages in your repository:

1. Go to repository Settings
2. Navigate to Pages section
3. Source: Deploy from branch
4. Branch: main (or master), / (root)
5. Save

Your site will be available at:
- `https://username.github.io/repo-name/`
- Or `https://username.github.io/` if repo is named `username.github.io`

---

## Tips

1. **Images**: Store in `assets/images/` and reference as `/assets/images/filename.jpg`

2. **Drafts**: Use `draft: true` to create unpublished posts in `_drafts/`

3. **Categories**: Posts automatically appear on category pages when you set `category: "Name"`

4. **Navigation**: Use `blog_nav_update` to customize menu order and items

5. **Local Preview**: Run `bundle exec jekyll serve` to preview at `http://localhost:4000`

6. **Custom Domain**: Add `CNAME` file with your domain name
