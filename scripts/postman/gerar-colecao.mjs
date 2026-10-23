#!/usr/bin/env node
/**
 * Gera a coleção e os ambientes do Postman a partir deste arquivo (pasta `postman/`).
 *
 * Os testes da coleção ficam aqui, em texto legível, em vez de dentro de um JSON de 2 mil linhas;
 * o JSON gerado é o que se importa no Postman (Import > arquivos da pasta `postman/`).
 *
 * Uso:
 *   node scripts/postman/gerar-colecao.mjs
 *
 * Os scripts dentro de `tests` e `pre` rodam no Postman e também em
 * `scripts/postman/executar-colecao.mjs`, que aceita só o subconjunto de `pm.*` listado lá.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const saida = join(raiz, 'postman');

/** Monta um evento (`test` ou `prerequest`) a partir de linhas de código. */
const evento = (listen, linhas) => ({
  listen,
  script: { type: 'text/javascript', exec: linhas },
});

/** Monta uma requisição com testes (`tests`) e preparação (`pre`). */
function req(
  nome,
  metodo,
  caminho,
  { body, tests = [], pre = [], noauth = false, desc = '' } = {},
) {
  const [rota, consulta] = caminho.split('?');
  const url = {
    raw: `{{base_url}}${caminho}`,
    host: ['{{base_url}}'],
    path: rota.split('/').filter(Boolean),
  };
  if (consulta) {
    url.query = consulta.split('&').map((par) => {
      const [key, value] = par.split('=');
      return { key, value };
    });
  }
  const request = {
    method: metodo,
    header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
    url,
    description: desc,
  };
  if (body !== undefined) {
    request.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }
  if (noauth) request.auth = { type: 'noauth' };
  const event = [];
  if (pre.length) event.push(evento('prerequest', pre));
  if (tests.length) event.push(evento('test', tests));
  return { name: nome, event, request };
}

const pasta = (nome, descricao, item) => ({ name: nome, description: descricao, item });

/** Teste de status e do código de erro padrão da API (`{ code, message, fields? }`). */
const erro = (status, codigo, extras = []) => [
  `pm.test('${status} ${codigo}', function () {`,
  `  pm.response.to.have.status(${status});`,
  '  const corpo = pm.response.json();',
  `  pm.expect(corpo.code).to.eql('${codigo}');`,
  "  pm.expect(corpo.message).to.be.a('string');",
  ...extras.map((linha) => `  ${linha}`),
  '});',
];

const ok = (status) => [
  `pm.test('Status ${status}', function () {`,
  `  pm.response.to.have.status(${status});`,
  '});',
];

const evidencia = (desc, linhas) => [`pm.test('${desc}', function () {`, ...linhas, '});'];

