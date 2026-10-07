// Gera docs/07-testes/execucao-estados-dose.md: a tabela de execução dos 42 casos de estados,
// transições, guardas, transições inválidas e caminhos (docs/07-testes/casos-teste-estados-dose.md).
// Roda o Jest nos pacotes que automatizam os casos e lê os resultados reais (--json); nada é escrito
// à mão. Uso: node scripts/gerar-execucao-estados.mjs
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pacotes = ['packages/shared', 'apps/api'];
const especificacao = readFileSync(
  join(raiz, 'docs', '07-testes', 'casos-teste-estados-dose.md'),
  'utf8',
);

/** Lê as linhas `| CT-XNN | ... |` das tabelas e as seções de caminhos (`**CT-C01: ...**`). */
const casos = new Map();
for (const linha of especificacao.replace(/\r/g, '').split('\n')) {
  const tabela = /^\| (CT-[ETGI]\d{2}) \| (.+) \|$/.exec(linha);
  if (tabela) {
    const colunas = tabela[2].split(' | ');
    casos.set(tabela[1], colunas.slice(0, -1).join(' | ') || colunas[0]);
    continue;
  }
  const caminho = /^\*\*(CT-C\d{2}): (.+)\*\*$/.exec(linha);
  if (caminho) casos.set(caminho[1], caminho[2]);
}

const resultados = new Map();
const pasta = mkdtempSync(join(tmpdir(), 'estados-'));
for (const pacote of pacotes) {
  const saida = join(pasta, `${pacote.replace('/', '-')}.json`);
  spawnSync('npx', ['jest', '--json', `--outputFile=${saida}`, '--silent'], {
    cwd: join(raiz, pacote),
    shell: true,
    stdio: 'ignore',
  });
  const relatorio = JSON.parse(readFileSync(saida, 'utf8'));
  for (const arquivo of relatorio.testResults) {
    for (const teste of arquivo.assertionResults) {
      const id =
        /^(CT-[ETGIC]\d{2})\b/.exec(teste.title)?.[1] ??
        /\b(CT-[ETGIC]\d{2})\b/.exec(teste.fullName)?.[1];
      if (!id) continue;
      const atual = resultados.get(id) ?? { total: 0, aprovados: 0, locais: new Set() };
      atual.total += 1;
      if (teste.status === 'passed') atual.aprovados += 1;
      atual.locais.add(pacote);
      resultados.set(id, atual);
    }
  }
}

let commit = 'desconhecido';
try {
  commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: raiz,
    encoding: 'utf8',
  }).stdout.trim();
} catch {
  // Sem Git, o commit fica desconhecido.
}

const ids = [...casos.keys()].sort();
const linhas = ids.map((id) => {
  const r = resultados.get(id);
  const situacao = !r
    ? 'Sem teste automatizado'
    : r.aprovados === r.total
      ? 'Aprovado'
      : 'Reprovado';
  const execucoes = r ? `${r.aprovados} de ${r.total}` : '0';
  const onde = r ? [...r.locais].join(', ') : '-';
  return `| ${id} | ${casos.get(id).replace(/\|/g, '\\|')} | ${execucoes} | ${onde} | ${situacao} |`;
});
const aprovados = ids.filter((id) => {
  const r = resultados.get(id);
  return r && r.aprovados === r.total;
}).length;

const texto = [
  '# Tabela de execução dos casos de teste de estados da dose',
  '',
  '> **Arquivo gerado** por `node scripts/gerar-execucao-estados.mjs`, que roda o Jest e lê os resultados reais. Não edite à mão.',
  '',
  `- **Data da execução:** ${new Date().toISOString().slice(0, 10)}`,
  `- **Versão do código (commit):** ${commit}`,
  `- **Resultado:** ${aprovados} de ${ids.length} casos aprovados`,
  '- **Especificação dos casos:** `docs/07-testes/casos-teste-estados-dose.md` (estados CT-E, transições CT-T, guardas CT-G, transições inválidas CT-I e caminhos CT-C).',
  '- **Como ler:** "Execuções" é quantos testes automatizados com o ID passaram sobre quantos existem (um caso pode ter vários, por exemplo, um por origem inválida). "Onde" é o pacote do teste.',
  '',
  '| ID | Caso | Execuções | Onde | Resultado |',
  '|---|---|---|---|---|',
  ...linhas,
  '',
].join('\n');
writeFileSync(join(raiz, 'docs', '07-testes', 'execucao-estados-dose.md'), texto);
console.log(`${aprovados} de ${ids.length} casos aprovados`);
