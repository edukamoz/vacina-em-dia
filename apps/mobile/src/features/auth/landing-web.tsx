import { useRouter } from 'expo-router';
import { Image, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bolha } from '../../components/bolha';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { Icone, type NomeDoIcone } from '../../components/icone';
import { Inclinar } from '../../components/inclinar';
import { LinkTexto } from '../../components/link-texto';
import { Paralaxe, Revelar, RolagemAnimada } from '../../components/rolagem-animada';
import { AtalhoDeMovimento } from '../../components/seletor-de-movimento';
import { Texto } from '../../components/texto';
import { modoDeLayout } from '../../lib/layout';
import { ID_DO_CONTEUDO } from '../../lib/pular-conteudo';
import { useMovimentoReduzido, useThemeColors, useVisual } from '../../theme/theme-provider';
import { FOTOS, type Foto } from './fotos';
import { Logo, Simbolo } from './logo';

/** Os três passos de "Como funciona". */
const PASSOS: readonly { titulo: string; texto: string }[] = [
  {
    titulo: 'Cadastre a família',
    texto:
      'Nome ou apelido e data de nascimento. Só isso. Pode incluir até os animais de estimação.',
  },
  {
    titulo: 'Veja o calendário de cada um',
    texto:
      'O app mostra as vacinas do Calendário Nacional de Vacinação indicadas para a idade de cada pessoa.',
  },
  {
    titulo: 'Registre e receba avisos',
    texto: 'Marque as doses aplicadas e receba lembretes antes de cada data.',
  },
];

/** O que o app faz por você: quatro recursos, cada um com um ícone no quadro. */
const RECURSOS: readonly { titulo: string; texto: string; icone: NomeDoIcone }[] = [
  {
    titulo: 'Lembretes',
    texto: 'Avisos antes de cada dose, no dia que você escolher.',
    icone: 'lembrete',
  },
  {
    titulo: 'Assistente por voz',
    texto: 'Pergunte falando ou escrevendo. Respostas com fonte oficial.',
    icone: 'voz',
  },
  {
    titulo: 'Vários responsáveis',
    texto: 'Convide quem cuida junto, com um código.',
    icone: 'familia',
  },
  {
    titulo: 'Postos de saúde',
    texto: 'Encontre a unidade mais perto e trace a rota.',
    icone: 'local',
  },
];

/** Para quem o app é feito: as três personas do projeto (pessoas fictícias). */
const PERSONAS: readonly {
  foto: Foto;
  nome: string;
  papel: string;
  texto: string;
  cor: 'primariaSuave' | 'agendadaSuave' | 'avatarD';
}[] = [
  {
    foto: FOTOS.mariana,
    cor: 'primariaSuave',
    nome: 'Mariana, 32 anos',
    papel: 'Mãe de primeira viagem',
    texto: 'Quer saber quais doses do bebê estão chegando, sem procurar a caderneta de papel.',
  },
  {
    foto: FOTOS.jose,
    cor: 'agendadaSuave',
    nome: 'Sr. José, 68 anos',
    papel: 'Prefere falar a digitar',
    texto:
      'Pergunta ao assistente de voz e lê tudo em letras grandes, com o contraste que precisar.',
  },
  {
    foto: FOTOS.carla,
    cor: 'avatarD',
    nome: 'Carla, 45 anos',
    papel: 'Cuida de vários familiares',
    texto: 'Vê as doses de todas as pessoas da família em um só lugar e não esquece nenhuma.',
  },
];

/** Identificadores das seções que o menu do alto leva a rolar até elas. */
const ANCORA = { comoFunciona: 'como-funciona', paraQuem: 'para-quem-e' } as const;

/**
 * Rola a página até uma seção (só no site). Sem "movimento" quando a pessoa pediu para reduzir.
 * Fora do navegador (testes) não faz nada.
 */
function irPara(id: string, reduzido: boolean) {
  if (typeof document === 'undefined') return;
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'start' });
}

