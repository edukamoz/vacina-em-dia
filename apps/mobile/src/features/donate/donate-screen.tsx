import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Botao } from '../../components/botao';
import { CampoTexto } from '../../components/campo-texto';
import { Cartao } from '../../components/cartao';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { PIX_DA_DOACAO } from '../../lib/config-pix';
import { montarPix, valorValido } from '../../lib/pix';
import { QrPix } from './qr-pix';

/** Valores sugeridos, em reais. */
export const VALORES_SUGERIDOS = [5, 10, 20, 50] as const;

/** Escreve o valor no formato brasileiro, por exemplo `1.234,50`. */
function formatar(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Converte o que a pessoa digitou ("12", "12,5", "1.234,50") em reais.
 *
 * @param texto - Texto do campo.
 * @returns O valor, ou `null` se estiver vazio ou for inválido.
 */
export function lerValor(texto: string): number | null {
  const limpo = texto.trim().replace(/^R\$\s*/, '');
  if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/.test(limpo)) return null;
  const valor = Number(limpo.replace(/\./g, '').replace(',', '.'));
  return valorValido(valor) ? valor : null;
}

/**
 * Tela "Apoie o projeto" (B53): a pessoa escolhe um valor (ou deixa em aberto), vê o QR e copia o
 * Pix copia e cola. O código é montado no aparelho; nada passa por servidor e nenhum dado de
 * pagamento é guardado. A doação é voluntária e não dá acesso a nada.
 *
 * Sem a chave configurada, mostra um aviso em vez de um código quebrado.
 */
export function DonateScreen() {
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const [outro, setOutro] = useState('');
  const [copiado, setCopiado] = useState<'sim' | 'erro' | null>(null);

  const digitou = outro.trim() !== '';
  const valorOutro = digitou ? lerValor(outro) : null;
  const valor = digitou ? valorOutro : escolhido;
  const erroDoValor =
    digitou && valorOutro === null ? 'Digite um valor, por exemplo 15,00.' : undefined;

  const codigo = useMemo(
    () =>
      PIX_DA_DOACAO && !erroDoValor
        ? montarPix({ ...PIX_DA_DOACAO, valor: valor ?? undefined })
        : null,
    [valor, erroDoValor],
  );

  async function copiar() {
    if (!codigo) return;
    try {
      await Clipboard.setStringAsync(codigo);
      setCopiado('sim');
    } catch {
      setCopiado('erro');
    }
  }

  if (!PIX_DA_DOACAO) {
    return (
      <Tela titulo="Apoie o projeto" modal>
        <Texto>A doação por Pix não está disponível agora. Obrigado pelo carinho!</Texto>
      </Tela>
    );
  }

  return (
    <Tela titulo="Apoie o projeto" modal>
      <Texto className="text-textoSecundario">
        O Vacina em Dia é um projeto de estudo, gratuito e sem anúncios. Se ele ajudou a sua
        família, você pode contribuir com qualquer valor para ajudar a mantê-lo no ar.
      </Texto>

      <View className="gap-md">
        <Texto variante="rotulo">Escolha um valor</Texto>
        <View className="flex-row flex-wrap gap-sm">
          {VALORES_SUGERIDOS.map((v) => (
            <Botao
              key={v}
              titulo={`R$ ${v}`}
              variante="secundario"
              selecionado={!digitou && escolhido === v}
              onPress={() => {
                setOutro('');
                setEscolhido(escolhido === v ? null : v);
                setCopiado(null);
              }}
            />
          ))}
        </View>
        <CampoTexto
          rotulo="Outro valor (opcional)"
          value={outro}
          onChangeText={(texto) => {
            setOutro(texto);
            setCopiado(null);
          }}
          keyboardType="decimal-pad"
          placeholder="Ex.: 15,00"
          erro={erroDoValor}
          ajuda="Sem valor, você digita no app do seu banco."
        />
      </View>

      {codigo ? (
        <Cartao className="items-center gap-md">
          <Texto variante="titulo3" accessibilityRole="header">
            {valor ? `Pix de R$ ${formatar(valor)}` : 'Pix com valor em aberto'}
          </Texto>
          <QrPix texto={codigo} />
          <Texto variante="apoio" className="text-center text-textoSecundario">
            Abra o app do seu banco, escolha pagar com Pix e leia o QR Code. Ou copie o código
            abaixo e use a opção Pix copia e cola.
          </Texto>
          <Texto
            variante="apoio"
            selectable
            accessibilityLabel="Código Pix copia e cola"
            className="w-full break-all rounded-campo bg-fundo p-md"
          >
            {codigo}
          </Texto>
          <Botao
            titulo={copiado === 'sim' ? 'Código copiado!' : 'Copiar código Pix'}
            icone="enviar"
            onPress={() => void copiar()}
          />
          {copiado === 'erro' ? (
            <Texto className="text-erro" accessibilityRole="alert">
              Não foi possível copiar. Segure o código acima para copiar à mão.
            </Texto>
          ) : null}
        </Cartao>
      ) : null}

      <Texto variante="apoio" className="text-textoSecundario">
        A doação é voluntária e não libera nada no aplicativo. Ela vai direto para a conta de quem
        mantém o projeto: o Vacina em Dia não vê nem guarda dados de pagamento. O pagamento é
        confirmado só no app do seu banco.
      </Texto>
    </Tela>
  );
}
