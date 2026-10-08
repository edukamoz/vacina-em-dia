import type { MemberResponse } from '@vacina/shared';
import { Pressable, ScrollView, View } from 'react-native';
import { useVisual } from '../theme/theme-provider';
import { Avatar } from './avatar';
import { Texto } from './texto';

/**
 * Faixa de pessoas da família para trocar de quem se vê as doses, com rolagem lateral. A pessoa
 * escolhida ganha borda e sombra e é anunciada como selecionada; cada chip tem avatar e nome.
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
  const { sombra, altoContraste } = useVisual();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Escolher pessoa">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-sm py-xs"
      >
        {pessoas.map((pessoa, indice) => {
          const ativa = pessoa.id === selecionadaId;
          return (
            <Pressable
              key={pessoa.id}
              accessibilityRole="radio"
              accessibilityLabel={pessoa.name}
              accessibilityState={{ selected: ativa, checked: ativa }}
              onPress={() => aoEscolher(pessoa.id)}
              style={ativa ? sombra(1) : undefined}
              className={`min-h-toque min-w-[84px] items-center gap-xs rounded-[20px] border-padrao p-sm ${
                ativa
                  ? `border-primaria bg-superficie ${altoContraste ? 'border-altoContraste' : ''}`
                  : 'border-transparent'
              }`}
            >
              <Avatar nome={pessoa.name} indice={indice} />
              <Texto
                variante={ativa ? 'rotulo' : 'apoio'}
                className="text-texto"
                importantForAccessibility="no"
              >
                {pessoa.name.split(' ')[0] ?? pessoa.name}
              </Texto>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
