
/**
 * Detecta a intenção principal de uma mensagem recebida pelo bot.
 *
 * A ideia é permitir que o cliente escreva de várias formas
 * diferentes e o bot consiga entender a intenção.
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
// VERIFICA SE A MENSAGEM CONTÉM UMA DAS FRASES
// --------------------------------------------------

function containsAny(text, phrases) {
    return phrases.some((phrase) => {
        return text.includes(phrase);
    });
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
        'olaa',
        'olaaa',
        'hey',
        'hello',
        'bom dia',
        'boa tarde',
        'boa noite',
        'boa madrugada',
        'boa manha',
        'e ai',
        'eai',
        'tudo bem',
        'como estas',
        'como esta',
        'como vao',
        'como vai',
        'tudo bom',
        'tudo certo'
    ],


    // ----------------------------------------------
    // MENU
    // ----------------------------------------------

    MENU: [
        'menu',
        'ver menu',
        'mostrar menu',
        'mostra o menu',
        'quero ver o menu',
        'quero o menu',
        'mandar o menu',
        'manda o menu',
        'enviar o menu',
        'quero ver os produtos',
        'ver produtos',
        'mostrar produtos',
        'lista de produtos',
        'quais produtos',
        'o que voces vendem',
        'o que vendem',
        'o que tem',
        'o que voces tem'
    ],


    // ----------------------------------------------
    // PEDIDO
    // ----------------------------------------------

    ORDER: [
        'fazer pedido',
        'fazer um pedido',
        'quero fazer pedido',
        'quero fazer um pedido',
        'quero pedir',
        'quero comprar',
        'quero encomendar',
        'gostaria de pedir',
        'gostaria de fazer um pedido',
        'pretendo fazer um pedido',
        'posso fazer um pedido',
        'quero realizar um pedido',
        'fazer encomenda',
        'quero fazer encomenda'
    ],


    // ----------------------------------------------
    // CONSULTAR SERVIÇOS
    // ----------------------------------------------

    SERVICE: [
        'servico',
        'servicos',
        'quais servicos',
        'que servicos fazem',
        'o que voces fazem',
        'o que fazem',
        'quais trabalhos fazem',
        'trabalhos que fazem',
        'lista de servicos',
        'mostrar servicos',
        'mostrar os servicos',
        'ver servicos',
        'quero ver os servicos',
        'quais trabalhos voces fazem',
        'que trabalhos voces fazem'
    ],


    // ----------------------------------------------
    // SOLICITAR / CONTRATAR SERVIÇO
    // ----------------------------------------------

    SERVICE_REQUEST: [
        'preciso de um servico',
        'preciso de servico',
        'quero um servico',
        'quero um serviço',
        'gostaria de um servico',
        'gostaria de um serviço',
        'quero contratar',
        'quero contratar voces',
        'quero contratar o servico',
        'quero contratar um servico',
        'preciso contratar',
        'gostaria de contratar',
        'pretendo contratar',
        'quero solicitar um servico',
        'quero solicitar servico',
        'preciso solicitar um servico',
        'preciso solicitar servico',
        'quero pedir um servico',
        'quero pedir servico',
        'quero marcar um servico',
        'quero agendar um servico',
        'gostaria de marcar um servico',
        'gostaria de agendar um servico',
        'quero fazer uma solicitacao',
        'quero fazer uma solicitacao de servico',
        'preciso de um trabalho',
        'quero um trabalho',
        'gostaria de um trabalho',
        'quero pedir um orcamento',
        'preciso de um orcamento',
        'gostaria de um orcamento',
        'quero saber o orcamento',
        'quero solicitar um orcamento'
    ],


    // ----------------------------------------------
    // PREÇOS
    // ----------------------------------------------

    PRICE: [
        'preco',
        'precos',
        'quanto custa',
        'quanto custam',
        'quanto e',
        'qual o preco',
        'quais os precos',
        'quais os preços',
        'valor',
        'valores',
        'quanto fica',
        'quanto sai'
    ],


    // ----------------------------------------------
    // LOCALIZAÇÃO
    // ----------------------------------------------

    LOCATION: [
        'localizacao',
        'onde ficam',
        'onde fica',
        'onde voces ficam',
        'onde voces estao',
        'onde estao',
        'onde esta',
        'endereco',
        'morada',
        'como chegar',
        'qual o endereco',
        'qual a localizacao'
    ],


    // ----------------------------------------------
    // HORÁRIO
    // ----------------------------------------------

    HOURS: [
        'horario',
        'horarios',
        'que horas abrem',
        'que horas fecha',
        'que horas fecham',
        'a que horas abrem',
        'a que horas fecham',
        'quando abrem',
        'quando fecham',
        'estao abertos',
        'estao fechados',
        'esta aberto',
        'funcionamento',
        'horario de funcionamento'
    ],


    // ----------------------------------------------
    // ATENDENTE HUMANO
    // ----------------------------------------------

    HUMAN: [
        'atendente',
        'atendimento',
        'falar com alguem',
        'falar com uma pessoa',
        'falar com humano',
        'quero falar com alguem',
        'quero falar com uma pessoa',
        'quero falar com atendente',
        'falar com funcionario',
        'pessoa real',
        'humano',
        'quero falar com uma pessoa real'
    ],


    // ----------------------------------------------
    // AJUDA
    // ----------------------------------------------

    HELP: [
        'ajuda',
        'help',
        'preciso de ajuda',
        'pode me ajudar',
        'podem me ajudar',
        'como funciona',
        'o que posso fazer',
        'nao sei',
        'me ajuda'
    ],


    // ----------------------------------------------
    // AGRADECIMENTO
    // ----------------------------------------------

    THANKS: [
        'obrigado',
        'obrigada',
        'muito obrigado',
        'muito obrigada',
        'valeu',
        'agradeco',
        'agradecido',
        'agradecida',
        'obrigado pela ajuda',
        'obrigada pela ajuda'
    ],


    // ----------------------------------------------
    // DESPEDIDA
    // ----------------------------------------------

    GOODBYE: [
        'tchau',
        'adeus',
        'ate logo',
        'ate breve',
        'falamos depois',
        'ate mais',
        'vou embora',
        'obrigado tchau',
        'obrigada tchau'
    ],


    // ----------------------------------------------
    // CANCELAMENTO
    // ----------------------------------------------

    CANCEL: [
        'cancelar',
        'quero cancelar',
        'cancela',
        'cancelamento',
        'nao quero mais',
        'pode cancelar',
        'cancele meu pedido',
        'quero cancelar o pedido',
        'quero cancelar a solicitacao',
        'quero cancelar o servico'
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


    /**
     * Algumas intenções têm prioridade.
     *
     * Exemplo:
     *
     * "boa noite, quero fazer um pedido"
     *
     * contém GREETING e ORDER.
     *
     * Nesse caso queremos reconhecer ORDER como
     * intenção principal.
     *
     * Outro exemplo:
     *
     * "quero contratar vocês"
     *
     * pode conter a ideia de "serviço", mas deve
     * ser reconhecido como SERVICE_REQUEST.
     */

    const priority = [
        'CANCEL',
        'SERVICE_REQUEST',
        'ORDER',
        'SERVICE',
        'MENU',
        'LOCATION',
        'HOURS',
        'PRICE',
        'HUMAN',
        'HELP',
        'THANKS',
        'GOODBYE',
        'GREETING'
    ];


    for (const intent of priority) {

        if (containsAny(text, INTENTS[intent])) {

            return {
                intent,
                confidence: 1,
                text
            };
        }
    }


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
