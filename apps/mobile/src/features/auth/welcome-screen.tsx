import type { DoseStatus } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Bolha } from '../../components/bolha';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { Inclinar } from '../../components/inclinar';
import { Icone, type NomeDoIcone } from '../../components/icone';
import { QuadroEstado } from '../../components/quadro-estado';
import { Paralaxe, Revelar, RolagemAnimada } from '../../components/rolagem-animada';
import { SeloEstadoDose } from '../../components/selo-estado-dose';
import { Texto } from '../../components/texto';
import { modoDeLayout } from '../../lib/layout';
import { useThemeColors, useVisual } from '../../theme/theme-provider';
import { Logo, Simbolo } from './logo';

/** Vantagens do app; "Aa" (texto grande) ou um desenho no quadro. */
const VANTAGENS: readonly { titulo: string; texto: string; icone: NomeDoIcone | 'texto' }[] = [
  {
    titulo: 'Fácil de ler',
    texto: 'Texto grande e contraste alto em todas as telas.',
    icone: 'texto',
  },
  {
    titulo: 'Para toda a família',
    texto: 'As doses de cada pessoa em um só lugar.',
    icone: 'familia',
  },
  {
    titulo: 'Com fonte oficial',
    texto: 'Fonte e versão do calendário sempre visíveis.',
    icone: 'info',
  },
];

/** Exemplos do painel da apresentação: dados inventados, só para mostrar como a tela se parece. */
const EXEMPLOS: readonly { vacina: string; dica: string; status: DoseStatus; inclina: string }[] = [
  { vacina: 'Gripe', dica: 'Prevista para 20/09/2026', status: 'OVERDUE', inclina: '-2deg' },
  {
    vacina: 'Covid-19, reforço',
    dica: 'Agendada para 15/10/2026',
    status: 'SCHEDULED',
    inclina: '1.5deg',
  },
  { vacina: 'Febre amarela', dica: 'Aplicada em 12/04/2026', status: 'APPLIED', inclina: '-1deg' },
];

/** Fases da vida da seção "Para cada fase": ícone, rótulo, diâmetro e tom do avatar. */
const FASES = [
  { icone: 'bebe', rotulo: 'Bebês', tamanho: 84, cor: 'avatarC' },
  { icone: 'pessoa', rotulo: 'Crianças', tamanho: 100, cor: 'avatarB' },
  { icone: 'familia', rotulo: 'Adultos e gestantes', tamanho: 116, cor: 'avatarA' },
  { icone: 'bengala', rotulo: 'Pessoas idosas', tamanho: 104, cor: 'avatarD' },
] as const satisfies readonly {
  icone: NomeDoIcone;
  rotulo: string;
  tamanho: number;
  cor: 'avatarA' | 'avatarB' | 'avatarC' | 'avatarD';
}[];

/** Objetos de saúde que ficam atrás do texto no computador (só decoração). */
const FLUTUANTES = [
  { icone: 'doses', lugar: 'left-[44%] top-[2%]', tamanho: 76, fundo: 'superficie' },
  { icone: 'coracao', lugar: 'left-[1%] bottom-[8%]', tamanho: 68, fundo: 'avatarD' },
  { icone: 'frasco', lugar: 'left-[36%] bottom-[10%]', tamanho: 64, fundo: 'agendadaSuave' },
  { icone: 'curativo', lugar: 'right-[1%] top-[0%]', tamanho: 70, fundo: 'avatarB' },
] as const;

/** Largura útil das seções da página: 1184 px com margem, centralizada. */
const SECAO = 'w-full max-w-pagina self-center px-lg expandido:px-xxl';

/** Cartão de exemplo de dose, como o app mostra (dados inventados). */
function ExemploDeDose({
  vacina,
  dica,
  status,
}: {
  vacina: string;
  dica: string;
  status: DoseStatus;
}) {
  const { sombra } = useVisual();
  return (
    <Cartao className="flex-row items-center gap-lg" style={sombra(2)}>
      <QuadroEstado status={status} />
      <View className="flex-1 gap-xs">
        <Texto variante="titulo3">{vacina}</Texto>
        <Texto variante="apoio" className="text-textoSecundario">
          {dica}
        </Texto>
        <SeloEstadoDose status={status} />
      </View>
    </Cartao>
  );
}

