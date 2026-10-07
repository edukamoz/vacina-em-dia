import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { LinkTexto } from '../../components/link-texto';
import { SeletorDeTema } from '../../components/seletor-de-tema';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { useSession } from '../../session/session-provider';
import { Alternar } from '../../components/alternar';
import { useConsent, useDeleteAccount, useReminders, useSetEmailReminders } from '../data/hooks';

/** Um par "rótulo e valor" da lista de dados da conta. */
function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View className="gap-[2px]">
      <Texto variante="apoio" className="text-textoSecundario">
        {rotulo}
      </Texto>
      <Texto variante="corpoNegrito">{valor}</Texto>
    </View>
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

  return (
    <Tela reservaBalao titulo="Conta">
      <View className="gap-lg expandido:flex-row expandido:items-start">
        <Cartao className="gap-lg expandido:flex-1">
          <Texto variante="titulo3" accessibilityRole="header">
            Seus dados
          </Texto>
          <Dado rotulo="E-mail" valor={account?.email ?? 'Sem e-mail'} />
        </Cartao>
        <Cartao className="gap-lg expandido:flex-1">
          <Texto variante="titulo3" accessibilityRole="header">
            Tema
          </Texto>
          <SeletorDeTema />
        </Cartao>
      </View>

      <View className="gap-lg expandido:flex-row expandido:items-start">
        <Cartao className="gap-sm expandido:flex-1">
          <Texto variante="titulo3" accessibilityRole="header">
            Privacidade
          </Texto>
          {consent.data?.accepted ? (
            <Texto>{`Você aceitou o termo de consentimento (versão ${consent.data.termVersion}).`}</Texto>
          ) : (
            <Texto>Você ainda não aceitou o termo de consentimento.</Texto>
          )}
          <Texto className="text-textoSecundario">
            Guardamos só nome ou apelido, data de nascimento e as doses de cada pessoa. Não pedimos
            CPF nem Cartão Nacional de Saúde.
          </Texto>
          <LinkTexto titulo="Política de privacidade" onPress={() => router.push('/privacidade')} />
          <LinkTexto titulo="Termos de uso" onPress={() => router.push('/termos')} />
        </Cartao>
        <Cartao className="gap-sm expandido:flex-1">
          <Texto variante="titulo3" accessibilityRole="header">
            Lembretes
          </Texto>
          <Texto className="text-textoSecundario">
            O aviso dentro do aplicativo sempre aparece na aba Doses. Se quiser, também enviamos um
            e-mail às 8h, no dia da vacina e 7 dias antes. O e-mail traz só a quantidade de vacinas,
            sem nomes.
          </Texto>
          {reminders.data ? (
            <Alternar
              rotulo="Receber lembretes por e-mail"
              marcado={reminders.data.emailEnabled}
              aoAlterar={(valor) => setEmail.mutate(valor)}
            />
          ) : null}
          {setEmail.error ? (
            <Texto className="text-erro" accessibilityRole="alert">
              Não foi possível salvar. Tente de novo.
            </Texto>
          ) : null}
        </Cartao>
        <Cartao className="gap-sm expandido:flex-1">
          <Texto variante="titulo3" accessibilityRole="header">
            Sobre o aplicativo
          </Texto>
          <Texto className="text-textoSecundario">
            O calendário segue o Calendário Nacional de Vacinação 2026, do Ministério da Saúde. O
            aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.
          </Texto>
        </Cartao>
      </View>

      {!confirmando ? (
        <View className="gap-sm expandido:flex-row expandido:flex-wrap">
          <Botao titulo="Sair" icone="sair" variante="secundario" onPress={() => void logout()} />
          <Botao
            titulo="Excluir minha conta"
            variante="perigo"
            onPress={() => setConfirmando(true)}
          />
        </View>
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
