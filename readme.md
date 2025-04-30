# MCP Composer

A CLI tool for composing Model Context Protocol (MCP) clients and servers.

## Installation

```bash
npm install -g mcp-composer
# or with pnpm
pnpm install -g mcp-composer
```

For development:
```bash
git clone <repository-url>
cd mcp-composer
pnpm install
pnpm build
pnpm link --global
```

## Usage

The CLI provides several subcommands:

### Add

Add a client-server composition:

```bash
mcp-composer add <client> <server> [args...]
```

Examples:

```bash
# Add a basic server to a client
mcp-composer add claude fetch

# With arguments (placeholders in server config will be replaced)
mcp-composer add opencode sqlite ./movies.db

# Force overwrite existing configuration
mcp-composer add claude context7 --force
```

### Remove

Remove a client-server composition:

```bash
mcp-composer remove <client> <server>
```

Example:

```bash
mcp-composer remove claude fetch
```

### List

List all MCP server configurations:

```bash
mcp-composer list [client]
```

Examples:

```bash
# List all clients and their configured servers
mcp-composer list

# List servers for a specific client
mcp-composer list claude
```

### Clear

Remove all server configurations from a client:

```bash
mcp-composer clear <client>
```

Example:

```bash
mcp-composer clear claude
```

### Servers

List all available servers configured in ~/.mcp.json:

```bash
mcp-composer servers [options]
```

Options:
```bash
# Show detailed configuration
mcp-composer servers --verbose
mcp-composer servers -v
```

## Configuration Files

### Server Configuration (~/.mcp.json)

The CLI reads server configurations from `~/.mcp.json`. This file contains a `servers` object with named server configurations.

Example structure:

```json
{
  "servers": {
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "%{GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    },
    "sqlite": {
      "command": "uvx",
      "args": ["mcp-server-sqlite", "--db-path", "%{sqlite-db-path}"]
    }
  }
}
```

Each server can have the following properties:
- `command`: The command to execute
- `args`: Array of command-line arguments
- `env`: Environment variables to pass to the server

Placeholders in the format `%{name}` are supported in both the `args` array and `env` values:
- In `args`, placeholders are replaced with command-line arguments provided when running the add command
- In `env`, placeholders are replaced with environment variables from `~/.mcp.env` or the system environment

### Environment Variables (~/.mcp.env)

The CLI reads environment variables from `~/.mcp.env`. This file should be in the standard dotenv format.

Example:

```env
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_12345abcde67890fghij
```

These variables are used to validate server requirements and to replace placeholders in server configurations.

## Supported Clients

The CLI currently supports the following clients:
- `claude`: `~/.claude.json` (JSON format)
- `opencode`: `~/.opencode.json` (JSON format)
- `cline`: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` (JSON format)
- `y-cli`: `~/.local/share/y-cli/mcp_config.jsonl` (JSON Lines format)

Each client's configuration file is updated with the appropriate server configuration in the `mcpServers` section.
