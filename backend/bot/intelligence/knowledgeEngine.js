const {
    detectIntent,
    normalizeText
} = require('../../services/intentService');

const {
    getSituation
} = require('./situations');

const {
    getBehavior
} = require('./behaviors');

/**
 * =========================================================
 * KNOWLEDGE ENGINE
 * =========================================================
 *
 * Camada central de inteligência conversacional.
 *
 * Fluxo:
 *
 * mensagem
 *      ↓
 * normalização
 *      ↓
 * intenção explícita
 *      ↓
 * interpretação contextual
 *      ↓
 * situação
 *      ↓
 * comportamento
 *
 * A intenção explícita sempre tem prioridade.
 * =========================================================
 */


/**
 * =========================================================
 * RESPOSTAS AFIRMATIVAS
 * =========================================================
 */

const AFFIRMATIVE_WORDS = [
    'sim',
    's',
    'sim senhor',
    'sim senhora',
    'claro',
    'claro que sim',
    'com certeza',
    'certamente',
    'exatamente',
    'isso',
    'isso mesmo',
    'e isso',
    'pode',
    'pode ser',
    'pode sim',
    'pode avancar',
    'pode continuar',
    'vamos',
    'vamos sim',
    'aceito',
    'confirmo',
    'confirmar',
    'esta certo',
    'tudo certo',
    'correto',
    'perfeito'
];


/**
 * =========================================================
 * RESPOSTAS NEGATIVAS
 * =========================================================
 */

const NEGATIVE_WORDS = [
    'nao',
    'n',
    'nao quero',
    'nao quero mais',
    'nao pode',
    'nao pode ser',
    'nao aceito',
    'nao concordo',
    'de jeito nenhum',
    'negativo',
    'cancela',
    'deixa',
    'deixa estar',
    'esquece'
];


/**
 * =========================================================
 * RESPOSTAS DE SELEÇÃO / REFERÊNCIA
 * =========================================================
 *
 * Estas frases são importantes porque o cliente muitas vezes
 * não responde usando exatamente a palavra "sim".
 *
 * Exemplo:
 *
 * Bot:
 * "Deseja este serviço?"
 *
 * Cliente:
 * "esse mesmo"
 *
 * =========================================================
 */

const REFERENCE_CONFIRMATIONS = [
    'esse',
    'essa',
    'esse mesmo',
    'essa mesma',
    'quero esse',
    'quero essa',
    'pode ser esse',
    'pode ser essa',
    'e esse',
    'e essa',
    'esse ai',
    'essa ai',
    'esse aqui',
    'essa aqui',
    'esse mesmo sim',
    'essa mesma sim'
];


/**
 * =========================================================
 * ESTADOS DE CONFIRMAÇÃO
 * =========================================================
 */

const CONFIRMATION_STATES = [
    'confirming_order',
    'viewing_service',
    'service_request'
];


/**
 * =========================================================
 * ESTADOS DE NEGAÇÃO
 * =========================================================
 */

const DENIAL_STATES = [
    'confirming_order',
    'viewing_service',
    'service_request'
];


/**
 * =========================================================
 * ESTADOS ONDE REFERÊNCIA PODE SIGNIFICAR CONFIRMAÇÃO
 * =========================================================
 */

const REFERENCE_STATES = [
    'viewing_service',
    'service_request',
    'viewing_product'
];


/**
 * =========================================================
 * NORMALIZAÇÃO PARA COMPARAÇÃO
 * =========================================================
 */

function normalizeForComparison(text) {

    return normalizeText(text)
        .replace(/\s+/g, ' ')
        .trim();

}


/**
 * =========================================================
 * VERIFICA AFIRMAÇÃO
 * =========================================================
 */

function isAffirmative(text) {

    const normalized =
        normalizeForComparison(text);

    return AFFIRMATIVE_WORDS.includes(normalized);

}


/**
 * =========================================================
 * VERIFICA NEGAÇÃO
 * =========================================================
 */

function isNegative(text) {

    const normalized =
        normalizeForComparison(text);

    return NEGATIVE_WORDS.includes(normalized);

}


/**
 * =========================================================
 * VERIFICA REFERÊNCIA / SELEÇÃO
 * =========================================================
 */

