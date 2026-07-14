// Draws the Open Graph card: the same portrait, name and role the site itself shows,
// on the light ("reader") palette. Rendered during the build — `src/pages/og-[lang].jpg.ts`
// serves the bytes, and Base fingerprints them for the og:image URL — so the card is
// never a stored artefact that can fall behind the resume it quotes.
//
// JPEG, not webp: the consumers are social scrapers, and LinkedIn is unreliable with webp.
//
// The text is drawn by resvg from the fonts in src/assets/fonts (Inter and JetBrains
// Mono, both OFL) with the system fonts switched off, so the card renders identically
// on any machine. sharp cannot do this: its text goes through pango, which on macOS
// resolves families via CoreText and ignores `fontfile` — every string would silently
// come out in whatever the host calls "sans".

import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { getEntry } from 'astro:content';
import { join } from 'node:path';
import type { Locale } from '../i18n/config';
import { palettes } from './palette';

// Modules are bundled into chunks, so import.meta.url says nothing about the source
// tree. Both `astro build` and `astro dev` run from the project root.
const file = (path: string) => join(process.cwd(), path);

/** The card's dimensions are also claimed in the og:image meta — one source for both. */
export const CARD_SIZE = { width: 1200, height: 630 } as const;

const WIDTH = CARD_SIZE.width;
const HEIGHT = CARD_SIZE.height;

// The card wears the light ("reader") theme, read from the stylesheet that defines it —
// a copy of the hex values here would fall behind the site the first time one changed.
// Read when a card is first drawn, not when the module is imported: importing a module
// should not touch the disk.
const colors = () => palettes().light;

const SANS = 'Inter';
const MONO = 'JetBrains Mono';
const FONT_FILES = [
  file('src/assets/fonts/Inter-Bold.ttf'),
  file('src/assets/fonts/Inter-SemiBold.ttf'),
  file('src/assets/fonts/JetBrainsMono-Regular.ttf'),
];

const MARGIN = 80;
const PORTRAIT_SIZE = 380;
const PORTRAIT_CX = WIDTH - MARGIN - PORTRAIT_SIZE / 2;
const PORTRAIT_CY = HEIGHT / 2;
const TAGLINE = 'frontend · fullstack · mobile';

// The text column runs from the left margin to the portrait, with a gap before the
// face. Nothing wraps or clips: a line wider than this would simply be drawn over the
// portrait, so it is a build error instead.
const TEXT_COLUMN = PORTRAIT_CX - PORTRAIT_SIZE / 2 - MARGIN - 40;

