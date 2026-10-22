import {
  compareCivilDates,
  type AssistantEntities,
  type AssistantReply,
  type CivilDate,
  type DoseResponse,
  type MemberInput,
  type MemberResponse,
  type ReminderItem,
} from '@vacina/shared';
import { descreverPrazo } from '../features/doses/lembretes-card';
import { formatCivilDate } from '../features/doses/format-date';
import { describeAge } from './dates';
import { cobertura, contarPorEstado, ROTULO_DO_ESTADO } from './estatisticas';

/**
 * O "poder" do assistente sobre a conta (B61), no aparelho. O serviço de PLN só entende a frase
 * (intenção e entidades: nomes, vacinas, datas, tela); quem cruza isso com os dados da pessoa
 * logada é o app, com as mesmas telas, regras e endpoints de sempre. Nada da conta vai ao PLN.
 *
 * Regras de segurança: **toda ação que grava algo pede confirmação** com um toque; o assistente só
 * cria pessoa e registra ou agenda dose; nunca exclui, cancela, troca e-mail nem senha. Sem IA
 * generativa: cada resposta é um modelo de frase preenchido com os dados.
 */

/** Um botão que o assistente oferece junto da resposta. */
export interface Passo {
  readonly rotulo: string;
  readonly variante?: 'principal' | 'secundario';
  /** Executa o passo e devolve a próxima resposta (ou nada). */
  readonly executar: () => Promise<Resposta | void>;
}

/** Resposta do assistente sobre a conta: o texto e, se houver, os botões. */
export interface Resposta {
  readonly texto: string;
  readonly passos?: readonly Passo[];
}

/** De onde vêm os dados da pessoa logada (consultas já guardadas pelo app). */
export interface FonteDeDados {
  readonly hoje: CivilDate;
  readonly email: string | null;
  membros(): Promise<readonly MemberResponse[]>;
  doses(memberId: string): Promise<readonly DoseResponse[]>;
  lembretes(): Promise<{ readonly items: readonly ReminderItem[]; readonly emailEnabled: boolean }>;
}

/** O que o assistente pode fazer (e só isto). */
export interface Efeitos {
  criarPessoa(input: MemberInput): Promise<MemberResponse>;
  aplicarDose(doseId: string, data: CivilDate): Promise<void>;
  agendarDose(doseId: string, data: CivilDate): Promise<void>;
  /** Abre uma tela do app; com `memberId`, seleciona antes essa pessoa. */
  abrir(rota: string, memberId?: string): void;
}

/** Telas que o assistente abre: rota e nome em português. */
export const TELAS: Readonly<Record<string, { rota: string; nome: string }>> = {
  painel: { rota: '/painel', nome: 'o Painel de gráficos' },
  postos: { rota: '/postos', nome: 'os Postos de saúde' },
  historico: { rota: '/historico', nome: 'o Histórico' },
  apoiar: { rota: '/apoiar', nome: 'o apoio por Pix' },
  familia: { rota: '/familia', nome: 'a Família' },
  conta: { rota: '/conta', nome: 'a Conta' },
  novidades: { rota: '/', nome: 'as Novidades de saúde (no fim da aba Doses)' },
  doses: { rota: '/', nome: 'as Doses' },
};

const MAX_LINHAS = 8;

