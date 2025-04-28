#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('mcp-composer')
  .alias('mc')
  .description('A CLI tool for composing client and server with optional arguments')
  .argument('<client>', 'Client component')
  .argument('<server>', 'Server component')
  .argument('[args...]', 'Optional arguments')
  .action((client, server, args) => {
    console.log('Client:', client);
    console.log('Server:', server);
    if (args.length > 0) {
      console.log('Additional arguments:', args);
    }
  });

program.parse();