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

// Modules are bundled into chunks, so import.meta.url says nothing about the source
// tree. Both `astro build` and `astro dev` run from the project root.
const file = (path: string) => join(process.cwd(), path);

/** The card's dimensions are also claimed in the og:image meta — one source for both. */
export const CARD_SIZE = { width: 1200, height: 630 } as const;

const WIDTH = CARD_SIZE.width;
const HEIGHT = CARD_SIZE.height;

// Light ("reader") palette — src/styles/themes.css
const BG = '#f3ead4';
const TEXT = '#3f3628';
const MUTED = '#7c6f59';
const ACCENT = '#8a4f2c';
const BORDER = '#e2d5b8';

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

const svg = (name: string, role: string, portrait: string) => `
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
       width="${WIDTH}" height="${HEIGHT}">
    <defs>
      <clipPath id="round">
        <circle cx="${PORTRAIT_CX}" cy="${PORTRAIT_CY}" r="${PORTRAIT_SIZE / 2}"/>
      </clipPath>
    </defs>

    <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
    <rect width="14" height="${HEIGHT}" fill="${ACCENT}"/>

    <text x="${MARGIN}" y="250" font-family="${SANS}" font-size="60" font-weight="700"
          fill="${TEXT}">${escape(name)}</text>
    <text x="${MARGIN}" y="316" font-family="${SANS}" font-size="34" font-weight="600"
          fill="${ACCENT}">${escape(role)}</text>
    <text x="${MARGIN}" y="382" font-family="${MONO}" font-size="22" letter-spacing="1"
          fill="${MUTED}">${escape(TAGLINE)}</text>

    <line x1="${MARGIN}" y1="470" x2="${MARGIN + 160}" y2="470" stroke="${BORDER}" stroke-width="2"/>
    <text x="${MARGIN}" y="524" font-family="${MONO}" font-size="24" letter-spacing="2"
          fill="${MUTED}">kalugaman.ru</text>

    <image xlink:href="${portrait}" clip-path="url(#round)"
           x="${PORTRAIT_CX - PORTRAIT_SIZE / 2}" y="${PORTRAIT_CY - PORTRAIT_SIZE / 2}"
           width="${PORTRAIT_SIZE}" height="${PORTRAIT_SIZE}"/>
    <circle cx="${PORTRAIT_CX}" cy="${PORTRAIT_CY}" r="${PORTRAIT_SIZE / 2 + 6}"
            fill="none" stroke="${BORDER}" stroke-width="3"/>
  </svg>
`;

/** Width of one line as resvg will actually draw it, fonts and all. */
function measure(text: string, size: number, weight: number, family: string): number {
  const line = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
      <text x="0" y="${size}" font-family="${family}" font-size="${size}"
            font-weight="${weight}">${escape(text)}</text>
    </svg>
  `;

  // No bbox means resvg drew nothing — a font without the glyphs, say. That is a blank
  // line on the card, not a line of zero width, so it must not read as "it fits".
  const bbox = new Resvg(line, { font: FONT }).getBBox();
  if (!bbox) {
    throw new Error(
      `OG card: "${text}" could not be measured — resvg drew nothing for it. ` +
        `Do the fonts in src/assets/fonts cover this script?`,
    );
  }
  return bbox.width;
}

function fits(lang: Locale, label: string, text: string, ...font: [number, number, string]) {
  const width = Math.ceil(measure(text, ...font));
  if (width > TEXT_COLUMN) {
    throw new Error(
      `OG card (${lang}): the ${label} "${text}" is ${width}px wide and the card allows ` +
        `${TEXT_COLUMN}px — it would be drawn across the portrait. Shorten it in the ` +
        `resume, or change the card layout in src/lib/og-card.ts.`,
    );
  }
}

// Lives as long as the module does — one build, or in dev until the content changes:
// editing the resume tears this module down along with the cache (verified: the served
// card and its hash both change without restarting the dev server). So the card cannot
// go stale behind the data it quotes.
const cards = new Map<Locale, Promise<Buffer>>();

/** The card for a language. Drawn once: the endpoint and Base share the same bytes. */
export function ogCard(lang: Locale): Promise<Buffer> {
  if (!cards.has(lang)) {
    cards.set(lang, draw(lang));
  }
  return cards.get(lang)!;
}

async function draw(lang: Locale): Promise<Buffer> {
  const resume = await getEntry('resume', lang);
  if (!resume) throw new Error(`Missing resume for ${lang} — the OG card quotes it`);

  const { name, role } = resume.data;
  fits(lang, 'name', name, 60, 700, SANS);
  fits(lang, 'role', role, 34, 600, SANS);

  const png = new Resvg(svg(name, role, await portraitHref()), { font: FONT }).render().asPng();

  return sharp(png).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}