function isReferenceConfirmation(text) {

    const normalized =
        normalizeForComparison(text);

    return REFERENCE_CONFIRMATIONS.includes(normalized);

}


/**
 * =========================================================
 * NÚMEROS ESCRITOS POR EXTENSO
 * =========================================================
 */

const NUMBER_WORDS = {
    zero: 0,
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    tres: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10
};


/**
 * =========================================================
 * EXTRAI QUANTIDADE
 * =========================================================
 */

function extractQuantity(text) {

    const normalized =
        normalizeForComparison(text);

    /**
     * Apenas número:
     *
     * "2"
     * "5"
     */

    const numericMatch =
        normalized.match(/^\d+$/);

    if (numericMatch) {

        return Number(
            numericMatch[0]
        );

    }


    /**
     * Número dentro de uma frase:
     *
     * "quero 2"
     * "manda 3"
     * "quero dois"
     */

    const digitMatch =
        normalized.match(/\b(\d+)\b/);

    if (digitMatch) {

        return Number(
            digitMatch[1]
        );

    }


    /**
     * Número por extenso.
     */

    for (
        const [word, value]
        of Object.entries(NUMBER_WORDS)
    ) {

        const pattern =
            new RegExp(`\\b${word}\\b`);

        if (pattern.test(normalized)) {

            return value;

        }

    }


    return null;

}



/**
 * =========================================================
 * EXTRAI POSIÇÃO DO PRODUTO
 * =========================================================
 *
 * Exemplos:
 *
 * "o primeiro"
 * "o segundo"
 * "o terceiro"
 * "o último"
 * =========================================================
 */

function extractProductPosition(text) {

    const normalized =
        normalizeForComparison(text);

    const positions = {
        primeiro: 1,
        primeira: 1,
        segundo: 2,
        segunda: 2,
        terceiro: 3,
        terceira: 3,
        quarto: 4,
        quarta: 4,
        quinto: 5,
        quinta: 5
    };

    for (
        const [word, position]
        of Object.entries(positions)
    ) {

        const pattern =
            new RegExp(`\\b${word}\\b`);

        if (pattern.test(normalized)) {
            return position;
        }

    }

    if (
        /\bultimo\b/.test(normalized) ||
        /\bultima\b/.test(normalized)
    ) {
        return 'last';
    }

    return null;
}


/**
 * =========================================================
 * EXTRAI REFERÊNCIA CONTEXTUAL
 * =========================================================
 */

function extractReference(text) {

    const normalized =
        normalizeForComparison(text);

    if (
        /\b(o mesmo|a mesma|esse mesmo|essa mesma)\b/
            .test(normalized)
    ) {
        return 'last';
    }

    if (
        /\b(esse|essa|aquele|aquela)\b/
            .test(normalized)
    ) {
        return 'last';
    }

    if (
        /\bultimo\b/.test(normalized) ||
        /\bultima\b/.test(normalized)
    ) {
        return 'last';
    }

    return null;
}


/**
 * =========================================================
 * DETECTA AÇÃO DE ADICIONAR
 * =========================================================
 */

function isAddAction(text) {

    const normalized =
        normalizeForComparison(text);

    const phrases = [

        'adiciona',
        'adicionar',
        'add',
        'acrescenta',
        'acrescentar',
        'coloca',
        'colocar',
        'manda',
        'mandar',
        'quero',
        'vou querer',
        'pode adicionar',
        'pode colocar'

    ];

    return phrases.some(
        phrase =>
            normalized === phrase ||
            normalized.startsWith(`${phrase} `)
    );

}


/**
 * =========================================================
 * DETECTA AÇÃO DE REMOVER
 * =========================================================
 */

function isRemoveAction(text) {

    const normalized =
        normalizeForComparison(text);

    const phrases = [

        'remove',
        'remover',
        'retira',
        'retirar',
        'tira',
        'tirar',
        'elimina',
        'eliminar',
        'nao quero',
        'nao quero mais',
        'remove esse',
        'remove essa'

    ];

    return phrases.some(
        phrase =>
            normalized === phrase ||
            normalized.startsWith(`${phrase} `)
    );

}


