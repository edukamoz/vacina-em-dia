import { clientIpFrom } from './client-ip';

describe('clientIpFrom', () => {
  test('CT-IP-01: sem cabeçalho, o endereço é desconhecido', () => {
    expect(clientIpFrom(null)).toBe('desconhecido');
    expect(clientIpFrom('')).toBe('desconhecido');
    expect(clientIpFrom(' , ')).toBe('desconhecido');
  });

  test('CT-IP-02: um item só (a plataforma) vale, sem a porta', () => {
    expect(clientIpFrom('203.0.113.7:51234')).toBe('203.0.113.7');
    expect(clientIpFrom('203.0.113.7')).toBe('203.0.113.7');
    expect(clientIpFrom('[2001:db8::1]:443')).toBe('2001:db8::1');
  });

  test('CT-IP-03: o começo forjado pelo cliente é ignorado; vale o último item', () => {
    expect(clientIpFrom('1.1.1.1, 2.2.2.2, 203.0.113.7:51234')).toBe('203.0.113.7');
    expect(clientIpFrom('9.9.9.9,203.0.113.7')).toBe('203.0.113.7');
  });

  test('CT-IP-04: com um proxy próprio na frente, conta dois a partir do fim', () => {
    expect(clientIpFrom('1.1.1.1, 203.0.113.7, 10.0.0.9', 2)).toBe('203.0.113.7');
  });

  test('CT-IP-05: chamada direta com menos itens que o esperado usa o primeiro', () => {
    expect(clientIpFrom('203.0.113.7', 2)).toBe('203.0.113.7');
  });

  test('CT-IP-06: número de proxies inválido volta para 1', () => {
    for (const hops of [0, -1, 1.5, 99, Number.NaN]) {
      expect(clientIpFrom('1.1.1.1, 203.0.113.7', hops)).toBe('203.0.113.7');
    }
  });

  test('CT-IP-07: o endereço é cortado em 64 caracteres', () => {
    expect(clientIpFrom('a'.repeat(200))).toHaveLength(64);
  });
});
