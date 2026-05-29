/**
 * Print how to clear the identity gallery (browser localStorage).
 * Run: npm run clear-identities
 * Or double-click: clear-identities.bat
 */
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const bat = path.join(ROOT, 'clear-identities.bat');

console.log('');
console.log('Identity gallery is stored in your browser (localStorage), not on disk.');
console.log('');
console.log('To clear all saved identities:');
console.log('  1. Double-click clear-identities.bat');
console.log('     — or open clear-identities.html in the same tab origin as the app');
console.log('');
console.log('  2. Use the tab that loads, then click "Back to Blue Room"');
console.log('');
console.log('Manual URLs (pick the one you use for the app):');
console.log('  http://127.0.0.1:5500/clear-identities.html   (Live Server)');
console.log('  http://localhost:8080/clear-identities.html   (npm start)');
console.log('');

if (process.platform === 'win32') {
  exec(`start "" "${bat}"`, (err) => {
    if (err) console.log('Could not launch clear-identities.bat automatically.');
  });
}
