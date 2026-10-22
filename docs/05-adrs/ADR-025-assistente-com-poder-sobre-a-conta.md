# ADR-025: Assistente com poder sobre a conta (consulta e comandos com confirmação)

- **Status:** aceito em 21/10/2026 (decisão do autor: o assistente deve poder adicionar pessoas, registrar doses e informar sobre qualquer coisa da conta e da plataforma, respeitando a segurança)
- **Item do backlog:** B61
- **Relacionados:** ADR-002 (PLN em Python), ADR-010 (limite de uso), `docs/06-seguranca-e-lgpd.md`, CLAUDE.md §8, §9 e §10.

## Contexto

O assistente respondia só a perguntas gerais (uso do app e Calendário Nacional). O autor quer que ele "tenha mais poder": consultar o que há na conta de quem está logado, executar ações (adicionar pessoa, registrar dose) e explicar qualquer recurso. Restrições do projeto: sem IA generativa, sem orientação médica, dados de saúde são sensíveis e o serviço de PLN é uma Function separada.

## Decisão

1. **O PLN só entende; o app age.** O serviço de PLN (`apps/nlp`) classifica a intenção e extrai **entidades** por regras (vacinas, nomes, datas, dia relativo, tela). Ele **nunca recebe nem devolve dado da conta**. O app cruza as entidades com os dados da pessoa logada (consultas já guardadas pelo app) e monta a resposta com **modelos de frase** (`apps/mobile/src/lib/assistente-conta.ts`), citando a fonte "Seus dados no Vacina em Dia". A API só repassa as entidades (campo `entities` do `AssistantReply`, documentado no OpenAPI).
2. **Toda gravação pede confirmação.** Adicionar pessoa, registrar dose e agendar dose mostram o que será feito ("Posso marcar BCG de Maria como aplicada em 20/10/2026?") com **Confirmar** e **Cancelar**; os botões somem depois de usados. A gravação usa os **mesmos endpoints** das telas (`POST /members`, `POST /doses/{id}/events`), então valem a máquina de estados da dose, as validações e a propriedade por usuário da API. O assistente também recusa o que as telas recusariam (data futura para dose aplicada, nascimento no futuro, nome repetido, dose já aplicada).
3. **Lista fechada de poderes.** Consultar (família, doses atrasadas, próxima dose, resumo, lembretes, dados da conta), **adicionar pessoa**, **registrar dose**, **agendar dose** e **abrir telas** (por botão, nunca sozinho). **Fora, de propósito:** excluir pessoa, dose ou conta; cancelar dose; trocar e-mail ou senha; qualquer coisa de pagamento. Pedidos assim recebem a explicação de como fazer pelas telas.
4. **Segurança de saúde primeiro.** A regra de segurança (`safety.py`) vem antes do classificador e dos comandos: "registrar que a Maria tomou a vacina e teve febre" vai para a orientação de procurar um profissional.
5. **Comando contra explicação.** "Como adiciono uma pessoa?" explica; "adicionar a Maria nascida em 10/02/2026" age. A decisão é do serviço (`_command_or_howto`): palavras de pergunta (como, onde, posso...) ficam com a explicação; fora delas, nome, data ou vacina na frase indicam comando.
6. **Mais ajuda sobre a plataforma.** Nove intenções novas de ajuda curada (gráficos, novidades, Pix, caderneta por foto, foto de perfil, aparência, instalação, sair, postos).
7. **Dataset e limiar.** 20 para 39 intenções (1.060 frases de treino, 195 de teste separado). O limiar de confiança passou de 0,40 para 0,30: com mais classes as probabilidades calibradas se espalham e, a 0,40, só dois terços do teste seriam respondidos. F1 macro de 0,90 no teste (meta 0,85).

## Alternativas descartadas

- **Enviar os dados da conta ao PLN para ele montar a resposta:** espalha dado de saúde por mais um serviço, sem ganho.
- **IA generativa com chamada de ferramentas (agente):** proibida pelo escopo; ações imprevisíveis sobre dado de saúde.
- **Executar a ação assim que a frase é entendida:** o reconhecimento de voz e de texto erra; gravar sem conferir é pior que digitar à mão.
- **Abrir telas sozinho:** surpreende; o botão custa um toque.

## Consequências

- O assistente passa a consultar a conta a cada pergunta desse tipo (usa o cache de dados do app, sem chamadas novas quando já carregado). Os limites de uso do ADR-010 continuam valendo para a pergunta.
- O texto que a pessoa escreveu (com nomes) segue o mesmo caminho de antes: API e PLN, sem gravar nem registrar em log.
- Nomes são um palpite por regra (inicial maiúscula ou palavra depois de "adicionar"): o app mostra o nome na confirmação e a pessoa corrige cancelando.
- A verificação com voz e em celular físico é do autor.
