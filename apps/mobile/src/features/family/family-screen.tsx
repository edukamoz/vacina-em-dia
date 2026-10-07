import type { MemberResponse } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '../../components/estados';
import { Grade } from '../../components/grade';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { describeAge, todayCivil } from '../../lib/dates';
import { useSession } from '../../session/session-provider';
import { useMembers } from '../data/hooks';

/** Rótulo de cada faixa etária, em linguagem simples. */
export const GRUPO_ROTULO: Readonly<Record<MemberResponse['ageGroup'], string>> = {
  CHILD: 'Criança',
  ADOLESCENT_YOUTH: 'Adolescente ou jovem',
  ADULT: 'Adulto',
  ELDERLY: 'Idoso',
};

/**
 * Aba "Família" (RF02): as pessoas cadastradas, com atalho para a carteira de cada uma, e o botão
 * de adicionar. É a porta de entrada do app depois do consentimento.
 */
export function FamilyScreen() {
  const router = useRouter();
  const { selectMember } = useSession();
  const { data, error, isPending, refetch } = useMembers();
  const today = todayCivil();

  return (
    <Tela
      reservaBalao
      titulo="Sua família"
      subtitulo="Escolha uma pessoa para ver as vacinas dela."
    >
      {isPending && <EstadoCarregando rotulo="Carregando a família" />}
      {error && <EstadoErro mensagem={error.message} onTentarDeNovo={() => void refetch()} />}
      {data && data.items.length === 0 && (
        <EstadoVazio
          titulo="Ninguém cadastrado ainda"
          descricao="Adicione você, seu filho ou outra pessoa da família para ver o calendário de vacinas."
        />
      )}
      {data && data.items.length > 0 && (
        <Grade>
          {data.items.map((membro) => (
            <Cartao key={membro.id} className="gap-md">
              <Texto variante="titulo3" accessibilityRole="header">
                {membro.name}
              </Texto>
              <Texto className="text-textoSecundario">
                {`${describeAge(membro.birthDate, today)} · ${GRUPO_ROTULO[membro.ageGroup]}${
                  membro.isPregnant ? ' · gestante' : ''
                }`}
              </Texto>
              <View className="gap-sm">
                <Botao
                  titulo={`Ver vacinas de ${membro.name}`}
                  variante="secundario"
                  onPress={() => {
                    selectMember(membro.id);
                    router.push('/');
                  }}
                />
                <Botao
                  titulo={`Editar ${membro.name}`}
                  variante="secundario"
                  onPress={() =>
                    router.push({ pathname: '/membro/[id]', params: { id: membro.id } })
                  }
                />
              </View>
            </Cartao>
          ))}
        </Grade>
      )}
      <Botao titulo="Adicionar pessoa" onPress={() => router.push('/membro/novo')} />
    </Tela>
  );
}
