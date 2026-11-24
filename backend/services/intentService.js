
/**
 * Detecta a intenção principal de uma mensagem recebida pelo bot.
 *
 * A ideia é permitir que o cliente escreva de várias formas
 * diferentes e o bot consiga entender a intenção.
 *
 * IMPORTANTE:
 *
 * Este serviço trabalha apenas com linguagem/intenção.
 *
 * Nenhuma empresa, produto, serviço, preço ou dado específico
 * de uma empresa deve ser hardcoded aqui.
 *
 * O contexto concreto continua sendo responsabilidade das
 * camadas superiores do sistema.
 */

// --------------------------------------------------
// NORMALIZAÇÃO
// --------------------------------------------------

function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[!?.,;:()[\]{}]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}


// --------------------------------------------------
// ESCAPA TEXTO PARA REGEX
// --------------------------------------------------

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// --------------------------------------------------
// VERIFICA SE A MENSAGEM CONTÉM UMA DAS FRASES
// --------------------------------------------------

function containsAny(text, phrases) {

    return phrases.some((phrase) => {

        const normalizedPhrase =
            normalizeText(phrase);

        if (!normalizedPhrase) {
            return false;
        }

        const pattern =
            new RegExp(
                `(?:^|\\s)${escapeRegExp(normalizedPhrase)}(?:$|\\s)`,
                'i'
            );

        return pattern.test(text);
    });
}



// --------------------------------------------------
// REMOVE SAUDAÇÃO INICIAL PARA ANÁLISE SECUNDÁRIA
// --------------------------------------------------
//
// Esta função NÃO altera a mensagem original.
//
// Ela apenas remove uma saudação que aparece no início
// para permitir detectar uma segunda intenção.
//
// Exemplos:
//
// "bom dia queria uma pizza"
// -> "queria uma pizza"
//
// "olá, vocês têm batata?"
// -> "vocês têm batata"
//
// "boa tarde, quanto custa?"
// -> "quanto custa"
//
// "bom dia"
// -> ""
//
// A mensagem original continua preservada em `text`.
//
// --------------------------------------------------

function removeLeadingGreeting(text) {

    let result = normalizeText(text);

    if (!result) {
        return result;
    }

    const greetings = [
        'boa madrugada',
        'bom dia',
        'boa tarde',
        'boa noite',
        'boa manha',

        'tudo bem por ai',
        'tudo bem',
        'tudo bom',
        'tudo certo',
        'tudo tranquilo',

        'como voces estao',
        'como voces vao',
        'como estas',
        'como esta',
        'como vao',
        'como vai',

        'estao bem',
        'esta tudo bem',

        'e ai pessoal',
        'e ai',
        'eai',

        'olaaaa',
        'olaaa',
        'olaa',

        'oiiiii',
        'oiiii',
        'oiii',
        'oii',

        'ola pessoal',
        'oi pessoal',
        'ola gente',
        'oi gente',

        'saudacoes',

        'ola',
        'oi',
        'hey',
        'hello',
        'hi'
    ];

    // Mais longas primeiro para evitar que, por exemplo,
    // "boa tarde" seja tratado apenas como "boa".
    greetings.sort((a, b) => b.length - a.length);

    let changed = true;

    // Permite casos como:
    // "Olá, bom dia, queria fazer um pedido"
    //
    // removendo as saudações iniciais uma a uma.
    while (changed && result) {

        changed = false;

        for (const greeting of greetings) {

            const pattern = new RegExp(
                `^${escapeRegExp(greeting)}(?:\\s+|$)`,
                'i'
            );

            if (pattern.test(result)) {

                result = result
                    .replace(pattern, '')
                    .trim();

                changed = true;

                break;
            }
        }
    }

    return result;
}




// --------------------------------------------------
// INTENÇÕES
// --------------------------------------------------

