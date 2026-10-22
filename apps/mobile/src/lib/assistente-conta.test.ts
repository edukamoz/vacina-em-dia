import type {
  AssistantEntities,
  AssistantReply,
  DoseResponse,
  MemberResponse,
} from '@vacina/shared';
import { dose, MEMBER, OTHER_MEMBER } from '../test-utils';
import {
  completarData,
  dataPedida,
  ehDaConta,
  pessoasCitadas,
  responderDaConta,
  simplificar,
  type Efeitos,
  type FonteDeDados,
  type Resposta,
} from './assistente-conta';

const HOJE = '2026-10-21';
const MARIA: MemberResponse = { ...MEMBER, name: 'Maria', birthDate: '2026-02-10' };
const JOAO: MemberResponse = { ...OTHER_MEMBER, name: 'João Pedro', birthDate: '1990-01-10' };

const entidades = (parcial: Partial<AssistantEntities> = {}): AssistantEntities => ({
  vaccines: [],
  names: [],
  dates: [],
  relativeDay: null,
  screen: null,
  ...parcial,
});
const resposta = (intent: string, parcial: Partial<AssistantEntities> = {}): AssistantReply => ({
  intent,
  text: 'padrão',
  confidence: 0.9,
  source: { name: 'Ajuda do Vacina em Dia' },
  suggestions: [],
  fallback: false,
  safety: false,
  entities: entidades(parcial),
});

function montar(
  opcoes: { membros?: MemberResponse[]; doses?: Record<string, DoseResponse[]> } = {},
) {
  const membros = opcoes.membros ?? [MARIA, JOAO];
  const doses = opcoes.doses ?? {};
  const fonte: FonteDeDados = {
    hoje: HOJE,
    email: 'mariana@exemplo.com.br',
    membros: async () => membros,
    doses: async (id) => doses[id] ?? [],
    lembretes: async () => ({
      emailEnabled: true,
      items: [
        {
          doseId: 'd9',
          memberId: 'm-1',
          memberName: 'Maria',
          vaccine: 'Gripe',
          doseLabel: '1ª dose',
          kind: 'TODAY',
          date: HOJE,
        },
      ],
    }),
  };
  const chamadas: string[] = [];
  const efeitos: Efeitos = {
    criarPessoa: jest.fn(async (input) => {
      chamadas.push(`criar:${input.name}:${input.birthDate}`);
      return { ...MARIA, id: 'm-novo', name: input.name, birthDate: input.birthDate };
    }),
    aplicarDose: jest.fn(async (id, data) => void chamadas.push(`aplicar:${id}:${data}`)),
    agendarDose: jest.fn(async (id, data) => void chamadas.push(`agendar:${id}:${data}`)),
    abrir: jest.fn((rota, id) => void chamadas.push(`abrir:${rota}:${id ?? ''}`)),
  };
  const perguntar = (
    intent: string,
    pergunta: string,
    parcial: Partial<AssistantEntities> = {},
  ): Promise<Resposta> => responderDaConta(resposta(intent, parcial), pergunta, fonte, efeitos);
  return { perguntar, chamadas, efeitos };
}

const BCG = dose({
  id: 'd-bcg',
  memberId: 'm-1',
  vaccine: 'BCG',
  doseLabel: 'dose única',
  status: 'PENDING',
  dueDate: '2026-02-10',
});
const HEP1 = dose({
  id: 'd-h1',
  memberId: 'm-1',
  vaccine: 'hepatite B',
  doseLabel: '1ª dose',
  status: 'PENDING',
  dueDate: '2026-03-01',
});
const HEP2 = dose({
  id: 'd-h2',
  memberId: 'm-1',
  vaccine: 'hepatite B',
  doseLabel: '2ª dose',
  status: 'PENDING',
  dueDate: '2026-12-01',
});
const ATRASADA = dose({
  id: 'd-at',
  memberId: 'm-1',
  vaccine: 'rotavírus humano',
  doseLabel: '1ª dose',
  status: 'OVERDUE',
  dueDate: '2026-08-01',
});
const APLICADA = dose({
  id: 'd-ap',
  memberId: 'm-1',
  vaccine: 'febre amarela',
  doseLabel: '1 dose',
  status: 'APPLIED',
  appliedDate: '2026-09-01',
});
const AGENDADA = dose({
  id: 'd-ag',
  memberId: 'm-1',
  vaccine: 'varicela',
  doseLabel: '1ª dose',
  status: 'SCHEDULED',
  scheduledDate: '2026-11-10',
});
const TODAS = { 'm-1': [BCG, HEP1, HEP2, ATRASADA, APLICADA, AGENDADA] };

