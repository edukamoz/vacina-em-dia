# Árvore de decisão do chatbot (RF07)

Atividade prática da aula "ChatBot I" (Processamento de Linguagem Natural): escolher a funcionalidade em que o chatbot entra e desenhar a árvore de decisão dela.

- **Funcionalidade escolhida:** tirar dúvidas sobre vacinas e sobre o uso do app. O assistente também consulta a conta de quem está logado e executa comandos (adicionar pessoa, registrar e agendar dose), sempre com confirmação (`docs/11-assistente-pln.md`).
- **Tipo de chatbot:** híbrido. **Regras** (árvore de decisão) onde o erro é grave ou a resposta tem que ser sempre a mesma, e **PLN** (TF-IDF + SVM) onde a pessoa escreve ou fala de forma livre. **Sem IA generativa.**
- **Fonte do diagrama:** o código, em `apps/nlp/vacina_nlp/chatbot.py` (`Chatbot.reply` e `_command_or_howto`) e `safety.py`. O desenho segue a ordem em que o código decide; se o código mudar, o diagrama muda junto.

```mermaid
flowchart TD
    A(["Pergunta da pessoa<br/>(texto digitado ou voz transcrita)"]) --> B{"Tem letras<br/>ou números?"}
    B -- não --> R1["Pede para repetir"]
    B -- sim --> C{"Regra de segurança:<br/>sintoma, reação, remédio<br/>ou emergência?"}
    C -- sim --> R2["Não dá orientação médica.<br/>Manda procurar um profissional<br/>ou a unidade de saúde (SAMU 192)"]
    C -- não --> D["Classificador de intenções<br/>TF-IDF + SVM (39 intenções)"]
    D --> E{"Confiança<br/>de pelo menos 0,30?"}
    E -- não --> F{"A pergunta cita<br/>uma vacina?"}
    F -- sim --> R3["Explica a vacina com os dados<br/>do calendário oficial (PNI)"]
    F -- não --> R4["Resposta padrão: não entendi.<br/>Orienta procurar um profissional<br/>ou a unidade de saúde"]
    E -- sim --> G{"Que tipo de<br/>intenção é?"}
    G -- "Conversa, ajuda do app<br/>e privacidade" --> R5["Resposta curada,<br/>escrita à mão"]
    G -- "Calendário oficial" --> R6["Resposta montada com as linhas do<br/>calendário, citando fonte e versão"]
    G -- "Consulta à conta" --> R7["O app responde com os dados<br/>de quem está logado"]
    G -- "Ação na conta" --> H{"É pergunta (como, onde,<br/>posso...) ou comando?"}
    H -- pergunta --> R8["Explica o passo a passo"]
    H -- comando --> R9["Pergunta: Posso marcar...?<br/>Só grava se a pessoa confirmar"]
    G -- "Abrir tela" --> R10["Oferece o botão<br/>para abrir a tela"]

    classDef fim fill:#e8f5ee,stroke:#1a7f5a,color:#10261c
    classDef seguro fill:#fdecea,stroke:#b3261e,color:#3b0d0a
    class R1,R3,R5,R6,R7,R8,R9,R10 fim
    class R2,R4 seguro
```

Versão em imagem (para os PDFs de documentação): `arvore-decisao-chatbot.png` e `arvore-decisao-chatbot.svg`.

![Árvore de decisão do chatbot](arvore-decisao-chatbot.png)

## Como ler

| Nó | O que decide | Onde está no código |
|---|---|---|
| Letras ou números | Texto vazio ou só símbolos pede para repetir | `Chatbot.reply`, primeiro `if` |
| Regra de segurança | Sintoma, reação, remédio e emergência nunca chegam ao modelo | `safety.needs_professional` |
| Confiança de 0,30 | Abaixo disso a pergunta é tratada como "não entendi" (limiar definido na avaliação, `docs/07-testes/avaliacao-chatbot.md`) | `CONFIDENCE_THRESHOLD` |
| Cita uma vacina | Pergunta curta como "febre amarela é para que" ainda é respondida | `extract_vaccines` |
| Tipo de intenção | Decide quem monta a resposta: texto curado, calendário oficial ou o app com os dados da conta | `Chatbot.reply` e `_for_the_app` |
| Pergunta ou comando | "Como adiciono uma pessoa?" explica; "adicionar a Maria nascida em..." vira comando com confirmação | `Chatbot._command_or_howto` |

## Por que a ordem é essa

1. **Segurança antes do modelo:** um classificador pode errar; uma regra de palavras não erra na mesma pergunta. Orientação médica é o erro mais caro, então é o primeiro desvio.
2. **Limiar antes da resposta:** é melhor dizer "não entendi" e orientar a procurar um profissional do que responder errado sobre saúde.
3. **Resposta sempre curada:** nada é gerado; a fonte e a versão do calendário aparecem nas respostas sobre vacinas.
4. **Ação só com confirmação:** o comando mostra o que vai fazer e só grava depois do "Confirmar", pelas mesmas regras da máquina de estados da dose.

## Limites

- O diagrama mostra as decisões do serviço de PLN. A execução do comando e a leitura dos dados da conta acontecem no app (`apps/mobile/src/lib/assistente-conta.ts`); nada da conta passa pelo serviço de PLN (ADR-025).
- As intenções são agrupadas em cinco tipos para caber no desenho; a lista completa das 39 está em `docs/11-assistente-pln.md`.
- O dataset e as respostas ainda aguardam a revisão do autor (ver `docs/11`).
