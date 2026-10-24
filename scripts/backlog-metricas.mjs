#!/usr/bin/env node
/**
 * Calcula, a partir dos PRs mesclados no GitHub, os números de cada item do backlog e grava em
 * `docs/backlog/metricas.json`: PRs, data e hora da última entrega, linhas alteradas, peso e tempo
 * estimado. Nada é digitado à mão: tudo vem dos horários dos commits e dos tamanhos dos PRs.
 *
 * Uso: node scripts/backlog-metricas.mjs [--repo edukamoz/vacina-em-dia]
 *
 * Regras (também gravadas no JSON):
 * - Um PR pertence ao item cujo código (`B61`) ou chave do Jira (`SCRUM-18`) aparece no título ou
 *   no nome da branch.
 * - Tempo estimado: método dos "git-hours". Ordenam-se os horários dos commits do item; lacunas de
 *   até 2 horas contam inteiras (a pessoa seguia trabalhando); lacuna maior abre um novo bloco, e
 *   cada bloco ganha 30 minutos pelo trabalho antes do primeiro commit. É uma estimativa do tempo
 *   de trabalho em sessão (autor e agente juntos), NÃO as horas registradas da Documentação de
 *   Desenvolvimento, que são do autor.
 * - Peso (pontos de Fibonacci) pelo total de linhas alteradas nos PRs: até 50 = 1, 200 = 2,
 *   500 = 3, 1.500 = 5, 4.000 = 8, acima = 13. Inclui documentos e arquivos gerados, então é uma
 *   medida de tamanho, não de dificuldade.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const args = process.argv.slice(2);
const REPO = args.includes('--repo') ? args[args.indexOf('--repo') + 1] : 'edukamoz/vacina-em-dia';

const itensUrl = new URL('../docs/backlog/itens.json', import.meta.url);
const dados = JSON.parse(readFileSync(fileURLToPath(itensUrl), 'utf8'));
const porJira = new Map(dados.itens.filter((i) => i.jira).map((i) => [i.jira, i.id]));

const prs = JSON.parse(
  execFileSync(
    'gh',
    [
      'pr',
      'list',
      '-R',
      REPO,
      '--state',
      'merged',
      '-L',
      '500',
      '--json',
      'number,title,headRefName,mergedAt',
    ],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  ),
);

// Os PRs foram mesclados com commit de merge; os commits de cada PR são os que entram por ele.
// (A consulta de commits pela API do GitHub estoura o limite de nós em muitos PRs.)
function git(...a) {
  return execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}
const mesclagens = new Map();
for (const linha of git(
  'log',
  '--first-parent',
  '--merges',
  '--format=%H %P|%s',
  'origin/main',
).split(String.fromCharCode(10))) {
  const m = /^(\S+) (\S+) (\S+)\|Merge pull request #(\d+) /.exec(linha);
  if (m) mesclagens.set(Number(m[4]), { base: m[2], topo: m[3] });
}
function instantesDoPr(numero) {
  const mg = mesclagens.get(numero);
  if (!mg) return [];
  const datas = git('log', `${mg.base}..${mg.topo}`, '--format=%cI');
  return datas ? datas.split(String.fromCharCode(10)).map((d) => Date.parse(d)) : [];
}

const IGNORADOS =
  /(^|\/)(package-lock\.json|itens\.json|metricas\.json|24-backlog\.md)$|\.(png|jpe?g|svg|docx|pptx|ico|npz)$/i;
function linhasDoPr(numero) {
  const mg = mesclagens.get(numero);
  if (!mg) return 0;
  let total = 0;
  for (const l of git('diff', '--numstat', `${mg.base}...${mg.topo}`).split(
    String.fromCharCode(10),
  )) {
    const [a, d, arq] = l.split(String.fromCharCode(9));
    if (!arq || a === '-' || IGNORADOS.test(arq)) continue;
    total += Number(a) + Number(d);
  }
  return total;
}

const LACUNA_MAX_MIN = 120;
const BLOCO_INICIAL_MIN = 30;

function minutosDeTrabalho(instantes) {
  const ordenados = [...instantes].sort((a, b) => a - b);
  let total = 0;
  let anterior = null;
  for (const t of ordenados) {
    const lacunaMin = anterior === null ? Infinity : (t - anterior) / 60000;
    total += lacunaMin <= LACUNA_MAX_MIN ? lacunaMin : BLOCO_INICIAL_MIN;
    anterior = t;
  }
  return Math.round(total);
}

function pesoPorLinhas(linhas) {
  for (const [limite, peso] of [
    [50, 1],
    [200, 2],
    [500, 3],
    [1500, 5],
    [4000, 8],
  ]) {
    if (linhas <= limite) return peso;
  }
  return 13;
}

function codigosDoPr(pr) {
  const texto = `${pr.title} ${pr.headRefName}`;
  const codigos = new Set();
  for (const m of texto.matchAll(/\bB(\d{2})\b/gi)) codigos.add(`B${m[1]}`);
  for (const m of texto.matchAll(/SCRUM-\d+/gi)) {
    const id = porJira.get(m[0].toUpperCase());
    if (id) codigos.add(id);
  }
  return [...codigos];
}

const fmtData = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const fmtHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
});
const fmtIso = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const itens = {};
for (const pr of prs) {
  for (const codigo of codigosDoPr(pr)) {
    const atual = (itens[codigo] ??= { prs: [], instantes: [], linhas: 0, ultima: 0 });
    atual.prs.push(pr.number);
    atual.linhas += linhasDoPr(pr.number);
    atual.instantes.push(...instantesDoPr(pr.number));
    atual.ultima = Math.max(atual.ultima, Date.parse(pr.mergedAt));
  }
}

const saida = {};
for (const [codigo, v] of Object.entries(itens).sort(([a], [b]) => a.localeCompare(b))) {
  const quando = new Date(v.ultima);
  saida[codigo] = {
    prs: v.prs.sort((a, b) => a - b),
    finalizadoEm: fmtIso.format(quando),
    finalizadoEmTexto: `${fmtData.format(quando)} ${fmtHora.format(quando)}`,
    linhasAlteradas: v.linhas,
    peso: pesoPorLinhas(v.linhas),
    tempoEstimadoMin: minutosDeTrabalho(v.instantes),
    janelaMin: v.instantes.length ? Math.round((v.ultima - Math.min(...v.instantes)) / 60000) : 0,
    commits: v.instantes.length,
  };
}

const arquivo = {
  geradoPor: 'scripts/backlog-metricas.mjs',
  fuso: 'America/Sao_Paulo',
  regras: {
    tempo: `git-hours: lacunas de até ${LACUNA_MAX_MIN} min entre commits contam inteiras; lacuna maior abre bloco novo com ${BLOCO_INICIAL_MIN} min. Estimativa de trabalho em sessão (autor e agente), não as horas registradas da Documentação de Desenvolvimento.`,
    peso: 'Fibonacci pelo total de linhas alteradas nos PRs (sem lockfile, imagens, documentos Word e arquivos gerados do backlog): até 50 = 1, 200 = 2, 500 = 3, 1.500 = 5, 4.000 = 8, acima = 13.',
    finalizadoEm: 'Data e hora do merge do último PR do item.',
    janela:
      'Minutos do primeiro commit ao merge do último PR; inclui esperas (CI, noite), por isso é um teto.',
  },
  itens: saida,
};
writeFileSync(
  fileURLToPath(new URL('../docs/backlog/metricas.json', import.meta.url)),
  `${JSON.stringify(arquivo, null, 2)}\n`,
);
const sem = dados.itens.filter((i) => !saida[i.id]).map((i) => i.id);
console.log(`${Object.keys(saida).length} itens com PRs; sem PR: ${sem.join(', ') || 'nenhum'}`);
