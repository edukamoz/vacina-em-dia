import { focarConteudoPrincipal, ID_DO_CONTEUDO, type ElementoFocavel } from './pular-conteudo';

function elemento(visivel: boolean): ElementoFocavel & { focus: jest.Mock } {
  return { focus: jest.fn(), getClientRects: () => ({ length: visivel ? 1 : 0 }) };
}

function raizCom(...itens: ElementoFocavel[]) {
  return { querySelectorAll: jest.fn(() => itens) };
}

describe('link "Pular para o conteúdo" (CT-A11Y)', () => {
  test('CT-A11Y-01: foca o conteúdo da tela e busca pelo id combinado', () => {
    const alvo = elemento(true);
    const raiz = raizCom(alvo);
    expect(focarConteudoPrincipal(raiz)).toBe(true);
    expect(alvo.focus).toHaveBeenCalledTimes(1);
    expect(raiz.querySelectorAll).toHaveBeenCalledWith(`[id="${ID_DO_CONTEUDO}"]`);
  });

  test('CT-A11Y-02: com telas empilhadas, foca a última que está à vista e ignora as escondidas', () => {
    const anterior = elemento(true);
    const daFrente = elemento(true);
    const escondida = elemento(false);
    expect(focarConteudoPrincipal(raizCom(anterior, daFrente, escondida))).toBe(true);
    expect(daFrente.focus).toHaveBeenCalledTimes(1);
    expect(anterior.focus).not.toHaveBeenCalled();
    expect(escondida.focus).not.toHaveBeenCalled();
  });

  test('CT-A11Y-03: sem conteúdo à vista, não foca nada e avisa com false', () => {
    const escondida = elemento(false);
    expect(focarConteudoPrincipal(raizCom(escondida))).toBe(false);
    expect(focarConteudoPrincipal(raizCom())).toBe(false);
    expect(escondida.focus).not.toHaveBeenCalled();
  });
});
