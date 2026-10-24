#!/usr/bin/env node
/**
 * Registra no GitHub Projects a gestão de testes que o Jira com Xray fazia na aula: casos de teste,
 * plano de testes e execução, como issues ligadas aos itens do backlog, e gera o relatório
 * `docs/07-testes/gestao-de-testes-github.md`. A fonte é `docs/07-testes/gestao-de-testes.json`.
 * Pode ser repetido: o que já existe (pelo código `[T01]` no título) é atualizado, não duplicado.
 * Rode antes `node scripts/backlog-github.mjs` (cria as issues dos itens do backlog).
 *
 * Uso: node scripts/testes-github.mjs --owner edukamoz --project proj-vacina-em-dia --repo edukamoz/vacina-em-dia
 *
 * Equivalência com o Xray: Test = caso de teste (passos, dados, resultado esperado); Test Plan =
 * plano de testes; Test Execution = execução com o resultado de cada teste; Overall Test Coverage =
 * a tabela de cobertura do relatório. O campo "Resultado" do projeto guarda Passou, Falhou ou Não
 * executado. Só se registra "Passou" com evidência escrita no JSON.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const OWNER = opt('owner', 'edukamoz');
const PROJECT_TITLE = opt('project', 'proj-vacina-em-dia');
const REPO = opt('repo', 'edukamoz/vacina-em-dia');

const lerJson = (rel) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
const gestao = lerJson('../docs/07-testes/gestao-de-testes.json');
const backlog = lerJson('../docs/backlog/itens.json');
const tmp = mkdtempSync(join(tmpdir(), 'testes-'));

function gh(...a) {
  return execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}
let n = 0;
function gql(query, variables = {}) {
  const file = join(tmp, `q${n++}.json`);
  writeFileSync(file, JSON.stringify({ query, variables }));
  return JSON.parse(gh('api', 'graphql', '--input', file)).data;
}

const CORES = ['GRAY', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'RED', 'PINK', 'PURPLE'];
const opcoes = (nomes, cores) =>
  nomes.map((name, i) => ({ name, color: (cores ?? CORES)[i % CORES.length], description: '' }));
const RESULTADOS = ['Passou', 'Falhou', 'Não executado'];
const TIPOS = ['História', 'Épico', 'Teste', 'Plano de testes', 'Execução de testes', 'Defeito'];

// ---------- projeto e campos
const projeto = JSON.parse(
  gh('project', 'list', '--owner', OWNER, '--format', 'json', '-L', '100'),
).projects.find((p) => p.title === PROJECT_TITLE);
if (!projeto) throw new Error(`Projeto "${PROJECT_TITLE}" não encontrado em ${OWNER}.`);
const campos = () =>
  JSON.parse(
    gh(
      'project',
      'field-list',
      String(projeto.number),
      '--owner',
      OWNER,
      '--format',
      'json',
      '-L',
      '100',
    ),
  ).fields;
let fs = campos();

function garantirSelecao(nome, nomes, cores) {
  const existente = fs.find((f) => f.name === nome);
  if (existente) {
    gql(
      `mutation($f: ID!, $o: [ProjectV2SingleSelectFieldOptionInput!]!) { updateProjectV2Field(input: {fieldId: $f, singleSelectOptions: $o}) { projectV2Field { ... on ProjectV2SingleSelectField { id } } } }`,
      { f: existente.id, o: opcoes(nomes, cores) },
    );
    return;
  }
  gql(
    `mutation($i: CreateProjectV2FieldInput!) { createProjectV2Field(input: $i) { projectV2Field { ... on ProjectV2FieldCommon { id } } } }`,
    {
      i: {
        projectId: projeto.id,
        dataType: 'SINGLE_SELECT',
        name: nome,
        singleSelectOptions: opcoes(nomes, cores),
      },
    },
  );
}
garantirSelecao('Tipo', TIPOS);
garantirSelecao('Resultado', RESULTADOS, ['GREEN', 'RED', 'GRAY']);
fs = campos();
const campo = (nome) => fs.find((f) => f.name === nome);
const opcaoId = (nomeCampo, nomeOpcao) => {
  const o = campo(nomeCampo).options.find((x) => x.name === nomeOpcao);
  if (!o) throw new Error(`Opção "${nomeOpcao}" não existe em ${nomeCampo}`);
  return o.id;
};

for (const [nome, cor] of [
  ['test', '1D76DB'],
  ['test-plan', '5319E7'],
  ['test-execution', 'FBCA04'],
]) {
  try {
    gh('label', 'create', nome, '-R', REPO, '--color', cor, '--force');
  } catch {
    /* o rótulo já existe */
  }
}

