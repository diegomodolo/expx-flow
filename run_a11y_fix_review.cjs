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

  // Let's remove duplicate alt attributes first
  let newContent = content.replace(/<img(.*?)alt="Imagem descritiva"(.*?)alt=(.*?)>/g, '<img$1$2alt=$3>');
  newContent = newContent.replace(/<img(.*?)alt=(.*?)alt="Imagem descritiva"(.*?)>/g, '<img$1alt=$2$3>');

  if (newContent !== content) {
      changed = true;
      content = newContent;
  }

  // Let's replace generic aria-label="Ação" with the title if it exists, otherwise leave it or use a better one
  newContent = content.replace(/<Button\s+aria-label="Ação"([\s\S]*?)title="([^"]+)"/g, '<Button aria-label="$2"$1title="$2"');
  newContent = newContent.replace(/<Button\s+([\s\S]*?)title="([^"]+)"([\s\S]*?)aria-label="Ação"/g, '<Button $1title="$2"$3aria-label="$2"');

  if (newContent !== content) {
      changed = true;
      content = newContent;
  }

  // If there's still generic "Ação", let's see what's inside the button
  // For example <Trash2 ... /> -> "Excluir"
  // But doing this with regex is very hard. Let's just remove "Ação" and do it manually if it doesn't have a title
  // Actually, wait, let's find the ones that still have aria-label="Ação"

  if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated attributes in ${file}`);
  }
}

walkDir(SRC_DIR, fixImgs);
