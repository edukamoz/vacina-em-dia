#!/usr/bin/env node
/**
 * Executa a coleção do Postman (`postman/`) no terminal, sem o Postman nem o Newman.
 *
 * Serve para repetir os testes de API em qualquer máquina com Node (por exemplo, depois de
 * `docker compose up`) e para conferir a coleção sem abrir a interface. Para a apresentação, o
 * caminho oficial continua sendo o Runner do Postman; este script só reproduz o mesmo fluxo.
 *
 * Uso:
 *   node scripts/postman/executar-colecao.mjs
 *   node scripts/postman/executar-colecao.mjs --ambiente postman/nuvem.postman_environment.json
 *   node scripts/postman/executar-colecao.mjs --base http://localhost:7071/api
 *
 * Limite honesto: implementa só o subconjunto de `pm.*` que a coleção usa (`pm.test`,
 * `pm.expect` com as asserções mais comuns do Chai, `pm.response`, `pm.environment`). Não é o
 * mecanismo do Postman; um script novo com outra função de `pm.*` precisa ser testado no Postman.
 * O código de saída é 1 se algum teste falhar.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
const colecao = lerJson(
  args.colecao ?? join(raiz, 'postman', 'vacina-em-dia.postman_collection.json'),
);
const ambienteArquivo = args.ambiente ?? join(raiz, 'postman', 'local.postman_environment.json');
const variaveis = new Map(
  lerJson(ambienteArquivo)
    .values.filter((v) => v.enabled)
    .map((v) => [v.key, v.value]),
);
if (args.base) variaveis.set('base_url', args.base.replace(/\/+$/, ''));

let aprovados = 0;
const falhas = [];

/** Asserção no estilo do Chai, só com o que a coleção usa. */
function expect(valor, negado = false) {
  const confere = (condicao, mensagem) => {
    if (condicao === negado) throw new Error(mensagem);
  };
  const mostra = (v) => JSON.stringify(v);
  const alvo = {
    get to() {
      return alvo;
    },
    get be() {
      return alvo;
    },
    get have() {
      return alvo;
    },
    get not() {
      return expect(valor, !negado);
    },
    get true() {
      confere(valor === true, `esperava true e veio ${mostra(valor)}`);
      return alvo;
    },
    get false() {
      confere(valor === false, `esperava false e veio ${mostra(valor)}`);
      return alvo;
    },
    equal: (esperado) =>
      confere(valor === esperado, `esperava ${mostra(esperado)} e veio ${mostra(valor)}`),
    eql: (esperado) =>
      confere(
        isDeepStrictEqual(valor, esperado),
        `esperava ${mostra(esperado)} e veio ${mostra(valor)}`,
      ),
    a: (tipo) => {
      const real = Array.isArray(valor) ? 'array' : valor === null ? 'null' : typeof valor;
      confere(real === tipo, `esperava tipo ${tipo} e veio ${real}`);
    },
    include: (parte) => {
      const contem =
        typeof valor === 'string' || Array.isArray(valor) ? valor.includes(parte) : false;
      confere(contem, `${mostra(valor)} deveria conter ${mostra(parte)}`);
    },
    property: (nome) =>
      confere(valor != null && nome in Object(valor), `faltou a propriedade ${nome}`),
    above: (n) => confere(valor > n, `${mostra(valor)} deveria ser maior que ${n}`),
    below: (n) => confere(valor < n, `${mostra(valor)} deveria ser menor que ${n}`),
    lengthOf: (n) => confere(valor?.length === n, `esperava tamanho ${n} e veio ${valor?.length}`),
    oneOf: (lista) =>
      confere(lista.includes(valor), `${mostra(valor)} deveria ser um de ${mostra(lista)}`),
  };
  return alvo;
}

