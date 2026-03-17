const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ?
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
};

const SRC_DIR = path.join(__dirname, 'src');

function findMissingAriaLabels(file) {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
  let content = fs.readFileSync(file, 'utf8');

  let matches = [...content.matchAll(/<Button[^>]*size=["']icon["'][^>]*>/gi)];
  matches.forEach(m => {
      let tag = m[0];
      if (!tag.includes('aria-label=')) {
          console.log(`Missing aria-label on icon button in ${file}`);
      }
  });
}

walkDir(SRC_DIR, findMissingAriaLabels);
