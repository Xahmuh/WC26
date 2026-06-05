const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '../dist');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

if (!fs.existsSync(DIST_DIR)) {
  console.log('Dist directory does not exist.');
  process.exit(0);
}

console.log('Cleaning HTML files in dist/ to fix compatibility and validation issues...');

walkDir(DIST_DIR, filePath => {
  if (path.extname(filePath) !== '.html') return;

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Fix missing/empty <title> tag
  content = content.replace(
    /<title data-rh="true"><\/title>/g,
    '<title data-rh="true">WC26 Predictor</title>'
  );

  // 2. Fix unsupported '-ms-text-size-adjust' and '-webkit-text-size-adjust' in stylesheet
  content = content.replace(
    /html\{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;/g,
    'html{text-size-adjust:100%;-webkit-text-size-adjust:100%;'
  );

  // 3. Fix '-webkit-overflow-scrolling' warning
  content = content.replace(
    /\.r-150rngu\{-webkit-overflow-scrolling:touch;\}/g,
    '.r-150rngu{}'
  );

  // 4. Fix 'forced-color-adjust' warning
  content = content.replace(
    /\.r-1c6unfx\{forced-color-adjust:none;\}/g,
    '.r-1c6unfx{}'
  );

  // 5. Fix 'scrollbar-width' warning
  content = content.replace(
    /\.r-2eszeu\{scrollbar-width:none;\}/g,
    '.r-2eszeu{}'
  );

  // 6. Fix inline style on spinner container div
  content = content.replace(
    /<div class="css-g5y9jx" style="flex:1">/g,
    '<div class="css-g5y9jx r-13awgt0">'
  );

  // 7. Fix progressbar accessibility title
  content = content.replace(
    /<div role="progressbar" aria-valuemax="1" aria-valuemin="0" class="/g,
    '<div role="progressbar" aria-valuemax="1" aria-valuemin="0" title="Loading" class="'
  );

  // 8. Fix inline styles on progressbar SVG elements
  content = content.replace(
    /style="stroke:#C9DF6A;opacity:0.2"/g,
    'stroke="#C9DF6A" opacity="0.2"'
  );
  content = content.replace(
    /style="stroke:#C9DF6A;stroke-dasharray:80;stroke-dashoffset:60"/g,
    'stroke="#C9DF6A" stroke-dasharray="80" stroke-dashoffset="60"'
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`- Fixed: ${path.relative(DIST_DIR, filePath)}`);
  }
});

console.log('Done cleaning HTML files!');
