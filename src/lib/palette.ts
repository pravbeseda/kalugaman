// The palette, read from the stylesheet that defines it. themes.css is the source of
// truth for colour; anything else that needs to know a colour — the OG card, the
// contrast check — reads it from here rather than keeping a copy that falls behind.
//
// The reader understands exactly two shapes: `#rrggbb` (the light value) and
// `light-dark(#rrggbb, #rrggbb)` (the pair, inside the @supports block). Anything else —
// rgb(), oklch(), a token routed through another var — is a hard error. A reader that
// quietly skipped what it did not understand would hand its callers a palette with a
// colour silently missing, which is worse than not reading the file at all.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Tokens something outside the CSS relies on. Each must exist in both themes. */
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

const HEX = /^#[0-9a-f]{6}$/i;
const LIGHT_DARK = /^light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)$/i;

/**
 * Every `--color-*` declaration in the file, in source order, comments stripped.
 *
 * Only the `:root` blocks are read — the base one and the one inside @supports. A colour
 * declared anywhere else (a `[data-theme]` override, a `prefers-color-scheme` block, a
 * palette scoped to one section) is a hard error rather than a value silently folded into
 * the light palette, where it would leave the OG card and the contrast check running on
 * colours nobody sees.
 */
function declarations(css: string): Array<[token: string, value: string]> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const found: Array<[string, string]> = [];

  // Innermost blocks only: the body pattern excludes braces, so an @supports wrapper is
  // stepped over and its inner `:root` is matched on its own.
  for (const [, rawSelector, body] of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rawSelector.trim();
    const colors = [...body.matchAll(/--(color-[\w-]+)\s*:\s*([^;]+);/g)];
    if (colors.length === 0) continue;

    if (selector !== ':root') {
      throw new Error(
        `src/styles/themes.css: colour tokens under \`${selector}\` are not read.\n` +
          `The palette reader (src/lib/palette.ts) only knows the :root blocks. Teach it ` +
          `this selector, or the OG card and the contrast check would run on a palette ` +
          `that does not match the page.`,
      );
    }

    for (const [, token, value] of colors) found.push([token, value.trim()]);
  }

  return found;
}

/**
 * Read on every call, deliberately. A memo would survive an edit to themes.css: this
 * module reads the stylesheet rather than importing it, so nothing invalidates it in dev,
 * and the card would keep its old colours until the server restarted. The file is 2 KB
 * and is read twice per build.
 */
export function palettes(): { light: Palette; dark: Palette } {
  const css = readFileSync(join(process.cwd(), 'src/styles/themes.css'), 'utf8');
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};

  for (const [token, value] of declarations(css)) {
    if (HEX.test(value)) {
      // The plain declaration: the light theme, and all an old browser ever sees.
      light[token] = value;
      dark[token] ??= value;
      continue;
    }

    const pair = value.match(LIGHT_DARK);
    if (pair) {
      light[token] = pair[1];
      dark[token] = pair[2];
      continue;
    }

    throw new Error(
      `src/styles/themes.css: cannot read --${token}: ${value}\n` +
        `The palette reader (src/lib/palette.ts) understands #rrggbb and ` +
        `light-dark(#rrggbb, #rrggbb). Teach it this shape rather than let the OG card ` +
        `and the contrast check run on a palette missing a colour.`,
    );
  }

  const missing = REQUIRED.filter((token) => !(token in light) || !(token in dark));
  if (missing.length > 0) {
    throw new Error(`src/styles/themes.css does not define ${missing.join(', ')} in both themes.`);
  }

  return { light: light as Palette, dark: dark as Palette };
}