const itens = [
  pasta('0. Ambiente', 'A API está no ar e responde dentro do limite do RNF01 (3 s).', [
    req('Saúde da API', 'GET', '/health', {
      noauth: true,
      desc: 'Rota pública. Mostra que `base_url` aponta para uma API viva.',
      tests: [
        ...ok(200),
        ...evidencia('status "ok" e serviço correto', [
          '  const corpo = pm.response.json();',
          "  pm.expect(corpo.status).to.eql('ok');",
          "  pm.expect(corpo.service).to.eql('vacina-em-dia-api');",
        ]),
        ...evidencia('responde em menos de 3 s (RNF01)', [
          '  pm.expect(pm.response.responseTime).to.be.below(3000);',
        ]),
      ],
    }),
  ]),

  pasta(
    '1. Conta e login (RF01)',
    'Partições de equivalência e valor limite da senha (7 caracteres é inválido; 8, válido), e-mail repetido, credenciais erradas e acesso sem token.',
    [
      req('Cadastrar conta (válida)', 'POST', '/auth/register', {
        noauth: true,
        desc: 'Classe válida. Gera um e-mail novo a cada execução e guarda os tokens no ambiente.',
        pre: [
          "pm.environment.set('email', 'postman.' + Date.now() + '@exemplo.com.br');",
          "pm.environment.set('password', 'uma frase longa é melhor');",
        ],
        body: { email: '{{email}}', password: '{{password}}' },
        tests: [
          ...ok(201),
          'const corpo = pm.response.json();',
          ...evidencia('sessão Bearer de 900 s e e-mail da conta', [
            "  pm.expect(corpo.tokenType).to.eql('Bearer');",
            '  pm.expect(corpo.expiresIn).to.eql(900);',
            "  pm.expect(corpo.account.email).to.eql(pm.environment.get('email'));",
          ]),
          ...evidencia('a resposta não devolve a senha nem o hash', [
            "  pm.expect(pm.response.text()).to.not.include(pm.environment.get('password'));",
          ]),
          "pm.environment.set('access_token', corpo.accessToken);",
          "pm.environment.set('refresh_token', corpo.refreshToken);",
        ],
      }),
      req('Cadastrar com e-mail repetido', 'POST', '/auth/register', {
        noauth: true,
        desc: 'Classe inválida: e-mail já cadastrado.',
        body: { email: '{{email}}', password: '{{password}}' },
        tests: erro(409, 'EMAIL_ALREADY_REGISTERED'),
      }),
      req('Cadastrar com senha de 7 caracteres (limite)', 'POST', '/auth/register', {
        noauth: true,
        desc: 'Valor limite: um abaixo do mínimo de 8 caracteres.',
        body: { email: 'limite@exemplo.com.br', password: '1234567' },
        tests: erro(400, 'VALIDATION_ERROR', [
          "pm.expect(corpo.fields).to.include('body.password');",
        ]),
      }),
      req('Cadastrar com e-mail em formato inválido', 'POST', '/auth/register', {
        noauth: true,
        desc: 'Classe inválida: e-mail sem domínio.',
        body: { email: 'maria@', password: '{{password}}' },
        tests: erro(400, 'VALIDATION_ERROR', ["pm.expect(corpo.fields).to.include('body.email');"]),
      }),
      req('Entrar com senha errada', 'POST', '/auth/login', {
        noauth: true,
        desc: 'A mensagem não diz se o erro foi no e-mail ou na senha (evita enumerar contas).',
        body: { email: '{{email}}', password: 'senha totalmente errada' },
        tests: erro(401, 'INVALID_CREDENTIALS'),
      }),
      req('Entrar', 'POST', '/auth/login', {
        noauth: true,
        body: { email: '{{email}}', password: '{{password}}' },
        tests: [
          ...ok(200),
          'const corpo = pm.response.json();',
          ...evidencia('traz um token novo', ["  pm.expect(corpo.accessToken).to.be.a('string');"]),
          "pm.environment.set('access_token', corpo.accessToken);",
          "pm.environment.set('refresh_token', corpo.refreshToken);",
        ],
      }),
      req('Quem sou eu (com token)', 'GET', '/auth/me', {
        desc: 'Usa o token guardado em `access_token` (autenticação Bearer da coleção).',
        tests: [
          ...ok(200),
          ...evidencia('devolve a conta que entrou', [
            "  pm.expect(pm.response.json().email).to.eql(pm.environment.get('email'));",
          ]),
        ],
      }),
      req('Quem sou eu (sem token)', 'GET', '/auth/me', {
        noauth: true,
        desc: 'Autorização: sem token a API recusa.',
        tests: erro(401, 'UNAUTHORIZED'),
      }),
    ],
  ),

  pasta(
    '2. Consentimento (RF09, LGPD)',
    'Sem consentimento explícito a API não grava dados da família.',
    [
      req('Ver consentimento (ainda não aceito)', 'GET', '/consent', {
        tests: [
          ...ok(200),
          ...evidencia('começa como não aceito', [
            '  pm.expect(pm.response.json().accepted).to.be.false;',
          ]),
        ],
      }),
      req('Criar membro sem consentimento', 'POST', '/members', {
        desc: 'Regra de negócio: antes do aceite, a API barra a gravação.',
        body: { name: 'Maria', birthDate: '2025-08-20' },
        tests: erro(403, 'CONSENT_REQUIRED'),
      }),
      req('Aceitar o termo', 'PUT', '/consent', {
        body: { acceptedTerms: true, termVersion: '2026-10-06', guardianDeclaration: true },
        tests: [
          ...ok(200),
          ...evidencia('fica registrado com a versão do termo', [
            '  const corpo = pm.response.json();',
            '  pm.expect(corpo.accepted).to.be.true;',
            "  pm.expect(corpo.termVersion).to.eql('2026-10-06');",
            "  pm.expect(corpo.acceptedAt).to.be.a('string');",
          ]),
        ],
      }),
    ],
  ),

  pasta(
    '3. Família (RF02) e calendário (RF03)',
    'Membro válido, data de nascimento no futuro, nome vazio, isolamento entre usuários e fonte oficial no calendário.',
    [
      req('Criar membro (válido)', 'POST', '/members', {
        body: { name: 'Maria', birthDate: '2025-08-20', relationship: 'DAUGHTER' },
        tests: [
          ...ok(201),
          'const corpo = pm.response.json();',
          ...evidencia('devolve id e faixa etária da criança', [
            "  pm.expect(corpo.id).to.be.a('string');",
            "  pm.expect(corpo.ageGroup).to.eql('CHILD');",
          ]),
          "pm.environment.set('member_id', corpo.id);",
        ],
      }),
      req('Criar membro nascido no futuro', 'POST', '/members', {
        desc: 'Classe inválida de data: depois de hoje.',
        body: { name: 'Futuro', birthDate: '2999-01-01' },
        tests: erro(422, 'INVALID_BIRTH_DATE'),
      }),
      req('Criar membro com nome vazio', 'POST', '/members', {
        desc: 'Valor limite: nome com 0 caracteres.',
        body: { name: '', birthDate: '2025-08-20' },
        tests: erro(400, 'VALIDATION_ERROR', ["pm.expect(corpo.fields).to.include('body.name');"]),
      }),
      req('Listar membros', 'GET', '/members', {
        tests: [
          ...ok(200),
          ...evidencia('lista só o membro criado', [
            '  const itens = pm.response.json().items;',
            '  pm.expect(itens).to.have.lengthOf(1);',
            "  pm.expect(itens[0].id).to.eql(pm.environment.get('member_id'));",
          ]),
        ],
      }),
      req('Calendário da Maria', 'GET', '/members/{{member_id}}/doses', {
        desc: 'Guarda duas doses pendentes para os testes do ciclo de vida.',
        tests: [
          ...ok(200),
          'const corpo = pm.response.json();',
          ...evidencia('cita a fonte oficial e o aviso (RNF10)', [
            "  pm.expect(corpo.source.publisher).to.eql('Ministério da Saúde (PNI)');",
            "  pm.expect(corpo.source.notice).to.include('não substitui a caderneta');",
            '  pm.expect(corpo.source.isFictitious).to.be.false;',
          ]),
          ...evidencia('há doses e todas começam Pendentes ou Atrasadas', [
            '  pm.expect(corpo.items.length).to.be.above(0);',
            "  corpo.items.forEach(function (d) { pm.expect(d.status).to.be.oneOf(['PENDING', 'OVERDUE']); });",
          ]),
          "const pendentes = corpo.items.filter(function (d) { return d.status === 'PENDING'; });",
          "pm.environment.set('dose_id', pendentes[0].id);",
          "pm.environment.set('dose_id_2', pendentes[1].id);",
        ],
      }),
      req(
        'Calendário de um membro que não existe',
        'GET',
        '/members/00000000-0000-4000-8000-000000000000/doses',
        {
          desc: 'Propriedade dos dados: id desconhecido (ou de outra conta) responde 404, nunca 403, para não revelar que existe.',
          tests: erro(404, 'NOT_FOUND'),
        },
      ),
    ],
  ),

  pasta(
    '4. Ciclo de vida da dose (RF04)',
    'Transições da máquina de estados vistas pela API: guardas de data (422), transição inválida (409) e confirmação de cancelamento.',
    [
      req('Aplicar com data futura (guarda)', 'POST', '/doses/{{dose_id}}/events', {
        desc: 'Guarda G: aplicar exige data de hoje para trás.',
        body: { type: 'APPLY', date: '2999-01-01' },
        tests: erro(422, 'GUARD_VIOLATION'),
      }),
      req('Aplicar hoje (T3)', 'POST', '/doses/{{dose_id}}/events', {
        body: { type: 'APPLY', date: '{{hoje}}' },
        tests: [
          ...ok(200),
          ...evidencia('Pendente vira Aplicada, com a data de hoje', [
            '  const dose = pm.response.json();',
            "  pm.expect(dose.status).to.eql('APPLIED');",
            "  pm.expect(dose.appliedDate).to.eql(pm.environment.get('hoje'));",
          ]),
        ],
      }),
      req('Aplicar de novo (estado final)', 'POST', '/doses/{{dose_id}}/events', {
        desc: 'Aplicada é estado final: qualquer evento é transição inválida.',
        body: { type: 'APPLY', date: '{{hoje}}' },
        tests: erro(409, 'INVALID_TRANSITION'),
      }),
      req('Agendar no passado (guarda)', 'POST', '/doses/{{dose_id_2}}/events', {
        body: { type: 'SCHEDULE', date: '2000-01-01' },
        tests: erro(422, 'GUARD_VIOLATION'),
      }),
      req('Cancelar sem confirmar (guarda)', 'POST', '/doses/{{dose_id_2}}/events', {
        desc: 'Cancelar exige `confirmed: true`.',
        body: { type: 'CANCEL', confirmed: false },
        tests: erro(422, 'GUARD_VIOLATION'),
      }),
      req('Desagendar uma dose que não está agendada', 'POST', '/doses/{{dose_id_2}}/events', {
        desc: 'T8 só existe a partir de Agendada; a partir de Pendente é transição inválida.',
        body: { type: 'UNSCHEDULE' },
        tests: erro(409, 'INVALID_TRANSITION'),
      }),
      req('Agendar para amanhã (T2)', 'POST', '/doses/{{dose_id_2}}/events', {
        body: { type: 'SCHEDULE', date: '{{amanha}}' },
        tests: [
          ...ok(200),
          ...evidencia('Pendente vira Agendada, para amanhã', [
            '  const dose = pm.response.json();',
            "  pm.expect(dose.status).to.eql('SCHEDULED');",
            "  pm.expect(dose.scheduledDate).to.eql(pm.environment.get('amanha'));",
          ]),
        ],
      }),
      req('Desagendar (T8)', 'POST', '/doses/{{dose_id_2}}/events', {
        body: { type: 'UNSCHEDULE' },
        tests: [
          ...ok(200),
          ...evidencia('Agendada volta a Pendente', [
            "  pm.expect(pm.response.json().status).to.eql('PENDING');",
          ]),
        ],
      }),
      req('Tipo de evento desconhecido', 'POST', '/doses/{{dose_id_2}}/events', {
        body: { type: 'EXPLODIR' },
        tests: erro(400, 'VALIDATION_ERROR', ["pm.expect(corpo.fields).to.include('body.type');"]),
      }),
      req('Dose que não existe', 'GET', '/doses/nao-existe', {
        tests: erro(404, 'NOT_FOUND'),
      }),
    ],
  ),

  pasta(
    '5. Assistente (RF07)',
    'Pergunta curada com fonte e pergunta de saúde que o chatbot se recusa a responder.',
    [
      req('Pergunta sobre uma vacina', 'POST', '/assistant/message', {
        body: { text: 'para que serve a BCG' },
        tests: [
          ...ok(200),
          'const resposta = pm.response.json().reply;',
          ...evidencia('classifica a intenção e cita a fonte oficial', [
            "  pm.expect(resposta.intent).to.eql('vacina_para_que_serve');",
            '  pm.expect(resposta.fallback).to.be.false;',
            '  pm.expect(resposta.safety).to.be.false;',
            "  pm.expect(resposta.source.name).to.include('Ministério da Saúde');",
          ]),
        ],
      }),
      req('Pergunta de saúde individual (segurança)', 'POST', '/assistant/message', {
        desc: 'O chatbot nunca dá orientação médica: a regra de segurança vem antes do classificador.',
        body: { text: 'meu filho está com febre alta o que eu dou' },
        tests: [
          ...ok(200),
          'const resposta = pm.response.json().reply;',
          ...evidencia('recusa e orienta procurar um profissional', [
            '  pm.expect(resposta.safety).to.be.true;',
            "  pm.expect(resposta.intent).to.eql('orientacao_medica');",
            "  pm.expect(resposta.text).to.include('profissional de saúde');",
          ]),
        ],
      }),
      req('Texto vazio', 'POST', '/assistant/message', {
        body: { text: '' },
        tests: erro(400, 'VALIDATION_ERROR', ["pm.expect(corpo.fields).to.include('body.text');"]),
      }),
    ],
  ),

  pasta('6. Lembretes, novidades e postos', 'Leituras da conta recém-criada e de dados públicos.', [
    req('Lembretes', 'GET', '/reminders', {
      tests: [
        ...ok(200),
        ...evidencia('traz a dose atrasada da Maria', [
          '  const corpo = pm.response.json();',
          "  pm.expect(corpo.items).to.be.a('array');",
          "  pm.expect(corpo.items.map(function (i) { return i.kind; })).to.include('OVERDUE');",
        ]),
      ],
    }),
    req('Novidades de saúde', 'GET', '/news', {
      tests: [
        ...ok(200),
        ...evidencia('todas as notícias são do gov.br/saude', [
          '  pm.response.json().items.forEach(function (n) {',
          "    pm.expect(n.url).to.include('gov.br/saude');",
          '  });',
        ]),
      ],
    }),
    req('Postos perto de uma coordenada', 'GET', '/units/nearby?lat=-23.5&lon=-47.4', {
      tests: [
        ...ok(200),
        ...evidencia('vêm ordenados do mais perto para o mais longe', [
          '  const ds = pm.response.json().items.map(function (u) { return u.distanceMeters; });',
          '  pm.expect(ds.length).to.be.above(0);',
          '  for (let i = 1; i < ds.length; i++) { pm.expect(ds[i]).to.be.above(ds[i - 1] - 1); }',
        ]),
      ],
    }),
    req('Postos sem a longitude', 'GET', '/units/nearby?lat=-23.5', {
      tests: erro(400, 'VALIDATION_ERROR', ["pm.expect(corpo.fields).to.include('query.lon');"]),
    }),
  ]),

  pasta(
    '7. Limpeza e exclusão de dados (RF09)',
    'Remove a conta de teste e prova que ela não existe mais.',
    [
      req('Excluir a conta e todos os dados', 'DELETE', '/account', {
        tests: ok(204),
      }),
      req('Entrar com a conta excluída', 'POST', '/auth/login', {
        noauth: true,
        desc: 'Depois da exclusão as credenciais deixam de valer.',
        body: { email: '{{email}}', password: '{{password}}' },
        tests: erro(401, 'INVALID_CREDENTIALS'),
      }),
    ],
  ),
];

