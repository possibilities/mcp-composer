# MCP Composer

A CLI tool for composing MCP clients and servers

## Installation

```bash
pnpm install
pnpm build
pnpm link --global
```

## Usage

```bash
mc <client> <server> [args...]
```

### Examples

```bash
mc claude fetch
```

With arguments:

```bash
mc opencode sqlite ./movies.db
```
