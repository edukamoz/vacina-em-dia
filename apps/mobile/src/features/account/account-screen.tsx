import { useState } from 'react';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { SeletorDeTema } from '../../components/seletor-de-tema';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { useSession } from '../../session/session-provider';
import { useConsent, useDeleteAccount } from '../data/hooks';

/**
 * Aba "Conta" (RF09): e-mail da conta, aparência, dados do consentimento, saída da conta e
 * exclusão da conta com todos os dados. A exclusão sempre pede uma confirmação.
 */
export function AccountScreen() {
  const { account, logout, endSession } = useSession();
  const consent = useConsent();
  const remove = useDeleteAccount();
  const [confirmando, setConfirmando] = useState(false);

  return (
    <Tela reservaBalao titulo="Conta" subtitulo="Aparência, privacidade e seus dados.">
      {account ? (
        <Cartao className="gap-sm">
          <Texto variante="titulo3" accessibilityRole="header">
            Sua conta
          </Texto>
          <Texto>{account.email}</Texto>
          <Botao titulo="Sair da conta" variante="secundario" onPress={() => void logout()} />
        </Cartao>
      ) : null}

      <SeletorDeTema />

      <Cartao className="gap-sm">
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
      </Cartao>

      <Cartao className="gap-sm">
        <Texto variante="titulo3" accessibilityRole="header">
          Sobre o aplicativo
        </Texto>
        <Texto className="text-textoSecundario">
          O calendário segue o Calendário Nacional de Vacinação 2026, do Ministério da Saúde. O
          aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.
        </Texto>
      </Cartao>

      {!confirmando ? (
        <Botao
          titulo="Excluir minha conta e todos os dados"
          variante="perigo"
          onPress={() => setConfirmando(true)}
        />
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
