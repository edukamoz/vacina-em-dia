import type { ReactNode } from 'react';
import { Image, View } from 'react-native';
import { FOTOS, FUNDO_DA_CENA } from './fotos';

/**
 * Cena do alto da apresentação: duas fotos de pessoas fictícias sobre um fundo de vidro, e embaixo
 * os cartões de exemplo. No celular a cena é estática; a versão da web (`cena-do-hero.web.tsx`)
 * move as camadas com o mouse.
 *
 * @param props.cartoes - Cartões de exemplo de dose, mostrados sob as fotos.
 */
export function CenaDoHero({ cartoes }: { cartoes: ReactNode }) {
  return (
    <View className="gap-md">
      <View className="h-[300px] overflow-hidden rounded-folha bg-superficieSuave">
        <Image
          source={FUNDO_DA_CENA}
          accessibilityIgnoresInvertColors
          className="absolute h-full w-full"
          resizeMode="cover"
          aria-hidden
        />
        <View className="absolute bottom-md left-md top-md w-[46%]">
          <Image
            source={FOTOS.mariana.fonte}
            accessibilityLabel={FOTOS.mariana.alt}
            accessibilityIgnoresInvertColors
            className="h-full w-full rounded-[22px] border-[5px] border-superficie"
            resizeMode="cover"
          />
        </View>
        <View className="absolute bottom-md right-md top-[60px] w-[40%]">
          <Image
            source={FOTOS.jose.fonte}
            accessibilityLabel={FOTOS.jose.alt}
            accessibilityIgnoresInvertColors
            className="h-full w-full rounded-[22px] border-[5px] border-superficie"
            resizeMode="cover"
          />
        </View>
      </View>
      {cartoes}
    </View>
  );
}
