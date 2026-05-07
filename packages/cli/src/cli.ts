#!/usr/bin/env node
import { defineCommand, runMain } from 'citty';
import { atlasCommand } from './commands/atlas';
import { auditCommand } from './commands/audit';
import { classifyCommand } from './commands/classify';
import { initCommand } from './commands/init';
import { lintCommand } from './commands/lint';

const main = defineCommand({
  meta: {
    name: 'atelier',
    version: '0.0.0',
    description:
      'DESIGN.md-aware design-token toolkit. v0 generates. Cursor edits. Atelier enforces.',
  },
  subCommands: {
    init: initCommand,
    lint: lintCommand,
    classify: classifyCommand,
    audit: auditCommand,
    atlas: atlasCommand,
  },
});

runMain(main);
