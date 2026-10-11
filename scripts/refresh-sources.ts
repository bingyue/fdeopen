import { syncGithub } from '../src/lib/github';
const results = await syncGithub();
console.log(JSON.stringify(results, null, 2));
process.exit(results.some((r) => !r.ok) ? 1 : 0);
