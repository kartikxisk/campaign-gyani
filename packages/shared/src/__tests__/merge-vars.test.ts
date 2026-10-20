import { describe, it, expect } from 'vitest';
import { MERGE_TOKENS } from '../merge-vars.js';

describe('merge tokens', () => {
  it('exposes exactly the six supported tokens', () => {
    expect([...MERGE_TOKENS].sort()).toEqual(
      ['{{.Email}}', '{{.ExternalURL}}', '{{.FirstName}}', '{{.LastName}}', '{{.Position}}', '{{.URL}}'].sort(),
    );
  });

  it('does not include the unsupported Company token', () => {
    expect(MERGE_TOKENS).not.toContain('{{.Company}}');
  });
});
