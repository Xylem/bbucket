#!/usr/bin/env node

'use strict';

const program = require('commander');

program
    .version(require('./package').version);

program
    .command('pr')
    .option('-a, --all', 'list all pull requests instead')
    .description('list unapproved pull requests')
    .action(require('./commands/pr'));

program.parse(process.argv);
