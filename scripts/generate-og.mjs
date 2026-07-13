// Builds the Open Graph cards (public/og-<lang>.jpg) from the resume, the portrait and
// the design tokens. Runs as `prebuild`, so the card cannot drift from the resume it
// quotes: change the role, and the next build redraws it. The files are generated, not
// committed (.gitignore) — run `npm run og` to look at one.
//
// JPEG, not webp: the consumers are social scrapers, and LinkedIn is unreliable with
// webp.
//
// The text is rendered by resvg from the font files in scripts/fonts (Inter and
// JetBrains Mono, both OFL), with the system fonts switched off — the same source
// therefore draws the same card on any machine. sharp cannot do this: its text goes
// through pango, which on macOS resolves families via CoreText and ignores both
// `fontfile` and fontconfig, so every string would silently come out in whatever the
// host calls "sans".

import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { locales } from '../src/i18n/config.ts';

const root = new URL('../', import.meta.url);
const asset = (path) => fileURLToPath(new URL(path, root));

const WIDTH = 1200;
const HEIGHT = 630;

// Light ("reader") palette — src/styles/themes.css
const BG = '#f3ead4';
const TEXT = '#3f3628';
const MUTED = '#7c6f59';
const ACCENT = '#8a4f2c';
const BORDER = '#e2d5b8';

const SANS = 'Inter';
const MONO = 'JetBrains Mono';
const FONT_FILES = [
  asset('scripts/fonts/Inter-Bold.ttf'),
  asset('scripts/fonts/Inter-SemiBold.ttf'),
  asset('scripts/fonts/JetBrainsMono-Regular.ttf'),
];

const MARGIN = 80;
const PORTRAIT_SIZE = 380;
const PORTRAIT_CX = WIDTH - MARGIN - PORTRAIT_SIZE / 2;
const PORTRAIT_CY = HEIGHT / 2;
const TAGLINE = 'frontend · fullstack · mobile';

/**
 * The card says what the resume says. Two scalar fields off the top of the
 * frontmatter — a YAML parser would be a dependency for `name:` and `role:`.
 */
function identity(lang) {
  const source = readFileSync(asset(`src/content/resume/${lang}.md`), 'utf8');
  const read = (key) => source.match(new RegExp(`^${key}:\\s*'(.+)'\\s*$`, 'm'))?.[1];

  const name = read('name');
  const role = read('role');
  if (!name || !role) {
    throw new Error(`resume/${lang}.md: could not read 'name' and 'role' from the frontmatter`);
  }
  return { name, role };
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Cropped toward the top, the same bias the site uses for the round avatar, then
// inlined so the SVG has no external references.
const portrait = await sharp(asset('src/assets/portrait.png'))
  .resize(PORTRAIT_SIZE, PORTRAIT_SIZE, { fit: 'cover', position: 'top' })
  .png()
  .toBuffer();
const portraitHref = `data:image/png;base64,${portrait.toString('base64')}`;

const card = ({ name, role }) => `
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

    <image xlink:href="${portraitHref}" clip-path="url(#round)"
           x="${PORTRAIT_CX - PORTRAIT_SIZE / 2}" y="${PORTRAIT_CY - PORTRAIT_SIZE / 2}"
           width="${PORTRAIT_SIZE}" height="${PORTRAIT_SIZE}"/>
    <circle cx="${PORTRAIT_CX}" cy="${PORTRAIT_CY}" r="${PORTRAIT_SIZE / 2 + 6}"
            fill="none" stroke="${BORDER}" stroke-width="3"/>
  </svg>
`;

for (const lang of locales) {
  const png = new Resvg(card(identity(lang)), {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: SANS },
  })
    .render()
    .asPng();

  await sharp(png)
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(asset(`public/og-${lang}.jpg`));
  console.log(`og-${lang}.jpg written`);
}
