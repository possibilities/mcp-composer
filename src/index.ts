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
  providedArgs: string[] = [],
) {
  const requiredItems: { type: 'arg' | 'env'; name: string }[] = []
  
  // Extract required arguments from the args array with %{arg-name} format
  if (serverConfig.args) {
    let argPlaceholderCount = 0
    
    for (const arg of serverConfig.args) {
      if (typeof arg === 'string' && arg.startsWith('%{') && arg.endsWith('}')) {
        argPlaceholderCount++
        if (providedArgs.length < argPlaceholderCount) {
          // Extract argument name from the placeholder
          const argName = arg.substring(2, arg.length - 1)
          requiredItems.push({ type: 'arg', name: argName })
        }
      }
    }
  }

  // Extract required environment variables from env values with %{KEY_NAME} format
  if (serverConfig.env) {
    for (const [key, value] of Object.entries(serverConfig.env)) {
      if (typeof value === 'string' && value.startsWith('%{') && value.endsWith('}')) {
        // Extract environment variable name from the placeholder
        const envVarName = value.substring(2, value.length - 1)
        if (!process.env[envVarName]) {
          requiredItems.push({ type: 'env', name: envVarName })
        }
      }
    }
  }

  if (requiredItems.length > 0) {
    const missingArgs = requiredItems
      .filter(item => item.type === 'arg')
      .map(item => `Argument: ${item.name}`)
    
    const missingEnvVars = requiredItems
      .filter(item => item.type === 'env')
      .map(item => `Environment variable: ${item.name}`)
    
    const missingItems = [...missingArgs, ...missingEnvVars]
    
    console.error(
      `Error: ${server} server requires the following:\n${missingItems.join('\n')}`,
    )
    
    if (missingEnvVars.length > 0) {
      console.error('Add environment variables to ~/.mc.env or set them in your environment')
    }
    
    if (missingArgs.length > 0) {
      console.error('Add the required arguments when running the command')
    }
    
    process.exit(1)
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
  .option('-f, --force', 'Force add even if server already exists')
  .action((client, server, args, options) => {
    const serverConfig = validateClientServer(client, server)
    validateServerRequirements(server, serverConfig, args)

    // Get client config and update it with the server configuration
    const clientConfig = getClientConfig(client)
    
    // Ensure mcpServers object exists
    if (!clientConfig.mcpServers) {
      clientConfig.mcpServers = {}
    }
    
    // Check if server already exists in client config
    if (clientConfig.mcpServers[server] && !options.force) {
      console.error(`Error: Server '${server}' already exists in ${client} configuration`)
      console.error('Use --force or -f to overwrite existing configuration')
      process.exit(1)
    }
    
    // Create a copy of the server config
    const clientServerConfig = { ...serverConfig }
    
    // Replace placeholder arguments with provided arguments
    if (clientServerConfig.args) {
      const replacedArgs: string[] = []
      let providedArgIndex = 0
      
      for (const arg of clientServerConfig.args) {
        if (typeof arg === 'string' && arg.startsWith('%{') && arg.endsWith('}')) {
          // If we have a provided argument, use it
          if (providedArgIndex < args.length) {
            replacedArgs.push(args[providedArgIndex])
            providedArgIndex++
          } else {
            // Otherwise, keep the placeholder
            replacedArgs.push(arg)
          }
        } else {
          replacedArgs.push(arg)
        }
      }
      
      // Append any remaining provided arguments
      if (providedArgIndex < args.length) {
        replacedArgs.push(...args.slice(providedArgIndex))
      }
      
      clientServerConfig.args = replacedArgs
    } else if (args.length > 0) {
      // If there are no args in the config but arguments were provided, add them
      clientServerConfig.args = args
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

    const actionVerb = options.force && clientConfig.mcpServers[server] ? 'Updated' : 'Added'
    console.log(`${actionVerb} ${server} server to ${client} client`)
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
