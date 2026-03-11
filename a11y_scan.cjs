const fs = require('fs');
const path = require('path');

function scanDirectory(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(scanDirectory(file));
        } else if (file.endsWith('.tsx')) {
            const content = fs.readFileSync(file, 'utf-8');

            // Look for <Button size="icon" without aria-label
            const buttonRegex = /<Button([^>]*(?:size="icon"|size=\{['"]icon['"]\})[^>]*)>/g;
            let match;
            while ((match = buttonRegex.exec(content)) !== null) {
                if (!match[1].includes('aria-label') && !match[1].includes('title=')) { // sometimes title is used instead of aria-label
                    results.push({
                        type: 'button-no-aria-label',
                        file: file,
                        line: content.substring(0, match.index).split('\n').length,
                        match: match[0]
                    });
                }
            }

            // Look for <img without alt
            const imgRegex = /<img([^>]+)>/g;
            while ((match = imgRegex.exec(content)) !== null) {
                if (!match[1].includes('alt=')) {
                    results.push({
                        type: 'img-no-alt',
                        file: file,
                        line: content.substring(0, match.index).split('\n').length,
                        match: match[0]
                    });
                }
            }
        }
    });
    return results;
}

const issues = scanDirectory('src');
console.log(`Found ${issues.length} issues.`);

// Group by type and file
const summary = issues.reduce((acc, issue) => {
    if (!acc[issue.file]) acc[issue.file] = [];
    acc[issue.file].push(issue);
    return acc;
}, {});

// Print top files with most issues
Object.entries(summary)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15)
    .forEach(([file, issues]) => {
        console.log(`${file}: ${issues.length} issues`);
        issues.forEach(issue => console.log(`  Line ${issue.line}: ${issue.type} - ${issue.match.trim()}`));
    });