const FONT = { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: SANS };

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function portraitHref(): Promise<string> {
  // Cropped toward the top, the same bias the site uses for the round avatar, then
  // inlined so the SVG has no external references.
  const png = await sharp(file('src/assets/portrait.png'))
    .resize(PORTRAIT_SIZE, PORTRAIT_SIZE, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

const svg = (name: string, role: string, portrait: string) => {
  const c = colors();

  return `
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
       width="${WIDTH}" height="${HEIGHT}">
    <defs>
      <clipPath id="round">
        <circle cx="${PORTRAIT_CX}" cy="${PORTRAIT_CY}" r="${PORTRAIT_SIZE / 2}"/>
      </clipPath>
    </defs>

    <rect width="${WIDTH}" height="${HEIGHT}" fill="${c['color-bg']}"/>
    <rect width="14" height="${HEIGHT}" fill="${c['color-accent']}"/>

    <text x="${MARGIN}" y="250" font-family="${SANS}" font-size="60" font-weight="700"
          fill="${c['color-text']}">${escape(name)}</text>
    <text x="${MARGIN}" y="316" font-family="${SANS}" font-size="34" font-weight="600"
          fill="${c['color-accent']}">${escape(role)}</text>
    <text x="${MARGIN}" y="382" font-family="${MONO}" font-size="22" letter-spacing="1"
          fill="${c['color-muted']}">${escape(TAGLINE)}</text>

    <line x1="${MARGIN}" y1="470" x2="${MARGIN + 160}" y2="470"
          stroke="${c['color-border']}" stroke-width="2"/>
    <text x="${MARGIN}" y="524" font-family="${MONO}" font-size="24" letter-spacing="2"
          fill="${c['color-muted']}">kalugaman.ru</text>

    <image xlink:href="${portrait}" clip-path="url(#round)"
           x="${PORTRAIT_CX - PORTRAIT_SIZE / 2}" y="${PORTRAIT_CY - PORTRAIT_SIZE / 2}"
           width="${PORTRAIT_SIZE}" height="${PORTRAIT_SIZE}"/>
    <circle cx="${PORTRAIT_CX}" cy="${PORTRAIT_CY}" r="${PORTRAIT_SIZE / 2 + 6}"
            fill="none" stroke="${c['color-border']}" stroke-width="3"/>
  </svg>
`;
};

type Font = [size: number, weight: number, family: string];

/** Bounding box of one line as resvg will actually draw it, fonts and all. */
function bbox(text: string, [size, weight, family]: Font) {
  const line = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
      <text x="0" y="${size}" font-family="${family}" font-size="${size}"
            font-weight="${weight}">${escape(text)}</text>
    </svg>
  `;
  return new Resvg(line, { font: FONT }).getBBox();
}

/** Width of one line. No bbox means resvg drew nothing — a blank line, not a zero-width one. */
function measure(text: string, font: Font): number {
  const box = bbox(text, font);
  if (!box) {
    throw new Error(
      `OG card: "${text}" could not be measured — resvg drew nothing for it. ` +
        `Do the fonts in src/assets/fonts cover this script?`,
    );
  }
  return box.width;
}

/**
 * The fonts are subset to Latin and Cyrillic, and resvg does not draw a .notdef box for a
 * character they do not have — it drops it. A single foreign character therefore vanishes
 * from an otherwise ordinary line, which no width check can see (measured: "Ivanov 漢" is
 * exactly as wide as "Ivanov"). So each character is asked for its own box.
 */
function covered(lang: Locale, label: string, text: string, font: Font) {
  for (const char of text) {
    // Spaces and combining marks legitimately draw nothing on their own.
    if (/^[\s\p{M}]$/u.test(char)) continue;

    if (!bbox(char, font)) {
      const codepoint = char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0');
      throw new Error(
        `OG card (${lang}): the ${label} contains "${char}" (U+${codepoint}), which the ` +
          `fonts in src/assets/fonts do not have — resvg would drop it and the card would ` +
          `ship with the character missing. Widen the ranges in scripts/subset-fonts.sh, ` +
          `if the typeface has the glyph at all.`,
      );
    }
  }
}

function fits(lang: Locale, label: string, text: string, font: Font) {
  covered(lang, label, text, font);

  const width = Math.ceil(measure(text, font));
  if (width > TEXT_COLUMN) {
    throw new Error(
      `OG card (${lang}): the ${label} "${text}" is ${width}px wide and the card allows ` +
        `${TEXT_COLUMN}px — it would be drawn across the portrait. Shorten it in the ` +
        `resume, or change the card layout in src/lib/og-card.ts.`,
    );
  }
}

// Editing the resume tears this module down (it imports astro:content) and the memo with
// it. Editing themes.css does not — the colours are read from disk, not imported — so the
// memo is dropped by hand when the palette changes, and a card cannot keep colours the
// stylesheet no longer has.
const cards = new Map<Locale, Promise<Buffer>>();
let drawnWith = '';

/** The card for a language. Drawn once: the endpoint and Base share the same bytes. */
export function ogCard(lang: Locale): Promise<Buffer> {
  const palette = Object.values(colors()).join(',');
  if (palette !== drawnWith) {
    cards.clear();
    drawnWith = palette;
  }

  if (!cards.has(lang)) {
    cards.set(lang, draw(lang));
  }
  return cards.get(lang)!;
}

async function draw(lang: Locale): Promise<Buffer> {
  const resume = await getEntry('resume', lang);
  if (!resume) throw new Error(`Missing resume for ${lang} — the OG card quotes it`);

  const { name, role } = resume.data;
  fits(lang, 'name', name, [60, 700, SANS]);
  fits(lang, 'role', role, [34, 600, SANS]);
  // Fixed strings, but they are drawn from the same subset fonts as the resume is.
  covered(lang, 'tagline', TAGLINE, [22, 400, MONO]);
  covered(lang, 'domain', 'kalugaman.ru', [24, 400, MONO]);

  const png = new Resvg(svg(name, role, await portraitHref()), { font: FONT }).render().asPng();

  return sharp(png).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}
