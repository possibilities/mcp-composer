#!/usr/bin/env node

import { Command } from 'commander'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import * as dotenv from 'dotenv'

interface ClientPaths {
  [key: string]: string;
}

const clients: ClientPaths = {
  claude: join(homedir(), '.claude.json'),
  opencode: join(homedir(), '.opencode.json'),
  cline: join(
    homedir(),
    '.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
  ),
}

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

function getClientConfig(client: string) {
  try {
    const configPath = clients[client]
    const configFile = readFileSync(configPath, 'utf8')
    return JSON.parse(configFile)
  } catch (error: any) {
    console.error(`Error reading ${client} config file:`, error.message)
    process.exit(1)
  }
}

function updateClientConfig(client: string, config: any) {
  try {
    const configPath = clients[client]
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')
  } catch (error: any) {
    console.error(`Error writing ${client} config file:`, error.message)
    process.exit(1)
  }
}

const validClients = ['claude', 'cline', 'opencode']

function validateClientServer(client: string, server: string) {
  if (!validClients.includes(client)) {
    console.error(`Error: Client must be one of: ${validClients.join(', ')}`)
    process.exit(1)
  }

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
  if (serverConfig.requiredArgs && serverConfig.requiredArgs.length > 0) {
    if (args.length < serverConfig.requiredArgs.length) {
      const missingArgs = serverConfig.requiredArgs.slice(args.length)
      console.error(
        `Error: ${server} server requires ${missingArgs.length} additional argument(s): ${missingArgs.join(', ')}`,
      )
      process.exit(1)
    }
  }

  // Extract required environment variables from env values with %{KEY_NAME} format
  if (serverConfig.env) {
    const requiredEnvVars: string[] = []
    
    for (const [key, value] of Object.entries(serverConfig.env)) {
      if (typeof value === 'string' && value.startsWith('%{') && value.endsWith('}')) {
        // Extract environment variable name from the placeholder
        const envVarName = value.substring(2, value.length - 1)
        if (!process.env[envVarName]) {
          requiredEnvVars.push(envVarName)
        }
      }
    }

    if (requiredEnvVars.length > 0) {
      console.error(
        `Error: ${server} server requires the following environment variables:\n${requiredEnvVars.join('\n')}`,
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

const addCommand = program
  .command('add')
  .description('Add a client-server composition')
  .argument('<client>', 'Client (claude, cline, or opencode)')
  .argument('<server>', 'Server (must be defined in ~/.mc.json)')
  .argument('[args...]', 'Additional MCP arguments')
  .action((client, server, args) => {
    const serverConfig = validateClientServer(client, server)
    validateServerRequirements(server, serverConfig, args)

    // Get client config and update it with the server configuration
    const clientConfig = getClientConfig(client)
    
    // Ensure mcpServers object exists
    if (!clientConfig.mcpServers) {
      clientConfig.mcpServers = {}
    }
    
    // Check if server already exists in client config
    if (clientConfig.mcpServers[server]) {
      console.error(`Error: Server '${server}' already exists in ${client} configuration`)
      process.exit(1)
    }
    
    // Create a copy of the server config without requiredArgs
    const clientServerConfig = { ...serverConfig }
    delete clientServerConfig.requiredArgs
    
    // If there are additional arguments from command line, append them to the args array in the config
    if (args.length > 0) {
      clientServerConfig.args = [...(clientServerConfig.args || []), ...args]
    }
    
    // Replace environment variable placeholders in env values
    if (clientServerConfig.env) {
      const replacedEnv: Record<string, string> = {}
      
      for (const [key, value] of Object.entries(clientServerConfig.env)) {
        if (typeof value === 'string' && value.startsWith('%{') && value.endsWith('}')) {
          // Extract environment variable name from the placeholder
          const envVarName = value.substring(2, value.length - 1)
          const envValue = process.env[envVarName]
          
          if (envValue) {
            replacedEnv[key] = envValue
          } else {
            console.warn(`Warning: Environment variable ${envVarName} not found. Using placeholder in config.`)
            replacedEnv[key] = value
          }
        } else {
          replacedEnv[key] = value as string
        }
      }
      
      clientServerConfig.env = replacedEnv
    }
    
    // Add the modified server config to client's mcpServers
    clientConfig.mcpServers[server] = clientServerConfig
    
    // Save updated client config
    updateClientConfig(client, clientConfig)

    console.log(`Added ${server} server to ${client} client`)
  })

const removeCommand = program
  .command('remove')
  .description('Remove a client-server composition')
  .argument('<client>', 'Client (claude, cline, or opencode)')
  .argument('<server>', 'Server (must be defined in ~/.mc.json)')
  .action((client, server) => {
    if (!validClients.includes(client)) {
      console.error(`Error: Client must be one of: ${validClients.join(', ')}`)
      process.exit(1)
    }

    // Get client config
    const clientConfig = getClientConfig(client)
    
    // Check if the mcpServers exists and has the specified server
    if (!clientConfig.mcpServers || !clientConfig.mcpServers[server]) {
      console.error(`Server ${server} not found in ${client} configuration`)
      process.exit(1)
    }
    
    // Remove the server from the client's mcpServers
    delete clientConfig.mcpServers[server]
    
    // Save updated client config
    updateClientConfig(client, clientConfig)

    console.log(`Removed ${server} server from ${client} client`)
  })

program.parse()