const colecao = {
  info: {
    name: 'Vacina em Dia: API',
    description:
      'Testes automatizados da API (PI-VI, Qualidade e Testes de Software).\n\n' +
      'Como usar: importe esta coleção e um dos ambientes da pasta `postman/`, escolha o ambiente ' +
      'no canto superior direito e rode a coleção inteira (Run). Os testes encadeiam: a pasta 1 ' +
      'cria a conta e guarda o token em `access_token`; as seguintes usam esse token e os ids ' +
      'guardados (`member_id`, `dose_id`).\n\n' +
      'A pasta 7 apaga a conta de teste. Rode a coleção na ordem, do começo ao fim.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{access_token}}', type: 'string' }],
  },
  event: [
    evento('prerequest', [
      '// Datas relativas a hoje, usadas nos eventos de dose. A API conta o dia civil em',
      '// America/Sao_Paulo (UTC-3, sem horário de verão desde 2019); em UTC, depois das 21h',
      '// o "hoje" daqui seria o dia seguinte e aplicar uma dose daria erro de data no futuro.',
      'const agora = new Date(Date.now() - 3 * 60 * 60 * 1000);',
      "pm.environment.set('hoje', agora.toISOString().slice(0, 10));",
      'const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000);',
      "pm.environment.set('amanha', amanha.toISOString().slice(0, 10));",
    ]),
  ],
  item: itens,
};

