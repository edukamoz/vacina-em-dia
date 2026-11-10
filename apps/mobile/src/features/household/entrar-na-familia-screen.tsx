import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ApiRequestError } from '../../api/client';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { CampoTexto } from '../../components/campo-texto';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { useJoinHousehold } from '../data/hooks';

/**
 * Tela "Entrar na família" (B15, ADR-029): a pessoa digita o código recebido do dono. Se já tem
 * pessoas cadastradas, a API pede a confirmação de levá-las; só com ela as pessoas passam para a
 * nova família.
 */
export function EntrarNaFamiliaScreen() {
  const router = useRouter();
  const entrar = useJoinHousehold();
  const [codigo, setCodigo] = useState('');
  const [tentou, setTentou] = useState(false);

  const erro = entrar.error;
  const pedeConfirmacao =
    erro instanceof ApiRequestError &&
    erro.code === 'HOUSEHOLD_HAS_MEMBERS' &&
    erro.memberCount !== undefined;
  const erroDoCodigo =
    tentou && codigo.trim() === '' ? 'Digite o código que você recebeu.' : undefined;

  function enviar(levarPessoas: boolean) {
    setTentou(true);
    if (codigo.trim() === '') return;
    entrar.mutate({ code: codigo.trim(), ...(levarPessoas ? { moveMembers: true } : {}) });
  }

  if (entrar.data) {
    const { moved } = entrar.data;
    return (
      <Tela titulo="Você entrou na família" modal>
        <Cartao className="gap-md">
          <Texto variante="corpoNegrito" accessibilityLiveRegion="polite">
            Pronto! Agora você é responsável por esta família.
          </Texto>
          <Texto>
            {moved > 0
              ? `${moved === 1 ? '1 pessoa sua passou' : `${moved} pessoas suas passaram`} para a família, e os outros responsáveis também as veem.`
              : 'Você já vê as pessoas e as doses da família.'}
          </Texto>
        </Cartao>
        <Botao titulo="Ver a família" onPress={() => router.replace('/conta')} />
      </Tela>
    );
  }

  return (
    <Tela
      titulo="Entrar na família"
      subtitulo="Use o código que o dono da família enviou para você."
      modal
    >
      <CampoTexto
        rotulo="Código de convite"
        value={codigo}
        onChangeText={setCodigo}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={16}
        ajuda="Parece com ABCDE-FGHJK. O código vale uma vez e por 7 dias; pode digitar com ou sem o traço."
        erro={erroDoCodigo}
      />

      {pedeConfirmacao ? (
        <Cartao className="gap-md border-erro">
          <Texto variante="corpoNegrito">
            {erro.memberCount === 1
              ? 'Você já tem 1 pessoa cadastrada.'
              : `Você já tem ${erro.memberCount} pessoas cadastradas.`}
          </Texto>
          <Texto>
            Se continuar, elas passam para a nova família e todos os responsáveis poderão ver e
            editar os dados delas.
          </Texto>
          <Botao
            titulo="Levar minhas pessoas e entrar"
            carregando={entrar.isPending}
            onPress={() => enviar(true)}
          />
          <Botao titulo="Voltar" variante="secundario" onPress={() => entrar.reset()} />
        </Cartao>
      ) : (
        <View className="gap-md">
          {erro ? (
            <Texto className="text-erro" accessibilityRole="alert">
              {erro.message}
            </Texto>
          ) : null}
          <Botao
            titulo="Entrar na família"
            carregando={entrar.isPending}
            onPress={() => enviar(false)}
          />
        </View>
      )}

      <Texto variante="apoio" className="text-textoSecundario">
        Ao entrar, você passa a ver os dados de saúde das pessoas da família, e os outros
        responsáveis passam a ver os seus.
      </Texto>
    </Tela>
  );
}
