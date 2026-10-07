import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Botao } from '../../components/botao';
import { CampoTexto } from '../../components/campo-texto';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '../../components/estados';
import { SeletorDeData } from '../../components/seletor-de-data';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { todayCivil } from '../../lib/dates';
import { useSelectedMember } from '../calendar/use-selected-member';
import { useCreateCustomDose } from '../data/hooks';
import { formatCivilDate } from './format-date';

/** Formulário da dose avulsa de uma pessoa já escolhida. */
function CustomDoseForm({ memberId, memberName }: { memberId: string; memberName: string }) {
  const router = useRouter();
  const create = useCreateCustomDose(memberId);
  const [vacina, setVacina] = useState('');
  const [dose, setDose] = useState('');
  const [data, setData] = useState(() => todayCivil());
  const [tentou, setTentou] = useState(false);

  const erroVacina = tentou && vacina.trim().length < 2 ? 'Informe o nome da vacina.' : undefined;
  const erroDose =
    tentou && dose.trim() === '' ? 'Informe qual é a dose, por exemplo 1ª dose.' : undefined;

  function salvar() {
    setTentou(true);
    if (vacina.trim().length < 2 || dose.trim() === '') return;
    create.mutate(
      { vaccine: vacina.trim(), doseLabel: dose.trim(), dueDate: data },
      {
        onSuccess: (criada) =>
          router.replace({ pathname: '/dose/[id]', params: { id: criada.id } }),
      },
    );
  }

  return (
    <Tela
      titulo="Adicionar dose"
      subtitulo={`Para ${memberName}. Use para uma vacina que não aparece no calendário oficial.`}
      voltar
    >
      <CampoTexto
        rotulo="Nome da vacina"
        value={vacina}
        onChangeText={setVacina}
        autoComplete="off"
        maxLength={80}
        erro={erroVacina}
      />
      <CampoTexto
        rotulo="Qual dose"
        value={dose}
        onChangeText={setDose}
        autoComplete="off"
        maxLength={40}
        placeholder="1ª dose"
        ajuda="Por exemplo: 1ª dose, reforço, dose única."
        erro={erroDose}
      />
      <View className="gap-sm">
        <Texto variante="rotulo">Data prevista</Texto>
        <SeletorDeData
          rotulo="Data prevista"
          valor={data}
          aoEscolher={setData}
          minimo={todayCivil()}
        />
        <Texto accessibilityLiveRegion="polite">{`Data escolhida: ${formatCivilDate(data)}`}</Texto>
        <Texto variante="apoio" className="text-textoSecundario">
          Se a vacina já foi tomada, adicione a dose e depois toque em &quot;Registrar
          aplicação&quot;.
        </Texto>
      </View>

      <Texto variante="apoio" className="text-textoSecundario">
        Esta dose fica marcada como &quot;Adicionada por você&quot;: não faz parte do calendário
        oficial. O aplicativo não substitui a orientação de profissionais de saúde.
      </Texto>

      {create.error ? (
        <Texto className="text-erro" accessibilityRole="alert">
          {create.error.message}
        </Texto>
      ) : null}
      <Botao titulo="Adicionar dose" disabled={create.isPending} onPress={salvar} />
    </Tela>
  );
}

/** Tela "Adicionar dose" (RF04): cadastra uma dose avulsa para a pessoa escolhida. */
export function NewDoseScreen() {
  const router = useRouter();
  const { members, selected } = useSelectedMember();

  if (members.isPending) {
    return (
      <Tela titulo="Adicionar dose" voltar>
        <EstadoCarregando rotulo="Carregando a família" />
      </Tela>
    );
  }
  if (members.error) {
    return (
      <Tela titulo="Adicionar dose" voltar>
        <EstadoErro
          mensagem={members.error.message}
          onTentarDeNovo={() => void members.refetch()}
        />
      </Tela>
    );
  }
  if (!selected) {
    return (
      <Tela titulo="Adicionar dose" voltar>
        <EstadoVazio
          titulo="Nenhuma pessoa cadastrada"
          descricao="Adicione alguém da família antes de cadastrar uma dose."
        />
        <Botao titulo="Adicionar pessoa" onPress={() => router.push('/membro/novo')} />
      </Tela>
    );
  }
  return <CustomDoseForm memberId={selected.id} memberName={selected.name} />;
}
