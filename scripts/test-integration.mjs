import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
const files=readdirSync('tests').filter(name=>name.endsWith('.test.ts')).map(name=>`tests/${name}`);
const result=spawnSync(process.execPath,['--import','tsx','--test',...files],{stdio:'inherit',env:{...process.env,RUN_DATABASE_TESTS:'1'}});
process.exit(result.status ?? 1);
