#!/usr/bin/env node

import { Command } from 'commander'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import * as dotenv from 'dotenv'

interface ClientConfig {
  path: string
  type: 'json' | 'jsonlines'
}

interface ClientConfigs {
  [key: string]: ClientConfig
}

const clients: ClientConfigs = {
  claude: {
    path: join(homedir(), '.claude.json'),
    type: 'json',
  },
  opencode: {
    path: join(homedir(), '.opencode.json'),
    type: 'json',
  },
  cline: {
    path: join(
      homedir(),
      '.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
    ),
    type: 'json',
  },
  'y-cli': {
    path: join(homedir(), '.local/share/y-cli/mcp_config.jsonl'),
    type: 'jsonlines',
  },
}

const envPath = join(homedir(), '.mcp.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const program = new Command()

function getConfig() {
  try {
    const configPath = join(homedir(), '.mcp.json')
    const configFile = readFileSync(configPath, 'utf8')
    return JSON.parse(configFile)
  } catch (error: any) {
    console.error('Error reading config file:', error.message)
    process.exit(1)
  }
}

function getJsonlinesConfig(configPath: string) {
  try {
    const configFile = readFileSync(configPath, 'utf8')
    
    // Handle empty files
    if (!configFile.trim()) {
      return { mcpServers: {} }
    }

    // Split by newlines and parse each line as JSON
    const lines = configFile.trim().split('\n')
    const configs = lines.map(line => JSON.parse(line))

    // Convert to mcpServers format
    const result: any = { mcpServers: {} }

    for (const config of configs) {
      if (config.name) {
        result.mcpServers[config.name] = {
          command: config.command,
          args: config.args || [],
          env: config.env || {},
          auto_confirm: config.auto_confirm || [],
        }
      }
    }

    return result
  } catch (error: any) {
    console.error(`Error reading jsonlines config file:`, error.message)
    process.exit(1)
  }
}

function updateJsonlinesConfig(configPath: string, config: any) {
  try {
    // Convert from mcpServers format to jsonlines format
    const servers = config.mcpServers || {}
    const jsonlConfigs = Object.entries(servers).map(
      ([name, serverConfig]: [string, any]) => {
        return {
          name,
          command: serverConfig.command,
          args: serverConfig.args || [],
          env: serverConfig.env || {},
          auto_confirm: serverConfig.auto_confirm || [],
        }
      },
    )

    // Convert each config to a JSON line
    const jsonlContent = jsonlConfigs
      .map(config => JSON.stringify(config))
      .join('\n')

    // Write to file
    writeFileSync(configPath, jsonlContent, 'utf8')
  } catch (error: any) {
    console.error(`Error writing jsonlines config file:`, error.message)
    process.exit(1)
  }
}

function getClientConfig(client: string) {
  try {
    const clientConfig = clients[client]

    if (clientConfig.type === 'jsonlines') {
      return getJsonlinesConfig(clientConfig.path)
    } else {
      // Default JSON handling
      const configFile = readFileSync(clientConfig.path, 'utf8')
      return JSON.parse(configFile)
    }
  } catch (error: any) {
    console.error(`Error reading ${client} config file:`, error.message)
    process.exit(1)
  }
}

function updateClientConfig(client: string, config: any) {
  try {
    const clientConfig = clients[client]

    if (clientConfig.type === 'jsonlines') {
      updateJsonlinesConfig(clientConfig.path, config)
    } else {
      // Default JSON handling
      writeFileSync(clientConfig.path, JSON.stringify(config, null, 2), 'utf8')
    }
  } catch (error: any) {
    console.error(`Error writing ${client} config file:`, error.message)
    process.exit(1)
  }
}

const validClients = ['claude', 'cline', 'opencode', 'y-cli']

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
      if (
        typeof arg === 'string' &&
        arg.startsWith('%{') &&
        arg.endsWith('}')
      ) {
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
      if (
        typeof value === 'string' &&
        value.startsWith('%{') &&
        value.endsWith('}')
      ) {
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
      console.error(
        'Add environment variables to ~/.mcp.env or set them in your environment',
      )
    }

    if (missingArgs.length > 0) {
      console.error('Add the required arguments when running the command')
    }

    process.exit(1)
  }
}

program
  .name('mcp-composer')
  .description('A CLI tool for composing mcp clients and servers')

