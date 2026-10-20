# ADR-020: Foto de perfil guardada no Azure Blob Storage

- **Status:** aceito em 19/10/2026 (decisão do autor: armazenamento de arquivos no Blob Storage, com foco em custo zero)
- **Item do backlog:** B54 (foto de perfil)
- **Relacionados:** ADR-012 (OpenAPI), ADR-010 (limite de uso), `docs/06-seguranca-e-lgpd.md`, `docs/18-termos-e-privacidade.md`.

## Contexto

O autor quer um recurso simples de armazenamento de arquivos: a foto de perfil da conta, mostrada na aba Conta. A foto é dado pessoal e deve ser opcional, privada e apagada junto com a conta. O projeto pede custo zero e sem serviço novo desnecessário.

## Decisão

1. **Onde:** Azure Blob Storage, num contêiner **privado** (`fotos-de-perfil`, sem acesso público) da **mesma conta de armazenamento** que as Functions já exigem (`AzureWebJobsStorage`). Não há recurso novo na Azure; o custo de uma imagem de cerca de 30 KB por conta é praticamente zero. O contêiner é declarado no Bicep (`infra/modules/storage.bicep`) e a API também o cria na primeira escrita, se faltar.
2. **Acesso:** só pela API, nunca por endereço público ou SAS. `GET`, `PUT` e `DELETE /api/account/photo` (autenticadas, na especificação OpenAPI). A chave do arquivo é `perfil/<id da conta>`, vinda da sessão, nunca do cliente: cada conta só alcança a própria foto.
3. **Formato do envio:** JSON com `contentType` (JPEG, PNG ou WebP) e `data` em base64, até 256 KiB depois de decodificada. A API confere os primeiros bytes (número mágico) contra o formato declarado e responde 415 (`INVALID_IMAGE`) ou 413 (`IMAGE_TOO_LARGE`). Limite de 10 trocas por hora por conta (429).
4. **Redução no aparelho:** o app recorta a foto num quadrado, reduz para 256 x 256 px em JPEG (qualidade 0,8) com `expo-image-manipulator` e só então envia. O arquivo original nunca sai do aparelho.
5. **Escolha da foto:** `expo-image-picker` (galeria no celular e na web; câmera só no celular). A permissão é pedida no toque, com o motivo escrito no `app.json`.
6. **Privacidade:** a foto é opcional; a pessoa pode apagá-la a qualquer momento; excluir a conta apaga o arquivo (se o armazenamento falhar, a exclusão falha e a pessoa tenta de novo, em vez de deixar a foto). A resposta nunca vai para o cache (`cache-control: private, no-store`). O log registra só o tipo do erro. A Política de privacidade cita a foto.
7. **Desenvolvimento e testes:** sem `AzureWebJobsStorage`, a foto fica em memória; no Docker, o Azurite faz o papel do Blob Storage.

## Alternativas descartadas

- **Coluna no Azure SQL:** sem serviço novo, mas pesa no banco gratuito e não demonstra armazenamento de arquivos.
- **Endereço assinado (SAS) para o app baixar direto do Blob:** mais peças (geração e validade do endereço) para uma imagem de 30 KB; a API já autentica e devolve o arquivo.
- **Identidade gerenciada para acessar o Blob:** é o desenho mais seguro a longo prazo, mas exigiria `@azure/identity`, atribuição de função no Bicep e mais risco de configuração; a cadeia de conexão já está nas configurações da Function. Fica como evolução.

## Consequências

- Dependências novas: `@azure/storage-blob` 12.34.0 (API), `expo-image-picker` e `expo-image-manipulator` (app), registradas em `docs/tech-versions.md`.
- Requisitos de uso dos módulos nativos: o app instalado precisa ser recompilado (`npm run dev:android`); no Expo Go o seletor de imagens funciona, mas as permissões do `app.json` só valem no build.
- O mesmo `FileStorage` pode servir a outros arquivos no futuro.
