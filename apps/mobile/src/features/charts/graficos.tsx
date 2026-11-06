import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useProgresso } from '../../components/animacao';
import { Texto } from '../../components/texto';
import {
  cobertura,
  ESTADOS_DO_GRAFICO,
  ROTULO_DO_ESTADO,
  totalDaContagem,
  type ContagemPorEstado,
  type EstadoDoGrafico,
  type MesDoGrafico,
} from '../../lib/estatisticas';
import { useThemeColors } from '../../theme/theme-provider';
import { useCoresDosEstados } from './cores-dos-estados';
import {
  AmostraDoEstado,
  CamadaDeTextura,
  Padroes,
  usarPadrao,
  usePrefixoDePadroes,
} from './padroes';

export { useCoresDosEstados };

const RAIO = 70;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
/** Vazio, em pontos, entre duas fatias da rosca. */
const FOLGA = 4;

/**
 * Gráfico de rosca com as doses por estado e a cobertura (percentual de aplicadas) no centro.
 * Cada fatia é desenhada em sequência; tocar numa linha da legenda destaca o estado e mostra o
 * número dele no centro. É uma imagem com rótulo de texto (a frase diz os mesmos números).
 *
 * @param props.contagem - Doses por estado.
 */
export function Rosca({ contagem }: { contagem: ContagemPorEstado }) {
  const cores = useThemeColors();
  const prefixo = usePrefixoDePadroes();
  const [foco, setFoco] = useState<EstadoDoGrafico | null>(null);
  const progresso = useProgresso(1, 900);
  const total = totalDaContagem(contagem);
  const resumo = ESTADOS_DO_GRAFICO.map(
    (estado) => `${contagem[estado]} ${ROTULO_DO_ESTADO[estado].toLowerCase()}`,
  ).join(', ');

  let acumulado = 0;
  const fatias = ESTADOS_DO_GRAFICO.filter((estado) => contagem[estado] > 0).map((estado) => {
    const comprimento = (contagem[estado] / total) * CIRCUNFERENCIA;
    const fatia = { estado, inicio: acumulado, comprimento };
    acumulado += comprimento;
    return fatia;
  });

  const centroNumero = foco ? contagem[foco] : cobertura(contagem);
  const centroRotulo = foco ? ROTULO_DO_ESTADO[foco].toLowerCase() : 'aplicadas';

  return (
    <View className="items-center gap-lg medio:flex-row medio:gap-xl">
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Gráfico de rosca. ${total} doses: ${resumo}. Cobertura de ${cobertura(contagem)}%.`}
        className="h-[180px] w-[180px] items-center justify-center"
      >
        <Svg width={180} height={180} viewBox="0 0 180 180" style={{ position: 'absolute' }}>
          <Padroes prefixo={prefixo} />
          <Circle cx={90} cy={90} r={RAIO} fill="none" stroke={cores.bordaSuave} strokeWidth={22} />
          {fatias.map(({ estado, inicio, comprimento }) => {
            const visivel = Math.max(0, comprimento * progresso - (fatias.length > 1 ? FOLGA : 0));
            return (
              <Circle
                key={estado}
                cx={90}
                cy={90}
                r={RAIO}
                fill="none"
                stroke={usarPadrao(prefixo, estado)}
                strokeWidth={foco === estado ? 28 : 22}
                strokeOpacity={foco && foco !== estado ? 0.35 : 1}
                strokeDasharray={`${visivel} ${CIRCUNFERENCIA}`}
                strokeDashoffset={-inicio * progresso}
                transform="rotate(-90 90 90)"
              />
            );
          })}
        </Svg>
        <Texto variante="titulo1" importantForAccessibility="no">
          {foco ? String(centroNumero) : `${centroNumero}%`}
        </Texto>
        <Texto variante="apoio" className="text-textoSecundario" importantForAccessibility="no">
          {centroRotulo}
        </Texto>
      </View>

      <View className="gap-sm self-stretch medio:flex-1">
        {ESTADOS_DO_GRAFICO.map((estado) => {
          const ativo = foco === estado;
          const parte = total === 0 ? 0 : Math.round((contagem[estado] / total) * 100);
          return (
            <Pressable
              key={estado}
              accessibilityRole="button"
              accessibilityLabel={`${ROTULO_DO_ESTADO[estado]}: ${contagem[estado]} doses, ${parte}%`}
              accessibilityState={{ selected: ativo }}
              onPress={() => setFoco(ativo ? null : estado)}
              className={`min-h-toque flex-row items-center gap-md rounded-botao border-padrao px-md py-sm hover:bg-superficieSuave ${
                ativo ? 'border-borda bg-superficieSuave' : 'border-transparent'
              }`}
            >
              <AmostraDoEstado estado={estado} />
              <Texto className="flex-1" importantForAccessibility="no">
                {ROTULO_DO_ESTADO[estado]}
              </Texto>
              <Texto variante="corpoNegrito" importantForAccessibility="no">
                {String(contagem[estado])}
              </Texto>
              <Texto
                variante="apoio"
                className="w-[44px] text-right text-textoSecundario"
                importantForAccessibility="no"
              >
                {`${parte}%`}
              </Texto>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const ALTURA_DAS_BARRAS = 140;

/**
 * Gráfico de barras verticais, uma por mês. Tocar (ou passar o mouse) numa barra mostra o mês e o
 * número por extenso acima do gráfico; as barras crescem ao abrir a tela. Meses sem doses ficam
 * com um traço fino, para o eixo não parecer quebrado.
 *
 * @param props.meses - Série de meses com o total de cada um.
 * @param props.cor - Cor das barras.
 * @param props.unidade - Palavra para o número no texto ("aplicadas", "previstas").
 * @param props.titulo - Descrição curta do gráfico para o leitor de tela.
 */
export function BarrasPorMes({
  meses,
  cor,
  unidade,
  titulo,
}: {
  meses: readonly MesDoGrafico[];
  cor: string;
  unidade: string;
  titulo: string;
}) {
  const cores = useThemeColors();
  // Em tela estreita 12 meses não cabem com rótulo: mostra o nome de um mês sim, outro não.
  const estreita = useWindowDimensions().width < 600 && meses.length > 8;
  const progresso = useProgresso(1, 700);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const maximo = Math.max(1, ...meses.map((mes) => mes.total));
  const total = meses.reduce((soma, mes) => soma + mes.total, 0);
  const mesEscolhido = meses.find((mes) => mes.chave === escolhido);

  return (
    <View className="gap-sm">
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${titulo}. Total de ${total} doses. ${meses
          .filter((mes) => mes.total > 0)
          .map((mes) => `${mes.rotuloCompleto}: ${mes.total}`)
          .join('; ')}`}
        className="flex-row items-end gap-xs"
        style={{ height: ALTURA_DAS_BARRAS + 56 }}
      >
        {meses.map((mes, indice) => {
          const ativo = mes.chave === escolhido;
          const mostraRotulo = !estreita || (meses.length - 1 - indice) % 2 === 0;
          const altura = Math.max(4, (mes.total / maximo) * ALTURA_DAS_BARRAS * progresso);
          return (
            <Pressable
              key={mes.chave}
              accessible={false}
              importantForAccessibility="no"
              onPress={() => setEscolhido(ativo ? null : mes.chave)}
              {...({ onHoverIn: () => setEscolhido(mes.chave) } as object)}
              className="flex-1 items-center justify-end gap-xs"
              style={{ height: ALTURA_DAS_BARRAS + 56 }}
            >
              <Texto variante="rotulo" className={ativo ? 'text-texto' : 'text-textoSecundario'}>
                {mes.total > 0 ? String(mes.total) : ''}
              </Texto>
              <View
                className="w-full rounded-t-[8px]"
                style={{
                  height: altura,
                  backgroundColor: mes.total > 0 ? cor : cores.bordaSuave,
                  opacity: escolhido && !ativo ? 0.45 : 1,
                }}
              />
              <Texto variante="rotulo" className="text-textoSecundario">
                {mostraRotulo ? mes.rotulo : ''}
              </Texto>
            </Pressable>
          );
        })}
      </View>
      <Texto variante="apoio" className="text-textoSecundario" accessibilityLiveRegion="polite">
        {mesEscolhido
          ? `${mesEscolhido.rotuloCompleto}: ${mesEscolhido.total} ${mesEscolhido.total === 1 ? 'dose' : 'doses'} ${unidade}`
          : 'Toque numa barra para ver o mês.'}
      </Texto>
    </View>
  );
}

