import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ID_DO_CONTEUDO } from '../lib/pular-conteudo';
import { useVisual } from '../theme/theme-provider';
import { Children } from 'react';
import { Entrada } from './animacao';
import { Botao } from './botao';
import { JanelaModal } from './janela-modal';
import { RolagemDaTelaContext } from './rolagem-da-tela';
import { Texto } from './texto';

/**
 * Moldura de toda tela: área segura, rolagem e largura máxima de leitura, com o título da tela
 * como cabeçalho (para o leitor de tela) e, nas telas secundárias, um botão "Voltar".
 *
 * @param props.titulo - Título da tela.
 * @param props.subtitulo - Frase de apoio abaixo do título.
 * @param props.voltar - Mostra o botão "Voltar" (telas fora das abas).
 * @param props.acao - Ação principal da tela (botão). No computador fica à direita do título; no
 *   celular, logo abaixo dele, em largura total.
 * @param props.abaixoDoTitulo - Conteúdo colado ao título, como o link "Trocar pessoa".
 * @param props.reservaBalao - Deixa espaço no fim para o balão do assistente não cobrir o conteúdo
 *   (telas das abas).
 * @param props.modal - Mostra a tela como janela por cima da anterior (`JanelaModal`), em vez de
 *   página inteira. Use nas telas de formulário e detalhe abertas a partir de outra tela.
 */
export function Tela({
  titulo,
  subtitulo,
  voltar = false,
  acao,
  abaixoDoTitulo,
  reservaBalao = false,
  modal = false,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  voltar?: boolean;
  acao?: ReactNode;
  abaixoDoTitulo?: ReactNode;
  reservaBalao?: boolean;
  modal?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const { gradienteFundo } = useVisual();
  const [travada, setTravada] = useState(false);
  if (modal) {
    return (
      <JanelaModal
        titulo={titulo}
        subtitulo={subtitulo}
        acao={acao}
        abaixoDoTitulo={abaixoDoTitulo}
      >
        {children}
      </JanelaModal>
    );
  }
  return (
    // Nas abas a barra de navegação já cuida da borda de baixo (e da barra do sistema); sem isto o
    // conteúdo seria cortado antes de chegar ao menu.
    <SafeAreaView
      className="flex-1 bg-fundo"
      style={gradienteFundo}
      edges={reservaBalao ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
    >
      <RolagemDaTelaContext.Provider value={setTravada}>
        <ScrollView
          nativeID={ID_DO_CONTEUDO}
          tabIndex={-1}
          scrollEnabled={!travada}
          contentContainerClassName={`gap-xl p-lg medio:p-xl expandido:gap-xxl expandido:p-xxl self-center w-full max-w-conteudoComMargem ${
            reservaBalao ? 'pb-[96px]' : ''
          }`}
        >
          {voltar ? (
            <Botao
              titulo="Voltar"
              variante="secundario"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
          ) : null}
          <Entrada>
            <View className="gap-md expandido:flex-row expandido:items-start expandido:justify-between expandido:gap-xl">
              <View className="expandido:flex-1">
                <Texto variante="titulo1" accessibilityRole="header">
                  {titulo}
                </Texto>
                {subtitulo ? <Texto className="text-textoSecundario">{subtitulo}</Texto> : null}
                {abaixoDoTitulo}
              </View>
              {acao}
            </View>
          </Entrada>
          {Children.toArray(children).map((filho, indice) => (
            <Entrada key={indice} indice={indice + 1}>
              {filho}
            </Entrada>
          ))}
        </ScrollView>
      </RolagemDaTelaContext.Provider>
    </SafeAreaView>
  );
}
