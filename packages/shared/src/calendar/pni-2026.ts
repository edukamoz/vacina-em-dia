import type { CalendarDataset, CalendarGroup, CalendarRule, CalendarTiming } from './types';

const PREFIX: Record<CalendarGroup, string> = {
  CHILD: 'crianca',
  ADOLESCENT_YOUTH: 'adolescente',
  ADULT: 'adulto',
  ELDERLY: 'idoso',
  PREGNANT: 'gestante',
};

interface Options {
  readonly notes?: readonly number[];
  readonly conditional?: boolean;
}

function rule(
  group: CalendarGroup,
  slug: string,
  vaccine: string,
  dose: string,
  diseases: string,
  timing: CalendarTiming,
  { notes = [], conditional = false }: Options = {},
): CalendarRule {
  return {
    id: `${PREFIX[group]}-${slug}`,
    group,
    vaccine,
    dose,
    diseases,
    timing,
    noteIds: notes.map((n) => `${PREFIX[group]}.${n}`),
    conditional,
  };
}

const child = (
  slug: string,
  months: number,
  vaccine: string,
  dose: string,
  diseases: string,
  options?: Options,
) => rule('CHILD', slug, vaccine, dose, diseases, { kind: 'AGE', months }, options);

const history = (
  group: CalendarGroup,
  slug: string,
  vaccine: string,
  dose: string,
  diseases: string,
  options?: Options,
) => rule(group, slug, vaccine, dose, diseases, { kind: 'HISTORY' }, options);

const atAge = (
  slug: string,
  months: number,
  vaccine: string,
  dose: string,
  diseases: string,
  options?: Options,
) => rule('ADOLESCENT_YOUTH', slug, vaccine, dose, diseases, { kind: 'AGE', months }, options);

const pregnant = (
  slug: string,
  week: number | null,
  vaccine: string,
  dose: string,
  diseases: string,
  options?: Options,
) => rule('PREGNANT', slug, vaccine, dose, diseases, { kind: 'GESTATION', week }, options);

const PENTA = 'difteria, tétano, coqueluche, infecções causadas pelo H. influenzae b e hepatite B';
const POLIO = 'poliomielite (paralisia infantil)';
const ROTA = 'doenças diarreicas agudas causadas pelo rotavírus, sorotipos G1';
const PNEUMO = 'doenças pneumocócicas invasivas';
const MENC = 'doenças meningocócicas causadas pelo sorogrupo C';
const COVID = 'formas graves de covid-19 causadas pelo vírus SARS-CoV-2';
const SCR = 'sarampo, caxumba, rubéola e síndrome da rubéola congênita';
const MENACWY = 'doenças meningocócicas causadas pelos sorogrupos A, C, W-135 e Y';
const DTP = 'difteria, tétano, coqueluche';
const VARICELA = 'varicela (catapora)';
const HEPB = 'hepatite B, hepatite D';
const HPV = 'infecções causadas pelo papilomavírus humano';
const FEBRE_AMARELA = 'febre amarela';
const INFLUENZA = 'influenza (gripe)';
const DT = 'difteria, tétano';

/**
 * Calendário Nacional de Vacinação 2026 (Ministério da Saúde), transcrito dos cinco arquivos
 * oficiais: Criança, Adolescentes e jovens, Adulto, Idoso e Gestante. Nenhum valor foi preenchido
 * de memória (CLAUDE.md §8). Ao atualizar para uma nova versão, crie um novo conjunto e mantenha o
 * anterior para o histórico.
 *
 * Simplificação: uma linha com "3 doses" vira uma única regra (uma dose no ciclo de vida do app).
 */
