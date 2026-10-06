import { EstadoVazio } from '../../components/estados';
import { Tela } from '../../components/tela';

/**
 * Aba "Assistente" (RF06 e RF07). Provisória: o chatbot por regras com classificação de intenções
 * e a busca por voz entram no próximo item.
 */
export function AssistantScreen() {
  return (
    <Tela titulo="Assistente" subtitulo="Tire dúvidas sobre o app e sobre as vacinas.">
      <EstadoVazio
        titulo="Em breve"
        descricao="Aqui você vai poder perguntar por texto ou por voz, por exemplo: o que significa uma dose atrasada?"
      />
    </Tela>
  );
}