/** Largura útil das seções da página: 1184 px com margem, centralizada. */
const SECAO = 'w-full max-w-pagina self-center px-lg expandido:px-xxl';

/** Proporção dos recortes das pessoas: 640 x 856. */
const ALTURA_POR_LARGURA = 856 / 640;

/**
 * Pessoa recortada do fundo, de busto, sobre um quadro colorido (círculo ou cartão): a cabeça fica
 * no alto e o corpo é cortado pela borda do quadro.
 *
 * @param props.largura - Largura da pessoa, em pixels.
 * @param props.topo - Distância da pessoa até o alto do quadro, em pixels.
 * @param props.esquerda - Distância da pessoa até a esquerda do quadro, em pixels.
 */
function PessoaNoQuadro({
  foto,
  largura,
  topo,
  esquerda,
}: {
  foto: Foto;
  largura: number;
  topo: number;
  esquerda: number;
}) {
  return (
    <Image
      source={foto.fonte}
      accessibilityLabel={foto.alt}
      accessibilityIgnoresInvertColors
      resizeMode="stretch"
      style={{
        position: 'absolute',
        width: largura,
        height: largura * ALTURA_POR_LARGURA,
        top: topo,
        left: esquerda,
      }}
    />
  );
}

/** Cartão de uma persona: foto recortada sobre um quadro colorido, nome, papel e a necessidade. */
function CartaoDePersona({ persona, cor }: { persona: (typeof PERSONAS)[number]; cor: string }) {
  const { foto, nome, papel, texto } = persona;
  return (
    <Cartao className="gap-md overflow-hidden">
      <View
        style={{ backgroundColor: cor }}
        className="-mx-lg -mt-lg h-[300px] items-center overflow-hidden"
      >
        <PessoaNoQuadro foto={foto} largura={290} topo={16} esquerda={40} />
      </View>
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
  );
}

/** Uma linha de dose dentro do celular de exemplo: quadro com ícone, nome e situação. */
function LinhaDoCelular({
  fundo,
  cor,
  icone,
  nome,
  situacao,
}: {
  fundo: string;
  cor: string;
  icone: NomeDoIcone;
  nome: string;
  situacao: string;
}) {
  return (
    <View className="flex-row items-center gap-md rounded-cartao border-fina border-bordaSuave bg-superficie p-md">
      <View
        style={{ backgroundColor: fundo }}
        className="h-[44px] w-[44px] items-center justify-center rounded-[14px]"
      >
        <Icone nome={icone} cor={cor} tamanho={24} />
      </View>
      <View className="flex-1">
        <Texto variante="corpoNegrito">{nome}</Texto>
        <Texto variante="apoio" className="text-textoSecundario">
          {situacao}
        </Texto>
      </View>
    </View>
  );
}

/**
 * Celular de exemplo da promessa: o calendário de uma criança fictícia com uma dose atrasada, uma
 * agendada e uma aplicada. É só ilustração (escondido do leitor de tela; a nota abaixo diz que os
 * dados são inventados). No computador fica inclinado e flutua devagar.
 *
 * @param props.inclinado - Gira 3 graus, como no design (só no computador).
 */
function CelularDeExemplo({ inclinado }: { inclinado: boolean }) {
  const cores = useThemeColors();
  const { gradienteMarca, sombra } = useVisual();
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        sombra(3),
        {
          borderColor: cores.texto,
          transform: inclinado ? [{ rotate: '3deg' }] : [],
        },
      ]}
      className="h-[440px] w-[290px] gap-sm self-center overflow-hidden rounded-[44px] border-[10px] bg-fundo p-md expandido:h-[540px] expandido:w-[310px]"
    >
      <View style={gradienteMarca} className="rounded-[22px] bg-primaria p-md">
        <Texto variante="apoio" className="text-sobrePrimaria">
          Calendário de Helena, 3 anos
        </Texto>
        <Texto variante="titulo3" className="text-sobrePrimaria">
          1 dose para resolver
        </Texto>
      </View>
      <LinhaDoCelular
        fundo={cores.atrasadaSuave}
        cor={cores.atrasada}
        icone="atrasada"
        nome="BCG, dose única"
        situacao="Era para 01/08/2026"
      />
      <LinhaDoCelular
        fundo={cores.agendadaSuave}
        cor={cores.agendada}
        icone="agendada"
        nome="Covid-19, reforço"
        situacao="Agendada para 25/11/2026"
      />
      <LinhaDoCelular
        fundo={cores.aplicadaSuave}
        cor={cores.aplicada}
        icone="aplicada"
        nome="Rotavírus, 1ª dose"
        situacao="Aplicada"
      />
    </View>
  );
}