/** Minúsculas, sem acento e sem pontuação, para comparar nomes e vacinas. */
export function simplificar(texto: string): string {
  return texto
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Pessoas da família citadas na frase (pelo primeiro nome ou pelo nome inteiro). */
export function pessoasCitadas(
  pergunta: string,
  entidades: AssistantEntities | undefined,
  membros: readonly MemberResponse[],
): MemberResponse[] {
  const palavras = new Set(simplificar(pergunta).split(' '));
  for (const nome of entidades?.names ?? []) {
    for (const palavra of simplificar(nome).split(' ')) palavras.add(palavra);
  }
  return membros.filter((membro) => {
    const primeiro = simplificar(membro.name).split(' ')[0] ?? '';
    return primeiro.length >= 3 && palavras.has(primeiro);
  });
}

/**
 * Completa uma data sem ano (`--MM-DD`) usando o ano de hoje: para registrar vale a mais recente
 * que não seja futura; para agendar, a próxima que não seja passada. Data com ano passa direto.
 */
export function completarData(
  data: string,
  hoje: CivilDate,
  sentido: 'passado' | 'futuro',
): CivilDate {
  if (!data.startsWith('--')) return data;
  const ano = Number(hoje.slice(0, 4));
  const diaEMes = data.slice(2);
  const nesteAno = `${ano}-${diaEMes}`;
  if (sentido === 'passado')
    return compareCivilDates(nesteAno, hoje) > 0 ? `${ano - 1}-${diaEMes}` : nesteAno;
  return compareCivilDates(nesteAno, hoje) < 0 ? `${ano + 1}-${diaEMes}` : nesteAno;
}

function somarDias(data: CivilDate, dias: number): CivilDate {
  const base = new Date(`${data}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/** Data pedida na frase: a citada, o dia relativo ("hoje", "ontem", "amanhã") ou, na falta, hoje. */
export function dataPedida(
  entidades: AssistantEntities | undefined,
  hoje: CivilDate,
  sentido: 'passado' | 'futuro',
): CivilDate | null {
  const citada = entidades?.dates?.[0];
  if (citada) return completarData(citada, hoje, sentido);
  switch (entidades?.relativeDay) {
    case 'yesterday':
      return somarDias(hoje, -1);
    case 'day_before_yesterday':
      return somarDias(hoje, -2);
    case 'tomorrow':
      return somarDias(hoje, 1);
    case 'today':
      return hoje;
    default:
      return sentido === 'passado' ? hoje : null;
  }
}

const ABERTAS: readonly DoseResponse['status'][] = ['PENDING', 'SCHEDULED', 'OVERDUE'];

function dataPrevista(dose: DoseResponse): CivilDate | null {
  return dose.scheduledDate ?? dose.dueDate ?? null;
}

function ordenarPorData(doses: readonly DoseResponse[]): DoseResponse[] {
  return [...doses].sort((a, b) =>
    (dataPrevista(a) ?? '9999-12-31').localeCompare(dataPrevista(b) ?? '9999-12-31'),
  );
}

function nomeDaDose(dose: DoseResponse): string {
  return `${dose.vaccine}, ${dose.doseLabel}`;
}

function limitar(linhas: readonly string[]): string {
  const mostradas = linhas.slice(0, MAX_LINHAS);
  const resto = linhas.length - mostradas.length;
  return mostradas.join('\n') + (resto > 0 ? `\ne mais ${resto}.` : '');
}

function botaoAbrir(efeitos: Efeitos, tela: keyof typeof TELAS, rotulo: string): Passo {
  const destino = TELAS[tela];
  return {
    rotulo,
    variante: 'secundario',
    executar: async () => {
      if (destino) efeitos.abrir(destino.rota);
    },
  };
}

/** Pede a confirmação de uma ação que grava dados: texto claro, "Confirmar" e "Cancelar". */
function confirmar(texto: string, rotulo: string, fazer: () => Promise<Resposta>): Resposta {
  return {
    texto,
    passos: [
      { rotulo, variante: 'principal', executar: fazer },
      {
        rotulo: 'Cancelar',
        variante: 'secundario',
        executar: async () => ({ texto: 'Tudo bem, não fiz nada.' }),
      },
    ],
  };
}

async function quemEstaNaFamilia(fonte: FonteDeDados): Promise<Resposta> {
  const membros = await fonte.membros();
  if (membros.length === 0) {
    return {
      texto:
        'Você ainda não cadastrou ninguém. Diga, por exemplo: adicionar Maria nascida em 10/02/2026.',
    };
  }
  const linhas = membros.map((m) => `• ${m.name}, ${describeAge(m.birthDate, fonte.hoje)}`);
  return {
    texto: `Você tem ${membros.length} ${membros.length === 1 ? 'pessoa cadastrada' : 'pessoas cadastradas'}:\n${limitar(linhas)}`,
  };
}

async function dosesDoEscopo(
  fonte: FonteDeDados,
  alvo: readonly MemberResponse[],
): Promise<{ membro: MemberResponse; doses: readonly DoseResponse[] }[]> {
  return Promise.all(alvo.map(async (membro) => ({ membro, doses: await fonte.doses(membro.id) })));
}

async function escopo(
  fonte: FonteDeDados,
  pergunta: string,
  entidades: AssistantEntities | undefined,
): Promise<MemberResponse[]> {
  const membros = await fonte.membros();
  const citados = pessoasCitadas(pergunta, entidades, membros);
  return citados.length > 0 ? citados : [...membros];
}

async function dosesAtrasadas(
  fonte: FonteDeDados,
  efeitos: Efeitos,
  pergunta: string,
  entidades: AssistantEntities | undefined,
): Promise<Resposta> {
  const alvo = await escopo(fonte, pergunta, entidades);
  if (alvo.length === 0) return { texto: 'Você ainda não cadastrou ninguém.' };
  const dados = await dosesDoEscopo(fonte, alvo);
  const linhas = dados.flatMap(({ membro, doses }) =>
    ordenarPorData(doses.filter((d) => d.status === 'OVERDUE')).map(
      (d) =>
        `• ${membro.name}: ${nomeDaDose(d)}${d.dueDate ? `, era para ${formatCivilDate(d.dueDate)}` : ''}`,
    ),
  );
  if (linhas.length === 0) {
    return {
      texto:
        alvo.length === 1
          ? `${alvo[0]?.name} não tem nenhuma dose atrasada.`
          : 'Nenhuma dose atrasada na sua família.',
    };
  }
  return {
    texto: `${linhas.length === 1 ? 'Há 1 dose atrasada' : `Há ${linhas.length} doses atrasadas`}:\n${limitar(linhas)}`,
    passos: [botaoAbrir(efeitos, 'doses', 'Abrir as doses')],
  };
}

async function proximaDose(
  fonte: FonteDeDados,
  efeitos: Efeitos,
  pergunta: string,
  entidades: AssistantEntities | undefined,
): Promise<Resposta> {
  const alvo = await escopo(fonte, pergunta, entidades);
  if (alvo.length === 0) return { texto: 'Você ainda não cadastrou ninguém.' };
  const dados = await dosesDoEscopo(fonte, alvo);
  const vacinas = new Set((entidades?.vaccines ?? []).map(simplificar));
  const linhas: string[] = [];
  for (const { membro, doses } of dados) {
    const futuras = ordenarPorData(
      doses.filter((d) => {
        const data = dataPrevista(d);
        const certaVacina = vacinas.size === 0 || vacinas.has(simplificar(d.vaccine));
        return (
          certaVacina &&
          (d.status === 'PENDING' || d.status === 'SCHEDULED') &&
          data !== null &&
          compareCivilDates(data, fonte.hoje) >= 0
        );
      }),
    );
    const proxima = futuras[0];
    if (proxima) {
      const rotulo = proxima.status === 'SCHEDULED' ? 'marcada para' : 'prevista para';
      linhas.push(
        `• ${membro.name}: ${nomeDaDose(proxima)}, ${rotulo} ${formatCivilDate(dataPrevista(proxima) ?? fonte.hoje)}`,
      );
    }
  }
  if (linhas.length === 0) {
    return {
      texto:
        'Não achei nenhuma dose com data prevista daqui para a frente. Confira o calendário de cada pessoa na aba Doses.',
    };
  }
  return {
    texto: `Próxima dose:\n${limitar(linhas)}`,
    passos: [botaoAbrir(efeitos, 'doses', 'Abrir as doses')],
  };
}

async function resumo(
  fonte: FonteDeDados,
  efeitos: Efeitos,
  pergunta: string,
  entidades: AssistantEntities | undefined,
): Promise<Resposta> {
  const alvo = await escopo(fonte, pergunta, entidades);
  if (alvo.length === 0) return { texto: 'Você ainda não cadastrou ninguém.' };
  const dados = await dosesDoEscopo(fonte, alvo);
  const todas = dados.flatMap((d) => d.doses);
  const contagem = contarPorEstado(todas);
  const total = contagem.APPLIED + contagem.SCHEDULED + contagem.PENDING + contagem.OVERDUE;
  if (total === 0) return { texto: 'Ainda não há doses no calendário para resumir.' };
  const quem = alvo.length === 1 ? alvo[0]?.name : 'a sua família';
  const partes = (['APPLIED', 'SCHEDULED', 'PENDING', 'OVERDUE'] as const)
    .map((estado) => `${contagem[estado]} ${ROTULO_DO_ESTADO[estado].toLowerCase()}`)
    .join(', ');
  return {
    texto: `Vacinação de ${quem}: ${cobertura(contagem)}% das doses já foram aplicadas (${partes}, de ${total} no total).`,
    passos: [botaoAbrir(efeitos, 'painel', 'Abrir o painel de gráficos')],
  };
}

async function lembretes(fonte: FonteDeDados, efeitos: Efeitos): Promise<Resposta> {
  const { items } = await fonte.lembretes();
  if (items.length === 0) {
    return {
      texto: 'Você não tem lembretes agora: nada atrasado, para hoje ou nos próximos 7 dias.',
    };
  }
  const linhas = items.map(
    (item) =>
      `• ${item.memberName}: ${item.vaccine}, ${item.doseLabel}, ${descreverPrazo(item, fonte.hoje)}`,
  );
  return {
    texto: `Você tem ${items.length} ${items.length === 1 ? 'lembrete' : 'lembretes'}:\n${limitar(linhas)}`,
    passos: [botaoAbrir(efeitos, 'doses', 'Abrir as doses')],
  };
}

async function dadosDaConta(fonte: FonteDeDados, efeitos: Efeitos): Promise<Resposta> {
  const { emailEnabled } = await fonte.lembretes();
  const email = fonte.email ?? 'não disponível';
  return {
    texto: `Você está com a conta ${email}. O lembrete por e-mail está ${emailEnabled ? 'ligado' : 'desligado'}. Por segurança, não mudo e-mail nem senha por aqui.`,
    passos: [botaoAbrir(efeitos, 'conta', 'Abrir a conta')],
  };
}

async function adicionarPessoa(
  fonte: FonteDeDados,
  efeitos: Efeitos,
  entidades: AssistantEntities | undefined,
): Promise<Resposta> {
  const nome = entidades?.names?.[0]?.trim();
  if (!nome) {
    return {
      texto:
        'Para adicionar alguém preciso do nome e da data de nascimento. Por exemplo: adicionar Maria nascida em 10/02/2026.',
    };
  }
  const nascimento = (entidades?.dates ?? []).find((d) => !d.startsWith('--'));
  if (!nascimento) {
    return {
      texto: `Qual a data de nascimento de ${nome}? Escreva, por exemplo: adicionar ${nome} nascida em 10/02/2026.`,
    };
  }
  if (compareCivilDates(nascimento, fonte.hoje) > 0 || nascimento < '1900-01-01') {
    return {
      texto: `A data ${formatCivilDate(nascimento)} não parece certa para um nascimento. Confira e escreva de novo.`,
    };
  }
  const existentes = await fonte.membros();
  if (existentes.some((m) => simplificar(m.name) === simplificar(nome))) {
    return {
      texto: `Já existe uma pessoa chamada ${nome} na sua família. Se for outra pessoa, use um sobrenome ou apelido.`,
    };
  }
  return confirmar(
    `Posso adicionar ${nome}, com nascimento em ${formatCivilDate(nascimento)}, à sua família?`,
    'Adicionar',
    async () => {
      const criada = await efeitos.criarPessoa({
        name: nome,
        birthDate: nascimento,
        isPregnant: false,
        relationship: null,
      });
      return {
        texto: `Pronto: ${criada.name} foi adicionada. O calendário de vacinas dela já está pronto.`,
        passos: [
          {
            rotulo: `Ver as doses de ${criada.name}`,
            variante: 'secundario',
            executar: async () => efeitos.abrir('/', criada.id),
          },
        ],
      };
    },
  );
}

type Acao = 'aplicar' | 'agendar';

async function alterarDose(
  acao: Acao,
  fonte: FonteDeDados,
  efeitos: Efeitos,
  pergunta: string,
  entidades: AssistantEntities | undefined,
  escolhida?: MemberResponse,
): Promise<Resposta> {
  const verbo = acao === 'aplicar' ? 'registrar' : 'agendar';
  const exemplo =
    acao === 'aplicar' ? 'a Maria tomou a BCG hoje' : 'agendar a gripe do João para 05/11/2026';
  const membros = await fonte.membros();
  if (membros.length === 0)
    return { texto: 'Você ainda não cadastrou ninguém. Adicione uma pessoa primeiro.' };

  let membro = escolhida;
  if (!membro) {
    const citados = pessoasCitadas(pergunta, entidades, membros);
    if (citados.length === 1) membro = citados[0];
    else if (citados.length === 0 && membros.length === 1) membro = membros[0];
    else {
      return {
        texto: `Para ${verbo} a dose, de quem é? Por exemplo: ${exemplo}.`,
        passos: membros.slice(0, 6).map((m) => ({
          rotulo: m.name,
          variante: 'secundario' as const,
          executar: () => alterarDose(acao, fonte, efeitos, pergunta, entidades, m),
        })),
      };
    }
  }
  if (!membro) return { texto: `Para ${verbo} a dose, diga a pessoa. Por exemplo: ${exemplo}.` };

  const vacinas = (entidades?.vaccines ?? []).map(simplificar);
  if (vacinas.length === 0) {
    return { texto: `Qual vacina? Por exemplo: ${exemplo}.` };
  }
  const data = dataPedida(entidades, fonte.hoje, acao === 'aplicar' ? 'passado' : 'futuro');
  if (!data) {
    return { texto: `Para agendar preciso da data. Por exemplo: ${exemplo}.` };
  }
  if (
    acao === 'aplicar' &&
    (compareCivilDates(data, fonte.hoje) > 0 || compareCivilDates(data, membro.birthDate) < 0)
  ) {
    return {
      texto: `Não posso registrar uma dose em ${formatCivilDate(data)}: a data precisa ser de hoje ou antes, e depois do nascimento de ${membro.name}.`,
    };
  }
  if (acao === 'agendar' && compareCivilDates(data, fonte.hoje) < 0) {
    return {
      texto: `Para agendar a data precisa ser de hoje em diante (você disse ${formatCivilDate(data)}).`,
    };
  }

  const doses = (await fonte.doses(membro.id)).filter((d) =>
    vacinas.includes(simplificar(d.vaccine)),
  );
  const podem = ordenarPorData(
    doses.filter((d) =>
      acao === 'aplicar'
        ? ABERTAS.includes(d.status)
        : d.status === 'PENDING' || d.status === 'OVERDUE',
    ),
  );
  const alvo = membro;
  if (podem.length === 0) {
    if (doses.length === 0) {
      return {
        texto: `Não encontrei essa vacina no calendário de ${alvo.name}. Confira o nome ou veja a aba Doses.`,
      };
    }
    const agendada = doses.find((d) => d.status === 'SCHEDULED');
    if (acao === 'agendar' && agendada) {
      return {
        texto: `${nomeDaDose(agendada)} de ${alvo.name} já está marcada para ${formatCivilDate(agendada.scheduledDate ?? fonte.hoje)}. Para mudar a data, abra a dose na aba Doses.`,
      };
    }
    return {
      texto: `${alvo.name} não tem dose em aberto dessa vacina (ela pode já estar aplicada ou cancelada). Veja o Histórico.`,
    };
  }

  const confirmarDose = (dose: DoseResponse): Resposta =>
    confirmar(
      acao === 'aplicar'
        ? `Posso marcar ${nomeDaDose(dose)} de ${alvo.name} como aplicada em ${formatCivilDate(data)}?`
        : `Posso agendar ${nomeDaDose(dose)} de ${alvo.name} para ${formatCivilDate(data)}?`,
      acao === 'aplicar' ? 'Registrar' : 'Agendar',
      async () => {
        if (acao === 'aplicar') await efeitos.aplicarDose(dose.id, data);
        else await efeitos.agendarDose(dose.id, data);
        return {
          texto:
            acao === 'aplicar'
              ? `Feito: ${nomeDaDose(dose)} de ${alvo.name} está como aplicada em ${formatCivilDate(data)}.`
              : `Feito: ${nomeDaDose(dose)} de ${alvo.name} está agendada para ${formatCivilDate(data)}.`,
          passos: [
            {
              rotulo: `Ver as doses de ${alvo.name}`,
              variante: 'secundario',
              executar: async () => efeitos.abrir('/', alvo.id),
            },
          ],
        };
      },
    );

  const [primeira] = podem;
  if (podem.length === 1 && primeira) return confirmarDose(primeira);
  return {
    texto: `${alvo.name} tem ${podem.length} doses em aberto dessa vacina. Qual delas?`,
    passos: podem.slice(0, 6).map((dose) => ({
      rotulo: dose.doseLabel,
      variante: 'secundario' as const,
      executar: async () => confirmarDose(dose),
    })),
  };
}

function abrirTela(efeitos: Efeitos, entidades: AssistantEntities | undefined): Resposta {
  const tela = entidades?.screen ? TELAS[entidades.screen] : undefined;
  if (!tela) {
    return {
      texto:
        'Posso abrir o painel de gráficos, os postos de saúde, o histórico, a família, as doses, a conta ou o apoio por Pix. Diga qual.',
      passos: ['painel', 'postos', 'historico', 'familia'].map((chave) =>
        botaoAbrir(
          efeitos,
          chave,
          `Abrir ${TELAS[chave]?.nome.replace(/^o |^a |^os |^as /, '') ?? chave}`,
        ),
      ),
    };
  }
  return {
    texto: `Posso abrir ${tela.nome}.`,
    passos: [
      {
        rotulo: `Abrir ${tela.nome.replace(/^o |^a |^os |^as /, '')}`,
        variante: 'principal',
        executar: async () => efeitos.abrir(tela.rota),
      },
    ],
  };
}

/** Intenções que o app responde com os dados da conta (o resto o serviço de PLN já respondeu). */
export function ehDaConta(intent: string): boolean {
  return intent.startsWith('conta_') || intent.startsWith('acao_');
}

/**
 * Monta a resposta de uma intenção da conta ou de um comando.
 *
 * @param reply - Resposta do serviço de PLN (intenção e entidades).
 * @param pergunta - O que a pessoa escreveu ou falou.
 * @param fonte - Dados da pessoa logada.
 * @param efeitos - O que o assistente pode fazer (criar pessoa, registrar e agendar dose, abrir telas).
 */
export async function responderDaConta(
  reply: AssistantReply,
  pergunta: string,
  fonte: FonteDeDados,
  efeitos: Efeitos,
): Promise<Resposta> {
  const entidades = reply.entities;
  switch (reply.intent) {
    case 'conta_quem_na_familia':
      return quemEstaNaFamilia(fonte);
    case 'conta_doses_atrasadas':
      return dosesAtrasadas(fonte, efeitos, pergunta, entidades);
    case 'conta_proxima_dose':
      return proximaDose(fonte, efeitos, pergunta, entidades);
    case 'conta_resumo_vacinacao':
      return resumo(fonte, efeitos, pergunta, entidades);
    case 'conta_meus_lembretes':
      return lembretes(fonte, efeitos);
    case 'conta_email':
      return dadosDaConta(fonte, efeitos);
    case 'acao_adicionar_pessoa':
      return adicionarPessoa(fonte, efeitos, entidades);
    case 'acao_registrar_dose':
      return alterarDose('aplicar', fonte, efeitos, pergunta, entidades);
    case 'acao_agendar_dose':
      return alterarDose('agendar', fonte, efeitos, pergunta, entidades);
    case 'acao_abrir_tela':
      return abrirTela(efeitos, entidades);
    default:
      return { texto: reply.text };
  }
}
