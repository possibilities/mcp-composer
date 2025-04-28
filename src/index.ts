#!/usr/bin/env node

import { Command } from 'commander'
import { readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const program = new Command()

// Read config file
function getConfig() {
  try {
    const configPath = join(homedir(), '.mc.json')
    const configFile = readFileSync(configPath, 'utf8')
    return JSON.parse(configFile)
  } catch (error: any) {
    console.error('Error reading config file:', error.message)
    process.exit(1)
  }
}

program
  .name('mcp-composer')
  .alias('mc')
  .description('A CLI tool for composing mcp clients and servers')
  .argument('<client>', 'Client (claude, cline, or opencode)')
  .argument('<server>', 'Server (must be defined in ~/.mc.json)')
  .argument('[args...]', 'Additional MCP arguments')
  .action((client, server, args) => {
    const validClients = ['claude', 'cline', 'opencode']
    if (!validClients.includes(client)) {
      console.error(`Error: Client must be one of: ${validClients.join(', ')}`)
      process.exit(1)
    }
    console.log('Client:', client)

    const config = getConfig()
    const validServers = Object.keys(config.servers || {})

    if (validServers.length === 0) {
      console.error('No servers defined in config file')
      process.exit(1)
    }

    if (!validServers.includes(server)) {
      console.error(`Error: Server must be one of: ${validServers.join(', ')}`)
      process.exit(1)
    }

    const serverConfig = config.servers[server]
    if (serverConfig.requiredArgs && serverConfig.requiredArgs.length > 0) {
      if (args.length < serverConfig.requiredArgs.length) {
        const missingArgs = serverConfig.requiredArgs.slice(args.length)
        console.error(
          `Error: ${server} server requires ${missingArgs.length} additional argument(s): ${missingArgs.join(', ')}`,
        )
        process.exit(1)
      }
    }

    console.log('Server:', server)
    if (args.length > 0) {
      console.log('Additional arguments:', args)
    }
  })

program.parse()