// ---------- o que já existe
const todas = JSON.parse(
  gh(
    'issue',
    'list',
    '-R',
    REPO,
    '--state',
    'all',
    '-L',
    '500',
    '--json',
    'number,title,id,url,state,labels',
  ),
);
const issuePorCodigo = new Map();
for (const i of todas) {
  const m = /^\[([A-Z]+\d+)\]/.exec(i.title);
  if (m) issuePorCodigo.set(m[1], i);
}
const noProjeto = new Map();
let cursor = null;
for (;;) {
  const r = gql(
    `query($p: ID!, $c: String) { node(id: $p) { ... on ProjectV2 { items(first: 100, after: $c) { pageInfo { hasNextPage endCursor } nodes { id content { ... on Issue { id } } } } } } }`,
    { p: projeto.id, c: cursor },
  ).node.items;
  for (const it of r.nodes) if (it.content?.id) noProjeto.set(it.content.id, it.id);
  if (!r.pageInfo.hasNextPage) break;
  cursor = r.pageInfo.endCursor;
}

function definirSelecao(item, nomeCampo, valor) {
  gql(
    `mutation($p: ID!, $i: ID!, $f: ID!, $v: ProjectV2FieldValue!) { updateProjectV2ItemFieldValue(input: {projectId: $p, itemId: $i, fieldId: $f, value: $v}) { projectV2Item { id } } }`,
    {
      p: projeto.id,
      i: item,
      f: campo(nomeCampo).id,
      v: { singleSelectOptionId: opcaoId(nomeCampo, valor) },
    },
  );
}

function garantirIssue(codigo, titulo, corpo, rotulo, { tipo, resultado, status, fechar }) {
  const arquivo = join(tmp, `${codigo}.md`);
  writeFileSync(arquivo, corpo);
  const tituloCompleto = `[${codigo}] ${titulo}`;
  let issue = issuePorCodigo.get(codigo);
  if (issue) {
    gh(
      'issue',
      'edit',
      String(issue.number),
      '-R',
      REPO,
      '--title',
      tituloCompleto,
      '--body-file',
      arquivo,
    );
  } else {
    const url = gh(
      'issue',
      'create',
      '-R',
      REPO,
      '--title',
      tituloCompleto,
      '--body-file',
      arquivo,
      '--label',
      rotulo,
    );
    issue = JSON.parse(gh('issue', 'view', url, '--json', 'number,id,url,state'));
    issuePorCodigo.set(codigo, issue);
  }
  try {
    gh('issue', 'edit', String(issue.number), '-R', REPO, '--add-assignee', OWNER);
  } catch {
    /* sem permissão para atribuir */
  }
  let item = noProjeto.get(issue.id);
  if (!item) {
    item = gql(
      `mutation($p: ID!, $c: ID!) { addProjectV2ItemById(input: {projectId: $p, contentId: $c}) { item { id } } }`,
      { p: projeto.id, c: issue.id },
    ).addProjectV2ItemById.item.id;
    noProjeto.set(issue.id, item);
  }
  definirSelecao(item, 'Tipo', tipo);
  if (resultado) definirSelecao(item, 'Resultado', resultado);
  if (status) definirSelecao(item, 'Status', status);
  if (fechar && issue.state !== 'CLOSED') {
    gh('issue', 'close', String(issue.number), '-R', REPO, '--reason', 'completed');
  }
  console.log(`${codigo} -> #${issue.number}`);
  return issue;
}

