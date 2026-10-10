import type { DoseStatus } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { Image, useWindowDimensions, View, type ImageStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Bolha } from '../../components/bolha';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { Inclinar } from '../../components/inclinar';
import { Icone, type NomeDoIcone } from '../../components/icone';
import { AtalhoDeMovimento } from '../../components/seletor-de-movimento';
import { QuadroEstado } from '../../components/quadro-estado';
import { Paralaxe, Revelar, RolagemAnimada } from '../../components/rolagem-animada';
import { SeloEstadoDose } from '../../components/selo-estado-dose';
import { Texto } from '../../components/texto';
import { modoDeLayout } from '../../lib/layout';
import { useThemeColors, useVisual } from '../../theme/theme-provider';
import { CenaDoHero } from './cena-do-hero';
import { FOTOS, type Foto } from './fotos';
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

/** Fases da vida da seção "Para cada fase": foto (pessoa fictícia), rótulo e diâmetro do círculo. */
const FASES: readonly { foto: Foto; rotulo: string; tamanho: number }[] = [
  { foto: FOTOS.bebe, rotulo: 'Bebês', tamanho: 112 },
  { foto: FOTOS.crianca, rotulo: 'Crianças', tamanho: 128 },
  { foto: FOTOS.gestante, rotulo: 'Adultos e gestantes', tamanho: 144 },
  { foto: FOTOS.jose, rotulo: 'Pessoas idosas', tamanho: 132 },
];

/** Para quem o app é feito: as três personas do projeto (pessoas fictícias). */
const PERSONAS: readonly { foto: Foto; nome: string; papel: string; texto: string }[] = [
  {
    foto: FOTOS.mariana,
    nome: 'Mariana, 32 anos',
    papel: 'Mãe de primeira viagem',
    texto: 'Quer saber quais doses do bebê estão chegando, sem procurar a caderneta de papel.',
  },
  {
    foto: FOTOS.jose,
    nome: 'Sr. José, 68 anos',
    papel: 'Prefere falar a digitar',
    texto:
      'Pergunta ao assistente de voz e lê tudo em letras grandes, com o contraste que precisar.',
  },
  {
    foto: FOTOS.carla,
    nome: 'Carla, 45 anos',
    papel: 'Cuida de vários familiares',
    texto: 'Vê as doses de todas as pessoas da família em um só lugar e não esquece nenhuma.',
  },
];

/** Objetos de saúde que ficam atrás do texto no computador (só decoração). */
const FLUTUANTES = [
  { icone: 'doses', lugar: 'left-[44%] top-[2%]', tamanho: 76, fundo: 'superficie' },
  { icone: 'coracao', lugar: 'left-[1%] bottom-[8%]', tamanho: 68, fundo: 'avatarD' },
  { icone: 'frasco', lugar: 'left-[36%] bottom-[10%]', tamanho: 64, fundo: 'agendadaSuave' },
  { icone: 'curativo', lugar: 'right-[1%] top-[0%]', tamanho: 70, fundo: 'avatarB' },
] as const;

/** Largura útil das seções da página: 1184 px com margem, centralizada. */
const SECAO = 'w-full max-w-pagina self-center px-lg expandido:px-xxl';

/** Foto recortada em círculo (ou em cartão), com o rosto no centro do recorte. */
function FotoRecortada({
  foto,
  largura,
  altura,
  raio,
}: {
  foto: Foto;
  largura: number | `${number}%`;
  altura: number;
  raio: number;
}) {
  // `objectPosition` existe só na web (RN Web); no celular o recorte é centralizado.
  const estilo = {
    width: largura,
    height: altura,
    borderRadius: raio,
    objectPosition: `center ${foto.rosto}`,
  } as ImageStyle;
  return (
    <Image
      source={foto.fonte}
      accessibilityLabel={foto.alt}
      accessibilityIgnoresInvertColors
      resizeMode="cover"
      style={estilo}
    />
  );
}

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
                accessibilityLabel="Exemplo de como o aplicativo aparece"
                className="gap-md expandido:w-[520px]"
              >
                <CenaDoHero
                  cartoes={EXEMPLOS.slice(0, 2).map(({ vacina, dica, status }) => (
                    <ExemploDeDose key={vacina} vacina={vacina} dica={dica} status={status} />
                  ))}
                />
                <Texto variante="apoio" className="text-textoSecundario">
                  Exemplo com dados inventados. As pessoas das fotos são fictícias.
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
              {FASES.map(({ foto, rotulo, tamanho }) => (
                <View key={rotulo} className="w-[160px] items-center gap-md">
                  <Inclinar graus={14}>
                    <View
                      style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2 }}
                      className="overflow-hidden border-[4px] border-superficie"
                    >
                      <FotoRecortada
                        foto={foto}
                        largura="100%"
                        altura={tamanho}
                        raio={tamanho / 2}
                      />
                    </View>
                  </Inclinar>
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
            <View className="max-w-[640px] gap-sm">
              <Texto variante="titulo2" accessibilityRole="header">
                Feito para quem cuida de gente
              </Texto>
              <Texto className="text-textoSecundario">
                Três jeitos de usar o mesmo aplicativo. As pessoas são fictícias e as fotos foram
                geradas por inteligência artificial.
              </Texto>
            </View>
            <View className="gap-lg expandido:flex-row expandido:gap-xl">
              {PERSONAS.map(({ foto, nome, papel, texto }) => (
                <View key={nome} className="expandido:flex-1">
                  <Inclinar graus={6}>
                    <Cartao className="gap-md overflow-hidden p-0">
                      <FotoRecortada foto={foto} largura="100%" altura={260} raio={0} />
                      <View className="gap-xs p-lg">
                        <Texto variante="titulo3" accessibilityRole="header">
                          {nome}
                        </Texto>
                        <Texto variante="rotulo" className="text-primaria">
                          {papel}
                        </Texto>
                        <Texto className="text-textoSecundario">{texto}</Texto>
                      </View>
                    </Cartao>
                  </Inclinar>
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

        <View className={`${SECAO} gap-md pb-xxl pt-lg`}>
          <Texto variante="apoio" className="text-textoSecundario">
            O Vacina em Dia não substitui a caderneta oficial de vacinação nem a orientação de
            profissionais de saúde.
          </Texto>
          <View className="max-w-[360px]">
            <AtalhoDeMovimento />
          </View>
        </View>
      </RolagemAnimada>
    </SafeAreaView>
  );
}
