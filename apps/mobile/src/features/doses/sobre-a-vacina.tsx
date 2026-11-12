import { VACCINE_INFO, vaccineInfoFor } from '@vacina/shared';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { Texto } from '../../components/texto';
import { formatCivilDate } from './format-date';

/**
 * "Sobre esta vacina" (B75): composição e contraindicações copiadas do Manual de Normas e
 * Procedimentos para Vacinação, e onde achar as reações no manual de eventos adversos. Começa
 * fechado, para não pesar a tela da dose. Só aparece para vacinas do calendário que têm ficha; o app
 * nunca cruza a ficha com dados da pessoa (isso seria orientação médica individual).
 *
 * @param props.vacina - Nome da vacina, como no calendário.
 */
export function SobreAVacina({ vacina }: { vacina: string }) {
  const [aberta, setAberta] = useState(false);
  const ficha = vaccineInfoFor(vacina);
  if (!ficha) return null;
  const { norms, adverseEvents } = VACCINE_INFO.sources;

  return (
    <Cartao className="gap-md">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sobre esta vacina"
        accessibilityState={{ expanded: aberta }}
        aria-expanded={aberta}
        onPress={() => setAberta((valor) => !valor)}
        className="min-h-toque flex-row items-center justify-between"
      >
        <Texto variante="titulo3" importantForAccessibility="no">
          Sobre esta vacina
        </Texto>
        <Texto variante="rotulo" importantForAccessibility="no">
          {aberta ? '▲' : '▼'}
        </Texto>
      </Pressable>

      {aberta ? (
        <View className="gap-md">
          <Texto variante="apoio" className="text-textoSecundario">
            {VACCINE_INFO.notice}
          </Texto>

          <View className="gap-xs">
            <Texto variante="corpoNegrito" accessibilityRole="header">
              Composição
            </Texto>
            <Texto>{ficha.composition}</Texto>
          </View>

          <View className="gap-xs">
            <Texto variante="corpoNegrito" accessibilityRole="header">
              Contraindicações desta vacina
            </Texto>
            {ficha.contraindication.map((trecho) => (
              <Texto key={trecho}>{trecho}</Texto>
            ))}
          </View>

          <View className="gap-xs">
            <Texto variante="corpoNegrito" accessibilityRole="header">
              Contraindicações comuns a todas as vacinas
            </Texto>
            {VACCINE_INFO.commonContraindication.map((trecho) => (
              <Texto key={trecho}>{trecho}</Texto>
            ))}
          </View>

          <View className="gap-xs">
            <Texto variante="corpoNegrito" accessibilityRole="header">
              Reações
            </Texto>
            <Texto>
              {`As reações esperadas e raras estão no ${adverseEvents.name} (${adverseEvents.edition}), ${ficha.adverseEvents.quadro}, página ${ficha.adverseEvents.page}.`}
            </Texto>
            <Botao
              titulo="Abrir o manual de eventos adversos"
              variante="secundario"
              onPress={() => void Linking.openURL(adverseEvents.url)}
            />
          </View>

          <View className="gap-xs">
            <Texto variante="apoio" className="text-textoSecundario">
              {`Fonte: ${norms.name}, ${norms.publisher}, ${norms.edition}, seção ${ficha.manualSection}; lido em ${formatCivilDate(norms.retrievedAt)}.`}
            </Texto>
            <Botao
              titulo="Abrir o manual de normas"
              variante="secundario"
              onPress={() => void Linking.openURL(norms.url)}
            />
          </View>
        </View>
      ) : null}
    </Cartao>
  );
}
