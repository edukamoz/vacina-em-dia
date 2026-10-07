import type { CivilDate } from '@vacina/shared';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { addMonths, longDateLabel, monthGrid, monthLabel, monthOf } from '../lib/calendar-grid';
import { todayCivil } from '../lib/dates';
import { Texto } from './texto';

const DIAS_DA_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

/**
 * Calendário para escolher uma data sem digitar. Mostra um mês por vez, com botões para ir e voltar,
 * e cada dia é um botão de pelo menos 48 dp. Dias fora do intervalo ficam desativados (por
 * exemplo, "aplicada" não aceita data futura). O dia escolhido tem fundo cheio e o de hoje tem
 * contorno, então nada depende só da cor.
 *
 * @param props.rotulo - Nome do campo, lido pelo leitor de tela.
 * @param props.valor - Data escolhida, ou `null`.
 * @param props.aoEscolher - Chamada com a data tocada.
 * @param props.minimo - Primeira data permitida (inclusive).
 * @param props.maximo - Última data permitida (inclusive).
 */
export function SeletorDeData({
  rotulo,
  valor,
  aoEscolher,
  minimo,
  maximo,
}: {
  rotulo: string;
  valor: CivilDate | null;
  aoEscolher: (data: CivilDate) => void;
  minimo?: CivilDate;
  maximo?: CivilDate;
}) {
  const hoje = todayCivil();
  const [mes, setMes] = useState(() => monthOf(valor ?? hoje));
  const anterior = addMonths(mes, -1);
  const proximo = addMonths(mes, 1);
  const semMesAnterior =
    minimo !== undefined &&
    monthGrid(anterior)
      .flat()
      .every((dia) => dia === null || dia < minimo);
  const semProximoMes =
    maximo !== undefined &&
    monthGrid(proximo)
      .flat()
      .every((dia) => dia === null || dia > maximo);

  return (
    <View
      accessibilityLabel={rotulo}
      className="gap-sm rounded-cartao border-padrao border-borda bg-superficie p-md"
    >
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          accessibilityState={{ disabled: semMesAnterior }}
          disabled={semMesAnterior}
          onPress={() => setMes(anterior)}
          className={`min-h-toque min-w-toque items-center justify-center rounded-botao ${
            semMesAnterior ? 'opacity-40' : ''
          }`}
        >
          <Texto variante="titulo3" importantForAccessibility="no">
            ‹
          </Texto>
        </Pressable>
        <Texto variante="corpoNegrito" accessibilityRole="header" accessibilityLiveRegion="polite">
          {monthLabel(mes)}
        </Texto>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          accessibilityState={{ disabled: semProximoMes }}
          disabled={semProximoMes}
          onPress={() => setMes(proximo)}
          className={`min-h-toque min-w-toque items-center justify-center rounded-botao ${
            semProximoMes ? 'opacity-40' : ''
          }`}
        >
          <Texto variante="titulo3" importantForAccessibility="no">
            ›
          </Texto>
        </Pressable>
      </View>

      <View className="flex-row" importantForAccessibility="no-hide-descendants">
        {DIAS_DA_SEMANA.map((letra, indice) => (
          <View key={indice} className="flex-1 items-center">
            <Texto variante="apoio" className="text-textoSecundario">
              {letra}
            </Texto>
          </View>
        ))}
      </View>

      {monthGrid(mes).map((semana, linha) => (
        <View key={linha} className="flex-row">
          {semana.map((dia, coluna) => {
            if (dia === null) return <View key={coluna} className="min-h-toque flex-1" />;
            const fora =
              (minimo !== undefined && dia < minimo) || (maximo !== undefined && dia > maximo);
            const escolhido = dia === valor;
            return (
              <Pressable
                key={coluna}
                accessibilityRole="button"
                accessibilityLabel={longDateLabel(dia)}
                accessibilityState={{ selected: escolhido, disabled: fora }}
                aria-pressed={escolhido}
                disabled={fora}
                onPress={() => aoEscolher(dia)}
                className={`min-h-toque flex-1 items-center justify-center rounded-campo border-padrao ${
                  escolhido
                    ? 'border-primaria bg-primaria'
                    : dia === hoje
                      ? 'border-primaria'
                      : 'border-transparent'
                } ${fora ? 'opacity-40' : 'hover:bg-primariaSuave'}`}
              >
                <Texto
                  variante={escolhido ? 'corpoNegrito' : 'corpo'}
                  className={escolhido ? 'text-sobrePrimaria' : ''}
                  importantForAccessibility="no"
                >
                  {Number(dia.slice(8, 10))}
                </Texto>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
