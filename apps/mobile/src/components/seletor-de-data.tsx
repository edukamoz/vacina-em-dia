import type { CivilDate } from '@vacina/shared';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  addMonths,
  civilOf,
  daysInMonth,
  longDateLabel,
  monthGrid,
  monthLabel,
  monthOf,
  monthName,
  type Month,
} from '../lib/calendar-grid';
import { todayCivil } from '../lib/dates';
import { Texto } from './texto';

const DIAS_DA_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

/** Quantos anos a grade de anos mostra de uma vez (3 colunas por 4 linhas). */
const ANOS_POR_PAGINA = 12;

/** Verdadeiro quando algum dia do mês cabe entre o mínimo e o máximo. */
function mesPermitido(mes: Month, minimo?: CivilDate, maximo?: CivilDate): boolean {
  if (minimo !== undefined && civilOf(mes, daysInMonth(mes)) < minimo) return false;
  if (maximo !== undefined && civilOf(mes, 1) > maximo) return false;
  return true;
}

/** Verdadeiro quando algum mês do ano cabe entre o mínimo e o máximo. */
function anoPermitido(ano: number, minimo?: CivilDate, maximo?: CivilDate): boolean {
  if (minimo !== undefined && minimo.slice(0, 4) > String(ano).padStart(4, '0')) return false;
  if (maximo !== undefined && maximo.slice(0, 4) < String(ano).padStart(4, '0')) return false;
  return true;
}

/** Célula da grade de anos ou de meses: botão de pelo menos 48 dp, com o escolhido em destaque. */
function CelulaDeEscolha({
  rotulo,
  texto,
  escolhida,
  desativada,
  aoTocar,
}: {
  rotulo: string;
  texto: string;
  escolhida: boolean;
  desativada: boolean;
  aoTocar: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ selected: escolhida, disabled: desativada }}
      aria-pressed={escolhida}
      disabled={desativada}
      onPress={aoTocar}
      className={`min-h-toque flex-1 items-center justify-center rounded-campo border-padrao ${
        escolhida ? 'border-primaria bg-primaria' : 'border-transparent'
      } ${desativada ? 'opacity-40' : 'hover:bg-primariaSuave'}`}
    >
      <Texto
        variante={escolhida ? 'corpoNegrito' : 'corpo'}
        className={escolhida ? 'text-sobrePrimaria' : ''}
        importantForAccessibility="no"
      >
        {texto}
      </Texto>
    </Pressable>
  );
}

/** Divide uma lista em linhas de 3, para as grades de anos e meses. */
function emLinhasDeTres<T>(itens: readonly T[]): T[][] {
  return Array.from({ length: Math.ceil(itens.length / 3) }, (_, i) =>
    itens.slice(i * 3, i * 3 + 3),
  );
}

