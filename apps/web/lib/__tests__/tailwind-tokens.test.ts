// @vitest-environment node
import { describe, it, expect } from 'vitest';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import config from '../../tailwind.config';

async function compile(classes: string): Promise<string> {
  const result = await postcss([tailwind({ ...config, content: [{ raw: `<div class="${classes}"></div>`, extension: 'html' }] })])
    .process('@tailwind utilities;', { from: undefined });
  return result.css;
}

describe('tailwind token colors', () => {
  it('emits plain var() colors without an opacity modifier', async () => {
    const css = await compile('text-deck-muted bg-primary');
    expect(css).toContain('color: var(--cg-deck-muted)');
    expect(css).toContain('background-color: var(--cg-primary)');
  });

  it('honours opacity modifiers on token colors', async () => {
    const css = await compile('text-deck-muted/70 bg-ink/40 border-ok/30 ring-primary/50');
    expect(css).toContain('color: color-mix(in srgb, var(--cg-deck-muted) 70%, transparent)');
    expect(css).toContain('background-color: color-mix(in srgb, var(--cg-ink) 40%, transparent)');
    expect(css).toContain('border-color: color-mix(in srgb, var(--cg-ok) 30%, transparent)');
    expect(css).toMatch(/--tw-ring-color: color-mix\(in srgb, var\(--cg-primary\) 50%, transparent\)/);
  });
});
