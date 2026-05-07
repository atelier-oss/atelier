import { defineCommand } from 'citty';

/**
 * Phase 2.3 stub. Real audit lands in Phase 2.6 from @atelier/audit.
 */
export const auditCommand = defineCommand({
  meta: {
    name: 'audit',
    description: 'Project audit (Phase 2.6) — currently a stub.',
  },
  run() {
    console.error('atelier audit: not implemented in Phase 2.3 — see Phase 2.6.');
    process.exit(2);
  },
});
