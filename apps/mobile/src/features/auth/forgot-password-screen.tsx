import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ApiRequestError } from '../../api/client';
import { endpoints } from '../../api/endpoints';
import { Botao } from '../../components/botao';
import { CampoTexto } from '../../components/campo-texto';
import { Texto } from '../../components/texto';
import { useSession } from '../../session/session-provider';
import { AuthFrame } from './auth-frame';

const EMAIL_MESSAGE = 'Informe um e-mail válido, por exemplo nome@exemplo.com.br.';

/** Tela "Esqueci minha senha": pede o e-mail e avisa que o link foi enviado (se a conta existir). */
export function ForgotPasswordScreen() {
  const router = useRouter();
  const { api } = useSession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (pending) return;
    const value = email.trim();
    setFailure(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError(EMAIL_MESSAGE);
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      await endpoints.forgotPassword(api, { email: value });
      setSent(true);
    } catch (caught) {
      setFailure(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Não foi possível enviar o pedido. Tente de novo em instantes.',
      );
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <AuthFrame titulo="Confira o seu e-mail">
        <Texto accessibilityLiveRegion="polite">
          Se existir uma conta com este e-mail, enviamos um link para criar uma nova senha. O link
          vale por 1 hora.
        </Texto>
        <Texto className="text-textoSecundario">
          Não chegou? Veja a caixa de spam e espere alguns minutos antes de pedir de novo.
        </Texto>
        <Botao titulo="Voltar para Entrar" onPress={() => router.replace('/entrar')} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame titulo="Esqueci minha senha">
      <Texto className="text-textoSecundario">
        Digite o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.
      </Texto>
      <CampoTexto
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        erro={error}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />
      {failure ? (
        <Texto className="text-erro" accessibilityRole="alert">
          {failure}
        </Texto>
      ) : null}
      <Botao
        titulo={pending ? 'Enviando...' : 'Enviar o link'}
        disabled={pending}
        onPress={() => void submit()}
      />
      <Botao
        titulo="Voltar para Entrar"
        variante="secundario"
        onPress={() => router.replace('/entrar')}
      />
    </AuthFrame>
  );
}
