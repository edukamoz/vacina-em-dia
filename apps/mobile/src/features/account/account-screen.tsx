import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Avatar } from '../../components/avatar';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { Chave } from '../../components/chave';
import { Icone, type NomeDoIcone } from '../../components/icone';
import { LinkTexto } from '../../components/link-texto';
import { SeletorDeMovimento } from '../../components/seletor-de-movimento';
import { SeletorDeTamanhoDoTexto } from '../../components/seletor-de-tamanho-do-texto';
import { SeletorDeTema } from '../../components/seletor-de-tema';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { PIX_DA_DOACAO } from '../../lib/config-pix';
import { modoDeLayout } from '../../lib/layout';
import { useSession } from '../../session/session-provider';
import { useTheme, useThemeColors } from '../../theme/theme-provider';
import { CabecalhoDaConta } from './cabecalho-da-conta';
import {
  useConsent,
  useDeleteAccount,
  useMembers,
  useReminders,
  useSetEmailReminders,
} from '../data/hooks';

/** Seção da conta: cartão com um quadro de ícone, título, frase de apoio e o conteúdo. */
function Secao({
  icone,
  titulo,
  apoio,
  children,
}: {
  icone: NomeDoIcone;
  titulo: string;
  apoio: string;
  children: ReactNode;
}) {
  const cores = useThemeColors();
  return (
    <Cartao className="gap-lg expandido:flex-1">
      <View className="flex-row items-start gap-md">
        <View
          aria-hidden
          className="h-[48px] w-[48px] items-center justify-center rounded-botao border-padrao border-primaria bg-primariaSuave"
        >
          <Icone nome={icone} cor={cores.primaria} />
        </View>
        <View className="flex-1">
          <Texto variante="titulo3" accessibilityRole="header">
            {titulo}
          </Texto>
          <Texto variante="apoio" className="text-textoSecundario">
            {apoio}
          </Texto>
        </View>
      </View>
      {children}
    </Cartao>
  );
}

/**
 * Aba "Conta" (RF09): dados da conta e tema lado a lado (uma coluna no celular), depois privacidade
 * e sobre o aplicativo, e por fim sair e excluir a conta com todos os dados. A exclusão sempre pede
 * uma confirmação.
 */
