# Automação com Robot Framework (atividade de Qualidade e Testes)

Mesma estrutura do exemplo da professora (`jylaila/robot-test`): `tests/` (cenários), `resources/` (keywords), `variables/` (URL e dados) e `results/` (relatórios).

**Cenário automatizado:** cadastro com senhas diferentes é recusado (RF01). O teste abre a tela de criar conta do app publicado, preenche e-mail, senha e uma confirmação diferente, marca os termos, toca em "Criar conta" e confere a mensagem "As senhas não são iguais". Não envia nada ao servidor, então não cria conta.

## Como rodar

Precisa de Python e do Google Chrome (o Selenium baixa o driver sozinho).

```bash
pip install -r requirements.txt
python -m robot -d results tests/
```

Relatórios em `results/`: `report.html`, `log.html` e `output.xml`, além do print da tela.
Para testar outro ambiente, troque `URL` em `variables/variables.py`.

## Cenário com login (conta de teste)

`tests/membro.robot` entra com uma conta de teste, cadastra uma pessoa fictícia e confere o calendário dela (RF02). O login é só pré-condição. A senha nunca fica no repositório; defina antes de rodar (PowerShell):

```powershell
$env:ROBOT_SENHA = "a-senha-da-conta-de-teste"
python -m robot -d results tests/
```

O e-mail padrão é `teste@teste.com` (troque com `$env:ROBOT_EMAIL`). Cada execução cria uma pessoa fictícia na conta de teste.
