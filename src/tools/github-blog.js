import fs from "fs/promises";
import path from "path";
import { resolvePath } from "../utils/paths.js";
import { spawn } from "child_process";
import { platform } from "os";

export const githubBlogTools = [
  {
    name: "blog_init",
    description:
      "Initialize a new GitHub Pages blog with navigation menu, categories, and modern styling. Creates a full website structure.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path for the blog",
        },
        title: {
          type: "string",
          description: "Blog/website title",
        },
        description: {
          type: "string",
          description: "Site description",
        },
        author: {
          type: "string",
          description: "Author name",
        },
        github_username: {
          type: "string",
          description: "GitHub username (for repo URL)",
        },
        nav_links: {
          type: "array",
          items: { type: "object" },
          description: "Navigation links [{title, url}]",
        },
      },
      required: ["path", "title"],
    },
  },
  {
    name: "blog_post_create",
    description:
      "Create a new blog post with frontmatter. Automatically adds to category pages.",
    inputSchema: {
      type: "object",
      properties: {
        blog_path: {
          type: "string",
          description: "Path to the blog directory",
        },
        title: {
          type: "string",
          description: "Post title",
        },
        content: {
          type: "string",
          description: "Post content in markdown",
        },
        category: {
          type: "string",
          description: "Post category (creates category page if new)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Post tags",
        },
        draft: {
          type: "boolean",
          description: "Save as draft (default: false)",
        },
        image: {
          type: "string",
          description: "Featured image URL",
        },
      },
      required: ["blog_path", "title", "content"],
    },
  },
  {
    name: "blog_page_create",
    description: "Create a new static page (About, Contact, etc.) with navigation.",
    inputSchema: {
      type: "object",
      properties: {
        blog_path: {
          type: "string",
          description: "Path to the blog directory",
        },
        title: {
          type: "string",
          description: "Page title",
        },
        content: {
          type: "string",
          description: "Page content in markdown",
        },
        permalink: {
          type: "string",
          description: "URL path (e.g., /about/)",
        },
        add_to_nav: {
          type: "boolean",
          description: "Add to navigation menu (default: true)",
        },
      },
      required: ["blog_path", "title", "content"],
    },
  },
  {
    name: "blog_category_create",
    description: "Create a category page that lists all posts in that category.",
    inputSchema: {
      type: "object",
      properties: {
        blog_path: {
          type: "string",
          description: "Path to the blog directory",
        },
        name: {
          type: "string",
          description: "Category name",
        },
        description: {
          type: "string",
          description: "Category description",
        },
      },
      required: ["blog_path", "name"],
    },
  },
  {
    name: "blog_post_list",
    description: "List all blog posts.",
    inputSchema: {
      type: "object",
      properties: {
        blog_path: {
          type: "string",
          description: "Path to the blog directory",
        },
        include_drafts: {
          type: "boolean",
          description: "Include drafts in listing",
        },
      },
      required: ["blog_path"],
    },
  },
  {
    name: "blog_nav_update",
    description: "Update the navigation menu links.",
    inputSchema: {
      type: "object",
      properties: {
        blog_path: {
          type: "string",
          description: "Path to the blog directory",
        },
        links: {
          type: "array",
          description: "Array of {title, url} objects for navigation",
        },
      },
      required: ["blog_path", "links"],
    },
  },
  {
    name: "blog_deploy",
    description: "Deploy the blog to GitHub Pages.",
    inputSchema: {
      type: "object",
      properties: {
        blog_path: {
          type: "string",
          description: "Path to the blog directory",
        },
        commit_message: {
          type: "string",
          description: "Commit message (default: 'Update blog')",
        },
      },
      required: ["blog_path"],
    },
  },
  {
    name: "blog_config",
    description: "Update blog configuration.",
    inputSchema: {
      type: "object",
      properties: {
        blog_path: {
          type: "string",
          description: "Path to the blog directory",
        },
        title: { type: "string" },
        description: { type: "string" },
        author: { type: "string" },
        url: { type: "string" },
      },
      required: ["blog_path"],
    },
  },
  {
    name: "blog_theme",
    description: "Apply a theme to the blog. Use presets (dark, light, ocean, forest, sunset, minimal) or custom colors. Can also use Jekyll remote themes.",
    inputSchema: {
      type: "object",
      properties: {
        blog_path: {
          type: "string",
          description: "Path to the blog directory",
        },
        preset: {
          type: "string",
          enum: ["light", "dark", "ocean", "forest", "sunset", "minimal", "neon", "vintage"],
          description: "Theme preset name",
        },
        primary_color: {
          type: "string",
          description: "Primary/accent color (hex, e.g., #2563eb)",
        },
        bg_color: {
          type: "string",
          description: "Background color (hex)",
        },
        text_color: {
          type: "string",
          description: "Text color (hex)",
        },
        font: {
          type: "string",
          enum: ["system", "serif", "mono", "rounded"],
          description: "Font family preset",
        },
        border_radius: {
          type: "string",
          enum: ["none", "small", "medium", "large", "full"],
          description: "Border radius for cards/buttons",
        },
      },
      required: ["blog_path"],
    },
  },
  {
    name: "blog_theme_list",
    description: "List available theme presets and their colors.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "blog_jekyll_theme",
    description: "Apply a Jekyll remote theme from GitHub. This replaces custom styling with the Jekyll theme's styling.",
    inputSchema: {
      type: "object",
      properties: {
        blog_path: {
          type: "string",
          description: "Path to the blog directory",
        },
        theme: {
          type: "string",
          description: "Jekyll theme name or GitHub repo (e.g., 'minima', 'just-the-docs/just-the-docs', 'pages-themes/cayman')",
        },
      },
      required: ["blog_path", "theme"],
    },
  },
];