/**
 * Calendário para escolher uma data sem digitar. Mostra um mês por vez, com botões para ir e voltar,
 * e cada dia é um botão de pelo menos 48 dp. Para chegar longe (um nascimento em 2002, por exemplo),
 * o título "mês de ano" é um botão: ele abre a grade de anos (12 por vez, com setas para pular de
 * 12 em 12) e, ao escolher o ano, a grade de meses. Assim são 3 toques, não dezenas de setas. Dias fora do intervalo ficam desativados (por
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
  const [visao, setVisao] = useState<'dias' | 'anos' | 'meses'>('dias');
  const [paginaDeAnos, setPaginaDeAnos] = useState(0);
  const [anoDosMeses, setAnoDosMeses] = useState(mes.year);
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

  const abrirAnos = () => {
    setPaginaDeAnos(Math.floor(mes.year / ANOS_POR_PAGINA));
    setVisao('anos');
  };
  const primeiroAno = paginaDeAnos * ANOS_POR_PAGINA;
  const anos = Array.from({ length: ANOS_POR_PAGINA }, (_, i) => primeiroAno + i);
  const semAnosAntes = !anoPermitido(primeiroAno - 1, minimo, maximo);
  const semAnosDepois = !anoPermitido(primeiroAno + ANOS_POR_PAGINA, minimo, maximo);
  const aoEscolherAno = (ano: number) => {
    setAnoDosMeses(ano);
    setVisao('meses');
  };
  const aoEscolherMes = (mesEscolhido: Month) => {
    setMes(mesEscolhido);
    setVisao('dias');
  };

  if (visao !== 'dias') {
    const nosAnos = visao === 'anos';
    return (
      <View
        accessibilityLabel={rotulo}
        className="gap-sm rounded-cartao border-padrao border-borda bg-superficie p-md"
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={nosAnos ? 'Anos anteriores' : 'Ano anterior'}
            accessibilityState={{
              disabled: nosAnos ? semAnosAntes : !anoPermitido(anoDosMeses - 1, minimo, maximo),
            }}
            disabled={nosAnos ? semAnosAntes : !anoPermitido(anoDosMeses - 1, minimo, maximo)}
            onPress={() =>
              nosAnos ? setPaginaDeAnos(paginaDeAnos - 1) : setAnoDosMeses(anoDosMeses - 1)
            }
            className={`min-h-toque min-w-toque items-center justify-center rounded-botao ${
              (nosAnos ? semAnosAntes : !anoPermitido(anoDosMeses - 1, minimo, maximo))
                ? 'opacity-40'
                : ''
            }`}
          >
            <Texto variante="titulo3" importantForAccessibility="no">
              ‹
            </Texto>
          </Pressable>
          {nosAnos ? (
            <Texto
              variante="corpoNegrito"
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
            >
              {`${anos[0]} a ${anos[anos.length - 1]}`}
            </Texto>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ano ${anoDosMeses}. Tocar para escolher outro ano`}
              onPress={() => {
                setPaginaDeAnos(Math.floor(anoDosMeses / ANOS_POR_PAGINA));
                setVisao('anos');
              }}
              className="min-h-toque items-center justify-center rounded-botao px-md hover:bg-superficieSuave"
            >
              <Texto variante="corpoNegrito" accessibilityLiveRegion="polite">
                {String(anoDosMeses)}
              </Texto>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={nosAnos ? 'Próximos anos' : 'Próximo ano'}
            accessibilityState={{
              disabled: nosAnos ? semAnosDepois : !anoPermitido(anoDosMeses + 1, minimo, maximo),
            }}
            disabled={nosAnos ? semAnosDepois : !anoPermitido(anoDosMeses + 1, minimo, maximo)}
            onPress={() =>
              nosAnos ? setPaginaDeAnos(paginaDeAnos + 1) : setAnoDosMeses(anoDosMeses + 1)
            }
            className={`min-h-toque min-w-toque items-center justify-center rounded-botao ${
              (nosAnos ? semAnosDepois : !anoPermitido(anoDosMeses + 1, minimo, maximo))
                ? 'opacity-40'
                : ''
            }`}
          >
            <Texto variante="titulo3" importantForAccessibility="no">
              ›
            </Texto>
          </Pressable>
        </View>
        {nosAnos
          ? emLinhasDeTres(anos).map((linha, i) => (
              <View key={i} className="flex-row gap-xs">
                {linha.map((ano) => (
                  <CelulaDeEscolha
                    key={ano}
                    rotulo={`Ano ${ano}`}
                    texto={String(ano)}
                    escolhida={ano === mes.year}
                    desativada={!anoPermitido(ano, minimo, maximo)}
                    aoTocar={() => aoEscolherAno(ano)}
                  />
                ))}
              </View>
            ))
          : emLinhasDeTres(Array.from({ length: 12 }, (_, i) => i + 1)).map((linha, i) => (
              <View key={i} className="flex-row gap-xs">
                {linha.map((numero) => {
                  const alvo = { year: anoDosMeses, month: numero };
                  return (
                    <CelulaDeEscolha
                      key={numero}
                      rotulo={monthLabel(alvo)}
                      texto={monthName(numero).slice(0, 3)}
                      escolhida={alvo.year === mes.year && alvo.month === mes.month}
                      desativada={!mesPermitido(alvo, minimo, maximo)}
                      aoTocar={() => aoEscolherMes(alvo)}
                    />
                  );
                })}
              </View>
            ))}
      </View>
    );
  }

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${monthLabel(mes)}. Tocar para escolher outro mês ou ano`}
          onPress={abrirAnos}
          className="min-h-toque flex-row items-center justify-center gap-xs rounded-botao px-md hover:bg-superficieSuave"
        >
          <Texto variante="corpoNegrito" accessibilityLiveRegion="polite">
            {monthLabel(mes)}
          </Texto>
          <Texto variante="corpoNegrito" importantForAccessibility="no">
            ▾
          </Texto>
        </Pressable>
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
