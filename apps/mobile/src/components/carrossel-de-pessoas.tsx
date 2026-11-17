import type { MemberResponse } from '@vacina/shared';
import { ScrollView, View } from 'react-native';
import { Avatar } from './avatar';
import { Chip } from './chip';

/**
 * Faixa de pessoas da família para trocar de quem se vê as doses, com rolagem lateral. Cada pessoa
 * é um chip com avatar e primeiro nome (em uma linha, com reticências se for muito longo; o nome
 * inteiro vai no rótulo de acessibilidade). A escolhida ganha a cor da marca e é anunciada como
 * selecionada.
 *
 * @param props.pessoas - Pessoas da família, na ordem da lista.
 * @param props.selecionadaId - Pessoa escolhida agora.
 * @param props.aoEscolher - Chamada com o id da pessoa tocada.
 */
export function CarrosselDePessoas({
  pessoas,
  selecionadaId,
  aoEscolher,
}: {
  pessoas: readonly MemberResponse[];
  selecionadaId: string | undefined;
  aoEscolher: (id: string) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Escolher pessoa">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-sm py-xs pr-lg"
      >
        {pessoas.map((pessoa, indice) => (
          <Chip
            key={pessoa.id}
            papel="radio"
            rotulo={pessoa.name.split(' ')[0] ?? pessoa.name}
            rotuloAcessivel={pessoa.name}
            selecionado={pessoa.id === selecionadaId}
            inicio={<Avatar nome={pessoa.name} indice={indice} tamanho={44} />}
            onPress={() => aoEscolher(pessoa.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
