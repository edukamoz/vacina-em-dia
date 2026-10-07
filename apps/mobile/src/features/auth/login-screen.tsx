import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ApiRequestError } from '../../api/client';
import { Botao } from '../../components/botao';
import { CampoTexto } from '../../components/campo-texto';
import { Texto } from '../../components/texto';
import { useSession } from '../../session/session-provider';
import { AuthFrame } from './auth-frame';
import { CampoSenha } from './campo-senha';
import { validateCredentials, type FieldErrors } from './validate';

/** Aviso para quando a recuperação de senha ainda não existe (ADR-014). */
const ESQUECI_A_SENHA =
  'A recuperação de senha ainda não está disponível. Se você esqueceu a senha, crie uma nova conta com outro e-mail.';

/** Tela "Entrar" (RF01): e-mail e senha. */
export function LoginScreen() {
  const router = useRouter();
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mostrarAviso, setMostrarAviso] = useState(false);

  async function submit() {
    if (pending) return;
    const { errors: found, values } = validateCredentials('login', email, password);
    setErrors(found);
    setFailure(null);
    if (!values) return;
    setPending(true);
    try {
      await login(values);
      router.replace('/');
    } catch (error) {
      setFailure(
        error instanceof ApiRequestError
          ? error.message
          : 'Não foi possível entrar. Tente de novo em instantes.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame titulo="Entrar">
      <CampoTexto
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        erro={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <CampoSenha
        value={password}
        onChangeText={setPassword}
        erro={errors.password}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />
      {failure ? (
        <Texto className="text-erro" accessibilityRole="alert">
          {failure}
        </Texto>
      ) : null}
      <Botao
        titulo={pending ? 'Entrando...' : 'Entrar'}
        disabled={pending}
        onPress={() => void submit()}
      />
      <Botao
        titulo="Esqueci minha senha"
        variante="secundario"
        onPress={() => setMostrarAviso(true)}
      />
      {mostrarAviso ? <Texto accessibilityLiveRegion="polite">{ESQUECI_A_SENHA}</Texto> : null}
      <Botao
        titulo="Criar conta"
        variante="secundario"
        onPress={() => router.replace('/criar-conta')}
      />
    </AuthFrame>
  );
}