const addCommand = program
  .command('add')
  .description('Add a client-server composition')
  .argument('<client>', 'Client (claude, cline, opencode, or y-cli)')
  .argument('<server>', 'Server (must be defined in ~/.mcp.json)')
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
      console.error(
        `Error: Server '${server}' already exists in ${client} configuration`,
      )
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
        if (
          typeof arg === 'string' &&
          arg.startsWith('%{') &&
          arg.endsWith('}')
        ) {
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
        if (
          typeof value === 'string' &&
          value.startsWith('%{') &&
          value.endsWith('}')
        ) {
          // Extract environment variable name from the placeholder
          const envVarName = value.substring(2, value.length - 1)
          const envValue = process.env[envVarName]

          if (envValue) {
            replacedEnv[key] = envValue
          } else {
            console.warn(
              `Warning: Environment variable ${envVarName} not found. Using placeholder in config.`,
            )
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

    const actionVerb =
      options.force && clientConfig.mcpServers[server] ? 'Updated' : 'Added'
    console.log(`${actionVerb} ${server} server to ${client} client`)
  })

const removeCommand = program
  .command('remove')
  .description('Remove a client-server composition')
  .argument('<client>', 'Client (claude, cline, opencode, or y-cli)')
  .argument('<server>', 'Server (must be defined in ~/.mcp.json)')
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

const listCommand = program
  .command('list')
  .description('List all MCP server configurations')
  .argument(
    '[client]',
    'Optional client name to filter results (claude, cline, opencode, or y-cli)',
  )
  .action(client => {
    if (client && !validClients.includes(client)) {
      console.error(`Error: Client must be one of: ${validClients.join(', ')}`)
      process.exit(1)
    }

    if (client) {
      try {
        const clientConfig = getClientConfig(client)
        if (
          clientConfig.mcpServers &&
          Object.keys(clientConfig.mcpServers).length > 0
        ) {
          Object.keys(clientConfig.mcpServers).forEach(server => {
            console.log(`- ${server}`)
          })
        }
      } catch (error) {
        console.error(`Error: Unable to read configuration for ${client}`)
        process.exit(1)
      }
    } else {
      for (const clientName of validClients) {
        try {
          const clientConfig = getClientConfig(clientName)

          if (
            clientConfig.mcpServers &&
            Object.keys(clientConfig.mcpServers).length > 0
          ) {
            console.log(`- ${clientName}:`)
            Object.keys(clientConfig.mcpServers).forEach(server => {
              console.log(`  - ${server}`)
            })
          }
        } catch (error) {
          console.log(`${clientName}: Unable to read configuration`)
        }
      }
    }
  })

const clearCommand = program
  .command('clear')
  .description('Remove all server configurations from a client')
  .argument('<client>', 'Client (claude, cline, opencode, or y-cli)')
  .action(client => {
    if (!validClients.includes(client)) {
      console.error(`Error: Client must be one of: ${validClients.join(', ')}`)
      process.exit(1)
    }

    // Get client config
    const clientConfig = getClientConfig(client)

    // Check if mcpServers exists
    if (
      !clientConfig.mcpServers ||
      Object.keys(clientConfig.mcpServers).length === 0
    ) {
      console.log(`No servers configured for ${client}`)
      return
    }

    // Count the number of servers to be cleared
    const serverCount = Object.keys(clientConfig.mcpServers).length

    // Clear all servers by setting mcpServers to an empty object
    clientConfig.mcpServers = {}

    // Save updated client config
    updateClientConfig(client, clientConfig)

    console.log(`Cleared all servers (${serverCount}) from ${client} client`)
  })

const serversCommand = program
  .command('servers')
  .description('List all available servers in ~/.mcp.json')
  .option('-v, --verbose', 'Show detailed server configurations')
  .option('-V', 'Show detailed server configurations (alias for --verbose)')
  .action(options => {
    try {
      const config = getConfig()
      const verbose = options.verbose || options.V

      if (!config.servers || Object.keys(config.servers).length === 0) {
        console.log('No servers defined in ~/.mcp.json')
        return
      }

      if (verbose) {
        console.log('Available servers:')
        Object.entries(config.servers).forEach(
          ([name, serverConfig]: [string, any]) => {
            console.log(`- ${name}:`)
            console.log(`  Command: ${serverConfig.command}`)
            if (serverConfig.args && serverConfig.args.length > 0) {
              console.log(`  Args: ${serverConfig.args.join(' ')}`)
            }
            if (serverConfig.env && Object.keys(serverConfig.env).length > 0) {
              console.log('  Required environment variables:')
              Object.entries(serverConfig.env).forEach(([key, value]) => {
                if (
                  typeof value === 'string' &&
                  value.startsWith('%{') &&
                  value.endsWith('}')
                ) {
                  const envVarName = value.substring(2, value.length - 1)
                  console.log(`    ${key}: ${envVarName}`)
                } else {
                  console.log(`    ${key}: (static value)`)
                }
              })
            }
          },
        )
      } else {
        // Simple output - just list server names
        const serverNames = Object.keys(config.servers)
        console.log('Available servers:')
        serverNames.forEach(name => {
          console.log(`- ${name}`)
        })
      }
    } catch (error: any) {
      console.error('Error reading servers from ~/.mcp.json:', error.message)
      process.exit(1)
    }
  })

program.parse()
