import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'save-transform-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/save-transform' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                // Ensure the directory exists
                const assetsPath = path.resolve(process.cwd(), 'src/assets');
                if (!fs.existsSync(assetsPath)) {
                  fs.mkdirSync(assetsPath, { recursive: true });
                }
                const transformFilePath = path.join(assetsPath, 'transform.json');
                
                // Write formatted JSON to file
                const parsedBody = JSON.parse(body);
                fs.writeFileSync(transformFilePath, JSON.stringify(parsedBody, null, 2));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                console.error('Failed to save transform:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'INVALID_ANNOTATION') return;
        warn(warning);
      }
    }
  }
})
