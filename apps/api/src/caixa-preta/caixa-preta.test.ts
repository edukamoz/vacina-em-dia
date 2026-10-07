import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { novoAmbiente, type Obtido } from './ambiente';
import { CASOS, type Caso } from './casos';

/**
 * Executa todos os casos de caixa preta (partição de equivalência e análise de valor limite) pela
 * camada de handlers da API, com a validação e as regras reais, e compara o resultado obtido com o
 * esperado. Com `GERAR_TABELA=1`, grava a tabela de execução em
 * `docs/07-testes/caixa-preta-execucao.md` com os resultados **obtidos nesta execução**.
 */
const resultados = new Map<string, { obtido: Obtido; aprovado: boolean }>();

function confere(caso: Caso, obtido: Obtido): boolean {
  const { esperado } = caso;
  return (
    obtido.status === esperado.status &&
    (esperado.code === undefined || obtido.code === esperado.code) &&
    (esperado.detalhe === undefined || obtido.detalhe === esperado.detalhe) &&
    (esperado.code !== undefined || obtido.code === undefined)
  );
}

describe('caixa preta: partição de equivalência e análise de valor limite', () => {
  test('CT-CP-00: os identificadores dos casos são únicos e não há caso sem esperado', () => {
    const ids = CASOS.map((caso) => caso.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CASOS.length).toBeGreaterThanOrEqual(100);
  });

  test.each(CASOS.map((caso) => [caso.id, caso] as const))('%s', async (_id, caso) => {
    const obtido = await caso.executar(novoAmbiente());
    const aprovado = confere(caso, obtido);
    resultados.set(caso.id, { obtido, aprovado });
    expect(obtido).toMatchObject({
      status: caso.esperado.status,
      ...(caso.esperado.code === undefined ? {} : { code: caso.esperado.code }),
      ...(caso.esperado.detalhe === undefined ? {} : { detalhe: caso.esperado.detalhe }),
    });
  });

  afterAll(() => {
    if (process.env['GERAR_TABELA'] !== '1') return;
    writeFileSync(
      join(__dirname, '..', '..', '..', '..', 'docs', '07-testes', 'caixa-preta-execucao.md'),
      tabela(),
    );
  });
});

const texto = (valor: string) => valor.replace(/\|/g, '\\|');
const descreve = (e: { status: number; code?: string | undefined; detalhe?: string | undefined }) =>
  [e.status, e.code, e.detalhe].filter((parte) => parte !== undefined).join(' ');

function tabela(): string {
  let commit = 'desconhecido';
  try {
    commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    // Sem Git (por exemplo, em um zip), o commit fica desconhecido.
  }
  const data = new Date().toISOString().slice(0, 10);
  const lista = CASOS.map((caso) => ({ caso, resultado: resultados.get(caso.id) }));
  const aprovados = lista.filter((item) => item.resultado?.aprovado).length;
  const funcionalidades = [...new Set(CASOS.map((caso) => caso.funcionalidade))];

  const resumo = funcionalidades.map((nome) => {
    const itens = lista.filter((item) => item.caso.funcionalidade === nome);
    const ok = itens.filter((item) => item.resultado?.aprovado).length;
    const pe = itens.filter((item) => item.caso.tecnica === 'PE').length;
    return `| ${nome} | ${itens[0]?.caso.requisito} | ${itens.length} | ${pe} | ${itens.length - pe} | ${ok} | ${itens.length - ok} |`;
  });

  const secoes = funcionalidades.map((nome) => {
    const linhas = lista
      .filter((item) => item.caso.funcionalidade === nome)
      .map(({ caso, resultado }) => {
        const obtido = resultado ? descreve(resultado.obtido) : 'não executado';
        const situacao = resultado
          ? resultado.aprovado
            ? 'Aprovado'
            : 'Reprovado'
          : 'Não executado';
        return `| ${caso.id} | ${caso.tecnica} | ${texto(caso.classe)} | ${texto(caso.entrada)} | ${descreve(caso.esperado)} | ${obtido} | ${situacao} |`;
      });
    return [
      `## ${nome} (${lista.find((i) => i.caso.funcionalidade === nome)?.caso.requisito})`,
      '',
      '| ID | Técnica | Classe ou valor | Entrada | Esperado | Obtido | Resultado |',
      '|---|---|---|---|---|---|---|',
      ...linhas,
      '',
    ].join('\n');
  });

  return [
    '# Tabela de execução dos testes de caixa preta',
    '',
    '> **Arquivo gerado** pela execução automatizada (`GERAR_TABELA=1 npx jest src/caixa-preta` em `apps/api`). Não edite à mão: rode de novo. O "Obtido" é o que a API devolveu **nesta execução**, não o que se esperava.',
    '',
    `- **Data da execução:** ${data}`,
    `- **Versão do código (commit):** ${commit}`,
    `- **Resultado geral:** ${aprovados} de ${CASOS.length} casos aprovados`,
    '- **Como foi executado:** pelas camadas de entrada da API (validação Zod, handlers, serviços e regras de domínio reais), em memória, com relógio controlado (hoje = 2026-10-06), sem rede e sem Azure. Atende a "teste de caixa preta com tabela de execução" da entrega de Qualidade e Testes.',
    '- **Técnicas:** PE = partição de equivalência; VL = análise de valor limite. Descrição das partições e dos limites: `docs/07-testes/caixa-preta-casos.md`.',
    '- **Legenda de "Esperado" e "Obtido":** código HTTP, código de erro da API e, quando conferido, um detalhe (por exemplo, a faixa etária ou o estado da dose).',
    '',
    '## Resumo por funcionalidade',
    '',
    '| Funcionalidade | Requisito | Casos | PE | VL | Aprovados | Reprovados |',
    '|---|---|---|---|---|---|---|',
    ...resumo,
    `| **Total** | | **${CASOS.length}** | **${CASOS.filter((c) => c.tecnica === 'PE').length}** | **${CASOS.filter((c) => c.tecnica === 'VL').length}** | **${aprovados}** | **${CASOS.length - aprovados}** |`,
    '',
    ...secoes,
  ].join('\n');
}
