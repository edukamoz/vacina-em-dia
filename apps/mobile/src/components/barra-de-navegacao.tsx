import { Link, usePathname, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../features/auth/logo';
import { useProfilePhoto } from '../features/data/hooks';
import { modoDeLayout } from '../lib/layout';
import { useSession } from '../session/session-provider';
import { useThemeColors, useVisual } from '../theme/theme-provider';
import { Avatar } from './avatar';
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

/** Classes de um item da barra, iguais para os links e para o botão "Sair". */
function classesDoItem(
  ativa: boolean,
  expandido: boolean,
  lateral: boolean,
  altoContraste: boolean,
): string {
  return `items-center rounded-botao border-padrao hover:bg-superficieSuave ${
    lateral && expandido
      ? 'min-h-principal flex-row gap-md px-lg'
      : lateral
        ? 'min-h-[68px] justify-center gap-xs px-xs py-sm'
        : 'min-h-principal flex-1 justify-center gap-xs px-xs py-sm'
  } ${
    ativa
      ? `bg-primariaSuave ${altoContraste ? 'border-borda' : 'border-transparent'}`
      : 'border-transparent'
  }`;
}

/**
 * Foto de perfil (ou a inicial do e-mail) no lugar do ícone da aba Conta. Com a aba ativa ganha um
 * anel na cor da marca, para o destaque não depender só do texto.
 */
function MiniaturaDaConta({ ativa }: { ativa: boolean }) {
  const cores = useThemeColors();
  const { account } = useSession();
  const foto = useProfilePhoto();
  return (
    <View
      className="rounded-selo border-[2px]"
      style={{ borderColor: ativa ? cores.primaria : 'transparent' }}
    >
      <Avatar nome={account?.email ?? 'Conta'} indice={0} tamanho={28} foto={foto.data ?? null} />
    </View>
  );
}

/** Item de navegação: link com ícone e texto, destaque que não depende só da cor. */
function ItemDeNavegacao({
  caminho,
  titulo,
  icone,
  miniatura,
  ativa,
  expandido,
  lateral,
}: {
  caminho: Href;
  titulo: string;
  icone: NomeDoIcone;
  /** Imagem no lugar do ícone (a foto de perfil, na aba Conta). */
  miniatura?: ReactNode;
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
        className={classesDoItem(ativa, expandido, lateral, altoContraste)}
      >
        {miniatura ?? <Icone nome={icone} cor={ativa ? cores.primaria : cores.texto} />}
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

/** Botão "Sair" da barra lateral, logo acima da aba Conta: à mão em qualquer tela, sem rolar. */
function BotaoSair({ expandido }: { expandido: boolean }) {
  const cores = useThemeColors();
  const { altoContraste } = useVisual();
  const { logout } = useSession();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sair"
      onPress={() => void logout()}
      className={classesDoItem(false, expandido, true, altoContraste)}
    >
      <Icone nome="sair" cor={cores.texto} />
      <Texto
        variante={expandido ? 'corpo' : 'apoio'}
        className="text-texto"
        importantForAccessibility="no"
      >
        Sair
      </Texto>
    </Pressable>
  );
}

/**
 * Navegação principal, que muda de forma conforme a largura (`docs/04-design-system.md`, 2.5):
 * barra **inferior** no celular; barra **lateral compacta** (ícone sobre o texto) no tablet; barra
 * **lateral fixa** com o logo e o texto ao lado do ícone no computador. O assistente não é item
 * do menu: o botão flutuante (`BalaoAssistente`) abre a janela de conversa em todos os tamanhos. Cada aba é um link de verdade (na web, abre com o botão do meio e é navegável por teclado), com o estado
 * "página atual" anunciado ao leitor de tela e um destaque que não depende só da cor.
 *
 * A aba Conta mostra a foto de perfil (ou a inicial) no lugar do ícone. Na barra lateral, a Conta
 * fica no canto de baixo, com o botão "Sair" logo acima; no celular, o "Sair" fica no topo da
 * própria tela Conta.
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
  // No Android a barra do sistema (botões ou gestos) fica por cima do app; a barra de baixo sobe o
  // tanto que ela ocupa.
  const { bottom } = useSafeAreaInsets();
  const abas = lateral ? ABAS.filter((aba) => aba.caminho !== '/conta') : ABAS;

  return (
    <View
      role="navigation"
      accessibilityLabel="Menu principal"
      style={[sombra(1), lateral ? null : { paddingBottom: 8 + bottom }]}
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
        {abas.map(({ caminho, titulo, icone }) => (
          <ItemDeNavegacao
            key={caminho}
            caminho={caminho}
            titulo={titulo}
            icone={icone}
            {...(caminho === '/conta'
              ? { miniatura: <MiniaturaDaConta ativa={pathname === caminho} /> }
              : {})}
            ativa={pathname === caminho}
            expandido={expandido}
            lateral={lateral}
          />
        ))}
        {lateral ? (
          <>
            <ItemDeNavegacao
              caminho="/postos"
              titulo="Postos"
              icone="local"
              ativa={pathname === '/postos'}
              expandido={expandido}
              lateral
            />
            <View className="mt-auto gap-sm">
              <BotaoSair expandido={expandido} />
              <ItemDeNavegacao
                caminho="/conta"
                titulo="Conta"
                icone="conta"
                miniatura={<MiniaturaDaConta ativa={pathname === '/conta'} />}
                ativa={pathname === '/conta'}
                expandido={expandido}
                lateral
              />
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}
