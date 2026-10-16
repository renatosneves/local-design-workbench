import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import http from 'node:http';
import {spawnSync,spawn} from 'node:child_process';
import {allowedRequest,exportPaths,browserArgs,saveNewFile} from '../scripts/security.mjs';
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'design-test-')));
fs.mkdirSync(path.join(root,'artifacts'));fs.writeFileSync(path.join(root,'artifacts/page.html'),'<h1>Dummy</h1>');fs.writeFileSync(path.join(root,'secret.txt'),'dummy secret');fs.symlinkSync(path.join(root,'secret.txt'),path.join(root,'artifacts/leak.html'));
const artifacts=path.join(root,'artifacts');
test('network and symlink requests fail closed',()=>{
 for(const u of ['https://unpkg.com/leak?secret=x','http://127.0.0.1:9','ws://1.1.1.1',pathToFileURL(path.join(artifacts,'leak.html')).href,pathToFileURL(path.join(root,'secret.txt')).href])assert.equal(allowedRequest(u,artifacts),false);
 assert.equal(allowedRequest(pathToFileURL(path.join(artifacts,'page.html')).href,artifacts),true);
 assert.ok(!browserArgs.some(x=>x.includes('no-sandbox')));
});
test('exports stay inside output folder and preserve existing files',()=>{
 const previous=process.cwd();process.chdir(root);
 try{
 assert.equal(exportPaths('artifacts/page.html',null,'.pdf').destination,path.join(artifacts,'page.pdf'));
 assert.throws(()=>exportPaths('artifacts/leak.html',null,'.pdf'));
 assert.throws(()=>exportPaths('artifacts/page.html','../escape.pdf','.pdf'));
 fs.writeFileSync(path.join(artifacts,'page.pdf'),'keep');assert.throws(()=>exportPaths('artifacts/page.html',null,'.pdf'));assert.throws(()=>saveNewFile(path.join(artifacts,'page.pdf'),Buffer.from('replace')));assert.equal(fs.readFileSync(path.join(artifacts,'page.pdf'),'utf8'),'keep');
 }finally{process.chdir(previous);}
});
test('preview blocks traversal, symlinks, listing and DNS rebinding',async()=>{
 const script=path.resolve('scripts/secure-preview.py');const port=48761;
 const server=spawn('python3',[script,String(port)],{cwd:root,stdio:'ignore'});
 try{
 let response;for(let i=0;i<40;i++){try{response=await fetch(`http://127.0.0.1:${port}/page.html`);break;}catch{await new Promise(r=>setTimeout(r,50));}}
 assert.equal(response.status,200);assert.match(response.headers.get('content-security-policy'),/connect-src 'self'/);
 for(const target of ['/','/leak.html','/%2e%2e/secret.txt','/.env'])assert.equal((await fetch(`http://127.0.0.1:${port}${target}`)).status,403);
 assert.equal(await new Promise((resolve,reject)=>{http.get({hostname:'127.0.0.1',port,path:'/page.html',headers:{Host:'evil.example'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);}),403);
 }finally{server.kill();}
});
test('bash guard blocks remote publishing and accepts restricted preview',()=>{
 const guard=path.resolve('plugin/hooks/guard-bash.sh');
 for(const [command,status] of [['git push origin main',2],['gh pr create --title x',2],['python3 -m http.server 4567 --bind 127.0.0.1 --directory artifacts',2],['python3 "${CLAUDE_PLUGIN_ROOT}"/scripts/secure-preview.py 4567',0]]){
 const r=spawnSync('bash',[guard],{input:JSON.stringify({tool_input:{command}}),env:{...process.env,CLAUDE_PROJECT_DIR:root}});assert.equal(r.status,status,command+': '+r.stderr);
 }
});
