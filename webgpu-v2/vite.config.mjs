import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '../web/public/models/rome');
const included = ['p','r','n','b','q','k'].flatMap(k =>
  ['rigged','idle','walk','attack','death'].map(anim => `${k}-${anim}.glb`));
const output = path.resolve(here, 'dist/models/rome');

export default defineConfig({
  root: here,
  base: process.env.PUBLIC_BASE || '/',
  publicDir: false,
  server: { fs: { allow: [here, path.resolve(here, '..')] } },
  plugins: [{
    name: 'playmoru-same-origin-licensed-roman-assets',
    configureServer(server) {
      server.middlewares.use('/models/rome/', (req, res, next) => {
        const name = (req.url || '').split('?')[0].replace(/^\//, '');
        if (!included.includes(name)) return next();
        const file = path.join(source, name);
        res.setHeader('Content-Type', 'model/gltf-binary');
        fs.createReadStream(file).on('error', next).pipe(res);
      });
    },
    closeBundle() {
      fs.mkdirSync(output, { recursive: true });
      for (const name of included) fs.copyFileSync(path.join(source, name), path.join(output, name));
    }
  }],
  build: { target: 'es2022', outDir: 'dist', emptyOutDir: true }
});
