import { resolveTheme } from './resolve-theme';

describe('resolveTheme (CT-TEMA)', () => {
  test.each([
    ['system', 'light', 'light'],
    ['system', 'dark', 'dark'],
    ['system', null, 'light'],
    ['system', undefined, 'light'],
    ['system', 'unspecified', 'light'],
    ['highContrast', 'dark', 'highContrast'],
    ['light', 'dark', 'light'],
    ['dark', 'light', 'dark'],
  ] as const)('CT-TEMA-01: preferência %s com sistema %s resulta em %s', (preference, system, expected) => {
    expect(resolveTheme(preference, system)).toBe(expected);
  });
});
