# mcp-composer

A CLI tool for composing client and server with optional arguments.

## Installation

```bash
pnpm install
pnpm build
pnpm link --global # To use globally
```

## Usage

```bash
# Using the primary command
mcp-composer <client> <server> [args...]

# Using the shorthand alias
mc <client> <server> [args...]
```

### Examples

```bash
mcp-composer clientA serverB
mc clientA serverB arg1 arg2 arg3
```