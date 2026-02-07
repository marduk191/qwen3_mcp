# Agent Skills Reference

This document lists popular skills compatible with this MCP server from [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills).

## Installation

```batch
# Command line
install-skill.bat <github-url>

# In chat
"Install skill from <github-url>"
```

## Official Anthropic Skills

### Document Creation
```
install-skill.bat https://github.com/anthropics/skills/tree/main/skills/docx
install-skill.bat https://github.com/anthropics/skills/tree/main/skills/pptx
install-skill.bat https://github.com/anthropics/skills/tree/main/skills/xlsx
install-skill.bat https://github.com/anthropics/skills/tree/main/skills/pdf
```

### Creative & Design
```
install-skill.bat https://github.com/anthropics/skills/tree/main/skills/algorithmic-art
install-skill.bat https://github.com/anthropics/skills/tree/main/skills/canvas-design
install-skill.bat https://github.com/anthropics/skills/tree/main/skills/frontend-design
install-skill.bat https://github.com/anthropics/skills/tree/main/skills/slack-gif-creator
```

### Development
```
install-skill.bat https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder
install-skill.bat https://github.com/anthropics/skills/tree/main/skills/mcp-builder
install-skill.bat https://github.com/anthropics/skills/tree/main/skills/webapp-testing
```

## Trail of Bits Security Skills

```
install-skill.bat https://github.com/trailofbits/skills/tree/main/plugins/static-analysis
install-skill.bat https://github.com/trailofbits/skills/tree/main/plugins/modern-python
install-skill.bat https://github.com/trailofbits/skills/tree/main/plugins/code-review
install-skill.bat https://github.com/trailofbits/skills/tree/main/plugins/building-secure-contracts
install-skill.bat https://github.com/trailofbits/skills/tree/main/plugins/property-based-testing
install-skill.bat https://github.com/trailofbits/skills/tree/main/plugins/semgrep-rule-creator
install-skill.bat https://github.com/trailofbits/skills/tree/main/plugins/variant-analysis
```

## Vercel Skills

```
install-skill.bat https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
install-skill.bat https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines
install-skill.bat https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns
install-skill.bat https://github.com/vercel-labs/next-skills/tree/main/skills/next-best-practices
install-skill.bat https://github.com/vercel-labs/next-skills/tree/main/skills/next-upgrade
```

## Cloudflare Skills

```
install-skill.bat https://github.com/cloudflare/skills/tree/main/agents-sdk
install-skill.bat https://github.com/cloudflare/skills/tree/main/durable-objects
install-skill.bat https://github.com/cloudflare/skills/tree/main/wrangler
install-skill.bat https://github.com/cloudflare/skills/tree/main/web-perf
```

## Hugging Face ML Skills

```
install-skill.bat https://github.com/huggingface/skills/tree/main/skills/hugging-face-cli
install-skill.bat https://github.com/huggingface/skills/tree/main/skills/hugging-face-datasets
install-skill.bat https://github.com/huggingface/skills/tree/main/skills/hugging-face-model-trainer
install-skill.bat https://github.com/huggingface/skills/tree/main/skills/hugging-face-evaluation
```

## Stripe Payment Skills

```
install-skill.bat https://github.com/stripe/ai/tree/main/skills/stripe-best-practices
install-skill.bat https://github.com/stripe/ai/tree/main/skills/upgrade-stripe
```

## HashiCorp Terraform Skills

```
install-skill.bat https://github.com/hashicorp/agent-skills/tree/main/terraform/code-generation
install-skill.bat https://github.com/hashicorp/agent-skills/tree/main/terraform/module-generation
install-skill.bat https://github.com/hashicorp/agent-skills/tree/main/terraform/provider-development
```

## Supabase Skills

```
install-skill.bat https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices
```

## Expo React Native Skills

```
install-skill.bat https://github.com/expo/skills/tree/main/plugins/expo-app-design
install-skill.bat https://github.com/expo/skills/tree/main/plugins/expo-deployment
install-skill.bat https://github.com/expo/skills/tree/main/plugins/upgrading-expo
```

## WordPress Skills

```
install-skill.bat https://github.com/WordPress/agent-skills/tree/trunk/skills/wp-block-development
install-skill.bat https://github.com/WordPress/agent-skills/tree/trunk/skills/wp-plugin-development
install-skill.bat https://github.com/WordPress/agent-skills/tree/trunk/skills/wp-rest-api
install-skill.bat https://github.com/WordPress/agent-skills/tree/trunk/skills/wp-performance
```

## Creating Your Own Skills

Skills are just folders with instruction files. Create a folder in `skills/` with:

```
skills/my-skill/
├── SKILL.md      # Main instructions (required)
├── scripts/      # Helper scripts (optional)
└── examples/     # Example files (optional)
```

### SKILL.md Template

```markdown
# My Skill Name

Brief description of what this skill does.

## Instructions

When asked to [do something], follow these steps:

### Step 1: [Action]
- Detail 1
- Detail 2

### Step 2: [Action]
- Detail 1
- Detail 2

## Examples

User: "Help me [do something]"
Assistant: [How to respond using this skill]

## Dependencies

- `npm install some-package` (if needed)
- Requires: some-tool (if needed)
```

## Skill Dependencies

Some skills require external tools:

| Skill | Dependencies |
|-------|--------------|
| docx, pptx, xlsx | `npm install -g docx`, pandoc, LibreOffice |
| pdf | pdftoppm, LibreOffice |
| webapp-testing | Playwright |
| modern-python | uv, ruff, pytest |

Install common dependencies:
```batch
# Node packages
npm install -g docx

# Python tools
pip install uv ruff pytest

# System tools (via chocolatey or manual install)
choco install pandoc libreoffice
```
