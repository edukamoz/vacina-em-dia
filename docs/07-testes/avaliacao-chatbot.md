# Avaliação do chatbot (classificador de intenções)

Gerado em 21/10/2026 por `python -m vacina_nlp.evaluate --write-report`. Não edite à mão: rode o comando de novo. Os mesmos números, em gráficos, estão no painel `painel-pln.html` (mesma pasta), gerado com `--write-dashboard`.

## Método

- **Modelo:** TF-IDF (palavras de 1 e 2 termos + trechos de 3 a 5 letras) e SVM linear (scikit-learn 1.9.1), com probabilidades calibradas (Platt).
- **Treino:** 1060 frases em 39 intenções, escritas e revisadas à mão (`vacina_nlp/data/intents.json`), sem dados pessoais.
- **Teste:** 195 frases **separadas** do treino (`data/test_set.json`); o script recusa o teste se alguma frase estiver nos dois conjuntos.
- **Semente fixa** (42): o resultado é reprodutível.

## Resultado no conjunto de teste

| Métrica | Valor |
|---|---|
| Acurácia | 90,8% |
| F1 macro | 0,901 |
| F1 ponderado | 0,901 |
| Meta de F1 macro (a validar com o professor) | 0,850: **atingida** |
| Validação cruzada (5 partes, só no treino): acurácia | 71,1% |
| Validação cruzada (5 partes, só no treino): F1 macro | 0,702 |

### Por intenção

| Intenção | Precisão | Revocação | F1 | Frases de teste |
|---|---|---|---|---|
| `acao_abrir_tela` | 0,800 | 0,800 | 0,800 | 5 |
| `acao_adicionar_pessoa` | 1,000 | 1,000 | 1,000 | 5 |
| `acao_agendar_dose` | 0,833 | 1,000 | 0,909 | 5 |
| `acao_registrar_dose` | 1,000 | 1,000 | 1,000 | 5 |
| `ajuda_o_que_faz` | 1,000 | 0,200 | 0,333 | 5 |
| `como_adicionar_pessoa` | 1,000 | 1,000 | 1,000 | 5 |
| `como_agendar_dose` | 1,000 | 1,000 | 1,000 | 5 |
| `como_apoiar_pix` | 1,000 | 0,800 | 0,889 | 5 |
| `como_cancelar_dose` | 1,000 | 1,000 | 1,000 | 5 |
| `como_excluir_dados` | 0,714 | 1,000 | 0,833 | 5 |
| `como_instalar_app` | 0,625 | 1,000 | 0,769 | 5 |
| `como_ler_caderneta` | 0,750 | 0,600 | 0,667 | 5 |
| `como_mudar_aparencia` | 1,000 | 1,000 | 1,000 | 5 |
| `como_registrar_dose` | 1,000 | 1,000 | 1,000 | 5 |
| `como_sair_conta` | 1,000 | 1,000 | 1,000 | 5 |
| `como_trocar_foto` | 0,625 | 1,000 | 0,769 | 5 |
| `como_usar_voz` | 0,714 | 1,000 | 0,833 | 5 |
| `como_ver_graficos` | 1,000 | 1,000 | 1,000 | 5 |
| `como_ver_historico` | 1,000 | 0,800 | 0,889 | 5 |
| `como_ver_novidades` | 0,833 | 1,000 | 0,909 | 5 |
| `como_ver_postos` | 0,833 | 1,000 | 0,909 | 5 |
| `conta_doses_atrasadas` | 1,000 | 1,000 | 1,000 | 5 |
| `conta_email` | 1,000 | 0,800 | 0,889 | 5 |
| `conta_meus_lembretes` | 1,000 | 0,600 | 0,750 | 5 |
| `conta_proxima_dose` | 0,833 | 1,000 | 0,909 | 5 |
| `conta_quem_na_familia` | 1,000 | 1,000 | 1,000 | 5 |
| `conta_resumo_vacinacao` | 1,000 | 0,800 | 0,889 | 5 |
| `despedida_agradecimento` | 1,000 | 1,000 | 1,000 | 5 |
| `fonte_calendario` | 1,000 | 0,600 | 0,750 | 5 |
| `fora_do_escopo` | 1,000 | 0,800 | 0,889 | 5 |
| `lembretes` | 0,833 | 1,000 | 0,909 | 5 |
| `orientacao_medica` | 1,000 | 1,000 | 1,000 | 5 |
| `privacidade_dados` | 1,000 | 0,600 | 0,750 | 5 |
| `saudacao` | 0,833 | 1,000 | 0,909 | 5 |
| `significado_atrasada` | 1,000 | 1,000 | 1,000 | 5 |
| `significado_estados` | 1,000 | 1,000 | 1,000 | 5 |
| `vacina_para_que_serve` | 1,000 | 1,000 | 1,000 | 5 |
| `vacina_quando` | 1,000 | 1,000 | 1,000 | 5 |
| `vacinas_do_grupo` | 1,000 | 1,000 | 1,000 | 5 |

