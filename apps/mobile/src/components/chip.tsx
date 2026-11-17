import { Pressable, View, type PressableProps } from 'react-native';
import { Texto } from './texto';

/**
 * Chip: escolha em forma de pílula, usada para trocar de pessoa e para opções curtas (repetição,
 * antecedência do aviso). É um controle, então o contorno é de 2 px em `borda` (3:1); o escolhido
 * ganha fundo e contorno da marca e é anunciado como selecionado ao leitor de tela.
 *
 * @param props.rotulo - Texto do chip (nome da pessoa ou da opção).
 * @param props.selecionado - Se é a opção escolhida agora.
 * @param props.inicio - Elemento decorativo à esquerda (por exemplo o avatar).
 * @param props.aviso - Mostra um ponto vermelho (por exemplo, pessoa com dose atrasada). O ponto é
 *   só decoração: quem usa o chip diz o motivo em `rotuloAcessivel`.
 * @param props.rotuloAcessivel - Rótulo completo para o leitor de tela; por padrão, o `rotulo`.
 * @param props.papel - `button` (padrão) ou `radio`, quando o chip faz parte de um grupo de escolha
 *   única (por exemplo, a faixa de pessoas).
 */
export function Chip({
  rotulo,
  selecionado = false,
  inicio,
  aviso = false,
  rotuloAcessivel,
  papel = 'button',
  ...rest
}: Omit<PressableProps, 'children'> & {
  rotulo: string;
  selecionado?: boolean;
  inicio?: React.ReactNode;
  aviso?: boolean;
  rotuloAcessivel?: string;
  papel?: 'button' | 'radio';
}) {
  return (
    <Pressable
      accessibilityRole={papel}
      accessibilityLabel={rotuloAcessivel ?? rotulo}
      accessibilityState={
        papel === 'radio'
          ? { selected: selecionado, checked: selecionado }
          : { selected: selecionado }
      }
      // Na web, o estado só chega ao leitor de tela pela propriedade `aria-selected` ou `aria-checked`.
      {...(papel === 'radio' ? { 'aria-checked': selecionado } : { 'aria-selected': selecionado })}
      className={`min-h-principal flex-row items-center gap-md self-start rounded-selo border-padrao ${
        inicio ? 'pl-xs' : 'pl-lg'
      } pr-lg ${selecionado ? 'border-primaria bg-primariaSuave' : 'border-borda bg-superficie'}`}
      {...rest}
    >
      {inicio}
      <Texto
        variante="corpoNegrito"
        truncar={1}
        className={`shrink ${selecionado ? 'text-primaria' : 'text-texto'}`}
        importantForAccessibility="no"
      >
        {rotulo}
      </Texto>
      {aviso ? (
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          className="absolute right-xs top-xs h-[14px] w-[14px] rounded-selo border-padrao border-superficie bg-erro"
        />
      ) : null}
    </Pressable>
  );
}
