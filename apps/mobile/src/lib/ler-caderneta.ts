import {
  isValidCivilDate,
  compareCivilDates,
  type CivilDate,
  type DoseResponse,
} from '@vacina/shared';

/** Dose da pessoa que a leitura pode marcar como aplicada. */
export type DoseAlvo = Pick<DoseResponse, 'id' | 'vaccine' | 'doseLabel' | 'status'>;

/** Dose que a leitura encontrou na foto: qual é, a data lida e o trecho do texto de onde veio. */
export interface Encontrada {
  readonly dose: DoseAlvo;
  readonly data: CivilDate;
  readonly trecho: string;
}

/** Resultado da leitura: o que foi encaixado nas doses da pessoa e as linhas com data que não foram. */
export interface ResultadoLeitura {
  readonly encontradas: readonly Encontrada[];
  readonly semEncaixe: readonly string[];
}

/** Estados de dose que ainda podem receber uma aplicação (RF04). */
const ABERTAS: ReadonlySet<string> = new Set(['PENDING', 'SCHEDULED', 'OVERDUE']);

/**
 * Deixa o texto comparável: minúsculas, sem acento e sem as marcas de ordinal (ª, º, °), para que
 * "1ª dose" e "1a dose" fiquem iguais.
 *
 * @param texto - Texto lido ou nome do calendário.
 */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ªº°]/g, '').toLowerCase();
}

const DATA = /(?<!\d)(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4}|\d{2})(?!\d)/g;

/** Diz se a linha tem algo que parece uma data, valendo ou não (é outra linha do quadro). */
function temCaraDeData(linha: string): boolean {
  return new RegExp(DATA.source).test(linha);
}

/**
 * Procura a data de aplicação numa linha: `dd/mm/aaaa` (também com `-`, `.` ou espaços, e ano de dois
 * dígitos). Datas que não existem ou que ainda não chegaram são ignoradas, porque uma aplicação não
 * pode estar no futuro; com duas datas na linha vale a primeira que já passou.
 *
 * @param linha - Linha de texto lida da foto.
 * @param hoje - Dia de hoje.
 * @returns A data, ou `null` se a linha não tiver uma data válida.
 */
