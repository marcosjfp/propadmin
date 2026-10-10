import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
const command=process.platform==='win32'?'pnpm.cmd':'pnpm';
const result=spawnSync(command,['--dir','client','build'],{stdio:'inherit',shell:process.platform==='win32'});
if(result.status!==0) process.exit(result.status ?? 1);
// Drop obsolete hashed assets so deployments don't accumulate old bundles.
rmSync('dist',{recursive:true,force:true});
mkdirSync('dist',{recursive:true});
cpSync('client/dist','dist',{recursive:true});
