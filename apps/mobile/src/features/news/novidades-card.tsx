import type { NewsItem } from '@vacina/shared';
import { useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Botao } from '../../components/botao';
import { Icone } from '../../components/icone';
import { Texto } from '../../components/texto';
import { modoDeLayout } from '../../lib/layout';
import { useMovimentoReduzido, useThemeColors, useVisual } from '../../theme/theme-provider';
import { useNews } from '../data/hooks';
import { formatCivilDate } from '../doses/format-date';

/** Quantas notícias aparecem no carrossel. */
export const LIMITE_NOVIDADES = 6;

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const LARGURA = 300;
const ESPACO = 12;

/** Separa a data civil em dia e mês abreviado para o selo ("19" e "OUT"). */
export function partesDaData(civil: string): { dia: string; mes: string } {
  const [, , mes = '1', dia = '1'] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(civil) ?? [];
  return { dia: String(Number(dia)), mes: MESES[Number(mes) - 1] ?? '' };
}

/**
 * Cartão de uma notícia, com o estilo do assunto: as de vacinação ganham o gradiente da marca e o
 * ícone de frasco; as demais, fundo claro e ícone de coração. Na web sobe um pouco ao passar o
 * mouse. Tocar abre a página original.
 */
function Noticia({ item, destaque }: { item: NewsItem; destaque: boolean }) {
  const cores = useThemeColors();
  const reduzido = useMovimentoReduzido();
  const { gradienteMarca, sombra, altoContraste } = useVisual();
  const { dia, mes } = partesDaData(item.publishedAt);
  const vacina = item.vaccineRelated;
  const texto = vacina ? 'text-sobrePrimaria' : 'text-texto';
  return (
    <View style={{ width: LARGURA }}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${item.title}, ${formatCivilDate(item.publishedAt)}${vacina ? ', sobre vacinação' : ''}. Abre no site do Ministério da Saúde`}
        onPress={() => void Linking.openURL(item.url)}
        style={(estado) => [
          { minHeight: destaque ? 236 : 216 },
          vacina ? gradienteMarca : null,
          sombra(2),
          reduzido
            ? null
            : ({ transitionProperty: 'transform', transitionDuration: '200ms' } as object),
          (estado as { hovered?: boolean }).hovered && !reduzido
            ? { transform: [{ translateY: -4 }] }
            : null,
        ]}
        className={`grow justify-between gap-md overflow-hidden rounded-cartao p-lg ${
          vacina
            ? `bg-primaria ${altoContraste ? 'border-altoContraste border-borda' : ''}`
            : `bg-superficie ${altoContraste ? 'border-altoContraste border-borda' : 'border-fina border-bordaSuave'}`
        }`}
      >
        <View className="flex-row items-center justify-between">
          <View
            aria-hidden
            className={`h-[44px] w-[44px] items-center justify-center rounded-[14px] border-padrao ${
              vacina ? 'border-sobrePrimaria' : 'border-primaria bg-primariaSuave'
            }`}
          >
            <Icone
              nome={vacina ? 'frasco' : 'coracao'}
              cor={vacina ? cores.sobrePrimaria : cores.primaria}
            />
          </View>
          <View
            aria-hidden
            className={`items-center rounded-botao px-md py-xs ${vacina ? 'bg-superficie' : 'bg-superficieSuave'}`}
          >
            <Texto variante="titulo3" className="text-texto">
              {dia}
            </Texto>
            <Texto variante="rotulo" className="text-textoSecundario">
              {mes}
            </Texto>
          </View>
        </View>
        <Texto
          variante={destaque ? 'titulo3' : 'corpoNegrito'}
          className={texto}
          numberOfLines={5}
          importantForAccessibility="no"
        >
          {item.title}
        </Texto>
        <View className="flex-row items-center justify-between gap-sm">
          {vacina ? (
            <View className="rounded-selo bg-superficie px-md py-xs">
              <Texto variante="rotulo" className="text-primaria" importantForAccessibility="no">
                Vacinação
              </Texto>
            </View>
          ) : (
            <View />
          )}
          <View className="flex-row items-center gap-xs">
            <Texto variante="rotulo" className={texto} importantForAccessibility="no">
              Ler no site
            </Texto>
            <Icone nome="seta" cor={vacina ? cores.sobrePrimaria : cores.primaria} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

/**
 * Cartão "Novidades de saúde" da aba Doses: um carrossel de notícias recentes do Ministério da
 * Saúde (feed oficial). Cada notícia é um cartão com a data em destaque, o ícone do assunto e o
 * título; as de vacinação usam o gradiente da marca. Rola com o dedo ou com os botões Anterior e
 * Próxima (no tablet e no computador), com pontos que mostram a posição. O app não resume nem
 * comenta as notícias: tocar abre a página original. Mostra a fonte e o aviso de que não é
 * orientação médica. Some quando não há notícias ou a consulta falha.
 */
export function NovidadesCard() {
  const cores = useThemeColors();
  const news = useNews();
  const rolagem = useRef<ScrollView>(null);
  const [atual, setAtual] = useState(0);
  const largura = useWindowDimensions().width;
  const comBotoes = modoDeLayout(largura) !== 'compacto';
  const itens = news.data?.items.slice(0, LIMITE_NOVIDADES) ?? [];
  if (!news.data || itens.length === 0) return null;
  const atualizado = news.data.updatedAt ? formatCivilDate(news.data.updatedAt.slice(0, 10)) : null;
  const passo = LARGURA + ESPACO;

  function irPara(indice: number) {
    const alvo = Math.max(0, Math.min(itens.length - 1, indice));
    setAtual(alvo);
    rolagem.current?.scrollTo({ x: alvo * passo, animated: true });
  }

  function aoRolar(evento: NativeSyntheticEvent<NativeScrollEvent>) {
    setAtual(Math.round(evento.nativeEvent.contentOffset.x / passo));
  }

  return (
    <View className="gap-md">
      <View className="flex-row flex-wrap items-center justify-between gap-md">
        <View className="flex-row items-center gap-sm">
          <Icone nome="info" cor={cores.primaria} />
          <Texto variante="titulo2" accessibilityRole="header">
            Novidades de saúde
          </Texto>
        </View>
        {comBotoes && itens.length > 1 ? (
          <View className="flex-row gap-sm">
            <Botao
              titulo="Anterior"
              variante="secundario"
              disabled={atual === 0}
              onPress={() => irPara(atual - 1)}
            />
            <Botao
              titulo="Próxima"
              variante="secundario"
              disabled={atual >= itens.length - 1}
              onPress={() => irPara(atual + 1)}
            />
          </View>
        ) : null}
      </View>

      <ScrollView
        ref={rolagem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={passo}
        decelerationRate="fast"
        onScroll={aoRolar}
        scrollEventThrottle={64}
        contentContainerStyle={{ gap: ESPACO, paddingVertical: 8, paddingHorizontal: 2 }}
        accessibilityRole="list"
      >
        {itens.map((item, indice) => (
          <Noticia key={item.url} item={item} destaque={indice === 0} />
        ))}
      </ScrollView>

      {itens.length > 1 ? (
        <View className="flex-row items-center justify-center gap-sm" aria-hidden>
          {itens.map((item, indice) => (
            <View
              key={item.url}
              className={`h-[8px] rounded-selo ${indice === atual ? 'w-[24px] bg-primaria' : 'w-[8px] bg-borda'}`}
            />
          ))}
        </View>
      ) : null}

      <Texto variante="apoio" className="text-textoSecundario">
        {`Fonte: ${news.data.source.name}, ${news.data.source.publisher}${atualizado ? `. Lido em ${atualizado}` : ''}. ${news.data.notice}`}
      </Texto>
    </View>
  );
}
