// Gera apps/nlp/vacina_nlp/data/pni-2026.json a partir do calendário oficial do @vacina/shared.
// Uso: npm run build -w @vacina/shared && npm run export:calendar
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { PNI_2026, exportCalendarForNlp } from '../packages/shared/dist/index.js';

const destino = join(
  dirname(fileURLToPath(import.meta.url)),
  '../apps/nlp/vacina_nlp/data/pni-2026.json',
);
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, `${JSON.stringify(exportCalendarForNlp(PNI_2026), null, 2)}\n`, 'utf8');
process.stdout.write(`Calendário exportado para ${destino}
`);