export function AccountScreen() {
  const router = useRouter();
  const { account, logout, endSession } = useSession();
  const consent = useConsent();
  const remove = useDeleteAccount();
  const reminders = useReminders();
  const setEmail = useSetEmailReminders();
  const [confirmando, setConfirmando] = useState(false);

  const members = useMembers();
  const pessoas = members.data?.items ?? [];
  const email = account?.email ?? 'Sem e-mail';
  const { movimento, movimentoReduzido } = useTheme();
  // Na barra lateral (tablet e computador) o "Sair" já fica ao lado da aba Conta.
  const celular = modoDeLayout(useWindowDimensions().width) === 'compacto';

  return (
    <Tela reservaBalao titulo="Conta">
      <CabecalhoDaConta email={email} />

      {celular ? (
        <View className="flex-row">
          <Botao titulo="Sair" icone="sair" variante="secundario" onPress={() => void logout()} />
        </View>
      ) : null}

      <View className="gap-lg expandido:flex-row expandido:items-stretch">
        <Secao
          icone="familia"
          titulo="Sua família"
          apoio={`${pessoas.length} ${pessoas.length === 1 ? 'pessoa acompanhada' : 'pessoas acompanhadas'}`}
        >
          <View className="flex-row flex-wrap items-center justify-between gap-md">
            <View className="flex-row" aria-hidden>
              {pessoas.slice(0, 5).map((pessoa, indice) => (
                <View
                  key={pessoa.id}
                  className="rounded-selo border-[3px] border-superficie"
                  style={{ marginLeft: indice === 0 ? 0 : -10 }}
                >
                  <Avatar nome={pessoa.name} indice={indice} tamanho={44} />
                </View>
              ))}
            </View>
            <Botao
              titulo="Ver família"
              variante="secundario"
              onPress={() => router.push('/familia')}
            />
          </View>
        </Secao>
        <Secao
          icone="lembrete"
          titulo="Lembretes"
          apoio="O aviso dentro do aplicativo sempre aparece na aba Doses."
        >
          <Texto className="text-textoSecundario">
            Se quiser, também enviamos um e-mail às 8h, no dia da vacina e 7 dias antes. O e-mail
            traz só a quantidade de vacinas, sem nomes.
          </Texto>
          {reminders.data ? (
            <Chave
              rotulo="Receber lembretes por e-mail"
              ligada={reminders.data.emailEnabled}
              aoAlterar={(valor) => setEmail.mutate(valor)}
            />
          ) : null}
          {setEmail.error ? (
            <Texto className="text-erro" accessibilityRole="alert">
              Não foi possível salvar. Tente de novo.
            </Texto>
          ) : null}
        </Secao>
      </View>

      <View className="gap-lg expandido:flex-row expandido:items-stretch">
        <Secao
          icone="doses"
          titulo="Texto"
          apoio="Aumente as letras do aplicativo, além do tamanho do aparelho"
        >
          <SeletorDeTamanhoDoTexto />
        </Secao>
        <Secao icone="info" titulo="Movimento" apoio="Animações e efeitos de transição">
          <SeletorDeMovimento />
          <Texto variante="apoio" className="text-textoSecundario">
            {movimentoReduzido && movimento !== 'reduzir'
              ? 'O movimento está parado agora pelo aparelho ou pelo tema Alto contraste.'
              : 'Em "Reduzir movimento", as telas aparecem prontas, sem animações.'}
          </Texto>
        </Secao>
      </View>

      <View className="gap-lg expandido:flex-row expandido:items-stretch">
        <Secao icone="doses" titulo="Tema" apoio="Como o aplicativo aparece para você">
          <SeletorDeTema />
        </Secao>
        <Secao icone="info" titulo="Privacidade" apoio="Seus dados e os documentos do aplicativo">
          {consent.data?.accepted ? (
            <Texto>{`Você aceitou o termo de consentimento (versão ${consent.data.termVersion}).`}</Texto>
          ) : (
            <Texto>Você ainda não aceitou o termo de consentimento.</Texto>
          )}
          <Texto className="text-textoSecundario">
            Guardamos só nome ou apelido, data de nascimento e as doses de cada pessoa, e a foto de
            perfil, se você escolher uma. Não pedimos CPF nem Cartão Nacional de Saúde.
          </Texto>
          <LinkTexto titulo="Política de privacidade" onPress={() => router.push('/privacidade')} />
          <LinkTexto titulo="Termos de uso" onPress={() => router.push('/termos')} />
        </Secao>
      </View>

      <Secao icone="info" titulo="Sobre o calendário" apoio="De onde vêm as vacinas indicadas">
        <Texto className="text-textoSecundario">
          O calendário segue o Calendário Nacional de Vacinação 2026, do Ministério da Saúde. O
          aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.
        </Texto>
      </Secao>

      {PIX_DA_DOACAO ? (
        <Secao
          icone="coracao"
          titulo="Apoie o projeto"
          apoio="Uma doação voluntária por Pix, de qualquer valor"
        >
          <Texto className="text-textoSecundario">
            O aplicativo é gratuito e continuará sendo. A doação não libera nada e é opcional.
          </Texto>
          <View className="flex-row">
            <Botao
              titulo="Doar com Pix"
              variante="secundario"
              onPress={() => router.push('/apoiar')}
            />
          </View>
        </Secao>
      ) : null}

      {!confirmando ? (
        <Cartao className="gap-md border-erro expandido:flex-row expandido:items-center expandido:justify-between">
          <View className="flex-1">
            <Texto variante="titulo3" accessibilityRole="header">
              Excluir minha conta
            </Texto>
            <Texto variante="apoio">
              Apaga todos os dados da família. Não é possível desfazer.
            </Texto>
          </View>
          <Botao
            titulo="Excluir minha conta"
            variante="perigo"
            onPress={() => setConfirmando(true)}
          />
        </Cartao>
      ) : (
        <Cartao className="gap-md border-erro">
          <Texto variante="corpoNegrito">Excluir tudo?</Texto>
          <Texto>
            Vamos apagar as pessoas cadastradas, as doses, o histórico e o consentimento. Não dá
            para desfazer.
          </Texto>
          {remove.error ? (
            <Texto className="text-erro" accessibilityRole="alert">
              {remove.error.message}
            </Texto>
          ) : null}
          <Botao
            titulo="Sim, excluir tudo"
            variante="perigo"
            disabled={remove.isPending}
            onPress={() =>
              remove.mutate(undefined, {
                onSuccess: () => void endSession(),
              })
            }
          />
          <Botao titulo="Não, voltar" variante="secundario" onPress={() => setConfirmando(false)} />
        </Cartao>
      )}
    </Tela>
  );
}
