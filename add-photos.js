#!/usr/bin/env node
/**
 * ALIZA NADINE — Auto Gallery Builder
 * ------------------------------------
 * Drop photos into the right folder, then run:
 *   node add-photos.js
 *
 * Folders:
 *   images/gallery/realism/   → Black & grey realism work
 *   images/gallery/linework/  → Fine line & botanical
 *   images/gallery/script/    → Lettering & script
 *   images/gallery/flash/     → Flash designs
 *
 * This script scans those folders and rewrites the gallery
 * grid in gallery.html automatically.
 */

const fs   = require('fs');
const path = require('path');

const GALLERY_HTML = path.join(__dirname, 'gallery.html');
const GALLERY_DIR  = path.join(__dirname, 'images', 'gallery');

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG'];

// Category config — display name + SEO alt text template
const CATEGORIES = {
  realism:  { label: 'Realism',   alt: 'Black and grey realism tattoo by Aliza Nadine Phoenix AZ' },
  linework: { label: 'Line Work', alt: 'Fine line tattoo by Aliza Nadine Phoenix AZ' },
  script:   { label: 'Script',    alt: 'Custom script lettering tattoo by Aliza Nadine Phoenix' },
  flash:    { label: 'Flash',     alt: 'Flash tattoo design by Aliza Nadine at Jacob J Ink Phoenix' },
};

// Scan each category folder
function getImages(category) {
  const dir = path.join(GALLERY_DIR, category);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => IMAGE_EXTS.includes(path.extname(f)))
    .sort()
    .map(f => ({ file: f, category }));
}

// Build HTML for a single gallery item
function itemHTML(img) {
  const { file, category } = img;
  const src = `images/gallery/${category}/${file}`;
  const alt = CATEGORIES[category].alt;
  return `
          <div class="gallery-item" data-category="${category}">
            <img src="${src}" alt="${alt}" loading="lazy" />
          </div>`;
}

// Collect all images across all categories
const allImages = Object.keys(CATEGORIES).flatMap(getImages);

if (allImages.length === 0) {
  console.log('⚠️  No images found in category folders. Add photos and try again.');
  process.exit(0);
}

// Build the new gallery grid HTML
const gridHTML =
  `        <div class="gallery-grid">\n` +
  allImages.map(itemHTML).join('\n') + '\n\n' +
  `        </div>`;

// Replace the gallery grid block in gallery.html
let html = fs.readFileSync(GALLERY_HTML, 'utf8');
const START = '        <div class="gallery-grid">';
const END   = '        </div>\n        <!-- /gallery-grid -->';

// Find the block between START and the closing </div> after the last gallery-item
const startIdx = html.indexOf(START);
if (startIdx === -1) {
  console.error('❌  Could not find gallery grid in gallery.html. Make sure it contains:\n        <div class="gallery-grid">');
  process.exit(1);
}

// Find the matching closing </div> — count depth
let depth = 0, i = startIdx, endIdx = -1;
while (i < html.length) {
  if (html.slice(i, i + 5) === '<div ') depth++;
  if (html.slice(i, i + 13) === '<div class="g') depth++;
  if (html[i] === '<' && html.slice(i, i+4) === '<div') depth++;
  if (html.slice(i, i + 6) === '</div>') {
    if (depth <= 1) { endIdx = i + 6; break; }
    depth--;
  }
  i++;
}

// Simpler approach: just find from start to end of last </div> in the grid
const gridStart = html.indexOf(START);
// Find end by looking for the next occurrence of the post-grid comment or CTA section
let gridEnd = html.indexOf('\n        <!-- /gallery-grid -->', gridStart);
if (gridEnd !== -1) {
  // legacy marker present
  html = html.slice(0, gridStart) + gridHTML + html.slice(gridEnd + '\n        <!-- /gallery-grid -->'.length);
} else {
  // Find end of gallery-grid div by scanning for its closing tag
  // The grid starts with <div class="gallery-grid"> and ends with </div>
  // followed immediately by a blank line and the CTA section
  const afterGrid = html.indexOf('\n\n        </div>\n\n        <!-- CTA', gridStart);
  const simpleEnd = html.indexOf('</div>', html.lastIndexOf('gallery-item', html.indexOf('<!-- CTA')));

  // Most reliable: find last gallery-item closing tag, then its parent </div>
  const lastItem  = html.lastIndexOf('</div>\n\n        </div>', html.indexOf('<!-- CTA'));
  if (lastItem !== -1) {
    const closeGrid = html.indexOf('</div>', lastItem + 6) + 6;
    html = html.slice(0, gridStart) + gridHTML + html.slice(closeGrid);
  } else {
    console.error('❌  Could not find end of gallery grid. Please run again or contact support.');
    process.exit(1);
  }
}

fs.writeFileSync(GALLERY_HTML, html, 'utf8');

console.log(`\n✅  Gallery updated with ${allImages.length} photos:\n`);
Object.keys(CATEGORIES).forEach(cat => {
  const count = allImages.filter(i => i.category === cat).length;
  if (count) console.log(`   ${CATEGORIES[cat].label.padEnd(12)} ${count} photo${count !== 1 ? 's' : ''}`);
});
console.log('\nNext steps:');
console.log('  git add .');
console.log('  git commit -m "add photos"');
console.log('  git push\n');
