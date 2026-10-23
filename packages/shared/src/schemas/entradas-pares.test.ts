import { doseEventInputSchema } from './dose';
import { memberInputSchema } from './family-api';

/**
 * Teste por combinação de pares (pairwise) das entradas da API.
 *
 * A enumeração exaustiva cresce de forma exponencial com o número de fatores; a combinação por
 * pares cobre todo par de valores de dois fatores em poucas linhas (técnica da aula de caixa
 * preta). Como valores inválidos se mascaram quando aparecem juntos, cada valor inválido também
 * ganha um caso próprio, com todos os outros fatores válidos ("um e somente um de cada vez").
 */

interface Valor<T> {
  readonly rotulo: string;
  /** `undefined` significa campo ausente no JSON. */
  readonly valor: T | undefined;
  readonly valido: boolean;
}

const v = <T>(rotulo: string, valor: T | undefined, valido: boolean): Valor<T> => ({
  rotulo,
  valor,
  valido,
});

/**
 * Gera linhas que cobrem todo par de valores de fatores distintos (algoritmo guloso e
 * determinístico: sem aleatoriedade, a mesma entrada dá sempre a mesma saída).
 *
 * @param tamanhos - Quantidade de valores de cada fator.
 * @returns Cada linha é o índice do valor escolhido em cada fator.
 */
function paresDeValores(tamanhos: readonly number[]): number[][] {
  const faltam = new Set<string>();
  for (let i = 0; i < tamanhos.length; i++) {
    for (let j = i + 1; j < tamanhos.length; j++) {
      for (let a = 0; a < tamanhos[i]!; a++) {
        for (let b = 0; b < tamanhos[j]!; b++) faltam.add(`${i}:${a}|${j}:${b}`);
      }
    }
  }
  const linhas: number[][] = [];
  while (faltam.size > 0) {
    const [primeiro] = faltam;
    const [lado1, lado2] = primeiro!.split('|').map((p) => p.split(':').map(Number));
    const linha = new Array<number>(tamanhos.length).fill(-1);
    linha[lado1![0]!] = lado1![1]!;
    linha[lado2![0]!] = lado2![1]!;
    for (let f = 0; f < tamanhos.length; f++) {
      if (linha[f] !== -1) continue;
      let melhor = 0;
      let melhorGanho = -1;
      for (let valor = 0; valor < tamanhos[f]!; valor++) {
        let ganho = 0;
        linha.forEach((outro, g) => {
          if (outro === -1 || g === f) return;
          const [x, y, xv, yv] = f < g ? [f, g, valor, outro] : [g, f, outro, valor];
          if (faltam.has(`${x}:${xv}|${y}:${yv}`)) ganho += 1;
        });
        if (ganho > melhorGanho) {
          melhorGanho = ganho;
          melhor = valor;
        }
      }
      linha[f] = melhor;
    }
    for (let i = 0; i < linha.length; i++) {
      for (let j = i + 1; j < linha.length; j++) faltam.delete(`${i}:${linha[i]}|${j}:${linha[j]}`);
    }
    linhas.push(linha);
  }
  return linhas;
}

/** Pares mais um caso por valor inválido (os demais fatores no primeiro valor, sempre válido). */
function casos(fatores: readonly (readonly Valor<unknown>[])[]): number[][] {
  const linhas = paresDeValores(fatores.map((f) => f.length));
  fatores.forEach((fator, i) => {
    fator.forEach((valor, indice) => {
      if (valor.valido) return;
      const linha = fatores.map(() => 0);
      linha[i] = indice;
      linhas.push(linha);
    });
  });
  return linhas;
}

/** Monta o corpo JSON: campo `undefined` não vai no corpo. */
function corpo(chaves: readonly string[], valores: readonly unknown[]): Record<string, unknown> {
  const resultado: Record<string, unknown> = {};
  chaves.forEach((chave, i) => {
    if (valores[i] !== undefined) resultado[chave] = valores[i];
  });
  return resultado;
}

describe('combinação por pares: gerador', () => {
  test('CT-PAR-01: cobre todo par de valores e usa bem menos linhas que a enumeração exaustiva', () => {
    const tamanhos = [6, 5, 4, 5];
    const linhas = paresDeValores(tamanhos);

    const cobertos = new Set<string>();
    for (const linha of linhas) {
      for (let i = 0; i < linha.length; i++) {
        for (let j = i + 1; j < linha.length; j++)
          cobertos.add(`${i}:${linha[i]}|${j}:${linha[j]}`);
      }
    }
    let esperados = 0;
    for (let i = 0; i < tamanhos.length; i++) {
      for (let j = i + 1; j < tamanhos.length; j++) esperados += tamanhos[i]! * tamanhos[j]!;
    }
    expect(cobertos.size).toBe(esperados);

    const exaustivo = tamanhos.reduce((produto, n) => produto * n, 1);
    expect(exaustivo).toBe(600);
    expect(linhas.length).toBeLessThan(exaustivo / 10);
    expect(paresDeValores(tamanhos)).toEqual(linhas);
  });
});

