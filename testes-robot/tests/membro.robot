*** Settings ***
Resource    ../resources/keywords.robot

*** Test Cases ***
Adicionar membro da familia
    [Documentation]    Cenario de RF02: depois de entrar, o usuario cadastra uma pessoa e ve o calendario dela
    ...                com a fonte oficial. Exige ROBOT_SENHA (conta de teste); o login e so pre-condicao.
    Abrir navegador
    Entrar na conta de teste
    Abrir formulario de nova pessoa
    Preencher dados da pessoa
    Salvar pessoa
    Validar calendario da pessoa
    [Teardown]    Fechar navegador
