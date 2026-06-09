#!/usr/bin/env node
/**
 * ALIZA NADINE — Auto Gallery + Homepage Builder
 * ------------------------------------------------
 * Drop photos into the right folder, then run:
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
 * This script:
 *   1. Rewrites the gallery grid in gallery.html
 *   2. Rewrites the 6 featured work cards on index.html
 *      with the 6 most recently added photos
 */

const fs   = require('fs');
const path = require('path');

const GALLERY_HTML  = path.join(__dirname, 'gallery.html');
const INDEX_HTML    = path.join(__dirname, 'index.html');
const GALLERY_DIR   = path.join(__dirname, 'images', 'gallery');

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG'];

// Category config
const CATEGORIES = {
  realism:   { label: 'Realism',    style: 'Black & Grey',  alt: 'Black and grey realism tattoo by Aliza Nadine Phoenix AZ' },
  linework:  { label: 'Line Work',  style: 'Fine Line',     alt: 'Fine line tattoo by Aliza Nadine Phoenix AZ' },
  blackwork: { label: 'Black Work', style: 'Black Work',    alt: 'Black work tattoo by Aliza Nadine at Jacob J Ink Phoenix AZ' },
  coverups:  { label: 'Cover Ups',  style: 'Cover Up',      alt: 'Cover up tattoo by Aliza Nadine at Jacob J Ink Phoenix AZ' },
  freehand:  { label: 'Free Hand',  style: 'Free Hand',     alt: 'Free hand tattoo by Aliza Nadine at Jacob J Ink Phoenix AZ' },
  script:    { label: 'Script',     style: 'Script',        alt: 'Custom script lettering tattoo by Aliza Nadine Phoenix' },
  flash:     { label: 'Flash',      style: 'Flash',         alt: 'Flash tattoo design by Aliza Nadine at Jacob J Ink Phoenix' },
};

// Words to strip when generating a human title from filename
const STRIP_SUFFIXES = [
  'phoenix-az', 'phoenix-arizona', 'phoenix', 'arizona', 'az',
];
const STRIP_PLACEMENTS = [
  'forearm', 'upper-arm', 'upper', 'lower', 'arm', 'wrist', 'hand', 'finger',
  'torso', 'stomach', 'rib', 'ribs', 'back', 'chest', 'shoulder',
  'thigh', 'calf', 'ankle', 'foot', 'behind-ear', 'ear', 'neck', 'leg',
  'sleeve', 'micro', 'v2', 'v3',
];

// Generate a readable title from a filename like:
//   realism-lion-leaves-forearm-phoenix-az.jpg  →  "Lion Leaves"
function titleFromFilename(file, category) {
  let name = path.basename(file, path.extname(file));

  // Remove category prefix
  const prefix = category + '-';
  if (name.startsWith(prefix)) name = name.slice(prefix.length);

  // Strip location + placement words from the end, trying 2-word combos before singles
  let parts = name.split('-');
  let changed = true;
  while (changed && parts.length > 1) {
    changed = false;
    const last  = parts[parts.length - 1];
    const last2 = parts.length >= 2 ? parts.slice(-2).join('-') : '';
    if (STRIP_SUFFIXES.includes(last)) {
      parts.pop(); changed = true;
    } else if (last2 && STRIP_PLACEMENTS.includes(last2)) {
      parts.pop(); parts.pop(); changed = true;
    } else if (STRIP_PLACEMENTS.includes(last)) {
      parts.pop(); changed = true;
    }
  }

  // Title-case remaining words
  return parts
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Scan each category folder, return images with mtime
function getImages(category) {
  const dir = path.join(GALLERY_DIR, category);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => IMAGE_EXTS.includes(path.extname(f)) && !f.startsWith('.'))
    .map(f => {
      const fullPath = path.join(dir, f);
      const mtime = fs.statSync(fullPath).mtime;
      return { file: f, category, mtime };
    });
}

// Collect all images across all categories
const allImages = Object.keys(CATEGORIES).flatMap(getImages);

