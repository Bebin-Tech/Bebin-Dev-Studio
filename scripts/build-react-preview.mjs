import {copyFileSync} from 'node:fs';
copyFileSync('lib/generated-style.css','lib/react-client/styles.css');
import {build} from 'esbuild';
await build({
  entryPoints: ['lib/react-client/main.jsx'], outfile: 'lib/react-preview.bundle.js',
  bundle: true, format: 'iife', platform: 'browser', target: 'es2022', jsx: 'automatic',
  minify: true, define: {'process.env.NODE_ENV':'"production"'}, legalComments: 'inline'
});
console.log('React preview compiled from exportable JSX components.');
