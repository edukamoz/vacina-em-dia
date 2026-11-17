import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Image, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { CURVA, DURACAO, USA_DRIVER_NATIVO, VistaAnimada } from '../../components/animacao';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { Icone } from '../../components/icone';
import { usePosicaoDaRolagem } from '../../components/rolagem-animada';
import { Texto } from '../../components/texto';
import { useMovimentoReduzido, useThemeColors, useVisual } from '../../theme/theme-provider';
import { FOTOS, type Foto } from './fotos';
import { Ondas } from './ondas';

/** Os três capítulos: uma pessoa (fictícia) por fase da vida, com a interface que ela mais usa. */
const CAPITULOS: readonly {
  foto: Foto;
  cor: 'primariaSuave' | 'avatarD' | 'agendadaSuave';
  nome: string;
  papel: string;
  titulo: string;
  texto: string;
  cartao: 'calendario' | 'familia' | 'voz';
}[] = [
  {
    foto: FOTOS.mariana,
    cor: 'primariaSuave',
    nome: 'Mariana, 32 anos',
    papel: 'Mãe de primeira viagem',
    titulo: 'Quais doses do bebê estão chegando?',
    texto:
      'Sem procurar a caderneta de papel. O app mostra o que está atrasado, o que está agendado e o que já foi aplicado.',
    cartao: 'calendario',
  },
  {
    foto: FOTOS.carla,
    cor: 'avatarD',
    nome: 'Carla, 45 anos',
    papel: 'Cuida de vários familiares',
    titulo: 'Todo mundo no mesmo lugar',
    texto:
      'Troca de pessoa em um toque e divide o cuidado com outros responsáveis, usando um código de convite.',
    cartao: 'familia',
  },
  {
    foto: FOTOS.jose,
    cor: 'agendadaSuave',
    nome: 'Sr. José, 68 anos',
    papel: 'Prefere falar a digitar',
    titulo: 'Pergunte em voz alta',
    texto:
      'Letras grandes, contraste que ele escolhe e um botão de microfone sempre à vista. A resposta vem com a fonte oficial.',
    cartao: 'voz',
  },
];

/** Proporção do recorte das pessoas: 640 x 856. */
const PROPORCAO = 640 / 856;

