import { addMonths, type CivilDate, type RecurrenceUnit } from '@vacina/shared';
import { View } from 'react-native';
import { Alternar } from '../../components/alternar';
import { CampoTexto } from '../../components/campo-texto';
import { GrupoDeRadios, type OpcaoDeRadio } from '../../components/grupo-de-radios';
import { SeletorDeData } from '../../components/seletor-de-data';
import { Texto } from '../../components/texto';
import { formatCivilDate } from './format-date';
import {
  primeiroDiaDoFim,
  type ErrosDeRepeticao,
  type OpcaoDeAviso,
  type FormaDeRepetir,
  type Termino,
} from './repeticao';

const UNIDADES: readonly OpcaoDeRadio<RecurrenceUnit>[] = [
  { valor: 'DAY', rotulo: 'Dias' },
  { valor: 'WEEK', rotulo: 'Semanas' },
  { valor: 'MONTH', rotulo: 'Meses' },
  { valor: 'YEAR', rotulo: 'Anos' },
];

const CONTAGEM: readonly OpcaoDeRadio<FormaDeRepetir['conta']>[] = [
  { valor: 'APPLICATION', rotulo: 'A partir da data em que eu tomar' },
  { valor: 'SCHEDULE', rotulo: 'Em datas fixas (por exemplo, todo ano em março)' },
];

const TERMINO: readonly OpcaoDeRadio<Termino>[] = [
  { valor: 'NUNCA', rotulo: 'Nunca (eu paro quando quiser)' },
  { valor: 'DATA', rotulo: 'Em uma data' },
  { valor: 'DOSES', rotulo: 'Depois de um número de doses' },
];

const AVISO: readonly { valor: OpcaoDeAviso; rotulo: string }[] = [
  { valor: '0', rotulo: 'No próprio dia' },
  { valor: '1', rotulo: '1 dia antes' },
  { valor: '3', rotulo: '3 dias antes' },
  { valor: '7', rotulo: '7 dias antes' },
  { valor: '14', rotulo: '14 dias antes' },
  { valor: '30', rotulo: '30 dias antes' },
];

/**
 * Seção do formulário da dose avulsa que pergunta se a vacina se repete (de quanto em quanto
 * tempo, de onde contar e quando termina) e com quantos dias de antecedência avisar. Todas as
 * opções ficam à vista, com rótulo e área de toque do design system.
 *
 * @param props.forma - O que a pessoa preencheu até agora.
 * @param props.aoMudar - Recebe só os campos que mudaram.
 * @param props.erros - Mensagens de erro por campo (mostradas depois da primeira tentativa de salvar).
 * @param props.primeiraData - Data prevista da primeira dose (limite mínimo do fim da repetição).
 */
export function CamposDeRepeticao({
  forma,
  aoMudar,
  erros,
  primeiraData,
}: {
  forma: FormaDeRepetir;
  aoMudar: (mudanca: Partial<FormaDeRepetir>) => void;
  erros: ErrosDeRepeticao;
  primeiraData: CivilDate;
}) {
  const dataFinal = forma.dataFinal === '' ? addMonths(primeiraData, 12) : forma.dataFinal;

  return (
    <View className="gap-lg">
      <Alternar
        rotulo="Esta vacina se repete"
        marcado={forma.repete}
        aoAlterar={(repete) => aoMudar({ repete })}
      />

      {forma.repete ? (
        <View className="gap-lg rounded-campo border-padrao border-borda p-md">
          <CampoTexto
            rotulo="A cada quanto tempo"
            value={forma.cada}
            onChangeText={(texto) => aoMudar({ cada: texto.replace(/\D/g, '') })}
            keyboardType="number-pad"
            maxLength={3}
            autoComplete="off"
            erro={erros.cada}
            ajuda="Escolha o número e a unidade logo abaixo."
          />
          <GrupoDeRadios
            rotulo="Unidade de tempo"
            valor={forma.unidade}
            opcoes={UNIDADES}
            aoEscolher={(unidade) => aoMudar({ unidade })}
          />
          <View className="gap-sm">
            <Texto variante="rotulo">Contar a próxima dose</Texto>
            <GrupoDeRadios
              rotulo="Contar a próxima dose"
              valor={forma.conta}
              opcoes={CONTAGEM}
              aoEscolher={(conta) => aoMudar({ conta })}
            />
            <Texto variante="apoio" className="text-textoSecundario">
              {forma.conta === 'APPLICATION'
                ? 'Se você tomar com atraso, a próxima data também muda.'
                : 'As datas seguem a primeira data prevista, mesmo que você tome um pouco antes ou depois.'}
            </Texto>
          </View>
          <View className="gap-sm">
            <Texto variante="rotulo">Quando termina</Texto>
            <GrupoDeRadios
              rotulo="Quando termina"
              valor={forma.termina}
              opcoes={TERMINO}
              aoEscolher={(termina) =>
                aoMudar(
                  termina === 'DATA' && forma.dataFinal === ''
                    ? { termina, dataFinal }
                    : { termina },
                )
              }
            />
          </View>
          {forma.termina === 'DATA' ? (
            <View className="gap-sm">
              <SeletorDeData
                rotulo="Data final"
                valor={dataFinal}
                aoEscolher={(data) => aoMudar({ dataFinal: data })}
                minimo={primeiroDiaDoFim(primeiraData)}
              />
              <Texto accessibilityLiveRegion="polite">{`Última data possível: ${formatCivilDate(dataFinal)}`}</Texto>
              {erros.dataFinal ? (
                <Texto variante="apoio" className="text-erro" accessibilityLiveRegion="polite">
                  {erros.dataFinal}
                </Texto>
              ) : null}
            </View>
          ) : null}
          {forma.termina === 'DOSES' ? (
            <CampoTexto
              rotulo="Total de doses, contando a primeira"
              value={forma.totalDoses}
              onChangeText={(texto) => aoMudar({ totalDoses: texto.replace(/\D/g, '') })}
              keyboardType="number-pad"
              maxLength={3}
              autoComplete="off"
              erro={erros.totalDoses}
            />
          ) : null}
        </View>
      ) : null}

      <View className="gap-sm">
        <Texto variante="rotulo">Avisar antes</Texto>
        <Texto variante="apoio" className="text-textoSecundario">
          Marque quantos avisos quiser. Sem marcar nada, avisamos 7 dias antes.
        </Texto>
        {AVISO.map((opcao) => (
          <Alternar
            key={opcao.valor}
            rotulo={opcao.rotulo}
            marcado={forma.avisar.includes(opcao.valor)}
            aoAlterar={(marcado) =>
              aoMudar({
                avisar: marcado
                  ? [...forma.avisar, opcao.valor]
                  : forma.avisar.filter((v) => v !== opcao.valor),
              })
            }
          />
        ))}
        <CampoTexto
          rotulo="Outro aviso, em dias antes (opcional)"
          value={forma.avisarOutro}
          onChangeText={(texto) => aoMudar({ avisarOutro: texto.replace(/\D/g, '') })}
          keyboardType="number-pad"
          maxLength={2}
          autoComplete="off"
          erro={erros.avisarOutro}
        />
        <Texto variante="apoio" className="text-textoSecundario">
          O aviso aparece no aplicativo e no e-mail diário, só com a quantidade de vacinas.
        </Texto>
      </View>
    </View>
  );
}
