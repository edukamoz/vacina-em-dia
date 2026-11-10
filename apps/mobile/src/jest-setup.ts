// O armazenamento local do aparelho não existe em teste: usa a versão em memória oficial.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// A área segura do aparelho não existe em teste: usa o mock oficial (margens zero).
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// As notificações do sistema não existem em teste: o módulo é trocado por funções de mentira que cada
// teste pode programar (permissão, agendamento).
jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidImportance: { DEFAULT: 5 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({
    status: 'undetermined',
    granted: false,
    canAskAgain: true,
  })),
  requestPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  })),
  scheduleNotificationAsync: jest.fn(async () => 'aviso'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
}));