describe('combinação por pares: corpo de criação de membro (RF02)', () => {
  const nomes: Valor<string>[] = [
    v('nome comum', 'Maria', true),
    v('nome com acento e apóstrofo', "José D'Ávila Ñ", true),
    v('60 caracteres (limite superior)', 'a'.repeat(60), true),
    v('vazio', '', false),
    v('só espaços', '   ', false),
    v('61 caracteres (acima do limite)', 'a'.repeat(61), false),
  ];
  const nascimentos: Valor<string>[] = [
    v('data comum', '2024-05-20', true),
    v('29/02 de ano bissexto', '2024-02-29', true),
    v('29/02 de ano comum', '2023-02-29', false),
    v('formato brasileiro', '20/05/2024', false),
    v<string>('ausente', undefined, false),
  ];
  const gestantes: Valor<unknown>[] = [
    v('verdadeiro', true, true),
    v('falso', false, true),
    v('ausente (assume falso)', undefined, true),
    v('texto "sim"', 'sim', false),
  ];
  const parentescos: Valor<unknown>[] = [
    v('MOTHER', 'MOTHER', true),
    v('nulo', null, true),
    v('ausente (assume nulo)', undefined, true),
    v('fora da lista', 'AVÓ', false),
    v('minúsculas', 'mother', false),
  ];
  const fatores = [nomes, nascimentos, gestantes, parentescos] as const;
  const linhas = casos(fatores);

  test('CT-PAR-02: o esquema aceita exatamente as combinações em que todo valor é válido', () => {
    expect(linhas.length).toBeLessThan(6 * 5 * 4 * 5);
    for (const linha of linhas) {
      const valores = linha.map((indice, f) => fatores[f]![indice]!);
      const entrada = corpo(
        ['name', 'birthDate', 'isPregnant', 'relationship'],
        valores.map((x) => x.valor),
      );
      const resultado = memberInputSchema.safeParse(entrada);
      const descricao = valores.map((x) => x.rotulo).join(' | ');
      expect({ descricao, aceito: resultado.success }).toEqual({
        descricao,
        aceito: valores.every((x) => x.valido),
      });
    }
  });

  test('CT-PAR-03: nos casos aceitos, o nome vem sem espaços nas pontas e os padrões são aplicados', () => {
    const aceito = memberInputSchema.parse({ name: '  Maria  ', birthDate: '2024-05-20' });
    expect(aceito).toEqual({
      name: 'Maria',
      birthDate: '2024-05-20',
      isPregnant: false,
      relationship: null,
    });
  });
});

describe('combinação por pares: corpo de evento de dose (RF04)', () => {
  const tipos: Valor<string>[] = [
    v('SCHEDULE', 'SCHEDULE', true),
    v('UNSCHEDULE', 'UNSCHEDULE', true),
    v('RESCHEDULE', 'RESCHEDULE', true),
    v('APPLY', 'APPLY', true),
    v('CANCEL', 'CANCEL', true),
    v('MARK_OVERDUE (só a rotina usa)', 'MARK_OVERDUE', false),
    v('tipo inexistente', 'EXPLODIR', false),
  ];
  const datas: Valor<string>[] = [
    v('data válida', '2026-10-15', true),
    v('mês 13', '2026-13-01', true),
    v('formato brasileiro', '15/10/2026', true),
    v<string>('ausente', undefined, true),
  ];
  const confirmacoes: Valor<unknown>[] = [
    v('verdadeiro', true, true),
    v('falso', false, true),
    v<string>('ausente', undefined, true),
    v('texto "true"', 'true', true),
  ];

  /** Quem precisa de data e quem precisa de confirmação (regra do esquema). */
  const precisaData = new Set(['SCHEDULE', 'RESCHEDULE', 'APPLY']);
  const dataValida = (d: unknown) => d === '2026-10-15';

  test('CT-PAR-04: cada tipo exige só o seu campo; os outros campos são ignorados', () => {
    const fatores = [tipos, datas, confirmacoes] as const;
    const linhas = paresDeValores(fatores.map((f) => f.length));
    expect(linhas.length).toBeLessThan(7 * 4 * 4);
    for (const linha of linhas) {
      const [tipo, data, confirmado] = linha.map((indice, f) => fatores[f]![indice]!);
      const entrada = corpo(
        ['type', 'date', 'confirmed'],
        [tipo!.valor, data!.valor, confirmado!.valor],
      );
      const resultado = doseEventInputSchema.safeParse(entrada);

      const esperado = !tipo!.valido
        ? false
        : precisaData.has(tipo!.valor as string)
          ? dataValida(data!.valor)
          : tipo!.valor === 'CANCEL'
            ? typeof confirmado!.valor === 'boolean'
            : true;
      const descricao = [tipo!.rotulo, data!.rotulo, confirmado!.rotulo].join(' | ');
      expect({ descricao, aceito: resultado.success }).toEqual({ descricao, aceito: esperado });
    }
  });

  test('CT-PAR-05: UNSCHEDULE descarta data e confirmação enviadas por engano', () => {
    const resultado = doseEventInputSchema.parse({
      type: 'UNSCHEDULE',
      date: '2026-10-15',
      confirmed: true,
    });
    expect(resultado).toEqual({ type: 'UNSCHEDULE' });
  });
});