### Erros no teste

| Frase | Esperada | Prevista | Confiança |
|---|---|---|---|
| em que você pode me ajudar hoje | `ajuda_o_que_faz` | `saudacao` | 0,396 |
| quais perguntas posso fazer a você | `ajuda_o_que_faz` | `como_usar_voz` | 0,501 |
| como esse assistente funciona | `ajuda_o_que_faz` | `como_usar_voz` | 0,306 |
| o que esse aplicativo faz | `ajuda_o_que_faz` | `como_instalar_app` | 0,501 |
| mostra a carteirinha com as doses aplicadas | `como_ver_historico` | `acao_abrir_tela` | 0,329 |
| que dados pessoais vocês guardam de mim | `privacidade_dados` | `como_excluir_dados` | 0,357 |
| vocês passam meus dados para outras empresas | `privacidade_dados` | `como_excluir_dados` | 0,399 |
| esse calendário é do ministério da saúde | `fonte_calendario` | `como_ver_novidades` | 0,417 |
| posso deixar a caderneta de papel de lado e usar só o app | `fonte_calendario` | `como_ler_caderneta` | 0,527 |
| como instalar um programa no computador | `fora_do_escopo` | `como_instalar_app` | 0,564 |
| me diz quanto falta tomar | `conta_resumo_vacinacao` | `conta_proxima_dose` | 0,475 |
| tenho algum lembrete | `conta_meus_lembretes` | `lembretes` | 0,399 |
| tem vacina para amanhã | `conta_meus_lembretes` | `acao_agendar_dose` | 0,509 |
| mostra meu perfil | `conta_email` | `como_trocar_foto` | 0,331 |
| ir para os postos | `acao_abrir_tela` | `como_ver_postos` | 0,479 |
| o aplicativo é pago | `como_apoiar_pix` | `como_instalar_app` | 0,529 |
| como funciona ler a caderneta por foto | `como_ler_caderneta` | `como_trocar_foto` | 0,410 |
| a foto da caderneta sai do meu celular | `como_ler_caderneta` | `como_trocar_foto` | 0,433 |

## Limiar de confiança

Abaixo do limiar, o assistente não responde a intenção: devolve a resposta padrão, que orienta procurar um profissional ou uma unidade de saúde. A tabela mostra, no conjunto de teste, quantas perguntas passam do limiar (cobertura) e quantas dessas acertam.

| Limiar | Cobertura | Acerto entre as aceitas |
|---|---|---|
| 0,200 | 100,0% | 90,8% |
| 0,250 | 100,0% | 90,8% |
| 0,300 (em uso) | 99,0% | 90,7% |
| 0,350 | 90,8% | 91,5% |
| 0,400 | 70,8% | 92,0% |
| 0,500 | 39,5% | 92,2% |
| 0,600 | 13,3% | 100,0% |

Com o limiar em uso (0,300), 10 de 10 entradas sem sentido (por exemplo "asdf" e "????") caem na resposta padrão ou na de "fora do escopo".

## Limitações

- O conjunto de teste é pequeno e escrito pelo mesmo autor do treino; os números indicam o comportamento esperado, não garantem o desempenho com todo tipo de pergunta real.
- A validação cruzada no treino (cada parte testada com frases que o modelo não viu) dá um resultado bem menor que o teste: o modelo ainda depende de haver exemplos parecidos com a pergunta. Mais exemplos por intenção tendem a melhorar; o teste atual é mais favorável do que o uso real.
- O treino **não** foi ajustado a partir dos erros do teste, para não inflar o resultado. O limiar foi escolhido olhando a tabela acima (equilíbrio entre cobertura e acerto).
- Perguntas sobre saúde individual **não** passam pelo classificador: regras de segurança as encaminham a um profissional antes (ver `vacina_nlp/safety.py`).
- Frases sem sentido podem cair em `fora_do_escopo` em vez da resposta padrão; ambas orientam o usuário a reformular ou procurar um profissional.