describe('apoio: nomes, datas e intenções', () => {
  test('CT-ASS-01: simplificar tira acento, caixa e pontuação', () => {
    expect(simplificar('  João-Pedro, da Silva! ')).toBe('joao pedro da silva');
  });

  test('CT-ASS-02: pessoas citadas pelo primeiro nome, mesmo em minúsculas e com acento', () => {
    expect(pessoasCitadas('a maria tomou', undefined, [MARIA, JOAO])).toEqual([MARIA]);
    expect(pessoasCitadas('tem dose do joao', undefined, [MARIA, JOAO])).toEqual([JOAO]);
    expect(
      pessoasCitadas('qual a próxima', entidades({ names: ['Maria'] }), [MARIA, JOAO]),
    ).toEqual([MARIA]);
    expect(pessoasCitadas('qual a próxima', undefined, [MARIA, JOAO])).toEqual([]);
  });

  test.each([
    ['--10-05', 'passado', '2026-10-05'],
    ['--11-05', 'passado', '2025-11-05'],
    ['--10-05', 'futuro', '2027-10-05'],
    ['--11-05', 'futuro', '2026-11-05'],
    ['2026-03-01', 'futuro', '2026-03-01'],
  ] as const)('CT-ASS-03: data %s (%s) vira %s', (data, sentido, esperado) => {
    expect(completarData(data, HOJE, sentido)).toBe(esperado);
  });

  test('CT-ASS-04: data pedida: citada, relativa ou hoje por padrão ao registrar', () => {
    expect(dataPedida(entidades({ dates: ['2026-10-02'] }), HOJE, 'passado')).toBe('2026-10-02');
    expect(dataPedida(entidades({ relativeDay: 'yesterday' }), HOJE, 'passado')).toBe('2026-10-20');
    expect(dataPedida(entidades({ relativeDay: 'day_before_yesterday' }), HOJE, 'passado')).toBe(
      '2026-10-19',
    );
    expect(dataPedida(entidades({ relativeDay: 'tomorrow' }), HOJE, 'futuro')).toBe('2026-10-22');
    expect(dataPedida(entidades(), HOJE, 'passado')).toBe(HOJE);
    expect(dataPedida(entidades(), HOJE, 'futuro')).toBeNull();
  });

  test('CT-ASS-05: só intenções da conta e comandos passam pelo app', () => {
    expect(ehDaConta('conta_email')).toBe(true);
    expect(ehDaConta('acao_abrir_tela')).toBe(true);
    expect(ehDaConta('como_adicionar_pessoa')).toBe(false);
  });
});

describe('perguntas sobre a conta', () => {
  test('CT-ASS-10: quem está na família, com a idade de cada um', async () => {
    const { perguntar } = montar();
    const r = await perguntar('conta_quem_na_familia', 'quem está na família');
    expect(r.texto).toContain('2 pessoas cadastradas');
    expect(r.texto).toContain('• Maria, 8 meses');
    expect(r.texto).toContain('• João Pedro, 36 anos');
  });

  test('CT-ASS-11: sem ninguém cadastrado, ensina a adicionar', async () => {
    const { perguntar } = montar({ membros: [] });
    expect((await perguntar('conta_quem_na_familia', 'quem')).texto).toContain(
      'adicionar Maria nascida em',
    );
  });

  test('CT-ASS-12: doses atrasadas de toda a família ou só da pessoa citada', async () => {
    const { perguntar } = montar({ doses: TODAS });
    const todas = await perguntar('conta_doses_atrasadas', 'tem vacina atrasada');
    expect(todas.texto).toContain('1 dose atrasada');
    expect(todas.texto).toContain('Maria: rotavírus humano, 1ª dose, era para 01/08/2026');
    expect((await perguntar('conta_doses_atrasadas', 'o João tem dose atrasada')).texto).toContain(
      'João Pedro não tem nenhuma dose atrasada',
    );
    expect(todas.passos?.[0]?.rotulo).toBe('Abrir as doses');
  });

  test('CT-ASS-13: próxima dose, só entre as que têm data daqui para a frente', async () => {
    const { perguntar } = montar({ doses: TODAS });
    const r = await perguntar('conta_proxima_dose', 'qual a próxima da Maria');
    expect(r.texto).toContain('Maria: varicela, 1ª dose, marcada para 10/11/2026');
    const outra = await perguntar('conta_proxima_dose', 'próxima de hepatite', {
      vaccines: ['hepatite B'],
    });
    expect(outra.texto).toContain('hepatite B, 2ª dose, prevista para 01/12/2026');
  });

  test('CT-ASS-14: resumo com cobertura e botão para o painel', async () => {
    const { perguntar, chamadas } = montar({ doses: TODAS });
    const r = await perguntar('conta_resumo_vacinacao', 'como está a vacinação da Maria');
    expect(r.texto).toContain('Vacinação de Maria: 17% das doses já foram aplicadas');
    expect(r.texto).toContain('de 6 no total');
    await r.passos?.[0]?.executar();
    expect(chamadas).toEqual(['abrir:/painel:']);
  });

  test('CT-ASS-15: lembretes e dados da conta', async () => {
    const { perguntar } = montar();
    expect((await perguntar('conta_meus_lembretes', 'meus lembretes')).texto).toContain(
      'Maria: Gripe, 1ª dose, hoje',
    );
    const conta = await perguntar('conta_email', 'qual meu e-mail');
    expect(conta.texto).toContain('mariana@exemplo.com.br');
    expect(conta.texto).toContain('ligado');
    expect(conta.texto).toContain('não mudo e-mail nem senha');
  });

  test('CT-ASS-16: lista longa é cortada com "e mais N"', async () => {
    const muitas = Array.from({ length: 11 }, (_, i) =>
      dose({
        id: `x${i}`,
        memberId: 'm-1',
        vaccine: `vac ${i}`,
        status: 'OVERDUE',
        dueDate: '2026-08-01',
      }),
    );
    const { perguntar } = montar({ membros: [MARIA], doses: { 'm-1': muitas } });
    const r = await perguntar('conta_doses_atrasadas', 'atrasadas');
    expect(r.texto).toContain('11 doses atrasadas');
    expect(r.texto).toContain('e mais 3.');
  });
});

