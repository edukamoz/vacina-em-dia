import type { ReactNode } from 'react';
import { Image, View } from 'react-native';
import { FOTOS, FUNDO_DA_CENA } from './fotos';

/**
 * Cena do alto da apresentação: duas pessoas fictícias recortadas sobre um fundo de vidro, e
 * embaixo os cartões de exemplo. No celular a cena é estática; a versão da web
 * (`cena-do-hero.web.tsx`) move as camadas com o mouse.
 *
 * @param props.cartoes - Cartões de exemplo de dose, mostrados sob as pessoas.
 */
export function CenaDoHero({ cartoes }: { cartoes: ReactNode }) {
  return (
    <View className="gap-md">
      <View className="h-[320px]">
        <View className="absolute inset-x-0 bottom-0 top-[40px] overflow-hidden rounded-folha bg-superficieSuave">
          <Image
            source={FUNDO_DA_CENA}
            accessibilityIgnoresInvertColors
            className="absolute h-full w-full"
            resizeMode="cover"
            aria-hidden
          />
        </View>
        <View className="absolute bottom-0 left-0 top-0 w-[56%]">
          <Image
            source={FOTOS.mariana.fonte}
            accessibilityLabel={FOTOS.mariana.alt}
            accessibilityIgnoresInvertColors
            className="h-full w-full"
            resizeMode="contain"
          />
        </View>
        <View className="absolute bottom-0 right-0 top-[40px] w-[46%]">
          <Image
            source={FOTOS.jose.fonte}
            accessibilityLabel={FOTOS.jose.alt}
            accessibilityIgnoresInvertColors
            className="h-full w-full"
            resizeMode="contain"
          />
        </View>
      </View>
      {cartoes}
    </View>
  );
}
