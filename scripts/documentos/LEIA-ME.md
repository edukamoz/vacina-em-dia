# Geração das documentações e da apresentação

Os arquivos Word e PowerPoint ficam em `doctos/` (fora do Git, por decisão do autor); estes scripts os regeneram a partir do repositório, para que a documentação acompanhe o código.

| Script | Gera | Depende de |
|---|---|---|
| `gerar_doc_tecnica.py` | `doctos/Documentacao_Tecnica.docx` | `docs/` (requisitos, tecnologias, backlog) e os diagramas de `docs/03-uml/*.png` |
| `gerar_doc_usuario.py` | `doctos/Documentacao_do_Usuario.docx` | capturas de tela em `doctos/capturas/` |
| `gerar_apresentacao.py` | `doctos/Apresentacao.pptx` | capturas e diagramas |
| `capturas.mjs` | `doctos/capturas/*.png` (web e celular) | app e API no ar e Chrome instalado |

**Atenção:** regenerar **sobrescreve** o arquivo. Se você editou o Word à mão, guarde uma cópia antes (ou me peça para fazer as mudanças pelo script).

## Passo a passo

```bash
pip install python-docx python-pptx
docker compose up -d --build            # app em http://localhost:8080 e API
# crie a conta de teste e os dados de exemplo (nomes fictícios) na API local
npm install --no-save puppeteer-core
node scripts/documentos/capturas.mjs     # APP_URL=http://localhost:8080 por padrão
python scripts/documentos/gerar_doc_tecnica.py
python scripts/documentos/gerar_doc_usuario.py
python scripts/documentos/gerar_apresentacao.py
```

Os PDFs de entrega saem da conversão dos arquivos Word (Arquivo > Salvar como > PDF) só no momento da entrega.