describe('ações com confirmação', () => {
  test('CT-ASS-20: adicionar pessoa pede confirmação e só grava ao confirmar', async () => {
    const { perguntar, chamadas } = montar();
    const r = await perguntar('acao_adicionar_pessoa', 'adicionar Ana nascida em 05/03/2020', {
      names: ['Ana'],
      dates: ['2020-03-05'],
    });
    expect(r.texto).toBe('Posso adicionar Ana, com nascimento em 05/03/2020, à sua família?');
    expect(chamadas).toEqual([]);
    const [confirmar, cancelar] = r.passos ?? [];
    expect(cancelar?.rotulo).toBe('Cancelar');
    expect((await cancelar?.executar())?.texto).toBe('Tudo bem, não fiz nada.');
    expect(chamadas).toEqual([]);
    const feito = await confirmar?.executar();
    expect(chamadas).toEqual(['criar:Ana:2020-03-05']);
    expect(feito?.texto).toContain('Ana foi adicionada');
    await feito?.passos?.[0]?.executar();
    expect(chamadas.at(-1)).toBe('abrir:/:m-novo');
  });

  test.each([
    ['sem nome', { dates: ['2020-03-05'] }, 'preciso do nome e da data'],
    ['sem data', { names: ['Ana'] }, 'Qual a data de nascimento de Ana'],
    ['data sem ano', { names: ['Ana'], dates: ['--03-05'] }, 'Qual a data de nascimento de Ana'],
    ['nascimento no futuro', { names: ['Ana'], dates: ['2027-01-01'] }, 'não parece certa'],
    [
      'nome repetido',
      { names: ['maria'], dates: ['2020-03-05'] },
      'Já existe uma pessoa chamada maria',
    ],
  ])('CT-ASS-21: adicionar pessoa %s não grava e explica', async (_, parcial, trecho) => {
    const { perguntar, chamadas } = montar();
    const r = await perguntar('acao_adicionar_pessoa', 'adicionar', parcial);
    expect(r.texto).toContain(trecho);
    expect(r.passos).toBeUndefined();
    expect(chamadas).toEqual([]);
  });

  test('CT-ASS-22: registrar dose: uma dose em aberto vira confirmação e só aplica ao confirmar', async () => {
    const { perguntar, chamadas } = montar({ doses: TODAS });
    const r = await perguntar('acao_registrar_dose', 'a Maria tomou a BCG ontem', {
      vaccines: ['BCG'],
      relativeDay: 'yesterday',
    });
    expect(r.texto).toBe('Posso marcar BCG, dose única de Maria como aplicada em 20/10/2026?');
    expect(chamadas).toEqual([]);
    const feito = await r.passos?.[0]?.executar();
    expect(chamadas).toEqual(['aplicar:d-bcg:2026-10-20']);
    expect(feito?.texto).toContain('está como aplicada em 20/10/2026');
  });

  test('CT-ASS-23: registrar sem data vale hoje; com vários candidatos, pergunta qual dose', async () => {
    const { perguntar, chamadas } = montar({ doses: TODAS });
    const r = await perguntar('acao_registrar_dose', 'a Maria tomou a hepatite B', {
      vaccines: ['hepatite B'],
    });
    expect(r.texto).toContain('Maria tem 2 doses em aberto dessa vacina');
    expect(r.passos?.map((p) => p.rotulo)).toEqual(['1ª dose', '2ª dose']);
    const confirmacao = await r.passos?.[1]?.executar();
    expect(confirmacao?.texto).toBe(
      'Posso marcar hepatite B, 2ª dose de Maria como aplicada em 21/10/2026?',
    );
    expect(chamadas).toEqual([]);
    await confirmacao?.passos?.[0]?.executar();
    expect(chamadas).toEqual(['aplicar:d-h2:2026-10-21']);
  });

  test('CT-ASS-24: sem pessoa citada e com várias na família, pergunta de quem e segue com a escolha', async () => {
    const { perguntar } = montar({ doses: TODAS });
    const r = await perguntar('acao_registrar_dose', 'tomei a BCG hoje', {
      vaccines: ['BCG'],
      relativeDay: 'today',
    });
    expect(r.texto).toContain('de quem é?');
    expect(r.passos?.map((p) => p.rotulo)).toEqual(['Maria', 'João Pedro']);
    const seguinte = await r.passos?.[0]?.executar();
    expect(seguinte?.texto).toContain('Posso marcar BCG, dose única de Maria');
  });

  test('CT-ASS-25: com uma só pessoa na família, ela é a escolhida', async () => {
    const { perguntar } = montar({ membros: [MARIA], doses: TODAS });
    const r = await perguntar('acao_registrar_dose', 'tomei a BCG', { vaccines: ['BCG'] });
    expect(r.texto).toContain('Posso marcar BCG, dose única de Maria');
  });

  test.each([
    ['data futura', { vaccines: ['BCG'], dates: ['2026-12-01'] }, 'hoje ou antes'],
    [
      'antes de nascer',
      { vaccines: ['BCG'], dates: ['2025-01-01'] },
      'depois do nascimento de Maria',
    ],
    [
      'vacina fora do calendário',
      { vaccines: ['dengue'] },
      'Não encontrei essa vacina no calendário de Maria',
    ],
    ['dose já aplicada', { vaccines: ['febre amarela'] }, 'não tem dose em aberto dessa vacina'],
    ['sem vacina', {}, 'Qual vacina?'],
  ])('CT-ASS-26: registrar com %s não grava', async (_, parcial, trecho) => {
    const { perguntar, chamadas } = montar({ doses: TODAS });
    const r = await perguntar('acao_registrar_dose', 'a Maria tomou', {
      names: ['Maria'],
      ...parcial,
    });
    expect(r.texto).toContain(trecho);
    expect(chamadas).toEqual([]);
  });

  test('CT-ASS-27: agendar exige data e só agenda dose pendente ou atrasada, depois de confirmar', async () => {
    const { perguntar, chamadas } = montar({ doses: TODAS });
    const r = await perguntar(
      'acao_agendar_dose',
      'agendar a hepatite B da Maria para 05/11/2026',
      {
        vaccines: ['hepatite B'],
        dates: ['2026-11-05'],
        names: ['Maria'],
      },
    );
    expect(r.texto).toContain('Maria tem 2 doses em aberto');
    const conf = await r.passos?.[0]?.executar();
    expect(conf?.texto).toBe('Posso agendar hepatite B, 1ª dose de Maria para 05/11/2026?');
    await conf?.passos?.[0]?.executar();
    expect(chamadas).toEqual(['agendar:d-h1:2026-11-05']);
  });

  test.each([
    ['sem data', { vaccines: ['BCG'] }, 'preciso da data'],
    ['data no passado', { vaccines: ['BCG'], dates: ['2026-10-01'] }, 'de hoje em diante'],
    [
      'já agendada',
      { vaccines: ['varicela'], dates: ['2026-12-01'] },
      'já está marcada para 10/11/2026',
    ],
  ])('CT-ASS-28: agendar %s não grava', async (_, parcial, trecho) => {
    const { perguntar, chamadas } = montar({ doses: TODAS });
    const r = await perguntar('acao_agendar_dose', 'agendar', { names: ['Maria'], ...parcial });
    expect(r.texto).toContain(trecho);
    expect(chamadas).toEqual([]);
  });

  test('CT-ASS-29: abrir tela oferece um botão (não abre sozinho) e sem tela oferece opções', async () => {
    const { perguntar, chamadas } = montar();
    const r = await perguntar('acao_abrir_tela', 'abrir o painel', { screen: 'painel' });
    expect(r.texto).toBe('Posso abrir o Painel de gráficos.');
    expect(chamadas).toEqual([]);
    await r.passos?.[0]?.executar();
    expect(chamadas).toEqual(['abrir:/painel:']);
    const sem = await perguntar('acao_abrir_tela', 'abrir');
    expect(sem.passos?.length).toBe(4);
  });

  test('CT-ASS-30: intenção desconhecida devolve o texto padrão', async () => {
    const { perguntar } = montar();
    expect((await perguntar('conta_outra_coisa', 'x')).texto).toBe('padrão');
  });
});
