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
      "type": "stdio",
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
- `claude`: `~/.claude.json`
- `opencode`: `~/.opencode.json`
- `cline`: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

Each client's configuration file is updated with the appropriate server configuration in the `mcpServers` section.
