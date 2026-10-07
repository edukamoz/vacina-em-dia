import type { DoseResponse, DoseStatus, MemberResponse } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '../../components/estados';
import { Grade } from '../../components/grade';
import { LinkTexto } from '../../components/link-texto';
import { SeloEstadoDose } from '../../components/selo-estado-dose';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { describeAge, todayCivil } from '../../lib/dates';
import { useSession } from '../../session/session-provider';
import { useDosesOfMembers, useMembers } from '../data/hooks';

/** Rótulo de cada faixa etária, em linguagem simples. */
export const GRUPO_ROTULO: Readonly<Record<MemberResponse['ageGroup'], string>> = {
  CHILD: 'Criança',
  ADOLESCENT_YOUTH: 'Adolescente ou jovem',
  ADULT: 'Adulto',
  ELDERLY: 'Idoso',
};

/** Resumo de uma pessoa para o selo do cartão: o estado que dá a cor e o texto. */
export interface ResumoDaPessoa {
  readonly status: DoseStatus;
  readonly rotulo: string;
}

/**
 * Resume as doses de uma pessoa em uma frase com cor: atrasadas primeiro (pedem ação), depois
 * agendadas e, se não houver nenhuma das duas, "Nenhuma dose atrasada". Não diz "em dia" porque
 * doses "conforme histórico vacinal" continuam abertas até a pessoa conferir a caderneta.
 */
export function resumoDaPessoa(doses: readonly Pick<DoseResponse, 'status'>[]): ResumoDaPessoa {
  const conta = (status: DoseStatus) => doses.filter((dose) => dose.status === status).length;
  const atrasadas = conta('OVERDUE');
  if (atrasadas > 0) {
    return {
      status: 'OVERDUE',
      rotulo: `${atrasadas} ${atrasadas === 1 ? 'dose atrasada' : 'doses atrasadas'}`,
    };
  }
  const agendadas = conta('SCHEDULED');
  if (agendadas > 0) {
    return {
      status: 'SCHEDULED',
      rotulo: `${agendadas} ${agendadas === 1 ? 'dose agendada' : 'doses agendadas'}`,
    };
  }
  return { status: 'APPLIED', rotulo: 'Nenhuma dose atrasada' };
}

/**
 * Aba "Família" (RF02): as pessoas cadastradas, cada uma com o resumo das doses; tocar no cartão
 * abre as doses da pessoa. O botão de adicionar fica no alto, como no design.
 */
export function FamilyScreen() {
  const router = useRouter();
  const { selectMember } = useSession();
  const { data, error, isPending, refetch } = useMembers();
  const today = todayCivil();
  const pessoas = data?.items ?? [];
  const doses = useDosesOfMembers(pessoas.map((pessoa) => pessoa.id));

  return (
    <Tela reservaBalao titulo="Família">
      <Botao titulo="Adicionar pessoa" icone="mais" onPress={() => router.push('/membro/novo')} />
      {isPending && <EstadoCarregando rotulo="Carregando a família" />}
      {error && <EstadoErro mensagem={error.message} onTentarDeNovo={() => void refetch()} />}
      {data && pessoas.length === 0 && (
        <EstadoVazio
          titulo="Ninguém cadastrado ainda"
          descricao="Adicione você, seu filho ou outra pessoa da família para ver o calendário de vacinas."
        />
      )}
      {pessoas.length > 0 && (
        <Grade>
          {pessoas.map((membro, indice) => {
            const lista = doses[indice]?.data?.items;
            const resumo = lista ? resumoDaPessoa(lista) : null;
            return (
              <Cartao key={membro.id} className="gap-sm">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ver vacinas de ${membro.name}`}
                  onPress={() => {
                    selectMember(membro.id);
                    router.push('/');
                  }}
                  className="gap-sm"
                >
                  <Texto variante="titulo3" importantForAccessibility="no">
                    {membro.name}
                  </Texto>
                  <Texto className="text-textoSecundario" importantForAccessibility="no">
                    {`${describeAge(membro.birthDate, today)} · ${GRUPO_ROTULO[membro.ageGroup]}${
                      membro.isPregnant ? ' · gestante' : ''
                    }`}
                  </Texto>
                  {resumo ? <SeloEstadoDose status={resumo.status} rotulo={resumo.rotulo} /> : null}
                </Pressable>
                <LinkTexto
                  titulo={`Editar ${membro.name}`}
                  onPress={() =>
                    router.push({ pathname: '/membro/[id]', params: { id: membro.id } })
                  }
                />
              </Cartao>
            );
          })}
        </Grade>
      )}
    </Tela>
  );
}
