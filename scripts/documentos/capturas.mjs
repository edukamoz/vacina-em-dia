/* global document, URL, setTimeout */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.APP_URL ?? 'http://localhost:8080';
const OUT = new URL('../../doctos/capturas/', import.meta.url).pathname.slice(1);
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
});

async function clicar(page, rotulo, tipo = '[role=button],[role=link],[role=radio]') {
  const ok = await page.evaluate(
    (r, t) => {
      const el = [...document.querySelectorAll(t)].find(
        (e) => e.getAttribute('aria-label') === r || e.textContent.trim() === r,
      );
      if (!el) return false;
      el.click();
      return true;
    },
    rotulo,
    tipo,
  );
  if (!ok) console.log('não achei:', rotulo);
  return ok;
}

async function sessao(nome, largura, altura, escala) {
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions(BASE, ['geolocation']);
  const page = await ctx.newPage();
  await page.setViewport({
    width: largura,
    height: altura,
    deviceScaleFactor: escala,
    isMobile: largura < 600,
    hasTouch: largura < 600,
  });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.setGeolocation({ latitude: -23.5466, longitude: -47.4412 });
  const foto = async (arquivo) => {
    await sleep(1800);
    await page.screenshot({ path: `${OUT}${nome}-${arquivo}.png` });
    console.log('ok', `${nome}-${arquivo}`);
  };

  await page.goto(`${BASE}/apresentacao`, { waitUntil: 'networkidle2' });
  await foto('01-apresentacao');
  await page.goto(`${BASE}/entrar`, { waitUntil: 'networkidle2' });
  await foto('02-entrar');
  await page.type('input[type=email]', 'teste@exemplo.com');
  await page.type('input[type=password]', 'senha-de-teste-123');
  await clicar(page, 'Entrar');
  await sleep(4000);
  await foto('03-doses');

  // detalhe da dose
  await clicar(page, 'Pessoa');
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('[role=button]')].find((e) =>
      /Abrir detalhes/.test(e.getAttribute('aria-label') || ''),
    );
    el?.click();
  });
  await sleep(2500);
  await foto('04-dose');
  await page.goBack();
  await sleep(1500);

  for (const [rota, arquivo] of [
    ['familia', '05-familia'],
    ['historico', '06-historico'],
    ['conta', '07-conta'],
  ]) {
    await page.goto(`${BASE}/${rota}`, { waitUntil: 'networkidle2' });
    await foto(arquivo);
  }

  await page.goto(`${BASE}/postos`, { waitUntil: 'networkidle2' });
  await clicar(page, 'Usar minha localização');
  await sleep(7000);
  await foto('08-postos');

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await clicar(page, 'Abrir o assistente');
  await sleep(2000);
  await foto('09-assistente');
  await ctx.close();
}

await sessao('web', 1280, 800, 1);
await sessao('celular', 390, 844, 2);
await browser.close();
