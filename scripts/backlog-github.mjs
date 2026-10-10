#!/usr/bin/env node
/**
 * Importa o backlog (`docs/backlog/itens.json`) para um GitHub Project (v2) e cria as issues no
 * repositório. Pode ser repetido: o que já existe (pelo código `[B01]` no título) é atualizado, não
 * duplicado. Precisa do `gh` autenticado com o escopo `project` (`gh auth refresh -s project`).
 *
 * Uso: node scripts/backlog-github.mjs --owner edukamoz --project proj-vacina-em-dia --repo edukamoz/vacina-em-dia [--dry-run]
 *
 * Campos criados no projeto: Status (A fazer, Em andamento, Em análise, Concluído), Épico,
 * Prioridade, Sprint, Requisitos, Personas e Jira. Nenhum item é marcado como Concluído.
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
const DRY = args.includes('--dry-run');

const dados = JSON.parse(
  readFileSync(fileURLToPath(new URL('../docs/backlog/itens.json', import.meta.url)), 'utf8'),
);
const tmp = mkdtempSync(join(tmpdir(), 'backlog-'));

function gh(...a) {
  return execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}

let n = 0;
function gql(query, variables = {}, features) {
  const file = join(tmp, `q${n++}.json`);
  writeFileSync(file, JSON.stringify({ query, variables }));
  const extra = features ? ['-H', `GraphQL-Features: ${features}`] : [];
  return JSON.parse(gh('api', 'graphql', ...extra, '--input', file)).data;
}

const CORES = ['GRAY', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'RED', 'PINK', 'PURPLE'];
const opcoes = (nomes, cores) =>
  nomes.map((name, i) => ({ name, color: (cores ?? CORES)[i % CORES.length], description: '' }));

const STATUS = ['A fazer', 'Em andamento', 'Em análise', 'Concluído'];
const PRIORIDADES = ['Must', 'Should', 'Could', "Won't (por enquanto)"];
const SPRINTS = Object.values(dados.sprints).map(([nome, periodo]) => `${nome} (${periodo})`);
const EPICOS = dados.epicos.map(([id, nome]) => `${id} ${nome}`);

// ---------- projeto
const lista = JSON.parse(
  gh('project', 'list', '--owner', OWNER, '--format', 'json', '-L', '100'),
).projects;
const projeto = lista.find((p) => p.title === PROJECT_TITLE);
if (!projeto) throw new Error(`Projeto "${PROJECT_TITLE}" não encontrado em ${OWNER}.`);
console.log(`Projeto #${projeto.number} (${projeto.id})`);
if (DRY) {
  console.log(`[dry-run] criaria ${dados.itens.length} issues e ${dados.epicos.length} épicos`);
  process.exit(0);
}

// ---------- campos
function campos() {
  return JSON.parse(
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
}
let fs = campos();

const status = fs.find((f) => f.name === 'Status');
gql(
  `mutation($f: ID!, $o: [ProjectV2SingleSelectFieldOptionInput!]!) { updateProjectV2Field(input: {fieldId: $f, singleSelectOptions: $o}) { projectV2Field { ... on ProjectV2SingleSelectField { id } } } }`,
  { f: status.id, o: opcoes(STATUS, ['GRAY', 'YELLOW', 'BLUE', 'GREEN']) },
);

function garantirCampo(name, dataType, nomes) {
  if (fs.some((f) => f.name === name)) {
    if (dataType === 'SINGLE_SELECT') {
      const f = fs.find((x) => x.name === name);
      gql(
        `mutation($f: ID!, $o: [ProjectV2SingleSelectFieldOptionInput!]!) { updateProjectV2Field(input: {fieldId: $f, singleSelectOptions: $o}) { projectV2Field { ... on ProjectV2SingleSelectField { id } } } }`,
        { f: f.id, o: opcoes(nomes) },
      );
    }
    return;
  }
  const input = { projectId: projeto.id, dataType, name };
  if (dataType === 'SINGLE_SELECT') input.singleSelectOptions = opcoes(nomes);
  gql(
    `mutation($i: CreateProjectV2FieldInput!) { createProjectV2Field(input: $i) { projectV2Field { ... on ProjectV2FieldCommon { id } } } }`,
    { i: input },
  );
}
garantirCampo('Épico', 'SINGLE_SELECT', EPICOS);
garantirCampo('Prioridade', 'SINGLE_SELECT', PRIORIDADES);
garantirCampo('Sprint', 'SINGLE_SELECT', SPRINTS);
garantirCampo('Requisitos', 'TEXT');
garantirCampo('Personas', 'TEXT');
garantirCampo('Jira', 'TEXT');
fs = campos();
const campo = (nome) => fs.find((f) => f.name === nome);
const opcaoId = (nomeCampo, nomeOpcao) => {
  const o = campo(nomeCampo).options.find((x) => x.name === nomeOpcao);
  if (!o) throw new Error(`Opção "${nomeOpcao}" não existe em ${nomeCampo}`);
  return o.id;
};

// ---------- rótulos e issues já existentes
for (const [nome, cor] of [
  ['backlog', '0B6B52'],
  ['epic', '6F42C1'],
]) {
  try {
    gh('label', 'create', nome, '-R', REPO, '--color', cor, '--force');
  } catch {
    /* o rótulo já existe */
  }
}
const existentes = new Map();
for (const issue of JSON.parse(
  gh(
    'issue',
    'list',
    '-R',
    REPO,
    '--state',
    'all',
    '--label',
    'backlog',
    '-L',
    '300',
    '--json',
    'number,title,id,url',
  ),
)) {
  const m = /^\[(B\d+|E\d+)\]/.exec(issue.title);
  if (m) existentes.set(m[1], issue);
}