/** Entra e sai de cena por opacidade e deslocamento; sai da frente do toque quando escondido. */
function Revezar({
  visivel,
  children,
  className = '',
}: {
  visivel: boolean;
  children: ReactNode;
  className?: string;
}) {
  const reduzido = useMovimentoReduzido();
  const valor = useRef(new Animated.Value(visivel ? 1 : 0)).current;
  useEffect(() => {
    if (reduzido) {
      valor.setValue(visivel ? 1 : 0);
      return undefined;
    }
    const animacao = Animated.timing(valor, {
      toValue: visivel ? 1 : 0,
      duration: DURACAO.suave - 100,
      easing: CURVA.saida,
      useNativeDriver: USA_DRIVER_NATIVO,
    });
    animacao.start();
    return () => animacao.stop();
  }, [visivel, reduzido, valor]);
  return (
    <VistaAnimada
      pointerEvents={visivel ? 'auto' : 'none'}
      aria-hidden={!visivel}
      className={className}
      style={{
        opacity: valor,
        transform: [
          { translateY: valor.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
        ],
      }}
    >
      {children}
    </VistaAnimada>
  );
}

/** Linha de uma dose no cartão do primeiro capítulo. */
function LinhaDeDose({
  icone,
  fundo,
  cor,
  nome,
  situacao,
}: {
  icone: 'atrasada' | 'agendada' | 'aplicada';
  fundo: string;
  cor: string;
  nome: string;
  situacao: string;
}) {
  return (
    <View className="flex-row items-center gap-md">
      <View
        aria-hidden
        className="h-[38px] w-[38px] items-center justify-center rounded-[12px]"
        style={{ backgroundColor: fundo }}
      >
        <Icone nome={icone} cor={cor} tamanho={20} />
      </View>
      <View className="min-w-0 flex-1">
        <Texto variante="corpoNegrito">{nome}</Texto>
        <Texto variante="apoio" className="text-textoSecundario">
          {situacao}
        </Texto>
      </View>
    </View>
  );
}

/** Cartão de interface de cada capítulo (dados de exemplo). */
function CartaoDoCapitulo({ tipo }: { tipo: (typeof CAPITULOS)[number]['cartao'] }) {
  const cores = useThemeColors();
  if (tipo === 'calendario') {
    return (
      <>
        <Texto variante="corpoNegrito">Calendário de Helena</Texto>
        <LinhaDeDose
          icone="atrasada"
          fundo={cores.atrasadaSuave}
          cor={cores.atrasada}
          nome="BCG, dose única"
          situacao="Era para 01/08/2026"
        />
        <LinhaDeDose
          icone="agendada"
          fundo={cores.agendadaSuave}
          cor={cores.agendada}
          nome="Covid-19, reforço"
          situacao="Agendada para 25/11/2026"
        />
        <LinhaDeDose
          icone="aplicada"
          fundo={cores.aplicadaSuave}
          cor={cores.aplicada}
          nome="Rotavírus, 1ª dose"
          situacao="Aplicada"
        />
      </>
    );
  }
  if (tipo === 'familia') {
    const linhas = [
      ['1 atrasada', 'Helena', 'bg-atrasadaSuave', 'text-atrasada'],
      ['1 agendada', 'Pedro', 'bg-agendadaSuave', 'text-agendada'],
      ['Nenhuma atrasada', 'Carla', 'bg-aplicadaSuave', 'text-aplicada'],
    ] as const;
    return (
      <>
        <Texto variante="corpoNegrito">Sua família</Texto>
        {linhas.map(([estado, pessoa, fundo, texto]) => (
          <View key={pessoa} className="flex-row items-center gap-md">
            <View className={`rounded-selo px-md py-xs ${fundo}`}>
              <Texto variante="rotulo" className={texto}>
                {estado}
              </Texto>
            </View>
            <Texto>{pessoa}</Texto>
          </View>
        ))}
      </>
    );
  }
  return (
    <>
      <Texto variante="apoio" className="text-textoSecundario">
        Você perguntou
      </Texto>
      <Texto variante="corpoNegrito">Quando é a próxima dose da Helena?</Texto>
      <Texto variante="apoio" className="text-textoSecundario">
        Resposta
      </Texto>
      <Texto>A próxima é a Covid-19, reforço, agendada para 25/11/2026.</Texto>
      <View className="flex-row items-center gap-sm">
        <Ondas cor={cores.primaria} barras={6} altura={26} />
        <Texto variante="apoio" className="flex-1 text-textoSecundario">
          Fonte: Calendário Nacional, Ministério da Saúde
        </Texto>
      </View>
    </>
  );
}

/** Foto da pessoa recortada, em pé na base do quadro colorido do capítulo. */
function PessoaDoCapitulo({ foto, altura = '94%' }: { foto: Foto; altura?: `${number}%` }) {
  return (
    <View className="absolute bottom-0 left-0 right-0 items-center" style={{ height: altura }}>
      <Image
        source={foto.fonte}
        accessibilityLabel={foto.alt}
        accessibilityIgnoresInvertColors
        resizeMode="stretch"
        style={{ height: '100%', aspectRatio: PROPORCAO }}
      />
    </View>
  );
}

/**
 * "Para quem é": três capítulos, um por pessoa. No computador a seção fica presa à tela enquanto a
 * pessoa rola, e a foto, a cor de fundo e o cartão de interface trocam a cada terço do caminho; os
 * botões com os nomes levam a cada capítulo. No celular, no tablet e com "Reduzir movimento" os três
 * capítulos aparecem um abaixo do outro, sem prender a rolagem.
 *
 * @param props.preso - Janela larga (computador): usa a seção presa à tela.
 */
export function CapitulosDeFases({ preso }: { preso: boolean }) {
  const cores = useThemeColors();
  const { altoContraste, sombra } = useVisual();
  const reduzido = useMovimentoReduzido();
  const posicao = usePosicaoDaRolagem();
  const altura = useWindowDimensions().height;
  const [topo, setTopo] = useState(0);
  const [capitulo, setCapitulo] = useState(0);
  const area = Math.max(560, altura - 24);
  const total = area * 3.4;
  const fixa = preso && !reduzido && posicao !== null;

  useEffect(() => {
    if (!fixa || !posicao) return undefined;
    const id = posicao.addListener(({ value }) => {
      const progresso = Math.min(1, Math.max(0, (value - topo) / (total - area)));
      const indice = Math.min(2, Math.floor(progresso * 3));
      setCapitulo((atual) => (atual === indice ? atual : indice));
    });
    return () => posicao.removeListener(id);
  }, [fixa, posicao, topo, total, area]);

  if (!fixa) {
    return (
      <View className="gap-xxl">
        {CAPITULOS.map((c) => (
          <View key={c.nome} className="gap-lg expandido:flex-row expandido:items-center">
            <View
              className={`h-[320px] w-full overflow-hidden rounded-folha expandido:flex-1 ${
                altoContraste ? 'border-altoContraste border-borda' : ''
              }`}
              style={{ backgroundColor: cores[c.cor] }}
            >
              <PessoaDoCapitulo foto={c.foto} altura="96%" />
            </View>
            <View className="gap-sm expandido:flex-1">
              <Texto variante="rotulo" className="text-primaria">
                {`${c.nome} · ${c.papel}`}
              </Texto>
              <Texto variante="titulo2" accessibilityRole="header">
                {c.titulo}
              </Texto>
              <Texto className="text-textoSecundario">{c.texto}</Texto>
              <Cartao className="gap-md" suave>
                <CartaoDoCapitulo tipo={c.cartao} />
              </Cartao>
            </View>
          </View>
        ))}
      </View>
    );
  }

  const fixo = { position: 'sticky', top: 0, height: area } as unknown as ViewStyle;
  return (
    <View
      testID="capitulos-presos"
      onLayout={(evento) => setTopo(evento.nativeEvent.layout.y)}
      style={{ height: total }}
    >
      <View style={fixo} className="flex-row items-center gap-[56px]">
        <View className="flex-1 gap-lg" style={{ minHeight: 360 }}>
          <View style={{ minHeight: 330 }}>
            {CAPITULOS.map((c, indice) => (
              <Revezar
                key={c.nome}
                visivel={capitulo === indice}
                className="absolute inset-0 justify-center gap-md"
              >
                <Texto variante="corpoNegrito" className="text-primaria">
                  {`${c.nome} · ${c.papel}`}
                </Texto>
                <Texto variante="titulo1" accessibilityRole="header">
                  {c.titulo}
                </Texto>
                <Texto variante="destaque" className="max-w-[460px] text-textoSecundario">
                  {c.texto}
                </Texto>
              </Revezar>
            ))}
          </View>
          <View className="flex-row flex-wrap gap-sm" accessibilityRole="radiogroup">
            {CAPITULOS.map((c, indice) => (
              <Botao
                key={c.nome}
                titulo={c.nome.split(',')[0] ?? c.nome}
                accessibilityLabel={`Ver ${c.nome.split(',')[0]}`}
                variante={capitulo === indice ? 'principal' : 'secundario'}
                tamanho="compacto"
                selecionado={capitulo === indice}
                onPress={() => {
                  setCapitulo(indice);
                }}
              />
            ))}
          </View>
        </View>
        <View className="flex-1 items-center">
          <View
            className="relative w-full max-w-[560px]"
            style={{ aspectRatio: 1, maxHeight: area - 80 }}
          >
            <View
              className={`absolute inset-0 overflow-hidden rounded-[44px] ${
                altoContraste ? 'border-altoContraste border-borda' : ''
              }`}
              style={{ backgroundColor: cores[CAPITULOS[capitulo]?.cor ?? 'primariaSuave'] }}
            >
              {CAPITULOS.map((c, indice) => (
                <Revezar key={c.nome} visivel={capitulo === indice} className="absolute inset-0">
                  <PessoaDoCapitulo foto={c.foto} />
                </Revezar>
              ))}
            </View>
            {CAPITULOS.map((c, indice) => (
              <Revezar
                key={c.nome}
                visivel={capitulo === indice}
                className="absolute bottom-[6%] left-[-3%] w-[68%] max-w-[330px]"
              >
                <Cartao className="gap-sm p-md" style={sombra(3)}>
                  <CartaoDoCapitulo tipo={c.cartao} />
                </Cartao>
              </Revezar>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