export const PNI_2026: CalendarDataset = {
  source: {
    name: 'Calendário Nacional de Vacinação 2026',
    publisher: 'Ministério da Saúde (PNI)',
    version: '2026',
    url: 'https://www.gov.br/saude/pt-br/vacinacao/calendario',
    retrievedAt: '2026-10-06',
    files: [
      'Calendário Nacional de Vacinação - Criança.pdf',
      'Calendário Nacional de Vacinação - Adolescentes e jovens.pdf',
      'Calendário Nacional de Vacinação - Adulto.pdf',
      'Calendário Nacional de Vacinação - Idoso.pdf',
      'Calendário Nacional de Vacinação - Gestante.pdf',
    ],
    isFictitious: false,
    notice:
      'O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.',
  },

  rules: [
    // ---- Criança (0 a 9 anos, 11 meses e 29 dias) ----
    child('hepatite-b', 0, 'hepatite B', '1 dose', 'hepatite B e hepatite D'),
    child(
      'bcg',
      0,
      'BCG',
      'dose única',
      'formas graves e disseminadas da tuberculose e, também, com efeito protetor contra a hanseníase',
    ),
    child('penta-1', 2, 'penta (DTP+Hib+HB)', '1ª dose', PENTA),
    child('vip-1', 2, 'poliomielite inativada VIP', '1ª dose', POLIO),
    child('rotavirus-1', 2, 'rotavírus humano', '1ª dose', ROTA, { notes: [1] }),
    child('pneumo-20-1', 2, 'pneumocócica 20-valente', '1ª dose', PNEUMO),
    child('meningo-c-1', 3, 'meningocócica C', '1ª dose', MENC),
    child('penta-2', 4, 'penta (DTP+Hib+HB)', '2ª dose', PENTA),
    child('vip-2', 4, 'poliomielite inativada VIP', '2ª dose', POLIO),
    child('rotavirus-2', 4, 'rotavírus humano', '2ª dose', ROTA, { notes: [1] }),
    child('pneumo-10-2', 4, 'pneumocócica 10-valente', '2ª dose', PNEUMO),
    child('meningo-c-2', 5, 'meningocócica C', '2ª dose', MENC),
    child('penta-3', 6, 'penta (DTP+Hib+HB)', '3ª dose', PENTA),
    child('vip-3', 6, 'poliomielite inativada VIP', '3ª dose', POLIO),
    child('influenza-1', 6, 'influenza trivalente', '1ª dose', INFLUENZA, { notes: [2] }),
    child('covid-1', 6, 'covid-19', '1ª dose', COVID, { notes: [3] }),
    child(
      'febre-amarela-excepcional',
      6,
      'febre amarela',
      '1 dose, em casos excepcionais',
      FEBRE_AMARELA,
      { notes: [4], conditional: true },
    ),
    child('covid-2', 7, 'covid-19', '2ª dose', COVID, { notes: [3] }),
    child('covid-3', 9, 'covid-19', '3ª dose', COVID, { notes: [3] }),
    child('febre-amarela-1', 9, 'febre amarela', '1 dose', FEBRE_AMARELA, { notes: [4] }),
    child('pneumo-20-reforco', 12, 'pneumocócica 20-valente', '1 dose de reforço', PNEUMO),
    child('meningo-acwy', 12, 'meningocócica ACWY', '1 dose', MENACWY),
    child('scr-1', 12, 'tríplice viral SCR', '1ª dose', SCR),
    child('dtp-1', 15, 'DTP', '1ª dose reforço', DTP),
    child('vip-reforco-1', 15, 'poliomielite inativada VIP', '1ª dose reforço', POLIO),
    child('scr-2', 15, 'tríplice viral SCR', '2ª dose', SCR),
    child('varicela-1', 15, 'varicela', '1ª dose', VARICELA, { notes: [5] }),
    child('hepatite-a', 15, 'hepatite A', '1 dose', 'hepatite A'),
    child('dtp-2', 48, 'DTP', '2ª dose reforço', DTP),
    child('vip-reforco-2', 48, 'poliomielite inativada VIP', '2ª dose reforço', POLIO),
    child('varicela-2', 48, 'varicela', '2ª dose', VARICELA, { notes: [5] }),
    child('febre-amarela-reforco', 48, 'febre amarela', '1 dose reforço', FEBRE_AMARELA, {
      notes: [4],
    }),
    child('pneumo-20-5-anos', 60, 'pneumocócica 20-valente', '1 dose', PNEUMO, {
      notes: [6],
      conditional: true,
    }),
    child('hpv', 108, 'HPV4', '1 dose', HPV, { notes: [7] }),

    // ---- Adolescente (10 a 19 anos) e jovem (20 a 24 anos) ----
    history('ADOLESCENT_YOUTH', 'hpv', 'HPV4', '1 dose', HPV, { notes: [1] }),
    history('ADOLESCENT_YOUTH', 'hepatite-b', 'hepatite B', '3 doses', HEPB),
    history('ADOLESCENT_YOUTH', 'febre-amarela', 'febre amarela', '1 dose', FEBRE_AMARELA, {
      notes: [2],
    }),
    history('ADOLESCENT_YOUTH', 'scr', 'tríplice viral SCR', '2 doses', SCR, { notes: [3] }),
    history('ADOLESCENT_YOUTH', 'varicela', 'varicela', '2 doses', VARICELA, {
      notes: [4],
      conditional: true,
    }),
    history('ADOLESCENT_YOUTH', 'pneumo-20', 'pneumocócica 20-valente', '1 dose', PNEUMO, {
      notes: [5],
      conditional: true,
    }),
    atAge('dng4', 120, 'DNG4', '2 doses', 'dengue causada pelos sorotipos 1, 2, 3 e 4', {
      notes: [6],
    }),
    atAge('meningo-acwy', 132, 'meningocócica ACWY', '1 dose', MENACWY, { notes: [7] }),
    atAge('dt-3', 168, 'dT', '3ª dose reforço', DT),
    atAge('dt-4', 288, 'dT', '4ª dose reforço', DT, { notes: [8] }),

    // ---- Adulto (25 a 59 anos, 11 meses e 29 dias) ----
    history('ADULT', 'hepatite-b', 'hepatite B', '3 doses', HEPB),
    history('ADULT', 'dt', 'dT', '3 doses + reforços periódicos', DT, { notes: [1] }),
    history('ADULT', 'febre-amarela', 'febre amarela', '1 dose', FEBRE_AMARELA, { notes: [2] }),
    history(
      'ADULT',
      'scr',
      'tríplice viral SCR',
      'até 29 anos: 2 doses; entre 30 e 59 anos: 1 dose; trabalhador de saúde em qualquer idade: 2 doses',
      SCR,
      { notes: [3] },
    ),
    history('ADULT', 'varicela', 'varicela', '2 doses', VARICELA, {
      notes: [4],
      conditional: true,
    }),
    history('ADULT', 'pneumo-20', 'pneumocócica 20-valente', '1 dose', PNEUMO, {
      notes: [5],
      conditional: true,
    }),

    // ---- Idoso (a partir de 60 anos) ----
    history('ELDERLY', 'hepatite-b', 'hepatite B', '3 doses', HEPB),
    history('ELDERLY', 'dt', 'dT', '3 doses + reforços periódicos', DT, { notes: [1] }),
    history(
      'ELDERLY',
      'febre-amarela',
      'febre amarela',
      '1 dose, em casos excepcionais',
      FEBRE_AMARELA,
      { notes: [2], conditional: true },
    ),
    history('ELDERLY', 'scr', 'tríplice viral SCR', '2 doses', 'sarampo, caxumba, rubéola', {
      notes: [3],
      conditional: true,
    }),
    history('ELDERLY', 'varicela', 'varicela', '2 doses', VARICELA, {
      notes: [4],
      conditional: true,
    }),
    history('ELDERLY', 'pneumo-20', 'pneumocócica 20-valente', '1 dose', PNEUMO, {
      notes: [5],
      conditional: true,
    }),
    history(
      'ELDERLY',
      'influenza',
      'influenza trivalente',
      '1 dose anual a cada temporada',
      INFLUENZA,
    ),
    history('ELDERLY', 'covid', 'covid-19', '1 dose semestral', COVID),

    // ---- Gestante ----
    pregnant('hepatite-b', null, 'hepatite B', '3 doses', 'hepatite B e hepatite D'),
    pregnant('dt', null, 'dT', '3 doses', DT),
    pregnant('influenza', null, 'influenza trivalente', '1 dose por temporada', INFLUENZA),
    pregnant('covid', null, 'covid-19', '1 dose a cada gestação', COVID),
    pregnant(
      'febre-amarela',
      null,
      'febre amarela',
      '1 dose (em casos excepcionais)',
      FEBRE_AMARELA,
      {
        notes: [1],
        conditional: true,
      },
    ),
    pregnant(
      'dtpa',
      20,
      'dTpa',
      '1 dose a partir da 20ª semana gestacional, em cada gestação',
      'difteria, tétano e coqueluche',
      { notes: [2] },
    ),
    pregnant(
      'vsr',
      28,
      'vírus sincicial respiratório (VVSR)',
      '1 dose a partir da 28ª semana gestacional, em cada gestação',
      'bronquiolite, pneumonia e outras complicações',
    ),
  ],

  notes: {
    'crianca.1':
      'Atenção aos prazos. A 1ª dose deve ser aplicada entre 1 mês 15 dias e 11 meses 29 dias de idade; a 2ª dose entre 3 meses 15 dias e 23 meses 29 dias de idade; intervalo de 60 dias entre as doses. Caso a 1ª dose não seja recebida no período indicado, perde-se a oportunidade de vacinação contra o rotavírus.',
    'crianca.2':
      'Crianças de 6 meses a menores de 6 anos devem ser vacinadas todo ano. Quem vai receber a vacina pela primeira vez deve tomar 2 doses com 30 dias de intervalo. As que já tomaram em anos anteriores recebem apenas 1 dose por ano.',
    'crianca.3':
      'Criança em atraso de esquema vacinal, vacinar até 4 anos 11 meses 29 dias, com intervalo mínimo de 4 semanas entre 1ª e 2ª dose e 8 semanas entre 2ª e 3ª dose. Para imunocomprometidos, após a 3ª dose, manter doses periódicas de 6/6 meses, até 4 anos, 11 meses e 29 dias de idade.',
    'crianca.4':
      'A vacina de febre amarela pode ser recomendada para a idade de 6 a 8 meses quando há alto risco de contrair a doença. Isso vale para quem vive ou vai viajar para área de risco epidemiológico, na impossibilidade de adiamento e mediante avaliação pelo serviço de saúde. E diante desse risco, todas as crianças devem manter a situação vacinal atualizada. No caso de viagem, a vacinação deve ser realizada pelo menos 10 dias antes, tempo necessário à proteção.',
    'crianca.5':
      'Em casos de indisponibilidade da vacina varicela monovalente, a vacina tetraviral poderá ser utilizada.',
    'crianca.6':
      'Somente povos indígenas, a partir de 5 anos de idade, sem histórico vacinal com pneumo conjugada.',
    'crianca.7':
      'Em caso de atraso, vacinar até 14 anos, 11 meses e 29 dias, o mais precocemente possível para melhor proteção. Não vacinados entre 15 anos a 19 anos, 11 meses e 29 dias, ver estratégia de cada estado.',

    'adolescente.1':
      'Em caso de atraso, vacinar até 14 anos, 11 meses e 29 dias. Não vacinados entre 15 anos e 19 anos, 11 meses e 29 dias, ver estratégia de cada estado.',
    'adolescente.2':
      'Manter a situação vacinal atualizada, principalmente para os residentes e viajantes para área de risco epidemiológico. Para os viajantes, recomenda-se vacinar pelo menos 10 dias antes da viagem.',
    'adolescente.3':
      'Toda a população nesta idade deve estar vacinada, principalmente aqueles em contato com imunodeprimidos, trabalhadores que atuam na área de pediatria e mulheres que programam engravidar.',
    'adolescente.4':
      'Somente para trabalhadores da saúde e povos indígenas, sem história da doença ou na dúvida.',
    'adolescente.5': 'Somente para povos indígenas sem histórico vacinal com pneumo conjugada.',
    'adolescente.6':
      'Em caso de atraso, vacinar até 14 anos, 11 meses e 29 dias de idade. Além da vacina, outras medidas são importantes para a prevenção e controle da dengue. Utilizar um só laboratório para o esquema vacinal.',
    'adolescente.7': 'Em caso de atraso, vacinar até 14 anos, 11 meses e 29 dias de idade.',
    'adolescente.8':
      'Para profissionais de saúde, parteiras tradicionais e estagiários que atuam com recém-nascidos, recomenda-se a vacina dTpa.',

    'adulto.1':
      '1 dose de reforço aos 34 anos e, na sequência, 1 dose a cada 10 anos, antecipando para 5 anos em caso de exposição a risco de difteria e tétano. Para profissionais de saúde, parteiras tradicionais e estagiários que atuam com recém-nascidos, recomenda-se a vacina dTpa.',
    'adulto.2':
      'Manter a situação vacinal atualizada, principalmente para os residentes e viajantes para área de risco epidemiológico. Para os viajantes, recomenda-se vacinar pelo menos 10 dias antes da viagem.',
    'adulto.3':
      'Toda a população nesta idade deve estar vacinada, principalmente aqueles em contato com imunodeprimidos, trabalhadores que atuam na área de pediatria e mulheres que programam engravidar.',
    'adulto.4':
      'Somente para trabalhadores da saúde e povos indígenas, sem história da doença ou na dúvida.',
    'adulto.5': 'Somente para povos indígenas sem histórico vacinal com pneumo conjugada.',

    'idoso.1':
      '1 dose de reforço a cada 10 anos após a última dose de vacina com componentes toxóides diftérico e tetânico, antecipando para 5 anos em caso de exposição a risco de difteria e tétano. Para profissionais de saúde, parteiras tradicionais e estagiários que atuam com recém-nascidos, recomenda-se a vacina dTpa.',
    'idoso.2':
      'Somente para não vacinados, quando há alto risco de contrair a doença. Isso vale para os residentes e viajantes para área de risco epidemiológico e deve ser precedido por avaliação pelo serviço de saúde. Para os viajantes, recomenda-se vacinar pelo menos 10 dias antes da viagem.',
    'idoso.3':
      'Somente para trabalhador de saúde com atuação profissional. Recomenda-se atualizar a situação vacinal, precedido por avaliação pelo serviço de saúde.',
    'idoso.4':
      'Somente para trabalhadores da saúde e povos indígenas, sem história da doença ou na dúvida. A vacinação deve ser precedida por avaliação pelo serviço de saúde.',
    'idoso.5':
      'Somente para não vacinados que vivem acamados e/ou institucionalizados (como em casas geriátricas, hospitais, unidades de acolhimento, instituições de longa permanência e casas de repouso) e povos indígenas sem histórico vacinal com pneumocócica conjugada.',

    'gestante.1':
      'Somente se considera a vacinação em caso de residente ou viajante para área de risco epidemiológico, na impossibilidade de adiamento e mediante avaliação pelo serviço de saúde sobre o risco-benefício da vacinação. Neste contexto, recomenda-se 1 dose para aquelas sem comprovação vacinal, para as vacinadas com 1 dose antes dos 5 anos de idade e para as que receberam apenas dose fracionada (em 2018). Em caso de viajantes, é de 10 dias o prazo mínimo para a vacinação antes da viagem, tendo em vista o tempo necessário à soroconversão.',
    'gestante.2': 'Esta vacina protege também o bebê nos seus primeiros meses de vida.',
  },
};
