import { View } from 'react-native';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { Texto } from '../../components/texto';
import { salvarArquivo } from '../../lib/salvar-arquivo';
import { useBaixarCarteiraPdf } from '../data/hooks';
import { useState } from 'react';

/**
 * Nome do arquivo da carteira: só letras sem acento, números e hífen, para valer em qualquer
 * aparelho (o nome da pessoa pode ter acento, espaço e símbolo).
 *
 * @param nome - Nome ou apelido da pessoa.
 */
export function nomeDoArquivoDaCarteira(nome: string): string {
  const slug = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `carteira-vacinacao-${slug || 'pessoa'}.pdf`;
}

/**
 * Cartão "Levar a carteira com você" da aba Doses (RF11): baixa a carteira de vacinação da pessoa
 * escolhida em PDF. Na web o navegador salva o arquivo; no celular abre a folha de compartilhar. O
 * PDF traz a fonte e a versão do calendário e o aviso de que não substitui a caderneta oficial
 * (o aviso fica dentro do arquivo, em toda página).
 *
 * @param props.memberId - Pessoa escolhida.
 * @param props.nome - Nome ou apelido da pessoa, para o texto e o nome do arquivo.
 */
export function BaixarCarteira({ memberId, nome }: { memberId: string; nome: string }) {
  const baixar = useBaixarCarteiraPdf(memberId);
  const [aviso, setAviso] = useState<string | null>(null);

  async function aoPressionar() {
    setAviso(null);
    try {
      const bytes = await baixar.mutateAsync();
      const entregue = await salvarArquivo(bytes, nomeDoArquivoDaCarteira(nome), 'application/pdf');
      setAviso(
        entregue
          ? 'Pronto. O PDF está com você (veja a pasta Downloads ou a janela de compartilhar).'
          : 'O arquivo foi preparado, mas este aparelho não consegue compartilhá-lo.',
      );
    } catch (erro) {
      setAviso(
        erro instanceof Error && erro.message
          ? erro.message
          : 'Não foi possível gerar o PDF agora. Tente de novo em instantes.',
      );
    }
  }

  return (
    <Cartao className="gap-md">
      <View className="gap-xs">
        <Texto variante="titulo3" accessibilityRole="header">
          Levar a carteira com você
        </Texto>
        <Texto className="text-textoSecundario">
          {`Baixe o PDF das doses de ${nome} para guardar ou mostrar a quem precisar.`}
        </Texto>
      </View>
      <View className="items-start">
        <Botao
          titulo={baixar.isPending ? 'Preparando o PDF...' : 'Baixar PDF'}
          variante="secundario"
          disabled={baixar.isPending}
          onPress={() => void aoPressionar()}
        />
      </View>
      {aviso ? (
        <Texto variante="apoio" accessibilityLiveRegion="polite" className="text-textoSecundario">
          {aviso}
        </Texto>
      ) : null}
    </Cartao>
  );
}
