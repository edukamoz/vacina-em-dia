# ADR-019: Carteira de vacinação em PDF gerada na API (RF11)

- **Status:** aceito em 10/10/2026 (decisão do autor: "começar a implementar" as sugestões, exceto compartilhar com cuidador)
- **Item do backlog:** B14 (RF11, versão completa; pedido explícito do autor)
- **Relacionados:** ADR-012 (OpenAPI), ADR-001 (API sem Express), `docs/06-seguranca-e-lgpd.md`.

## Contexto

O RF11 pede para exportar a carteira de vacinação em PDF, para levar à escola ou à consulta. O PDF tem dado de saúde (dado sensível pela LGPD) e precisa funcionar na web e no celular, com a mesma aparência. Também precisa dizer de onde vêm os dados e que **não substitui a caderneta oficial**.

## Decisão

1. **A API gera o PDF**: `GET /api/members/{id}/doses/pdf` (autenticada) usa o mesmo calendário que o app já mostra (`DoseService.listForMember`) e devolve `application/pdf` como anexo, com `cache-control: no-store`. A posse do membro é verificada pelo serviço de dose (membro de outra conta devolve 404). A rota está na especificação OpenAPI, e o teste que confere "toda rota está documentada" cobre.
2. **PDFKit** (`pdfkit` 0.20.2, MIT, mantido): gera o arquivo com as fontes padrão do PDF (Helvetica), que cobrem os acentos do português, sem baixar fonte nem usar navegador. Sem rede e sem serviço novo no Azure. Roda dentro da própria Function.
3. **Conteúdo**: quem é a pessoa (nome ou apelido, nascimento e idade, faixa, parentesco e gestante, só o que já está cadastrado), resumo, tabela de doses com situação e data e, **em toda página**, a fonte, a versão do calendário e o aviso de que a cópia não substitui a caderneta nem tem valor legal. Não leva e-mail da conta nem identificador interno.
4. **Relógio injetado**: o "hoje" e a data de emissão vêm do relógio da API (nunca `new Date()` na regra). As mesmas entradas dão o mesmo arquivo, o que permite testar.
5. **No app**: cartão "Levar a carteira com você" na aba Doses. Na web o navegador salva o arquivo (`Blob` e link de download); no celular o app grava na pasta temporária (`expo-file-system`) e abre a folha de compartilhar do sistema (`expo-sharing`). O PDF não fica guardado no app.

## Alternativas descartadas

- **Gerar no app** (`expo-print` ou `window.print`): duas implementações diferentes para web e celular, aparência diferente e mais código sem teste de ponta a ponta.
- **`pdf-lib`**: sem manutenção desde 2021.
- **Navegador sem tela (Puppeteer/Chromium) na API**: pesado demais para a Function e para o custo.
- **Guardar o PDF no Blob Storage**: guardaria dado de saúde fora do banco sem necessidade; o arquivo é gerado na hora e só trafega para quem pediu.

## Privacidade e segurança

- Só o dono da conta alcança o PDF de seus membros. O consentimento é exigido, como no calendário.
- O PDF não é gravado no servidor e não vai para o log (o log da API nunca recebe nome nem conteúdo).
- No celular, o arquivo temporário fica no cache do app, que o sistema pode limpar.
- O PDF é uma **cópia de conferência**: não é documento oficial e o texto diz isso.

## Consequências

- Uma dependência nova na API (`pdfkit` e `@types/pdfkit`) e duas no app (`expo-file-system`, `expo-sharing`), registradas em `docs/tech-versions.md`.
- A geração roda na Function; o PDF é pequeno (alguns KB por pessoa) e a geração leva milissegundos.
- Compartilhar com o cuidador (RF12) ficou de fora por decisão do autor e exigiria permissões e links com validade.