if (allImages.length === 0) {
  console.log('⚠️  No images found in category folders. Add photos and try again.');
  process.exit(0);
}

// ─── 1. Rebuild gallery.html ───────────────────────────────────────────────

function galleryItemHTML(img) {
  const { file, category } = img;
  const src = `images/gallery/${category}/${file}`;
  const alt = CATEGORIES[category].alt;
  return `
          <div class="gallery-item" data-category="${category}">
            <img src="${src}" alt="${alt}" loading="lazy" />
          </div>`;
}

const galleryGridHTML =
  `        <div class="gallery-grid">\n` +
  allImages
    .slice()
    .sort((a, b) => a.file.localeCompare(b.file)) // stable alphabetical for gallery
    .map(galleryItemHTML).join('\n') + '\n\n' +
  `        </div>`;

let galleryHtml = fs.readFileSync(GALLERY_HTML, 'utf8');
const GALLERY_START = '        <div class="gallery-grid">';
const gStart = galleryHtml.indexOf(GALLERY_START);
if (gStart === -1) {
  console.error('❌  Could not find gallery grid in gallery.html.');
  process.exit(1);
}
// Find the closing </div> of the gallery grid
const lastGalleryItem = galleryHtml.lastIndexOf('</div>', galleryHtml.indexOf('<!-- CTA'));
const gEnd = galleryHtml.indexOf('</div>', lastGalleryItem + 6) + 6;
galleryHtml = galleryHtml.slice(0, gStart) + galleryGridHTML + galleryHtml.slice(gEnd);
fs.writeFileSync(GALLERY_HTML, galleryHtml, 'utf8');

// ─── 2. Rebuild index.html work grid with the 6 newest images ──────────────

// Sort ALL images by mtime descending, take newest 6
const newest6 = allImages
  .slice()
  .sort((a, b) => b.mtime - a.mtime)
  .slice(0, 6);

function workCardHTML(img) {
  const { file, category } = img;
  const src   = `images/gallery/${category}/${file}`;
  const title = titleFromFilename(file, category);
  const style = CATEGORIES[category].style;
  const alt   = `${title} tattoo — ${style} by Aliza Nadine Phoenix AZ`;
  return `          <div class="work-card fade-in" data-src="${src}" data-alt="${alt}">
            <img src="${src}" alt="${alt}" loading="lazy" />
            <div class="work-overlay">
              <h3>${title}</h3>
              <p>${style}</p>
            </div>
          </div>`;
}

const workGridHTML =
  `        <!-- work-grid-start -->\n` +
  `        <div class="work-grid">\n` +
  newest6.map(workCardHTML).join('\n') + '\n' +
  `        </div>\n` +
  `        <!-- work-grid-end -->`;

let indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');
const WG_START = '        <!-- work-grid-start -->';
const WG_END   = '        <!-- work-grid-end -->';
const wgStart = indexHtml.indexOf(WG_START);
const wgEnd   = indexHtml.indexOf(WG_END) + WG_END.length;

if (wgStart === -1 || wgEnd === -1) {
  console.error('❌  Could not find work-grid markers in index.html.');
  process.exit(1);
}

indexHtml = indexHtml.slice(0, wgStart) + workGridHTML + indexHtml.slice(wgEnd);
fs.writeFileSync(INDEX_HTML, indexHtml, 'utf8');

// ─── Summary ───────────────────────────────────────────────────────────────

console.log(`\n✅  Gallery updated with ${allImages.length} photos:\n`);
Object.keys(CATEGORIES).forEach(cat => {
  const count = allImages.filter(i => i.category === cat).length;
  if (count) console.log(`   ${CATEGORIES[cat].label.padEnd(12)} ${count} photo${count !== 1 ? 's' : ''}`);
});
console.log(`\n✅  Homepage updated with 6 newest photos:`);
newest6.forEach(img => {
  console.log(`   • ${titleFromFilename(img.file, img.category)} (${CATEGORIES[img.category].style})`);
});
console.log('\nNext steps:');
console.log('  git add .');
console.log('  git commit -m "add photos"');
console.log('  git push\n');
