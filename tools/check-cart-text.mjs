// Catch accidental calls to the browser Print dialog in any cart.
// Usage: node tools/check-cart-text.mjs /path/to/nova64 (with dependencies installed)
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
if (!process.argv[2]) throw new Error('Pass the Nova64 dependency checkout.');
const require = createRequire(path.resolve(process.argv[2], 'package.json'));
const { Linter } = require('eslint');
const linter = new Linter();
const examples = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../examples');
let failures = 0, checked = 0;
for (const dir of readdirSync(examples)) {
  const file = path.join(examples, dir, 'code.js');
  if (!existsSync(file)) continue;
  checked++;
  const code = readFileSync(file, 'utf8');
  const messages = linter.verify(code, {
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: { 'no-restricted-globals': ['error', 'print', 'printCentered'] },
  });
  if (code.includes('prinprintCentered')) messages.push({ message: 'Misspelled printCentered binding' });
  for (const message of messages) {
    failures++;
    console.error(`${dir}/code.js:${message.line || 1}: ${message.message}`);
  }
}
console.log(`${checked} carts checked; ${failures} text binding errors.`);
process.exitCode = failures ? 1 : 0;
