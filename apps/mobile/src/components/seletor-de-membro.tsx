import type { MemberResponse } from '@vacina/shared';
import { View } from 'react-native';
import { Botao } from './botao';
import { Texto } from './texto';

/**
 * Escolha de quem está sendo consultado: um botão por pessoa da família, com o selecionado
 * destacado (e anunciado como selecionado ao leitor de tela).
 *
 * @param props.membros - Pessoas cadastradas.
 * @param props.selecionadoId - Identificador da pessoa selecionada.
 * @param props.aoSelecionar - Chamada com o identificador escolhido.
 */
export function SeletorDeMembro({
  membros,
  selecionadoId,
  aoSelecionar,
}: {
  membros: readonly MemberResponse[];
  selecionadoId: string | null;
  aoSelecionar: (id: string) => void;
}) {
  return (
    <View className="gap-sm">
      <Texto variante="rotulo">Carteira de</Texto>
      <View className="flex-row flex-wrap gap-sm">
        {membros.map((membro) => (
          <View key={membro.id} className="min-w-[120px]">
            <Botao
              titulo={membro.name}
              variante={membro.id === selecionadoId ? 'principal' : 'secundario'}
              selecionado={membro.id === selecionadoId}
              onPress={() => aoSelecionar(membro.id)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
