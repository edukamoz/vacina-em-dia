import {
  canBePregnant,
  type MemberKind,
  type MemberResponse,
  type Relationship,
  type Species,
} from '@vacina/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Alternar } from '../../components/alternar';
import { Botao } from '../../components/botao';
import { CampoTexto } from '../../components/campo-texto';
import { Cartao } from '../../components/cartao';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '../../components/estados';
import { GrupoDeRadios } from '../../components/grupo-de-radios';
import { Selecao } from '../../components/selecao';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { maskBrDate, parseBrDate, todayCivil } from '../../lib/dates';
import { useSession } from '../../session/session-provider';
import { formatCivilDate } from '../doses/format-date';
import { OPCOES_DE_ESPECIE, OPCOES_DE_PARENTESCO } from './parentesco';
import { useCreateMember, useDeleteMember, useMembers, useUpdateMember } from '../data/hooks';

interface FormProps {
  readonly membro?: MemberResponse;
}

/** Formulário de pessoa (cadastro e edição): nome ou apelido, nascimento, parentesco e grupo gestante. */
function MemberForm({ membro }: FormProps) {
  const router = useRouter();
  const { selectMember } = useSession();
  const create = useCreateMember();
  const update = useUpdateMember(membro?.id ?? '');
  const remove = useDeleteMember();

  const [nome, setNome] = useState(membro?.name ?? '');
  const [nascimento, setNascimento] = useState(membro ? formatCivilDate(membro.birthDate) : '');
  const [gestante, setGestante] = useState(membro?.isPregnant ?? false);
  const [parentesco, setParentesco] = useState<Relationship | null>(membro?.relationship ?? null);
  const [tipo, setTipo] = useState<MemberKind>(membro?.kind ?? 'PERSON');
  const [especie, setEspecie] = useState<Species | null>(membro?.species ?? null);
  const [tentou, setTentou] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  // Pai, filho, avô e irmão não têm o campo de gestante; se estava marcado, deixa de valer.
  const animal = tipo === 'PET';
  const mostraGestante = !animal && canBePregnant(parentesco);
  const birthDate = parseBrDate(nascimento);
  const erroNome = tentou && nome.trim() === '' ? 'Informe o nome ou um apelido.' : undefined;
  const erroNascimento =
    tentou && !birthDate
      ? 'Digite a data completa, por exemplo 20/05/2024.'
      : tentou && birthDate && birthDate > todayCivil()
        ? 'A data de nascimento não pode ser no futuro.'
        : undefined;
  const erroEspecie = tentou && animal && !especie ? 'Escolha a espécie do animal.' : undefined;
  const mutation = membro ? update : create;

  function salvar() {
    setTentou(true);
    if (nome.trim() === '' || !birthDate || birthDate > todayCivil()) return;
    if (animal && !especie) return;
    mutation.mutate(
      animal
        ? { name: nome.trim(), birthDate, kind: 'PET', species: especie }
        : {
            name: nome.trim(),
            birthDate,
            isPregnant: mostraGestante && gestante,
            relationship: parentesco,
          },
      {
        onSuccess: (salvo) => {
          selectMember(salvo.id);
          if (membro) router.back();
          else router.replace('/');
        },
      },
    );
  }

  return (
    <Tela
      titulo={membro ? `Editar ${membro.name}` : animal ? 'Adicionar animal' : 'Adicionar pessoa'}
      subtitulo={
        animal
          ? 'Animais não têm calendário oficial: você cadastra as vacinas que o veterinário indicar.'
          : 'Guardamos só o necessário. Pode usar um apelido.'
      }
      modal
    >
      {membro ? null : (
        <GrupoDeRadios
          rotulo="O que você quer adicionar?"
          valor={tipo}
          opcoes={[
            { valor: 'PERSON', rotulo: 'Uma pessoa da família' },
            { valor: 'PET', rotulo: 'Um animal de estimação' },
          ]}
          aoEscolher={setTipo}
        />
      )}
      <CampoTexto
        rotulo={animal ? 'Nome do animal' : 'Nome ou apelido'}
        value={nome}
        onChangeText={setNome}
        autoComplete="off"
        maxLength={60}
        erro={erroNome}
      />
      <CampoTexto
        rotulo={animal ? 'Data de nascimento (aproximada)' : 'Data de nascimento'}
        value={nascimento}
        onChangeText={(texto) => setNascimento(maskBrDate(texto))}
        keyboardType="number-pad"
        placeholder="DD/MM/AAAA"
        maxLength={10}
        ajuda={
          animal
            ? 'Se não souber o dia, informe uma data aproximada. Exemplo: 20/05/2024.'
            : 'Dia, mês e ano. Exemplo: 20/05/2024.'
        }
        erro={erroNascimento}
      />
      {animal ? (
        <View className="gap-xs">
          <Selecao
            rotulo="Qual é a espécie?"
            valor={especie}
            opcoes={OPCOES_DE_ESPECIE}
            aoEscolher={setEspecie}
          />
          {erroEspecie ? (
            <Texto variante="apoio" className="text-erro" accessibilityRole="alert">
              {erroEspecie}
            </Texto>
          ) : null}
        </View>
      ) : (
        <Selecao
          rotulo="Quem é esta pessoa para você?"
          valor={parentesco}
          opcoes={OPCOES_DE_PARENTESCO}
          aoEscolher={setParentesco}
        />
      )}
      {mostraGestante ? (
        <Alternar
          rotulo="Esta pessoa está grávida (inclui as vacinas da gestação)"
          marcado={gestante}
          aoAlterar={setGestante}
        />
      ) : null}

      {mutation.error ? (
        <Texto className="text-erro" accessibilityRole="alert">
          {mutation.error.message}
        </Texto>
      ) : null}

      <Botao
        titulo={membro ? 'Salvar alterações' : 'Salvar e ver as vacinas'}
        carregando={mutation.isPending}
        onPress={salvar}
      />

      {membro && !confirmandoExclusao ? (
        <Botao
          titulo={`Excluir ${membro.name}`}
          variante="perigo"
          onPress={() => setConfirmandoExclusao(true)}
        />
      ) : null}
      {membro && confirmandoExclusao ? (
        <Cartao className="gap-md border-erro">
          <Texto variante="corpoNegrito">{`Excluir ${membro.name}?`}</Texto>
          <Texto>As vacinas e o histórico dessa pessoa serão apagados. Não dá para desfazer.</Texto>
          {remove.error ? (
            <Texto className="text-erro" accessibilityRole="alert">
              {remove.error.message}
            </Texto>
          ) : null}
          <View className="gap-sm">
            <Botao
              titulo="Sim, excluir"
              variante="perigo"
              carregando={remove.isPending}
              onPress={() =>
                remove.mutate(membro.id, {
                  onSuccess: () => {
                    selectMember(null);
                    router.replace('/');
                  },
                })
              }
            />
            <Botao
              titulo="Não, voltar"
              variante="secundario"
              onPress={() => setConfirmandoExclusao(false)}
            />
          </View>
        </Cartao>
      ) : null}
    </Tela>
  );
}

/** Tela "Adicionar pessoa" (RF02). */
export function NewMemberScreen() {
  return <MemberForm />;
}

/** Tela "Editar pessoa" (RF02): busca a pessoa na lista e abre o formulário preenchido. */
export function EditMemberScreen({ id }: { id: string }) {
  const { data, error, isPending, refetch } = useMembers();
  const membro = data?.items.find((item) => item.id === id);

  if (isPending) {
    return (
      <Tela titulo="Editar pessoa" modal>
        <EstadoCarregando rotulo="Carregando a pessoa" />
      </Tela>
    );
  }
  if (error) {
    return (
      <Tela titulo="Editar pessoa" modal>
        <EstadoErro mensagem={error.message} onTentarDeNovo={() => void refetch()} />
      </Tela>
    );
  }
  if (!membro) {
    return (
      <Tela titulo="Editar pessoa" modal>
        <EstadoVazio
          titulo="Pessoa não encontrada"
          descricao="Ela pode ter sido excluída. Volte e escolha outra pessoa."
        />
      </Tela>
    );
  }
  return <MemberForm membro={membro} />;
}