// Theme presets
const THEME_PRESETS = {
  light: {
    name: "Light",
    primary: "#2563eb",
    bg: "#ffffff",
    bgSecondary: "#f3f4f6",
    text: "#1f2937",
    textLight: "#6b7280",
    border: "#e5e7eb",
  },
  dark: {
    name: "Dark",
    primary: "#3b82f6",
    bg: "#0f172a",
    bgSecondary: "#1e293b",
    text: "#f1f5f9",
    textLight: "#94a3b8",
    border: "#334155",
  },
  ocean: {
    name: "Ocean",
    primary: "#06b6d4",
    bg: "#0c1929",
    bgSecondary: "#132f4c",
    text: "#e0f2fe",
    textLight: "#7dd3fc",
    border: "#1e4976",
  },
  forest: {
    name: "Forest",
    primary: "#22c55e",
    bg: "#0a1f0a",
    bgSecondary: "#14291a",
    text: "#dcfce7",
    textLight: "#86efac",
    border: "#1e4620",
  },
  sunset: {
    name: "Sunset",
    primary: "#f97316",
    bg: "#1c1412",
    bgSecondary: "#2d211c",
    text: "#fef3c7",
    textLight: "#fdba74",
    border: "#44322a",
  },
  minimal: {
    name: "Minimal",
    primary: "#171717",
    bg: "#fafafa",
    bgSecondary: "#f5f5f5",
    text: "#171717",
    textLight: "#525252",
    border: "#e5e5e5",
  },
  neon: {
    name: "Neon",
    primary: "#a855f7",
    bg: "#09090b",
    bgSecondary: "#18181b",
    text: "#fafafa",
    textLight: "#a1a1aa",
    border: "#27272a",
  },
  vintage: {
    name: "Vintage",
    primary: "#b45309",
    bg: "#fefce8",
    bgSecondary: "#fef9c3",
    text: "#422006",
    textLight: "#854d0e",
    border: "#fde047",
  },
};

const FONT_PRESETS = {
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
  mono: "'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace",
  rounded: "'Nunito', 'Quicksand', 'Varela Round', sans-serif",
};

const RADIUS_PRESETS = {
  none: "0",
  small: "0.25rem",
  medium: "0.5rem",
  large: "1rem",
  full: "9999px",
};

// Popular Jekyll themes
const JEKYLL_THEMES = {
  minima: { repo: "jekyll/minima", description: "Default Jekyll theme, clean and simple" },
  cayman: { repo: "pages-themes/cayman", description: "Green header with white content" },
  slate: { repo: "pages-themes/slate", description: "Dark blue/gray professional look" },
  architect: { repo: "pages-themes/architect", description: "Blueprint-style with header banner" },
  tactile: { repo: "pages-themes/tactile", description: "Textured paper-like design" },
  modernist: { repo: "pages-themes/modernist", description: "Red accents with clean layout" },
  "just-the-docs": { repo: "just-the-docs/just-the-docs", description: "Documentation-focused, search included" },
  "minimal-mistakes": { repo: "mmistakes/minimal-mistakes", description: "Feature-rich, highly customizable" },
  chirpy: { repo: "cotes2020/jekyll-theme-chirpy", description: "Modern blog with TOC and dark mode" },
  beautiful: { repo: "daattali/beautiful-jekyll", description: "Clean, beautiful, easy to use" },
};

// Helper to run shell commands
function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const shell = platform() === "win32" ? "cmd.exe" : "/bin/bash";
    const shellFlag = platform() === "win32" ? "/c" : "-c";

    const proc = spawn(shell, [shellFlag, command], { cwd, env: process.env });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      resolve({ exitCode: code, stdout, stderr });
    });

    proc.on("error", reject);
  });
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getDateString() {
  return new Date().toISOString().split("T")[0];
}