/** Aviso que flutua ao lado do celular de exemplo (só decoração). */
function AvisoFlutuante({
  icone,
  cor,
  texto,
  lugar,
  fator,
}: {
  icone: NomeDoIcone;
  cor: string;
  texto: string;
  lugar: string;
  fator: number;
}) {
  const { sombra } = useVisual();
  return (
    <Paralaxe
      aria-hidden
      fator={fator}
      maximo={16}
      style={sombra(2)}
      className={`absolute flex-row items-center gap-sm rounded-cartao bg-superficie px-md py-md ${lugar}`}
    >
      <Icone nome={icone} cor={cor} tamanho={24} />
      <Texto variante="corpoNegrito" style={{ color: cor }}>
        {texto}
      </Texto>
    </Paralaxe>
  );
}

/**
 * Página de apresentação do site (primeiro contato de quem abre o endereço no navegador), no
 * desenho do design v3 (ADR-036): menu no alto, a promessa com dois botões e um celular de exemplo
 * com avisos flutuantes, "Como funciona" em três passos, "Para quem é" com as três personas, os
 * quatro recursos, uma faixa final para criar a conta e o rodapé com a fonte do calendário e o
 * aviso de que o app não substitui a caderneta. Os efeitos de fundo e as animações somem no Alto
 * contraste e com "Reduzir movimento".
 *
 * - Computador (`compacta` falso): menu com as seções, promessa e celular lado a lado, personas
 *   em três colunas.
 * - Celular e janela estreita (`compacta`): só "Entrar" no alto, personas num carrossel que se
 *   arrasta com o dedo, um cartão ensinando a instalar o app e um botão "Criar conta" no pé da
 *   tela (fora da rolagem, então não cobre o conteúdo nem anda com a barra do navegador).
 *
 * @param props.compacta - Janela abaixo de 1024 px.
 */
