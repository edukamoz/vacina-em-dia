import { OWNER, OTHER_OWNER, buildApp } from '../test-support';
import { carteiraFilename } from './carteira-service';

const BODY = { name: 'João Pedro', birthDate: '2025-05-20', isPregnant: false };

async function comMembro() {
  const app = buildApp();
  await app.consent();
  const criado = await app.handlers.members.create(OWNER, BODY);
  return { app, id: (criado.jsonBody as { id: string }).id };
}

describe('exportação da carteira (RF11)', () => {
  test('CT-PDF-S01: o serviço devolve o nome do arquivo e os bytes de um PDF', async () => {
    const { app, id } = await comMembro();
    const resultado = await app.carteira.exportPdf(OWNER, id);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.value.filename).toBe('carteira-vacinacao-joao-pedro.pdf');
    expect(Buffer.from(resultado.value.bytes).toString('latin1').startsWith('%PDF-')).toBe(true);
  });

  test('CT-PDF-S02: membro de outra conta ou que não existe devolve NOT_FOUND (verifica a posse)', async () => {
    const { app, id } = await comMembro();
    expect(await app.carteira.exportPdf(OTHER_OWNER, id)).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(await app.carteira.exportPdf(OWNER, 'nao-existe')).toMatchObject({ ok: false });
  });

  test.each([
    ['João Pedro', 'carteira-vacinacao-joao-pedro.pdf'],
    ['  Zé  da Silva!! ', 'carteira-vacinacao-ze-da-silva.pdf'],
    ['../../etc/passwd', 'carteira-vacinacao-etc-passwd.pdf'],
    ['😀', 'carteira-vacinacao-pessoa.pdf'],
    ['a'.repeat(100), `carteira-vacinacao-${'a'.repeat(40)}.pdf`],
  ])('CT-PDF-S03: o nome do arquivo de "%s" é seguro: %s', (nome, esperado) => {
    expect(carteiraFilename(nome)).toBe(esperado);
  });

  test('CT-PDF-S04: o handler responde 200 com PDF, anexo e sem cache; id inválido é 400', async () => {
    const { app, id } = await comMembro();
    const ok = await app.handlers.members.exportDosesPdf(OWNER, id);
    expect(ok.status).toBe(200);
    expect(ok.headers).toMatchObject({
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="carteira-vacinacao-joao-pedro.pdf"',
    });
    expect(ok.body).toBeInstanceOf(Uint8Array);
    expect(ok.jsonBody).toBeUndefined();

    expect((await app.handlers.members.exportDosesPdf(OWNER, '../etc')).status).toBe(400);
    const alheio = await app.handlers.members.exportDosesPdf(OTHER_OWNER, id);
    expect(alheio.status).toBe(404);
    expect(alheio.body).toBeUndefined();
  });
});
