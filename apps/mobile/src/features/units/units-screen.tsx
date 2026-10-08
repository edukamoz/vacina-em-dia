import type { HealthUnit } from '@vacina/shared';
import { useMemo, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { CampoTexto } from '../../components/campo-texto';
import { EstadoCarregando } from '../../components/estados';
import { Icone } from '../../components/icone';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { useThemeColors, useVisual } from '../../theme/theme-provider';
import { formatCivilDate } from '../doses/format-date';
import { formatDistance, normalizeSearch, routeUrl, telUrl } from './units-format';
import { UnitMap } from './unit-map';
import { useUnits } from './use-units';

/** Cartão de uma unidade: nome, endereço, distância, telefone e turno; ao escolher, mostra a rota. */
function UnitCard({
  unit,
  selected,
  onSelect,
}: {
  unit: HealthUnit;
  selected: boolean;
  onSelect: () => void;
}) {
  const cores = useThemeColors();
  const { sombra, altoContraste } = useVisual();
  const where = [unit.address, unit.neighborhood].filter(Boolean).join(', ');
  return (
    <View role="listitem">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${unit.name}, ${formatDistance(unit.distanceMeters)}. ${where}`}
        accessibilityState={{ selected }}
        aria-pressed={selected}
        onPress={onSelect}
        style={selected ? sombra(2) : sombra(1)}
        className={`flex-row items-start gap-md rounded-cartao bg-superficie p-lg ${
          selected
            ? 'border-padrao border-primaria'
            : altoContraste
              ? 'border-altoContraste border-borda'
              : 'border-fina border-bordaSuave'
        }`}
      >
        <View
          aria-hidden
          className="h-[44px] w-[44px] items-center justify-center rounded-[14px] border-padrao border-primaria bg-primariaSuave"
        >
          <Icone nome="local" cor={cores.primaria} />
        </View>
        <View className="flex-1 gap-xs">
          <Texto variante="titulo3" importantForAccessibility="no">
            {unit.name}
          </Texto>
          <Texto variante="apoio" className="text-textoSecundario" importantForAccessibility="no">
            {`${where}. ${formatDistance(unit.distanceMeters)}.`}
          </Texto>
          {unit.shift ? (
            <Texto variante="apoio" importantForAccessibility="no">
              {`Atendimento: ${unit.shift}`}
            </Texto>
          ) : null}
        </View>
      </Pressable>
      {selected ? (
        <View className="flex-row flex-wrap gap-sm pt-sm">
          <Botao
            titulo="Ver rota"
            icone="seta"
            onPress={() => void Linking.openURL(routeUrl(unit.latitude, unit.longitude))}
          />
          {unit.phone ? (
            <Botao
              titulo={`Ligar: ${unit.phone}`}
              variante="secundario"
              onPress={() => void Linking.openURL(telUrl(unit.phone as string))}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Tela "Postos de saúde" (RF10): mapa e lista das unidades básicas de saúde perto da pessoa, do
 * cadastro oficial (CNES, Ministério da Saúde). Funciona primeiro com a lista guardada no aparelho
 * e, quando há internet, busca a lista atual. A localização só é pedida ao tocar no botão, e a
 * posição não é guardada. A lista não diz quais unidades têm sala de vacina: a tela avisa para
 * ligar antes de ir.
 */
export function UnitsScreen() {
  const units = useUnits();
  const [selectedCnes, setSelectedCnes] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const term = normalizeSearch(search);
    if (!term) return units.items;
    return units.items.filter((unit) =>
      normalizeSearch(`${unit.name} ${unit.address} ${unit.neighborhood}`).includes(term),
    );
  }, [units.items, search]);

  const busy = units.phase === 'locating' || units.phase === 'loading';
  const hasList = units.items.length > 0;
  const receivedOn = units.receivedAt ? formatCivilDate(units.receivedAt.slice(0, 10)) : null;

  return (
    <Tela
      reservaBalao
      titulo="Postos de saúde"
      subtitulo="Unidades básicas de saúde perto de você."
    >
      <View className="flex-col-reverse gap-xl expandido:flex-row expandido:items-start">
        <View className="gap-lg expandido:w-[400px]">
          <Botao
            titulo="Usar minha localização"
            icone="local"
            variante={hasList ? 'secundario' : 'principal'}
            disabled={busy}
            onPress={() => void units.locate()}
          />
          <Texto variante="apoio" className="text-textoSecundario">
            O app pede a sua localização só agora, só para achar os postos, e não guarda a sua
            posição.
          </Texto>

          {busy ? (
            <EstadoCarregando
              rotulo={units.phase === 'locating' ? 'Buscando a sua posição' : 'Buscando os postos'}
            />
          ) : null}
          {units.error ? (
            <View
              accessible
              accessibilityRole="alert"
              className="flex-row gap-sm rounded-[16px] border-padrao border-erro bg-erroSuave p-md"
            >
              <Texto className="flex-1">{units.error}</Texto>
            </View>
          ) : null}
          {units.offline ? (
            <View
              accessible
              accessibilityRole="alert"
              className="rounded-[16px] border-padrao border-agendada bg-agendadaSuave p-md"
            >
              <Texto>
                Sem internet agora. Mostrando a lista salva neste aparelho
                {receivedOn ? ` em ${receivedOn}` : ''}, da mais perto para a mais longe de você.
              </Texto>
            </View>
          ) : null}

          {hasList ? (
            <>
              <CampoTexto
                rotulo="Buscar por nome ou rua"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              {!units.position && receivedOn ? (
                <Texto variante="apoio" className="text-textoSecundario">
                  {`Lista salva em ${receivedOn}. Toque em "Usar minha localização" para ver os postos perto de você agora.`}
                </Texto>
              ) : null}
              <View role="list" className="gap-md">
                {visible.map((unit) => (
                  <UnitCard
                    key={unit.cnes}
                    unit={unit}
                    selected={unit.cnes === selectedCnes}
                    onSelect={() => setSelectedCnes(unit.cnes === selectedCnes ? null : unit.cnes)}
                  />
                ))}
                {visible.length === 0 ? (
                  <Texto className="text-textoSecundario">
                    Nenhum posto encontrado. Tente outro nome.
                  </Texto>
                ) : null}
              </View>
            </>
          ) : !busy && !units.error ? (
            <Cartao className="gap-sm">
              <Texto variante="titulo3" accessibilityRole="header">
                Vamos achar os postos perto de você
              </Texto>
              <Texto className="text-textoSecundario">
                Toque em "Usar minha localização". Se preferir não permitir, as outras telas do app
                continuam funcionando normalmente.
              </Texto>
            </Cartao>
          ) : null}

          <View className="gap-sm rounded-[16px] border-fina border-bordaSuave bg-superficieSuave p-lg">
            <Texto variante="apoio" className="font-negrito text-texto">
              Ligue antes de ir
            </Texto>
            <Texto variante="apoio" className="text-textoSecundario">
              {units.notice ??
                'A lista traz unidades básicas de saúde do cadastro oficial (CNES). Nem todas têm sala de vacina: ligue antes de ir.'}
            </Texto>
            {units.source ? (
              <Texto variante="apoio" className="text-textoSecundario">
                {`Fonte: ${units.source.name}, ${units.source.publisher}, arquivo de ${formatCivilDate(
                  units.source.dataVersion,
                )}. ${
                  units.source.live
                    ? 'Telefone e turno atualizados agora pela API oficial.'
                    : 'Telefone e turno podem estar desatualizados.'
                }`}
              </Texto>
            ) : null}
            <Texto variante="apoio" className="text-textoSecundario">
              Mapa: © colaboradores do OpenStreetMap.
            </Texto>
          </View>
        </View>

        <View className="expandido:flex-1">
          <UnitMap
            units={visible}
            selectedCnes={selectedCnes}
            position={units.position}
            onSelect={setSelectedCnes}
          />
        </View>
      </View>
    </Tela>
  );
}
