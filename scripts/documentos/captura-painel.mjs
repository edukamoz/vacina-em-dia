/* global URL */
// Tira a captura de página inteira do painel de métricas do chatbot (docs/07-testes/painel-pln.html)
// para a Documentação Técnica e a apresentação. Saída: doctos/capturas/painel-pln.png (fora do Git).
// Uso: node scripts/documentos/captura-painel.mjs
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const painel = new URL('../../docs/07-testes/painel-pln.html', import.meta.url);
const saida = new URL('../../doctos/capturas/', import.meta.url);
mkdirSync(saida, { recursive: true });

const navegador = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
});
try {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1.5 });
  await pagina.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await pagina.goto(painel.href, { waitUntil: 'load' });
  await pagina.screenshot({
    path: new URL('painel-pln.png', saida).pathname.slice(1),
    fullPage: true,
  });
  console.log('Captura gravada em doctos/capturas/painel-pln.png');
} finally {
  await navegador.close();
}
