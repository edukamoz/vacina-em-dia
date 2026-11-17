import type { ImageSourcePropType } from 'react-native';
import mariana_e_bebe from '../../../assets/images/pessoas/mariana-e-bebe.webp';
import sr_jose from '../../../assets/images/pessoas/sr-jose.webp';
import carla_cuidadora from '../../../assets/images/pessoas/carla-cuidadora.webp';

/** Uma pessoa da apresentação: arquivo, descrição para o leitor de tela e onde fica o rosto. */
export interface Foto {
  readonly fonte: ImageSourcePropType;
  readonly alt: string;
  /** Posição vertical do recorte quadrado ou redondo, para o rosto não ficar de fora. */
  readonly rosto: string;
}

/**
 * Pessoas da apresentação, recortadas do fundo (WebP com transparência). São imagens geradas por inteligência artificial: as pessoas não existem.
 * A apresentação avisa isso ao pé da página.
 */
export const FOTOS = {
  mariana: {
    fonte: mariana_e_bebe,
    alt: 'Mariana, personagem fictícia, sorri ao olhar o celular com o bebê no colo',
    rosto: '30%',
  },
  jose: {
    fonte: sr_jose,
    alt: 'Sr. José, personagem fictício, fala com o celular e sorri',
    rosto: '22%',
  },
  carla: {
    fonte: carla_cuidadora,
    alt: 'Carla, personagem fictícia, segura um tablet e uma carteirinha de vacinação',
    rosto: '25%',
  },
} as const satisfies Record<string, Foto>;