const ligacao = (id) => {
  const i = issuePorCodigo.get(id);
  return i ? `#${i.number} (${id})` : id;
};

// ---------- casos de teste
const issuesTeste = new Map();
for (const t of gestao.testes) {
  const corpo = [
    `**Tipo:** ${t.tipo}  `,
    `**Cobre os itens do backlog:** ${t.itens.map(ligacao).join(', ')}  `,
    `**Requisitos:** ${t.requisitos.join(', ')}`,
    '',
    `**Pré-condição:** ${t.precondicao}`,
    '',
    '### Passos',
    '| # | Ação | Dados | Resultado esperado |',
    '|---|---|---|---|',
    ...t.passos.map((p, i) => `| ${i + 1} | ${p.acao} | ${p.dados} | ${p.esperado} |`),
    '',
    `**Automação:** ${t.automatizado}`,
    '',
    `**Último resultado (${gestao.execucao.data.split('-').reverse().join('/')}):** ${t.resultado}. ${t.evidencia}`,
  ].join('\n');
  const issue = garantirIssue(t.id, t.titulo, corpo, 'test', {
    tipo: 'Teste',
    resultado: t.resultado,
    status: t.resultado === 'Passou' ? 'Concluído' : 'Em análise',
  });
  issuesTeste.set(t.id, issue);
}

// ---------- plano e execução
const linhasTestes = gestao.testes.map((t) => `- [ ] #${issuesTeste.get(t.id).number} ${t.titulo}`);
const plano = gestao.plano;
garantirIssue(
  plano.codigo,
  plano.titulo,
  [
    plano.objetivo,
    '',
    '### Casos de teste do plano',
    ...linhasTestes,
    '',
    'Execuções deste plano: ver a issue de Execução de testes. Relatório de cobertura: `docs/07-testes/gestao-de-testes-github.md`.',
  ].join('\n'),
  'test-plan',
  { tipo: 'Plano de testes', status: 'Em análise' },
);

const exec = gestao.execucao;
const linhasExec = gestao.testes.map(
  (t) => `| #${issuesTeste.get(t.id).number} | ${t.titulo} | ${t.resultado} | ${t.evidencia} |`,
);
const contagem = (r) => gestao.testes.filter((t) => t.resultado === r).length;
const execIssue = garantirIssue(
  exec.codigo,
  exec.titulo,
  [
    `**Data:** ${exec.data.split('-').reverse().join('/')}  `,
    `**Ambiente:** ${exec.ambiente}  `,
    `**Plano:** #${issuePorCodigo.get(plano.codigo).number}`,
    '',
    `**Resumo:** ${exec.resumo}`,
    '',
    `**Resultado geral:** ${contagem('Passou')} passaram, ${contagem('Falhou')} falharam, ${contagem('Não executado')} não executados, de ${gestao.testes.length}.`,
    '',
    '| Teste | Título | Resultado | Evidência |',
    '|---|---|---|---|',
    ...linhasExec,
  ].join('\n'),
  'test-execution',
  { tipo: 'Execução de testes', status: 'Concluído', fechar: true },
);

// ---------- relatório
const itensCobertos = new Set(gestao.testes.flatMap((t) => t.itens));
const reqs = new Map();
for (const t of gestao.testes)
  for (const r of t.requisitos) (reqs.get(r) ?? reqs.set(r, []).get(r)).push(t);
