#!/usr/bin/env node
/**
 * Atelier MCP server.
 *
 * Exposes four tools (atelier_lint, atelier_classify, atelier_audit,
 * atelier_atlas_fingerprint) over stdio. Wraps the pure handlers in
 * `tools.ts` and registers them with the MCP TypeScript SDK.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  atlasInput,
  atlasTool,
  auditInput,
  auditTool,
  classifyInput,
  classifyTool,
  lintInput,
  lintTool,
} from './tools';

const TOOLS = [
  {
    name: 'atelier_lint',
    description:
      'Lint a DESIGN.md file using @atelier/lint (wraps @google/design.md@0.1.1 with the precedence rule).',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path to a DESIGN.md file.',
        },
      },
    },
  },
  {
    name: 'atelier_classify',
    description: 'Score a project for token-vs-raw conformance (@atelier/classify).',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'Project root to walk.',
        },
      },
    },
  },
  {
    name: 'atelier_audit',
    description:
      'Run the 6-section design audit (token usage, contrast, motion, a11y, design coverage, responsive) via @atelier/audit.',
    inputSchema: {
      type: 'object',
      required: ['root'],
      properties: {
        root: { type: 'string', description: 'Project root.' },
        componentDir: {
          type: 'string',
          description: 'Component directory relative to root (default: components/home/command-center).',
        },
      },
    },
  },
  {
    name: 'atelier_atlas_fingerprint',
    description: 'Fingerprint a project root and return its build category (@atelier/atlas).',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: { type: 'string', description: 'Project root to fingerprint.' },
      },
    },
  },
] as const;

const server = new Server(
  { name: 'atelier-mcp', version: '0.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [...TOOLS],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  let result: unknown;
  try {
    switch (name) {
      case 'atelier_lint':
        result = await lintTool(lintInput.parse(args));
        break;
      case 'atelier_classify':
        result = await classifyTool(classifyInput.parse(args));
        break;
      case 'atelier_audit':
        result = await auditTool(auditInput.parse(args));
        break;
      case 'atelier_atlas_fingerprint':
        result = await atlasTool(atlasInput.parse(args));
        break;
      default:
        return {
          content: [{ type: 'text', text: `unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (e) {
    return {
      content: [{ type: 'text', text: `error: ${(e as Error).message}` }],
      isError: true,
    };
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('atelier-mcp fatal:', err);
  process.exit(1);
});
