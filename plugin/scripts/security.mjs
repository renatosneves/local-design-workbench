import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function inside(root, target) {
  const rel=path.relative(root,target);
  return rel!=='' && !rel.startsWith('..'+path.sep) && rel!=='..' && !path.isAbsolute(rel);
}
export function exportPaths(input, output, extension) {
  const root=fs.realpathSync(path.resolve('artifacts'));
  const source=fs.realpathSync(path.resolve(input));
  if(!inside(root,source)||!fs.statSync(source).isFile()||!source.endsWith('.html')) throw Error('Input must be an HTML file inside artifacts');
  const destination=path.resolve(output||input.replace(/\.html$/,extension));
  const parent=fs.realpathSync(path.dirname(destination));
  if(!(parent===root||inside(root,parent))||!destination.endsWith(extension)) throw Error('Output must stay inside artifacts');
  if(fs.existsSync(destination)) throw Error('Output already exists; choose a new filename');
  return {source,destination,root:fs.realpathSync(path.dirname(source))};
}
export function allowedRequest(url, root) {
  try {
    const u=new URL(url);
    if(u.protocol==='data:'||u.protocol==='blob:') return true;
    if(u.protocol!=='file:'||u.host) return false;
    const p=fs.realpathSync(fileURLToPath(u));
    return inside(root,p)&&fs.statSync(p).isFile()&&!path.relative(root,p).split(path.sep).some(x=>x.startsWith('.'));
  } catch {return false;}
}
export const browserArgs=['--host-resolver-rules=MAP * ~NOTFOUND','--disable-background-networking','--disable-quic','--force-webrtc-ip-handling-policy=disable_non_proxied_udp'];
export async function isolatePage(page,root) {
  await page.setRequestInterception(true);
  page.on('request',r=>allowedRequest(r.url(),root)?r.continue():r.abort());
  page.on('popup',p=>p.close().catch(()=>{}));
  const cdp=await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs',{urls:['http://*','https://*','ws://*','wss://*','ftp://*']});
}

export function saveNewFile(destination, bytes) {
  fs.writeFileSync(destination, bytes, {flag:'wx', mode:0o600});
}
