import { Link, usePathname } from 'expo-router';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { modoDeLayout } from '../lib/layout';
import { useThemeColors } from '../theme/theme-provider';
import { Logo } from '../features/auth/logo';
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

/**
 * Navegação principal, que muda de forma conforme a largura (`docs/04-design-system.md`, 2.5):
 * barra **inferior** no celular; barra **lateral compacta** (ícone e texto) no tablet; barra
 * **lateral fixa** com texto, nome do app e aviso no computador. Cada item é um link de verdade
 * (na web, abre com o botão do meio e é navegável por teclado), com o estado "página atual"
 * anunciado ao leitor de tela e um destaque que não depende só da cor.
 *
 * @param props.largura - Largura a considerar; por padrão, a da janela (útil para testar).
 */
export function BarraDeNavegacao({ largura }: { largura?: number }) {
  const pathname = usePathname();
  const janela = useWindowDimensions().width;
  const modo = modoDeLayout(largura ?? janela);
  const lateral = modo !== 'compacto';
  const expandido = modo === 'expandido';
  const cores = useThemeColors();

  return (
    <View
      role="navigation"
      accessibilityLabel="Menu principal"
      className={
        lateral
          ? `border-r-padrao border-borda bg-superficie ${expandido ? 'w-[248px] gap-xxl px-lg py-xl' : 'w-[96px] px-xs py-lg'}`
          : 'min-h-[64px] flex-row border-t-padrao border-borda bg-superficie'
      }
    >
      {expandido ? (
        <View className="px-sm">
          <Logo />
        </View>
      ) : null}

      <View className={lateral ? 'gap-sm' : 'flex-1 flex-row'}>
        {ABAS.map(({ caminho, titulo, icone }) => {
          const ativa = pathname === caminho;
          return (
            <Link key={caminho} href={caminho} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={titulo}
                accessibilityState={{ selected: ativa }}
                aria-current={ativa ? 'page' : undefined}
                className={`items-center justify-center hover:bg-primariaSuave ${
                  lateral && expandido
                    ? 'min-h-principal flex-row justify-start gap-md rounded-cartao px-lg'
                    : 'min-h-toque flex-1 gap-xs rounded-botao px-xs py-sm'
                } ${ativa ? 'bg-primariaSuave' : ''}`}
              >
                <Icone nome={icone} cor={ativa ? cores.primaria : cores.texto} />
                <Texto
                  variante={ativa ? 'corpoNegrito' : 'corpo'}
                  className={ativa ? 'text-primaria' : 'text-texto'}
                  importantForAccessibility="no"
                >
                  {titulo}
                </Texto>
                {ativa && !expandido ? <View className="h-[3px] w-[24px] bg-primaria" /> : null}
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}
