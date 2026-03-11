const fs = require('fs');
const path = require('path');

function scanDirectory(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            scanDirectory(file);
        } else if (file.endsWith('.tsx')) {
            processFile(file);
        }
    });
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // We'll replace '<Button' with '<Button aria-label="..."' selectively
    const parts = content.split(/<Button\b/);
    if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
            const endIdx = parts[i].indexOf('>');
            if (endIdx !== -1) {
                const attrs = parts[i].substring(0, endIdx);

                // check if it's size="icon"
                if (attrs.includes('size="icon"') || attrs.includes("size={'icon'}")) {
                    // Check if it already has aria-label or title
                    if (!attrs.includes('aria-label') && !attrs.includes('title=')) {

                        let label = "Ação";
                        const lowerAttrs = attrs.toLowerCase();

                        // Infer action based on common words in onClick, icon, or classNames inside the attributes
                        if (lowerAttrs.includes('delete') || lowerAttrs.includes('trash') || lowerAttrs.includes('remove')) label = "Excluir";
                        else if (lowerAttrs.includes('edit') || lowerAttrs.includes('pencil')) label = "Editar";
                        else if (lowerAttrs.includes('close') || lowerAttrs.includes('cancel') || lowerAttrs.includes(' x ')) label = "Fechar";
                        else if (lowerAttrs.includes('copy')) label = "Copiar";
                        else if (lowerAttrs.includes('send') || lowerAttrs.includes('submit')) label = "Enviar";
                        else if (lowerAttrs.includes('download')) label = "Baixar";
                        else if (lowerAttrs.includes('upload')) label = "Fazer upload";
                        else if (lowerAttrs.includes('play')) label = "Reproduzir";
                        else if (lowerAttrs.includes('pause')) label = "Pausar";
                        else if (lowerAttrs.includes('refresh') || lowerAttrs.includes('sync')) label = "Atualizar";
                        else if (lowerAttrs.includes('search')) label = "Buscar";
                        else if (lowerAttrs.includes('next') || lowerAttrs.includes('right') || lowerAttrs.includes('forward')) label = "Avançar";
                        else if (lowerAttrs.includes('prev') || lowerAttrs.includes('left') || lowerAttrs.includes('back')) label = "Voltar";
                        else if (lowerAttrs.includes('zoomin')) label = "Aumentar zoom";
                        else if (lowerAttrs.includes('zoomout')) label = "Diminuir zoom";
                        else if (lowerAttrs.includes('add') || lowerAttrs.includes('plus')) label = "Adicionar";
                        else if (lowerAttrs.includes('minus')) label = "Remover";
                        else if (lowerAttrs.includes('settings') || lowerAttrs.includes('config')) label = "Configurações";

                        // Check the inner HTML of the button for Icons
                        const closeIdx = parts[i].indexOf('</Button>');
                        if (closeIdx !== -1) {
                            const innerHtml = parts[i].substring(endIdx + 1, closeIdx).toLowerCase();
                            if (label === "Ação") {
                                if (innerHtml.includes('trash')) label = "Excluir";
                                else if (innerHtml.includes('edit') || innerHtml.includes('pencil')) label = "Editar";
                                else if (innerHtml.includes('x') || innerHtml.includes('close')) label = "Fechar";
                                else if (innerHtml.includes('copy')) label = "Copiar";
                                else if (innerHtml.includes('send')) label = "Enviar";
                                else if (innerHtml.includes('download')) label = "Baixar";
                                else if (innerHtml.includes('upload')) label = "Fazer upload";
                                else if (innerHtml.includes('refresh')) label = "Atualizar";
                                else if (innerHtml.includes('search')) label = "Buscar";
                                else if (innerHtml.includes('play')) label = "Reproduzir";
                                else if (innerHtml.includes('pause')) label = "Pausar";
                                else if (innerHtml.includes('plus')) label = "Adicionar";
                                else if (innerHtml.includes('minus')) label = "Remover";
                                else if (innerHtml.includes('settings')) label = "Configurações";
                                else if (innerHtml.includes('chevronleft') || innerHtml.includes('arrowleft')) label = "Voltar";
                                else if (innerHtml.includes('chevronright') || innerHtml.includes('arrowright')) label = "Avançar";
                                else if (innerHtml.includes('eye')) label = "Visualizar";
                                else if (innerHtml.includes('check')) label = "Confirmar";
                                else if (innerHtml.includes('link')) label = "Link";
                                else if (innerHtml.includes('wand2') || innerHtml.includes('sparkles')) label = "Gerar com IA";
                            }
                        }

                        parts[i] = ` aria-label="${label}"` + parts[i];
                        modified = true;
                    }
                }
            }
        }
        if (modified) content = parts.join('<Button');
    }

    // Process Images without alt
    const imgParts = content.split(/<img\b/);
    if (imgParts.length > 1) {
        for (let i = 1; i < imgParts.length; i++) {
            const endIdx = imgParts[i].indexOf('>');
            if (endIdx !== -1) {
                const attrs = imgParts[i].substring(0, endIdx);
                if (!attrs.includes('alt=')) {
                    imgParts[i] = ` alt="Imagem"` + imgParts[i];
                    modified = true;
                }
            }
        }
        if (modified) content = imgParts.join('<img');
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${filePath}`);
    }
}

scanDirectory('src');
