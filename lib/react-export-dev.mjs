import {spawn} from 'node:child_process';
import {buildFrontend} from './build-frontend.mjs';
await buildFrontend();
const compiler = await buildFrontend(true);
const server = spawn(process.execPath,['--watch','server.js'],{stdio:'inherit',env:process.env});
async function stop() { server.kill(); await compiler.dispose(); }
process.once('SIGINT',stop);
process.once('SIGTERM',stop);
server.once('exit',async code => { await compiler.dispose(); process.exit(code || 0); });
console.log('React source is watched. Refresh your browser after saving frontend files.');
