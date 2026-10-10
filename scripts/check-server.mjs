import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const scratch=path.join(process.cwd(),'tmp');
mkdirSync(scratch,{recursive:true});
const output=mkdtempSync(path.join(scratch,'server-check-'));
const command=process.platform==='win32'?'pnpm.cmd':'pnpm';
let status=1;
try {
  const compile=spawnSync(command,['exec','tsc','-p','tsconfig.json','--noEmit','false','--allowImportingTsExtensions','false','--outDir',output],{stdio:'inherit',shell:process.platform==='win32'});
  if(compile.status===0) {
    const entry=pathToFileURL(path.join(output,'api','index.js')).href;
    // Exercise the emitted production import graph with Node's own ESM loader.
    // VERCEL avoids binding a port; placeholders never connect to a service.
    const check=spawnSync(process.execPath,['--input-type=module','-e',`const {default:app}=await import(${JSON.stringify(entry)}); if(typeof app!=='function') throw new Error('Vercel entrypoint must export the Express handler'); console.log('Native Node ESM server import passed.');`],{
      stdio:'inherit',
      env:{...process.env,VERCEL:'1',NODE_ENV:'production',ENABLE_DEV_LOGIN:'false',DATABASE_URL:'postgresql://fixture:fixture@127.0.0.1:1/fixture?sslmode=verify-full',JWT_SECRET:'native-import-fixture-only-123456789012345678901234',CLIENT_URL:'https://fixture.example',SUPABASE_URL:'https://fixture.example',SUPABASE_SERVICE_ROLE_KEY:'fixture-server-key',DATABASE_SSL_CA:'',TRUST_PROXY_HOPS:'1'},
    });
    status=check.status ?? 1;
  } else status=compile.status ?? 1;
} finally {rmSync(output,{recursive:true,force:true});}
process.exitCode=status;
