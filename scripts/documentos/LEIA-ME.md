# Geração das documentações e da apresentação

Os arquivos Word e PowerPoint ficam em `doctos/` (fora do Git, por decisão do autor); estes scripts os regeneram a partir do repositório, para que a documentação acompanhe o código.

| Script | Gera | Depende de |
|---|---|---|
| `gerar_doc_tecnica.py` | `doctos/Documentacao_Tecnica.docx` | `docs/` (requisitos, tecnologias, backlog) e os diagramas de `docs/03-uml/*.png` |
| `gerar_doc_usuario.py` | `doctos/Documentacao_do_Usuario.docx` | capturas de tela em `doctos/capturas/` |
| `gerar_apresentacao_web.py` | `doctos/Apresentacao.html` (apresentação animada em um só arquivo, abre no navegador, sem internet) | modelo em `apresentacao/index.html`, capturas em `doctos/capturas/apresentacao/` (geradas pelo `capturas-apresentacao.spec.ts.txt`: copie para `apps/mobile/e2e/` com a extensão `.spec.ts`, rode com `E2E_CANAL=chrome npx playwright test` e apague a cópia) |
| `capturas.mjs` | `doctos/capturas/*.png` (web e celular) | app e API no ar e Chrome instalado |
| `capturas-novas.spec.ts.txt` | `doctos/capturas/celular-10…14`, `web-07`, `web-10`, `web-11` e `celular-07` (telas novas: foto, Pix, caderneta, janelas, apresentação e Conta) | Playwright com a API falsa dos testes de ponta a ponta (sem Docker nem dados reais); ver abaixo |

**Atenção:** regenerar **sobrescreve** o arquivo. Se você editou o Word à mão, guarde uma cópia antes (ou me peça para fazer as mudanças pelo script).

## Passo a passo

```bash
pip install python-docx
docker compose up -d --build            # app em http://localhost:8080 e API
# crie a conta de teste e os dados de exemplo (nomes fictícios) na API local
npm install --no-save puppeteer-core
node scripts/documentos/capturas.mjs     # APP_URL=http://localhost:8080 por padrão
python scripts/documentos/gerar_doc_tecnica.py
python scripts/documentos/gerar_doc_usuario.py
python scripts/documentos/gerar_apresentacao_web.py
```

Os PDFs de entrega saem da conversão dos arquivos Word (Arquivo > Salvar como > PDF) só no momento da entrega.

## Capturas das telas novas (B52 a B57)

As telas novas saem pelo Playwright, com a API falsa de `apps/mobile/e2e/api-falsa.ts` (nomes fictícios, sem Docker):

1. Faça o build web com uma chave Pix **fictícia** e a leitura da caderneta simulada. Para isso, aplique **só no seu computador, sem commitar**, um desvio temporário em `apps/mobile/src/lib/ler-documento.ts`: com `EXPO_PUBLIC_CAPTURA=1` na web, `podeLerDocumento` vale `true` e `lerDocumento` devolve linhas de exemplo (por exemplo, "BCG dose única 12/02/2026" e "Hepatite B ao nascer 10/02/2026"). Depois do build, desfaça com `git checkout apps/mobile/src/lib/ler-documento.ts`.
   ```bash
   cd apps/mobile
   EXPO_PUBLIC_CAPTURA=1 EXPO_PUBLIC_PIX_KEY=123e4567-e12b-12d1-a456-426655440000 EXPO_PUBLIC_PIX_NAME="Exemplo Ficticio" EXPO_PUBLIC_PIX_CITY=Votorantim npx expo export --platform web
   ```
2. Copie `capturas-novas.spec.ts.txt` para `apps/mobile/e2e/zz-capturas-novas.spec.ts`, troque `__FOTO__` por um JPEG em base64 (avatar fictício) e rode `E2E_CANAL=chrome npx playwright test e2e/zz-capturas-novas.spec.ts`. Apague o arquivo `zz-…` depois.
3. Regenere o Word: `python scripts/documentos/gerar_doc_usuario.py`.

**Armadilha:** não use o `test` de `e2e/base.ts` para capturar: ele trava o relógio e as animações de entrada do app não andam, então a tela sai em branco.

