#!/usr/bin/env node

import { Command } from 'commander'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import * as dotenv from 'dotenv'

// Load environment variables from ~/.mc.env file if it exists
const envPath = join(homedir(), '.mc.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const program = new Command()

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

const validClients = ['claude', 'cline', 'opencode']

function validateClientServer(client: string, server: string) {
  // Validate client
  if (!validClients.includes(client)) {
    console.error(`Error: Client must be one of: ${validClients.join(', ')}`)
    process.exit(1)
  }

  // Validate server
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

  return config.servers[server]
}

function validateServerRequirements(
  server: string,
  serverConfig: any,
  args: string[] = [],
) {
  // Check for required arguments
  if (serverConfig.requiredArgs && serverConfig.requiredArgs.length > 0) {
    if (args.length < serverConfig.requiredArgs.length) {
      const missingArgs = serverConfig.requiredArgs.slice(args.length)
      console.error(
        `Error: ${server} server requires ${missingArgs.length} additional argument(s): ${missingArgs.join(', ')}`,
      )
      process.exit(1)
    }
  }

  // Check for required environment variables
  if (serverConfig.requiredEnv) {
    const missingEnvVars = Object.entries(serverConfig.requiredEnv)
      .filter(([envVar]) => !process.env[envVar])
      .map(([envVar, description]) => `${envVar} (${description})`)

    if (missingEnvVars.length > 0) {
      console.error(
        `Error: ${server} server requires the following environment variables:\n${missingEnvVars.join('\n')}`,
      )
      console.error('Add these to ~/.mc.env or set them in your environment')
      process.exit(1)
    }
  }
}

program
  .name('mcp-composer')
  .alias('mc')
  .description('A CLI tool for composing mcp clients and servers')

// Add subcommand
const addCommand = program
  .command('add')
  .description('Add a client-server composition')
  .argument('<client>', 'Client (claude, cline, or opencode)')
  .argument('<server>', 'Server (must be defined in ~/.mc.json)')
  .argument('[args...]', 'Additional MCP arguments')
  .action((client, server, args) => {
    const serverConfig = validateClientServer(client, server)
    validateServerRequirements(server, serverConfig, args)

    console.log('Client:', client)
    console.log('Server:', server)
    if (args.length > 0) {
      console.log('Additional arguments:', args)
    }
  })

// Remove subcommand
const removeCommand = program
  .command('remove')
  .description('Remove a client-server composition')
  .argument('<client>', 'Client (claude, cline, or opencode)')
  .argument('<server>', 'Server (must be defined in ~/.mc.json)')
  .action((client, server, args) => {
    validateClientServer(client, server)

    console.log(
      `Removing composition with client: ${client} and server: ${server}`,
    )
    console.log('Client:', client)
    console.log('Server:', server)
    if (args.length > 0) {
      console.log('Additional arguments:', args)
    }
  })

program.parse()
