import { describe, expect, it } from 'vitest';
import { checkSubTokens } from './sub-tokens';
import { CANONICAL_SUBTOKEN_ROLES } from './types';

describe('checkSubTokens', () => {
  it('reports all 8 roles missing on an empty token list', () => {
    const r = checkSubTokens([]);
    expect(r.satisfied.size).toBe(0);
    expect(r.missing).toHaveLength(8);
    expect(r.findings).toHaveLength(8);
    for (const f of r.findings) {
      expect(f.severity).toBe('info');
      expect(f.message).toContain('ATELIER_MISSING_ROLE');
    }
  });

  it('detects all 8 roles when each is named directly', () => {
    const r = checkSubTokens([...CANONICAL_SUBTOKEN_ROLES]);
    expect(r.missing).toHaveLength(0);
    expect(r.findings).toHaveLength(0);
    expect(r.satisfied.size).toBe(8);
  });

  it('is case-insensitive and underscore/space-tolerant', () => {
    const r = checkSubTokens(['Background', 'PRIMARY', 'primary_foreground']);
    expect(r.satisfied.has('background')).toBe(true);
    expect(r.satisfied.has('primary')).toBe(true);
    expect(r.satisfied.has('primary-foreground')).toBe(true);
  });

  it('uses the aliases block when role names differ', () => {
    const r = checkSubTokens(['c-bg', 'c-text', 'c-accent'], {
      background: 'c-bg',
      foreground: 'c-text',
      primary: 'c-accent',
    });
    expect(r.satisfied.has('background')).toBe(true);
    expect(r.satisfied.has('foreground')).toBe(true);
    expect(r.satisfied.has('primary')).toBe(true);
    // No alias for the rest → still missing.
    expect(r.missing).toContain('accent');
    expect(r.missing).toContain('muted');
    expect(r.missing).toContain('border');
    expect(r.missing).toContain('ring');
  });

  it('emits one finding per missing role with the role name in the message', () => {
    const r = checkSubTokens(['background', 'foreground']);
    expect(r.missing).toHaveLength(6);
    for (const role of r.missing) {
      const f = r.findings.find((x) => x.message.includes(`"${role}"`));
      expect(f, `missing finding for role ${role}`).toBeDefined();
      expect(f?.severity).toBe('info');
    }
  });
});
