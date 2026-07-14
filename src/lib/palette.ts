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

/** The two places a colour may be declared, as a full context chain. */
const BASE = ':root';
const PAIRED = /^@supports \(color: light-dark\(.*\)\) > :root$/;

/**
 * Every `--color-*` declaration in the file, in source order, comments stripped.
 *
 * A colour is read from the base `:root` and from the `:root` inside the @supports block,
 * and from nowhere else. Anywhere else — a `[data-theme]` override, a
 * `prefers-color-scheme` block, a palette scoped to one section — is a hard error, not a
 * value silently folded into the light palette where it would leave the OG card and the
 * contrast check running on colours nobody sees.
 *
 * The context is the whole chain, not the innermost selector: inside
 * `@media (prefers-color-scheme: dark)` the selector still reads `:root`, and matching on
 * that alone would wave the block straight through.
 */
function declarations(css: string): Array<[token: string, value: string]> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const found: Array<[string, string]> = [];

  const context: string[] = [];
  let buffer = '';

  const readColours = () => {
    const colours = [...buffer.matchAll(/--(color-[\w-]+)\s*:\s*([^;]+);/g)];
    if (colours.length === 0) return;

    const chain = context.join(' > ');
    if (chain !== BASE && !PAIRED.test(chain)) {
      throw new Error(
        `src/styles/themes.css: colour tokens under \`${chain}\` are not read.\n` +
          `The palette reader (src/lib/palette.ts) knows the base :root block and the ` +
          `:root inside @supports (color: light-dark(…)). Teach it this context, or the ` +
          `OG card and the contrast check would run on a palette the page does not use.`,
      );
    }

    for (const [, token, value] of colours) found.push([token, value.trim()]);
  };

  for (const char of withoutComments) {
    if (char === '{') {
      context.push(buffer.trim().replace(/\s+/g, ' '));
      buffer = '';
    } else if (char === '}') {
      readColours();
      buffer = '';
      context.pop();
    } else {
      buffer += char;
    }
  }

  return found;
}

/**
 * Read on every call, deliberately. A memo would survive an edit to themes.css: this
 * module reads the stylesheet rather than importing it, so nothing invalidates it in dev,
 * and the card would keep its old colours until the server restarted. Callers ask often —
 * Base asks once per page, to key the card memo and version the og:image — so this is a
 * 2 KB file read a few dozen times per build, which is nothing next to drawing the card.
 */
export function palettes(): { light: Palette; dark: Palette } {
  const css = readFileSync(join(process.cwd(), 'src/styles/themes.css'), 'utf8');
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};

  // What the plain declaration said, before the light-dark() pair re-declared the token.
  const fallback: Record<string, string> = {};

  for (const [token, value] of declarations(css)) {
    if (HEX.test(value)) {
      // The plain declaration: the light theme, and all an old browser ever sees.
      light[token] = value;
      fallback[token] = value;
      continue;
    }

    const pair = value.match(LIGHT_DARK);
    if (pair) {
      // The light value is written twice — here and in the fallback above. Nobody with a
      // current browser would ever see them disagree, which is exactly why the disagreement
      // has to be an error: the readers it would hit are the ones we cannot look at.
      if (fallback[token] && fallback[token].toLowerCase() !== pair[1].toLowerCase()) {
        throw new Error(
          `src/styles/themes.css: --${token} has two different light values — ` +
            `${fallback[token]} in the fallback declaration and ${pair[1]} in light-dark().\n` +
            `Browsers without light-dark() would get the first; everyone else, and the OG ` +
            `card and the contrast check, the second.`,
        );
      }

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

  // Every colour is written in both places, and each absence is its own failure.
  //
  // No pair: a modern browser keeps the light colour and paints it on a near-black page.
  // No plain declaration: a browser without light-dark() reads nothing at all, the var()
  // turns invalid, and the cascade collapses — the very thing the fallback exists to
  // prevent. Neither shows up in the palette these checks run on, so neither can be left
  // to the reader's good manners.
  const unpaired = Object.keys(light).filter((token) => !(token in dark));
  if (unpaired.length > 0) {
    throw new Error(
      `src/styles/themes.css: ${unpaired.map((t) => `--${t}`).join(', ')} has no dark value.\n` +
        `Every colour token needs a light-dark() pair in the @supports block; the plain ` +
        `declaration above it is only the fallback for browsers without light-dark().`,
    );
  }

  const unguarded = Object.keys(light).filter((token) => !(token in fallback));
  if (unguarded.length > 0) {
    throw new Error(
      `src/styles/themes.css: ${unguarded.map((t) => `--${t}`).join(', ')} is declared only ` +
        `inside @supports.\n` +
        `A browser without light-dark() would then read no value for it at all, every ` +
        `var() using it would be invalid, and the page would fall back to the browser's ` +
        `own colours. Declare the light value plainly in the base :root as well.`,
    );
  }

  const missing = REQUIRED.filter((token) => !(token in light));
  if (missing.length > 0) {
    throw new Error(`src/styles/themes.css does not define ${missing.join(', ')}.`);
  }

  return { light: light as Palette, dark: dark as Palette };
}
