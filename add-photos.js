#!/usr/bin/env node
/**
 * ALIZA NADINE — Auto Gallery + Homepage Builder
 * ------------------------------------------------
 * Drop photos into the right category folder, then run:
 *   node add-photos.js
 *
 * Folders:
 *   images/gallery/realism/   → Black & grey realism work
 *   images/gallery/linework/  → Fine line & botanical
 *   images/gallery/blackwork/ → Black work / bold black tattoos
 *   images/gallery/coverups/  → Cover-up tattoos
 *   images/gallery/freehand/  → Free hand tattoos
 *   images/gallery/script/    → Lettering & script
 *   images/gallery/flash/     → Flash designs
 *
 * What this script does, for every source photo (.jpg/.jpeg/.png):
 *   1. Generates two optimized WebP versions in images/optimized/<category>/
 *      (kept OUT of your photo folders so they stay clean):
 *        <name>.webp     → full size (longest side max 1400px) — used in lightbox
 *        <name>-sm.webp  → mobile size (longest side max 760px)  — used on phones
 *      (Skips files that are already up to date, so re-runs are fast.)
 *   2. Rewrites the gallery grid in gallery.html (between markers).
 *   3. Rewrites the 6 featured work cards on index.html with the
 *      6 most recently added photos (between markers).
 *
 * The original JPG/PNG is kept as the quality source (and so any
 * previously-indexed image URLs keep working). Only the WebP is served.
 *
 * Requires: cwebp  (install once with: brew install webp)
 */

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const GALLERY_HTML = path.join(__dirname, 'gallery.html');
const INDEX_HTML   = path.join(__dirname, 'index.html');
const GALLERY_DIR  = path.join(__dirname, 'images', 'gallery');
const OPT_DIR      = path.join(__dirname, 'images', 'optimized'); // generated WebP lives here, not in the photo folders

const SOURCE_EXTS = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];

// WebP encode settings
const FULL_WIDTH = 1400;  // lightbox / large displays
const SM_WIDTH   = 760;   // phones
const QUALITY    = 80;

// Responsive sizing hint (grid shows ~3 cols desktop, 2 tablet, 1 phone)
const SIZES = '(max-width: 600px) 92vw, (max-width: 1000px) 46vw, 30vw';

// Category config
const CATEGORIES = {
  realism:   { label: 'Realism',    style: 'Black & Grey',  alt: 'Black and grey realism tattoo by Aliza Nadine Phoenix AZ' },
  linework:  { label: 'Line Work',  style: 'Fine Line',     alt: 'Fine line tattoo by Aliza Nadine Phoenix AZ' },
  blackwork: { label: 'Black Work', style: 'Black Work',    alt: 'Black work tattoo by Aliza Nadine at Ink. Body Art Phoenix AZ' },
  coverups:  { label: 'Cover Ups',  style: 'Cover Up',      alt: 'Cover up tattoo by Aliza Nadine at Ink. Body Art Phoenix AZ' },
  freehand:  { label: 'Free Hand',  style: 'Free Hand',     alt: 'Free hand tattoo by Aliza Nadine at Ink. Body Art Phoenix AZ' },
  script:    { label: 'Script',     style: 'Script',        alt: 'Custom script lettering tattoo by Aliza Nadine Phoenix' },
  flash:     { label: 'Flash',      style: 'Flash',         alt: 'Flash tattoo design by Aliza Nadine at Ink. Body Art Phoenix' },
};

// ─── Filename → readable title ──────────────────────────────────────────────
const STRIP_SUFFIXES = ['phoenix-az', 'phoenix-arizona', 'phoenix', 'arizona', 'az'];
const STRIP_PLACEMENTS = [
  'forearm', 'upper-arm', 'upper', 'lower', 'arm', 'wrist', 'hand', 'finger',
  'torso', 'stomach', 'rib', 'ribs', 'back', 'chest', 'shoulder',
  'thigh', 'calf', 'ankle', 'foot', 'behind-ear', 'ear', 'neck', 'leg',
  'sleeve', 'micro', 'v2', 'v3',
];

function titleFromSlug(slug, category) {
  let parts = slug.split('-');
  const prefix = category;
  if (parts[0] === prefix) parts.shift();           // drop category prefix
  let changed = true;
  while (changed && parts.length > 1) {
    changed = false;
    const last  = parts[parts.length - 1];
    const last2 = parts.length >= 2 ? parts.slice(-2).join('-') : '';
    if (STRIP_SUFFIXES.includes(last)) { parts.pop(); changed = true; }
    else if (last2 && STRIP_PLACEMENTS.includes(last2)) { parts.pop(); parts.pop(); changed = true; }
    else if (STRIP_PLACEMENTS.includes(last)) { parts.pop(); changed = true; }
  }
  return parts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── WebP generation ────────────────────────────────────────────────────────
let converted = 0;

function imageDims(p) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', p]).toString();
  const w = Number((out.match(/pixelWidth:\s*(\d+)/) || [])[1]);
  const h = Number((out.match(/pixelHeight:\s*(\d+)/) || [])[1]);
  return { w, h };
}

