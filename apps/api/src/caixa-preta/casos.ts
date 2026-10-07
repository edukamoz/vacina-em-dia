import { HOJE, saida, somarDias, wav, type Ambiente, type Obtido } from './ambiente';

/** Técnica de caixa preta: partição de equivalência (PE) ou análise de valor limite (VL). */
export type Tecnica = 'PE' | 'VL';

/** Resultado esperado: código HTTP, código de erro da API e, se houver, um detalhe conferido. */
export interface Esperado {
  readonly status: number;
  readonly code?: string;
  readonly detalhe?: string;
}

/** Um caso de teste de caixa preta, no formato da tabela de execução. */
export interface Caso {
  readonly id: string;
  readonly funcionalidade: string;
  readonly requisito: string;
  readonly tecnica: Tecnica;
  /** Classe de equivalência ou valor limite exercitado. */
  readonly classe: string;
  /** Entrada em linguagem simples, para a tabela. */
  readonly entrada: string;
  readonly esperado: Esperado;
  readonly executar: (ambiente: Ambiente) => Promise<Obtido>;
}

type Parcial = Omit<Caso, 'esperado' | 'executar' | 'funcionalidade' | 'requisito'>;

function grupo(funcionalidade: string, requisito: string) {
  return (
    dados: Parcial,
    esperado: Esperado,
    executar: (ambiente: Ambiente) => Promise<Obtido>,
  ): Caso => ({ ...dados, funcionalidade, requisito, esperado, executar });
}

const SENHA = 'uma frase longa é melhor';
const EMAIL = 'ana@exemplo.com.br';

/** E-mail válido com exatamente `tamanho` caracteres (parte local de 64 e rótulos de até 63). */
function emailComTamanho(tamanho: number): string {
  const local = 'a'.repeat(64);
  let restante = tamanho - local.length - 1;
  const rotulos: string[] = [];
  while (restante > 0) {
    const n = Math.min(63, restante - (restante > 64 ? 1 : 0));
    rotulos.push('b'.repeat(n));
    restante -= n + 1;
  }
  return `${local}@${rotulos.join('.')}`;
}

// ---------------------------------------------------------------------------------------------
// Cadastro de conta (RF01)
// ---------------------------------------------------------------------------------------------
const cad = grupo('Cadastro de conta', 'RF01');
const cadastro = (email: unknown, senha: unknown) => (a: Ambiente) =>
  a.auth.register(a.origem, { email, password: senha }).then((r) => saida(r));