/**
 * Barras horizontais empilhadas, uma por pessoa: cada faixa mostra a divisão das doses por estado
 * (cores da legenda da rosca). Serve para comparar a família num relance.
 *
 * @param props.linhas - Pessoa e contagem de doses por estado.
 */
export function BarrasPorPessoa({
  linhas,
}: {
  linhas: readonly { readonly nome: string; readonly contagem: ContagemPorEstado }[];
}) {
  const cores = useThemeColors();
  const progresso = useProgresso(1, 800);
  return (
    <View className="gap-md">
      {linhas.map(({ nome, contagem }) => {
        const total = totalDaContagem(contagem);
        const resumo = ESTADOS_DO_GRAFICO.filter((estado) => contagem[estado] > 0)
          .map((estado) => `${contagem[estado]} ${ROTULO_DO_ESTADO[estado].toLowerCase()}`)
          .join(', ');
        return (
          <View
            key={nome}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${nome}: ${total} doses (${resumo || 'nenhuma'}). Cobertura de ${cobertura(contagem)}%.`}
            className="gap-xs"
          >
            <View className="flex-row items-center justify-between gap-md">
              <Texto variante="corpoNegrito" importantForAccessibility="no">
                {nome}
              </Texto>
              <Texto
                variante="apoio"
                className="text-textoSecundario"
                importantForAccessibility="no"
              >
                {`${cobertura(contagem)}% aplicadas`}
              </Texto>
            </View>
            <View
              aria-hidden
              className="h-[22px] flex-row overflow-hidden rounded-selo"
              style={{ backgroundColor: cores.bordaSuave }}
            >
              {ESTADOS_DO_GRAFICO.map((estado) =>
                contagem[estado] > 0 ? (
                  <View
                    key={estado}
                    style={{ flexGrow: contagem[estado] * progresso, flexBasis: 0 }}
                  >
                    <CamadaDeTextura estado={estado} />
                  </View>
                ) : null,
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
