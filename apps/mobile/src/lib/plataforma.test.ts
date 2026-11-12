import * as avisosNativo from './avisos-aparelho';
import * as avisosWeb from './avisos-aparelho.web';
import * as documentoNativo from './ler-documento';
import * as documentoWeb from './ler-documento.web';

/**
 * Cada arquivo `.web` substitui o do celular só na web: se um exportar algo a mais ou a menos, a
 * tela quebra numa plataforma e passa na outra. Estes testes travam a lista de exportações.
 */
describe('variantes por plataforma (ADR-034)', () => {
  test.each([
    ['CT-PLAT-01', 'avisos-aparelho', avisosNativo, avisosWeb],
    ['CT-PLAT-02', 'ler-documento', documentoNativo, documentoWeb],
  ] as const)('%s: %s.web exporta o mesmo que a versão do celular', (_id, _nome, nativo, web) => {
    expect(Object.keys(web).sort()).toEqual(Object.keys(nativo).sort());
  });

  test('CT-PLAT-03: na web não há aviso agendado nem leitura de documento', async () => {
    expect(avisosWeb.avisosSuportados()).toBe(false);
    expect(await avisosWeb.lerPermissaoDeAvisos()).toBe('negada');
    expect(await avisosWeb.pedirPermissaoDeAvisos()).toBe('negada');
    await expect(avisosWeb.reagendarAvisos()).resolves.toBeUndefined();
    expect(documentoWeb.podeLerDocumento).toBe(false);
    expect(await documentoWeb.lerDocumento()).toEqual({ tipo: 'indisponivel' });
  });
});
