// O armazenamento local do aparelho não existe em teste: usa a versão em memória oficial.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// A área segura do aparelho não existe em teste: usa o mock oficial (margens zero).
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
