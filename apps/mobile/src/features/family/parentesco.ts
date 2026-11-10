import { RELATIONSHIPS, SPECIES, type Relationship, type Species } from '@vacina/shared';
import type { OpcaoDeSelecao } from '../../components/selecao';

/** Texto de cada parentesco, em linguagem simples (a pessoa vista por quem usa a conta). */
export const PARENTESCO_ROTULO: Readonly<Record<Relationship, string>> = {
  SELF: 'Você',
  MOTHER: 'Mãe',
  FATHER: 'Pai',
  SON: 'Filho',
  DAUGHTER: 'Filha',
  GRANDMOTHER: 'Avó',
  GRANDFATHER: 'Avô',
  SISTER: 'Irmã',
  BROTHER: 'Irmão',
  SPOUSE: 'Cônjuge',
  OTHER: 'Outro parente ou pessoa cuidada',
};

/** Opções do campo de parentesco: "Prefiro não informar" primeiro, depois a lista. */
export const OPCOES_DE_PARENTESCO: readonly OpcaoDeSelecao<Relationship>[] = [
  { valor: null, rotulo: 'Prefiro não informar' },
  ...RELATIONSHIPS.map((valor) => ({ valor, rotulo: PARENTESCO_ROTULO[valor] })),
];

/** Nome de cada espécie de animal, em linguagem simples. */
export const ESPECIE_ROTULO: Readonly<Record<Species, string>> = {
  DOG: 'Cachorro',
  CAT: 'Gato',
  OTHER: 'Outro animal',
};

/** Opções do campo de espécie. */
export const OPCOES_DE_ESPECIE: readonly OpcaoDeSelecao<Species>[] = SPECIES.map((valor) => ({
  valor,
  rotulo: ESPECIE_ROTULO[valor],
}));
