import { configure } from '@testing-library/react-native';

// Esperas do Testing Library (`findBy*` e `waitFor`): o prazo padrão de 1 s estoura quando a máquina
// está carregada (CI, vários arquivos em paralelo) e derruba testes corretos. Só muda quanto se
// espera quando algo demora; um teste que passa continua tão rápido quanto antes.
configure({ asyncUtilTimeout: 5000 });
