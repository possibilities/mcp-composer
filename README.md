# MCP Composer

A CLI tool for composing MCP clients and servers

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

## Configuration

The CLI reads server configurations from `~/.mc.json` and environment variables from `~/.mc.env`.
