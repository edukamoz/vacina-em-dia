# Dados do ambiente. Troque a URL aqui para testar outro ambiente (por exemplo, o local).
URL = "https://blue-rock-0d7abc710.4.azurestaticapps.net"

# Dados fictícios: este cenário não envia nada ao servidor, então nenhuma conta é criada.
EMAIL = "teste.robot@exemplo.com.br"
SENHA = "SenhaForte@2026"
SENHA_DIFERENTE = "OutraSenha@2026"

# Conta de teste usada nos cenarios que exigem login. A senha NUNCA fica no repositorio:
# defina as variaveis de ambiente antes de rodar (ROBOT_SENHA e, se quiser, ROBOT_EMAIL).
import os

LOGIN_EMAIL = os.environ.get("ROBOT_EMAIL", "teste@teste.com")
LOGIN_SENHA = os.environ.get("ROBOT_SENHA", "")

# Pessoa ficticia cadastrada pelo cenario (data digitada como ddmmaaaa, que e a mascara do campo).
# Maior de idade de proposito: menores exigem a declaracao de responsavel legal, que e um
# consentimento do usuario e nao deve ser marcado pelo robo.
PESSOA_NOME = "Robot Teste"
# O titulo da tela mostra so o primeiro nome ("Doses de Robot").
PESSOA_PRIMEIRO_NOME = PESSOA_NOME.split()[0]
PESSOA_NASCIMENTO = "20051990"
