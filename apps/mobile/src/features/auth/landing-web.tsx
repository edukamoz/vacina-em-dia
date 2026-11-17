import { useRouter } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bolha } from '../../components/bolha';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { Icone } from '../../components/icone';
import { LinkTexto } from '../../components/link-texto';
import { RolagemAnimada } from '../../components/rolagem-animada';
import { Texto } from '../../components/texto';
import { modoDeLayout } from '../../lib/layout';
import { ID_DO_CONTEUDO } from '../../lib/pular-conteudo';
import { useMovimentoReduzido, useThemeColors, useVisual } from '../../theme/theme-provider';
import { CapitulosDeFases } from './landing-capitulos';
import { FacilDeLer } from './landing-ler';
import { PalcoDaAbertura } from './landing-palco';
import { RecursosDoApp } from './landing-recursos';
import { Logo, Simbolo } from './logo';

/** Identificadores das seções que o menu do alto leva a rolar até elas. */
const ANCORA = {
  paraQuem: 'para-quem-e',
  recursos: 'o-que-faz',
  ler: 'facil-de-ler',
  privacidade: 'privacidade-na-pagina',
} as const;

/** Os três compromissos de privacidade, em letras grandes. */
const SEM = [
  { texto: 'Sem CPF.', cor: 'text-texto' },
  { texto: 'Sem cartão do SUS.', cor: 'text-textoSecundario' },
  { texto: 'Exclua quando quiser.', cor: 'text-primaria' },
] as const;

/** O que fica guardado, em três colunas. */
const GARANTIAS = [
  {
    titulo: 'Só o necessário',
    texto:
      'Nome ou apelido, data de nascimento e as doses de cada pessoa. A foto de perfil é opcional.',
  },
  {
    titulo: 'Consentimento claro',
    texto:
      'Pedimos o seu aceite no primeiro acesso, em linguagem simples. Para crianças, o responsável legal confirma.',
  },
  {
    titulo: 'Exclusão total',
    texto:
      'Excluir a conta apaga as pessoas, as doses, o histórico e o consentimento. Não dá para desfazer.',
  },
] as const;

/** Largura útil das seções da página: 1184 px com margem, centralizada. */
const SECAO = 'w-full max-w-pagina self-center px-lg expandido:px-xxl';

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

