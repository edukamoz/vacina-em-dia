# Avaliação do chatbot (classificador de intenções)

Gerado em 10/10/2026 por `python -m vacina_nlp.evaluate --write-report`. Não edite à mão: rode o comando de novo. Os mesmos números, em gráficos, estão no painel `painel-pln.html` (mesma pasta), gerado com `--write-dashboard`.

## Método

- **Modelo:** TF-IDF (palavras de 1 e 2 termos + trechos de 3 a 5 letras) e SVM linear (scikit-learn 1.9.1), com probabilidades calibradas (Platt).
- **Treino:** 490 frases em 20 intenções, escritas e revisadas à mão (`vacina_nlp/data/intents.json`), sem dados pessoais.
- **Teste:** 100 frases **separadas** do treino (`data/test_set.json`); o script recusa o teste se alguma frase estiver nos dois conjuntos.
- **Semente fixa** (42): o resultado é reprodutível.

## Resultado no conjunto de teste

| Métrica | Valor |
|---|---|
| Acurácia | 94,0% |
| F1 macro | 0,932 |
| F1 ponderado | 0,932 |
| Meta de F1 macro (a validar com o professor) | 0,850: **atingida** |
| Validação cruzada (5 partes, só no treino): acurácia | 68,8% |
| Validação cruzada (5 partes, só no treino): F1 macro | 0,670 |

### Por intenção

| Intenção | Precisão | Revocação | F1 | Frases de teste |
|---|---|---|---|---|
| `ajuda_o_que_faz` | 1,000 | 0,400 | 0,571 | 5 |
| `como_adicionar_pessoa` | 0,833 | 1,000 | 0,909 | 5 |
| `como_agendar_dose` | 1,000 | 1,000 | 1,000 | 5 |
| `como_cancelar_dose` | 1,000 | 1,000 | 1,000 | 5 |
| `como_excluir_dados` | 0,714 | 1,000 | 0,833 | 5 |
| `como_registrar_dose` | 1,000 | 1,000 | 1,000 | 5 |
| `como_usar_voz` | 0,714 | 1,000 | 0,833 | 5 |
| `como_ver_historico` | 1,000 | 1,000 | 1,000 | 5 |
| `despedida_agradecimento` | 1,000 | 1,000 | 1,000 | 5 |
| `fonte_calendario` | 1,000 | 1,000 | 1,000 | 5 |
| `fora_do_escopo` | 1,000 | 1,000 | 1,000 | 5 |
| `lembretes` | 1,000 | 1,000 | 1,000 | 5 |
| `orientacao_medica` | 1,000 | 1,000 | 1,000 | 5 |
| `privacidade_dados` | 0,667 | 0,400 | 0,500 | 5 |
| `saudacao` | 1,000 | 1,000 | 1,000 | 5 |
| `significado_atrasada` | 1,000 | 1,000 | 1,000 | 5 |
| `significado_estados` | 1,000 | 1,000 | 1,000 | 5 |
| `vacina_para_que_serve` | 1,000 | 1,000 | 1,000 | 5 |
| `vacina_quando` | 1,000 | 1,000 | 1,000 | 5 |
| `vacinas_do_grupo` | 1,000 | 1,000 | 1,000 | 5 |

### Erros no teste

| Frase | Esperada | Prevista | Confiança |
|---|---|---|---|
| quais perguntas posso fazer a você | `ajuda_o_que_faz` | `como_usar_voz` | 0,442 |
| como esse assistente funciona | `ajuda_o_que_faz` | `como_usar_voz` | 0,381 |
| o que esse aplicativo faz | `ajuda_o_que_faz` | `privacidade_dados` | 0,417 |
| o aplicativo pede meu cpf | `privacidade_dados` | `como_adicionar_pessoa` | 0,375 |
| que dados pessoais vocês guardam de mim | `privacidade_dados` | `como_excluir_dados` | 0,407 |
| vocês passam meus dados para outras empresas | `privacidade_dados` | `como_excluir_dados` | 0,415 |

## Limiar de confiança

Abaixo do limiar, o assistente não responde a intenção: devolve a resposta padrão, que orienta procurar um profissional ou uma unidade de saúde. A tabela mostra, no conjunto de teste, quantas perguntas passam do limiar (cobertura) e quantas dessas acertam.

| Limiar | Cobertura | Acerto entre as aceitas |
|---|---|---|
| 0,200 | 100,0% | 94,0% |
| 0,250 | 100,0% | 94,0% |
| 0,300 | 100,0% | 94,0% |
| 0,350 | 100,0% | 94,0% |
| 0,400 (em uso) | 89,0% | 95,5% |
| 0,500 | 52,0% | 100,0% |
| 0,600 | 18,0% | 100,0% |

Com o limiar em uso (0,400), 2 de 10 entradas sem sentido (por exemplo "asdf" e "????") caem na resposta padrão.

## Limitações

- O conjunto de teste é pequeno e escrito pelo mesmo autor do treino; os números indicam o comportamento esperado, não garantem o desempenho com todo tipo de pergunta real.
- A validação cruzada no treino (cada parte testada com frases que o modelo não viu) dá um resultado bem menor que o teste: o modelo ainda depende de haver exemplos parecidos com a pergunta. Mais exemplos por intenção tendem a melhorar; o teste atual é mais favorável do que o uso real.
- O treino **não** foi ajustado a partir dos erros do teste, para não inflar o resultado. O limiar foi escolhido olhando a tabela acima (equilíbrio entre cobertura e acerto).
- Perguntas sobre saúde individual **não** passam pelo classificador: regras de segurança as encaminham a um profissional antes (ver `vacina_nlp/safety.py`).
- Frases sem sentido podem cair em `fora_do_escopo` em vez da resposta padrão; ambas orientam o usuário a reformular ou procurar um profissional.
