// Administrative CLI: pnpm experience:create --story <storyId> --count <n>
//
// Mints N new permanent QR experiences for a story/shirt line: a
// cryptographically random public token + deterministic seed per experience,
// inserted into Postgres, plus SVG/PNG QR codes and a CSV manifest. Safe to
// rerun — every invocation mints fresh, independently-random tokens and never
// touches existing rows, so running this again for another batch (or another
// story) is always additive.
import './env';
import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';
import { getStoryManifest } from '../lib/registry';
import { createExperience } from '../lib/provisioning';

const QR_PNG_SIZE = 1024;

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function main() {
  const { values } = parseArgs({
    options: {
      story: { type: 'string' },
      count: { type: 'string' },
      out: { type: 'string' },
    },
  });

  const storyId = values.story;
  const count = Number(values.count);
  if (!storyId || !Number.isInteger(count) || count <= 0) {
    console.error('Usage: pnpm experience:create --story <storyId> --count <n> [--out <dir>]');
    process.exit(1);
  }

  if (!getStoryManifest(storyId)) {
    console.error(`Unknown story "${storyId}" — register it in lib/registry.ts first (see README).`);
    process.exit(1);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.resolve(values.out || `provisioning-output/${storyId}-${timestamp}`);
  const qrDir = path.join(outDir, 'qr');
  await mkdir(qrDir, { recursive: true });

  const csvRows = ['serial,token,url,seed,qr_svg,qr_png'];

  for (let i = 1; i <= count; i++) {
    const row = await createExperience(storyId);
    const url = `${baseUrl}/x/${row.publicToken}`;
    const serial = String(i).padStart(4, '0');
    const svgFilename = `${serial}.svg`;
    const pngFilename = `${serial}.png`;

    const svg = await QRCode.toString(url, { type: 'svg', margin: 1 });
    await writeFile(path.join(qrDir, svgFilename), svg, 'utf8');

    const png = await QRCode.toBuffer(url, { type: 'png', width: QR_PNG_SIZE, margin: 2 });
    await writeFile(path.join(qrDir, pngFilename), png);

    csvRows.push(
      [serial, row.publicToken, url, String(row.seed), `qr/${svgFilename}`, `qr/${pngFilename}`]
        .map(csvEscape)
        .join(','),
    );

    console.log(`[provision] ${serial}/${String(count).padStart(4, '0')} ${url}`);
  }

  const csvPath = path.join(outDir, 'experiences.csv');
  await writeFile(csvPath, csvRows.join('\n') + '\n', 'utf8');

  console.log(`\n[provision] done — ${count} experience(s) for "${storyId}"`);
  console.log(`[provision] output: ${outDir}`);
}

main().catch((err) => {
  console.error('[provision] failed:', err);
  process.exit(1);
});
