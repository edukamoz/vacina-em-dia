import { View } from 'react-native';
import { Cartao } from '../../components/cartao';
import { AtalhoDeMovimento } from '../../components/seletor-de-movimento';
import { SeletorDeTamanhoDoTexto } from '../../components/seletor-de-tamanho-do-texto';
import { SeletorDeTema } from '../../components/seletor-de-tema';
import { Texto } from '../../components/texto';

/** Números da seção "Fácil de ler". */
const FATOS = [
  ['200%', 'de ampliação do texto'],
  ['3', 'temas, com Alto contraste'],
  ['48 dp', 'de área de toque mínima'],
] as const;

/**
 * "Fácil de ler": os seletores reais do app (tamanho das letras, tema e movimento) aplicados à
 * própria página, com uma amostra de dose que cresce junto. É a mesma escolha da aba Conta.
 */
export function FacilDeLer() {
  return (
    <View className="gap-xxl expandido:flex-row expandido:items-center expandido:gap-[56px]">
      <View className="gap-lg expandido:flex-1">
        <Texto variante="rotulo" className="text-primaria">
          FÁCIL DE LER
        </Texto>
        <Texto variante="titulo1" accessibilityRole="header">
          Letras que crescem e contraste que você escolhe
        </Texto>
        <Texto variante="destaque" className="max-w-[520px] text-textoSecundario">
          O app foi feito para o Sr. José e para quem já está cansado de letra miúda. Experimente
          aqui: a própria página muda.
        </Texto>
        <View className="flex-row flex-wrap gap-xl pt-md">
          {FATOS.map(([numero, rotulo]) => (
            <View key={numero}>
              <Texto variante="titulo1" className="text-primaria">
                {numero}
              </Texto>
              <Texto variante="apoio" className="text-textoSecundario">
                {rotulo}
              </Texto>
            </View>
          ))}
        </View>
      </View>
      <Cartao className="gap-xl rounded-folha p-xl expandido:flex-[1.1]">
        <View className="gap-sm">
          <Texto variante="corpoNegrito" className="text-textoSecundario">
            Tamanho das letras
          </Texto>
          <SeletorDeTamanhoDoTexto />
        </View>
        <View className="gap-sm">
          <Texto variante="corpoNegrito" className="text-textoSecundario">
            Tema
          </Texto>
          <SeletorDeTema />
        </View>
        <AtalhoDeMovimento />
        <Cartao suave className="gap-xs" accessibilityLiveRegion="polite">
          <Texto variante="corpoNegrito">Covid-19, reforço</Texto>
          <Texto>Agendada para 25/11/2026</Texto>
        </Cartao>
      </Cartao>
    </View>
  );
}