const INTENTS = {

    // ----------------------------------------------
    // SAUDAÇÃO
    // ----------------------------------------------

    GREETING: [

        'ola',
        'oi',
        'oii',
        'oiii',
        'oiiii',
        'oiiiii',

        'olaa',
        'olaaa',
        'olaaaa',

        'hey',
        'hello',
        'hi',

        'bom dia',
        'boa tarde',
        'boa noite',
        'boa madrugada',
        'boa manha',

        'e ai',
        'eai',
        'e ai pessoal',

        'tudo bem',
        'tudo bom',
        'tudo certo',
        'tudo tranquilo',
        'tudo bem por ai',

        'como estas',
        'como esta',
        'como vao',
        'como vai',
        'como voces estao',
        'como voces vao',

        'estao bem',
        'esta tudo bem',

        'saudacoes',
        'ola pessoal',
        'oi pessoal',
        'ola gente',
        'oi gente'
    ],


    // ----------------------------------------------
    // MENU / PRODUTOS
    // ----------------------------------------------

    MENU: [

        'menu',
        'o menu',
        'ver menu',
        'ver o menu',
        'mostrar menu',
        'mostrar o menu',
        'mostra menu',
        'mostra o menu',
        'manda menu',
        'manda o menu',
        'mandar menu',
        'mandar o menu',
        'enviar menu',
        'enviar o menu',

        'quero ver o menu',
        'quero ver menu',
        'quero o menu',
        'quero menu',
        'gostaria de ver o menu',
        'gostaria de ver menu',
        'gostaria do menu',
        'pode mandar o menu',
        'podem mandar o menu',
        'pode enviar o menu',
        'podem enviar o menu',

        'quero saber o que tem',
        'quero saber o que voces tem',
        'o que tem',
        'o que voces tem',
        'o que voces vendem',
        'o que vendem',
        'o que voces oferecem',
        'o que oferecem',

        'quais produtos tem',
        'quais produtos voces tem',
        'quais produtos vendem',
        'quais sao os produtos',
        'quais produtos',
        'lista de produtos',
        'lista dos produtos',
        'listar produtos',
        'mostrar produtos',
        'mostra os produtos',
        'ver produtos',
        'quero ver os produtos',
        'quero conhecer os produtos',
        'quero saber os produtos',

        'tem produtos',
        'tem alguma coisa',
        'o que voces tem disponivel',
        'o que tem disponivel',
        'o que esta disponivel'
    ],


    // ----------------------------------------------
    // PEDIDO / COMPRA
    // ----------------------------------------------

    ORDER: [

        'fazer pedido',
        'fazer um pedido',
        'fazer pedido agora',
        'fazer uma encomenda',
        'fazer encomenda',

        'quero fazer pedido',
        'quero fazer um pedido',
        'quero fazer uma encomenda',
        'quero fazer encomenda',

        'quero pedir',
        'quero comprar',
        'quero encomendar',
        'quero realizar um pedido',
        'quero realizar pedido',
        'quero efetuar um pedido',
        'quero efetuar pedido',

        'gostaria de pedir',
        'gostaria de fazer um pedido',
        'gostaria de fazer pedido',
        'gostaria de encomendar',
        'gostaria de comprar',

        'pretendo fazer um pedido',
        'pretendo fazer pedido',
        'pretendo encomendar',
        'pretendo comprar',

        'posso fazer um pedido',
        'posso fazer pedido',
        'posso encomendar',
        'posso comprar',
        'posso pedir',

        'quero realizar uma compra',
        'quero fazer uma compra',
        'gostaria de fazer uma compra',
        'pretendo fazer uma compra',

        'quero pedir alguma coisa',
        'quero comprar alguma coisa',
        'quero encomendar alguma coisa',

        'vou fazer um pedido',
        'vou fazer pedido',
        'vou pedir',
        'vou comprar',
        'vou encomendar',

        'pode fazer meu pedido',
        'podem fazer meu pedido',
        'quero iniciar um pedido',
        'vamos fazer um pedido',
        'vamos fazer pedido'
    ],


    // ----------------------------------------------
    // CONSULTAR SERVIÇOS
    // ----------------------------------------------

    SERVICE: [

        'servico',
        'servicos',
        'o servico',
        'os servicos',

        'quais servicos',
        'quais sao os servicos',
        'que servicos fazem',
        'que servicos oferecem',
        'quais servicos oferecem',
        'quais servicos fazem',

        'o que voces fazem',
        'o que fazem',
        'o que voces oferecem',
        'o que oferecem',

        'quais trabalhos fazem',
        'quais trabalhos oferecem',
        'trabalhos que fazem',
        'trabalhos que oferecem',

        'lista de servicos',
        'lista dos servicos',
        'listar servicos',
        'mostrar servicos',
        'mostrar os servicos',
        'mostra os servicos',
        'ver servicos',
        'ver os servicos',

        'quero ver os servicos',
        'quero ver servicos',
        'quero conhecer os servicos',
        'quero saber os servicos',

        'quais trabalhos voces fazem',
        'que trabalhos voces fazem',
        'que trabalhos voces oferecem',

        'tem servicos',
        'tem algum servico',
        'tem servicos disponiveis',
        'quais servicos estao disponiveis'
    ],


    // ----------------------------------------------
    // SOLICITAR / CONTRATAR SERVIÇO
    // ----------------------------------------------

    SERVICE_REQUEST: [

        'preciso de um servico',
        'preciso de servico',
        'preciso de algum servico',

        'quero um servico',
        'quero contratar',
        'quero contratar voces',
        'quero contratar o servico',
        'quero contratar um servico',

        'gostaria de um servico',
        'gostaria de contratar',
        'gostaria de contratar voces',
        'gostaria de contratar um servico',

        'pretendo contratar',
        'pretendo contratar voces',
        'pretendo contratar um servico',

        'preciso contratar',
        'preciso contratar voces',
        'preciso contratar um servico',

        'quero solicitar um servico',
        'quero solicitar servico',
        'preciso solicitar um servico',
        'preciso solicitar servico',
        'gostaria de solicitar um servico',
        'gostaria de solicitar servico',

        'quero pedir um servico',
        'quero pedir servico',
        'gostaria de pedir um servico',
        'gostaria de pedir servico',

        'quero marcar um servico',
        'quero marcar servico',
        'quero agendar um servico',
        'quero agendar servico',

        'gostaria de marcar um servico',
        'gostaria de agendar um servico',

        'preciso marcar um servico',
        'preciso agendar um servico',

        'quero fazer uma solicitacao',
        'quero fazer uma solicitacao de servico',
        'preciso fazer uma solicitacao',
        'preciso fazer uma solicitacao de servico',

        'preciso de um trabalho',
        'preciso de trabalho',
        'quero um trabalho',
        'gostaria de um trabalho',

        'quero pedir um orcamento',
        'preciso de um orcamento',
        'gostaria de um orcamento',
        'quero saber o orcamento',
        'quero solicitar um orcamento',
        'preciso solicitar um orcamento',
        'gostaria de solicitar um orcamento',

        'quero fazer um orcamento',
        'preciso fazer um orcamento',

        'quanto custa para fazer o servico',
        'quero contratar o servico'
    ],


    // ----------------------------------------------
    // PREÇOS
    // ----------------------------------------------

    PRICE: [

        'preco',
        'precos',
        'o preco',
        'os precos',

        'quanto custa',
        'quanto custam',
        'quanto custa isso',
        'quanto custa aquilo',
        'quanto fica',
        'quanto fica isso',
        'quanto fica aquilo',
        'quanto sai',
        'quanto sai isso',

        'qual o preco',
        'qual e o preco',
        'qual o valor',
        'qual e o valor',

        'quais os precos',
        'quais sao os precos',
        'quais os valores',
        'quais sao os valores',

        'valor',
        'valores',

        'me diz o preco',
        'diz me o preco',
        'podem dizer o preco',
        'pode dizer o preco',

        'me diz o valor',
        'diz me o valor',
        'podem dizer o valor',
        'pode dizer o valor',

        'quero saber o preco',
        'quero saber os precos',
        'quero saber o valor',
        'quero saber os valores',

        'tem preco',
        'tem precos',
        'tem valores',
        'qual o custo',
        'qual e o custo',
        'quanto e'
    ],


    // ----------------------------------------------
    // LOCALIZAÇÃO
    // ----------------------------------------------

    LOCATION: [

        'localizacao',
        'local',
        'onde ficam',
        'onde fica',
        'onde voces ficam',
        'onde voces estao',
        'onde estao',
        'onde esta',

        'qual a localizacao',
        'qual e a localizacao',

        'endereco',
        'morada',
        'qual o endereco',
        'qual e o endereco',
        'qual a morada',
        'qual e a morada',

        'onde e',
        'onde fica o local',
        'onde fica a loja',
        'onde fica o estabelecimento',

        'como chegar',
        'como posso chegar',
        'como chego ai',
        'como chegar ai',
        'como chegar ate voces',
        'como chego ate voces',

        'onde posso encontrar voces',
        'onde posso encontrar',
        'onde vos encontro',

        'mandem a localizacao',
        'manda a localizacao',
        'pode mandar a localizacao',
        'podem mandar a localizacao',

        'manda o endereco',
        'mandem o endereco',
        'pode mandar o endereco',
        'podem mandar o endereco'
    ],


    // ----------------------------------------------
    // HORÁRIO
    // ----------------------------------------------

    HOURS: [

        'horario',
        'horarios',
        'o horario',
        'os horarios',

        'horario de funcionamento',
        'horarios de funcionamento',
        'qual o horario',
        'qual e o horario',
        'quais os horarios',
        'quais sao os horarios',

        'que horas abrem',
        'que horas abre',
        'que horas fecham',
        'que horas fecha',

        'a que horas abrem',
        'a que horas abre',
        'a que horas fecham',
        'a que horas fecha',

        'quando abrem',
        'quando abre',
        'quando fecham',
        'quando fecha',

        'a que horas funcionam',
        'que horas funcionam',
        'qual o horario de atendimento',

        'estao abertos',
        'estao abertos agora',
        'estao fechados',
        'esta aberto',
        'esta fechado',

        'estao a funcionar',
        'esta a funcionar',
        'estao funcionando',
        'esta funcionando',

        'funcionamento',
        'dias de funcionamento',
        'quais dias funcionam',
        'que dias funcionam',
        'abrem hoje',
        'fecham hoje',

        'trabalham hoje',
        'funcionam hoje'
    ],


    // ----------------------------------------------
    // ATENDENTE HUMANO
    // ----------------------------------------------

    HUMAN: [

        'atendente',
        'atendimento',
        'atendimento humano',
        'atendimento pessoal',

        'falar com alguem',
        'falar com alguém',
        'falar com uma pessoa',
        'falar com pessoa',
        'falar com humano',
        'falar com um humano',

        'quero falar com alguem',
        'quero falar com uma pessoa',
        'quero falar com atendente',
        'quero falar com um atendente',
        'quero falar com funcionario',
        'quero falar com funcionario',

        'gostaria de falar com alguem',
        'gostaria de falar com uma pessoa',
        'gostaria de falar com um atendente',

        'preciso falar com alguem',
        'preciso falar com uma pessoa',
        'preciso falar com um atendente',

        'pode chamar alguem',
        'pode chamar uma pessoa',
        'podem chamar alguem',
        'podem chamar uma pessoa',

        'quero atendimento humano',
        'preciso de atendimento humano',
        'quero atendimento pessoal',

        'pessoa real',
        'humano',
        'pessoa',
        'funcionario',
        'funcionaria',
        'atendente real',

        'quero falar com alguem de verdade',
        'quero falar com uma pessoa real',
        'quero falar com uma pessoa de verdade',

        'nao quero falar com robo',
        'nao quero falar com bot',
        'quero falar com alguem do atendimento'
    ],


    // ----------------------------------------------
    // AJUDA
    // ----------------------------------------------

    HELP: [

        'ajuda',
        'help',
        'preciso de ajuda',
        'preciso ajuda',

        'pode me ajudar',
        'podem me ajudar',
        'pode ajudar',
        'podem ajudar',

        'me ajuda',
        'ajuda me',
        'ajudem me',

        'consegue me ajudar',
        'conseguem me ajudar',

        'preciso de uma ajuda',
        'preciso de orientacao',
        'preciso de orientação',

        'como funciona',
        'como e que funciona',
        'como funciona isso',
        'como posso fazer',

        'o que posso fazer',
        'o que devo fazer',
        'o que faco',
        'o que faço',

        'nao sei',
        'nao sei como fazer',
        'nao estou a entender',
        'nao entendi',
        'nao percebi',

        'pode explicar',
        'podem explicar',
        'me explica',
        'explica me',

        'preciso saber como funciona'
    ],


    // ----------------------------------------------
    // AGRADECIMENTO
    // ----------------------------------------------

    THANKS: [

        'obrigado',
        'obrigada',
        'obrigado mesmo',
        'obrigada mesmo',

        'muito obrigado',
        'muito obrigada',

        'obrigado pela ajuda',
        'obrigada pela ajuda',

        'obrigado por ajudar',
        'obrigada por ajudar',

        'obrigado pela informacao',
        'obrigada pela informacao',

        'agradeco',
        'agradeco muito',
        'agradecido',
        'agradecida',

        'muito agradecido',
        'muito agradecida',

        'valeu',
        'valeu mesmo',

        'grato',
        'grata',

        'agradecimento'
    ],


    // ----------------------------------------------
    // DESPEDIDA
    // ----------------------------------------------

    GOODBYE: [

        'tchau',
        'xau',
        'chau',

        'adeus',

        'ate logo',
        'ate breve',
        'ate mais',
        'ate ja',
        'ate depois',
        'ate amanha',
        'ate outro dia',

        'falamos depois',
        'falamos mais tarde',
        'falamos amanha',
        'falo contigo depois',
        'falamos em breve',

        'ate a proxima',
        'ate proxima',

        'bom resto do dia',
        'bom resto de dia',

        'vou embora',
        'tenho que ir',
        'preciso ir',
        'ja vou',

        'vou indo',
        'estou de saida',

        'nos falamos',
        'depois falamos',

        'obrigado tchau',
        'obrigada tchau',
        'obrigado ate logo',
        'obrigada ate logo',
        'obrigado ate amanha',
        'obrigada ate amanha'
    ],


    // ----------------------------------------------
    // CANCELAMENTO
    // ----------------------------------------------

    CANCEL: [

        'cancelar',
        'cancela',
        'cancelamento',

        'quero cancelar',
        'quero cancelar isso',
        'quero cancelar isto',

        'pode cancelar',
        'podem cancelar',

        'cancele por favor',
        'cancela por favor',

        'quero cancelar o pedido',
        'quero cancelar meu pedido',
        'quero cancelar o meu pedido',

        'cancele meu pedido',
        'cancela meu pedido',

        'nao quero mais',
        'ja nao quero',
        'nao preciso mais',

        'quero desistir',
        'desisti',
        'desistir do pedido',

        'quero cancelar a solicitacao',
        'quero cancelar minha solicitacao',
        'quero cancelar o servico',
        'quero cancelar meu servico',

        'cancele a solicitacao',
        'cancela a solicitacao',

        'quero parar o pedido',
        'quero parar a solicitacao'
    ]
};


