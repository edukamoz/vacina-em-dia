/** Uma seção de um documento legal: título e parágrafos em linguagem simples. */
export interface LegalSection {
  readonly titulo: string;
  readonly paragrafos: readonly string[];
}

/** Documento legal exibido no app (Termos de uso ou Política de privacidade). */
export interface LegalDocument {
  readonly titulo: string;
  readonly subtitulo: string;
  readonly secoes: readonly LegalSection[];
}

/**
 * Versão dos Termos de uso e da Política de privacidade. Ao mudar qualquer texto abaixo, mude
 * também a data. É independente da versão do termo de consentimento (`TERMS_VERSION`).
 *
 * Rascunho para validação do autor antes da apresentação; não é parecer jurídico.
 */
export const LEGAL_VERSION = '2026-10-08';

/** Contato para pedidos sobre dados pessoais (LGPD, art. 18). */
export const PRIVACY_CONTACT = 'eduardokamoz@gmail.com';

/** Termos de uso. */
export const TERMOS_DE_USO: LegalDocument = {
  titulo: 'Termos de uso',
  subtitulo: `Versão de ${LEGAL_VERSION}`,
  secoes: [
    {
      titulo: 'O que é o Vacina em Dia',
      paragrafos: [
        'O Vacina em Dia é um aplicativo para organizar as vacinas da sua família: ver o calendário por idade, registrar doses, tirar dúvidas por texto ou voz e consultar o histórico.',
        'É um projeto acadêmico da Fatec Votorantim (curso de Desenvolvimento de Software Multiplataforma). Esta é uma versão de demonstração, sem garantia de funcionamento contínuo.',
      ],
    },
    {
      titulo: 'O que o aplicativo não é',
      paragrafos: [
        'O aplicativo não substitui a caderneta de vacinação oficial nem a orientação de médicos, enfermeiros e outros profissionais de saúde.',
        'Ele não faz diagnóstico, não indica tratamento nem dá orientação médica individual. Em caso de dúvida sobre sua saúde ou a de alguém da sua família, procure uma unidade de saúde.',
        'O calendário segue o Calendário Nacional de Vacinação do Ministério da Saúde, na versão indicada nas telas. Ele pode mudar; confira sempre a fonte oficial.',
      ],
    },
    {
      titulo: 'Sua conta',
      paragrafos: [
        'Para usar o aplicativo você cria uma conta com e-mail e senha. Use um e-mail seu e uma senha que só você conheça. Você é responsável por manter a senha em segredo.',
        'Cada pessoa só vê os dados que ela mesma cadastrou. Se achar que alguém usou sua conta, troque a senha e fale com o contato da Política de privacidade.',
      ],
    },
    {
      titulo: 'Os dados que você cadastra',
      paragrafos: [
        'Você pode cadastrar pessoas da sua família. Cadastre apenas pessoas que você tem autorização para cadastrar. No caso de crianças e adolescentes, você declara ser o responsável legal.',
        'As informações que você digita, como nome ou apelido, datas e vacinas adicionadas por você, são de sua responsabilidade. O aplicativo marca as vacinas adicionadas por você como "Adicionada por você"; elas não vêm do calendário oficial.',
      ],
    },
    {
      titulo: 'Uso adequado',
      paragrafos: [
        'Não use o aplicativo para fins ilegais, para tentar acessar dados de outras pessoas, para sobrecarregar o serviço ou para burlar as proteções de segurança, como os limites de uso.',
        'Podemos limitar ou encerrar o acesso de quem fizer isso.',
      ],
    },
    {
      titulo: 'Disponibilidade',
      paragrafos: [
        'Por ser um projeto acadêmico, o serviço pode ficar fora do ar, mudar ou ser encerrado, inclusive depois da apresentação do projeto. Não garantimos que ele estará sempre disponível nem livre de erros.',
        'Por isso, não use o aplicativo como único registro das suas vacinas. Guarde a caderneta oficial.',
      ],
    },
    {
      titulo: 'Excluir a conta',
      paragrafos: [
        'Você pode excluir sua conta quando quiser, na aba Conta. A exclusão apaga os dados da conta, das pessoas cadastradas e das doses.',
      ],
    },
    {
      titulo: 'Mudanças nestes termos',
      paragrafos: [
        'Se estes termos mudarem, a data da versão no topo muda junto. O uso do aplicativo depois da mudança significa que você concorda com o novo texto. Se não concordar, exclua sua conta.',
        'Estes termos seguem a lei brasileira. Veja também a Política de privacidade, que explica como tratamos os dados.',
      ],
    },
  ],
};

