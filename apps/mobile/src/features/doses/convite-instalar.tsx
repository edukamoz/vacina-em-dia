import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AzulejoDeMarca } from '../../components/azulejo-de-marca';
import { Botao } from '../../components/botao';
import { Texto } from '../../components/texto';
import {
  CHAVE_CONVITE_DISPENSADO,
  deveMostrarConvite,
  useConviteDeInstalacao,
} from '../../lib/instalar-app';

/**
 * Convite para levar o app à tela inicial (PWA), na aba Doses. Aparece só na web, só depois da
 * primeira dose aplicada e só enquanto a pessoa não tocar em "Agora não". No Android e no
 * computador traz o botão "Instalar o aplicativo"; no iPhone, o passo a passo do Safari, que não
 * oferece o aviso automático. O app instalado e o app do celular nunca mostram o convite.
 *
 * @param props.dosesAplicadas - Quantas doses da pessoa já foram aplicadas.
 */
export function ConviteDeInstalacao({ dosesAplicadas }: { dosesAplicadas: number }) {
  const convite = useConviteDeInstalacao();
  // `null` enquanto lê o aparelho: sem isto o cartão piscaria antes de saber se foi dispensado.
  const [dispensado, setDispensado] = useState<boolean | null>(null);

  useEffect(() => {
    let ativo = true;
    void AsyncStorage.getItem(CHAVE_CONVITE_DISPENSADO)
      .then((valor) => ativo && setDispensado(valor !== null))
      .catch(() => ativo && setDispensado(false));
    return () => {
      ativo = false;
    };
  }, []);

  if (dispensado === null || !deveMostrarConvite(convite.forma, dosesAplicadas, dispensado)) {
    return null;
  }

  function agoraNao() {
    setDispensado(true);
    void AsyncStorage.setItem(CHAVE_CONVITE_DISPENSADO, new Date().toISOString()).catch(() => {});
  }

  return (
    <View
      accessibilityRole="summary"
      className="gap-md rounded-cartao border-fina border-bordaSuave bg-superficie p-lg"
    >
      <View className="flex-row items-start gap-md">
        <AzulejoDeMarca icone="doses" />
        <View className="min-w-0 flex-1 gap-xs">
          <Texto variante="titulo3" accessibilityRole="header">
            Leve para a tela inicial
          </Texto>
          <Texto variante="apoio">Abre mais rápido e em tela cheia, como um aplicativo.</Texto>
        </View>
      </View>
      {convite.forma === 'iphone' ? (
        <Texto>
          No iPhone: toque em Compartilhar e depois em &quot;Adicionar à Tela de Início&quot;.
        </Texto>
      ) : (
        <Botao
          titulo="Instalar o aplicativo"
          icone="mais"
          onPress={() => void convite.instalar()}
        />
      )}
      <Botao titulo="Agora não" variante="texto" onPress={agoraNao} />
    </View>
  );
}
