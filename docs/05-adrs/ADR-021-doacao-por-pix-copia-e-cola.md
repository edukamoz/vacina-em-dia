# ADR-021: Doação voluntária por Pix copia e cola, sem gateway

- **Status:** aceito em 20/10/2026 (decisão do autor: Pix copia e cola, com foco em custo zero)
- **Item do backlog:** B53 (apoiar o projeto com Pix)
- **Relacionados:** `docs/06-seguranca-e-lgpd.md`, `docs/18-termos-e-privacidade.md`.

## Contexto

Os semestres anteriores pediam uma funcionalidade de pagamento. O Vacina em Dia é gratuito e sem anúncios, então o desejado é só um jeito simples de a pessoa contribuir se quiser. O projeto pede custo zero, nenhum dado de pagamento circulando e nenhum serviço novo.

## Decisão

1. **Pix estático (BR Code, padrão EMV do Banco Central), montado no aparelho.** O app gera o texto do Pix copia e cola e o desenha como QR Code. Nada vai para a API, para a Azure ou para um gateway de pagamento; o app não vê nem guarda quem pagou ou quanto. O pagamento é feito e confirmado só no app do banco da pessoa.
2. **Chave aleatória (EVP).** A chave do recebedor é uma chave aleatória do autor, nunca CPF, e-mail ou telefone, para não expor dado pessoal a quem doa. Ela fica nas variáveis públicas do repositório (`PIX_KEY`, `PIX_NAME`, `PIX_CITY`) e entra no pacote do app em `EXPO_PUBLIC_PIX_KEY`, `EXPO_PUBLIC_PIX_NAME` e `EXPO_PUBLIC_PIX_CITY`. Não é segredo: o QR a mostra a qualquer pessoa. Se faltar algum dos três valores, a seção "Apoie o projeto" não aparece.
3. **Campos do código.** Estático (iniciador `11`), país `BR`, moeda `986`, identificador `***`, valor opcional (R$ 0,01 até R$ 999.999,99) e CRC16/CCITT-FALSE no fim. Nome do recebedor com até 25 caracteres e cidade com até 15, em maiúsculas e sem acento, como o padrão exige.
4. **Tela.** "Apoie o projeto", aberta como janela a partir da aba Conta: valores sugeridos (R$ 5, 10, 20 e 50), campo para outro valor, QR (sempre preto sobre branco, em qualquer tema), texto copia e cola com botão Copiar e aviso de que a doação é voluntária, não libera nada e não passa por nós. O texto copia e cola é a alternativa acessível ao QR.
5. **Privacidade.** Sem dado novo guardado: nenhuma tabela, nenhum log, nenhuma chamada de rede. O QR é gerado no aparelho.

## Alternativas descartadas

- **Gateway (Mercado Pago, Stripe, Pagar.me):** cobra tarifa por transação, exige cadastro de empresa ou conta de vendedor, webhook na API e guarda dados de pagamento; o projeto não precisa de nada disso.
- **Pix dinâmico (cobrança com `txid` e consulta de baixa):** só é oferecido por instituição com API Pix; o app passaria a depender dela, a ter segredos e a acompanhar pagamentos. Para uma doação voluntária, não vale.
- **Link externo (por exemplo, "vaquinha"):** tira a pessoa do app, tem taxa e depende de terceiro.

## Consequências

- Dependências novas no app: `qrcode-generator` 2.0.4 (QR em JavaScript puro, sem dependências, licença MIT) e `expo-clipboard` ~57.0.2 (copiar o código), registradas em `docs/tech-versions.md`.
- O app **não sabe** se a doação foi feita; quem confere é o autor, no extrato do banco.
- A chave fica visível em quem abrir o app: se for abusada, o autor apaga a chave no banco, cria outra, troca as três variáveis e publica de novo.
- Verificação: o QR gerado pelo código foi decodificado com um leitor independente (OpenCV) e devolveu exatamente o texto esperado; o CRC16 segue o valor de referência `29B1` para `123456789`. O teste com pagamento real é do autor.