const totalItens = backlog.itens.length;
const link = (id) => `https://github.com/${REPO}/issues/${issuesTeste.get(id).number}`;
const relatorio = [
  '# Gestão de testes no GitHub Projects',
  '',
  `Item B65. Gerado por \`scripts/testes-github.mjs\` a partir de \`docs/07-testes/gestao-de-testes.json\` em ${exec.data.split('-').reverse().join('/')}. É o equivalente, no GitHub Projects, ao que a aula de gerenciamento de testes fazia no Jira com o Xray: casos de teste (Test), plano (Test Plan), execução (Test Execution) e relatório de cobertura.`,
  '',
  '## Como o Xray foi traduzido',
  '',
  '| Xray (Jira) | Aqui (GitHub Projects) |',
  '|---|---|',
  '| Test | Issue com o rótulo `test` e Tipo "Teste": passos, dados e resultado esperado em tabela |',
  '| Test Plan | Issue `test-plan` (Tipo "Plano de testes") com a lista dos testes |',
  '| Test Execution | Issue `test-execution` (Tipo "Execução de testes") com o resultado de cada teste |',
  '| Resultado PASS / FAIL | Campo "Resultado": Passou, Falhou ou Não executado |',
  '| Requisito → Teste | Cada teste cita os itens do backlog que cobre; o item no projeto tem a issue `[Bnn]` |',
  '| Bug a partir do teste | Issue com Tipo "Defeito", ligada ao teste que falhou (nenhuma falha nesta execução) |',
  '| Overall Test Coverage | Tabela abaixo |',
  '',
  '## Plano e execução',
  '',
  `- Plano: #${issuePorCodigo.get(plano.codigo).number} (${plano.titulo})`,
  `- Execução: #${execIssue.number} (${exec.titulo})`,
  `- Resultado: ${contagem('Passou')} passaram, ${contagem('Falhou')} falharam, ${contagem('Não executado')} não executados, de ${gestao.testes.length} casos.`,
  `- ${exec.resumo}`,
  '',
  '## Casos de teste',
  '',
  '| Teste | Título | Itens do backlog | Requisitos | Tipo | Resultado |',
  '|---|---|---|---|---|---|',
  ...gestao.testes.map(
    (t) =>
      `| [${t.id}](${link(t.id)}) | ${t.titulo} | ${t.itens.join(', ')} | ${t.requisitos.join(', ')} | ${t.tipo} | ${t.resultado} |`,
  ),
  '',
  '## Cobertura de requisitos por casos registrados',
  '',
  '| Requisito | Casos | Resultado |',
  '|---|---|---|',
  ...[...reqs.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([r, ts]) =>
        `| ${r} | ${ts.map((t) => t.id).join(', ')} | ${ts.every((t) => t.resultado === 'Passou') ? 'Passou' : 'Há falha ou pendência'} |`,
    ),
  '',
  `**Itens do backlog com ao menos um caso registrado:** ${itensCobertos.size} de ${totalItens} (${Math.round((itensCobertos.size / totalItens) * 100)}%).`,
  '',
  '## Limites',
  '',
  '- Estes 12 casos são os **mais relevantes**, não todos. A suíte automatizada completa (centenas de testes Jest, pytest, Postman e Playwright, cada um com seu ID `CT-...`) continua sendo a fonte da cobertura; ela roda a cada push no CI.',
  '- A cobertura acima conta só o que foi registrado como caso aqui. Requisitos fora da lista (por exemplo RF02, RF05 e RF08) têm testes automatizados, mas não têm caso registrado nesta lista.',
  '- Os resultados automatizados vêm da execução de 23/10/2026 descrita no JSON. O caso T12 é um relato da autora, sem captura anexada.',
  '- Para a professora ver o projeto, a autora precisa adicioná-la como colaboradora do repositório ou do projeto (é preciso o usuário do GitHub dela; o e-mail da Fatec sozinho não basta).',
  '',
].join('\n');
writeFileSync(
  fileURLToPath(new URL('../docs/07-testes/gestao-de-testes-github.md', import.meta.url)),
  relatorio,
);
console.log(`Pronto: ${gestao.testes.length} testes, 1 plano, 1 execução.`);
