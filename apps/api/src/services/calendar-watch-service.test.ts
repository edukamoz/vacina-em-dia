import { createHash } from 'node:crypto';
import { createInMemoryFileStorage } from '../storage/file-storage';
import {
  CALENDAR_PAGE_URL,
  CALENDAR_SOURCES,
  createCalendarWatchService,
  type CalendarSource,
} from './calendar-watch-service';
import type { EmailMessage } from './email-ports';

const sha = (texto: string) => createHash('sha256').update(texto).digest('hex');
const bytesDe = (texto: string) => new TextEncoder().encode(texto);

/** Cinco fontes de mentira, cada uma com o "conteúdo aprovado" `v1-<id>`. */
const FONTES: readonly CalendarSource[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({
  id,
  label: `Arquivo ${id}`,
  url: `https://exemplo.test/${id}.pdf`,
  baselineSha256: sha(`v1-${id}`),
}));

function montar(opcoes: { destino?: string | undefined; agora?: string } = {}) {
  const conteudo = new Map<string, string | Error>(FONTES.map((f) => [f.url, `v1-${f.id}`]));
  const enviados: EmailMessage[] = [];
  const storage = createInMemoryFileStorage();
  let agora = opcoes.agora ?? '2026-11-16T12:00:00.000Z';
  const log: string[] = [];
  const servico = createCalendarWatchService({
    sources: FONTES,
    fetchBytes: async (url) => {
      const valor = conteudo.get(url);
      if (valor === undefined || valor instanceof Error) throw valor ?? new Error('sem fonte');
      return bytesDe(valor);
    },
    storage,
    email: { send: async (mensagem) => void enviados.push(mensagem) },
    alertTo: 'destino' in opcoes ? opcoes.destino : 'autor@exemplo.test',
    clock: () => agora,
    reportError: (tipo) => log.push(tipo),
  });
  return {
    servico,
    conteudo,
    enviados,
    storage,
    log,
    passarPara: (instante: string) => (agora = instante),
  };
}