export function LandingWeb({ compacta }: { compacta: boolean }) {
  const router = useRouter();
  const cores = useThemeColors();
  const { altoContraste, gradienteMarca, sombra } = useVisual();
  const reduzido = useMovimentoReduzido();
  const expandido = modoDeLayout(useWindowDimensions().width) === 'expandido';

  return (
    <SafeAreaView className="flex-1 bg-fundo">
      <RolagemAnimada>
        <View className={`${SECAO} min-h-[72px] flex-row items-center justify-between gap-lg`}>
          <Logo />
          <View className="flex-row items-center gap-lg">
            {compacta ? null : (
              <>
                <LinkTexto
                  titulo="Como funciona"
                  onPress={() => irPara(ANCORA.comoFunciona, reduzido)}
                />
                <LinkTexto titulo="Para quem é" onPress={() => irPara(ANCORA.paraQuem, reduzido)} />
                <LinkTexto titulo="Privacidade" onPress={() => router.push('/privacidade')} />
              </>
            )}
            <Botao
              titulo="Entrar"
              variante="secundario"
              tamanho="compacto"
              onPress={() => router.push('/entrar')}
            />
            {compacta ? null : (
              <Botao
                titulo="Criar conta"
                tamanho="compacto"
                onPress={() => router.push('/criar-conta')}
              />
            )}
          </View>
        </View>

        <View nativeID={ID_DO_CONTEUDO} tabIndex={-1} className="relative overflow-hidden">
          {altoContraste ? null : (
            <>
              <Bolha
                cor={cores.decorMenta}
                tamanho={520}
                opacidade={0.6}
                className="absolute -right-[120px] -top-[60px]"
              />
            </>
          )}

          <View
            className={`${SECAO} relative gap-xxl pb-[64px] pt-[32px] expandido:flex-row expandido:items-center expandido:gap-[40px] expandido:pb-[80px] expandido:pt-[36px]`}
          >
            <View className="gap-xl expandido:flex-[6]">
              <Texto variante={expandido ? 'exibicao' : 'titulo1'} accessibilityRole="header">
                {'As vacinas da sua família, '}
                <Texto variante={expandido ? 'exibicao' : 'titulo1'} className="text-primaria">
                  em dia
                </Texto>
              </Texto>
              <Texto variante={expandido ? 'destaque' : 'corpo'} className="text-textoSecundario">
                Veja o que está pendente, agendado ou atrasado para cada pessoa da casa. Receba
                lembretes e tire dúvidas por voz. Tudo em letras grandes e fáceis de ler.
              </Texto>
              <View className="flex-row flex-wrap gap-md">
                <Botao titulo="Criar conta grátis" onPress={() => router.push('/criar-conta')} />
                <Botao
                  titulo="Já tenho conta"
                  variante="secundario"
                  onPress={() => router.push('/entrar')}
                />
              </View>
              <View className="flex-row items-center gap-sm">
                <Icone nome="info" cor={cores.primaria} tamanho={20} />
                <Texto variante="apoio" className="flex-1 text-textoSecundario">
                  Sem CPF. Você pode excluir a conta quando quiser.
                </Texto>
              </View>
            </View>

            <View className="relative gap-md expandido:flex-[5]">
              <CelularDeExemplo inclinado={expandido && !altoContraste} />
              {expandido && !altoContraste ? (
                <>
                  <AvisoFlutuante
                    icone="lembrete"
                    cor={cores.agendada}
                    texto="Lembrete: Covid-19, em 7 dias"
                    lugar="-left-[24px] top-[300px]"
                    fator={0.12}
                  />
                  <AvisoFlutuante
                    icone="voz"
                    cor={cores.primaria}
                    texto="Perguntar por voz"
                    lugar="-right-[10px] bottom-[90px]"
                    fator={0.18}
                  />
                </>
              ) : null}
              <Texto variante="apoio" className="text-center text-textoSecundario">
                Exemplo com dados inventados. As pessoas das fotos são fictícias.
              </Texto>
            </View>
          </View>
        </View>

        {compacta ? (
          <View className={`${SECAO} pb-lg`}>
            <Cartao className="gap-sm border-primaria bg-primariaSuave">
              <Texto variante="titulo3" accessibilityRole="header">
                Leve no celular
              </Texto>
              <Texto>
                No Chrome, toque nos três pontos e depois em &quot;Instalar app&quot;. No iPhone,
                toque em Compartilhar e depois em &quot;Adicionar à Tela de Início&quot;. O ícone
                abre o Vacina em Dia como um aplicativo.
              </Texto>
            </Cartao>
          </View>
        ) : null}

        <Revelar>
          <View nativeID={ANCORA.comoFunciona} className={`${SECAO} gap-xl py-xxl`}>
            <View className="max-w-[640px] gap-sm">
              <Texto variante="titulo2" accessibilityRole="header">
                Como funciona
              </Texto>
              <Texto className="text-textoSecundario">
                Em três passos, a carteira de vacinação da família fica no celular.
              </Texto>
            </View>
            <View className="gap-lg expandido:flex-row expandido:gap-xl">
              {PASSOS.map(({ titulo, texto }, indice) => (
                <Cartao key={titulo} className="gap-sm expandido:flex-1 expandido:p-xl">
                  <View
                    aria-hidden
                    style={gradienteMarca}
                    className="h-[52px] w-[52px] items-center justify-center rounded-selo bg-primaria"
                  >
                    <Texto variante="titulo3" className="text-sobrePrimaria">
                      {String(indice + 1)}
                    </Texto>
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
          <View nativeID={ANCORA.paraQuem} className={`${SECAO} gap-xl pb-xxl`}>
            <View className="max-w-[640px] gap-sm">
              <Texto variante="titulo2" accessibilityRole="header">
                Feito para quem cuida de gente
              </Texto>
              <Texto className="text-textoSecundario">
                Três jeitos de usar o mesmo aplicativo. As pessoas são fictícias e as fotos foram
                geradas por inteligência artificial.
              </Texto>
            </View>
            {compacta ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={312}
                decelerationRate="fast"
                contentContainerClassName="gap-md pr-lg"
              >
                {PERSONAS.map((persona) => (
                  <View key={persona.nome} className="w-[300px]">
                    <CartaoDePersona persona={persona} cor={cores[persona.cor]} />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View className="gap-lg expandido:flex-row expandido:gap-xl">
                {PERSONAS.map((persona) => (
                  <View key={persona.nome} className="expandido:flex-1">
                    <Inclinar graus={6}>
                      <CartaoDePersona persona={persona} cor={cores[persona.cor]} />
                    </Inclinar>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Revelar>

        <Revelar>
          <View className={`${SECAO} gap-xl pb-xxl`}>
            <Texto variante="titulo2" accessibilityRole="header">
              O que o app faz por você
            </Texto>
            <View className="gap-lg expandido:flex-row expandido:gap-lg">
              {RECURSOS.map(({ titulo, texto, icone }) => (
                <Cartao key={titulo} className="gap-md expandido:flex-1">
                  <View
                    aria-hidden
                    className="h-[56px] w-[56px] items-center justify-center rounded-[18px] bg-primariaSuave"
                  >
                    <Icone nome={icone} cor={cores.primaria} tamanho={28} />
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
            <View
              style={[gradienteMarca, sombra(2)]}
              className="gap-xl overflow-hidden rounded-folha bg-primaria p-xl expandido:flex-row expandido:items-center expandido:justify-between expandido:p-[56px]"
            >
              <View className="flex-row items-center gap-lg expandido:flex-1">
                <Simbolo tamanho={72} invertido />
                <Texto
                  variante="titulo2"
                  accessibilityRole="header"
                  className="flex-1 text-sobrePrimaria"
                >
                  Comece agora. Leva menos de um minuto.
                </Texto>
              </View>
              <View>
                <Botao
                  titulo="Criar conta grátis"
                  variante="secundario"
                  onPress={() => router.push('/criar-conta')}
                />
              </View>
            </View>
          </View>
        </Revelar>

        <View
          className={`${SECAO} gap-md border-t-fina border-bordaSuave pb-xxl pt-xl expandido:flex-row expandido:gap-xxl`}
        >
          <View className="gap-sm expandido:flex-[2]">
            <Texto variante="corpoNegrito">Vacina em Dia</Texto>
            <Texto variante="apoio" className="text-textoSecundario">
              Projeto acadêmico da Fatec Votorantim (Desenvolvimento de Software Multiplataforma).
              Alinhado aos Objetivos de Desenvolvimento Sustentável 3, Saúde e Bem-Estar, e 10,
              Redução das Desigualdades.
            </Texto>
          </View>
          <View className="gap-sm expandido:flex-1">
            <Texto variante="apoio" className="text-textoSecundario">
              Fonte do calendário: Calendário Nacional de Vacinação, Ministério da Saúde. O Vacina
              em Dia não substitui a caderneta oficial de vacinação nem a orientação de
              profissionais de saúde.
            </Texto>
            <View className="max-w-[360px]">
              <AtalhoDeMovimento />
            </View>
          </View>
        </View>
      </RolagemAnimada>
      {compacta ? (
        <View className="border-t-fina border-bordaSuave bg-superficie px-lg py-md">
          <Botao titulo="Criar conta" onPress={() => router.push('/criar-conta')} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
