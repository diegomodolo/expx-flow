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

function fixImgs(file) {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Let's check for <img using regex
  // Find <img [anything until >]
  const regex = /<img([\s\S]*?)>/gi;
  let newContent = content.replace(regex, (match, p1) => {
    if (!p1.includes('alt=')) {
        changed = true;
        return `<img alt="Imagem descritiva"${p1}>`;
    }
    return match;
  });

  if (changed) {
     fs.writeFileSync(file, newContent, 'utf8');
     console.log(`Updated images in ${file}`);
  }
}

walkDir(SRC_DIR, fixImgs);
