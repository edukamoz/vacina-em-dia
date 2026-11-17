import { useState } from 'react';
import { Image, View } from 'react-native';
import { Botao } from '../../components/botao';
import { Icone } from '../../components/icone';
import { Paralaxe } from '../../components/rolagem-animada';
import { Texto } from '../../components/texto';
import { useThemeColors, useVisual } from '../../theme/theme-provider';
import { FOTOS } from './fotos';
import { Ondas } from './ondas';

/**
 * Palco da abertura (design v3.1): a Mariana num arco sobre um sol, e cartões de interface real por
 * cima. O cartão da dose é interativo ("Aplicar" vira visto e "Desfazer"); o lembrete e o botão de
 * voz acompanham a rolagem devagar no computador. Os dados são de exemplo.
 *
 * @param props.flutuantes - Mostra os avisos que flutuam (computador, sem Alto contraste).
 */
export function PalcoDaAbertura({ flutuantes }: { flutuantes: boolean }) {
  const cores = useThemeColors();
  const { altoContraste, sombra } = useVisual();
  const [aplicada, setAplicada] = useState(false);
  const cartao = `absolute flex-row items-center gap-md rounded-cartao bg-superficie p-md ${
    altoContraste ? 'border-altoContraste border-borda' : 'border-fina border-bordaSuave'
  }`;
  return (
    <View className="relative w-full max-w-[560px] self-center" style={{ aspectRatio: 1 / 1.08 }}>
      {altoContraste ? null : (
        <View
          aria-hidden
          className="absolute left-0 top-[7%] w-[30%] rounded-selo"
          style={{ aspectRatio: 1, backgroundColor: cores.decorSol }}
        />
      )}
      <View
        className={`absolute bottom-0 left-[8%] right-0 top-0 overflow-hidden ${
          altoContraste ? 'border-altoContraste border-borda' : ''
        }`}
        style={[
          sombra(3),
          {
            backgroundColor: cores.decorMenta,
            borderTopLeftRadius: 999,
            borderTopRightRadius: 999,
            borderBottomLeftRadius: 36,
            borderBottomRightRadius: 36,
          },
        ]}
      >
        <View
          className="absolute left-0 right-0 items-center"
          style={{ bottom: -4, height: '104%' }}
        >
          <Image
            source={FOTOS.mariana.fonte}
            accessibilityLabel={FOTOS.mariana.alt}
            accessibilityIgnoresInvertColors
            // `contain` mantém a proporção da foto (640 x 856) em qualquer caixa: nunca estica a pessoa.
            resizeMode="contain"
            style={{ width: '100%', height: '100%' }}
          />
        </View>
      </View>

      <View
        className={`${cartao} bottom-[16%] left-0 w-[90%] max-w-[390px]`}
        style={sombra(2)}
        testID="cartao-da-dose"
      >
        <View
          aria-hidden
          className={`h-[46px] w-[46px] items-center justify-center rounded-[15px] ${
            aplicada ? 'bg-aplicadaSuave' : 'bg-atrasadaSuave'
          }`}
        >
          <Icone
            nome={aplicada ? 'aplicada' : 'atrasada'}
            cor={aplicada ? cores.aplicada : cores.atrasada}
            tamanho={24}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Texto variante="corpoNegrito">BCG, dose única</Texto>
          <Texto variante="apoio" className="text-textoSecundario">
            {aplicada ? 'Aplicada hoje' : 'Era para 01/08/2026'}
          </Texto>
        </View>
        <Botao
          titulo={aplicada ? 'Desfazer' : 'Aplicar'}
          accessibilityLabel={aplicada ? 'Desfazer a aplicação da BCG' : 'Aplicar a BCG'}
          variante={aplicada ? 'secundario' : 'principal'}
          tamanho="compacto"
          onPress={() => setAplicada(!aplicada)}
        />
      </View>

      {flutuantes ? (
        <>
          <Paralaxe
            aria-hidden
            fator={0.12}
            maximo={16}
            style={sombra(2)}
            className={`${cartao} right-0 top-[9%]`}
          >
            <Icone nome="lembrete" cor={cores.agendada} tamanho={24} />
            <Texto variante="corpoNegrito" className="text-agendada">
              Lembrete: Covid-19, em 7 dias
            </Texto>
          </Paralaxe>
          <Paralaxe
            aria-hidden
            fator={0.18}
            maximo={20}
            style={sombra(2)}
            className={`${cartao} bottom-[4%] right-[2%]`}
          >
            <Icone nome="voz" cor={cores.primaria} tamanho={24} />
            <Texto variante="corpoNegrito" className="text-primaria">
              Perguntar por voz
            </Texto>
            <Ondas cor={cores.primaria} barras={5} />
          </Paralaxe>
        </>
      ) : null}
    </View>
  );
}
