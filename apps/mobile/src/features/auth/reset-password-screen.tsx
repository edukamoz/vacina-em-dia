import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ApiRequestError } from '../../api/client';
import { endpoints } from '../../api/endpoints';
import { Botao } from '../../components/botao';
import { Texto } from '../../components/texto';
import { useSession } from '../../session/session-provider';
import { AuthFrame } from './auth-frame';
import { CampoSenha } from './campo-senha';
import { clearResetTokenFromUrl, readResetToken } from './reset-token';
import { validateCredentials } from './validate';

/**
 * Tela "Criar nova senha", aberta pelo link do e-mail. O token vem do fragmento do endereço e é
 * apagado da barra de endereço assim que lido. Depois de trocar a senha, a pessoa entra de novo.
 */
export function ResetPasswordScreen() {
  const router = useRouter();
  const { api } = useSession();
  const [token] = useState(() => readResetToken());
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (token) clearResetTokenFromUrl();
  }, [token]);

  async function submit() {
    if (pending || !token) return;
    const { errors } = validateCredentials('register', 'nome@exemplo.com.br', password);
    setError(errors.password);
    setFailure(null);
    if (errors.password) return;
    setPending(true);
    try {
      await endpoints.resetPassword(api, { token, password });
      setDone(true);
    } catch (caught) {
      setFailure(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Não foi possível criar a nova senha. Tente de novo em instantes.',
      );
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <AuthFrame titulo="Link incompleto">
        <Texto>
          Este link não está completo. Peça uma nova senha e use o link do e-mail mais recente.
        </Texto>
        <Botao titulo="Pedir nova senha" onPress={() => router.replace('/esqueci-senha')} />
      </AuthFrame>
    );
  }

  if (done) {
    return (
      <AuthFrame titulo="Senha trocada">
        <Texto accessibilityLiveRegion="polite">
          Pronto. Agora entre com a sua nova senha. Por segurança, você saiu de todos os aparelhos.
        </Texto>
        <Botao titulo="Entrar" onPress={() => router.replace('/entrar')} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame titulo="Criar nova senha">
      <CampoSenha
        rotulo="Nova senha"
        value={password}
        onChangeText={setPassword}
        erro={error}
        ajuda="Use pelo menos 8 caracteres. Uma frase longa é uma boa senha."
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />
      {failure ? (
        <Texto className="text-erro" accessibilityRole="alert">
          {failure}
        </Texto>
      ) : null}
      <Botao
        titulo={pending ? 'Salvando...' : 'Salvar a nova senha'}
        disabled={pending}
        onPress={() => void submit()}
      />
      {failure ? (
        <Botao
          titulo="Pedir um novo link"
          variante="secundario"
          onPress={() => router.replace('/esqueci-senha')}
        />
      ) : null}
    </AuthFrame>
  );
}
