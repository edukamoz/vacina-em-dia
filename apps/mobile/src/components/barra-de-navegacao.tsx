import { Link, usePathname, type Href } from 'expo-router';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Logo } from '../features/auth/logo';
import { modoDeLayout } from '../lib/layout';
import { useThemeColors, useVisual } from '../theme/theme-provider';
import { Icone, type NomeDoIcone } from './icone';
import { Texto } from './texto';

/** Abas do app, na ordem de exibição. O caminho é o da rota dentro de `app/(tabs)`. */
export const ABAS = [
  { name: 'index', caminho: '/', titulo: 'Doses', icone: 'doses' },
  { name: 'familia', caminho: '/familia', titulo: 'Família', icone: 'familia' },
  { name: 'historico', caminho: '/historico', titulo: 'Histórico', icone: 'historico' },
  { name: 'conta', caminho: '/conta', titulo: 'Conta', icone: 'conta' },
] as const satisfies readonly {
  name: string;
  caminho: string;
  titulo: string;
  icone: NomeDoIcone;
}[];

/** Item de navegação: link com ícone e texto, destaque que não depende só da cor. */
function ItemDeNavegacao({
  caminho,
  titulo,
  icone,
  ativa,
  expandido,
  lateral,
}: {
  caminho: Href;
  titulo: string;
  icone: NomeDoIcone;
  ativa: boolean;
  expandido: boolean;
  lateral: boolean;
}) {
  const cores = useThemeColors();
  const { altoContraste } = useVisual();
  return (
    <Link href={caminho} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={titulo}
        accessibilityState={{ selected: ativa }}
        aria-current={ativa ? 'page' : undefined}
        className={`items-center rounded-botao border-padrao hover:bg-superficieSuave ${
          lateral && expandido
            ? 'min-h-principal flex-row gap-md px-lg'
            : lateral
              ? 'min-h-[68px] justify-center gap-xs px-xs py-sm'
              : 'min-h-principal flex-1 justify-center gap-xs px-xs py-sm'
        } ${
          ativa
            ? `bg-primariaSuave ${altoContraste ? 'border-borda' : 'border-transparent'}`
            : 'border-transparent'
        }`}
      >
        <Icone nome={icone} cor={ativa ? cores.primaria : cores.texto} />
        <Texto
          variante={expandido ? (ativa ? 'corpoNegrito' : 'corpo') : ativa ? 'rotulo' : 'apoio'}
          className={`${ativa ? 'text-primaria' : 'text-texto'} ${ativa && altoContraste ? 'underline' : ''}`}
          importantForAccessibility="no"
        >
          {titulo}
        </Texto>
      </Pressable>
    </Link>
  );
}

/**
 * Navegação principal, que muda de forma conforme a largura (`docs/04-design-system.md`, 2.5):
 * barra **inferior** no celular; barra **lateral compacta** (ícone sobre o texto) no tablet; barra
 * **lateral fixa** com o logo e o texto ao lado do ícone no computador. O assistente não é item
 * do menu: o botão flutuante (`BalaoAssistente`) abre a janela de conversa em todos os tamanhos. Cada aba é um link de verdade (na web, abre com o botão do meio e é navegável por teclado), com o estado
 * "página atual" anunciado ao leitor de tela e um destaque que não depende só da cor.
 *
 * @param props.largura - Largura a considerar; por padrão, a da janela (útil para testar).
 */
export function BarraDeNavegacao({ largura }: { largura?: number }) {
  const pathname = usePathname();
  const janela = useWindowDimensions().width;
  const modo = modoDeLayout(largura ?? janela);
  const lateral = modo !== 'compacto';
  const expandido = modo === 'expandido';
  const { altoContraste, sombra } = useVisual();

  return (
    <View
      role="navigation"
      accessibilityLabel="Menu principal"
      style={sombra(1)}
      className={`bg-superficie ${
        lateral
          ? `${altoContraste ? 'border-r-altoContraste border-borda' : 'border-r-fina border-bordaSuave'} ${
              expandido ? 'w-[248px] gap-xl px-lg py-xl' : 'w-[96px] gap-lg px-sm py-lg'
            }`
          : `min-h-[72px] flex-row p-sm ${altoContraste ? 'border-t-altoContraste border-borda' : 'border-t-fina border-bordaSuave'}`
      }`}
    >
      {expandido ? (
        <View className="px-sm">
          <Logo pequena />
        </View>
      ) : null}

      <View className={lateral ? 'flex-1 gap-sm' : 'flex-1 flex-row gap-sm'}>
        {ABAS.map(({ caminho, titulo, icone }) => (
          <ItemDeNavegacao
            key={caminho}
            caminho={caminho}
            titulo={titulo}
            icone={icone}
            ativa={pathname === caminho}
            expandido={expandido}
            lateral={lateral}
          />
        ))}
        {lateral ? (
          <ItemDeNavegacao
            caminho="/postos"
            titulo="Postos"
            icone="local"
            ativa={pathname === '/postos'}
            expandido={expandido}
            lateral
          />
        ) : null}
      </View>
    </View>
  );
}
