import type { DoseResponse, MemberDosesResponse } from '@vacina/shared';
import { describeAge, describeSituation, formatCivilDate, renderCarteiraPdf } from './carteira-pdf';

const FONTE: MemberDosesResponse['source'] = {
  name: 'Calendário Nacional de Vacinação 2026',
  publisher: 'Ministério da Saúde (PNI)',
  version: '2026',
  url: 'https://www.gov.br/saude/pt-br/vacinacao/calendario',
  retrievedAt: '2026-10-06',
  isFictitious: false,
  notice:
    'O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.',
};

const MEMBRO: MemberDosesResponse['member'] = {
  id: 'm-1',
  name: 'Maria Clara',
  birthDate: '2025-05-20',
  isPregnant: false,
  relationship: 'DAUGHTER',
  ageGroup: 'CHILD',
};

function dose(patch: Partial<DoseResponse> = {}): DoseResponse {
  return {
    id: 'd-1',
    memberId: 'm-1',
    origin: 'OFFICIAL',
    ruleId: 'bcg',
    vaccine: 'BCG',
    doseLabel: 'dose única',
    diseases: 'tuberculose',
    timingKind: 'AGE',
    timingLabel: 'ao nascer',
    conditional: false,
    notes: [],
    status: 'PENDING',
    dueDate: '2026-12-01',
    scheduledDate: null,
    appliedDate: null,
    ...patch,
  };
}

const OPCOES = { today: '2026-10-06', generatedAt: '2026-10-06T15:00:00.000Z', compress: false };

/**
 * Lê o texto de um PDF sem compressão: o PDFKit grava cada trecho como cadeias hexadecimais num
 * `[...] TJ`, em WinAnsi (igual ao Latin-1 para os caracteres do português). Uma linha por trecho.
 */
function extrairTexto(bytes: Uint8Array): string {
  const bruto = Buffer.from(bytes).toString('latin1');
  const linhas: string[] = [];
  for (const [, grupo] of bruto.matchAll(/\[([^\]]*)\] TJ/g)) {
    const partes = [...(grupo ?? '').matchAll(/<([0-9a-f]*)>/gi)].map(([, hex]) =>
      Buffer.from(hex ?? '', 'hex').toString('latin1'),
    );
    linhas.push(partes.join(''));
  }
  return linhas.join('\n');
}

async function gerar(items: DoseResponse[], member = MEMBRO) {
  const bytes = await renderCarteiraPdf({ source: FONTE, member, items }, OPCOES);
  return {
    bytes,
    bruto: Buffer.from(bytes).toString('latin1'),
    texto: extrairTexto(bytes),
  };
}

