# MCP Composer

A CLI tool for composing Model Context Protocol (MCP) clients and servers.

## Installation

```bash
pnpm install
pnpm build
pnpm link --global
```

## Usage

The CLI provides different subcommands:

### Add

Add a client-server composition:

```bash
mc add <client> <server> [args...]
```

Examples:

```bash
mc add claude fetch
```

With arguments:

```bash
mc add opencode sqlite ./movies.db
```

### Remove

Remove a client-server composition:

```bash
mc remove <client> <server>
```

Example:

```bash
mc remove claude fetch
```

### List

List all MCP server configurations:

```bash
mc list [client]
```

Examples:

List all clients and their configured servers:
```bash
mc list
```

List servers for a specific client:
```bash
mc list claude
```

### Clear

Remove all server configurations from a client:

```bash
mc clear <client>
```

Example:

```bash
mc clear claude
```

### Servers

List all available servers configured in ~/.mc.json:

```bash
mc servers [options]
```

By default, this command shows only server names. Use the verbose option to see detailed configuration:

```bash
mc servers --verbose
mc servers -v
mc servers -V
```

## Configuration Files

### Server Configuration (~/.mc.json)

The CLI reads server configurations from `~/.mc.json`. This file contains a `servers` object with named server configurations.

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
- In `env`, placeholders are replaced with environment variables from `~/.mc.env` or the system environment

### Environment Variables (~/.mc.env)

The CLI reads environment variables from `~/.mc.env`. This file should be in the standard dotenv format.

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