const contas: Caso[] = [
  cad(
    {
      id: 'CT-CP-C01',
      tecnica: 'PE',
      classe: 'E-mail e senha válidos',
      entrada: 'ana@exemplo.com.br / frase de 24 caracteres',
    },
    { status: 201 },
    cadastro(EMAIL, SENHA),
  ),
  cad(
    {
      id: 'CT-CP-C02',
      tecnica: 'PE',
      classe: 'E-mail inválido: sem @',
      entrada: 'ana.exemplo.com.br',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    cadastro('ana.exemplo.com.br', SENHA),
  ),
  cad(
    { id: 'CT-CP-C03', tecnica: 'PE', classe: 'E-mail inválido: vazio', entrada: '(vazio)' },
    { status: 400, code: 'VALIDATION_ERROR' },
    cadastro('', SENHA),
  ),
  cad(
    { id: 'CT-CP-C04', tecnica: 'PE', classe: 'E-mail inválido: sem domínio', entrada: 'ana@' },
    { status: 400, code: 'VALIDATION_ERROR' },
    cadastro('ana@', SENHA),
  ),
  cad(
    {
      id: 'CT-CP-C05',
      tecnica: 'VL',
      classe: 'E-mail no limite máximo (254)',
      entrada: 'e-mail de 254 caracteres',
    },
    { status: 201 },
    cadastro(emailComTamanho(254), SENHA),
  ),
  cad(
    {
      id: 'CT-CP-C06',
      tecnica: 'VL',
      classe: 'E-mail acima do máximo (255)',
      entrada: 'e-mail de 255 caracteres',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    cadastro(emailComTamanho(255), SENHA),
  ),
  cad(
    {
      id: 'CT-CP-C07',
      tecnica: 'VL',
      classe: 'Senha abaixo do mínimo (7)',
      entrada: 'senha de 7 caracteres',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    cadastro(EMAIL, 'abcdefg'),
  ),
  cad(
    {
      id: 'CT-CP-C08',
      tecnica: 'VL',
      classe: 'Senha no mínimo (8)',
      entrada: 'senha de 8 caracteres',
    },
    { status: 201 },
    cadastro(EMAIL, 'q7!xK2#m'),
  ),
  cad(
    {
      id: 'CT-CP-C09',
      tecnica: 'VL',
      classe: 'Senha no máximo (128)',
      entrada: 'senha de 128 caracteres',
    },
    { status: 201 },
    cadastro(EMAIL, 'ab'.repeat(64)),
  ),
  cad(
    {
      id: 'CT-CP-C10',
      tecnica: 'VL',
      classe: 'Senha acima do máximo (129)',
      entrada: 'senha de 129 caracteres',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    cadastro(EMAIL, 'a'.repeat(129)),
  ),
  cad(
    { id: 'CT-CP-C11', tecnica: 'PE', classe: 'Senha comum', entrada: 'senha123' },
    { status: 422, code: 'WEAK_PASSWORD' },
    cadastro(EMAIL, 'senha123'),
  ),
  cad(
    {
      id: 'CT-CP-C12',
      tecnica: 'PE',
      classe: 'Senha igual ao e-mail',
      entrada: 'ana@exemplo.com.br como senha',
    },
    { status: 422, code: 'WEAK_PASSWORD' },
    cadastro(EMAIL, EMAIL),
  ),
  cad(
    {
      id: 'CT-CP-C13',
      tecnica: 'PE',
      classe: 'Senha de um caractere repetido',
      entrada: 'aaaaaaaa',
    },
    { status: 422, code: 'WEAK_PASSWORD' },
    cadastro(EMAIL, 'aaaaaaaa'),
  ),
  cad(
    {
      id: 'CT-CP-C14',
      tecnica: 'PE',
      classe: 'E-mail já cadastrado (outra caixa)',
      entrada: 'ANA@EXEMPLO.COM.BR depois de ana@exemplo.com.br',
    },
    { status: 409, code: 'EMAIL_ALREADY_REGISTERED' },
    async (a) => {
      await a.criarConta();
      return saida(
        await a.auth.register(a.origem, { email: 'ANA@EXEMPLO.COM.BR', password: SENHA }),
      );
    },
  ),
  cad(
    { id: 'CT-CP-C15', tecnica: 'PE', classe: 'Corpo ausente', entrada: '(sem corpo)' },
    { status: 400, code: 'VALIDATION_ERROR' },
    async (a) => saida(await a.auth.register(a.origem, undefined)),
  ),
  cad(
    {
      id: 'CT-CP-C16',
      tecnica: 'VL',
      classe: 'Limite de cadastros por origem (10 por hora): o 10º',
      entrada: '10º cadastro da mesma origem na hora',
    },
    { status: 201 },
    async (a) => {
      let r = await a.criarConta('p0@exemplo.com.br');
      for (let i = 1; i < 10; i += 1) r = await a.criarConta(`p${i}@exemplo.com.br`);
      return saida(r);
    },
  ),
  cad(
    {
      id: 'CT-CP-C17',
      tecnica: 'VL',
      classe: 'Limite de cadastros por origem: o 11º',
      entrada: '11º cadastro da mesma origem na hora',
    },
    { status: 429, code: 'RATE_LIMITED' },
    async (a) => {
      for (let i = 0; i < 10; i += 1) await a.criarConta(`p${i}@exemplo.com.br`);
      return saida(await a.criarConta('p10@exemplo.com.br'));
    },
  ),
];

// ---------------------------------------------------------------------------------------------
// Login (RF01)
// ---------------------------------------------------------------------------------------------
const log = grupo('Login', 'RF01');
const entrar = (a: Ambiente, email: unknown, senha: unknown) =>
  a.auth.login(a.origem, { email, password: senha });

const logins: Caso[] = [
  log(
    {
      id: 'CT-CP-L01',
      tecnica: 'PE',
      classe: 'Credenciais corretas',
      entrada: 'e-mail e senha do cadastro',
    },
    { status: 200 },
    async (a) => {
      await a.criarConta();
      return saida(await entrar(a, EMAIL, SENHA));
    },
  ),
  log(
    {
      id: 'CT-CP-L02',
      tecnica: 'PE',
      classe: 'E-mail em outra caixa',
      entrada: 'ANA@EXEMPLO.COM.BR',
    },
    { status: 200 },
    async (a) => {
      await a.criarConta();
      return saida(await entrar(a, 'ANA@EXEMPLO.COM.BR', SENHA));
    },
  ),
  log(
    {
      id: 'CT-CP-L03',
      tecnica: 'PE',
      classe: 'Senha errada',
      entrada: 'senha diferente da cadastrada',
    },
    { status: 401, code: 'INVALID_CREDENTIALS' },
    async (a) => {
      await a.criarConta();
      return saida(await entrar(a, EMAIL, 'senha totalmente errada'));
    },
  ),
  log(
    {
      id: 'CT-CP-L04',
      tecnica: 'PE',
      classe: 'E-mail sem conta (mesma resposta da senha errada)',
      entrada: 'ninguem@exemplo.com.br',
    },
    { status: 401, code: 'INVALID_CREDENTIALS' },
    async (a) => saida(await entrar(a, 'ninguem@exemplo.com.br', SENHA)),
  ),
  log(
    { id: 'CT-CP-L05', tecnica: 'PE', classe: 'Senha vazia', entrada: '(vazia)' },
    { status: 400, code: 'VALIDATION_ERROR' },
    async (a) => saida(await entrar(a, EMAIL, '')),
  ),
  log(
    { id: 'CT-CP-L06', tecnica: 'PE', classe: 'E-mail inválido', entrada: 'sem-arroba' },
    { status: 400, code: 'VALIDATION_ERROR' },
    async (a) => saida(await entrar(a, 'sem-arroba', SENHA)),
  ),
  log(
    {
      id: 'CT-CP-L07',
      tecnica: 'PE',
      classe: 'E-mail com espaços nas pontas (o app os remove antes de enviar)',
      entrada: '" ana@exemplo.com.br "',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    async (a) => saida(await entrar(a, ` ${EMAIL} `, SENHA)),
  ),
  log(
    {
      id: 'CT-CP-L08',
      tecnica: 'VL',
      classe: 'Quatro falhas seguidas (abaixo do limite de 5) e depois a senha certa',
      entrada: '4 senhas erradas e 1 correta',
    },
    { status: 200 },
    async (a) => {
      await a.criarConta();
      for (let i = 0; i < 4; i += 1) await entrar(a, EMAIL, 'errada-errada');
      return saida(await entrar(a, EMAIL, SENHA));
    },
  ),
  log(
    {
      id: 'CT-CP-L09',
      tecnica: 'VL',
      classe: 'Cinco falhas seguidas (limite): a 6ª tentativa, mesmo certa, é bloqueada',
      entrada: '5 senhas erradas e 1 correta',
    },
    { status: 429, code: 'RATE_LIMITED' },
    async (a) => {
      await a.criarConta();
      for (let i = 0; i < 5; i += 1) await entrar(a, EMAIL, 'errada-errada');
      return saida(await entrar(a, EMAIL, SENHA));
    },
  ),
  log(
    {
      id: 'CT-CP-L10',
      tecnica: 'VL',
      classe: 'Fim do bloqueio: 15 minutos menos 1 segundo',
      entrada: 'tentativa certa 899 s depois do bloqueio',
    },
    { status: 429, code: 'RATE_LIMITED' },
    async (a) => {
      await a.criarConta();
      for (let i = 0; i < 5; i += 1) await entrar(a, EMAIL, 'errada-errada');
      a.avancar(899);
      return saida(await entrar(a, EMAIL, SENHA));
    },
  ),
  log(
    {
      id: 'CT-CP-L11',
      tecnica: 'VL',
      classe: 'Fim do bloqueio: 15 minutos',
      entrada: 'tentativa certa 900 s depois do bloqueio',
    },
    { status: 200 },
    async (a) => {
      await a.criarConta();
      for (let i = 0; i < 5; i += 1) await entrar(a, EMAIL, 'errada-errada');
      a.avancar(900);
      return saida(await entrar(a, EMAIL, SENHA));
    },
  ),
];

// ---------------------------------------------------------------------------------------------
// Recuperação de senha (RF01)
// ---------------------------------------------------------------------------------------------
const rec = grupo('Recuperação de senha', 'RF01');
const TOKEN_DESCONHECIDO = 'x'.repeat(43);
const NOVA = 'outra frase longa e boa';

const recuperacao: Caso[] = [
  rec(
    {
      id: 'CT-CP-R01',
      tecnica: 'PE',
      classe: 'Pedido com e-mail de conta existente',
      entrada: 'ana@exemplo.com.br',
    },
    { status: 202 },
    async (a) => {
      await a.criarConta();
      return saida(await a.auth.forgotPassword(a.origem, { email: EMAIL }));
    },
  ),
  rec(
    {
      id: 'CT-CP-R02',
      tecnica: 'PE',
      classe: 'Pedido com e-mail sem conta (mesma resposta)',
      entrada: 'ninguem@exemplo.com.br',
    },
    { status: 202 },
    async (a) => saida(await a.auth.forgotPassword(a.origem, { email: 'ninguem@exemplo.com.br' })),
  ),
  rec(
    { id: 'CT-CP-R03', tecnica: 'PE', classe: 'Pedido com e-mail inválido', entrada: 'sem-arroba' },
    { status: 400, code: 'VALIDATION_ERROR' },
    async (a) => saida(await a.auth.forgotPassword(a.origem, { email: 'sem-arroba' })),
  ),
  rec(
    {
      id: 'CT-CP-R04',
      tecnica: 'VL',
      classe: 'Terceiro pedido do mesmo e-mail na hora (limite 3)',
      entrada: '3º pedido',
    },
    { status: 202 },
    async (a) => {
      await a.criarConta();
      await a.auth.forgotPassword({ ip: '10.0.0.1' }, { email: EMAIL });
      await a.auth.forgotPassword({ ip: '10.0.0.2' }, { email: EMAIL });
      return saida(await a.auth.forgotPassword({ ip: '10.0.0.3' }, { email: EMAIL }));
    },
  ),
  rec(
    {
      id: 'CT-CP-R05',
      tecnica: 'VL',
      classe: 'Quarto pedido do mesmo e-mail na hora',
      entrada: '4º pedido',
    },
    { status: 429, code: 'RATE_LIMITED' },
    async (a) => {
      await a.criarConta();
      for (let i = 1; i <= 3; i += 1)
        await a.auth.forgotPassword({ ip: `10.0.0.${i}` }, { email: EMAIL });
      return saida(await a.auth.forgotPassword({ ip: '10.0.0.4' }, { email: EMAIL }));
    },
  ),
  rec(
    {
      id: 'CT-CP-R06',
      tecnica: 'PE',
      classe: 'Token válido e senha nova válida',
      entrada: 'token do e-mail e frase de 23 caracteres',
    },
    { status: 204 },
    async (a) => {
      await a.criarConta();
      await a.auth.forgotPassword(a.origem, { email: EMAIL });
      return saida(await a.auth.resetPassword({ token: a.tokenDoEmail(), password: NOVA }));
    },
  ),
  rec(
    {
      id: 'CT-CP-R07',
      tecnica: 'VL',
      classe: 'Token dentro da validade: 59 min 59 s',
      entrada: 'uso 3599 s depois do pedido',
    },
    { status: 204 },
    async (a) => {
      await a.criarConta();
      await a.auth.forgotPassword(a.origem, { email: EMAIL });
      a.avancar(3599);
      return saida(await a.auth.resetPassword({ token: a.tokenDoEmail(), password: NOVA }));
    },
  ),
  rec(
    {
      id: 'CT-CP-R08',
      tecnica: 'VL',
      classe: 'Token no limite da validade: 60 min',
      entrada: 'uso 3600 s depois do pedido',
    },
    { status: 400, code: 'INVALID_RESET_TOKEN' },
    async (a) => {
      await a.criarConta();
      await a.auth.forgotPassword(a.origem, { email: EMAIL });
      a.avancar(3600);
      return saida(await a.auth.resetPassword({ token: a.tokenDoEmail(), password: NOVA }));
    },
  ),
  rec(
    {
      id: 'CT-CP-R09',
      tecnica: 'PE',
      classe: 'Token já usado',
      entrada: 'segundo uso do mesmo token',
    },
    { status: 400, code: 'INVALID_RESET_TOKEN' },
    async (a) => {
      await a.criarConta();
      await a.auth.forgotPassword(a.origem, { email: EMAIL });
      const token = a.tokenDoEmail();
      await a.auth.resetPassword({ token, password: NOVA });
      return saida(await a.auth.resetPassword({ token, password: 'mais uma frase longa' }));
    },
  ),
  rec(
    {
      id: 'CT-CP-R10',
      tecnica: 'PE',
      classe: 'Token desconhecido com formato válido',
      entrada: 'token de 43 caracteres inexistente',
    },
    { status: 400, code: 'INVALID_RESET_TOKEN' },
    async (a) => saida(await a.auth.resetPassword({ token: TOKEN_DESCONHECIDO, password: NOVA })),
  ),
  rec(
    {
      id: 'CT-CP-R11',
      tecnica: 'VL',
      classe: 'Token abaixo do tamanho mínimo (19)',
      entrada: 'token de 19 caracteres',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    async (a) => saida(await a.auth.resetPassword({ token: 'x'.repeat(19), password: NOVA })),
  ),
  rec(
    {
      id: 'CT-CP-R12',
      tecnica: 'VL',
      classe: 'Token no tamanho mínimo (20), desconhecido',
      entrada: 'token de 20 caracteres',
    },
    { status: 400, code: 'INVALID_RESET_TOKEN' },
    async (a) => saida(await a.auth.resetPassword({ token: 'x'.repeat(20), password: NOVA })),
  ),
  rec(
    {
      id: 'CT-CP-R13',
      tecnica: 'VL',
      classe: 'Token acima do tamanho máximo (201)',
      entrada: 'token de 201 caracteres',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    async (a) => saida(await a.auth.resetPassword({ token: 'x'.repeat(201), password: NOVA })),
  ),
  rec(
    { id: 'CT-CP-R14', tecnica: 'PE', classe: 'Senha nova comum', entrada: '12345678' },
    { status: 422, code: 'WEAK_PASSWORD' },
    async (a) => {
      await a.criarConta();
      await a.auth.forgotPassword(a.origem, { email: EMAIL });
      return saida(await a.auth.resetPassword({ token: a.tokenDoEmail(), password: '12345678' }));
    },
  ),
  rec(
    {
      id: 'CT-CP-R15',
      tecnica: 'VL',
      classe: 'Senha nova abaixo do mínimo (7)',
      entrada: 'senha de 7 caracteres',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    async (a) =>
      saida(await a.auth.resetPassword({ token: TOKEN_DESCONHECIDO, password: 'abcdefg' })),
  ),
  rec(
    {
      id: 'CT-CP-R16',
      tecnica: 'PE',
      classe: 'Senha antiga deixa de valer depois da troca',
      entrada: 'login com a senha antiga após redefinir',
    },
    { status: 401, code: 'INVALID_CREDENTIALS' },
    async (a) => {
      await a.criarConta();
      await a.auth.forgotPassword(a.origem, { email: EMAIL });
      await a.auth.resetPassword({ token: a.tokenDoEmail(), password: NOVA });
      return saida(await entrar(a, EMAIL, SENHA));
    },
  ),
];

// ---------------------------------------------------------------------------------------------
// Consentimento (RF09)
// ---------------------------------------------------------------------------------------------
const con = grupo('Consentimento', 'RF09');
const consentir = (corpo: unknown) => async (a: Ambiente) =>
  saida(await a.app.handlers.consent.accept(a.owner, corpo));

const consentimento: Caso[] = [
  con(
    {
      id: 'CT-CP-K01',
      tecnica: 'PE',
      classe: 'Aceite explícito',
      entrada: 'acceptedTerms=true, versão 2026-10-06',
    },
    { status: 200 },
    consentir({ acceptedTerms: true, termVersion: '2026-10-06' }),
  ),
  con(
    { id: 'CT-CP-K02', tecnica: 'PE', classe: 'Aceite negado', entrada: 'acceptedTerms=false' },
    { status: 400, code: 'VALIDATION_ERROR' },
    consentir({ acceptedTerms: false, termVersion: '1' }),
  ),
  con(
    { id: 'CT-CP-K03', tecnica: 'PE', classe: 'Aceite ausente', entrada: 'sem acceptedTerms' },
    { status: 400, code: 'VALIDATION_ERROR' },
    consentir({ termVersion: '1' }),
  ),
  con(
    {
      id: 'CT-CP-K04',
      tecnica: 'PE',
      classe: 'Aceite como texto',
      entrada: 'acceptedTerms="true"',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    consentir({ acceptedTerms: 'true', termVersion: '1' }),
  ),
  con(
    {
      id: 'CT-CP-K05',
      tecnica: 'VL',
      classe: 'Versão do termo vazia (abaixo do mínimo de 1)',
      entrada: 'termVersion=""',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    consentir({ acceptedTerms: true, termVersion: '' }),
  ),
  con(
    {
      id: 'CT-CP-K06',
      tecnica: 'VL',
      classe: 'Versão do termo com 1 caractere',
      entrada: 'termVersion de 1 caractere',
    },
    { status: 200 },
    consentir({ acceptedTerms: true, termVersion: '1' }),
  ),
  con(
    {
      id: 'CT-CP-K07',
      tecnica: 'VL',
      classe: 'Versão do termo com 20 caracteres (máximo)',
      entrada: 'termVersion de 20 caracteres',
    },
    { status: 200 },
    consentir({ acceptedTerms: true, termVersion: 'v'.repeat(20) }),
  ),
  con(
    {
      id: 'CT-CP-K08',
      tecnica: 'VL',
      classe: 'Versão do termo com 21 caracteres',
      entrada: 'termVersion de 21 caracteres',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    consentir({ acceptedTerms: true, termVersion: 'v'.repeat(21) }),
  ),
  con(
    {
      id: 'CT-CP-K09',
      tecnica: 'PE',
      classe: 'Declaração de responsável omitida (padrão falso)',
      entrada: 'sem guardianDeclaration',
    },
    { status: 200 },
    consentir({ acceptedTerms: true, termVersion: '1' }),
  ),
  con(
    { id: 'CT-CP-K10', tecnica: 'PE', classe: 'Corpo ausente', entrada: '(sem corpo)' },
    { status: 400, code: 'VALIDATION_ERROR' },
    consentir(undefined),
  ),
];

// ---------------------------------------------------------------------------------------------
// Membros da família (RF02)
// ---------------------------------------------------------------------------------------------
const mem = grupo('Membros da família', 'RF02');
const membro =
  (corpo: unknown, responsavel = true) =>
  async (a: Ambiente) => {
    await a.consentir(responsavel);
    return saida(await a.app.handlers.members.create(a.owner, corpo));
  };
const valido = { birthDate: '1990-01-10', isPregnant: false };

const membros: Caso[] = [
  mem(
    { id: 'CT-CP-M01', tecnica: 'PE', classe: 'Dados válidos', entrada: 'Maria, 1990-01-10' },
    { status: 201 },
    membro({ name: 'Maria', ...valido }),
  ),
  mem(
    {
      id: 'CT-CP-M02',
      tecnica: 'VL',
      classe: 'Nome vazio (abaixo do mínimo de 1)',
      entrada: 'nome vazio',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    membro({ name: '', ...valido }),
  ),
  mem(
    { id: 'CT-CP-M03', tecnica: 'PE', classe: 'Nome só com espaços', entrada: 'nome "   "' },
    { status: 400, code: 'VALIDATION_ERROR' },
    membro({ name: '   ', ...valido }),
  ),
  mem(
    {
      id: 'CT-CP-M04',
      tecnica: 'VL',
      classe: 'Nome com 1 caractere',
      entrada: 'nome de 1 caractere',
    },
    { status: 201 },
    membro({ name: 'A', ...valido }),
  ),
  mem(
    {
      id: 'CT-CP-M05',
      tecnica: 'VL',
      classe: 'Nome com 60 caracteres (máximo)',
      entrada: 'nome de 60 caracteres',
    },
    { status: 201 },
    membro({ name: 'n'.repeat(60), ...valido }),
  ),
  mem(
    {
      id: 'CT-CP-M06',
      tecnica: 'VL',
      classe: 'Nome com 61 caracteres',
      entrada: 'nome de 61 caracteres',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    membro({ name: 'n'.repeat(61), ...valido }),
  ),
  mem(
    { id: 'CT-CP-M07', tecnica: 'PE', classe: 'Nome ausente', entrada: 'sem nome' },
    { status: 400, code: 'VALIDATION_ERROR' },
    membro(valido),
  ),
  mem(
    {
      id: 'CT-CP-M08',
      tecnica: 'PE',
      classe: 'Nome com acento e espaços nas pontas',
      entrada: '" João Çedilha "',
    },
    { status: 201 },
    membro({ name: ' João Çedilha ', ...valido }),
  ),
  mem(
    {
      id: 'CT-CP-M09',
      tecnica: 'VL',
      classe: 'Nascimento hoje (limite superior válido)',
      entrada: HOJE,
    },
    { status: 201 },
    membro({ name: 'Bebê', birthDate: HOJE, isPregnant: false }),
  ),
  mem(
    {
      id: 'CT-CP-M10',
      tecnica: 'VL',
      classe: 'Nascimento amanhã (futuro)',
      entrada: somarDias(HOJE, 1),
    },
    { status: 422, code: 'INVALID_BIRTH_DATE' },
    membro({ name: 'Bebê', birthDate: somarDias(HOJE, 1), isPregnant: false }),
  ),
  mem(
    { id: 'CT-CP-M11', tecnica: 'PE', classe: 'Data em formato brasileiro', entrada: '06/10/2026' },
    { status: 400, code: 'VALIDATION_ERROR' },
    membro({ name: 'Ana', birthDate: '06/10/2026', isPregnant: false }),
  ),
  mem(
    { id: 'CT-CP-M12', tecnica: 'PE', classe: 'Dia inexistente', entrada: '2026-02-30' },
    { status: 400, code: 'VALIDATION_ERROR' },
    membro({ name: 'Ana', birthDate: '2026-02-30', isPregnant: false }),
  ),
  mem(
    { id: 'CT-CP-M13', tecnica: 'PE', classe: 'Mês inexistente', entrada: '2026-13-01' },
    { status: 400, code: 'VALIDATION_ERROR' },
    membro({ name: 'Ana', birthDate: '2026-13-01', isPregnant: false }),
  ),
  mem(
    {
      id: 'CT-CP-M14',
      tecnica: 'VL',
      classe: '29 de fevereiro em ano bissexto',
      entrada: '2024-02-29',
    },
    { status: 201 },
    membro({ name: 'Ana', birthDate: '2024-02-29', isPregnant: false }),
  ),
  mem(
    {
      id: 'CT-CP-M15',
      tecnica: 'VL',
      classe: '29 de fevereiro em ano comum',
      entrada: '2025-02-29',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    membro({ name: 'Ana', birthDate: '2025-02-29', isPregnant: false }),
  ),
  mem(
    { id: 'CT-CP-M16', tecnica: 'PE', classe: 'Data muito antiga', entrada: '1900-01-01' },
    { status: 201 },
    membro({ name: 'Ana', birthDate: '1900-01-01', isPregnant: false }),
  ),
  mem(
    {
      id: 'CT-CP-M17',
      tecnica: 'PE',
      classe: 'Gestante informada como texto',
      entrada: 'isPregnant="sim"',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    membro({ name: 'Ana', birthDate: '1990-01-10', isPregnant: 'sim' }),
  ),
  mem(
    {
      id: 'CT-CP-M18',
      tecnica: 'PE',
      classe: 'Gestante omitida (padrão falso)',
      entrada: 'sem isPregnant',
    },
    { status: 201 },
    membro({ name: 'Ana', birthDate: '1990-01-10' }),
  ),
  mem(
    {
      id: 'CT-CP-M19',
      tecnica: 'PE',
      classe: 'Sem consentimento prévio',
      entrada: 'cadastro antes do aceite',
    },
    { status: 403, code: 'CONSENT_REQUIRED' },
    async (a) => saida(await a.app.handlers.members.create(a.owner, { name: 'Ana', ...valido })),
  ),
  mem(
    {
      id: 'CT-CP-M20',
      tecnica: 'VL',
      classe: 'Menor de 18 anos por 1 dia, sem declaração de responsável',
      entrada: `nascimento ${somarDias('2008-10-06', 1)} (17 anos e 364 dias)`,
    },
    { status: 422, code: 'GUARDIAN_DECLARATION_REQUIRED' },
    membro({ name: 'Jovem', birthDate: '2008-10-07', isPregnant: false }, false),
  ),
  mem(
    {
      id: 'CT-CP-M21',
      tecnica: 'VL',
      classe: 'Exatamente 18 anos, sem declaração de responsável',
      entrada: 'nascimento 2008-10-06',
    },
    { status: 201 },
    membro({ name: 'Jovem', birthDate: '2008-10-06', isPregnant: false }, false),
  ),
  mem(
    {
      id: 'CT-CP-M22',
      tecnica: 'PE',
      classe: 'Menor com declaração de responsável',
      entrada: 'criança de 3 anos com declaração',
    },
    { status: 201 },
    membro({ name: 'Criança', birthDate: '2023-10-06', isPregnant: false }, true),
  ),
  mem(
    {
      id: 'CT-CP-M23',
      tecnica: 'VL',
      classe: '20º membro da conta (limite)',
      entrada: '20º cadastro',
    },
    { status: 201 },
    async (a) => {
      await a.consentir(true);
      let r = await a.cadastrar('1990-01-10', 'P0');
      for (let i = 1; i < 20; i += 1) r = await a.cadastrar('1990-01-10', `P${i}`);
      return saida(r);
    },
  ),
  mem(
    { id: 'CT-CP-M24', tecnica: 'VL', classe: '21º membro da conta', entrada: '21º cadastro' },
    { status: 422, code: 'LIMIT_REACHED' },
    async (a) => {
      await a.consentir(true);
      for (let i = 0; i < 20; i += 1) await a.cadastrar('1990-01-10', `P${i}`);
      return saida(await a.cadastrar('1990-01-10', 'P20'));
    },
  ),
  mem(
    {
      id: 'CT-CP-M25',
      tecnica: 'PE',
      classe: 'Membro de outro usuário',
      entrada: 'dono B consulta o membro do dono A',
    },
    { status: 404, code: 'NOT_FOUND' },
    async (a) => {
      await a.consentir(true);
      const criado = await a.cadastrar('1990-01-10');
      const id = (criado.jsonBody as { id: string }).id;
      return saida(await a.app.handlers.members.get(a.outroDono, id));
    },
  ),
];

// ---------------------------------------------------------------------------------------------
// Faixa etária do calendário (RF03), valores limite
// ---------------------------------------------------------------------------------------------
const fai = grupo('Faixa etária do calendário', 'RF03');
const faixa = (nascimento: string) => async (a: Ambiente) => {
  await a.consentir(true);
  const r = await a.cadastrar(nascimento);
  return saida(r, (r.jsonBody as { ageGroup?: string }).ageGroup);
};

const faixas: Caso[] = [
  fai(
    {
      id: 'CT-CP-F01',
      tecnica: 'VL',
      classe: 'Último dia como criança (10 anos menos 1 dia)',
      entrada: 'nascimento 2016-10-07',
    },
    { status: 201, detalhe: 'CHILD' },
    faixa('2016-10-07'),
  ),
  fai(
    {
      id: 'CT-CP-F02',
      tecnica: 'VL',
      classe: 'Primeiro dia como adolescente (10 anos)',
      entrada: 'nascimento 2016-10-06',
    },
    { status: 201, detalhe: 'ADOLESCENT_YOUTH' },
    faixa('2016-10-06'),
  ),
  fai(
    {
      id: 'CT-CP-F03',
      tecnica: 'VL',
      classe: 'Último dia como adolescente e jovem (25 anos menos 1 dia)',
      entrada: 'nascimento 2001-10-07',
    },
    { status: 201, detalhe: 'ADOLESCENT_YOUTH' },
    faixa('2001-10-07'),
  ),
  fai(
    {
      id: 'CT-CP-F04',
      tecnica: 'VL',
      classe: 'Primeiro dia como adulto (25 anos)',
      entrada: 'nascimento 2001-10-06',
    },
    { status: 201, detalhe: 'ADULT' },
    faixa('2001-10-06'),
  ),
  fai(
    {
      id: 'CT-CP-F05',
      tecnica: 'VL',
      classe: 'Último dia como adulto (60 anos menos 1 dia)',
      entrada: 'nascimento 1966-10-07',
    },
    { status: 201, detalhe: 'ADULT' },
    faixa('1966-10-07'),
  ),
  fai(
    {
      id: 'CT-CP-F06',
      tecnica: 'VL',
      classe: 'Primeiro dia como idoso (60 anos)',
      entrada: 'nascimento 1966-10-06',
    },
    { status: 201, detalhe: 'ELDERLY' },
    faixa('1966-10-06'),
  ),
  fai(
    {
      id: 'CT-CP-F07',
      tecnica: 'VL',
      classe: 'Recém-nascido (0 dias)',
      entrada: `nascimento ${HOJE}`,
    },
    { status: 201, detalhe: 'CHILD' },
    faixa(HOJE),
  ),
];

// ---------------------------------------------------------------------------------------------
// Doses (RF04)
// ---------------------------------------------------------------------------------------------
const dos = grupo('Doses', 'RF04');
const evento = (corpo: unknown) => async (a: Ambiente) => {
  const dose = await a.primeiraDose();
  return saida(await a.app.handlers.doses.applyEvent(a.owner, dose, corpo));
};

const doses: Caso[] = [
  dos(
    {
      id: 'CT-CP-D01',
      tecnica: 'VL',
      classe: 'Agendar para ontem (D-1)',
      entrada: `SCHEDULE ${somarDias(HOJE, -1)}`,
    },
    { status: 422, code: 'GUARD_VIOLATION' },
    evento({ type: 'SCHEDULE', date: somarDias(HOJE, -1) }),
  ),
  dos(
    {
      id: 'CT-CP-D02',
      tecnica: 'VL',
      classe: 'Agendar para hoje (D)',
      entrada: `SCHEDULE ${HOJE}`,
    },
    { status: 200 },
    evento({ type: 'SCHEDULE', date: HOJE }),
  ),
  dos(
    {
      id: 'CT-CP-D03',
      tecnica: 'VL',
      classe: 'Agendar para amanhã (D+1)',
      entrada: `SCHEDULE ${somarDias(HOJE, 1)}`,
    },
    { status: 200 },
    evento({ type: 'SCHEDULE', date: somarDias(HOJE, 1) }),
  ),
  dos(
    {
      id: 'CT-CP-D04',
      tecnica: 'PE',
      classe: 'Agendar com data inexistente',
      entrada: 'SCHEDULE 2026-02-30',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    evento({ type: 'SCHEDULE', date: '2026-02-30' }),
  ),
  dos(
    {
      id: 'CT-CP-D05',
      tecnica: 'PE',
      classe: 'Agendar com data em formato brasileiro',
      entrada: 'SCHEDULE 06/10/2026',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    evento({ type: 'SCHEDULE', date: '06/10/2026' }),
  ),
  dos(
    { id: 'CT-CP-D06', tecnica: 'PE', classe: 'Agendar sem data', entrada: 'SCHEDULE sem date' },
    { status: 400, code: 'VALIDATION_ERROR' },
    evento({ type: 'SCHEDULE' }),
  ),
  dos(
    {
      id: 'CT-CP-D07',
      tecnica: 'VL',
      classe: 'Aplicar amanhã (D+1)',
      entrada: `APPLY ${somarDias(HOJE, 1)}`,
    },
    { status: 422, code: 'GUARD_VIOLATION' },
    evento({ type: 'APPLY', date: somarDias(HOJE, 1) }),
  ),
  dos(
    { id: 'CT-CP-D08', tecnica: 'VL', classe: 'Aplicar hoje (D)', entrada: `APPLY ${HOJE}` },
    { status: 200 },
    evento({ type: 'APPLY', date: HOJE }),
  ),
  dos(
    {
      id: 'CT-CP-D09',
      tecnica: 'VL',
      classe: 'Aplicar ontem (D-1)',
      entrada: `APPLY ${somarDias(HOJE, -1)}`,
    },
    { status: 200 },
    evento({ type: 'APPLY', date: somarDias(HOJE, -1) }),
  ),
  dos(
    {
      id: 'CT-CP-D10',
      tecnica: 'PE',
      classe: 'Aplicar com data inválida',
      entrada: 'APPLY 2026-13-40',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    evento({ type: 'APPLY', date: '2026-13-40' }),
  ),
  dos(
    {
      id: 'CT-CP-D11',
      tecnica: 'PE',
      classe: 'Cancelar sem confirmar',
      entrada: 'CANCEL confirmed=false',
    },
    { status: 422, code: 'GUARD_VIOLATION' },
    evento({ type: 'CANCEL', confirmed: false }),
  ),
  dos(
    {
      id: 'CT-CP-D12',
      tecnica: 'PE',
      classe: 'Cancelar confirmando',
      entrada: 'CANCEL confirmed=true',
    },
    { status: 200 },
    evento({ type: 'CANCEL', confirmed: true }),
  ),
  dos(
    {
      id: 'CT-CP-D13',
      tecnica: 'PE',
      classe: 'Cancelar sem o campo de confirmação',
      entrada: 'CANCEL sem confirmed',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    evento({ type: 'CANCEL' }),
  ),
  dos(
    {
      id: 'CT-CP-D14',
      tecnica: 'PE',
      classe: 'O cliente tenta marcar atraso (só a rotina de prazo pode)',
      entrada: 'MARK_OVERDUE enviado pelo cliente',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    evento({ type: 'MARK_OVERDUE' }),
  ),
  dos(
    { id: 'CT-CP-D15', tecnica: 'PE', classe: 'Evento desconhecido', entrada: 'type="EXPLODIR"' },
    { status: 400, code: 'VALIDATION_ERROR' },
    evento({ type: 'EXPLODIR' }),
  ),
  dos(
    { id: 'CT-CP-D16', tecnica: 'PE', classe: 'Corpo ausente', entrada: '(sem corpo)' },
    { status: 400, code: 'VALIDATION_ERROR' },
    evento(undefined),
  ),
  dos(
    {
      id: 'CT-CP-D17',
      tecnica: 'PE',
      classe: 'Aplicar uma dose já aplicada (estado final)',
      entrada: 'segundo APPLY',
    },
    { status: 409, code: 'INVALID_TRANSITION' },
    async (a) => {
      const dose = await a.primeiraDose();
      await a.app.handlers.doses.applyEvent(a.owner, dose, { type: 'APPLY', date: HOJE });
      return saida(
        await a.app.handlers.doses.applyEvent(a.owner, dose, { type: 'APPLY', date: HOJE }),
      );
    },
  ),
  dos(
    {
      id: 'CT-CP-D18',
      tecnica: 'PE',
      classe: 'Agendar uma dose cancelada (estado final)',
      entrada: 'SCHEDULE depois de CANCEL',
    },
    { status: 409, code: 'INVALID_TRANSITION' },
    async (a) => {
      const dose = await a.primeiraDose();
      await a.app.handlers.doses.applyEvent(a.owner, dose, { type: 'CANCEL', confirmed: true });
      return saida(
        await a.app.handlers.doses.applyEvent(a.owner, dose, { type: 'SCHEDULE', date: HOJE }),
      );
    },
  ),
  dos(
    {
      id: 'CT-CP-D19',
      tecnica: 'PE',
      classe: 'Reagendar uma dose que não está atrasada',
      entrada: 'RESCHEDULE em dose Pendente',
    },
    { status: 409, code: 'INVALID_TRANSITION' },
    evento({ type: 'RESCHEDULE', date: somarDias(HOJE, 3) }),
  ),
  dos(
    { id: 'CT-CP-D20', tecnica: 'PE', classe: 'Dose inexistente', entrada: 'id que não existe' },
    { status: 404, code: 'NOT_FOUND' },
    async (a) => {
      await a.primeiraDose();
      return saida(
        await a.app.handlers.doses.applyEvent(a.owner, 'dose-que-nao-existe', {
          type: 'APPLY',
          date: HOJE,
        }),
      );
    },
  ),
  dos(
    {
      id: 'CT-CP-D21',
      tecnica: 'PE',
      classe: 'Dose de outro usuário',
      entrada: 'dono B tenta aplicar a dose do dono A',
    },
    { status: 404, code: 'NOT_FOUND' },
    async (a) => {
      const dose = await a.primeiraDose();
      return saida(
        await a.app.handlers.doses.applyEvent(a.outroDono, dose, { type: 'APPLY', date: HOJE }),
      );
    },
  ),
  dos(
    {
      id: 'CT-CP-D22',
      tecnica: 'PE',
      classe: 'Atraso: dose vencida vira Atrasada na leitura (rotina de prazo)',
      entrada: 'dose de BCG (ao nascer) lida 1 dia depois',
    },
    { status: 200, detalhe: 'OVERDUE' },
    async (a) => {
      const dose = await a.primeiraDose();
      a.app.setNow('2026-10-07T15:00:00.000Z');
      const r = await a.app.handlers.doses.get(a.owner, dose);
      return saida(r, (r.jsonBody as { status?: string }).status);
    },
  ),
];

// ---------------------------------------------------------------------------------------------
// Assistente (RF06 e RF07)
// ---------------------------------------------------------------------------------------------
const ass = grupo('Assistente', 'RF06 e RF07');
const pergunta = (corpo: unknown) => async (a: Ambiente) =>
  saida(await a.assistente.message(a.owner, corpo));
const voz = (tipo: string | null, bytes: Uint8Array) => async (a: Ambiente) =>
  saida(await a.assistente.voice(a.owner, tipo, bytes));
const MAX_AUDIO = 60 * 16000 * 2 + 1024;

const assistente: Caso[] = [
  ass(
    { id: 'CT-CP-A01', tecnica: 'PE', classe: 'Pergunta válida', entrada: 'Para que serve a BCG?' },
    { status: 200 },
    pergunta({ text: 'Para que serve a BCG?' }),
  ),
  ass(
    {
      id: 'CT-CP-A02',
      tecnica: 'VL',
      classe: 'Pergunta vazia (abaixo do mínimo)',
      entrada: 'texto vazio',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    pergunta({ text: '' }),
  ),
  ass(
    { id: 'CT-CP-A03', tecnica: 'PE', classe: 'Pergunta só com espaços', entrada: 'texto "   "' },
    { status: 400, code: 'VALIDATION_ERROR' },
    pergunta({ text: '   ' }),
  ),
  ass(
    {
      id: 'CT-CP-A04',
      tecnica: 'VL',
      classe: 'Pergunta com 1 caractere',
      entrada: 'texto de 1 caractere',
    },
    { status: 200 },
    pergunta({ text: 'a' }),
  ),
  ass(
    {
      id: 'CT-CP-A05',
      tecnica: 'VL',
      classe: 'Pergunta com 300 caracteres (máximo)',
      entrada: 'texto de 300 caracteres',
    },
    { status: 200 },
    pergunta({ text: 'a'.repeat(300) }),
  ),
  ass(
    {
      id: 'CT-CP-A06',
      tecnica: 'VL',
      classe: 'Pergunta com 301 caracteres',
      entrada: 'texto de 301 caracteres',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    pergunta({ text: 'a'.repeat(301) }),
  ),
  ass(
    { id: 'CT-CP-A07', tecnica: 'PE', classe: 'Pergunta que não é texto', entrada: 'text=5' },
    { status: 400, code: 'VALIDATION_ERROR' },
    pergunta({ text: 5 }),
  ),
  ass(
    {
      id: 'CT-CP-A08',
      tecnica: 'VL',
      classe: 'Limite de uso do chat (60 por hora): a 60ª',
      entrada: '60ª pergunta na hora',
    },
    { status: 200 },
    async (a) => {
      let r = await a.assistente.message(a.owner, { text: 'oi' });
      for (let i = 1; i < 60; i += 1) r = await a.assistente.message(a.owner, { text: 'oi' });
      return saida(r);
    },
  ),
  ass(
    {
      id: 'CT-CP-A09',
      tecnica: 'VL',
      classe: 'Limite de uso do chat: a 61ª',
      entrada: '61ª pergunta na hora',
    },
    { status: 429, code: 'RATE_LIMITED' },
    async (a) => {
      for (let i = 0; i < 60; i += 1) await a.assistente.message(a.owner, { text: 'oi' });
      return saida(await a.assistente.message(a.owner, { text: 'oi' }));
    },
  ),
  ass(
    {
      id: 'CT-CP-A10',
      tecnica: 'PE',
      classe: 'Áudio WAV válido',
      entrada: 'audio/wav com 44 bytes',
    },
    { status: 200 },
    voz('audio/wav', wav(44)),
  ),
  ass(
    {
      id: 'CT-CP-A11',
      tecnica: 'VL',
      classe: 'Áudio no tamanho máximo',
      entrada: `${MAX_AUDIO} bytes`,
    },
    { status: 200 },
    voz('audio/wav', wav(MAX_AUDIO)),
  ),
  ass(
    {
      id: 'CT-CP-A12',
      tecnica: 'VL',
      classe: 'Áudio 1 byte acima do máximo',
      entrada: `${MAX_AUDIO + 1} bytes`,
    },
    { status: 413, code: 'AUDIO_TOO_LARGE' },
    voz('audio/wav', wav(MAX_AUDIO + 1)),
  ),
  ass(
    {
      id: 'CT-CP-A13',
      tecnica: 'VL',
      classe: 'Áudio abaixo do cabeçalho mínimo (43 bytes)',
      entrada: '43 bytes',
    },
    { status: 415, code: 'UNSUPPORTED_AUDIO' },
    voz('audio/wav', wav(43)),
  ),
  ass(
    {
      id: 'CT-CP-A14',
      tecnica: 'PE',
      classe: 'Tipo de conteúdo não aceito',
      entrada: 'audio/webm',
    },
    { status: 415, code: 'UNSUPPORTED_AUDIO' },
    voz('audio/webm', wav(44)),
  ),
  ass(
    {
      id: 'CT-CP-A15',
      tecnica: 'PE',
      classe: 'Tipo de conteúdo ausente',
      entrada: '(sem Content-Type)',
    },
    { status: 415, code: 'UNSUPPORTED_AUDIO' },
    voz(null, wav(44)),
  ),
  ass(
    {
      id: 'CT-CP-A16',
      tecnica: 'PE',
      classe: 'Arquivo sem o cabeçalho RIFF/WAVE',
      entrada: '100 bytes zerados',
    },
    { status: 415, code: 'UNSUPPORTED_AUDIO' },
    voz('audio/wav', wav(100, false)),
  ),
  ass(
    {
      id: 'CT-CP-A17',
      tecnica: 'PE',
      classe: 'Fala não entendida',
      entrada: 'áudio sem fala reconhecível',
    },
    { status: 422, code: 'SPEECH_NOT_RECOGNIZED' },
    async (a) => {
      a.falaNaoEntendida();
      return saida(await a.assistente.voice(a.owner, 'audio/wav', wav(44)));
    },
  ),
  ass(
    {
      id: 'CT-CP-A18',
      tecnica: 'VL',
      classe: 'Limite de uso da voz (20 por hora): a 20ª',
      entrada: '20ª pergunta por voz na hora',
    },
    { status: 200 },
    async (a) => {
      let r = await a.assistente.voice(a.owner, 'audio/wav', wav(44));
      for (let i = 1; i < 20; i += 1) r = await a.assistente.voice(a.owner, 'audio/wav', wav(44));
      return saida(r);
    },
  ),
  ass(
    {
      id: 'CT-CP-A19',
      tecnica: 'VL',
      classe: 'Limite de uso da voz: a 21ª',
      entrada: '21ª pergunta por voz na hora',
    },
    { status: 429, code: 'RATE_LIMITED' },
    async (a) => {
      for (let i = 0; i < 20; i += 1) await a.assistente.voice(a.owner, 'audio/wav', wav(44));
      return saida(await a.assistente.voice(a.owner, 'audio/wav', wav(44)));
    },
  ),
];

// ---------------------------------------------------------------------------------------------
// Parentesco do membro (RF02)
// ---------------------------------------------------------------------------------------------
const par = grupo('Parentesco do membro', 'RF02');
const PARENTESCOS = [
  'SELF',
  'MOTHER',
  'FATHER',
  'SON',
  'DAUGHTER',
  'GRANDMOTHER',
  'GRANDFATHER',
  'SISTER',
  'BROTHER',
  'SPOUSE',
  'OTHER',
] as const;
const base = { name: 'Ana', birthDate: '1990-01-10', isPregnant: false };

/** Lê um campo do corpo da resposta como texto, para o "detalhe" conferido na tabela. */
function campo(resposta: { jsonBody?: unknown }, nome: string): string {
  return String((resposta.jsonBody as Record<string, unknown> | undefined)?.[nome]);
}

const comParentesco = (corpo: Record<string, unknown>) => async (a: Ambiente) => {
  await a.consentir();
  const r = await a.app.handlers.members.create(a.owner, corpo);
  return saida(r, r.status === 201 ? campo(r, 'relationship') : undefined);
};

const parentescos: Caso[] = [
  par(
    {
      id: 'CT-CP-P01',
      tecnica: 'PE',
      classe: 'Parentesco válido: o próprio usuário',
      entrada: 'SELF',
    },
    { status: 201, detalhe: 'SELF' },
    comParentesco({ ...base, relationship: 'SELF' }),
  ),
  par(
    {
      id: 'CT-CP-P02',
      tecnica: 'PE',
      classe: 'Parentesco válido: parente (filha)',
      entrada: 'DAUGHTER',
    },
    { status: 201, detalhe: 'DAUGHTER' },
    comParentesco({ ...base, relationship: 'DAUGHTER' }),
  ),
  par(
    {
      id: 'CT-CP-P03',
      tecnica: 'PE',
      classe: 'Parentesco válido: outro parente ou pessoa cuidada',
      entrada: 'OTHER',
    },
    { status: 201, detalhe: 'OTHER' },
    comParentesco({ ...base, relationship: 'OTHER' }),
  ),
  par(
    {
      id: 'CT-CP-P04',
      tecnica: 'PE',
      classe: 'Parentesco omitido (opcional, vale "não informado")',
      entrada: 'sem o campo',
    },
    { status: 201, detalhe: 'null' },
    comParentesco(base),
  ),
  par(
    {
      id: 'CT-CP-P05',
      tecnica: 'PE',
      classe: 'Parentesco nulo (prefiro não informar)',
      entrada: 'relationship = null',
    },
    { status: 201, detalhe: 'null' },
    comParentesco({ ...base, relationship: null }),
  ),
  par(
    {
      id: 'CT-CP-P06',
      tecnica: 'PE',
      classe: 'Todos os 11 parentescos da lista são aceitos',
      entrada: 'os 11 códigos, um por pessoa',
    },
    { status: 201 },
    async (a) => {
      await a.consentir();
      let ultima = 201;
      for (const relationship of PARENTESCOS) {
        const r = await a.app.handlers.members.create(a.owner, { ...base, relationship });
        if (r.status !== 201) return saida(r);
        ultima = r.status;
      }
      return { status: ultima };
    },
  ),
  par(
    {
      id: 'CT-CP-P07',
      tecnica: 'PE',
      classe: 'Parentesco fora da lista',
      entrada: 'VIZINHO',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    comParentesco({ ...base, relationship: 'VIZINHO' }),
  ),
  par(
    {
      id: 'CT-CP-P08',
      tecnica: 'VL',
      classe: 'Código em minúsculas (a lista é sensível à caixa)',
      entrada: 'self',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    comParentesco({ ...base, relationship: 'self' }),
  ),
  par(
    {
      id: 'CT-CP-P09',
      tecnica: 'VL',
      classe: 'Parentesco vazio',
      entrada: 'texto vazio',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    comParentesco({ ...base, relationship: '' }),
  ),
  par(
    {
      id: 'CT-CP-P10',
      tecnica: 'PE',
      classe: 'Parentesco de tipo errado',
      entrada: 'número 7',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    comParentesco({ ...base, relationship: 7 }),
  ),
  par(
    {
      id: 'CT-CP-P11',
      tecnica: 'PE',
      classe: 'Trocar o parentesco na edição',
      entrada: 'DAUGHTER para FATHER',
    },
    { status: 200, detalhe: 'FATHER' },
    async (a) => {
      await a.consentir();
      const criada = await a.app.handlers.members.create(a.owner, {
        ...base,
        relationship: 'DAUGHTER',
      });
      const id = (criada.jsonBody as { id: string }).id;
      const r = await a.app.handlers.members.update(a.owner, id, {
        ...base,
        relationship: 'FATHER',
      });
      return saida(r, campo(r, 'relationship'));
    },
  ),
  par(
    {
      id: 'CT-CP-P12',
      tecnica: 'PE',
      classe: 'Limpar o parentesco na edição',
      entrada: 'MOTHER para nulo',
    },
    { status: 200, detalhe: 'null' },
    async (a) => {
      await a.consentir();
      const criada = await a.app.handlers.members.create(a.owner, {
        ...base,
        relationship: 'MOTHER',
      });
      const id = (criada.jsonBody as { id: string }).id;
      const r = await a.app.handlers.members.update(a.owner, id, {
        ...base,
        relationship: null,
      });
      return saida(r, campo(r, 'relationship'));
    },
  ),
];

// ---------------------------------------------------------------------------------------------
// Dose avulsa (RF04, ADR-016)
// ---------------------------------------------------------------------------------------------
const avu = grupo('Dose avulsa', 'RF04');
const AVULSA = { vaccine: 'Febre tifoide', doseLabel: '1ª dose', dueDate: somarDias(HOJE, 28) };

/** Cadastra uma pessoa adulta com consentimento e devolve o id dela. */
async function pessoaAdulta(a: Ambiente, dono: string = a.owner): Promise<string> {
  await a.consentir(true, dono);
  const m = await a.cadastrar('1990-01-10', 'Ana', dono);
  return (m.jsonBody as { id: string }).id;
}

const criarAvulsa =
  (corpo: unknown, detalhe: string | null = null) =>
  async (a: Ambiente) => {
    const id = await pessoaAdulta(a);
    const r = await a.app.handlers.members.addCustomDose(a.owner, id, corpo);
    return saida(r, detalhe && r.status === 201 ? campo(r, detalhe) : undefined);
  };

/** Cria uma dose avulsa e devolve o id da dose, para os casos do ciclo de estados. */
async function doseAvulsa(a: Ambiente, dueDate = AVULSA.dueDate): Promise<string> {
  const id = await pessoaAdulta(a);
  const r = await a.app.handlers.members.addCustomDose(a.owner, id, { ...AVULSA, dueDate });
  return (r.jsonBody as { id: string }).id;
}

const avulsas: Caso[] = [
  avu(
    {
      id: 'CT-CP-V01',
      tecnica: 'PE',
      classe: 'Dados válidos: nasce Pendente e com origem avulsa',
      entrada: 'Febre tifoide, 1ª dose, daqui a 28 dias',
    },
    { status: 201, detalhe: 'CUSTOM' },
    criarAvulsa(AVULSA, 'origin'),
  ),
  avu(
    {
      id: 'CT-CP-V02',
      tecnica: 'PE',
      classe: 'Estado inicial da dose avulsa (T1)',
      entrada: 'dados válidos',
    },
    { status: 201, detalhe: 'PENDING' },
    criarAvulsa(AVULSA, 'status'),
  ),
  avu(
    {
      id: 'CT-CP-V03',
      tecnica: 'PE',
      classe: 'Nome com acento e espaços nas pontas (removidos)',
      entrada: '"  Raiva (pré-exposição)  "',
    },
    { status: 201, detalhe: 'Raiva (pré-exposição)' },
    criarAvulsa({ ...AVULSA, vaccine: '  Raiva (pré-exposição)  ' }, 'vaccine'),
  ),
  avu(
    {
      id: 'CT-CP-V04',
      tecnica: 'VL',
      classe: 'Nome com 1 caractere (abaixo do mínimo de 2)',
      entrada: 'nome de 1 caractere',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    criarAvulsa({ ...AVULSA, vaccine: 'A' }),
  ),
  avu(
    {
      id: 'CT-CP-V05',
      tecnica: 'VL',
      classe: 'Nome com 2 caracteres (mínimo)',
      entrada: 'nome de 2 caracteres',
    },
    { status: 201 },
    criarAvulsa({ ...AVULSA, vaccine: 'AB' }),
  ),
  avu(
    {
      id: 'CT-CP-V06',
      tecnica: 'VL',
      classe: 'Nome com 80 caracteres (máximo)',
      entrada: 'nome de 80 caracteres',
    },
    { status: 201 },
    criarAvulsa({ ...AVULSA, vaccine: 'v'.repeat(80) }),
  ),
  avu(
    {
      id: 'CT-CP-V07',
      tecnica: 'VL',
      classe: 'Nome com 81 caracteres',
      entrada: 'nome de 81 caracteres',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    criarAvulsa({ ...AVULSA, vaccine: 'v'.repeat(81) }),
  ),
  avu(
    { id: 'CT-CP-V08', tecnica: 'PE', classe: 'Nome só com espaços', entrada: 'nome "     "' },
    { status: 400, code: 'VALIDATION_ERROR' },
    criarAvulsa({ ...AVULSA, vaccine: '     ' }),
  ),
  avu(
    { id: 'CT-CP-V09', tecnica: 'PE', classe: 'Nome ausente', entrada: 'sem nome' },
    { status: 400, code: 'VALIDATION_ERROR' },
    criarAvulsa({ doseLabel: AVULSA.doseLabel, dueDate: AVULSA.dueDate }),
  ),
  avu(
    {
      id: 'CT-CP-V10',
      tecnica: 'PE',
      classe: 'Nome com caractere de controle',
      entrada: 'nome com quebra de linha',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    criarAvulsa({ ...AVULSA, vaccine: 'Raiva\nB' }),
  ),
  avu(
    {
      id: 'CT-CP-V11',
      tecnica: 'PE',
      classe: 'Nome com tipo errado',
      entrada: 'número 123',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    criarAvulsa({ ...AVULSA, vaccine: 123 }),
  ),
  avu(
    {
      id: 'CT-CP-V12',
      tecnica: 'VL',
      classe: 'Dose vazia (abaixo do mínimo de 1)',
      entrada: 'dose vazia',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    criarAvulsa({ ...AVULSA, doseLabel: '' }),
  ),
  avu(
    {
      id: 'CT-CP-V13',
      tecnica: 'VL',
      classe: 'Dose com 1 caractere (mínimo)',
      entrada: 'dose "1"',
    },
    { status: 201 },
    criarAvulsa({ ...AVULSA, doseLabel: '1' }),
  ),
  avu(
    {
      id: 'CT-CP-V14',
      tecnica: 'VL',
      classe: 'Dose com 40 caracteres (máximo)',
      entrada: 'dose de 40 caracteres',
    },
    { status: 201 },
    criarAvulsa({ ...AVULSA, doseLabel: 'd'.repeat(40) }),
  ),
  avu(
    {
      id: 'CT-CP-V15',
      tecnica: 'VL',
      classe: 'Dose com 41 caracteres',
      entrada: 'dose de 41 caracteres',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    criarAvulsa({ ...AVULSA, doseLabel: 'd'.repeat(41) }),
  ),
  avu(
    { id: 'CT-CP-V16', tecnica: 'PE', classe: 'Dose ausente', entrada: 'sem a dose' },
    { status: 400, code: 'VALIDATION_ERROR' },
    criarAvulsa({ vaccine: AVULSA.vaccine, dueDate: AVULSA.dueDate }),
  ),
  avu(
    {
      id: 'CT-CP-V17',
      tecnica: 'VL',
      classe: 'Data prevista ontem (D-1, abaixo do limite)',
      entrada: somarDias(HOJE, -1),
    },
    { status: 422, code: 'INVALID_DOSE_DATE' },
    criarAvulsa({ ...AVULSA, dueDate: somarDias(HOJE, -1) }),
  ),
  avu(
    {
      id: 'CT-CP-V18',
      tecnica: 'VL',
      classe: 'Data prevista hoje (D, limite inferior válido)',
      entrada: HOJE,
    },
    { status: 201 },
    criarAvulsa({ ...AVULSA, dueDate: HOJE }),
  ),
  avu(
    {
      id: 'CT-CP-V19',
      tecnica: 'VL',
      classe: 'Data prevista amanhã (D+1)',
      entrada: somarDias(HOJE, 1),
    },
    { status: 201 },
    criarAvulsa({ ...AVULSA, dueDate: somarDias(HOJE, 1) }),
  ),
  avu(
    {
      id: 'CT-CP-V20',
      tecnica: 'VL',
      classe: 'Último dia do 10º ano à frente (limite superior válido)',
      entrada: '2036-12-31',
    },
    { status: 201 },
    criarAvulsa({ ...AVULSA, dueDate: '2036-12-31' }),
  ),
  avu(
    {
      id: 'CT-CP-V21',
      tecnica: 'VL',
      classe: 'Primeiro dia do 11º ano à frente (acima do limite)',
      entrada: '2037-01-01',
    },
    { status: 422, code: 'INVALID_DOSE_DATE' },
    criarAvulsa({ ...AVULSA, dueDate: '2037-01-01' }),
  ),
  avu(
    {
      id: 'CT-CP-V22',
      tecnica: 'PE',
      classe: 'Data inexistente no calendário',
      entrada: '2026-02-30',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    criarAvulsa({ ...AVULSA, dueDate: '2026-02-30' }),
  ),
  avu(
    {
      id: 'CT-CP-V23',
      tecnica: 'PE',
      classe: 'Data em formato brasileiro',
      entrada: '04/11/2026',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    criarAvulsa({ ...AVULSA, dueDate: '04/11/2026' }),
  ),
  avu(
    { id: 'CT-CP-V24', tecnica: 'PE', classe: 'Data ausente', entrada: 'sem data' },
    { status: 400, code: 'VALIDATION_ERROR' },
    criarAvulsa({ vaccine: AVULSA.vaccine, doseLabel: AVULSA.doseLabel }),
  ),
  avu(
    { id: 'CT-CP-V25', tecnica: 'PE', classe: 'Corpo ausente', entrada: 'sem corpo' },
    { status: 400, code: 'VALIDATION_ERROR' },
    criarAvulsa(undefined),
  ),
  avu(
    {
      id: 'CT-CP-V26',
      tecnica: 'VL',
      classe: '30ª dose avulsa da pessoa (limite)',
      entrada: '30ª dose avulsa',
    },
    { status: 201 },
    async (a) => {
      const id = await pessoaAdulta(a);
      let r = await a.app.handlers.members.addCustomDose(a.owner, id, AVULSA);
      for (let i = 1; i < 30; i += 1)
        r = await a.app.handlers.members.addCustomDose(a.owner, id, AVULSA);
      return saida(r);
    },
  ),
  avu(
    {
      id: 'CT-CP-V27',
      tecnica: 'VL',
      classe: '31ª dose avulsa da pessoa',
      entrada: '31ª dose avulsa',
    },
    { status: 422, code: 'LIMIT_REACHED' },
    async (a) => {
      const id = await pessoaAdulta(a);
      for (let i = 0; i < 30; i += 1)
        await a.app.handlers.members.addCustomDose(a.owner, id, AVULSA);
      return saida(await a.app.handlers.members.addCustomDose(a.owner, id, AVULSA));
    },
  ),
  avu(
    {
      id: 'CT-CP-V28',
      tecnica: 'PE',
      classe: 'Sem consentimento prévio',
      entrada: 'cadastrar a dose sem aceitar o termo',
    },
    { status: 403, code: 'CONSENT_REQUIRED' },
    async (a) =>
      saida(
        await a.app.handlers.members.addCustomDose(a.owner, 'membro-sem-consentimento', AVULSA),
      ),
  ),
  avu(
    {
      id: 'CT-CP-V29',
      tecnica: 'PE',
      classe: 'Pessoa inexistente',
      entrada: 'id de pessoa que não existe',
    },
    { status: 404, code: 'NOT_FOUND' },
    async (a) => {
      await a.consentir();
      return saida(await a.app.handlers.members.addCustomDose(a.owner, 'nao-existe', AVULSA));
    },
  ),
  avu(
    {
      id: 'CT-CP-V30',
      tecnica: 'PE',
      classe: 'Pessoa de outro usuário',
      entrada: 'id de pessoa de outro dono',
    },
    { status: 404, code: 'NOT_FOUND' },
    async (a) => {
      const id = await pessoaAdulta(a);
      await a.consentir(true, a.outroDono);
      return saida(await a.app.handlers.members.addCustomDose(a.outroDono, id, AVULSA));
    },
  ),
  avu(
    {
      id: 'CT-CP-V31',
      tecnica: 'PE',
      classe: 'Identificador de pessoa inválido',
      entrada: 'id "../x"',
    },
    { status: 400, code: 'VALIDATION_ERROR' },
    async (a) => {
      await a.consentir();
      return saida(await a.app.handlers.members.addCustomDose(a.owner, '../x', AVULSA));
    },
  ),
  avu(
    {
      id: 'CT-CP-V32',
      tecnica: 'PE',
      classe: 'Ciclo de estados: agendar a dose avulsa (T2)',
      entrada: `SCHEDULE ${HOJE}`,
    },
    { status: 200, detalhe: 'SCHEDULED' },
    async (a) => {
      const dose = await doseAvulsa(a);
      const r = await a.app.handlers.doses.applyEvent(a.owner, dose, {
        type: 'SCHEDULE',
        date: HOJE,
      });
      return saida(r, campo(r, 'status'));
    },
  ),
  avu(
    {
      id: 'CT-CP-V33',
      tecnica: 'PE',
      classe: 'Ciclo de estados: registrar a aplicação da dose avulsa (T3)',
      entrada: `APPLY ${somarDias(HOJE, -30)}`,
    },
    { status: 200, detalhe: 'APPLIED' },
    async (a) => {
      const dose = await doseAvulsa(a);
      const r = await a.app.handlers.doses.applyEvent(a.owner, dose, {
        type: 'APPLY',
        date: somarDias(HOJE, -30),
      });
      return saida(r, campo(r, 'status'));
    },
  ),
  avu(
    {
      id: 'CT-CP-V34',
      tecnica: 'VL',
      classe: 'Aplicar a dose avulsa com data de amanhã (acima do limite)',
      entrada: `APPLY ${somarDias(HOJE, 1)}`,
    },
    { status: 422, code: 'GUARD_VIOLATION' },
    async (a) => {
      const dose = await doseAvulsa(a);
      return saida(
        await a.app.handlers.doses.applyEvent(a.owner, dose, {
          type: 'APPLY',
          date: somarDias(HOJE, 1),
        }),
      );
    },
  ),
  avu(
    {
      id: 'CT-CP-V35',
      tecnica: 'PE',
      classe: 'Ciclo de estados: cancelar a dose avulsa confirmando (T5)',
      entrada: 'CANCEL confirmado',
    },
    { status: 200, detalhe: 'CANCELLED' },
    async (a) => {
      const dose = await doseAvulsa(a);
      const r = await a.app.handlers.doses.applyEvent(a.owner, dose, {
        type: 'CANCEL',
        confirmed: true,
      });
      return saida(r, campo(r, 'status'));
    },
  ),
  avu(
    {
      id: 'CT-CP-V36',
      tecnica: 'PE',
      classe: 'Cancelar a dose avulsa sem confirmar',
      entrada: 'CANCEL confirmed = false',
    },
    { status: 422, code: 'GUARD_VIOLATION' },
    async (a) => {
      const dose = await doseAvulsa(a);
      return saida(
        await a.app.handlers.doses.applyEvent(a.owner, dose, { type: 'CANCEL', confirmed: false }),
      );
    },
  ),
  avu(
    {
      id: 'CT-CP-V37',
      tecnica: 'VL',
      classe: 'Rotina de prazo: no próprio dia da data prevista a dose segue Pendente',
      entrada: 'data prevista hoje; lida hoje',
    },
    { status: 200, detalhe: 'PENDING' },
    async (a) => {
      const id = await pessoaAdulta(a);
      await a.app.handlers.members.addCustomDose(a.owner, id, { ...AVULSA, dueDate: HOJE });
      const r = await a.app.handlers.members.listDoses(a.owner, id);
      const itens = (r.jsonBody as { items: { origin: string; status: string }[] }).items;
      return saida(r, itens.find((d) => d.origin === 'CUSTOM')?.status);
    },
  ),
  avu(
    {
      id: 'CT-CP-V38',
      tecnica: 'VL',
      classe: 'Rotina de prazo: no dia seguinte à data prevista a dose vira Atrasada (T4)',
      entrada: 'data prevista hoje; lida amanhã',
    },
    { status: 200, detalhe: 'OVERDUE' },
    async (a) => {
      const id = await pessoaAdulta(a);
      await a.app.handlers.members.addCustomDose(a.owner, id, { ...AVULSA, dueDate: HOJE });
      a.app.setNow('2026-10-07T15:00:00.000Z');
      const r = await a.app.handlers.members.listDoses(a.owner, id);
      const itens = (r.jsonBody as { items: { origin: string; status: string }[] }).items;
      return saida(r, itens.find((d) => d.origin === 'CUSTOM')?.status);
    },
  ),
  avu(
    {
      id: 'CT-CP-V39',
      tecnica: 'PE',
      classe: 'Dose avulsa aparece na lista da pessoa junto das oficiais',
      entrada: 'listar as doses depois de cadastrar uma avulsa',
    },
    { status: 200, detalhe: '1' },
    async (a) => {
      const id = await pessoaAdulta(a);
      await a.app.handlers.members.addCustomDose(a.owner, id, AVULSA);
      const r = await a.app.handlers.members.listDoses(a.owner, id);
      const itens = (r.jsonBody as { items: { origin: string }[] }).items;
      return saida(r, String(itens.filter((d) => d.origin === 'CUSTOM').length));
    },
  ),
  avu(
    {
      id: 'CT-CP-V40',
      tecnica: 'PE',
      classe: 'Editar a pessoa não apaga nem duplica a dose avulsa',
      entrada: 'editar o nome depois de cadastrar uma avulsa',
    },
    { status: 200, detalhe: '1' },
    async (a) => {
      const id = await pessoaAdulta(a);
      await a.app.handlers.members.addCustomDose(a.owner, id, AVULSA);
      await a.app.handlers.members.update(a.owner, id, {
        name: 'Ana Maria',
        birthDate: '1990-01-10',
        isPregnant: false,
      });
      const r = await a.app.handlers.members.listDoses(a.owner, id);
      const itens = (r.jsonBody as { items: { origin: string }[] }).items;
      return saida(r, String(itens.filter((d) => d.origin === 'CUSTOM').length));
    },
  ),
];

/** Todos os casos de caixa preta, na ordem em que aparecem na tabela de execução. */
export const CASOS: readonly Caso[] = [
  ...contas,
  ...logins,
  ...recuperacao,
  ...consentimento,
  ...membros,
  ...parentescos,
  ...faixas,
  ...doses,
  ...avulsas,
  ...assistente,
];