/**
 * Tela de apresentação (primeiro contato), no desenho da versão 2: cabeçalho com "Entrar", a
 * promessa com formas e objetos de fundo e a pilha de cartões de exemplo, "Para cada fase da
 * vida", as vantagens, um cartão para criar a conta e o aviso de que o app não substitui a
 * caderneta. No computador, a promessa e os exemplos ficam lado a lado. Os efeitos de fundo somem
 * no Alto contraste.
 */
export function WelcomeScreen() {
  const router = useRouter();
  const cores = useThemeColors();
  const { altoContraste } = useVisual();
  const expandido = modoDeLayout(useWindowDimensions().width) === 'expandido';

  return (
    <SafeAreaView className="flex-1 bg-fundo">
      <RolagemAnimada>
        <View className={`${SECAO} min-h-[72px] flex-row items-center justify-between gap-lg`}>
          <Logo />
          <Botao titulo="Entrar" variante="secundario" onPress={() => router.push('/entrar')} />
        </View>

        <View className="relative overflow-hidden">
          {altoContraste ? null : (
            <>
              <Bolha
                cor={cores.decorMenta}
                tamanho={420}
                opacidade={0.55}
                className="absolute -right-[60px] -top-[40px]"
              />
              <Bolha
                cor={cores.decorSol}
                tamanho={180}
                opacidade={0.35}
                className="absolute bottom-[10px] right-[38%]"
              />
              <Bolha
                cor={cores.primariaSuave}
                tamanho={120}
                className="absolute -left-[30px] top-[30px]"
              />
              <Svg
                viewBox="0 0 1200 150"
                preserveAspectRatio="none"
                aria-hidden
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 8,
                  width: '100%',
                  height: 150,
                }}
              >
                <Path
                  d="M0 90H330l22-12 20 12h60l18-70 26 122 20-52h70l20-14 22 14h150l18-58 24 100 18-42h382"
                  fill="none"
                  stroke={cores.primaria}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.28}
                />
              </Svg>
            </>
          )}

          <View
            className={`${SECAO} relative pb-[64px] pt-[32px] expandido:pb-[96px] expandido:pt-[56px]`}
          >
            {expandido && !altoContraste
              ? FLUTUANTES.map(({ icone, lugar, tamanho, fundo }, indice) => (
                  <Paralaxe
                    key={icone}
                    aria-hidden
                    fator={0.1 + indice * 0.04}
                    maximo={12 + indice * 5}
                    className={`absolute items-center justify-center rounded-[28px] border-fina border-bordaSuave ${lugar}`}
                    style={{ width: tamanho, height: tamanho, backgroundColor: cores[fundo] }}
                  >
                    <Icone
                      nome={icone}
                      cor={
                        fundo === 'avatarD' || fundo === 'avatarB'
                          ? cores.sobreAvatar
                          : cores.primaria
                      }
                      tamanho={38}
                    />
                  </Paralaxe>
                ))
              : null}
            <View className="gap-xxl expandido:flex-row expandido:items-center expandido:gap-[48px]">
              <View className="gap-xl expandido:flex-1">
                <Texto variante={expandido ? 'exibicao' : 'titulo1'} accessibilityRole="header">
                  {'As vacinas da sua família, '}
                  <Texto variante={expandido ? 'exibicao' : 'titulo1'} className="text-primaria">
                    em dia
                  </Texto>
                </Texto>
                <Texto variante={expandido ? 'destaque' : 'corpo'} className="text-textoSecundario">
                  Veja o que está pendente, agendado ou atrasado. Tudo em letras grandes e fáceis de
                  ler.
                </Texto>
                <View className="expandido:items-start">
                  <Botao titulo="Criar conta" onPress={() => router.push('/criar-conta')} />
                </View>
              </View>

              <View
                accessibilityLabel="Exemplo de como as doses aparecem"
                className="gap-md expandido:w-[480px]"
              >
                <Inclinar>
                  {EXEMPLOS.map(({ vacina, dica, status, inclina }, indice) => (
                    <View
                      key={vacina}
                      style={
                        expandido
                          ? {
                              transform: [{ rotate: inclina }],
                              marginLeft: indice === 1 ? 40 : indice === 2 ? 14 : 0,
                            }
                          : undefined
                      }
                    >
                      <ExemploDeDose vacina={vacina} dica={dica} status={status} />
                    </View>
                  ))}
                </Inclinar>
                <Texto variante="apoio" className="text-textoSecundario">
                  Exemplo com dados inventados.
                </Texto>
              </View>
            </View>
          </View>
        </View>

        <Revelar>
          <View className={`${SECAO} gap-xl py-xxl`}>
            <View className="max-w-[640px] gap-sm">
              <Texto variante="titulo2" accessibilityRole="header">
                Para cada fase da vida
              </Texto>
              <Texto className="text-textoSecundario">
                O calendário oficial muda com a idade. O aplicativo mostra o que vale para cada
                pessoa da família.
              </Texto>
            </View>
            <View className="flex-row flex-wrap items-end justify-around gap-xl pt-lg">
              {FASES.map(({ icone, rotulo, tamanho, cor }) => (
                <View key={rotulo} className="w-[140px] items-center gap-md">
                  <View
                    aria-hidden
                    className="items-center justify-center rounded-selo"
                    style={{ width: tamanho, height: tamanho, backgroundColor: cores[cor] }}
                  >
                    <Icone
                      nome={icone}
                      cor={cores.sobreAvatar}
                      tamanho={Math.round(tamanho * 0.46)}
                    />
                  </View>
                  <Texto variante="corpoNegrito" className="text-center">
                    {rotulo}
                  </Texto>
                </View>
              ))}
            </View>
          </View>
        </Revelar>

        <Revelar>
          <View className={`${SECAO} gap-xl pb-xxl`}>
            <Texto variante="titulo2" accessibilityRole="header">
              Feito para ser simples
            </Texto>
            <View className="gap-lg expandido:flex-row expandido:gap-xl">
              {VANTAGENS.map(({ titulo, texto, icone }) => (
                <Cartao key={titulo} className="gap-md expandido:flex-1 expandido:p-xl">
                  <View
                    aria-hidden
                    className="h-[64px] w-[64px] items-center justify-center rounded-[22px] border-padrao border-primaria bg-primariaSuave"
                  >
                    {icone === 'texto' ? (
                      <Texto variante="titulo2" className="text-primaria">
                        Aa
                      </Texto>
                    ) : (
                      <Icone nome={icone} cor={cores.primaria} tamanho={32} />
                    )}
                  </View>
                  <Texto variante="titulo3" accessibilityRole="header">
                    {titulo}
                  </Texto>
                  <Texto className="text-textoSecundario">{texto}</Texto>
                </Cartao>
              ))}
            </View>
          </View>
        </Revelar>

        <Revelar>
          <View className={`${SECAO} pb-xl`}>
            <Cartao className="gap-xl overflow-hidden p-xl expandido:flex-row expandido:items-center expandido:justify-between expandido:p-[40px]">
              <View className="flex-row items-center gap-lg expandido:flex-1">
                <Simbolo tamanho={72} />
                <Texto variante="titulo2" accessibilityRole="header" className="flex-1">
                  Comece a acompanhar as doses da família.
                </Texto>
              </View>
              <View>
                <Botao
                  titulo="Criar conta"
                  variante="secundario"
                  onPress={() => router.push('/criar-conta')}
                />
              </View>
            </Cartao>
          </View>
        </Revelar>

        <View className={`${SECAO} pb-xxl pt-lg`}>
          <Texto variante="apoio" className="text-textoSecundario">
            O Vacina em Dia não substitui a caderneta oficial de vacinação nem a orientação de
            profissionais de saúde.
          </Texto>
        </View>
      </RolagemAnimada>
    </SafeAreaView>
  );
}
