import { boundingBox, distanceMeters } from './geo';

describe('geo (CT-GEO)', () => {
  test('CT-GEO-01: a distância de um ponto a ele mesmo é zero', () => {
    const p = { latitude: -23.5, longitude: -47.4 };
    expect(distanceMeters(p, p)).toBe(0);
  });

  test('CT-GEO-02: Votorantim a Sorocaba dá cerca de 10 km em linha reta', () => {
    const votorantim = { latitude: -23.5466, longitude: -47.4378 };
    const sorocaba = { latitude: -23.5015, longitude: -47.4526 };
    const d = distanceMeters(votorantim, sorocaba);
    expect(d).toBeGreaterThan(4_500);
    expect(d).toBeLessThan(5_500);
  });

  test('CT-GEO-03: um grau de latitude vale cerca de 111 km', () => {
    const d = distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  test('CT-GEO-04: a distância é simétrica', () => {
    const a = { latitude: -10, longitude: -50 };
    const b = { latitude: -12, longitude: -48 };
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6);
  });

  test('CT-GEO-05: a caixa contém os pontos a até o raio nos quatro sentidos', () => {
    const centro = { latitude: -23.5, longitude: -47.4 };
    const caixa = boundingBox(centro, 5_000);
    for (const p of [
      { latitude: caixa.maxLat, longitude: centro.longitude },
      { latitude: caixa.minLat, longitude: centro.longitude },
      { latitude: centro.latitude, longitude: caixa.maxLon },
      { latitude: centro.latitude, longitude: caixa.minLon },
    ]) {
      expect(distanceMeters(centro, p)).toBeGreaterThanOrEqual(4_990);
    }
    expect(caixa.minLat).toBeLessThan(centro.latitude);
    expect(caixa.maxLon).toBeGreaterThan(centro.longitude);
  });
});
