import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ApiRequestError } from '../../api/client';
import { Botao } from '../../components/botao';
import { CampoTexto } from '../../components/campo-texto';
import { LinkTexto } from '../../components/link-texto';
import { Texto } from '../../components/texto';
import { useSession } from '../../session/session-provider';
import { AuthFrame } from './auth-frame';
import { CampoSenha } from './campo-senha';
import { validateCredentials, type FieldErrors } from './validate';

/**
 * Tela "Criar conta" (RF01): só e-mail e senha. Nome e data de nascimento não são pedidos aqui:
 * o app guarda o mínimo (LGPD) e o consentimento vem na tela seguinte.
 */
export function RegisterScreen() {
  const router = useRouter();
  const { register } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (pending) return;
    const { errors: found, values } = validateCredentials('register', email, password);
    setErrors(found);
    setFailure(null);
    if (!values) return;
    setPending(true);
    try {
      await register(values);
      router.replace('/');
    } catch (error) {
      setFailure(
        error instanceof ApiRequestError
          ? error.message
          : 'Não foi possível criar a conta. Tente de novo em instantes.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame titulo="Criar conta">
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
        ajuda="Use pelo menos 8 caracteres. Uma frase longa é uma boa senha."
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />
      <Texto className="text-textoSecundario">
        Na próxima tela você lê e aceita o termo de consentimento. O Vacina em Dia não pede CPF nem
        Cartão Nacional de Saúde.
      </Texto>
      {failure ? (
        <Texto className="text-erro" accessibilityRole="alert">
          {failure}
        </Texto>
      ) : null}
      <Botao
        titulo={pending ? 'Criando a conta...' : 'Criar conta'}
        disabled={pending}
        onPress={() => void submit()}
      />
      <LinkTexto titulo="Já tenho conta. Entrar" onPress={() => router.replace('/entrar')} />
    </AuthFrame>
  );
}