/**
 * =========================================================
 * DETECTA AÇÃO DE ALTERAR / TROCAR
 * =========================================================
 */

function isEditAction(text) {

    const normalized =
        normalizeForComparison(text);

    const phrases = [

        'muda',
        'mudar',
        'troca',
        'trocar',
        'altera',
        'alterar',
        'modifica',
        'modificar',
        'substitui',
        'substituir',
        'deixa',
        'deixar',
        'fica',
        'ficar'

    ];

    return phrases.some(
        phrase =>
            normalized === phrase ||
            normalized.startsWith(`${phrase} `)
    );

}


/**
 * =========================================================
 * DETECTA "VOLTAR"
 * =========================================================
 */

function isBackAction(text) {

    const normalized =
        normalizeForComparison(text);

    const phrases = [

        'voltar',
        'volta',
        'voltar ao menu',
        'volta ao menu',
        'menu anterior',
        'voltar atras',
        'volta atras',
        'atras'

    ];

    return phrases.includes(
        normalized
    );

}


/**
 * =========================================================
 * REMOVE PALAVRAS QUE NÃO FAZEM PARTE DO NOME DO ITEM
 * =========================================================
 */

function cleanItemCandidate(text) {

    let value =
        normalizeForComparison(text);

    const prefixes = [
        'quero',
        'quero um',
        'quero uma',
        'quero dois',
        'quero duas',
        'quero tres',
        'quero quatro',
        'quero cinco',

        'vou querer',
        'vou querer um',
        'vou querer uma',

        'manda',
        'manda um',
        'manda uma',
        'manda dois',
        'manda duas',
        'manda tres',

        'adiciona',
        'adicionar',
        'acrescenta',
        'acrescentar',

        'coloca',
        'colocar',

        'pode adicionar',
        'pode colocar',

        'quero pedir',
        'quero pedir um',
        'quero pedir uma',

        'remove',
        'remover',
        'retira',
        'retirar',
        'tira',
        'tirar',
        'elimina',
        'eliminar',
        'nao quero',
        'nao quero mais',

        'muda',
        'mudar',
        'troca',
        'trocar',
        'altera',
        'alterar',
        'modifica',
        'modificar',
        'substitui',
        'substituir',

        'quanto custa',
        'qual o preco',
        'qual o valor',
        'quanto e',

        'tem',
        'tens',
        'voces tem',
        'voce tem',
        'dispoe de',
    ];

    for (const prefix of prefixes) {

        if (
            value === prefix
        ) {
            return '';
        }

        if (
            value.startsWith(`${prefix} `)
        ) {

            value =
                value
                    .slice(prefix.length)
                    .trim();

            break;
        }
    }


    /**
     * Remove quantidade no início.
     */

    value =
        value.replace(
            /^(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|\d+)\s+/,
            ''
        );


    /**
     * Remove referências.
     */

    value =
        value
            .replace(/\s+esse$/i, '')
            .replace(/\s+essa$/i, '')
            .replace(/\s+esse mesmo$/i, '')
            .replace(/\s+essa mesma$/i, '')
            .trim();


    return value;
}


/**
 * =========================================================
 * EXTRAI CANDIDATO DE PRODUTO / SERVIÇO
 * =========================================================
 *
 * Não consulta banco de dados.
 *
 * Apenas identifica o texto que provavelmente representa
 * o nome de um produto ou serviço.
 * =========================================================
 */

