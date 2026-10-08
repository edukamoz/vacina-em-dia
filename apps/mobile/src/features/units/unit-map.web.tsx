import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useThemeColors } from '../../theme/theme-provider';
import { createUnitsMap, type UnitsMapController } from './leaflet-map';
import { MAP_CONTROLS_CSS, type UnitMapProps } from './unit-map-types';

/**
 * Mapa de postos para a web: Leaflet com os mapas do OpenStreetMap direto no navegador. Os
 * marcadores têm o nome da unidade (funcionam por teclado) e o mapa cabe no espaço que receber.
 */
export function UnitMap({ units, selectedCnes, position, onSelect }: UnitMapProps) {
  const cores = useThemeColors();
  const container = useRef<HTMLDivElement>(null);
  const controller = useRef<UnitsMapController | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!container.current) return undefined;
    const map = createUnitsMap(L, container.current, {
      colors: {
        fill: cores.primaria,
        selectedFill: cores.agendada,
        cross: cores.sobrePrimaria,
        stroke: cores.sobrePrimaria,
      },
      positionColor: cores.agendada,
      positionRing: '#ffffff',
      onSelect: (cnes) => onSelectRef.current(cnes),
    });
    controller.current = map;
    return () => {
      map.destroy();
      controller.current = null;
    };
  }, [cores.primaria, cores.agendada, cores.sobrePrimaria]);

  useEffect(() => {
    controller.current?.update(units, selectedCnes, position);
  }, [units, selectedCnes, position]);

  return (
    <View
      accessibilityLabel="Mapa dos postos de saúde"
      role="group"
      className="h-[360px] w-full overflow-hidden rounded-cartao border-fina border-bordaSuave expandido:h-[560px]"
    >
      <style>{MAP_CONTROLS_CSS}</style>
      <div ref={container} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}
