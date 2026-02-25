const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');
const searchString = 'https://guardiansos-backend.onrender.com';
const replacementString = "${import.meta.env.VITE_API_URL || 'http://localhost:5000'}";
const replacementStringStatic = "(import.meta.env.VITE_API_URL || 'http://localhost:5000')";

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchString)) {
        // Handle template literal interpolations, e.g. `https://.../api/auth/me` => `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/me`
        // Also handle static strings, e.g. 'https://...' => (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/...'

        let newContent = content.replace(/['"`]https:\/\/guardiansos-backend\.onrender\.com([^'"`]*)['"`]/g, (match, p1, offset, string) => {
            const isTemplate = match.startsWith('`');
            if (isTemplate) {
                return `\`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${p1}\``;
            } else {
                return `(import.meta.env.VITE_API_URL || 'http://localhost:5000') + '${p1}'`;
            }
        });

        // Some might be used directly in io(), e.g. io('https://...')
        newContent = newContent.replace(/io\(['"`]https:\/\/guardiansos-backend\.onrender\.com['"`]\)/g, "io(import.meta.env.VITE_API_URL || 'http://localhost:5000')");

        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function walkDir(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            walkDir(filePath);
        } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
            replaceInFile(filePath);
        }
    });
}

walkDir(directoryPath);
console.log('Replacement complete.');
