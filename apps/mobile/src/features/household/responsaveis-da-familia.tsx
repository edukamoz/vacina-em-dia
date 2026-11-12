import type { GuardianResponse } from '@vacina/shared';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { EstadoCarregando, EstadoErro } from '../../components/estados';
import { Texto } from '../../components/texto';
import { todayCivil } from '../../lib/dates';
import {
  useCreateHouseholdInvite,
  useHousehold,
  useLeaveHousehold,
  useRemoveGuardian,
  useRevokeHouseholdInvites,
  useTransferHousehold,
} from '../data/hooks';
import { formatCivilDate } from '../doses/format-date';

/** O que a pessoa está fazendo agora na seção: convidando ou confirmando uma ação sobre alguém. */
type Painel =
  | { readonly tipo: 'CONVIDAR' }
  | { readonly tipo: 'REMOVER'; readonly guardian: GuardianResponse }
  | { readonly tipo: 'PASSAR'; readonly guardian: GuardianResponse }
  | { readonly tipo: 'SAIR' };

const ROTULO_DO_PAPEL = { OWNER: 'Dono', GUARDIAN: 'Responsável' } as const;

/** Mensagem de erro de uma ação, em linguagem simples (a API já devolve a frase pronta). */
function Erro({ erro }: { erro: Error | null }) {
  return erro ? (
    <Texto className="text-erro" accessibilityRole="alert">
      {erro.message}
    </Texto>
  ) : null;
}

/** Uma linha da lista: o e-mail parcialmente oculto, se é você e o papel. */
function Linha({ responsavel }: { responsavel: GuardianResponse }) {
  const papel = ROTULO_DO_PAPEL[responsavel.role];
  return (
    <View
      accessible
      accessibilityLabel={`${responsavel.emailHint}${responsavel.isYou ? ', você' : ''}, ${papel}`}
      className="flex-row items-center justify-between gap-sm"
    >
      <Texto
        variante="corpoNegrito"
        importantForAccessibility="no"
        className="shrink"
        numberOfLines={1}
      >
        {responsavel.isYou ? `${responsavel.emailHint} (você)` : responsavel.emailHint}
      </Texto>
      <View className="rounded-selo border-padrao border-borda px-md py-xs">
        <Texto variante="rotulo" importantForAccessibility="no">
          {papel}
        </Texto>
      </View>
    </View>
  );
}

/**
 * Cada responsável é um cartão da lista, todos iguais; o dono vê, dentro do cartão de quem não é
 * ele, as duas ações possíveis lado a lado. Assim a lista cresce uma linha por pessoa, não dois botões largos.
 */
