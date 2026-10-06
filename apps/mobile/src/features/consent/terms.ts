/**
 * Versão do termo de consentimento exibido ao usuário e registrada junto com o aceite (RF09).
 * Ao mudar o texto abaixo, mude também a versão.
 *
 * Texto para validação do autor antes da apresentação (CLAUDE.md §10: consentimento explícito, em
 * linguagem simples).
 */
export const TERMS_VERSION = '2026-10-06';

/** Parágrafos do termo, em linguagem simples. */
export const TERMS_PARAGRAPHS: readonly string[] = [
  'O Vacina em Dia ajuda você a organizar as vacinas da sua família, receber lembretes e tirar dúvidas.',
  'Para isso, guardamos só o essencial: o nome (ou apelido) e a data de nascimento de cada pessoa, e se ela é gestante. Também guardamos quais doses foram tomadas, marcadas ou canceladas. Não pedimos CPF nem o Cartão Nacional de Saúde.',
  'Informações de vacinação são dados de saúde e recebem cuidado especial. Usamos os dados só para mostrar o calendário e as doses de quem você cadastrou. Não vendemos nem compartilhamos esses dados.',
  'Você pode excluir sua conta e todos os dados a qualquer momento, na aba Conta.',
  'O calendário segue o Calendário Nacional de Vacinação do Ministério da Saúde. O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.',
];
