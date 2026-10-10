import { MODOS_DE_MOVIMENTO, ROTULOS_DO_MOVIMENTO } from '../theme/preferencias';
import { useTheme } from '../theme/theme-provider';
import { Chave } from './chave';
import { GrupoDeRadios } from './grupo-de-radios';

/**
 * Escolha do movimento na Conta: "Animar sempre" (o padrão), "Seguir o aparelho" ou "Reduzir
 * movimento". "Animar sempre" vale mesmo que o aparelho peça menos movimento; o tema Alto contraste
 * sempre deixa tudo parado.
 */
export function SeletorDeMovimento() {
  const { movimento, setMovimento } = useTheme();
  return (
    <GrupoDeRadios
      rotulo="Movimento"
      valor={movimento}
      opcoes={MODOS_DE_MOVIMENTO.map((valor) => ({ valor, rotulo: ROTULOS_DO_MOVIMENTO[valor] }))}
      aoEscolher={setMovimento}
    />
  );
}

/**
 * Atalho "Reduzir movimento" para as telas de antes do login (apresentação, Entrar, Criar conta),
 * onde a Conta ainda não está ao alcance. Liga em "Reduzir movimento" e desliga em "Animar sempre".
 */
export function AtalhoDeMovimento() {
  const { movimentoReduzido, setMovimento } = useTheme();
  return (
    <Chave
      rotulo="Reduzir movimento"
      ligada={movimentoReduzido}
      aoAlterar={(ligar) => setMovimento(ligar ? 'reduzir' : 'animar')}
    />
  );
}
