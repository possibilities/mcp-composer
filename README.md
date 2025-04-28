# mcp-composer

A CLI tool for composing MCP clients and servers

## Installation

```bash
pnpm install
pnpm build
pnpm link --global
```

## Usage

```bash
mcp-composer <client> <server> [args...]
```

Or use shorthand alias:

```bash
mc <client> <server> [args...]
```

### Examples

```bash
mcp-composer claude fetch
mc claude fetch
```

With arguments:

```bash
mcp-composer opencode sqlite ./movies.db
mc opencode sqlite ./movies.db
```
