import type * as React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { MAP_BASE_URL } from './native-map-html';
import { UnitMap } from './unit-map';

const mockInject = jest.fn();
let mockProps: Record<string, (...args: never[]) => unknown> = {};
jest.mock('react-native-webview', () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual<typeof React>('react');
  return {
    WebView: forwardRef((props: Record<string, never>, ref) => {
      mockProps = props;
      useImperativeHandle(ref, () => ({ injectJavaScript: mockInject }));
      return null;
    }),
  };
});

const UNITS = [{ cnes: '1', name: 'Posto A', latitude: -23.5, longitude: -47.4 }];

describe('mapa dos postos no celular (WebView)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('CT-UNI-APP-50: só envia os dados depois que a página do mapa avisa que está pronta', async () => {
    await render(
      <UnitMap units={UNITS} selectedCnes={null} position={null} onSelect={jest.fn()} />,
    );
    expect(screen.getByLabelText('Mapa dos postos de saúde')).toBeOnTheScreen();
    expect(mockInject).not.toHaveBeenCalled();

    await act(async () => {
      mockProps['onMessage']?.({ nativeEvent: { data: 'pronto' } } as never);
    });
    expect(mockInject).toHaveBeenCalledTimes(1);
    expect(String(mockInject.mock.calls[0]?.[0])).toContain('window.setData(');
  });

  test('CT-UNI-APP-51: o código recebido da página é a unidade escolhida', async () => {
    const onSelect = jest.fn();
    await render(<UnitMap units={UNITS} selectedCnes={null} position={null} onSelect={onSelect} />);
    await act(async () => {
      mockProps['onMessage']?.({ nativeEvent: { data: '0000001' } } as never);
    });
    expect(onSelect).toHaveBeenCalledWith('0000001');
  });

  test('CT-UNI-APP-52: links de fora abrem no navegador do aparelho, nunca dentro do mapa', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(
      <UnitMap units={UNITS} selectedCnes={null} position={null} onSelect={jest.fn()} />,
    );
    const permitir = mockProps['onShouldStartLoadWithRequest'] as unknown as (r: {
      url: string;
    }) => boolean;
    expect(permitir({ url: 'about:blank' })).toBe(true);
    expect(permitir({ url: `${MAP_BASE_URL}/` })).toBe(true);
    expect(permitir({ url: 'https://www.openstreetmap.org/copyright' })).toBe(false);
    expect(abrir).toHaveBeenCalledWith('https://www.openstreetmap.org/copyright');
    abrir.mockClear();
    expect(permitir({ url: 'http://inseguro.exemplo' })).toBe(false);
    expect(abrir).not.toHaveBeenCalled();
    void fireEvent;
  });
});
