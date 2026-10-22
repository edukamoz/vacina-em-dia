# Domínio próprio e gratuito para o site (B62)

Hoje o app web responde em `https://blue-rock-0d7abc710.4.azurestaticapps.net` (Azure Static Web Apps, plano Free). O Azure **não deixa renomear** esse endereço padrão, então um endereço bonito exige um **domínio próprio** apontado para o site. O Static Web Apps (Free) aceita domínio personalizado e emite o **certificado HTTPS gratuito** sozinho. O custo está só em ter o domínio.

> Estado em 21/10/2026: **pesquisado, não configurado.** O passo que depende de você é conseguir o domínio (criar conta e verificar que é estudante, ou abrir um PR no registro gratuito). Eu não crio contas em seu nome.

## Opções sem custo (conferidas em 21/10/2026)

| Opção | Custo | Exemplo | Observações |
|---|---|---|---|
| **GitHub Student Developer Pack, Namecheap** | Grátis **por 1 ano** | `vacinaemdia.me` | Domínio de verdade (.me), certificado grátis por 1 ano no pacote. Exige ser estudante verificado no GitHub Education (e-mail da Fatec ou comprovante). **Depois do 1º ano a renovação é paga**; dá para deixar vencer e voltar ao endereço do Azure. Termos do pacote mudam: conferir em [education.github.com/pack](https://education.github.com/pack). O pacote também lista o Name.com, com um domínio grátis em mais de 25 terminações. |
| **is-a.dev (subdomínio gratuito para desenvolvedores)** | Grátis, sem prazo declarado | `vacinaemdia.is-a.dev` | Registro por **pull request** no repositório `is-a-dev/register` (um arquivo JSON com o nome e o CNAME). O projeto pede que o PR seja **escrito por você, sem IA**, e pode recusar. É um serviço mantido por voluntários: sem garantia de permanência. Documentação: [docs.is-a.dev](https://docs.is-a.dev/). |

**Recomendação:** se você é elegível ao pacote de estudante, o `.me` dá o endereço mais profissional para a apresentação de 19/11 (custo zero até lá e por 1 ano). Se não, ou como plano B, o `is-a.dev`. Nenhum dos dois exige cartão. Evite nomes grandes: `vacinaemdia` já é curto.

## Passo a passo (depois de ter o domínio)

Substitua `app.vacinaemdia.me` pelo seu nome. Use **subdomínio** (`app.` ou `www.`): ele usa um registro CNAME simples. Domínio "pelado" (sem subdomínio) exige validação por TXT e, em alguns registradores, o Azure DNS.

1. **No registrador (ou no PR do is-a.dev):** crie o registro `CNAME  app  →  blue-rock-0d7abc710.4.azurestaticapps.net`.
2. **No Azure** (com `az login`):
   ```bash
   az staticwebapp hostname set -n swa-vacinaemdia -g rg-vacinaemdia --hostname app.vacinaemdia.me
   ```
   O Azure valida o CNAME e emite o certificado (alguns minutos). Confira com `az staticwebapp hostname list -n swa-vacinaemdia -g rg-vacinaemdia`.
3. **CORS da API** (a API só aceita a origem do site):
   ```bash
   az functionapp cors add -g rg-vacinaemdia -n func-vacinaemdia-vedia6398 --allowed-origins https://app.vacinaemdia.me
   ```
   Mantenha a origem antiga enquanto os dois endereços valerem.
4. **E-mail de redefinição de senha:** troque a configuração `WEB_BASE_URL` da Function App para `https://app.vacinaemdia.me` (o link do e-mail usa essa base).
5. **No código (peça ao Claude para fazer):** o endereço `https://blue-rock-0d7abc710.4.azurestaticapps.net` aparece em `apps/mobile/src/features/units/native-map-html.ts` (`MAP_BASE_URL`, usado pelo mapa nativo), em `scripts/documentos/` (QR e endereço do panfleto, da Documentação do Usuário e da apresentação) e nos docs `08` e `00-handoff`. Depois disso, regenerar os Word e republicar.
6. **Teste:** abrir o endereço novo, entrar, recuperar senha (o link do e-mail deve apontar para o novo domínio), abrir o mapa e instalar como PWA.

## Cuidados

- Os **dois endereços continuam funcionando**; o do Azure não sai do ar. Assim nada quebra para quem já instalou o APK ou guardou o link.
- O **APK** foi compilado apontando para a **API**, não para o site; o domínio novo do site não exige novo APK.
- O PWA instalado no endereço antigo não "migra" sozinho para o novo; quem quiser reinstala.
- Domínio é dado público: ele não deve conter dados pessoais.
