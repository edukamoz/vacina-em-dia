import { useRouter } from 'expo-router';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { Texto } from '../../components/texto';
import { modoDeLayout } from '../../lib/layout';
import { Logo } from './logo';

const VANTAGENS: readonly { titulo: string; texto: string }[] = [
  { titulo: 'Fácil de ler', texto: 'Texto grande e contraste alto em todas as telas.' },
  {
    titulo: 'Para toda a família',
    texto: 'Acompanhe as doses de cada pessoa em um só lugar.',
  },
  {
    titulo: 'Com fonte oficial',
    texto: 'Todo conteúdo sobre vacinas mostra a fonte e a versão.',
  },
];

/**
 * Tela de apresentação (primeiro contato): o que o app faz, em poucas palavras, com as ações
 * "Criar conta" e "Entrar". No computador, as vantagens ficam lado a lado.
 */
export function WelcomeScreen() {
  const router = useRouter();
  const expandido = modoDeLayout(useWindowDimensions().width) === 'expandido';

  return (
    <SafeAreaView className="flex-1 bg-fundo">
      <ScrollView contentContainerClassName="gap-xl p-lg medio:p-xl expandido:p-xxl self-center w-full max-w-conteudo">
        <View className="flex-row flex-wrap items-center justify-between gap-md">
          <Logo />
          <Botao titulo="Entrar" variante="secundario" onPress={() => router.push('/entrar')} />
        </View>

        <View className="gap-md">
          <Texto variante="titulo1" accessibilityRole="header">
            Suas vacinas e as da sua família, em dia.
          </Texto>
          <Texto className="text-textoSecundario">
            Veja o que está pendente, agendado ou atrasado. Tudo em letras grandes e fáceis de ler.
          </Texto>
          <View className="items-start">
            <Botao titulo="Criar conta" onPress={() => router.push('/criar-conta')} />
          </View>
        </View>

        <View className="gap-md">
          <Texto variante="titulo2" accessibilityRole="header">
            Feito para ser simples
          </Texto>
          <View className={expandido ? 'flex-row gap-md' : 'gap-md'}>
            {VANTAGENS.map(({ titulo, texto }) => (
              <Cartao key={titulo} className={expandido ? 'flex-1 gap-xs' : 'gap-xs'}>
                <Texto variante="titulo3">{titulo}</Texto>
                <Texto className="text-textoSecundario">{texto}</Texto>
              </Cartao>
            ))}
          </View>
        </View>

        <Texto variante="apoio" className="text-textoSecundario">
          O Vacina em Dia não substitui a caderneta oficial de vacinação nem a orientação de
          profissionais de saúde.
        </Texto>
      </ScrollView>
    </SafeAreaView>
  );
}