/** Cria o objeto `pm` de um script; `resposta` só existe nos scripts de teste. */
function criarPm(contexto, resposta) {
  const pm = {
    environment: {
      get: (chave) => variaveis.get(chave),
      set: (chave, valor) => variaveis.set(chave, valor),
      unset: (chave) => variaveis.delete(chave),
    },
    expect: (valor) => expect(valor),
    test(nome, funcao) {
      try {
        funcao();
        aprovados += 1;
        console.log(`    ok   ${nome}`);
      } catch (erro) {
        falhas.push({ contexto, nome, motivo: erro.message });
        console.log(`    FALHOU ${nome}\n         ${erro.message}`);
      }
    },
  };
  if (resposta) {
    pm.response = {
      code: resposta.status,
      responseTime: resposta.tempo,
      json: () => JSON.parse(resposta.texto),
      text: () => resposta.texto,
      to: {
        have: {
          status: (esperado) => {
            if (resposta.status !== esperado) {
              throw new Error(`esperava status ${esperado} e veio ${resposta.status}`);
            }
          },
        },
      },
    };
  }
  return pm;
}

function rodarScript(eventos, tipo, contexto, resposta) {
  for (const evento of eventos ?? []) {
    if (evento.listen !== tipo) continue;
    try {
      vm.runInNewContext(
        evento.script.exec.join('\n'),
        { pm: criarPm(contexto, resposta), Date, JSON },
        { timeout: 2000 },
      );
    } catch (erro) {
      falhas.push({ contexto, nome: `script de ${tipo}`, motivo: erro.message });
      console.log(`    FALHOU script de ${tipo}\n         ${erro.message}`);
    }
  }
}

const trocar = (texto) =>
  texto.replace(/\{\{([^}]+)\}\}/g, (_, chave) => String(variaveis.get(chave) ?? ''));

async function executar(item, caminho) {
  if (item.item) {
    console.log(`\n${item.name}`);
    for (const filho of item.item) await executar(filho, `${caminho}${item.name} / `);
    return;
  }
  const contexto = `${caminho}${item.name}`;
  console.log(`  ${item.name}`);
  rodarScript(colecao.event, 'prerequest', contexto);
  rodarScript(item.event, 'prerequest', contexto);

  const { request } = item;
  const cabecalhos = Object.fromEntries(
    (request.header ?? []).map((h) => [h.key, trocar(h.value)]),
  );
  if (request.auth?.type !== 'noauth' && colecao.auth?.type === 'bearer') {
    const token = variaveis.get('access_token');
    if (token) cabecalhos.Authorization = `Bearer ${token}`;
  }
  const inicio = performance.now();
  let resposta;
  try {
    const r = await fetch(trocar(request.url.raw), {
      method: request.method,
      headers: cabecalhos,
      body: request.body ? trocar(request.body.raw) : undefined,
    });
    resposta = {
      status: r.status,
      texto: await r.text(),
      tempo: Math.round(performance.now() - inicio),
    };
  } catch (erro) {
    falhas.push({ contexto, nome: 'requisição', motivo: String(erro.cause?.code ?? erro.message) });
    console.log(`    FALHOU requisição: ${erro.cause?.code ?? erro.message}`);
    return;
  }
  rodarScript(item.event, 'test', contexto, resposta);
}

console.log(
  `Coleção: ${colecao.info.name}\nAmbiente: ${resolve(ambienteArquivo)}\nBase: ${variaveis.get('base_url')}`,
);
for (const pasta of colecao.item) await executar(pasta, '');

console.log(`\n${aprovados} testes aprovados, ${falhas.length} falhas.`);
for (const f of falhas) console.log(`  - ${f.contexto}: ${f.nome} (${f.motivo})`);
process.exit(falhas.length ? 1 : 0);

function lerJson(arquivo) {
  return JSON.parse(readFileSync(arquivo, 'utf8'));
}

function parseArgs(lista) {
  const resultado = {};
  for (let i = 0; i < lista.length; i += 2) resultado[lista[i].replace(/^--/, '')] = lista[i + 1];
  return resultado;
}