function ItemDoResponsavel({
  responsavel,
  aoPassar,
  aoRemover,
}: {
  responsavel: GuardianResponse;
  aoPassar?: () => void;
  aoRemover?: () => void;
}) {
  const acoes = aoPassar && aoRemover;
  return (
    <View role="listitem" className="gap-sm rounded-cartao border-padrao border-borda p-md">
      <Linha responsavel={responsavel} />
      {acoes ? (
        <View className="flex-row gap-sm">
          <View className="flex-1">
            <Botao
              titulo="Passar a propriedade"
              variante="secundario"
              accessibilityLabel={`Passar a propriedade para ${responsavel.emailHint}`}
              onPress={aoPassar}
            />
          </View>
          <View className="flex-1">
            <Botao
              titulo="Remover"
              variante="perigo"
              accessibilityLabel={`Remover ${responsavel.emailHint}`}
              onPress={aoRemover}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Painel de convite: avisa o que quem entrar vai ver e mostra o código uma única vez. */
function PainelDeConvite({ aoFechar }: { aoFechar: () => void }) {
  const convite = useCreateHouseholdInvite();
  const [copiado, setCopiado] = useState(false);

  if (convite.data) {
    const codigo = convite.data.code;
    const validade = formatCivilDate(todayCivil(new Date(convite.data.expiresAt)));
    return (
      <Cartao className="gap-md">
        <Texto variante="corpoNegrito">Código de convite</Texto>
        <Texto
          variante="titulo2"
          accessibilityLabel={`Código de convite: ${codigo.replace('-', ' ').split('').join(' ')}`}
          selectable
        >
          {codigo}
        </Texto>
        <Texto>{`Vale uma vez e até ${validade}. Mostramos o código só agora: se perder, gere outro.`}</Texto>
        <Botao
          titulo="Copiar código"
          variante="secundario"
          onPress={() => {
            void Clipboard.setStringAsync(codigo).then(() => setCopiado(true));
          }}
        />
        {copiado ? (
          <Texto accessibilityLiveRegion="polite" className="text-sucesso">
            Código copiado.
          </Texto>
        ) : null}
        <Botao titulo="Fechar" variante="secundario" onPress={aoFechar} />
      </Cartao>
    );
  }

  return (
    <Cartao className="gap-md">
      <Texto variante="corpoNegrito">Convidar outro responsável</Texto>
      <Texto>
        Quem entrar com o código vai ver e poder editar os dados de saúde de todas as pessoas da sua
        família. Só convide quem você conhece e em quem confia.
      </Texto>
      <Erro erro={convite.error} />
      <Botao
        titulo="Gerar código"
        carregando={convite.isPending}
        onPress={() => convite.mutate()}
      />
      <Botao titulo="Voltar" variante="secundario" onPress={aoFechar} />
    </Cartao>
  );
}

/**
 * Seção "Responsáveis da família" da aba Conta (B15, ADR-029): quem cuida da família, convite por
 * código, e sair, remover e passar a propriedade, sempre com confirmação. O dono que está só também
 * pode entrar na família de outra pessoa com um código.
 */
export function ResponsaveisDaFamilia() {
  const router = useRouter();
  const familia = useHousehold();
  const convite = useRevokeHouseholdInvites();
  const sair = useLeaveHousehold();
  const remover = useRemoveGuardian();
  const passar = useTransferHousehold();
  const [painel, setPainel] = useState<Painel | null>(null);

  if (familia.isPending) return <EstadoCarregando rotulo="Carregando a família" />;
  if (familia.error) {
    return (
      <EstadoErro mensagem={familia.error.message} onTentarDeNovo={() => void familia.refetch()} />
    );
  }

  const { role, guardians, activeInvites } = familia.data;
  const dono = role === 'OWNER';
  const sozinho = guardians.length === 1;
  const fechar = () => setPainel(null);

  return (
    <View className="gap-md">
      <Texto className="text-textoSecundario">
        {sozinho
          ? 'Hoje só você cuida desta família. Convide outra pessoa para ver e editar as vacinas junto com você.'
          : 'Os responsáveis veem e editam as vacinas de todas as pessoas da família.'}
      </Texto>

      <View
        className="gap-sm"
        accessibilityRole="list"
        accessibilityLabel="Responsáveis da família"
      >
        {guardians.map((responsavel) =>
          dono && !responsavel.isYou ? (
            <ItemDoResponsavel
              key={responsavel.id}
              responsavel={responsavel}
              aoPassar={() => setPainel({ tipo: 'PASSAR', guardian: responsavel })}
              aoRemover={() => setPainel({ tipo: 'REMOVER', guardian: responsavel })}
            />
          ) : (
            <ItemDoResponsavel key={responsavel.id} responsavel={responsavel} />
          ),
        )}
      </View>

      {painel?.tipo === 'CONVIDAR' ? <PainelDeConvite aoFechar={fechar} /> : null}

      {painel?.tipo === 'REMOVER' ? (
        <Cartao className="gap-md border-erro">
          <Texto variante="corpoNegrito">{`Remover ${painel.guardian.emailHint}?`}</Texto>
          <Texto>
            Essa pessoa perde o acesso agora. As pessoas e as doses continuam com a família.
          </Texto>
          <Erro erro={remover.error} />
          <Botao
            titulo="Sim, remover"
            variante="perigo"
            carregando={remover.isPending}
            onPress={() => remover.mutate(painel.guardian.id, { onSuccess: fechar })}
          />
          <Botao titulo="Não, voltar" variante="secundario" onPress={fechar} />
        </Cartao>
      ) : null}

      {painel?.tipo === 'PASSAR' ? (
        <Cartao className="gap-md border-erro">
          <Texto variante="corpoNegrito">{`Passar a propriedade para ${painel.guardian.emailHint}?`}</Texto>
          <Texto>
            Essa pessoa vira a dona da família e você passa a ser responsável. Só o dono convida,
            remove responsáveis e passa a propriedade.
          </Texto>
          <Erro erro={passar.error} />
          <Botao
            titulo="Sim, passar a propriedade"
            variante="perigo"
            carregando={passar.isPending}
            onPress={() => passar.mutate({ guardianId: painel.guardian.id }, { onSuccess: fechar })}
          />
          <Botao titulo="Não, voltar" variante="secundario" onPress={fechar} />
        </Cartao>
      ) : null}

      {painel?.tipo === 'SAIR' ? (
        <Cartao className="gap-md border-erro">
          <Texto variante="corpoNegrito">Sair da família?</Texto>
          <Texto>
            Você perde o acesso às pessoas e às doses da família agora e passa a ter uma família só
            sua, vazia. As pessoas continuam com os outros responsáveis.
          </Texto>
          <Erro erro={sair.error} />
          <Botao
            titulo="Sim, sair da família"
            variante="perigo"
            carregando={sair.isPending}
            onPress={() => sair.mutate(undefined, { onSuccess: fechar })}
          />
          <Botao titulo="Não, voltar" variante="secundario" onPress={fechar} />
        </Cartao>
      ) : null}

      {painel === null ? (
        <View className="gap-md">
          {dono ? (
            <>
              <Botao
                titulo="Convidar outro responsável"
                variante="secundario"
                onPress={() => setPainel({ tipo: 'CONVIDAR' })}
              />
              {activeInvites > 0 ? (
                <View className="gap-sm">
                  <Texto className="text-textoSecundario">
                    {activeInvites === 1
                      ? 'Há 1 convite aberto.'
                      : `Há ${activeInvites} convites abertos.`}
                  </Texto>
                  <Erro erro={convite.error} />
                  <Botao
                    titulo="Cancelar os convites abertos"
                    variante="secundario"
                    carregando={convite.isPending}
                    onPress={() => convite.mutate()}
                  />
                </View>
              ) : null}
              {!sozinho ? (
                <Texto variante="apoio" className="text-textoSecundario">
                  Para sair da família, passe a propriedade a outro responsável antes.
                </Texto>
              ) : null}
            </>
          ) : (
            <Botao
              titulo="Sair da família"
              variante="perigo"
              onPress={() => setPainel({ tipo: 'SAIR' })}
            />
          )}
          {dono && sozinho ? (
            <Botao
              titulo="Entrar na família de outra pessoa"
              variante="secundario"
              onPress={() => router.push('/responsaveis/entrar')}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