const ambiente = (id, nome, baseUrl) => ({
  id,
  name: nome,
  values: [
    { key: 'base_url', value: baseUrl, type: 'default', enabled: true },
    ...[
      'email',
      'password',
      'access_token',
      'refresh_token',
      'member_id',
      'dose_id',
      'dose_id_2',
    ].map((key) => ({
      key,
      value: '',
      type: key.includes('token') || key === 'password' ? 'secret' : 'default',
      enabled: true,
    })),
  ],
  _postman_variable_scope: 'environment',
});

mkdirSync(saida, { recursive: true });
const grava = (arquivo, dados) =>
  writeFileSync(join(saida, arquivo), JSON.stringify(dados, null, 2) + '\n', 'utf8');

grava('vacina-em-dia.postman_collection.json', colecao);
grava(
  'local.postman_environment.json',
  ambiente('vedia-local', 'Vacina em Dia: local (Docker)', 'http://localhost:7071/api'),
);
grava(
  'nuvem.postman_environment.json',
  ambiente(
    'vedia-nuvem',
    'Vacina em Dia: nuvem (Azure)',
    'https://func-vacinaemdia-vedia6398.azurewebsites.net/api',
  ),
);

const total = itens.reduce((soma, p) => soma + p.item.length, 0);
console.log(`Coleção gerada em postman/: ${itens.length} pastas, ${total} requisições.`);
