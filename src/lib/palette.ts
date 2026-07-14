// The palette, read from the stylesheet that defines it. themes.css is the source of
// truth for colour; anything else that needs to know a colour — the OG card, the
// contrast check — reads it from here rather than keeping a copy that can fall behind.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Every token something outside the CSS relies on. A missing one is an error. */
const REQUIRED = [
  'color-bg',
  'color-surface',
  'color-text',
  'color-muted',
  'color-border',
  'color-border-control',
  'color-accent',
  'color-accent-contrast',
  'color-tag-bg',
  'color-tag-text',
] as const;

export type Token = (typeof REQUIRED)[number];
export type Palette = Record<Token, string>;

/**
 * `--color-bg: light-dark(#f3ead4, #0d0f14);` → light.'color-bg' = '#f3ead4'.
 * Modules are bundled into chunks, so the file is resolved from the project root, which
 * is where both `astro build` and the check scripts run.
 */
export function palettes(): { light: Palette; dark: Palette } {
  const css = readFileSync(join(process.cwd(), 'src/styles/themes.css'), 'utf8');

  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};

  for (const [, token, lightValue, darkValue] of css.matchAll(
    /--([\w-]+):\s*light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)/gi,
  )) {
    light[token] = lightValue;
    dark[token] = darkValue;
  }

  const missing = REQUIRED.filter((token) => !(token in light));
  if (missing.length > 0) {
    throw new Error(
      `Cannot read the palette from src/styles/themes.css: ${missing.join(', ')} ` +
        `is not a light-dark() pair of hex colours. Fix the reader rather than let it ` +
        `run on a palette it cannot see.`,
    );
  }

  return { light: light as Palette, dark: dark as Palette };
}
