#!/usr/bin/env node
/**
 * Build script: converts README.md -> docs/index.html
 * Uses the same theme as marduk191.github.io
 *
 * Usage: node scripts/build-docs.js
 *
 * Dependencies: marked (install with: npm install marked)
 */

const fs = require('fs');
const path = require('path');

// Try to use 'marked' if available, otherwise use a simple built-in converter
let markdownToHtml;

try {
  const { marked } = require('marked');

  // Configure marked for GitHub-flavored markdown
  marked.setOptions({
    gfm: true,
    breaks: false,
    pedantic: false,
  });

  markdownToHtml = (md) => marked(md);
} catch (e) {
  // Fallback: simple markdown converter for basic elements
  markdownToHtml = simpleMarkdown;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function simpleMarkdown(md) {
  let html = md;

  // Extract code blocks first
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push('<pre><code class="language-' + lang + '">' + escapeHtml(code.trim()) + '</code></pre>');
    return '%%CODEBLOCK_' + idx + '%%';
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, function(match, header, sep, body) {
    var headers = header.split('|').filter(function(c) { return c.trim(); }).map(function(c) { return '<th>' + c.trim() + '</th>'; }).join('');
    var rows = body.trim().split('\n').map(function(row) {
      var cells = row.split('|').filter(function(c) { return c.trim(); }).map(function(c) { return '<td>' + c.trim() + '</td>'; }).join('');
      return '<tr>' + cells + '</tr>';
    }).join('\n');
    return '<table><thead><tr>' + headers + '</tr></thead><tbody>' + rows + '</tbody></table>';
  });

  // Unordered lists
  html = html.replace(/^(\s*)- (.+)$/gm, '$1<li>$2</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Paragraphs
  html = html.replace(/^(?!<[a-z/]|%%CODEBLOCK)(.+)$/gm, function(match, content) {
    if (content.trim() === '') return '';
    return '<p>' + content + '</p>';
  });

  // Restore code blocks
  codeBlocks.forEach(function(block, idx) {
    html = html.replace('%%CODEBLOCK_' + idx + '%%', block);
  });

  return html;
}

// Paths
var ROOT = path.resolve(__dirname, '..');
var README_PATH = path.join(ROOT, 'README.md');
var DOCS_DIR = path.join(ROOT, 'docs');
var OUTPUT_PATH = path.join(DOCS_DIR, 'index.html');

// Read README
var readme = fs.readFileSync(README_PATH, 'utf-8');

// Strip any leading note/warning before the first heading
var cleanedReadme = readme.replace(/^[\s\S]*?(?=^# )/m, '');

// Convert to HTML
var contentHtml = markdownToHtml(cleanedReadme);

// Get current date for "last updated"
var now = new Date();
var lastUpdated = now.toLocaleDateString('en-US', {
  year: 'numeric', month: 'long', day: 'numeric'
});
var year = now.getFullYear();

// Build the full HTML page
var html = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '  <meta charset="UTF-8">',
  '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '  <title>Qwen3 MCP Server</title>',
  '  <meta name="description" content="A complete MCP server giving local LLMs full coding agent capabilities with 80+ tools">',
  '  <meta property="og:title" content="Qwen3 MCP Server">',
  '  <meta property="og:description" content="80+ tools for file operations, command execution, git, web search, memory, planning, and a full skills system">',
  '  <meta property="og:type" content="website">',
  '  <link rel="stylesheet" href="assets/css/style.css">',
  '</head>',
  '<body>',
  '  <header class="site-header">',
  '    <div class="container">',
  '      <a href="./" class="site-title">Qwen3 MCP Server</a>',
  '      <nav class="site-nav">',
  '        <a href="./" class="active">Docs</a>',
  '        <a href="https://github.com/marduk191/qwen3_mcp">GitHub</a>',
  '        <a href="https://marduk191.github.io/">Blog</a>',
  '      </nav>',
  '      <button class="menu-toggle" aria-label="Menu">&#9776;</button>',
  '    </div>',
  '  </header>',
  '',
  '  <main class="site-content">',
  '    <div class="container">',
  '      <!-- Hero Banner -->',
  '      <div class="hero-banner">',
  '        <img src="assets/images/banner.jpg" alt="Banner">',
  '        <div class="hero-content">',
  '          <h1>Qwen3 MCP Server</h1>',
  '          <p>80+ tools for local LLMs &mdash; file ops, git, web search, memory, planning, skills &amp; more</p>',
  '        </div>',
  '      </div>',
  '',
  '      <div class="readme-content">',
  contentHtml,
  '      </div>',
  '    </div>',
  '  </main>',
  '',
  '  <footer class="site-footer">',
  '    <div class="container">',
  '      <p>&copy; ' + year + ' <a href="https://github.com/marduk191">marduk191</a> &mdash; Last updated: ' + lastUpdated + '</p>',
  '      <p style="margin-top: 0.5rem; font-size: 0.75rem;">Auto-generated from <a href="https://github.com/marduk191/qwen3_mcp/blob/main/README.md">README.md</a></p>',
  '    </div>',
  '  </footer>',
  '',
  '  <script src="assets/js/main.js"></script>',
  '</body>',
  '</html>'
].join('\n');

// Ensure docs dir exists
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// Write output
fs.writeFileSync(OUTPUT_PATH, html, 'utf-8');
console.log('Built docs/index.html (' + (html.length / 1024).toFixed(1) + ' KB) - Last updated: ' + lastUpdated);
