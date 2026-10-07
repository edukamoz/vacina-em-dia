import { useState, type ComponentProps } from 'react';
import { View } from 'react-native';
import { Botao } from '../../components/botao';
import { CampoTexto } from '../../components/campo-texto';

/**
 * Campo de senha com o botão "Mostrar a senha" (quem digita devagar ou erra muito precisa conferir
 * o que escreveu). O padrão é esconder.
 */
export function CampoSenha({
  rotulo = 'Senha',
  ...rest
}: Omit<ComponentProps<typeof CampoTexto>, 'rotulo' | 'secureTextEntry'> & {
  rotulo?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <View className="gap-sm">
      <CampoTexto rotulo={rotulo} secureTextEntry={!visivel} autoCapitalize="none" {...rest} />
      <Botao
        titulo={visivel ? 'Esconder a senha' : 'Mostrar a senha'}
        variante="secundario"
        onPress={() => setVisivel((atual) => !atual)}
      />
    </View>
  );
}
