import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ApiRequestError } from '../../api/client';
import { Alternar } from '../../components/alternar';
import { Botao } from '../../components/botao';
import { CampoTexto } from '../../components/campo-texto';
import { LinkTexto } from '../../components/link-texto';
import { Texto } from '../../components/texto';
import { useSession } from '../../session/session-provider';
import { AuthFrame } from './auth-frame';
import { CampoSenha } from './campo-senha';
import { validateCredentials, validatePasswordConfirmation, type FieldErrors } from './validate';

/**
 * Tela "Criar conta" (RF01): e-mail, senha e o aceite dos Termos de uso e da Política de
 * privacidade. Nome e data de nascimento não são pedidos aqui: o app guarda o mínimo (LGPD) e o
 * consentimento sobre os dados de saúde vem na tela seguinte.
 */
export function RegisterScreen() {
  const router = useRouter();
  const { register } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visivel, setVisivel] = useState(false);
  const [aceitou, setAceitou] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (pending) return;
    if (!aceitou) {
      setFailure('Para criar a conta, leia e aceite os termos de uso e a política de privacidade.');
      return;
    }
    const { errors: found, values } = validateCredentials('register', email, password);
    const mismatch = validatePasswordConfirmation(password, confirmation);
    setErrors({ ...found, ...(mismatch ? { confirmation: mismatch } : {}) });
    setFailure(null);
    if (!values || mismatch) return;
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
        returnKeyType="next"
        visivel={visivel}
        aoAlternarVisivel={setVisivel}
      />
      <CampoSenha
        rotulo="Repita a senha"
        value={confirmation}
        onChangeText={setConfirmation}
        erro={errors.confirmation}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        visivel={visivel}
        aoAlternarVisivel={setVisivel}
        onSubmitEditing={() => void submit()}
      />
      <View className="gap-xs">
        <Alternar
          rotulo="Li e aceito os termos de uso e a política de privacidade"
          marcado={aceitou}
          aoAlterar={setAceitou}
        />
        <View className="flex-row flex-wrap gap-x-lg">
          <LinkTexto titulo="Ler os termos de uso" onPress={() => router.push('/termos')} />
          <LinkTexto
            titulo="Ler a política de privacidade"
            onPress={() => router.push('/privacidade')}
          />
        </View>
      </View>
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
