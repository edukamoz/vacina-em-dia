*** Settings ***
Resource    ../resources/keywords.robot

*** Test Cases ***
Cadastro com senhas diferentes e recusado
    [Documentation]    Cenario de RF01: o app nao cria a conta quando as duas senhas diferem.
    ...                Roda so a validacao do formulario, sem enviar dados ao servidor.
    Abrir navegador
    Abrir tela de cadastro
    Preencher cadastro com senhas diferentes
    Enviar cadastro
    Validar erro de senhas diferentes
    [Teardown]    Fechar navegador