describe('vigia do calendário oficial (CT-VIG)', () => {
  test('CT-VIG-01: as cinco fontes reais estão cadastradas com endereço e impressão digital', () => {
    expect(CALENDAR_SOURCES.map((f) => f.id)).toEqual([
      'crianca',
      'adolescentes-jovens',
      'adulto',
      'idoso',
      'gestante',
    ]);
    for (const fonte of CALENDAR_SOURCES) {
      expect(fonte.url).toBe(
        `https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-${fonte.id}`,
      );
      expect(fonte.baselineSha256).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(CALENDAR_PAGE_URL).toBe('https://www.gov.br/saude/pt-br/vacinacao/calendario');
  });

  test('CT-VIG-02: nada mudou: registra a verificação e não envia e-mail', async () => {
    const { servico, enviados } = montar();
    expect(await servico.check()).toEqual({
      checkedAt: '2026-11-16T12:00:00.000Z',
      unchanged: 5,
      changed: [],
      failed: 0,
      alerted: false,
    });
    expect(enviados).toEqual([]);
    expect(await servico.status()).toEqual({
      checkedAt: '2026-11-16T12:00:00.000Z',
      changed: false,
    });
  });

  test('CT-VIG-03: antes da primeira verificação não há data', async () => {
    expect(await montar().servico.status()).toEqual({ checkedAt: null, changed: false });
  });

  test('CT-VIG-04: arquivo com conteúdo novo é apontado e gera um e-mail para o autor', async () => {
    const { servico, conteudo, enviados } = montar();
    conteudo.set(FONTES[3]!.url, 'v2-d');
    const resumo = await servico.check();
    expect(resumo).toMatchObject({ unchanged: 4, changed: ['d'], failed: 0, alerted: true });
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toMatchObject({ to: 'autor@exemplo.test' });
    expect(enviados[0]?.subject).toMatch(/calendário/i);
    expect(enviados[0]?.text).toContain('Arquivo d');
    expect(enviados[0]?.text).toContain(CALENDAR_PAGE_URL);
    expect(enviados[0]?.text).not.toContain('Arquivo a');
    expect(await servico.status()).toMatchObject({ changed: true });
  });

  test('CT-VIG-05: a mesma mudança não gera outro e-mail na semana seguinte', async () => {
    const { servico, conteudo, enviados, passarPara } = montar();
    conteudo.set(FONTES[0]!.url, 'v2-a');
    await servico.check();
    passarPara('2026-11-23T12:00:00.000Z');
    const resumo = await servico.check();
    expect(resumo).toMatchObject({ changed: ['a'], alerted: false });
    expect(enviados).toHaveLength(1);
    // O aviso de que mudou continua à mostra até o conteúdo aprovado ser atualizado no projeto.
    expect(await servico.status()).toEqual({
      checkedAt: '2026-11-23T12:00:00.000Z',
      changed: true,
    });
  });

  test('CT-VIG-06: uma segunda mudança no mesmo arquivo avisa de novo', async () => {
    const { servico, conteudo, enviados } = montar();
    conteudo.set(FONTES[0]!.url, 'v2-a');
    await servico.check();
    conteudo.set(FONTES[0]!.url, 'v3-a');
    await servico.check();
    expect(enviados).toHaveLength(2);
  });

  test('CT-VIG-07: voltar ao conteúdo aprovado limpa o aviso', async () => {
    const { servico, conteudo } = montar();
    conteudo.set(FONTES[1]!.url, 'v2-b');
    await servico.check();
    conteudo.set(FONTES[1]!.url, 'v1-b');
    expect(await servico.check()).toMatchObject({ unchanged: 5, changed: [], alerted: false });
    expect(await servico.status()).toMatchObject({ changed: false });
  });

  test('CT-VIG-08: falha ao baixar um arquivo não vira "mudou" nem derruba os outros', async () => {
    const { servico, conteudo, enviados, log } = montar();
    conteudo.set(FONTES[2]!.url, new Error('timeout com detalhe interno'));
    const resumo = await servico.check();
    expect(resumo).toMatchObject({ unchanged: 4, changed: [], failed: 1, alerted: false });
    expect(enviados).toEqual([]);
    expect(log).toEqual(['Error']);
    expect(log.join(' ')).not.toContain('detalhe interno');
  });

  test('CT-VIG-09: sem endereço de alerta, só registra: nenhum e-mail e nenhum erro', async () => {
    const { servico, conteudo, enviados } = montar({ destino: undefined });
    conteudo.set(FONTES[0]!.url, 'v2-a');
    const resumo = await servico.check();
    expect(resumo).toMatchObject({ changed: ['a'], alerted: false });
    expect(enviados).toEqual([]);
  });

  test('CT-VIG-10: se o e-mail falhar, tenta de novo na próxima verificação', async () => {
    const conteudo = new Map(FONTES.map((f) => [f.url, `v1-${f.id}`]));
    conteudo.set(FONTES[0]!.url, 'v2-a');
    let falhar = true;
    const enviados: EmailMessage[] = [];
    const servico = createCalendarWatchService({
      sources: FONTES,
      fetchBytes: async (url) => bytesDe(conteudo.get(url) ?? ''),
      storage: createInMemoryFileStorage(),
      email: {
        send: async (m) => {
          if (falhar) throw new Error('fora do ar');
          enviados.push(m);
        },
      },
      alertTo: 'autor@exemplo.test',
      clock: () => '2026-11-16T12:00:00.000Z',
    });
    expect(await servico.check()).toMatchObject({ changed: ['a'], alerted: false });
    falhar = false;
    expect(await servico.check()).toMatchObject({ alerted: true });
    expect(enviados).toHaveLength(1);
  });

  test('CT-VIG-11: o estado fica guardado, então outra instância continua de onde parou', async () => {
    const primeira = montar();
    primeira.conteudo.set(FONTES[0]!.url, 'v2-a');
    await primeira.servico.check();
    const segunda = createCalendarWatchService({
      sources: FONTES,
      fetchBytes: async () => bytesDe('v2-a'),
      storage: primeira.storage,
      email: { send: async () => undefined },
      alertTo: 'autor@exemplo.test',
      clock: () => '2026-11-30T12:00:00.000Z',
    });
    expect(await segunda.status()).toMatchObject({
      checkedAt: '2026-11-16T12:00:00.000Z',
      changed: true,
    });
  });
});