function extractItemCandidate(text) {

    const normalized =
        normalizeForComparison(text);

    if (!normalized) {
        return null;
    }


    /**
     * -----------------------------------------------------
     * FRASES QUE PODEM INTRODUZIR UM ITEM
     * -----------------------------------------------------
     */

    const actionPatterns = [

        // Adicionar
        /^quero\s+/,
        /^vou querer\s+/,
        /^manda\s+/,
        /^adiciona\s+/,
        /^adicionar\s+/,
        /^acrescenta\s+/,
        /^acrescentar\s+/,
        /^coloca\s+/,
        /^colocar\s+/,
        /^pode adicionar\s+/,
        /^pode colocar\s+/,
        /^quero pedir\s+/,

        // Remover
        /^remove\s+/,
        /^remover\s+/,
        /^retira\s+/,
        /^retirar\s+/,
        /^tira\s+/,
        /^tirar\s+/,
        /^elimina\s+/,
        /^eliminar\s+/,
        /^nao quero\s+/,

        // Alterar
        /^muda\s+/,
        /^mudar\s+/,
        /^troca\s+/,
        /^trocar\s+/,
        /^altera\s+/,
        /^alterar\s+/,
        /^modifica\s+/,
        /^modificar\s+/,
        /^substitui\s+/,
        /^substituir\s+/,

        // Consulta de preço
        /^quanto custa\s+/,
        /^qual o preco\s+/,
        /^qual o valor\s+/,
        /^quanto e\s+/,

        // Consulta de disponibilidade
        /^tem\s+/,
        /^tens\s+/,
        /^vocês tem\s+/,
        /^voces tem\s+/,
        /^voce tem\s+/,
        /^dispoe de\s+/,
        /^dispoe\s+/
    ];


    const hasAction =
        actionPatterns.some(
            pattern =>
                pattern.test(normalized)
        );


    if (!hasAction) {
        return null;
    }


    let candidate =
        cleanItemCandidate(normalized);


    /**
     * -----------------------------------------------------
     * LIMPEZA ESPECÍFICA DE CONSULTAS
     * -----------------------------------------------------
     */

    candidate =
        candidate
            .replace(/^quanto custa\s+/i, '')
            .replace(/^qual o preco\s+/i, '')
            .replace(/^qual o valor\s+/i, '')
            .replace(/^quanto e\s+/i, '')
            .replace(/^tem\s+/i, '')
            .replace(/^tens\s+/i, '')
            .replace(/^voces tem\s+/i, '')
            .replace(/^voce tem\s+/i, '')
            .replace(/^dispoe de\s+/i, '')
            .trim();


    /**
     * -----------------------------------------------------
     * LIMPA ARTIGOS E REFERÊNCIAS
     * -----------------------------------------------------
     */

    candidate =
        candidate
            .replace(
                /^(o|a|os|as)\s+/,
                ''
            )
            .trim();


    if (!candidate) {
        return null;
    }


    return candidate;

}


/**
 * =========================================================
 * EXTRAI CANDIDATO DE PRODUTO
 * =========================================================
 */

function extractProductCandidate(
    text,
    state
) {

    const productStates = [

        'product_menu',
        'viewing_product',
        'waiting_product',
        'waiting_quantity',
        'cart_menu',
        'editing_cart',
        'editing_cart_item',
        'idle'

    ];


    if (
        !productStates.includes(state)
    ) {

        return null;

    }


    return extractItemCandidate(text);

}


/**
 * =========================================================
 * EXTRAI CANDIDATO DE SERVIÇO
 * ========================================================= */

function extractServiceCandidate(
    text,
    state
) {

    const serviceStates = [

        'viewing_services',
        'viewing_service',
        'service_request',
        'idle'

    ];


    if (
        !serviceStates.includes(state)
    ) {

        return null;

    }


    return extractItemCandidate(text);

}


/**
 * =========================================================
 * RESOLUÇÃO CONTEXTUAL
 * =========================================================
 */

