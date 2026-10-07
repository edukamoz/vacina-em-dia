import type { DoseStatus } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { Icone, type NomeDoIcone } from '../../components/icone';
import { SeloEstadoDose } from '../../components/selo-estado-dose';
import { Texto } from '../../components/texto';
import { modoDeLayout } from '../../lib/layout';
import { useThemeColors } from '../../theme/theme-provider';
import { Logo } from './logo';

/** Ícone de cada vantagem: "Aa" (texto grande) ou um desenho. */
const VANTAGENS: readonly { titulo: string; texto: string; icone: NomeDoIcone | 'texto' }[] = [
  {
    titulo: 'Fácil de ler',
    texto: 'Texto grande e contraste alto em todas as telas.',
    icone: 'texto',
  },
  {
    titulo: 'Para toda a família',
    texto: 'Acompanhe as doses de cada pessoa em um só lugar.',
    icone: 'familia',
  },
  {
    titulo: 'Com fonte oficial',
    texto: 'Todo conteúdo sobre vacinas mostra a fonte e a versão.',
    icone: 'info',
  },
];

/** Exemplos do painel da apresentação: dados inventados, só para mostrar como a tela se parece. */
const EXEMPLOS: readonly { vacina: string; dica: string; status: DoseStatus; faixa: string }[] = [
  { vacina: 'Gripe', dica: 'Prevista para 20/09/2026', status: 'OVERDUE', faixa: 'bg-atrasada' },
  {
    vacina: 'Covid-19, reforço',
    dica: 'Agendada para 15/10/2026',
    status: 'SCHEDULED',
    faixa: 'bg-agendada',
  },
  {
    vacina: 'Febre amarela',
    dica: 'Aplicada em 12/04/2026',
    status: 'APPLIED',
    faixa: 'bg-aplicada',
  },
];

/** Largura útil das seções da página: 1184 px com margem, centralizada. */
const SECAO = 'w-full max-w-pagina self-center px-lg expandido:px-xxl';

/**
 * Tela de apresentação (primeiro contato), no desenho de referência: cabeçalho com "Entrar", a
 * promessa com um painel de exemplos, as vantagens, uma faixa para criar a conta e o aviso de que o
 * app não substitui a caderneta. No computador, a promessa e o painel ficam lado a lado e as
 * vantagens, em três colunas.
 */
export function WelcomeScreen() {
  const router = useRouter();
  const cores = useThemeColors();
  const expandido = modoDeLayout(useWindowDimensions().width) === 'expandido';

  return (
    <SafeAreaView className="flex-1 bg-fundo">
      <ScrollView>
        <View className="border-b-padrao border-borda">
          <View
            className={`${SECAO} min-h-[72px] flex-row items-center justify-between gap-lg expandido:min-h-[88px]`}
          >
            <Logo />
            <Botao titulo="Entrar" variante="secundario" onPress={() => router.push('/entrar')} />
          </View>
        </View>

        <View className="gap-[40px] pt-[40px] expandido:gap-[64px] expandido:pt-[64px]">
          <View className={SECAO}>
            <View className="gap-xxl expandido:flex-row expandido:items-start expandido:gap-[64px]">
              <View className="gap-xl expandido:flex-1">
                <Texto variante={expandido ? 'exibicao' : 'titulo1'} accessibilityRole="header">
                  Suas vacinas e as da sua família, em dia.
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
                className="gap-md rounded-cartao border-padrao border-borda bg-primariaSuave p-lg expandido:w-[480px] expandido:p-xl"
              >
                {EXEMPLOS.map(({ vacina, dica, status, faixa }) => (
                  <Cartao key={vacina} className="flex-row overflow-hidden p-0">
                    <View className={`w-[6px] ${faixa}`} />
                    <View className="flex-1 gap-sm p-lg">
                      <Texto variante="titulo3">{vacina}</Texto>
                      <Texto variante="apoio" className="text-textoSecundario">
                        {dica}
                      </Texto>
                      <SeloEstadoDose status={status} />
                    </View>
                  </Cartao>
                ))}
                <Texto variante="apoio" className="text-textoSecundario">
                  Exemplo com dados inventados.
                </Texto>
              </View>
            </View>
          </View>

          <View className={SECAO}>
            <View className="gap-xl">
              <Texto variante="titulo2" accessibilityRole="header">
                Feito para ser simples
              </Texto>
              <View className="gap-lg expandido:flex-row expandido:gap-xl">
                {VANTAGENS.map(({ titulo, texto, icone }) => (
                  <Cartao key={titulo} className="gap-lg expandido:flex-1 expandido:p-xl">
                    <View className="h-[40px] justify-center">
                      {icone === 'texto' ? (
                        <Texto
                          variante="titulo1"
                          className="text-primaria"
                          importantForAccessibility="no"
                        >
                          Aa
                        </Texto>
                      ) : (
                        <Icone nome={icone} cor={cores.primaria} tamanho={36} />
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
          </View>

          <View className="border-y-padrao border-borda bg-superficie py-xxxl">
            <View className={SECAO}>
              <View className="gap-xl expandido:flex-row expandido:items-center expandido:justify-between expandido:gap-xxl">
                <Texto variante="titulo2" accessibilityRole="header">
                  Comece a acompanhar suas doses.
                </Texto>
                <View>
                  <Botao
                    titulo="Criar conta"
                    variante="secundario"
                    onPress={() => router.push('/criar-conta')}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className={`${SECAO} pb-xxl pt-xl`}>
          <Texto variante="apoio" className="text-textoSecundario">
            O Vacina em Dia não substitui a caderneta oficial de vacinação nem a orientação de
            profissionais de saúde.
          </Texto>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