export async function handleGithubBlogTool(name, args) {
  switch (name) {
    case "blog_init": {
      const blogPath = resolvePath(args.path);
      const title = args.title;
      const description = args.description || "";
      const author = args.author || "";
      const githubUsername = args.github_username || "";

      // Create directory structure
      await fs.mkdir(blogPath, { recursive: true });
      await fs.mkdir(path.join(blogPath, "_posts"), { recursive: true });
      await fs.mkdir(path.join(blogPath, "_drafts"), { recursive: true });
      await fs.mkdir(path.join(blogPath, "_layouts"), { recursive: true });
      await fs.mkdir(path.join(blogPath, "_includes"), { recursive: true });
      await fs.mkdir(path.join(blogPath, "assets", "css"), { recursive: true });
      await fs.mkdir(path.join(blogPath, "assets", "images"), { recursive: true });
      await fs.mkdir(path.join(blogPath, "assets", "js"), { recursive: true });
      await fs.mkdir(path.join(blogPath, "_data"), { recursive: true });

      // Create _config.yml - simple, no collections needed
      const config = `# Site settings
title: "${title}"
description: "${description}"
author: "${author}"
${githubUsername ? `url: "https://${githubUsername}.github.io"` : ""}
${githubUsername ? `baseurl: ""` : ""}

# Build settings
markdown: kramdown
permalink: /:title/

# Defaults
defaults:
  - scope:
      path: ""
      type: "posts"
    values:
      layout: "post"
  - scope:
      path: ""
      type: "pages"
    values:
      layout: "page"

plugins:
  - jekyll-feed
  - jekyll-seo-tag

exclude:
  - Gemfile
  - Gemfile.lock
  - README.md
  - node_modules
  - preview.html
  - _templates
`;
      await fs.writeFile(path.join(blogPath, "_config.yml"), config);

      // Create navigation data file
      const defaultNav = args.nav_links || [
        { title: "Home", url: "/" },
        { title: "Blog", url: "/blog/" },
        { title: "Categories", url: "/categories/" },
        { title: "About", url: "/about/" },
      ];
      await fs.writeFile(
        path.join(blogPath, "_data", "navigation.yml"),
        defaultNav.map(n => `- title: "${n.title}"\n  url: "${n.url}"`).join("\n\n")
      );

      // Create base layout
      const baseLayout = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{% if page.title %}{{ page.title }} | {% endif %}{{ site.title }}</title>
  <meta name="description" content="{{ page.description | default: site.description }}">
  <link rel="stylesheet" href="{{ '/assets/css/style.css' | relative_url }}">
  <link rel="alternate" type="application/rss+xml" title="{{ site.title }}" href="{{ '/feed.xml' | relative_url }}">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a href="{{ '/' | relative_url }}" class="site-title">{{ site.title }}</a>
      <nav class="site-nav">
        {% for link in site.data.navigation %}
          <a href="{{ link.url | relative_url }}" {% if page.url == link.url %}class="active"{% endif %}>
            {{ link.title }}
          </a>
        {% endfor %}
      </nav>
      <button class="menu-toggle" aria-label="Menu">☰</button>
    </div>
  </header>

  <main class="site-content">
    <div class="container">
      {{ content }}
    </div>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>&copy; {{ 'now' | date: "%Y" }} {{ site.title }}. {{ site.author }}</p>
    </div>
  </footer>

  <script src="{{ '/assets/js/main.js' | relative_url }}"></script>
</body>
</html>
`;
      await fs.writeFile(path.join(blogPath, "_layouts", "default.html"), baseLayout);

      // Create home layout (GitHub Pages compatible)
      const homeLayout = `---
layout: default
---
<div class="home">
  {{ content }}

  <section class="posts-section">
    <h2>Latest Posts</h2>
    <div class="post-list">
      {% assign counter = 0 %}
      {% for post in site.posts %}
        {% if counter < 5 %}
          <article class="post-card">
            {% if post.image %}
              <img src="{{ post.image }}" alt="{{ post.title }}" class="post-image">
            {% endif %}
            <div class="post-content">
              <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
              <time>{{ post.date | date: "%B %d, %Y" }}</time>
              {% if post.category %}
                <span class="post-category">{{ post.category }}</span>
              {% endif %}
              <p>{{ post.excerpt | strip_html | truncate: 150 }}</p>
            </div>
          </article>
          {% assign counter = counter | plus: 1 %}
        {% endif %}
      {% endfor %}
    </div>
    <a href="{{ '/blog/' | relative_url }}" class="view-all">View All Posts →</a>
  </section>
</div>
`;
      await fs.writeFile(path.join(blogPath, "_layouts", "home.html"), homeLayout);

      // Create post layout
      const postLayout = `---
layout: default
---
<article class="post">
  <header class="post-header">
    <h1>{{ page.title }}</h1>
    <div class="post-meta">
      <time datetime="{{ page.date | date_to_xmlschema }}">{{ page.date | date: "%B %d, %Y" }}</time>
      {% if page.category %}
        <a href="{{ '/category/' | append: page.category | slugify | append: '/' | relative_url }}" class="category-link">
          {{ page.category }}
        </a>
      {% endif %}
      {% if page.tags.size > 0 %}
        <div class="tags">
          {% for tag in page.tags %}
            <span class="tag">{{ tag }}</span>
          {% endfor %}
        </div>
      {% endif %}
    </div>
  </header>

  {% if page.image %}
    <img src="{{ page.image }}" alt="{{ page.title }}" class="post-featured-image">
  {% endif %}

  <div class="post-body">
    {{ content }}
  </div>

  <nav class="post-navigation">
    {% if page.previous.url %}
      <a href="{{ page.previous.url | relative_url }}" class="prev">← {{ page.previous.title }}</a>
    {% endif %}
    {% if page.next.url %}
      <a href="{{ page.next.url | relative_url }}" class="next">{{ page.next.title }} →</a>
    {% endif %}
  </nav>
</article>
`;
      await fs.writeFile(path.join(blogPath, "_layouts", "post.html"), postLayout);

      // Create page layout
      const pageLayout = `---
layout: default
---
<article class="page">
  <header class="page-header">
    <h1>{{ page.title }}</h1>
  </header>
  <div class="page-content">
    {{ content }}
  </div>
</article>
`;
      await fs.writeFile(path.join(blogPath, "_layouts", "page.html"), pageLayout);

      // Create category/tag layout (uses contains for GitHub Pages compatibility)
      const categoryLayout = `---
layout: default
---
<div class="category-page">
  <h1>{{ page.title }}</h1>
  {% if page.description %}
    <p class="category-description">{{ page.description }}</p>
  {% endif %}

  <div class="post-list">
    {% for post in site.posts %}
      {% if post.tags contains page.tag_name %}
        <article class="post-card">
          {% if post.image %}
            <img src="{{ post.image }}" alt="{{ post.title }}" class="post-image">
          {% endif %}
          <div class="post-content">
            <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
            <time>{{ post.date | date: "%B %d, %Y" }}</time>
            <p>{{ post.excerpt | strip_html | truncate: 150 }}</p>
          </div>
        </article>
      {% endif %}
    {% endfor %}
  </div>
</div>
`;
      await fs.writeFile(path.join(blogPath, "_layouts", "category.html"), categoryLayout);

      // Create CSS
      const css = `/* Modern Blog Styles */
:root {
  --primary-color: #2563eb;
  --text-color: #1f2937;
  --text-light: #6b7280;
  --bg-color: #ffffff;
  --bg-secondary: #f3f4f6;
  --border-color: #e5e7eb;
  --max-width: 1200px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  color: var(--text-color);
  background: var(--bg-color);
  line-height: 1.6;
}

.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* Header & Navigation */
.site-header {
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.site-header .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.site-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-color);
  text-decoration: none;
}

.site-nav {
  display: flex;
  gap: 2rem;
}

.site-nav a {
  color: var(--text-light);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.site-nav a:hover,
.site-nav a.active {
  color: var(--primary-color);
}

.menu-toggle {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

/* Mobile Navigation */
@media (max-width: 768px) {
  .menu-toggle {
    display: block;
  }

  .site-nav {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-color);
    flex-direction: column;
    padding: 1rem;
    gap: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .site-nav.open {
    display: flex;
  }
}

/* Main Content */
.site-content {
  padding: 3rem 0;
  min-height: calc(100vh - 200px);
}

/* Post Cards */
.post-list {
  display: grid;
  gap: 2rem;
}

.post-card {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.post-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.post-card .post-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.post-card .post-content {
  padding: 1.5rem;
}

.post-card h3 {
  margin-bottom: 0.5rem;
}

.post-card h3 a {
  color: var(--text-color);
  text-decoration: none;
}

.post-card h3 a:hover {
  color: var(--primary-color);
}

.post-card time {
  color: var(--text-light);
  font-size: 0.875rem;
}

.post-category {
  display: inline-block;
  background: var(--bg-secondary);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  color: var(--primary-color);
  margin-left: 0.5rem;
}

/* Single Post */
.post-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.post-header h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.post-meta {
  color: var(--text-light);
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.category-link {
  background: var(--primary-color);
  color: white !important;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  text-decoration: none;
}

.tags {
  display: flex;
  gap: 0.5rem;
}

.tag {
  background: var(--bg-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.post-featured-image {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: 0.5rem;
  margin-bottom: 2rem;
}

.post-body {
  font-size: 1.125rem;
  line-height: 1.8;
}

.post-body h2, .post-body h3, .post-body h4 {
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.post-body p {
  margin-bottom: 1.5rem;
}

.post-body img {
  max-width: 100%;
  border-radius: 0.5rem;
}

.post-body pre {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1.5rem;
}

.post-body code {
  background: var(--bg-secondary);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.post-body pre code {
  background: none;
  padding: 0;
}

/* Post Navigation */
.post-navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.post-navigation a {
  color: var(--primary-color);
  text-decoration: none;
}

/* Categories Page */
.categories-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.category-card {
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 0.5rem;
  text-decoration: none;
  color: var(--text-color);
  transition: transform 0.2s;
}

.category-card:hover {
  transform: translateY(-2px);
}

.category-card h3 {
  margin-bottom: 0.5rem;
}

.category-card .count {
  color: var(--text-light);
  font-size: 0.875rem;
}

/* View All Link */
.view-all {
  display: inline-block;
  margin-top: 2rem;
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

/* Page Styles */
.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2.5rem;
}

/* Footer */
.site-footer {
  background: var(--bg-secondary);
  padding: 2rem 0;
  text-align: center;
  color: var(--text-light);
}
`;
      await fs.writeFile(path.join(blogPath, "assets", "css", "style.css"), css);

      // Create JS for mobile menu
      const js = `// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.querySelector('.menu-toggle');
  const siteNav = document.querySelector('.site-nav');

  if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', function() {
      siteNav.classList.toggle('open');
    });
  }
});
`;
      await fs.writeFile(path.join(blogPath, "assets", "js", "main.js"), js);

      // Create index.html (home page)
      const indexPage = `---
layout: home
title: Home
---

${description || `Welcome to ${title}!`}
`;
      await fs.writeFile(path.join(blogPath, "index.html"), indexPage);

      // Create blog listing page (GitHub Pages compatible - no paginator)
      const blogPage = `---
layout: default
title: Blog
permalink: /blog/
---

<h1>Blog</h1>

<div class="post-list">
  {% for post in site.posts %}
    <article class="post-card">
      {% if post.image %}
        <img src="{{ post.image }}" alt="{{ post.title }}" class="post-image">
      {% endif %}
      <div class="post-content">
        <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
        <time>{{ post.date | date: "%B %d, %Y" }}</time>
        {% if post.category %}
          <span class="post-category">{{ post.category }}</span>
        {% endif %}
        <p>{{ post.excerpt | strip_html | truncate: 150 }}</p>
      </div>
    </article>
  {% endfor %}
</div>

{% if site.posts.size == 0 %}
  <p>No posts yet.</p>
{% endif %}
`;
      await fs.writeFile(path.join(blogPath, "blog.html"), blogPage);

      // Create categories page - all tags on one page, no extra files needed
      const categoriesPage = `---
layout: default
title: Categories
permalink: /categories/
---

<h1>Categories</h1>

<div class="categories-list">
  {% for tag in site.tags %}
    {% assign tag_name = tag | first %}
    {% assign posts = tag | last %}
    <a href="#{{ tag_name | slugify }}" class="category-card">
      <h3>{{ tag_name }}</h3>
      <span class="count">{{ posts.size }} posts</span>
    </a>
  {% endfor %}
</div>

{% for tag in site.tags %}
  {% assign tag_name = tag | first %}
  {% assign posts = tag | last %}
  <section id="{{ tag_name | slugify }}" class="category-section">
    <h2>{{ tag_name }}</h2>
    <div class="post-list">
      {% for post in posts %}
        <article class="post-card">
          {% if post.image %}
            <img src="{{ post.image }}" alt="{{ post.title }}" class="post-image">
          {% endif %}
          <div class="post-content">
            <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
            <time>{{ post.date | date: "%B %d, %Y" }}</time>
            <p>{{ post.excerpt | strip_html | truncate: 150 }}</p>
          </div>
        </article>
      {% endfor %}
    </div>
  </section>
{% endfor %}
`;
      await fs.writeFile(path.join(blogPath, "categories.html"), categoriesPage);

      // Create about page
      const aboutPage = `---
layout: page
title: About
permalink: /about/
---

${description || `About ${title}.`}
`;
      await fs.writeFile(path.join(blogPath, "about.md"), aboutPage);

      // Create Gemfile
      const gemfile = `source "https://rubygems.org"

gem "github-pages", group: :jekyll_plugins

group :jekyll_plugins do
  gem "jekyll-feed"
  gem "jekyll-seo-tag"
  gem "jekyll-paginate"
end
`;
      await fs.writeFile(path.join(blogPath, "Gemfile"), gemfile);

      // Create .gitignore
      const gitignore = `_site/
.sass-cache/
.jekyll-cache/
.jekyll-metadata
vendor/
.bundle/
`;
      await fs.writeFile(path.join(blogPath, ".gitignore"), gitignore);

      // Create README
      const readme = `# ${title}

${description}

## Structure

- \`_posts/\` - Blog posts
- \`_layouts/\` - Page templates
- \`_data/navigation.yml\` - Navigation menu
- \`assets/\` - CSS, JS, images

## Local Development

\`\`\`bash
bundle install
bundle exec jekyll serve
\`\`\`

Open http://localhost:4000

## Adding Content

### New Post
Use the \`blog_post_create\` tool or create a file in \`_posts/\`:
\`\`\`
_posts/YYYY-MM-DD-title.md
\`\`\`

### New Page
Use the \`blog_page_create\` tool or create a markdown file in root.

### New Category
Use the \`blog_category_create\` tool.

## Deploy

Push to GitHub and enable GitHub Pages in repository settings.
`;
      await fs.writeFile(path.join(blogPath, "README.md"), readme);

      // Initialize git
      await runCommand("git init", blogPath);

      return {
        content: [{
          type: "text",
          text: `Blog website initialized at ${blogPath}

Structure:
├── _config.yml         (Site config)
├── _data/
│   └── navigation.yml  (Menu links)
├── _layouts/           (Page templates)
│   ├── default.html
│   ├── home.html
│   ├── post.html
│   ├── page.html
│   └── category.html
├── _posts/             (Blog posts)
├── _tags/              (Tag/category pages)
├── assets/
│   ├── css/style.css   (Styling)
│   └── js/main.js      (Mobile menu)
├── index.html          (Home page)
├── blog.html           (Posts listing)
├── categories.html     (Categories listing)
└── about.md            (About page)

Navigation Menu:
- Home → /
- Blog → /blog/
- Categories → /categories/
- About → /about/

Next steps:
1. Create posts: blog_post_create
2. Add categories: blog_category_create
3. Add pages: blog_page_create
4. Deploy: blog_deploy`
        }],
      };
    }

    case "blog_post_create": {
      const blogPath = resolvePath(args.blog_path);
      const title = args.title;
      const content = args.content;
      const category = args.category || "";
      const tags = args.tags || [];
      const isDraft = args.draft || false;
      const image = args.image || "";

      const date = getDateString();
      const slug = slugify(title);
      const filename = isDraft ? `${slug}.md` : `${date}-${slug}.md`;
      const folder = isDraft ? "_drafts" : "_posts";
      const filePath = path.join(blogPath, folder, filename);

      const frontmatter = `---
layout: post
title: "${title}"
date: ${date}
${category ? `category: ${category}` : ""}
${tags.length ? `tags: [${tags.join(", ")}]` : ""}
${image ? `image: ${image}` : ""}
---

${content}
`;

      await fs.mkdir(path.join(blogPath, folder), { recursive: true });
      await fs.writeFile(filePath, frontmatter);

      // Tags auto-update on categories page - no need to create category files
      // If user wants a dedicated category page with description, use blog_category_create

      return {
        content: [{
          type: "text",
          text: `Post created: ${filePath}

Title: ${title}
Date: ${date}
Status: ${isDraft ? "DRAFT" : "Published"}
${tags.length ? `Tags: ${tags.join(", ")}` : ""}
${image ? `Image: ${image}` : ""}

URL: /${slug}/

Note: Tags will auto-appear on the Categories page after deploy.`
        }],
      };
    }

    case "blog_page_create": {
      const blogPath = resolvePath(args.blog_path);
      const title = args.title;
      const content = args.content;
      const permalink = args.permalink || `/${slugify(title)}/`;
      const addToNav = args.add_to_nav !== false;

      const filename = `${slugify(title)}.md`;
      const filePath = path.join(blogPath, filename);

      const pageContent = `---
layout: page
title: "${title}"
permalink: ${permalink}
---

${content}
`;

      await fs.writeFile(filePath, pageContent);

      // Add to navigation if requested
      if (addToNav) {
        const navPath = path.join(blogPath, "_data", "navigation.yml");
        try {
          let navContent = await fs.readFile(navPath, "utf-8");
          if (!navContent.includes(permalink)) {
            navContent += `\n- title: "${title}"\n  url: "${permalink}"`;
            await fs.writeFile(navPath, navContent);
          }
        } catch {
          // Navigation file doesn't exist
        }
      }

      return {
        content: [{
          type: "text",
          text: `Page created: ${filePath}

Title: ${title}
URL: ${permalink}
${addToNav ? "Added to navigation menu" : ""}`
        }],
      };
    }

    case "blog_category_create": {
      // Categories are automatic - just use tags in posts
      const categoryName = args.name;

      return {
        content: [{
          type: "text",
          text: `Categories are automatic!

Just add 'tags: [${categoryName}]' to your post frontmatter.
The categories page will automatically show all tags and their posts.

No separate category files needed.`
        }],
      };
    }

    case "blog_post_list": {
      const blogPath = resolvePath(args.blog_path);
      const includeDrafts = args.include_drafts || false;

      let posts = [];

      try {
        const postsDir = path.join(blogPath, "_posts");
        const files = await fs.readdir(postsDir);
        for (const file of files) {
          if (file.endsWith(".md") || file.endsWith(".markdown")) {
            const content = await fs.readFile(path.join(postsDir, file), "utf-8");
            const titleMatch = content.match(/title:\s*["']?([^"'\n]+)["']?/);
            const categoryMatch = content.match(/category:\s*["']?([^"'\n]+)["']?/);
            posts.push({
              file,
              title: titleMatch ? titleMatch[1] : file,
              category: categoryMatch ? categoryMatch[1] : "",
              status: "published",
            });
          }
        }
      } catch (e) {}

      if (includeDrafts) {
        try {
          const draftsDir = path.join(blogPath, "_drafts");
          const files = await fs.readdir(draftsDir);
          for (const file of files) {
            if (file.endsWith(".md") || file.endsWith(".markdown")) {
              const content = await fs.readFile(path.join(draftsDir, file), "utf-8");
              const titleMatch = content.match(/title:\s*["']?([^"'\n]+)["']?/);
              posts.push({
                file,
                title: titleMatch ? titleMatch[1] : file,
                category: "",
                status: "draft",
              });
            }
          }
        } catch (e) {}
      }

      if (posts.length === 0) {
        return { content: [{ type: "text", text: "No posts found." }] };
      }

      let output = `Blog Posts (${posts.length}):\n${"─".repeat(50)}\n`;
      for (const post of posts) {
        const icon = post.status === "draft" ? "📝" : "✅";
        output += `${icon} ${post.title}`;
        if (post.category) output += ` [${post.category}]`;
        output += `\n   ${post.file}\n`;
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "blog_nav_update": {
      const blogPath = resolvePath(args.blog_path);
      const links = args.links || [];

      const navContent = links
        .map(l => `- title: "${l.title}"\n  url: "${l.url}"`)
        .join("\n\n");

      await fs.mkdir(path.join(blogPath, "_data"), { recursive: true });
      await fs.writeFile(path.join(blogPath, "_data", "navigation.yml"), navContent);

      return {
        content: [{
          type: "text",
          text: `Navigation updated with ${links.length} links:\n${links.map(l => `- ${l.title} → ${l.url}`).join("\n")}`
        }],
      };
    }

    case "blog_deploy": {
      const blogPath = resolvePath(args.blog_path);
      const message = args.commit_message || "Update blog";

      await runCommand("git add -A", blogPath);
      const commitResult = await runCommand(`git commit -m "${message}"`, blogPath);
      const pushResult = await runCommand("git push origin main", blogPath);

      let pushOutput = pushResult.stdout + pushResult.stderr;
      if (pushResult.exitCode !== 0) {
        const pushMaster = await runCommand("git push origin master", blogPath);
        pushOutput = pushMaster.stdout + pushMaster.stderr;
      }

      return {
        content: [{
          type: "text",
          text: `Deploy completed!

Commit: ${message}
${commitResult.stdout || commitResult.stderr || ""}
${pushOutput || ""}

Your site should be live shortly.`
        }],
      };
    }

    case "blog_config": {
      const blogPath = resolvePath(args.blog_path);
      const configPath = path.join(blogPath, "_config.yml");

      let config;
      try {
        config = await fs.readFile(configPath, "utf-8");
      } catch {
        return {
          content: [{ type: "text", text: "Error: _config.yml not found." }],
          isError: true,
        };
      }

      if (args.title) config = config.replace(/^title:.*/m, `title: "${args.title}"`);
      if (args.description) config = config.replace(/^description:.*/m, `description: "${args.description}"`);
      if (args.author) config = config.replace(/^author:.*/m, `author: "${args.author}"`);
      if (args.url) config = config.replace(/^url:.*/m, `url: "${args.url}"`);

      await fs.writeFile(configPath, config);

      return { content: [{ type: "text", text: `Config updated.` }] };
    }

    case "blog_theme": {
      const blogPath = resolvePath(args.blog_path);
      const cssPath = path.join(blogPath, "assets", "css", "style.css");

      // Get colors from preset or custom values
      let theme = THEME_PRESETS.light; // default
      if (args.preset && THEME_PRESETS[args.preset]) {
        theme = THEME_PRESETS[args.preset];
      }

      // Override with custom colors if provided
      const primary = args.primary_color || theme.primary;
      const bg = args.bg_color || theme.bg;
      const bgSecondary = theme.bgSecondary;
      const text = args.text_color || theme.text;
      const textLight = theme.textLight;
      const border = theme.border;

      // Get font
      const font = FONT_PRESETS[args.font] || FONT_PRESETS.system;

      // Get border radius
      const radius = RADIUS_PRESETS[args.border_radius] || RADIUS_PRESETS.medium;

      // Generate CSS
      const css = `/* Theme: ${args.preset || 'custom'} */
:root {
  --primary-color: ${primary};
  --text-color: ${text};
  --text-light: ${textLight};
  --bg-color: ${bg};
  --bg-secondary: ${bgSecondary};
  --border-color: ${border};
  --max-width: 1200px;
  --font-family: ${font};
  --border-radius: ${radius};
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family);
  color: var(--text-color);
  background: var(--bg-color);
  line-height: 1.6;
}

.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* Header & Navigation */
.site-header {
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.site-header .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.site-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-color);
  text-decoration: none;
}

.site-nav {
  display: flex;
  gap: 2rem;
}

.site-nav a {
  color: var(--text-light);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.site-nav a:hover,
.site-nav a.active {
  color: var(--primary-color);
}

.menu-toggle {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-color);
}

@media (max-width: 768px) {
  .menu-toggle { display: block; }
  .site-nav {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-color);
    flex-direction: column;
    padding: 1rem;
    gap: 1rem;
    border-bottom: 1px solid var(--border-color);
  }
  .site-nav.open { display: flex; }
}

.site-content {
  padding: 3rem 0;
  min-height: calc(100vh - 200px);
}

/* Post Cards */
.post-list {
  display: grid;
  gap: 2rem;
}

.post-card {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
}

.post-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.post-card .post-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.post-card .post-content {
  padding: 1.5rem;
}

.post-card h3 { margin-bottom: 0.5rem; }
.post-card h3 a {
  color: var(--text-color);
  text-decoration: none;
}
.post-card h3 a:hover { color: var(--primary-color); }
.post-card time {
  color: var(--text-light);
  font-size: 0.875rem;
}

.post-category {
  display: inline-block;
  background: var(--bg-secondary);
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius);
  font-size: 0.75rem;
  color: var(--primary-color);
  margin-left: 0.5rem;
}

/* Single Post */
.post-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.post-header h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.post-meta {
  color: var(--text-light);
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.category-link {
  background: var(--primary-color);
  color: white !important;
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius);
  font-size: 0.875rem;
  text-decoration: none;
}

.tags { display: flex; gap: 0.5rem; }
.tag {
  background: var(--bg-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: calc(var(--border-radius) / 2);
  font-size: 0.75rem;
}

.post-featured-image {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: var(--border-radius);
  margin-bottom: 2rem;
}

.post-body {
  font-size: 1.125rem;
  line-height: 1.8;
}

.post-body h2, .post-body h3, .post-body h4 {
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.post-body p { margin-bottom: 1.5rem; }
.post-body img {
  max-width: 100%;
  border-radius: var(--border-radius);
}

.post-body pre {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: var(--border-radius);
  overflow-x: auto;
  margin-bottom: 1.5rem;
}

.post-body code {
  background: var(--bg-secondary);
  padding: 0.125rem 0.375rem;
  border-radius: calc(var(--border-radius) / 2);
  font-size: 0.875em;
}

.post-body pre code {
  background: none;
  padding: 0;
}

.post-navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.post-navigation a {
  color: var(--primary-color);
  text-decoration: none;
}

/* Categories */
.categories-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.category-card {
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: var(--border-radius);
  text-decoration: none;
  color: var(--text-color);
  transition: transform 0.2s;
}

.category-card:hover { transform: translateY(-2px); }
.category-card h3 { margin-bottom: 0.5rem; }
.category-card .count {
  color: var(--text-light);
  font-size: 0.875rem;
}

.view-all {
  display: inline-block;
  margin-top: 2rem;
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.page-header { margin-bottom: 2rem; }
.page-header h1 { font-size: 2.5rem; }

.site-footer {
  background: var(--bg-secondary);
  padding: 2rem 0;
  text-align: center;
  color: var(--text-light);
}

/* Links */
a { color: var(--primary-color); }
`;

      await fs.mkdir(path.join(blogPath, "assets", "css"), { recursive: true });
      await fs.writeFile(cssPath, css);

      return {
        content: [{
          type: "text",
          text: `Theme applied: ${args.preset || 'custom'}

Colors:
- Primary: ${primary}
- Background: ${bg}
- Text: ${text}
- Font: ${args.font || 'system'}
- Border radius: ${args.border_radius || 'medium'}

CSS written to: ${cssPath}`
        }],
      };
    }

    case "blog_theme_list": {
      let output = "Available Theme Presets:\n" + "═".repeat(50) + "\n\n";

      for (const [key, theme] of Object.entries(THEME_PRESETS)) {
        output += `${theme.name} (${key})\n`;
        output += `  Primary: ${theme.primary}\n`;
        output += `  Background: ${theme.bg}\n`;
        output += `  Text: ${theme.text}\n\n`;
      }

      output += "═".repeat(50) + "\n";
      output += "Font options: system, serif, mono, rounded\n";
      output += "Border radius: none, small, medium, large, full\n\n";

      output += "Popular Jekyll Themes:\n" + "─".repeat(50) + "\n";
      for (const [key, theme] of Object.entries(JEKYLL_THEMES)) {
        output += `${key}: ${theme.description}\n`;
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "blog_jekyll_theme": {
      const blogPath = resolvePath(args.blog_path);
      const themeName = args.theme;
      const configPath = path.join(blogPath, "_config.yml");

      // Determine if it's a simple theme name or a repo path
      let themeRepo = themeName;
      if (JEKYLL_THEMES[themeName]) {
        themeRepo = JEKYLL_THEMES[themeName].repo;
      }

      // Read existing config
      let config;
      try {
        config = await fs.readFile(configPath, "utf-8");
      } catch {
        return {
          content: [{ type: "text", text: "Error: _config.yml not found. Run blog_init first." }],
          isError: true,
        };
      }

      // Remove existing theme lines
      config = config.replace(/^theme:.*\n?/gm, "");
      config = config.replace(/^remote_theme:.*\n?/gm, "");

      // Add remote_theme
      const themeLines = `remote_theme: ${themeRepo}\n`;

      // Insert after the first line or at the top
      const lines = config.split("\n");
      lines.splice(1, 0, themeLines);
      config = lines.join("\n");

      await fs.writeFile(configPath, config);

      // Update Gemfile to include jekyll-remote-theme
      const gemfilePath = path.join(blogPath, "Gemfile");
      try {
        let gemfile = await fs.readFile(gemfilePath, "utf-8");
        if (!gemfile.includes("jekyll-remote-theme")) {
          gemfile = gemfile.replace(
            /group :jekyll_plugins do/,
            `group :jekyll_plugins do\n  gem "jekyll-remote-theme"`
          );
          await fs.writeFile(gemfilePath, gemfile);
        }
      } catch {
        // Gemfile might not exist
      }

      const themeInfo = JEKYLL_THEMES[themeName];
      return {
        content: [{
          type: "text",
          text: `Jekyll theme applied: ${themeRepo}
${themeInfo ? `\nDescription: ${themeInfo.description}` : ""}

Updated:
- _config.yml (added remote_theme)
- Gemfile (added jekyll-remote-theme plugin)

Note: This replaces the custom CSS styling. The theme's layouts may differ from the default ones.

To revert to custom styling:
1. Remove 'remote_theme' from _config.yml
2. Run blog_theme to regenerate CSS`
        }],
      };
    }

    default:
      throw new Error(`Unknown github-blog tool: ${name}`);
  }
}
