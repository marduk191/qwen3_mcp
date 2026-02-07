# Setup MCP configuration for LM Studio
$ErrorActionPreference = "Stop"

# Get the script directory (where this repo is located)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$indexPath = Join-Path $scriptDir "src\index.js"

# LM Studio config path
$lmstudioDir = Join-Path $env:USERPROFILE ".lmstudio"
$mcpConfigPath = Join-Path $lmstudioDir "mcp-servers.json"

# Create .lmstudio directory if needed
if (-not (Test-Path $lmstudioDir)) {
    New-Item -ItemType Directory -Path $lmstudioDir -Force | Out-Null
    Write-Host "[OK] Created $lmstudioDir"
}

# Build MCP config
$mcpConfig = @{
    mcpServers = @{
        "qwen3-mcp" = @{
            command = "node"
            args = @($indexPath.Replace("\", "/"))
            cwd = $scriptDir.Replace("\", "/")
        }
    }
}

# Merge with existing config if present
if (Test-Path $mcpConfigPath) {
    try {
        $existing = Get-Content $mcpConfigPath -Raw | ConvertFrom-Json
        if ($existing.mcpServers) {
            # Add our server to existing config
            $existing.mcpServers | Add-Member -NotePropertyName "qwen3-mcp" -NotePropertyValue $mcpConfig.mcpServers."qwen3-mcp" -Force
            $mcpConfig = $existing
        }
        Write-Host "[OK] Merged with existing MCP config"
    } catch {
        Write-Host "[WARN] Could not parse existing config, creating new one"
    }
}

# Write config
$mcpConfig | ConvertTo-Json -Depth 10 | Set-Content $mcpConfigPath -Encoding UTF8
Write-Host "[OK] MCP config written to $mcpConfigPath"

# Show the config
Write-Host ""
Write-Host "MCP Server configured:"
Write-Host "  Name: qwen3-mcp"
Write-Host "  Command: node $indexPath"
Write-Host ""
Write-Host "Restart LM Studio to load the MCP server."
