*** Settings ***
Library    SeleniumLibrary
Variables    ../variables/variables.py

*** Variables ***
${CAMPO_EMAIL}        xpath://input[@aria-label="E-mail"]
${CAMPO_SENHA}        xpath://input[@aria-label="Senha"]
${CAMPO_REPITA}       xpath://input[@aria-label="Repita a senha"]
${CHECK_TERMOS}       xpath://*[@role="checkbox"][contains(@aria-label, "Li e aceito os termos")]
${BOTAO_CRIAR}        xpath://button[@aria-label="Criar conta"]

${BOTAO_ENTRAR}       xpath://button[@aria-label="Entrar"]
${CAMPO_NOME}         xpath://input[@aria-label="Nome ou apelido"]
${CAMPO_NASCIMENTO}   xpath://input[@aria-label="Data de nascimento"]
${BOTAO_SALVAR_PESSOA}    xpath://button[@aria-label="Salvar e ver as vacinas"]

*** Keywords ***
Abrir navegador
    [Documentation]    Chrome sem o gerenciador de senhas e sem avisos de senha vazada, que atrapalham o login automatico.
    ${opcoes}=    Evaluate    sys.modules['selenium.webdriver'].ChromeOptions()    sys, selenium.webdriver
    Call Method    ${opcoes}    add_argument    --disable-features\=PasswordLeakDetection,PasswordManagerOnboarding
    Call Method    ${opcoes}    add_argument    --disable-save-password-bubble
    ${prefs}=    Create Dictionary    credentials_enable_service=${False}    profile.password_manager_enabled=${False}
    Call Method    ${opcoes}    add_experimental_option    prefs    ${prefs}
    Open Browser    ${URL}/criar-conta    chrome    options=${opcoes}
    Maximize Browser Window

Abrir tela de cadastro
    Wait Until Element Is Visible    ${CAMPO_EMAIL}    timeout=20s

Preencher cadastro com senhas diferentes
    Input Text        ${CAMPO_EMAIL}     ${EMAIL}
    Input Password    ${CAMPO_SENHA}     ${SENHA}
    Input Password    ${CAMPO_REPITA}    ${SENHA_DIFERENTE}
    Click Element     ${CHECK_TERMOS}

Enviar cadastro
    Click Element    ${BOTAO_CRIAR}

Validar erro de senhas diferentes
    Wait Until Page Contains    As senhas não são iguais    timeout=10s
    Location Should Contain     /criar-conta
    Capture Page Screenshot

Fechar navegador
    Close Browser


Entrar na conta de teste
    [Documentation]    Pre-condicao dos cenarios que exigem login. A senha vem de ROBOT_SENHA.
    Should Not Be Empty    ${LOGIN_SENHA}    Defina a variavel de ambiente ROBOT_SENHA antes de rodar.
    Go To    ${URL}/entrar
    Wait Until Element Is Visible    ${CAMPO_EMAIL}    timeout=20s
    Input Text        ${CAMPO_EMAIL}    ${LOGIN_EMAIL}
    Input Password    ${CAMPO_SENHA}    ${LOGIN_SENHA}
    Click Element     ${BOTAO_ENTRAR}
    # Espera o login terminar de verdade (a URL sai de /entrar e a sessao e gravada) antes de navegar;
    # recarregar a pagina antes disso cancela o login e o app volta para a tela inicial.
    Wait Until Keyword Succeeds    30s    1s    Saiu Da Tela De Entrar
    Wait Until Keyword Succeeds    15s    1s    Sessao Deve Estar Gravada
    Capture Page Screenshot

Saiu Da Tela De Entrar
    ${url}=    Get Location
    Should Not Contain    ${url}    /entrar

Sessao Deve Estar Gravada
    ${itens}=    Execute Javascript    return Object.keys(sessionStorage).length
    Should Be True    ${itens} > 0    A sessao ainda nao foi gravada.

Abrir formulario de nova pessoa
    Go To    ${URL}/membro/novo
    Wait Until Element Is Visible    ${CAMPO_NOME}    timeout=20s
    ...    error=O app nao abriu o formulario (provavel sessao perdida). Veja o ultimo print em results/.

Preencher dados da pessoa
    Input Text    ${CAMPO_NOME}          ${PESSOA_NOME}
    Input Text    ${CAMPO_NASCIMENTO}    ${PESSOA_NASCIMENTO}

Salvar pessoa
    Click Element    ${BOTAO_SALVAR_PESSOA}

Validar calendario da pessoa
    Wait Until Page Contains    Doses de ${PESSOA_PRIMEIRO_NOME}    timeout=20s
    # A fonte vem junto com as doses, que carregam depois do titulo: precisa esperar.
    Wait Until Page Contains    Calendário Nacional de Vacinação    timeout=20s
    Capture Page Screenshot
