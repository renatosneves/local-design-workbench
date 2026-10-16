import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import puppeteer from 'puppeteer';
import {browserArgs,isolatePage} from '../scripts/security.mjs';
test('real Chromium renders local content and blocks HTTP and popup leakage',async()=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'design-browser-')));
 let hits=0;const trap=http.createServer((q,r)=>{hits++;r.end('leak');});await new Promise(r=>trap.listen(0,'127.0.0.1',r));const port=trap.address().port;
 fs.writeFileSync(path.join(root,'page.html'),`<h1>Dummy preview</h1><script>fetch('http://127.0.0.1:${port}/fetch').catch(()=>{});new Image().src='http://127.0.0.1:${port}/image';window.open('http://127.0.0.1:${port}/popup');</script>`);
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.DESIGN_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:browserArgs});
 try{const page=await browser.newPage();await isolatePage(page,root);await page.goto(pathToFileURL(path.join(root,'page.html')).href,{waitUntil:'networkidle0'});assert.equal(await page.$eval('h1',e=>e.textContent),'Dummy preview');assert.equal(hits,0);await page.pdf({path:path.join(root,'dummy.pdf')});assert.ok(fs.statSync(path.join(root,'dummy.pdf')).size>1000);}finally{await browser.close();await new Promise(r=>trap.close(r));}
});
