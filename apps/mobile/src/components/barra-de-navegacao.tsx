import { Link, usePathname } from 'expo-router';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { modoDeLayout } from '../lib/layout';
import { Texto } from './texto';

/** Abas do app, na ordem de exibição. O caminho é o da rota dentro de `app/(tabs)`. */
export const ABAS = [
  { name: 'index', caminho: '/', titulo: 'Família', icone: '⌂' },
  { name: 'calendario', caminho: '/calendario', titulo: 'Calendário', icone: '▦' },
  { name: 'assistente', caminho: '/assistente', titulo: 'Assistente', icone: '✉' },
  { name: 'historico', caminho: '/historico', titulo: 'Histórico', icone: '☰' },
  { name: 'conta', caminho: '/conta', titulo: 'Conta', icone: '☺' },
] as const;

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

  return (
    <View
      role="navigation"
      accessibilityLabel="Menu principal"
      className={
        lateral
          ? `border-r-padrao border-borda bg-superficie py-lg ${expandido ? 'w-[248px] px-md' : 'w-[96px] px-xs'}`
          : 'min-h-[64px] flex-row border-t-padrao border-borda bg-superficie'
      }
    >
      {expandido ? (
        <View className="gap-xs px-sm pb-lg">
          <Texto variante="titulo3" accessibilityRole="header">
            Vacina em Dia
          </Texto>
          <Texto variante="apoio" className="text-textoSecundario">
            Carteira de vacinação da família
          </Texto>
        </View>
      ) : null}

      <View className={lateral ? 'gap-xs' : 'flex-1 flex-row'}>
        {ABAS.map(({ caminho, titulo, icone }) => {
          const ativa = pathname === caminho;
          return (
            <Link key={caminho} href={caminho} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={titulo}
                accessibilityState={{ selected: ativa }}
                aria-current={ativa ? 'page' : undefined}
                className={`min-h-toque items-center justify-center rounded-botao hover:bg-primariaSuave ${
                  lateral && expandido
                    ? 'flex-row justify-start gap-md px-md py-md'
                    : 'flex-1 gap-xs px-xs py-sm'
                } ${ativa ? 'bg-primariaSuave' : ''}`}
              >
                <Texto
                  variante="titulo3"
                  className={ativa ? 'text-primaria' : 'text-textoSecundario'}
                  importantForAccessibility="no"
                >
                  {icone}
                </Texto>
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

      {expandido ? (
        <View className="mt-auto px-sm pt-lg">
          <Texto variante="apoio" className="text-textoSecundario">
            Versão de demonstração, sem login.
          </Texto>
        </View>
      ) : null}
    </View>
  );
}