function makeWebp(srcPath, outPath, target) {
  // Skip if output exists and is newer than the source
  if (fs.existsSync(outPath) && fs.statSync(outPath).mtime >= fs.statSync(srcPath).mtime) return false;
  // Cap the LONGER side at `target`, and never upscale a smaller image
  const { w, h } = imageDims(srcPath);
  const args = ['-quiet', '-q', String(QUALITY)];
  if (Math.max(w, h) > target) {
    if (w >= h) args.push('-resize', String(target), '0'); // landscape → constrain width
    else        args.push('-resize', '0', String(target)); // portrait  → constrain height
  }
  args.push(srcPath, '-o', outPath);
  execFileSync('cwebp', args);
  // Preserve the source's modified time so "newest photos" ordering stays correct
  const srcMtime = fs.statSync(srcPath).mtime;
  fs.utimesSync(outPath, srcMtime, srcMtime);
  converted++;
  return true;
}

// ─── Scan a category folder → list of {slug, category, full, sm, mtime} ──────
function getImages(category) {
  const dir = path.join(GALLERY_DIR, category);
  if (!fs.existsSync(dir)) return [];

  const sources = fs.readdirSync(dir)
    .filter(f => SOURCE_EXTS.includes(path.extname(f)) && !f.startsWith('.'));

  const outDir = path.join(OPT_DIR, category);
  fs.mkdirSync(outDir, { recursive: true });

  return sources.map(file => {
    const slug    = path.basename(file, path.extname(file));
    const srcPath = path.join(dir, file);
    const fullRel = `images/optimized/${category}/${slug}.webp`;
    const smRel   = `images/optimized/${category}/${slug}-sm.webp`;
    makeWebp(srcPath, path.join(outDir, `${slug}.webp`),    FULL_WIDTH);
    makeWebp(srcPath, path.join(outDir, `${slug}-sm.webp`), SM_WIDTH);
    return { slug, category, full: fullRel, sm: smRel, mtime: fs.statSync(srcPath).mtime };
  });
}

const allImages = Object.keys(CATEGORIES).flatMap(getImages);

if (allImages.length === 0) {
  console.log('⚠️  No source photos found in category folders. Add photos and try again.');
  process.exit(0);
}

// ─── Marker-based replace helper (robust — no fragile index math) ────────────
function replaceBetween(html, startMarker, endMarker, replacement, file) {
  const s = html.indexOf(startMarker);
  const e = html.indexOf(endMarker);
  if (s === -1 || e === -1) {
    console.error(`❌  Could not find markers ${startMarker} / ${endMarker} in ${file}.`);
    process.exit(1);
  }
  return html.slice(0, s) + startMarker + '\n' + replacement + '\n        ' + endMarker + html.slice(e + endMarker.length);
}

// ─── 1. Gallery grid ─────────────────────────────────────────────────────────
function galleryItem(img) {
  const alt = CATEGORIES[img.category].alt;
  return `          <div class="gallery-item" data-category="${img.category}">
            <img src="${img.full}" srcset="${img.sm} 760w, ${img.full} 1400w" sizes="${SIZES}" alt="${alt}" loading="lazy" />
          </div>`;
}

const galleryGrid =
  `        <div class="gallery-grid">\n` +
  allImages.slice().sort((a, b) => a.slug.localeCompare(b.slug)).map(galleryItem).join('\n\n') +
  `\n        </div>`;

let galleryHtml = fs.readFileSync(GALLERY_HTML, 'utf8');
galleryHtml = replaceBetween(galleryHtml, '<!-- gallery-grid-start -->', '<!-- gallery-grid-end -->', galleryGrid, 'gallery.html');
fs.writeFileSync(GALLERY_HTML, galleryHtml, 'utf8');

// ─── 2. Homepage featured work (6 newest) ────────────────────────────────────
const newest6 = allImages.slice().sort((a, b) => b.mtime - a.mtime).slice(0, 6);

function workCard(img) {
  const title = titleFromSlug(img.slug, img.category);
  const style = CATEGORIES[img.category].style;
  const alt   = `${title} tattoo — ${style} by Aliza Nadine Phoenix AZ`;
  return `          <div class="work-card fade-in" data-src="${img.full}" data-alt="${alt}">
            <img src="${img.full}" srcset="${img.sm} 760w, ${img.full} 1400w" sizes="${SIZES}" alt="${alt}" loading="lazy" />
            <div class="work-overlay">
              <h3>${title}</h3>
              <p>${style}</p>
            </div>
          </div>`;
}

const workGrid =
  `        <div class="work-grid">\n` +
  newest6.map(workCard).join('\n') +
  `\n        </div>`;

let indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');
indexHtml = replaceBetween(indexHtml, '<!-- work-grid-start -->', '<!-- work-grid-end -->', workGrid, 'index.html');
fs.writeFileSync(INDEX_HTML, indexHtml, 'utf8');

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n✅  ${allImages.length} photos processed (${converted} WebP file${converted !== 1 ? 's' : ''} (re)generated):\n`);
Object.keys(CATEGORIES).forEach(cat => {
  const count = allImages.filter(i => i.category === cat).length;
  if (count) console.log(`   ${CATEGORIES[cat].label.padEnd(12)} ${count}`);
});
console.log(`\n✅  Homepage featuring 6 newest:`);
newest6.forEach(img => console.log(`   • ${titleFromSlug(img.slug, img.category)} (${CATEGORIES[img.category].style})`));
console.log('\nNext: git add . && git commit -m "add photos" && git push\n');
