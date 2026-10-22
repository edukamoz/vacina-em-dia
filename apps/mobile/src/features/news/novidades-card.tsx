import type { NewsItem } from '@vacina/shared';
import { Linking, Pressable, View } from 'react-native';
import { Cartao } from '../../components/cartao';
import { Icone } from '../../components/icone';
import { Texto } from '../../components/texto';
import { useThemeColors } from '../../theme/theme-provider';
import { useNews } from '../data/hooks';
import { formatCivilDate } from '../doses/format-date';

/** Quantas notícias aparecem no cartão. */
export const LIMITE_NOVIDADES = 5;

/** Uma notícia: título em até 3 linhas, data e, se cita vacinação, a etiqueta "Vacinação". */
function Noticia({ item }: { item: NewsItem }) {
  const cores = useThemeColors();
  const data = formatCivilDate(item.publishedAt);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${item.title}, ${data}. Abre no site do Ministério da Saúde`}
      onPress={() => void Linking.openURL(item.url)}
      className="min-h-toque flex-row items-center gap-md rounded-botao border-fina border-bordaSuave bg-superficie p-md hover:bg-superficieSuave"
    >
      <View className="min-w-0 flex-1 gap-xs">
        <Texto variante="corpoNegrito" numberOfLines={3} importantForAccessibility="no">
          {item.title}
        </Texto>
        <View className="flex-row flex-wrap items-center gap-sm">
          <Texto variante="apoio" className="text-textoSecundario" importantForAccessibility="no">
            {data}
          </Texto>
          {item.vaccineRelated ? (
            <View className="rounded-selo border-padrao border-primaria bg-primariaSuave px-sm py-xs">
              <Texto variante="rotulo" className="text-primaria" importantForAccessibility="no">
                Vacinação
              </Texto>
            </View>
          ) : null}
        </View>
      </View>
      <Icone nome="seta" cor={cores.textoSecundario} />
    </Pressable>
  );
}

/**
 * Cartão "Novidades de saúde" da aba Doses: títulos e links das notícias mais recentes do Ministério
 * da Saúde (feed oficial), com a data e a etiqueta "Vacinação" quando o título cita vacina. O app
 * não resume nem comenta as notícias: tocar abre a página original. Mostra a fonte e o aviso de que
 * não é orientação médica. Some quando não há notícias ou a consulta falha, para não atrapalhar a
 * tela.
 */
export function NovidadesCard() {
  const cores = useThemeColors();
  const news = useNews();
  const itens = news.data?.items.slice(0, LIMITE_NOVIDADES) ?? [];
  if (!news.data || itens.length === 0) return null;
  const atualizado = news.data.updatedAt ? formatCivilDate(news.data.updatedAt.slice(0, 10)) : null;

  return (
    <Cartao className="gap-md">
      <View className="flex-row items-center gap-sm">
        <Icone nome="info" cor={cores.primaria} />
        <Texto variante="titulo3" accessibilityRole="header">
          Novidades de saúde
        </Texto>
      </View>
      <View className="gap-sm">
        {itens.map((item) => (
          <Noticia key={item.url} item={item} />
        ))}
      </View>
      <Texto variante="apoio" className="text-textoSecundario">
        {`Fonte: ${news.data.source.name}, ${news.data.source.publisher}${atualizado ? `. Lido em ${atualizado}` : ''}. ${news.data.notice}`}
      </Texto>
    </Cartao>
  );
}
