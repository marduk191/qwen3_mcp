@echo off
:: Skill Installer Wrapper
:: Usage: install-skill.bat <url> [name]

if "%~1"=="" (
    echo.
    echo === MCP Skill Installer ===
    echo.
    echo Usage: install-skill.bat ^<url^> [skill-name]
    echo.
    echo Examples:
    echo   Full repository:
    echo     install-skill.bat anthropics/skills
    echo     install-skill.bat https://github.com/user/skill-repo
    echo.
    echo   Subdirectory (specific skill from a repo):
    echo     install-skill.bat https://github.com/anthropics/skills/tree/main/skills/docx
    echo     install-skill.bat https://github.com/trailofbits/skills/tree/main/plugins/code-review
    echo.
    echo   With custom name:
    echo     install-skill.bat https://github.com/user/repo -Name my-skill
    echo.
    echo Popular skills from awesome-agent-skills:
    echo     https://github.com/VoltAgent/awesome-agent-skills
    echo   Anthropic official:
    echo     https://github.com/anthropics/skills/tree/main/skills/docx
    echo     https://github.com/anthropics/skills/tree/main/skills/pptx
    echo     https://github.com/anthropics/skills/tree/main/skills/xlsx
    echo     https://github.com/anthropics/skills/tree/main/skills/pdf
    echo.
    echo   Trail of Bits security:
    echo     https://github.com/trailofbits/skills/tree/main/plugins/static-analysis
    echo     https://github.com/trailofbits/skills/tree/main/plugins/modern-python
    echo.
    echo   Vercel:
    echo     https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
    echo.
    exit /b 1
)

powershell -ExecutionPolicy Bypass -File "%~dp0install-skill.ps1" %*