/**
 * Página de apresentação do site (primeiro contato de quem abre o endereço no navegador), no
 * desenho do design v3.1 (ADR-036): menu no alto; a promessa com um palco de foto e interface real
 * (a dose da BCG dá para aplicar); "Para quem é" em três capítulos presos à rolagem, um por pessoa;
 * "O que o app faz" em grade de recursos; "Fácil de ler", que usa os seletores reais de tamanho, tema
 * e movimento na própria página; "Privacidade" em letras grandes; a faixa final para criar a conta e
 * o rodapé com a fonte do calendário e o aviso de que o app não substitui a caderneta. Os efeitos de
 * fundo e as animações somem no Alto contraste e com "Reduzir movimento".
 *
 * - Computador (`compacta` falso): menu com as seções, promessa e palco lado a lado, capítulos
 *   presos à tela e recursos em grade.
 * - Celular e janela estreita (`compacta`): só "Entrar" no alto, capítulos um abaixo do outro, um
 *   cartão ensinando a instalar o app e um botão "Criar conta" no pé da tela (fora da rolagem).
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
                <LinkTexto titulo="Para quem é" onPress={() => irPara(ANCORA.paraQuem, reduzido)} />
                <LinkTexto titulo="O que faz" onPress={() => irPara(ANCORA.recursos, reduzido)} />
                <LinkTexto titulo="Fácil de ler" onPress={() => irPara(ANCORA.ler, reduzido)} />
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
            <Bolha
              cor={cores.decorMenta}
              tamanho={520}
              opacidade={0.5}
              className="absolute -right-[120px] -top-[60px]"
            />
          )}
          <View
            className={`${SECAO} relative gap-xxl pb-[64px] pt-[32px] expandido:flex-row expandido:items-center expandido:gap-[48px] expandido:pb-[80px] expandido:pt-[36px]`}
          >
            <View className="gap-xl expandido:flex-[6]">
              <View className="flex-row items-center gap-sm self-start rounded-selo bg-primariaSuave py-xs pl-xs pr-md">
                <View
                  aria-hidden
                  className="h-[26px] w-[26px] items-center justify-center rounded-selo bg-primaria"
                >
                  <Icone nome="info" cor={cores.sobrePrimaria} tamanho={16} />
                </View>
                <Texto variante="rotulo" className="text-primaria">
                  Segue o Calendário Nacional de Vacinação 2026
                </Texto>
              </View>
              <Texto variante={expandido ? 'exibicao' : 'titulo1'} accessibilityRole="header">
                {'As vacinas da sua família, '}
                <Texto variante={expandido ? 'exibicao' : 'titulo1'} className="text-primaria">
                  em dia
                </Texto>
              </Texto>
              <Texto variante={expandido ? 'destaque' : 'corpo'} className="text-textoSecundario">
                Veja o que está pendente, agendado ou atrasado para cada pessoa da casa. Receba
                lembretes e tire dúvidas falando. Tudo em letras grandes, para ler sem esforço.
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
            <View className="gap-md expandido:flex-[5]">
              <PalcoDaAbertura flutuantes={expandido && !altoContraste} />
              <Texto variante="apoio" className="text-center text-textoSecundario">
                Exemplo com dados inventados. As pessoas das fotos são fictícias, geradas por
                inteligência artificial.
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

        <View nativeID={ANCORA.paraQuem} className={`${SECAO} gap-xl pt-xxl`}>
          <View className="max-w-[760px] gap-sm">
            <Texto variante="rotulo" className="text-primaria">
              PARA QUEM É
            </Texto>
            <Texto variante="titulo1" accessibilityRole="header">
              Uma caderneta para cada fase da vida
            </Texto>
            <Texto className="text-textoSecundario">
              O calendário oficial muda com a idade. O app mostra o que vale para cada pessoa da sua
              família. As pessoas são fictícias e as fotos foram geradas por inteligência
              artificial.
            </Texto>
          </View>
        </View>
        <View className={`${SECAO} pb-xxl`}>
          <CapitulosDeFases preso={expandido} />
        </View>

        <View nativeID={ANCORA.recursos} className={`${SECAO} gap-xl py-xxl`}>
          <View className="max-w-[760px] gap-sm">
            <Texto variante="rotulo" className="text-primaria">
              O QUE O APP FAZ
            </Texto>
            <Texto variante="titulo1" accessibilityRole="header">
              Pensado para a rotina de quem cuida
            </Texto>
          </View>
          <RecursosDoApp />
        </View>

        <View nativeID={ANCORA.ler} className={`${SECAO} py-xxl`}>
          <FacilDeLer />
        </View>

        <View nativeID={ANCORA.privacidade} className={`${SECAO} gap-xl py-xxl`}>
          <Texto variante="rotulo" className="text-primaria">
            PRIVACIDADE
          </Texto>
          <View
            accessible
            accessibilityRole="header"
            accessibilityLabel="Sem CPF. Sem cartão do SUS. Exclua quando quiser."
          >
            {SEM.map(({ texto, cor }) => (
              <Texto key={texto} variante="exibicao" className={cor} importantForAccessibility="no">
                {texto}
              </Texto>
            ))}
          </View>
          <View className="gap-lg pt-md expandido:flex-row expandido:gap-xl">
            {GARANTIAS.map(({ titulo, texto }) => (
              <View
                key={titulo}
                className="gap-xs border-t-padrao border-texto pt-md expandido:flex-1"
              >
                <Texto variante="corpoNegrito">{titulo}</Texto>
                <Texto className="text-textoSecundario">{texto}</Texto>
              </View>
            ))}
          </View>
        </View>

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
