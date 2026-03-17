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

// A mapping of common icons inside <Button> to their aria-labels in Portuguese
const iconLabels = {
    'Trash': 'Excluir',
    'Trash2': 'Excluir',
    'Edit': 'Editar',
    'Edit2': 'Editar',
    'Pencil': 'Editar',
    'Plus': 'Adicionar',
    'Settings': 'Configurações',
    'MoreVertical': 'Mais opções',
    'MoreHorizontal': 'Mais opções',
    'X': 'Fechar',
    'Close': 'Fechar',
    'ChevronLeft': 'Anterior',
    'ChevronRight': 'Próximo',
    'ChevronUp': 'Subir',
    'ChevronDown': 'Descer',
    'Copy': 'Copiar',
    'Play': 'Reproduzir',
    'Pause': 'Pausar',
    'Search': 'Pesquisar',
    'Download': 'Baixar',
    'Upload': 'Enviar',
    'Save': 'Salvar',
    'RefreshCw': 'Atualizar',
    'Share': 'Compartilhar',
    'Link': 'Copiar link',
    'Eye': 'Visualizar',
    'Maximize': 'Maximizar',
    'Mic': 'Gravar áudio',
    'Send': 'Enviar',
    'MessageSquare': 'Mensagem',
    'Check': 'Confirmar',
};

function autoFixAriaLabels(file) {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Find <Button size="icon" missing aria-label
  // A regex won't capture the entire block reliably if it's nested or multi-line.
  // We can try to look at lines after `<Button` until `</Button>` to find `<IconName`
  let changed = false;

  let parts = content.split(/<Button/);
  if (parts.length > 1) {
      let newContent = parts[0];
      for (let i = 1; i < parts.length; i++) {
          let part = parts[i];
          // Determine if this is an icon button
          let buttonOpenEnd = part.indexOf('>');
          if (buttonOpenEnd !== -1) {
              let buttonOpenTag = part.substring(0, buttonOpenEnd);
              if (buttonOpenTag.includes('size="icon"') || buttonOpenTag.includes("size={'icon'}")) {
                  if (!buttonOpenTag.includes('aria-label=')) {
                      // We need to guess the aria-label
                      // Let's look for known icons in this part until </Button>
                      let buttonCloseEnd = part.indexOf('</Button>');
                      let buttonContent = buttonCloseEnd !== -1 ? part.substring(buttonOpenEnd, buttonCloseEnd) : '';

                      let label = 'Botão de ação'; // Generic fallback if we can't find anything

                      for (let [icon, desc] of Object.entries(iconLabels)) {
                          if (buttonContent.includes(`<${icon}`)) {
                              label = desc;
                              break;
                          }
                      }

                      // Check for Tooltip or title inside?
                      // Actually, if we just inject aria-label
                      part = ` aria-label="${label}"` + part;
                      changed = true;
                  }
              }
          }
          newContent += '<Button' + part;
      }

      if (changed) {
          fs.writeFileSync(file, newContent, 'utf8');
          console.log(`Auto-fixed labels in ${file}`);
      }
  }
}

walkDir(SRC_DIR, autoFixAriaLabels);
