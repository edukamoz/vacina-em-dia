import type { ImageSourcePropType } from 'react-native';
import mariana_e_bebe from '../../../assets/images/pessoas/mariana-e-bebe.jpg';
import sr_jose from '../../../assets/images/pessoas/sr-jose.jpg';
import carla_cuidadora from '../../../assets/images/pessoas/carla-cuidadora.jpg';
import bebe from '../../../assets/images/pessoas/bebe.jpg';
import crianca from '../../../assets/images/pessoas/crianca.jpg';
import gestante from '../../../assets/images/pessoas/gestante.jpg';
import fundo from '../../../assets/images/pessoas/fundo.jpg';

/** Uma foto da apresentação: arquivo, descrição para o leitor de tela e onde fica o rosto. */
export interface Foto {
  readonly fonte: ImageSourcePropType;
  readonly alt: string;
  /** Posição vertical do recorte quadrado ou redondo, para o rosto não ficar de fora. */
  readonly rosto: string;
}

/**
 * Fotos da apresentação. São imagens geradas por inteligência artificial: as pessoas não existem.
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
  bebe: {
    fonte: bebe,
    alt: 'Bebê sorrindo, personagem fictício',
    rosto: '30%',
  },
  crianca: {
    fonte: crianca,
    alt: 'Criança sorrindo com um curativo no braço, personagem fictícia',
    rosto: '25%',
  },
  gestante: {
    fonte: gestante,
    alt: 'Gestante sorrindo com a mão na barriga, personagem fictícia',
    rosto: '22%',
  },
} as const satisfies Record<string, Foto>;

/** Fundo de vidro com cápsulas e símbolos de saúde, atrás das fotos do alto da apresentação. */
export const FUNDO_DA_CENA = fundo;