/** Política de privacidade (LGPD, Lei 13.709/2018). */
export const POLITICA_DE_PRIVACIDADE: LegalDocument = {
  titulo: 'Política de privacidade',
  subtitulo: `Versão de ${LEGAL_VERSION}`,
  secoes: [
    {
      titulo: 'Em resumo',
      paragrafos: [
        'Guardamos o mínimo necessário. Não pedimos CPF nem Cartão Nacional de Saúde. Não vendemos seus dados, não mostramos anúncios e não usamos inteligência artificial generativa.',
        'Informações de vacinação são dados de saúde, que a lei trata como dados sensíveis. Por isso pedimos seu consentimento antes de você cadastrar qualquer pessoa.',
      ],
    },
    {
      titulo: 'Quais dados guardamos',
      paragrafos: [
        'Da sua conta: e-mail, senha (guardada de forma embaralhada, sem como ler a senha original), a data e a versão do consentimento que você deu e a sua escolha de receber ou não lembretes por e-mail.',
        'De cada pessoa que você cadastra: nome ou apelido, data de nascimento, se está gestante e, se você quiser, o parentesco com você.',
        'Das doses: a vacina, a dose, as datas e a situação (pendente, agendada, atrasada, aplicada ou cancelada). Nas vacinas adicionadas por você, guardamos também o nome da vacina e a dose que você digitou.',
        'Dados técnicos: o aplicativo registra eventos de funcionamento e erros para manter o serviço estável. Esses registros usam identificadores que não revelam quem você é e não trazem nome, e-mail, data de nascimento nem texto de mensagens.',
      ],
    },
    {
      titulo: 'Para que usamos',
      paragrafos: [
        'Usamos os dados apenas para mostrar o calendário vacinal e as doses das pessoas que você cadastrou, entrar na sua conta, recuperar sua senha, avisar você sobre vacinas próximas ou atrasadas e responder às suas dúvidas no assistente.',
        'A base legal é o seu consentimento (LGPD, art. 7º, inciso I, e art. 11, inciso I, para dados de saúde). No caso de crianças e adolescentes, o consentimento é dado pelo responsável legal (art. 14).',
      ],
    },
    {
      titulo: 'Lembretes',
      paragrafos: [
        'Na aba Doses, o aplicativo mostra as vacinas atrasadas, as de hoje e as dos próximos 7 dias.',
        'Se você não desligar, enviamos também um e-mail às 8h (horário de Brasília), no dia da vacina e 7 dias antes, no máximo um por dia. O e-mail traz só a quantidade de vacinas, sem nome de pessoa nem de vacina. Você pode desligar esse e-mail a qualquer momento na aba Conta.',
      ],
    },
    {
      titulo: 'Postos de saúde e localização',
      paragrafos: [
        'Na tela Postos de saúde, o aplicativo só pede a sua localização quando você toca em "Usar minha localização", e só enquanto está em uso. Se você não permitir, o resto do aplicativo funciona normalmente.',
        'A sua posição é usada para achar as unidades básicas de saúde mais perto de você. Ela é enviada ao nosso serviço arredondada (cerca de 110 metros), não é guardada nem registrada, e não vai para nenhum outro serviço. Só o código do município das unidades encontradas é consultado na base oficial do Ministério da Saúde.',
        'O aplicativo guarda neste aparelho a última lista de postos recebida, para você ver sem internet. A lista não traz a sua posição e é apagada quando você sai da conta. O mapa usa imagens do OpenStreetMap, que recebem o endereço de internet do seu aparelho, como qualquer site.',
      ],
    },
    {
      titulo: 'Assistente por texto e por voz',
      paragrafos: [
        'O texto das perguntas que você faz ao assistente não é gravado nem registrado. As respostas são escritas por nós, a partir de fontes oficiais; o assistente não inventa respostas.',
        'Na busca por voz, o áudio é enviado ao serviço de reconhecimento de fala da Microsoft (Azure AI Speech) apenas para virar texto. O aplicativo não grava o áudio.',
      ],
    },
    {
      titulo: 'Com quem compartilhamos',
      paragrafos: [
        'Não vendemos nem cedemos seus dados para outras finalidades. Usamos dois prestadores para fazer o serviço funcionar:',
        'Microsoft Azure: hospeda o aplicativo e o banco de dados (região Brasil Sul) e faz o reconhecimento de voz.',
        'Brevo: envia o e-mail de recuperação de senha e o e-mail de lembrete. Ele recebe só o seu endereço de e-mail e o texto da mensagem (o link de redefinição ou a quantidade de vacinas), sem nome nem outro dado.',
      ],
    },
    {
      titulo: 'Por quanto tempo guardamos',
      paragrafos: [
        'Guardamos os dados enquanto sua conta existir. Quando você exclui a conta, apagamos os dados da conta, das pessoas cadastradas e das doses.',
      ],
    },
    {
      titulo: 'Segurança',
      paragrafos: [
        'A comunicação com o serviço usa conexão protegida (HTTPS). Cada conta só acessa os próprios dados. Há limite de tentativas de entrada e de pedidos, para dificultar abusos.',
        'Nenhum sistema é perfeito. Se houver um incidente que possa trazer risco a você, avisaremos como a lei determina.',
      ],
    },
    {
      titulo: 'Seus direitos',
      paragrafos: [
        'A LGPD (art. 18) garante a você, entre outros direitos: saber se tratamos seus dados e acessá-los; corrigir dados incorretos; pedir a exclusão dos dados; pedir informação sobre com quem os compartilhamos; e retirar o consentimento.',
        'Para corrigir ou excluir, você mesmo pode editar as pessoas e doses no aplicativo e excluir a conta na aba Conta. Para os demais pedidos, escreva para o contato abaixo.',
        'Retirar o consentimento não desfaz o que já foi feito com ele; depois disso, não será mais possível usar o aplicativo.',
      ],
    },
    {
      titulo: 'Contato',
      paragrafos: [
        `Responsável pelo projeto: Eduardo Kamo Iguei, aluno da Fatec Votorantim. Para pedidos sobre seus dados: ${PRIVACY_CONTACT}.`,
        'Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).',
      ],
    },
    {
      titulo: 'Mudanças nesta política',
      paragrafos: [
        'Se esta política mudar, a data da versão no topo muda junto e, quando a mudança for importante, pedimos um novo consentimento.',
      ],
    },
  ],
};
