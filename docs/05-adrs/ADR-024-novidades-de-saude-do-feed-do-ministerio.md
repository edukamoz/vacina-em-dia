# ADR-024: Novidades de saúde a partir do feed do Ministério da Saúde

- **Status:** aceito em 21/10/2026 (decisão do autor: mostrar eventos recentes de saúde e vacinação)
- **Item do backlog:** B59 (novidades de saúde)
- **Relacionados:** ADR-010 (limite de uso), `docs/06-seguranca-e-lgpd.md`, `docs/18-termos-e-privacidade.md`, CLAUDE.md §3 e §8 (fonte oficial; sem orientação médica; sem IA generativa).

## Contexto

O autor pediu uma funcionalidade que mostre eventos recentes e atualizados sobre saúde, vacinas e assuntos correlatos. O app só pode repassar conteúdo de **fonte oficial** e **não pode dar orientação médica** nem usar IA generativa. O app já fala com a API da própria Function e a API já consulta, no servidor, uma fonte oficial (CNES, no mapa de postos).

## Decisão

1. **Fonte:** o feed RSS 1.0 do portal do Ministério da Saúde (`https://www.gov.br/saude/RSS`), que é público e vem do próprio portal. O feed cobre o site todo; o cliente **só aceita links de notícias** do padrão `https://www.gov.br/saude/pt-br/assuntos/noticias-ms/AAAA/mês/título` (descarta anexos, imagens, PDFs, editais e qualquer endereço de outro domínio). Outras fontes testadas: o Butantan bloqueia leitura automática (403) e a Agência Gov não tem feed no endereço esperado; podem entrar depois.
2. **O que se guarda e mostra:** só **título, data e link**; nunca o texto da notícia, nem resumo, nem imagem. Tocar abre a página original. O app **não comenta** a notícia: um aviso fixo diz que não é orientação médica nem substitui a caderneta.
3. **Etiqueta "Vacinação":** vem de **palavras fixas** no título (vacina, imunização, nomes de doenças do calendário), sem IA. Na mesma data, as de vacinação vêm antes.
4. **Onde roda:** a leitura é **no servidor** (`GET /api/news`, exige login), com cópia na memória por **1 hora** (no máximo 1 leitura do feed por hora por instância; chamadas simultâneas dividem uma só leitura), tempo máximo de 5 s e teto de 1 MB. **Nada do usuário** (conta, família, localização) vai ao feed; o endereço é fixo. Se o feed falhar, a API devolve a última cópia boa ou uma lista vazia, nunca um erro; o app esconde o cartão. `NEWS_FEED=off` desliga a leitura (testes e desenvolvimento sem rede).
5. **Limite de uso:** 30 consultas por pessoa a cada 10 minutos (mesmo mecanismo do ADR-010).
6. **Na tela:** cartão "Novidades de saúde" no fim da aba Doses, com até 5 notícias, a fonte, a data da leitura e o aviso.

## Alternativas descartadas

- **Resumo ou "explicação" da notícia por IA:** proibido (sem IA generativa) e arriscado para dado de saúde.
- **Ler o feed direto no app:** exporia cada aparelho ao site, ficaria sem cópia e, na web, esbarraria em CORS.
- **Raspar páginas HTML:** frágil e menos respeitoso do que o feed oficial.
- **Serviço de notícias de terceiros ou rede social:** fonte não oficial.

## Consequências

- Nenhuma dependência nova nem serviço Azure novo; a Function faz uma consulta HTTPS de saída por hora por instância.
- A Política de privacidade não muda (nenhum dado pessoal é enviado ou guardado); o termo de fonte aparece no próprio cartão.
- O feed pode mudar de formato ou sair do ar: o parser é puro e testado, e a falha só esconde o cartão. Os direitos sobre as notícias são do Ministério da Saúde; o app só liga a elas.
- Verificação com o feed real: o filtro de links foi conferido contra uma cópia do feed de 21/10/2026 (8 de 15 itens são notícias; o resto são anexos e editais).
