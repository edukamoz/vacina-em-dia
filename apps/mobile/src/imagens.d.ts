/** Imagens importadas pelo Metro viram um valor aceito pela propriedade `source` do `Image`. */
declare module '*.jpg' {
  import type { ImageSourcePropType } from 'react-native';

  const fonte: ImageSourcePropType;
  export default fonte;
}

declare module '*.webp' {
  import type { ImageSourcePropType } from 'react-native';

  const fonte: ImageSourcePropType;
  export default fonte;
}
