// Builds the Open Graph cards (public/og-<lang>.jpg) from the portrait and the
// design tokens. Run by hand after changing the portrait, the name or the palette
// (`npm run og`) and commit the result — the cards are static, the build does not
// touch them.
//
// JPEG, not webp: the consumers are social scrapers, and LinkedIn in particular is
// unreliable with webp.

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const portraitPath = fileURLToPath(new URL('src/assets/portrait.png', root));

const WIDTH = 1200;
const HEIGHT = 630;

// Light ("reader") palette — src/styles/themes.css
const BG = '#f3ead4';
const TEXT = '#3f3628';
const MUTED = '#7c6f59';
const ACCENT = '#8a4f2c';
const BORDER = '#e2d5b8';

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "Menlo, 'DejaVu Sans Mono', monospace";

const PORTRAIT_SIZE = 380;
const PORTRAIT_CX = WIDTH - 80 - PORTRAIT_SIZE / 2;
const PORTRAIT_CY = HEIGHT / 2;

const cards = {
  en: {
    name: 'Alexander Ivanov',
    role: 'Senior Angular Developer',
    tagline: 'frontend · fullstack · mobile',
  },
  ru: {
    name: 'Александр Иванов',
    role: 'Senior Angular-разработчик',
    tagline: 'frontend · fullstack · mobile',
  },
};

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function background({ name, role, tagline }) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
      <rect width="14" height="${HEIGHT}" fill="${ACCENT}"/>

      <text x="80" y="250" font-family="${SANS}" font-size="62" font-weight="700" fill="${TEXT}">${escape(name)}</text>
      <text x="80" y="316" font-family="${SANS}" font-size="36" font-weight="600" fill="${ACCENT}">${escape(role)}</text>
      <text x="80" y="382" font-family="${MONO}" font-size="24" letter-spacing="1.5" fill="${MUTED}">${escape(tagline)}</text>

      <line x1="80" y1="470" x2="240" y2="470" stroke="${BORDER}" stroke-width="2"/>
      <text x="80" y="522" font-family="${MONO}" font-size="26" letter-spacing="2" fill="${MUTED}">kalugaman.ru</text>

      <circle cx="${PORTRAIT_CX}" cy="${PORTRAIT_CY}" r="${PORTRAIT_SIZE / 2 + 6}" fill="none" stroke="${BORDER}" stroke-width="3"/>
    </svg>
  `);
}

const circleMask = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${PORTRAIT_SIZE}" height="${PORTRAIT_SIZE}">
    <circle cx="${PORTRAIT_SIZE / 2}" cy="${PORTRAIT_SIZE / 2}" r="${PORTRAIT_SIZE / 2}" fill="#fff"/>
  </svg>
`);

// Crop toward the top: the same bias the site uses for the round avatar.
const portrait = await sharp(portraitPath)
  .resize(PORTRAIT_SIZE, PORTRAIT_SIZE, { fit: 'cover', position: 'top' })
  .composite([{ input: circleMask, blend: 'dest-in' }])
  .png()
  .toBuffer();

for (const [lang, card] of Object.entries(cards)) {
  const out = fileURLToPath(new URL(`public/og-${lang}.jpg`, root));
  await sharp(background(card))
    .composite([
      {
        input: portrait,
        left: Math.round(PORTRAIT_CX - PORTRAIT_SIZE / 2),
        top: Math.round(PORTRAIT_CY - PORTRAIT_SIZE / 2),
      },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(out);
  console.log(`og-${lang}.jpg written`);
}
