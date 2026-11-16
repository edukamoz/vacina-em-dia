import { Firestore } from '@google-cloud/firestore';

/**
 * Cliente do Firestore. `ignoreUndefinedProperties` faz o campo ausente (`undefined`) simplesmente
 * não ser gravado, como nos outros repositórios. Na nuvem as credenciais vêm da conta de serviço do
 * Cloud Run (sem chave); em teste, `FIRESTORE_EMULATOR_HOST` aponta para o emulador local.
 *
 * @param projectId - Projeto do Google Cloud (em teste, qualquer nome começando com `demo-`).
 */
export function createFirestoreClient(projectId: string): Firestore {
  return new Firestore({ projectId, ignoreUndefinedProperties: true });
}
