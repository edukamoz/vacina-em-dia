import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bolha } from '../../components/bolha';
import { Botao } from '../../components/botao';
import { Entrada } from '../../components/animacao';
import { Texto } from '../../components/texto';
import { useThemeColors, useVisual } from '../../theme/theme-provider';
import { FOTOS } from './fotos';
import { Simbolo } from './logo';

/**
 * Abertura do aplicativo instalado (Android, iOS ou site instalado como app). Diferente da página
 * do site, é uma tela só, sem rolagem de marketing: a marca no alto, as pessoas sobre o fundo
 * verde e, embaixo, uma folha com a promessa e os dois caminhos, "Criar conta" e "Já tenho conta".
 * Em janela larga (site instalado no computador) a folha fica centralizada, com largura de
 * celular. Os efeitos de fundo somem no Alto contraste.
 */
export function WelcomeApp() {
  const router = useRouter();
  const cores = useThemeColors();
  const { altoContraste, gradienteMarca, sombra } = useVisual();

  return (
    <SafeAreaView className="flex-1 bg-primaria" style={gradienteMarca}>
      <ScrollView
        contentContainerClassName="flex-grow self-center w-full max-w-[520px]"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View className="relative min-h-[300px] flex-1 items-center justify-end overflow-hidden px-lg pt-lg">
          {altoContraste ? null : (
            <>
              <Bolha
                cor={cores.decorMenta}
                tamanho={260}
                opacidade={0.22}
                className="absolute -left-[60px] top-[40px]"
              />
              <Bolha
                cor={cores.decorSol}
                tamanho={140}
                opacidade={0.3}
                className="absolute -right-[30px] top-[10px]"
              />
            </>
          )}
          <Entrada>
            <View className="w-full flex-row items-center gap-md">
              <Simbolo tamanho={44} invertido />
              <Texto variante="titulo3" className="text-sobrePrimaria">
                Vacina em Dia
              </Texto>
            </View>
          </Entrada>
          <View className="h-[280px] w-full flex-row items-end justify-center">
            <Image
              source={FOTOS.jose.fonte}
              accessibilityLabel={FOTOS.jose.alt}
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              style={{ width: '46%', height: 250, marginRight: -18 }}
            />
            <Image
              source={FOTOS.mariana.fonte}
              accessibilityLabel={FOTOS.mariana.alt}
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              style={{ width: '62%', height: 290 }}
            />
          </View>
        </View>

        <View style={sombra(3)} className="gap-lg rounded-t-folha bg-superficie px-xl pb-xl pt-xl">
          <Entrada indice={1}>
            <Texto variante="titulo1" accessibilityRole="header">
              {'As vacinas da sua família, '}
              <Texto variante="titulo1" className="text-primaria">
                em dia
              </Texto>
            </Texto>
          </Entrada>
          <Entrada indice={2}>
            <Texto className="text-textoSecundario">
              Doses, lembretes e um assistente de voz. Tudo em letras grandes.
            </Texto>
          </Entrada>
          <Entrada indice={3}>
            <View className="gap-md">
              <Botao titulo="Criar conta" onPress={() => router.push('/criar-conta')} />
              <Botao
                titulo="Já tenho conta"
                variante="secundario"
                onPress={() => router.push('/entrar')}
              />
            </View>
          </Entrada>
          <View className="items-center gap-sm">
            <View className="flex-row flex-wrap justify-center gap-lg">
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Termos de uso"
                onPress={() => router.push('/termos')}
                className="min-h-toque justify-center"
              >
                <Texto variante="apoio" className="text-primaria underline">
                  Termos de uso
                </Texto>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Política de privacidade"
                onPress={() => router.push('/privacidade')}
                className="min-h-toque justify-center"
              >
                <Texto variante="apoio" className="text-primaria underline">
                  Política de privacidade
                </Texto>
              </Pressable>
            </View>
            <Texto variante="apoio" className="text-center text-textoSecundario">
              O aplicativo não substitui a caderneta oficial nem um profissional de saúde.
            </Texto>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