export function dataDaLinha(linha: string, hoje: CivilDate): CivilDate | null {
  const anoAtual = Number(hoje.slice(0, 4)) % 100;
  for (const achado of linha.matchAll(DATA)) {
    const [, d, m, a] = achado;
    if (d === undefined || m === undefined || a === undefined) continue;
    const ano =
      a.length === 4 ? Number(a) : Number(a) > anoAtual ? 1900 + Number(a) : 2000 + Number(a);
    const data = `${ano}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (isValidCivilDate(data) && compareCivilDates(data, hoje) <= 0) return data;
  }
  return null;
}

/**
 * Como cada vacina costuma aparecer na caderneta (sigla ou nome popular) e o que procurar no nome
 * da vacina do calendário. São só apelidos para reconhecer o texto: as vacinas, as doses e as
 * datas vêm sempre das doses da própria pessoa, nunca desta lista. A ordem importa: a penta vem
 * antes de DTP e de hepatite B porque o nome dela cita os dois.
 */
const APELIDOS: ReadonlyArray<{ readonly texto: RegExp; readonly nome: string }> = [
  { texto: /penta|dtp\s*\+\s*hib/, nome: 'penta' },
  { texto: /\bvip\b|\bvop\b|polio|paralisia/, nome: 'poliomielite' },
  { texto: /hepatite\s*a\b/, nome: 'hepatite a' },
  { texto: /hepatite\s*b\b|\bhb\b/, nome: 'hepatite b' },
  { texto: /rotav/, nome: 'rotavirus' },
  { texto: /pneumo/, nome: 'pneumococica' },
  { texto: /acwy/, nome: 'meningococica acwy' },
  { texto: /mening\w*\s*c\b/, nome: 'meningococica c' },
  { texto: /triplice\s*viral|\bscr\b|sarampo/, nome: 'triplice viral' },
  { texto: /febre\s*amarela|\bfa\b/, nome: 'febre amarela' },
  { texto: /varicela|catapora/, nome: 'varicela' },
  { texto: /\bdtp\b|triplice\s*bacteriana/, nome: 'dtp' },
  { texto: /\bdt\b|dupla\s*adulto/, nome: 'dt' },
  { texto: /\bhpv\b/, nome: 'hpv' },
  { texto: /covid/, nome: 'covid' },
  { texto: /influenza|gripe/, nome: 'influenza' },
  { texto: /dengue|\bdng4?\b/, nome: 'dng4' },
];

/**
 * Diz se o nome da vacina começa pelo apelido inteiro ("dt" não casa com "dtp"; "hpv" casa com
 * "hpv4").
 */
function comecaCom(nomeDaVacina: string, apelido: string): boolean {
  return nomeDaVacina.startsWith(apelido) && !/^[a-z]/.test(nomeDaVacina.slice(apelido.length));
}

/** Qual dose a linha cita: o número (`1` para "1ª dose", "D1" ou "R1") e se é reforço. */
function citacaoDaDose(texto: string): { numero: number | null; reforco: boolean } {
  const reforco = /refor|\br\d\b|\bref\b/.test(texto);
  const numero =
    /\b(\d)\s*a?\s*(?:dose|refor)/.exec(texto) ??
    /\b(?:d|r)(\d)\b/.exec(texto) ??
    /\b(\d)\s*a?\s*(?=\S*\s*(?:dose|refor))/.exec(texto);
  return { numero: numero?.[1] ? Number(numero[1]) : null, reforco };
}

/** Propriedades de uma dose do calendário que importam para casar com o texto. */
function propriedadesDaDose(dose: DoseAlvo) {
  const rotulo = normalizar(dose.doseLabel);
  return {
    reforco: rotulo.includes('refor'),
    // "3 doses" fala da série inteira, não de uma dose em particular.
    serie: /^\d+\s+doses/.test(rotulo),
    numero: /^(\d)/.exec(rotulo)?.[1] ? Number(/^(\d)/.exec(rotulo)?.[1]) : null,
  };
}

/** Escolhe, entre as doses abertas da vacina, a única que o texto indica; `null` se houver dúvida. */
function escolherDose(
  candidatas: readonly DoseAlvo[],
  citacao: { numero: number | null; reforco: boolean },
): DoseAlvo | null {
  const lista = candidatas.filter((dose) => {
    const p = propriedadesDaDose(dose);
    if (citacao.reforco !== p.reforco && (citacao.reforco || citacao.numero !== null)) return false;
    if (citacao.numero !== null) return !p.serie && p.numero === citacao.numero;
    return true;
  });
  return lista.length === 1 ? (lista[0] ?? null) : null;
}

/**
 * Lê o texto reconhecido de uma foto de caderneta ou comprovante e encaixa nas doses da pessoa.
 *
 * Para cada linha com uma data válida, procura a vacina na própria linha ou nas duas anteriores
 * (as colunas costumam sair em linhas separadas), descobre qual dose é e a propõe com aquela data.
 * Só propõe quando a dose é inequívoca: dose já aplicada ou cancelada, vacina que a pessoa não tem
 * ou dúvida entre duas doses vão para `semEncaixe`. Cada dose é usada uma vez. Quem decide é a
 * pessoa: nada é salvo aqui.
 *
 * @param linhas - Linhas de texto reconhecidas na foto.
 * @param doses - Doses da pessoa.
 * @param hoje - Dia de hoje (uma aplicação não pode estar no futuro).
 */
export function lerCaderneta(
  linhas: readonly string[],
  doses: readonly DoseAlvo[],
  hoje: CivilDate,
): ResultadoLeitura {
  const usadas = new Set<string>();
  const encontradas: Encontrada[] = [];
  const semEncaixe: string[] = [];

  linhas.forEach((linha, i) => {
    const data = dataDaLinha(linha, hoje);
    if (!data) return;

    // A janela vai da linha da data até duas acima, parando em outra linha que também tenha data.
    const janela = [linha];
    for (let k = i - 1; k >= Math.max(0, i - 2); k -= 1) {
      const anterior = linhas[k];
      if (anterior === undefined || temCaraDeData(anterior)) break;
      janela.push(anterior);
    }
    const textos = janela.map((l) => normalizar(l.replace(DATA, ' ')));
    const textoVacina = textos.find((t) => APELIDOS.some((a) => a.texto.test(t)));
    const apelido = textoVacina ? APELIDOS.find((a) => a.texto.test(textoVacina)) : undefined;
    if (!textoVacina || !apelido) {
      semEncaixe.push(linha);
      return;
    }

    const candidatas = doses.filter(
      (d) =>
        ABERTAS.has(d.status) &&
        !usadas.has(d.id) &&
        comecaCom(normalizar(d.vaccine), apelido.nome),
    );
    const dose = escolherDose(candidatas, citacaoDaDose(textos.join(' ')));
    if (!dose) {
      semEncaixe.push(linha);
      return;
    }
    usadas.add(dose.id);
    // O trecho vai da linha em que a vacina apareceu até a da data; linhas de cabeçalho acima não entram.
    const ate = textos.indexOf(textoVacina);
    encontradas.push({
      dose,
      data,
      trecho: janela
        .slice(0, ate + 1)
        .reverse()
        .join(' ')
        .trim(),
    });
  });

  return { encontradas, semEncaixe };
}