// --------------------------------------------------
// DETECTAR INTENÇÃO
// --------------------------------------------------

function detectIntent(message) {

    const text = normalizeText(message);

    if (!text) {
        return {
            intent: 'UNKNOWN',
            confidence: 0,
            text
        };
    }

    // Texto utilizado apenas para procurar uma segunda
    // intenção depois de uma possível saudação inicial.
    //
    // A variável `text` original permanece intacta.
    const intentText = removeLeadingGreeting(text);


    // =====================================================
    // PEDIDO DE SERVIÇO POR PADRÃO LINGUÍSTICO
    // =====================================================
    //
    // Reconhece pedidos de serviço mesmo quando o nome
    // concreto do serviço não está cadastrado aqui.
    //
    // Exemplos:
    //
    // "quero solicitar limpeza"
    // "preciso de instalação"
    // "gostaria de um corte de cabelo"
    // "quero orçamento para pintura"
    //
    // O nome do serviço permanece dinâmico.
    //
    // IMPORTANTE:
    //
    // Não usar apenas palavras isoladas como "preciso",
    // "quero" ou "serviço", pois isso poderia gerar
    // falsos positivos.
    //
    // =====================================================

    const serviceRequestPatterns = [

        /^quero solicitar (.+)$/,

        /^quero um servico (.+)$/,

        /^quero servico (.+)$/,

        /^preciso de (?:um |uma |algum |alguma )?(.+)$/,

        /^preciso do (.+)$/,

        /^preciso da (.+)$/,

        /^gostaria de (?:um |uma |algum |alguma )?(.+)$/,

        /^gostaria do (.+)$/,

        /^gostaria da (.+)$/,

        /^solicito (.+)$/,

        /^solicitar (.+)$/,

        /^pedido de (.+)$/,

        /^pedido para (.+)$/,

        /^orcamento de (.+)$/,

        /^orcamento para (.+)$/,

        /^quero orcamento de (.+)$/,

        /^quero orcamento para (.+)$/,

        /^preciso de orcamento de (.+)$/,

        /^preciso de orcamento para (.+)$/,

        /^gostaria de orcamento de (.+)$/,

        /^gostaria de orcamento para (.+)$/
    ];


    const looksLikeServiceRequest =
    serviceRequestPatterns.some(
        (pattern) => pattern.test(intentText)
    );


    if (looksLikeServiceRequest) {

        return {
            intent: 'SERVICE_REQUEST',
            confidence: 1,
            text
        };
    }


    // =====================================================
    // PRIORIDADE DAS INTENÇÕES
    // =====================================================
    //
    // GREETING fica por último de propósito.
    //
    // Uma saudação acompanhada de outra intenção
    // não deve esconder a intenção principal.
    //
    // Exemplos:
    //
    // "Olá, quero fazer um pedido"
    // -> ORDER
    //
    // "Bom dia, quero ver o menu"
    // -> MENU
    //
    // "Boa tarde, quanto custa?"
    // -> PRICE
    //
    // "Olá, onde ficam?"
    // -> LOCATION
    //
    // "Boa noite"
    // -> GREETING
    //
    // "Boa noite, até amanhã"
    // -> GOODBYE
    //
    // =====================================================

    const priority = [

        'CANCEL',

        'SERVICE_REQUEST',

        'ORDER',

        'MENU',

        'LOCATION',

        'HOURS',

        'PRICE',

        'HUMAN',

        'HELP',

        'THANKS',

        'GOODBYE',

        'SERVICE'
    ];


    // =====================================================
    // INTENÇÃO PRINCIPAL
    // =====================================================

    for (const intent of priority) {

        if (containsAny(text, INTENTS[intent])) {

            return {
                intent,
                confidence: 1,
                text
            };
        }
    }


    // =====================================================
    // PEDIDO / COMPRA POR PADRÃO LINGUÍSTICO
    // =====================================================
    //
    // Reconhece pedidos em que o cliente indica uma compra
    // mas o item concreto é dinâmico.
    //
    // Exemplos:
    //
    // "Bom dia, queria uma Classic Burger"
    // "queria uma pizza"
    // "queria um produto"
    // "gostaria de uma camisa"
    // "pretendo comprar um produto"
    //
    // O nome do produto NÃO é conhecido aqui.
    //
    // A resolução concreta do produto fica para as
    // camadas superiores.
    //
    // Este bloco fica DEPOIS da prioridade para evitar
    // que frases como "quero ver o menu" sejam classificadas
    // incorretamente como ORDER.
    //
    // =====================================================

    const orderPatterns = [

        /^queria (.+)$/,

        /^gostaria de (.+)$/,

        /^pretendo comprar (.+)$/,

        /^pretendo encomendar (.+)$/,

        /^vou comprar (.+)$/,

        /^vou encomendar (.+)$/,

        /^vou pedir (.+)$/
    ];


    const looksLikeOrder =
    orderPatterns.some(
        (pattern) => pattern.test(intentText)
    );


    if (looksLikeOrder) {

        return {
            intent: 'ORDER',
            confidence: 1,
            text
        };
    }


    // =====================================================
    // CONSULTA DE ITEM POR PADRÃO LINGUÍSTICO
    // =====================================================
    //
    // Reconhece perguntas em que o cliente pergunta se
    // determinado item existe, é vendido ou é oferecido.
    //
    // Exemplos:
    //
    // "Olá, vocês têm batata?"
    // "tem pizza?"
    // "vocês vendem camisas?"
    // "vocês oferecem este produto?"
    //
    // O item concreto permanece dinâmico.
    //
    // IMPORTANTE:
    //
    // normalizeText() remove acentos. Portanto, os padrões
    // usam "voces" e não "vocês".
    //
    // =====================================================

    const menuQueryPatterns = [

        /^tem (.+)$/,

        /^voces tem (.+)$/,

        /^o que voces tem (.+)$/,

        /^voces vendem (.+)$/,

        /^vende (.+)$/,

        /^vendem (.+)$/,

        /^oferecem (.+)$/,

        /^voces oferecem (.+)$/
    ];


   const looksLikeMenuQuery =
    menuQueryPatterns.some(
        (pattern) => pattern.test(intentText)
    );

    if (looksLikeMenuQuery) {

        return {
            intent: 'MENU',
            confidence: 1,
            text
        };
    }


    // =====================================================
    // SAUDAÇÃO
    // =====================================================
    //
    // Só chegamos aqui quando nenhuma outra intenção
    // foi encontrada.
    //
    // Portanto:
    //
    // "Olá"
    // "Oi"
    // "Bom dia"
    // "Boa tarde"
    // "Boa noite"
    //
    // continuam sendo GREETING.
    //
    // Uma saudação acompanhada de outra intenção já
    // terá sido capturada acima.
    //
    // =====================================================

    if (containsAny(text, INTENTS.GREETING)) {

        return {
            intent: 'GREETING',
            confidence: 1,
            text
        };
    }


    // =====================================================
    // DESCONHECIDO
    // =====================================================
    //
    // Regra importante:
    //
    // Se não houver confiança suficiente para classificar
    // a mensagem, não inventamos uma intenção.
    //
    // A camada superior pode decidir permanecer em silêncio.
    //
    // =====================================================

    return {
        intent: 'UNKNOWN',
        confidence: 0,
        text
    };
}


// --------------------------------------------------
// EXPORTAÇÕES
// --------------------------------------------------

module.exports = {
    normalizeText,
    detectIntent,
    INTENTS
};
