#!/usr/bin/env node
/**
 * Teste de carga leve da API (RNF01: 90% das requisições em menos de 3 segundos).
 *
 * Sem ferramenta externa: dispara requisições concorrentes com o `fetch` do Node e mede a latência
 * de cada rota. Serve para conferir o requisito e para repetir a medição depois de uma mudança;
 * não substitui uma ferramenta de carga pesada.
 *
 * Uso:
 *   node scripts/carga-leve.mjs --base http://localhost:7071/api --registrar
 *   node scripts/carga-leve.mjs --base https://<api>/api --token <token de acesso>
 *
 * Opções:
 *   --base         Endereço da API, com `/api` no fim (obrigatório).
 *   --token        Token de acesso de uma conta de teste (rotas autenticadas).
 *   --registrar    Cria uma conta de teste no endereço informado e usa o token dela. Só para uma
 *                  API local ou de teste: não use contra a produção.
 *   --requisicoes  Requisições por rota (padrão 150).
 *   --concorrencia Requisições simultâneas (padrão 10).
 *   --limite       Limite de latência em ms para o requisito (padrão 3000).
 *
 * O resultado sai em Markdown, para colar na documentação. Nenhum dado pessoal é enviado: a conta
 * de teste usa um e-mail fictício e as rotas só leem.
 */

const args = parseArgs(process.argv.slice(2));
const base = (args.base ?? '').replace(/\/+$/, '');
if (!base) {
  console.error('Informe --base, por exemplo --base http://localhost:7071/api');
  process.exit(2);
}
const total = Number(args.requisicoes ?? 150);
const concurrency = Number(args.concorrencia ?? 10);
const limitMs = Number(args.limite ?? 3000);

function parseArgs(list) {
  const out = {};
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = list[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

async function registerTestAccount() {
  const email = `carga.${Date.now()}@exemplo.com.br`;
  const password = `frase-de-teste-${Date.now()}-local`;
  const response = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (response.status !== 201) {
    throw new Error(`Não foi possível criar a conta de teste (HTTP ${response.status}).`);
  }
  const session = await response.json();
  const headers = {
    'content-type': 'application/json',
    authorization: `Bearer ${session.accessToken}`,
  };
  // Consentimento e uma pessoa, para as rotas de leitura terem o que devolver.
  await fetch(`${base}/consent`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ acceptedTerms: true, termVersion: 'carga', guardianDeclaration: true }),
  });
  await fetch(`${base}/members`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Teste', birthDate: '2024-03-10', isPregnant: false }),
  });
  return session.accessToken;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

/** Dispara `total` requisições, `concurrency` por vez, e devolve as latências e as falhas. */
async function measure(path, headers) {
  const latencies = [];
  let failures = 0;
  const reasons = {};
  const note = (reason) => {
    failures += 1;
    reasons[reason] = (reasons[reason] ?? 0) + 1;
  };
  let next = 0;
  async function worker() {
    while (next < total) {
      next += 1;
      const started = performance.now();
      try {
        const response = await fetch(`${base}${path}`, { headers });
        await response.arrayBuffer();
        if (!response.ok) note(`HTTP ${response.status}`);
      } catch (error) {
        note(error instanceof Error ? error.name : 'erro');
      }
      latencies.push(performance.now() - started);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { latencies: latencies.sort((a, b) => a - b), failures, reasons };
}

const token = args.registrar ? await registerTestAccount() : args.token;
const authHeaders = token ? { authorization: `Bearer ${token}` } : undefined;
const routes = [{ path: '/health', headers: undefined, label: 'GET /health' }];
if (authHeaders) {
  routes.push(
    { path: '/members', headers: authHeaders, label: 'GET /members' },
    { path: '/reminders', headers: authHeaders, label: 'GET /reminders' },
    { path: '/consent', headers: authHeaders, label: 'GET /consent' },
  );
}

console.log(`# Carga leve: ${base}`);
console.log(
  `\n${total} requisições por rota, ${concurrency} simultâneas, limite de ${limitMs} ms (RNF01).\n`,
);
console.log('| Rota | p50 (ms) | p90 (ms) | p95 (ms) | máx (ms) | Abaixo do limite | Falhas |');
console.log('|---|---|---|---|---|---|---|');
let allOk = true;
for (const route of routes) {
  const { latencies, failures, reasons } = await measure(route.path, route.headers);
  if (failures > 0) console.error(`Falhas em ${route.label}:`, JSON.stringify(reasons));
  const under = latencies.filter((ms) => ms < limitMs).length / latencies.length;
  const ok = under >= 0.9 && failures === 0;
  allOk &&= ok;
  console.log(
    `| ${route.label} | ${percentile(latencies, 50).toFixed(0)} | ${percentile(latencies, 90).toFixed(0)} | ${percentile(latencies, 95).toFixed(0)} | ${latencies.at(-1).toFixed(0)} | ${(under * 100).toFixed(1)}% | ${failures} |`,
  );
}
console.log(
  `\n${allOk ? 'Requisito atendido' : 'Requisito NÃO atendido'}: pelo menos 90% abaixo de ${limitMs} ms e nenhuma falha.`,
);
process.exit(allOk ? 0 : 1);
