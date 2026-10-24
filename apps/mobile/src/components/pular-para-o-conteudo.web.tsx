import { focarConteudoPrincipal, ID_DO_CONTEUDO } from '../lib/pular-conteudo';

/**
 * Link "Pular para o conteúdo" (WCAG 2.4.1): é o primeiro item a receber o foco do teclado e só
 * aparece nesse momento (veja `.pular-conteudo` em `global.css`). Ao ativá-lo, o foco vai direto ao
 * conteúdo da tela, sem passar pela barra de navegação. Não usa `href` com âncora para não mexer
 * na URL do roteador.
 */
export function PularParaOConteudo() {
  return (
    <a
      className="pular-conteudo"
      href={`#${ID_DO_CONTEUDO}`}
      onClick={(evento) => {
        evento.preventDefault();
        focarConteudoPrincipal(document);
      }}
    >
      Pular para o conteúdo
    </a>
  );
}