// itens já no projeto (por id da issue)
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

function garantirIssue(codigo, titulo, corpo, rotulos) {
  const arquivo = join(tmp, `${codigo}.md`);
  writeFileSync(arquivo, corpo);
  const tituloCompleto = `[${codigo}] ${titulo}`;
  let issue = existentes.get(codigo);
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
      ...rotulos.flatMap((r) => ['--label', r]),
    );
    issue = JSON.parse(gh('issue', 'view', url, '--json', 'number,id,url'));
    existentes.set(codigo, issue);
  }
  let item = noProjeto.get(issue.id);
  if (!item) {
    item = gql(
      `mutation($p: ID!, $c: ID!) { addProjectV2ItemById(input: {projectId: $p, contentId: $c}) { item { id } } }`,
      { p: projeto.id, c: issue.id },
    ).addProjectV2ItemById.item.id;
    noProjeto.set(issue.id, item);
  }
  return { issue, item };
}

function definir(item, nomeCampo, valor) {
  if (valor === undefined || valor === null || valor === '') return;
  const f = campo(nomeCampo);
  const value =
    f.type === 'ProjectV2SingleSelectField'
      ? { singleSelectOptionId: opcaoId(nomeCampo, valor) }
      : { text: String(valor) };
  gql(
    `mutation($p: ID!, $i: ID!, $f: ID!, $v: ProjectV2FieldValue!) { updateProjectV2ItemFieldValue(input: {projectId: $p, itemId: $i, fieldId: $f, value: $v}) { projectV2Item { id } } }`,
    { p: projeto.id, i: item, f: f.id, v: value },
  );
}

// ---------- épicos
const epicoIssue = new Map();
for (const [id, nome, jira] of dados.epicos) {
  const corpo = `Épico **${nome}**${jira ? ` (Jira ${jira})` : ''}. Os itens deste épico estão ligados a ele como sub-itens e no campo "Épico" do projeto. Visão geral: \`docs/24-backlog.md\`.\n`;
  const { issue, item } = garantirIssue(id, nome, corpo, ['backlog', 'epic']);
  definir(item, 'Épico', `${id} ${nome}`);
  definir(item, 'Jira', jira);
  epicoIssue.set(id, issue);
  console.log(`Épico ${id} -> #${issue.number}`);
}

// ---------- itens
for (const it of dados.itens) {
  const [eid, enome] = dados.epicos.find((e) => e[0] === it.epico);
  const sprint = it.sprint ? SPRINTS[it.sprint - 1] : null;
  const corpo = [
    `**História:** ${it.titulo}`,
    '',
    `**Épico:** ${eid} ${enome}  `,
    `**Prioridade (MoSCoW):** ${it.prioridade}  `,
    `**Personas:** ${it.personas || '-'}  `,
    `**Requisitos:** ${it.requisitos || '-'}  `,
    `**Estado:** ${it.estado}${sprint ? `  \n**Sprint:** ${sprint}` : ''}`,
    it.jira ? `\n**Jira (origem):** ${it.jira}` : '',
    '',
    '### Critérios de aceite',
    ...it.criterios.map((c) => `- [ ] ${c}`),
    it.evidencia ? `\n**Evidência:** ${it.evidencia}` : '',
    it.nota ? `\n**Atenção:** ${it.nota}` : '',
    '',
    '_Estados seguem a convenção do professor; só a autora marca "Concluído"._',
  ].join('\n');
  const { issue, item } = garantirIssue(it.id, it.curto, corpo, ['backlog']);
  definir(item, 'Status', it.estado);
  definir(item, 'Épico', `${eid} ${enome}`);
  definir(item, 'Prioridade', it.prioridade);
  definir(item, 'Sprint', sprint);
  definir(item, 'Requisitos', it.requisitos);
  definir(item, 'Personas', it.personas);
  definir(item, 'Jira', it.jira);
  try {
    gql(
      `mutation($i: ID!, $s: ID!) { addSubIssue(input: {issueId: $i, subIssueId: $s}) { issue { id } } }`,
      { i: epicoIssue.get(eid).id, s: issue.id },
      'sub_issues',
    );
  } catch {
    /* já ligada ou recurso indisponível: o campo Épico basta */
  }
  console.log(`${it.id} -> #${issue.number} (${it.estado})`);
}
console.log(
  `Pronto: ${dados.itens.length} itens e ${dados.epicos.length} épicos no projeto #${projeto.number}.`,
);
