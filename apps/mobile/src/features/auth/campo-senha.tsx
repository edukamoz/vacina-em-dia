import { useState, type ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { CampoTexto } from '../../components/campo-texto';
import { Texto } from '../../components/texto';

/**
 * Campo de senha com o botão "Mostrar" dentro do campo, à direita (quem digita devagar ou erra
 * muito precisa conferir o que escreveu). O padrão é esconder.
 *
 * @param props.visivel - Se a senha aparece, quando o estado é controlado por quem usa (dois campos
 *   que mostram e escondem juntos); sem isso, o campo guarda o próprio estado.
 * @param props.aoAlternarVisivel - Chamada com o novo valor quando a pessoa toca no botão.
 */
export function CampoSenha({
  rotulo = 'Senha',
  visivel: visivelDeFora,
  aoAlternarVisivel,
  ...rest
}: Omit<ComponentProps<typeof CampoTexto>, 'rotulo' | 'secureTextEntry' | 'aoLado'> & {
  rotulo?: string;
  visivel?: boolean;
  aoAlternarVisivel?: (valor: boolean) => void;
}) {
  const [visivelLocal, setVisivelLocal] = useState(false);
  const visivel = visivelDeFora ?? visivelLocal;

  function alternar() {
    setVisivelLocal(!visivel);
    aoAlternarVisivel?.(!visivel);
  }

  return (
    <CampoTexto
      rotulo={rotulo}
      secureTextEntry={!visivel}
      autoCapitalize="none"
      aoLado={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visivel ? 'Esconder a senha' : 'Mostrar a senha'}
          accessibilityState={{ expanded: visivel }}
          onPress={alternar}
          className="min-h-toque min-w-toque items-center justify-center px-md"
        >
          <Texto variante="corpoNegrito" className="text-primaria" importantForAccessibility="no">
            {visivel ? 'Ocultar' : 'Mostrar'}
          </Texto>
        </Pressable>
      }
      {...rest}
    />
  );
}
