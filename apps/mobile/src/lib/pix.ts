/**
 * Pix copia e cola (BR Code estático, padrão EMV do Banco Central). O código é montado no próprio
 * aparelho: nada é enviado a servidor, gateway ou terceiro, e nenhum dado de pagamento passa pelo
 * aplicativo. A pessoa só vê o QR ou copia o texto e paga no app do banco dela.
 */

/** Maior valor aceito em uma doação (limite do campo 54 do BR Code é 13 caracteres; aqui, bem menos). */
export const VALOR_MAXIMO = 999_999.99;

/** Dados de quem recebe a doação. */
export interface DadosDoPix {
  /** Chave Pix de quem recebe (aqui, chave aleatória). */
  chave: string;
  /** Nome do recebedor; vira maiúsculo, sem acento e com até 25 caracteres. */
  nome: string;
  /** Cidade do recebedor; vira maiúscula, sem acento e com até 15 caracteres. */
  cidade: string;
  /** Valor em reais; sem valor, a pessoa digita no app do banco. */
  valor?: number | undefined;
}

/**
 * CRC16/CCITT-FALSE (polinômio 0x1021, início 0xFFFF), exigido no fim do BR Code.
 *
 * @param texto - Texto a proteger (ASCII).
 * @returns Quatro dígitos hexadecimais em maiúsculas.
 */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i += 1) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Deixa o texto como o BR Code aceita: sem acento, em maiúsculas, com espaços simples e cortado no
 * limite.
 *
 * @param texto - Texto original.
 * @param limite - Máximo de caracteres do campo.
 */
export function normalizarTexto(texto: string, limite: number): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, limite)
    .trim();
}

/**
 * Diz se o valor serve para uma doação: número finito, de R$ 0,01 até {@link VALOR_MAXIMO}.
 *
 * @param valor - Valor em reais.
 */
export function valorValido(valor: number): boolean {
  return Number.isFinite(valor) && valor >= 0.01 && valor <= VALOR_MAXIMO;
}

/** Monta um campo EMV: identificador (2 dígitos) + tamanho (2 dígitos) + valor. */
function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, '0')}${valor}`;
}

/**
 * Monta o código Pix copia e cola.
 *
 * @param dados - Chave, nome, cidade e, se houver, o valor.
 * @returns O texto do BR Code, com CRC16 no fim.
 * @throws Error se faltar chave, nome ou cidade, ou se o valor for inválido.
 */
export function montarPix(dados: DadosDoPix): string {
  const chave = dados.chave.trim();
  const nome = normalizarTexto(dados.nome, 25);
  const cidade = normalizarTexto(dados.cidade, 15);
  if (!chave || !nome || !cidade) {
    throw new Error('Faltam a chave, o nome ou a cidade do Pix.');
  }
  if (dados.valor !== undefined && !valorValido(dados.valor)) {
    throw new Error('O valor da doação é inválido.');
  }
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
  const corpo =
    campo('00', '01') +
    campo('01', '11') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    (dados.valor === undefined ? '' : campo('54', dados.valor.toFixed(2))) +
    campo('58', 'BR') +
    campo('59', nome) +
    campo('60', cidade) +
    campo('62', campo('05', '***')) +
    '6304';
  return corpo + crc16(corpo);
}
