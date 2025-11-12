/**
 * Generate client manifest with the hashed filename
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const staticDir = join(process.cwd(), 'dist/static');
const files = readdirSync(staticDir);
const clientFile = files.find(
  (f) => f.startsWith('client.') && f.endsWith('.js'),
);

if (!clientFile) {
  console.error('Client bundle not found');
  process.exit(1);
}

const content = `// Auto-generated - do not edit
export const clientFilename = '${clientFile}';
`;

writeFileSync(join(process.cwd(), 'app/client-manifest.ts'), content);
console.log(`✓ Client manifest generated: ${clientFile}`);
