# ADR-022: Leitura da caderneta por foto, feita no aparelho

- **Status:** aceito em 20/10/2026 (decisão do autor: OCR no aparelho, com ML Kit, só no app)
- **Item do backlog:** B55 (foto do documento com extração de dados)
- **Relacionados:** ADR-020 (foto de perfil), `docs/06-seguranca-e-lgpd.md`, `docs/18-termos-e-privacidade.md`.

## Contexto

Cadastrar as doses de uma pessoa à mão é trabalhoso, principalmente para quem já tem a caderneta de papel. O autor quer fotografar a caderneta (ou um comprovante) no celular e ver as doses lidas. A caderneta é dado de saúde: a foto não deve sair do aparelho, e o resultado precisa de conferência humana antes de virar registro.

## Decisão

1. **Leitura no aparelho.** O texto da foto é reconhecido localmente por `expo-text-extractor` 2.0.0, que usa o **ML Kit** do Google no Android e o **Vision** da Apple no iOS. Nenhuma imagem vai para a API, para a Azure ou para terceiros; não há serviço novo nem custo. A cópia temporária da foto tirada pela câmera é apagada logo depois da leitura (a da galeria nunca é tocada).
2. **Só no app.** Na web o módulo não existe (`isSupported` falso) e o botão "Ler caderneta por foto" nem aparece. O módulo é carregado de forma tardia: se faltar (Expo Go, por exemplo), a tela explica que o recurso não está disponível, em vez de o app falhar ao abrir. Exige o app instalado (development build, `npm run dev:android`, ou o APK das Releases).
3. **Encaixe nas doses que a pessoa já tem.** O texto não cria vacina nenhuma: `lib/ler-caderneta.ts` procura, em cada linha com uma data válida (e já passada), o nome da vacina na própria linha ou nas duas anteriores, descobre qual dose é (1ª, 2ª, reforço, dose única) e a casa com **uma dose aberta** (pendente, agendada ou atrasada) do calendário da pessoa. Se houver dúvida entre duas doses, ou a vacina não estiver no calendário dela, a linha vai para "não conseguimos encaixar". Os apelidos usados para reconhecer o texto (por exemplo, "VIP", "penta", "SCR") são só vocabulário de leitura; vacinas, doses e datas vêm sempre do calendário oficial da pessoa e da foto.
4. **Confirmação obrigatória.** A tela mostra cada dose encontrada com a data lida e o trecho do texto, ligada por padrão; a pessoa desliga as erradas e toca em "Registrar". Só então cada dose recebe o evento `APPLY` com a data lida, pelo mesmo caminho e pelas mesmas regras da máquina de estados (aplicar exige data de hoje ou anterior). Uma falha não impede as outras e é avisada. Nada novo na API nem no banco.
5. **Privacidade.** A Política de privacidade cita o recurso; a permissão da câmera e da galeria (`app.json`) explica o uso; nenhum texto lido é gravado ou registrado em log.

## Alternativas descartadas

- **OCR na nuvem (Azure AI Document Intelligence, Vision):** mais preciso em documentos difíceis, mas envia a foto de saúde para fora do aparelho, tem custo por página e exige serviço novo.
- **Criar doses avulsas a partir do texto:** aceitaria qualquer coisa que o OCR lesse (inclusive erros), duplicaria o calendário oficial e foge de "nunca preencha vacinas de memória". Encaixar só em doses existentes é mais seguro.
- **Salvar direto, sem conferência:** OCR erra; um dado de saúde errado é pior que digitar à mão.

## Consequências

- Dependência nova no app: `expo-text-extractor` 2.0.0 (MIT), registrada em `docs/tech-versions.md`. Fica no pacote do app no Android e no iOS (nativo, via autolinking); o APK do GitHub Releases já a inclui.
- No Android, o modelo de reconhecimento vem dos Serviços do Google Play e é baixado no primeiro uso; esse primeiro uso precisa de internet e de Play Services. Depois a leitura funciona sem rede.
- A qualidade depende da foto (luz, papel reto) e do formato da caderneta: a leitura é um atalho, não uma garantia. Cadernetas manuscritas ou com tabelas confusas podem render poucas doses ou nenhuma.
- A verificação com uma caderneta real, em celular físico, é do autor.
