/**
 * =========================================================
 * INTENT SERVICE
 * =========================================================
 *
 * Primeira camada do Centro de Inteligência.
 *
 * Responsável por transformar linguagem natural em
 * intenções normalizadas.
 *
 * IMPORTANTE:
 * Não depende do estado da conversa.
 * O contexto será tratado pelo Knowledge Engine.
 * =========================================================
 */

function normalizeText(text) {

    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}


/**
 * =========================================================
 * PALAVRAS / EXPRESSÕES
 * =========================================================
 */

const patterns = {

    greeting: [
        'ola',
        'oi',
        'bom dia',
        'boa tarde',
        'boa noite',
        'alo',
        'hello',
        'hey',
        'ola tudo bem',
        'oi tudo bem'
    ],

    menu: [
        'menu',
        'ver menu',
        'mostrar menu',
        'quero ver o menu',
        'quero o menu',
        'me mostra o menu',
        'mostra o menu',
        'cardapio',
        'ver cardapio',
        'quero ver os produtos',
        'produtos'
    ],

    order: [
        'quero fazer um pedido',
        'quero pedir',
        'quero encomendar',
        'fazer pedido',
        'fazer um pedido',
        'quero comprar',
        'vou querer',
        'manda um',
        'manda dois',
        'quero um',
        'quero dois',
        'quero tres',
        'quero 1',
        'quero 2',
        'quero 3',
        'pedido'
    ],

    services: [
        'servicos',
        'ver servicos',
        'quero ver os servicos',
        'mostrar servicos',
        'quais servicos',
        'o que fazem',
        'o que voces fazem'
    ],

    service_request: [
        'quero um servico',
        'quero solicitar um servico',
        'solicitar servico',
        'preciso de um servico',
        'quero pedir um servico',
        'quero um orcamento',
        'preciso de um orcamento',
        'pedir orcamento',
        'solicitar orcamento'
    ],

    price: [
        'preco',
        'precos',
        'quanto custa',
        'quanto e',
        'quanto sai',
        'qual o valor',
        'qual e o valor',
        'valor',
        'custa quanto',
        'esta quanto',
        'quanto esta'
    ],

    location: [
        'onde ficam',
        'onde voces ficam',
        'localizacao',
        'endereco',
        'morada',
        'onde estao',
        'como chegar',
        'onde fica'
    ],

    hours: [
        'horario',
        'horarios',
        'que horas abrem',
        'que horas fecham',
        'quando abrem',
        'quando fecham',
        'estao abertos',
        'esta aberto',
        'abrem hoje',
        'fecham hoje'
    ],

    attendant: [
        'atendente',
        'atendimento',
        'pessoa',
        'humano',
        'falar com alguem',
        'falar com uma pessoa',
        'quero falar com alguem',
        'quero falar com atendente',
        'preciso de ajuda humana'
    ],

    help: [
        'ajuda',
        'help',
        'nao entendi',
        'nao percebi',
        'nao estou a entender',
        'como funciona',
        'podes ajudar',
        'pode ajudar',
        'me ajuda'
    ],

    thanks: [
        'obrigado',
        'obrigada',
        'valeu',
        'muito obrigado',
        'muito obrigada',
        'agradeco',
        'agradecido'
    ],

    goodbye: [
        'adeus',
        'tchau',
        'xau',
        'ate logo',
        'ate mais',
        'falamos depois',
        'boa noite',
        'vou embora'
    ],

    cancel: [
        'cancelar',
        'cancela',
        'quero cancelar',
        'cancela pedido',
        'cancelar pedido',
        'nao quero mais',
        'deixa',
        'esquece'
    ],

    confirm: [
        'sim',
        's',
        'confirmar',
        'confirmo',
        'pode ser',
        'pode',
        'claro',
        'com certeza',
        'isso',
        'exatamente'
    ],

    deny: [
        'nao',
        'n',
        'negativo',
        'nao quero',
        'nao obrigado',
        'nao obrigada'
    ]
};


/**
 * =========================================================
 * DETECTAR PADRÃO
 * =========================================================
 */

function matchesPattern(
    text,
    pattern
) {

    if (
        text === pattern
    ) {
        return true;
    }

    return text.includes(pattern);
}


/**
 * =========================================================
 * DETECTAR INTENÇÃO
 * =========================================================
 */

function detectIntent(messageText) {

    const originalText =
        String(messageText || '').trim();

    const text =
        normalizeText(originalText);


    if (!text) {

        return {
            intent: 'help',
            text: '',
            normalizedText: '',
            confidence: 0
        };
    }


    /**
     * -----------------------------------------------------
     * FRASES MUITO CURTAS E CONTEXTUAIS
     * -----------------------------------------------------
     *
     * Sim / não não devem tentar decidir sozinhos o fluxo.
     * O Knowledge Engine fará isso.
     */

    if (
        patterns.confirm.includes(text)
    ) {

        return {
            intent: 'confirm',
            text: text,
            normalizedText: text,
            confidence: 1
        };
    }


    if (
        patterns.deny.includes(text)
    ) {

        return {
            intent: 'deny',
            text: text,
            normalizedText: text,
            confidence: 1
        };
    }


    /**
     * -----------------------------------------------------
     * CANCELAR
     * -----------------------------------------------------
     */

    for (
        const pattern of patterns.cancel
    ) {

        if (
            matchesPattern(text, pattern)
        ) {

            return {
                intent: 'cancel',
                text: text,
                normalizedText: text,
                confidence: 0.95
            };
        }
    }


    /**
     * -----------------------------------------------------
     * SAUDAÇÃO
     * -----------------------------------------------------
     */

    for (
        const pattern of patterns.greeting
    ) {

        if (
            matchesPattern(text, pattern)
        ) {

            return {
                intent: 'greeting',
                text: text,
                normalizedText: text,
                confidence: 0.95
            };
        }
    }


    /**
     * -----------------------------------------------------
     * OUTRAS INTENÇÕES
     * -----------------------------------------------------
     */

    const priority = [
        'service_request',
        'attendant',
        'location',
        'hours',
        'price',
        'services',
        'menu',
        'order',
        'help',
        'thanks',
        'goodbye'
    ];


    for (
        const intent of priority
    ) {

        for (
            const pattern of patterns[intent]
        ) {

            if (
                matchesPattern(text, pattern)
            ) {

                return {
                    intent,
                    text,
                    normalizedText: text,
                    confidence:
                        pattern.length > 5
                            ? 0.9
                            : 0.8
                };
            }
        }
    }


    /**
     * -----------------------------------------------------
     * DESCONHECIDO
     * -----------------------------------------------------
     */

    return {

        intent: 'unknown',

        text,

        normalizedText: text,

        confidence: 0
    };
}


module.exports = {

    detectIntent,

    normalizeText
};