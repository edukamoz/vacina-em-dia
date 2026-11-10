import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Chave } from '../../components/chave';
import { GrupoDeRadios, type OpcaoDeRadio } from '../../components/grupo-de-radios';
import { Texto } from '../../components/texto';
import { HORAS_DE_AVISO } from '../../lib/avisos';
import {
  avisosSuportados,
  lerPermissaoDeAvisos,
  pedirPermissaoDeAvisos,
  type PermissaoDeAvisos,
} from '../../lib/avisos-aparelho';
import { definirPreferenciaDeAvisos, usePreferenciaDeAvisos } from './preferencia';

const ROTULOS_DA_HORA: Record<(typeof HORAS_DE_AVISO)[number], string> = {
  8: '8h da manhã',
  12: '12h, ao meio-dia',
  18: '18h, no fim da tarde',
};

const OPCOES_DE_HORA: readonly OpcaoDeRadio<string>[] = HORAS_DE_AVISO.map((hora) => ({
  valor: String(hora),
  rotulo: ROTULOS_DA_HORA[hora],
}));

/**
 * Controles dos avisos no aparelho, na aba Conta: interruptor (que pede a permissão do sistema só
 * quando a pessoa o liga) e o horário do aviso. Na web, explica que o recurso é do aplicativo.
 */
export function ControlesDeAvisos() {
  const { preferencia } = usePreferenciaDeAvisos();
  const [permissao, setPermissao] = useState<PermissaoDeAvisos | null>(null);
  const [recusou, setRecusou] = useState(false);

  useEffect(() => {
    if (!avisosSuportados()) return;
    void lerPermissaoDeAvisos().then(setPermissao);
  }, []);

  if (!avisosSuportados()) {
    return (
      <Texto className="text-textoSecundario">
        Os avisos no aparelho funcionam no aplicativo de Android e de iOS. No site, o lembrete
        aparece na aba Doses e por e-mail.
      </Texto>
    );
  }

  const ligado = preferencia.ligado && permissao === 'concedida';

  async function alterar(valor: boolean) {
    if (!valor) {
      setRecusou(false);
      await definirPreferenciaDeAvisos({ ligado: false });
      return;
    }
    const resposta = await pedirPermissaoDeAvisos();
    setPermissao(resposta);
    setRecusou(resposta !== 'concedida');
    await definirPreferenciaDeAvisos({ ligado: resposta === 'concedida' });
  }

  return (
    <View className="gap-md">
      <Texto className="text-textoSecundario">
        Também avisamos no seu aparelho, no dia da vacina, na antecedência de cada dose e quando ela
        atrasa. O aviso traz só a quantidade de vacinas, sem nomes.
      </Texto>
      <Chave
        rotulo="Receber avisos neste aparelho"
        ligada={ligado}
        aoAlterar={(valor) => void alterar(valor)}
      />
      {recusou ? (
        <Texto className="text-erro" accessibilityRole="alert">
          O aparelho não deixou mostrar avisos. Ative as notificações do Vacina em Dia nas
          configurações do aparelho e tente de novo.
        </Texto>
      ) : null}
      {ligado ? (
        <GrupoDeRadios
          rotulo="Horário do aviso"
          valor={String(preferencia.hora)}
          opcoes={OPCOES_DE_HORA}
          aoEscolher={(hora) => void definirPreferenciaDeAvisos({ hora: Number(hora) })}
        />
      ) : null}
    </View>
  );
}
