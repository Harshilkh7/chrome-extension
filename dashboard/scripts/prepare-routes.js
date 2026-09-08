const fs = require('fs');
const path = require('path');

const distDir = path.resolve(process.cwd(), 'dist');
const indexFile = path.join(distDir, 'index.html');
const routes = ['login', 'register', 'dashboard', 'settings'];

if (!fs.existsSync(indexFile)) {
  throw new Error('dist/index.html was not found after Vite build.');
}

const indexHtml = fs.readFileSync(indexFile, 'utf8');

for (const route of routes) {
  const routeDir = path.join(distDir, route);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.join(routeDir, 'index.html'), indexHtml);
}

console.log(`Prepared SPA fallback pages for: ${routes.join(', ')}`);