describe('PDF da carteira de vacinação (RF11)', () => {
  test('CT-PDF-01: gera um PDF válido com a pessoa, o resumo e as doses', async () => {
    const { bytes, bruto, texto } = await gerar([
      dose({ status: 'APPLIED', appliedDate: '2026-08-01' }),
      dose({ id: 'd-2', vaccine: 'hepatite B', doseLabel: '1 dose', status: 'OVERDUE' }),
    ]);
    expect(bruto.startsWith('%PDF-')).toBe(true);
    expect(bruto.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(bytes.length).toBeGreaterThan(1500);
    for (const trecho of ['Maria Clara', '1 de 2 doses aplicadas', 'BCG', 'hepatite B']) {
      expect(texto).toContain(trecho);
    }
  });

  test('CT-PDF-02: toda página traz a fonte, a versão e o aviso de que não substitui a caderneta', async () => {
    const muitas = Array.from({ length: 70 }, (_, i) =>
      dose({ id: `d-${i}`, vaccine: `Vacina ${i}` }),
    );
    const { bruto, texto } = await gerar(muitas);
    const paginas = Number(/\/Type \/Pages\s+\/Count (\d+)/.exec(bruto)?.[1] ?? 0);
    expect(paginas).toBeGreaterThan(1);
    // O rodapé quebra em várias linhas; juntar as linhas devolve a frase inteira.
    const corrido = texto.replace(/\s+/g, ' ');
    const avisos = corrido.split('não substitui a caderneta oficial').length - 1;
    expect(avisos).toBeGreaterThanOrEqual(paginas);
    expect(corrido.split('versão 2026').length - 1).toBeGreaterThanOrEqual(paginas);
    expect(texto).toContain(`Página ${paginas} de ${paginas}`);
  });

  test('CT-PDF-03: sem doses o arquivo diz que não há nenhuma e continua válido', async () => {
    const { texto } = await gerar([]);
    expect(texto).toContain('Nenhuma dose registrada.');
    expect(texto).toContain('0 de 0 doses aplicadas');
  });

  test('CT-PDF-04: gestante e parentesco aparecem; sem parentesco a linha some', async () => {
    const com = await gerar([], { ...MEMBRO, isPregnant: true, ageGroup: 'ADULT' });
    expect(com.texto).toContain('Gestante: sim');
    expect(com.texto).toContain('Parentesco: Filha');
    const sem = await gerar([], { ...MEMBRO, relationship: null });
    expect(sem.texto).not.toContain('Parentesco:');
    expect(sem.texto).not.toContain('Gestante');
  });

  test('CT-PDF-05: a data de emissão e as propriedades do arquivo vêm do relógio injetado', async () => {
    const { bruto, texto } = await gerar([]);
    expect(texto).toContain('Emitida em 06/10/2026');
    expect(bruto).toContain('(D:20261006150000Z)');
  });

  test('CT-PDF-06: o resultado é o mesmo para as mesmas entradas (sem hora real)', async () => {
    const items = [dose({ status: 'SCHEDULED', scheduledDate: '2026-10-20' })];
    const a = await gerar(items);
    const b = await gerar(items);
    expect(Buffer.from(a.bytes).equals(Buffer.from(b.bytes))).toBe(true);
  });

  test('CT-PDF-07: comprimido por padrão, o arquivo fica menor', async () => {
    const items = Array.from({ length: 30 }, (_, i) => dose({ id: `d-${i}` }));
    const bruto = await renderCarteiraPdf({ source: FONTE, member: MEMBRO, items }, OPCOES);
    const comprimido = await renderCarteiraPdf(
      { source: FONTE, member: MEMBRO, items },
      { today: OPCOES.today, generatedAt: OPCOES.generatedAt },
    );
    expect(comprimido.length).toBeLessThan(bruto.length);
  });
});

describe('textos do PDF', () => {
  test.each([
    ['2026-10-06', '06/10/2026'],
    ['2025-01-02', '02/01/2025'],
  ])('CT-PDF-08: formatCivilDate(%s)', (entrada, esperado) => {
    expect(formatCivilDate(entrada)).toBe(esperado);
  });

  test.each([
    ['2026-10-06', '2026-10-06', '0 meses'],
    ['2026-09-06', '2026-10-06', '1 mês'],
    ['2025-05-20', '2026-10-06', '16 meses'],
    ['2025-10-07', '2026-10-06', '11 meses'],
    ['2024-10-06', '2026-10-06', '2 anos'],
    ['2024-10-07', '2026-10-06', '23 meses'],
    ['2025-10-06', '2026-10-06', '12 meses'],
    ['1958-03-02', '2026-10-06', '68 anos'],
    ['2027-01-01', '2026-10-06', '0 meses'],
  ])('CT-PDF-09: idade de quem nasceu em %s, em %s, é %s', (nasc, hoje, esperado) => {
    expect(describeAge(nasc, hoje)).toBe(esperado);
  });

  test.each([
    [{ status: 'APPLIED', appliedDate: '2026-08-01' }, 'Aplicada', '01/08/2026'],
    [{ status: 'SCHEDULED', scheduledDate: '2026-10-20' }, 'Agendada', '20/10/2026'],
    [{ status: 'OVERDUE', dueDate: '2026-09-02' }, 'Atrasada', 'era para 02/09/2026'],
    [{ status: 'PENDING', dueDate: '2026-12-01' }, 'Pendente', 'prevista 01/12/2026'],
    [{ status: 'CANCELLED' }, 'Cancelada', ''],
    [{ status: 'APPLIED', appliedDate: null }, 'Aplicada', ''],
  ] as const)('CT-PDF-10: situação %j', (patch, estado, data) => {
    expect(describeSituation(dose(patch as Partial<DoseResponse>))).toEqual({ estado, data });
  });
});
