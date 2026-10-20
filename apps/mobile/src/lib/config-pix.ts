import type { DadosDoPix } from './pix';

/**
 * Lê a configuração do Pix de doação. Os três valores precisam existir; sem eles a doação fica
 * desligada (a seção some da aba Conta), em vez de mostrar um código quebrado.
 *
 * @param env - Valores de `EXPO_PUBLIC_PIX_KEY`, `EXPO_PUBLIC_PIX_NAME` e `EXPO_PUBLIC_PIX_CITY`.
 * @returns Dados do recebedor, ou `null` se algum faltar.
 */
export function lerConfigPix(env: {
  chave: string | undefined;
  nome: string | undefined;
  cidade: string | undefined;
}): Omit<DadosDoPix, 'valor'> | null {
  const chave = env.chave?.trim();
  const nome = env.nome?.trim();
  const cidade = env.cidade?.trim();
  if (!chave || !nome || !cidade) return null;
  return { chave, nome, cidade };
}

/**
 * Pix de quem recebe as doações. A leitura de `process.env.EXPO_PUBLIC_*` precisa ser literal para
 * o Expo substituir o valor na hora do build. A chave é aleatória (não é CPF nem telefone) e vai
 * dentro do pacote do app, como qualquer chave Pix mostrada num QR: não é segredo.
 */
export const PIX_DA_DOACAO = lerConfigPix({
  chave: process.env.EXPO_PUBLIC_PIX_KEY,
  nome: process.env.EXPO_PUBLIC_PIX_NAME,
  cidade: process.env.EXPO_PUBLIC_PIX_CITY,
});