function resolveContextualIntent({
    detected,
    message,
    state,
    context
}) {

    const explicitIntent =
        String(
            detected?.intent || 'UNKNOWN'
        ).toUpperCase();


    /**
     * -----------------------------------------------------
     * 1. INTENÇÃO EXPLÍCITA
     * -----------------------------------------------------
     *
     * Nunca substituímos uma intenção já identificada.
     */

    if (
        explicitIntent !== 'UNKNOWN'
    ) {

        return {
            intent: explicitIntent,
            confidence:
                detected.confidence ?? 1,
            source: 'explicit'
        };

    }


    const text =
        normalizeForComparison(message);


    if (!text) {

        return {
            intent: 'UNKNOWN',
            confidence: 0,
            source: 'unknown'
        };

    }


    /**
     * -----------------------------------------------------
     * 2. CONFIRMAÇÃO EXPLÍCITA NO CONTEXTO
     * -----------------------------------------------------
     */

    if (
        CONFIRMATION_STATES.includes(state) &&
        isAffirmative(text)
    ) {

        return {
            intent: 'CONFIRM',
            confidence: 0.95,
            source: 'context'
        };

    }


    /**
     * -----------------------------------------------------
     * 3. NEGAÇÃO NO CONTEXTO
     * -----------------------------------------------------
     */

    if (
        DENIAL_STATES.includes(state) &&
        isNegative(text)
    ) {

        return {
            intent: 'DENY',
            confidence: 0.95,
            source: 'context'
        };

    }


    /**
     * -----------------------------------------------------
     * 4. REFERÊNCIA A ITEM / SERVIÇO
     * -----------------------------------------------------
     *
     * Exemplos:
     *
     * "esse"
     * "esse mesmo"
     * "quero esse"
     *
     * Só fazemos esta interpretação quando o estado
     * realmente permite esse significado.
     */

    if (
        REFERENCE_STATES.includes(state) &&
        isReferenceConfirmation(text)
    ) {

        return {
            intent: 'CONFIRM',
            confidence: 0.92,
            source: 'context'
        };

    }


    /**
     * -----------------------------------------------------
     * 5. CONTEXTO EXPLÍCITO DE CONFIRMAÇÃO
     * -----------------------------------------------------
     *
     * Preparado para estados futuros que guardem:
     *
     * awaitingConfirmation: true
     */

    if (
        context?.awaitingConfirmation === true
    ) {

        if (isAffirmative(text)) {

            return {
                intent: 'CONFIRM',
                confidence: 0.98,
                source: 'context'
            };

        }

        if (isNegative(text)) {

            return {
                intent: 'DENY',
                confidence: 0.98,
                source: 'context'
            };

        }

    }


    /**
     * -----------------------------------------------------
     * 6. UNKNOWN
     * -----------------------------------------------------
     */

    return {
        intent: 'UNKNOWN',
        confidence:
            detected?.confidence ?? 0,
        source: 'unknown'
    };

}


/**
 * =========================================================
 * ANALISAR MENSAGEM
 * =========================================================
 */

function analyzeMessage({
    message,
    state = 'idle',
    context = {}
}) {

    const detected =
        detectIntent(message);


    const resolved =
        resolveContextualIntent({
            detected,
            message,
            state,
            context
        });

        const normalizedMessage =
    normalizeForComparison(message);

const quantity =
    extractQuantity(
        normalizedMessage
    );

const addAction =
    isAddAction(
        normalizedMessage
    );

const removeAction =
    isRemoveAction(
        normalizedMessage
    );

const editAction =
    isEditAction(
        normalizedMessage
    );

const backAction =
    isBackAction(
        normalizedMessage
    );

const productPosition =
    extractProductPosition(
        normalizedMessage
    );

const reference =
    extractReference(
        normalizedMessage
    );


    const productCandidate =
    extractProductCandidate(
        normalizedMessage,
        state
    );

const serviceCandidate =
    extractServiceCandidate(
        normalizedMessage,
        state
    );


    const situation =
        getSituation(
            resolved.intent.toLowerCase(),
            state
        );


    const behavior =
        getBehavior(
            situation.behavior
        );


    return {

    message,

    normalizedText:
        detected.normalizedText ||
        detected.text ||
        normalizeText(message),

    intent:
        resolved.intent,

    confidence:
        resolved.confidence,

    intentSource:
        resolved.source,

    detectedIntent:
        detected.intent,

    situation:
        situation.key,

    behavior:
        situation.behavior,

    behaviorConfig:
        behavior,

    state,

    context,

    entities: {

        quantity,

        addAction,

        removeAction,

        editAction,

        backAction,

        productCandidate,

        serviceCandidate,

        productPosition,

        reference

    }

};
}

/**
 * =========================================================
 * EXPORTAÇÕES
 * =========================================================
 */

module.exports = {
    analyzeMessage,
    resolveContextualIntent,
    isAffirmative,
    isNegative,
    isReferenceConfirmation,
    isAddAction,
    isRemoveAction,
    isEditAction,
    extractQuantity,
    extractProductPosition,
    extractReference
};