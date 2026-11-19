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
 * Centro de Inteligência Conversacional.
 *
 * Responsabilidades:
 *
 * 1. Normalizar a mensagem
 * 2. Detectar intenção inicial
 * 3. Interpretar a mensagem dentro do contexto
 * 4. Extrair entidades
 * 5. Identificar ações
 * 6. Identificar alvo da ação
 * 7. Identificar comportamento esperado
 * 8. Determinar situação conversacional
 *
 * IMPORTANTE:
 *
 * O intentService fornece uma intenção inicial.
 * Essa intenção é uma evidência, não uma verdade absoluta.
 *
 * O contexto da conversa pode determinar o comportamento
 * real que o cliente pretende executar.
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
 * REFERÊNCIAS / SELEÇÕES
 * =========================================================
 */

const REFERENCE_CONFIRMATIONS = [
    'esse',
    'essa',
    'aquele',
    'aquela',
    'esse mesmo',
    'essa mesma',
    'aquele mesmo',
    'aquela mesma',
    'quero esse',
    'quero essa',
    'quero aquele',
    'quero aquela',
    'pode ser esse',
    'pode ser essa',
    'pode ser aquele',
    'pode ser aquela',
    'e esse',
    'e essa',
    'e aquele',
    'e aquela',
    'esse ai',
    'essa ai',
    'esse aqui',
    'essa aqui',
    'esse mesmo sim',
    'essa mesma sim'
];


/**
 * =========================================================
 * ESTADOS
 * =========================================================
 */

const CONFIRMATION_STATES = [
    'confirming_order',
    'viewing_service',
    'service_request',
    'viewing_product'
];

const DENIAL_STATES = [
    'confirming_order',
    'viewing_service',
    'service_request',
    'viewing_product'
];

const REFERENCE_STATES = [
    'viewing_service',
    'service_request',
    'viewing_product',
    'waiting_product',
    'waiting_quantity',
    'cart_menu',
    'editing_cart',
    'editing_cart_item'
];


/**
 * =========================================================
 * ESTADOS ONDE UMA MENSAGEM PODE SER UM ITEM DIRETO
 * =========================================================
 */

const PRODUCT_SELECTION_STATES = [
    'viewing_menu',
    'product_menu',
    'waiting_product',
    'viewing_product',
    'waiting_quantity',
    'cart_menu',
    'editing_cart',
    'editing_cart_item',
    'idle'
];

const SERVICE_SELECTION_STATES = [
    'viewing_services',
    'viewing_service',
    'service_request',
    'idle'
];


/**
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 */

function normalizeForComparison(text) {

    return normalizeText(text)
        .replace(/\s+/g, ' ')
        .trim();

}


/**
 * =========================================================
 * AFIRMAÇÃO
 * =========================================================
 */

function isAffirmative(text) {

    const normalized =
        normalizeForComparison(text);

    return AFFIRMATIVE_WORDS.includes(
        normalized
    );

}


/**
 * =========================================================
 * NEGAÇÃO
 * =========================================================
 */

function isNegative(text) {

    const normalized =
        normalizeForComparison(text);

    return NEGATIVE_WORDS.includes(
        normalized
    );

}


/**
 * =========================================================
 * REFERÊNCIA / SELEÇÃO
 * =========================================================
 */

function isReferenceConfirmation(text) {

    const normalized =
        normalizeForComparison(text);

    return REFERENCE_CONFIRMATIONS.includes(
        normalized
    );

}


/**
 * =========================================================
 * NÚMEROS POR EXTENSO
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

    if (!normalized) {
        return null;
    }


    const numericOnly =
        normalized.match(/^\d+$/);

    if (numericOnly) {

        return Number(
            numericOnly[0]
        );

    }


    const digitMatch =
        normalized.match(
            /\b(\d+)\b/
        );

    if (digitMatch) {

        return Number(
            digitMatch[1]
        );

    }


    for (
        const [word, value]
        of Object.entries(NUMBER_WORDS)
    ) {

        const pattern =
            new RegExp(
                `\\b${word}\\b`
            );

        if (
            pattern.test(normalized)
        ) {

            return value;

        }

    }


    return null;
}


/**
 * =========================================================
 * POSIÇÃO DO PRODUTO
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
            new RegExp(
                `\\b${word}\\b`
            );

        if (
            pattern.test(normalized)
        ) {

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
 * REFERÊNCIA CONTEXTUAL
 * =========================================================
 */

function extractReference(text) {

    const normalized =
        normalizeForComparison(text);

    if (
        /\b(o mesmo|a mesma|esse mesmo|essa mesma|aquele mesmo|aquela mesma)\b/
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
 * AÇÃO DE ADICIONAR
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
            normalized.startsWith(
                `${phrase} `
            )
    );
}


/**
 * =========================================================
 * AÇÃO DE REMOVER
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
        'remove essa',
        'tira esse',
        'tira essa'
    ];

    return phrases.some(
        phrase =>
            normalized === phrase ||
            normalized.startsWith(
                `${phrase} `
            )
    );
}


/**
 * =========================================================
 * AÇÃO DE ALTERAR
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
        'substituir'
    ];

    return phrases.some(
        phrase =>
            normalized === phrase ||
            normalized.startsWith(
                `${phrase} `
            )
    );
}


/**
 * =========================================================
 * DETECTA SUBSTITUIÇÃO
 * =========================================================
 */

function isReplaceAction(text) {

    const normalized =
        normalizeForComparison(text);

    return (
        /\b(troca|trocar|substitui|substituir)\b/
            .test(normalized) &&
        /\bpor\b/.test(normalized)
    );
}


/**
 * =========================================================
 * DETECTA ALTERAÇÃO DE QUANTIDADE
 * =========================================================
 */

function isQuantityEditAction(
    text,
    state,
    quantity
) {

    const normalized =
        normalizeForComparison(text);

    if (!quantity) {
        return false;
    }


    if (
        state === 'editing_cart_item'
    ) {

        return true;

    }


    return (
        /\b(muda|mudar|altera|alterar|modifica|modificar)\b/
            .test(normalized) &&
        /\b(quantidade|qtd|unidades|unidade)\b/
            .test(normalized)
    );
}


/**
 * =========================================================
 * VOLTAR
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
 * LIMPA CANDIDATO
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
        'dispoe'
    ];


    for (
        const prefix
        of prefixes
    ) {

        if (
            value === prefix
        ) {

            return '';

        }


        if (
            value.startsWith(
                `${prefix} `
            )
        ) {

            value =
                value
                    .slice(prefix.length)
                    .trim();

            break;

        }
    }


    value =
        value.replace(
            /^(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|\d+)\s+/,
            ''
        );


    value =
        value
            .replace(/\s+esse$/i, '')
            .replace(/\s+essa$/i, '')
            .replace(/\s+aquele$/i, '')
            .replace(/\s+aquela$/i, '')
            .replace(/\s+esse mesmo$/i, '')
            .replace(/\s+essa mesma$/i, '')
            .trim();


    return value;
}


/**
 * =========================================================
 * EXTRAI CANDIDATO DE ITEM
 * =========================================================
 */

function extractItemCandidate(text) {

    const normalized =
        normalizeForComparison(text);

    if (!normalized) {
        return null;
    }


    const actionPatterns = [

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

        /^remove\s+/,
        /^remover\s+/,
        /^retira\s+/,
        /^retirar\s+/,
        /^tira\s+/,
        /^tirar\s+/,
        /^elimina\s+/,
        /^eliminar\s+/,
        /^nao quero\s+/,

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

        /^quanto custa\s+/,
        /^qual o preco\s+/,
        /^qual o valor\s+/,
        /^quanto e\s+/,

        /^tem\s+/,
        /^tens\s+/,
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
        cleanItemCandidate(
            normalized
        );


    candidate =
        candidate
            .replace(
                /^quanto custa\s+/i,
                ''
            )
            .replace(
                /^qual o preco\s+/i,
                ''
            )
            .replace(
                /^qual o valor\s+/i,
                ''
            )
            .replace(
                /^quanto e\s+/i,
                ''
            )
            .replace(
                /^tem\s+/i,
                ''
            )
            .replace(
                /^tens\s+/i,
                ''
            )
            .replace(
                /^voces tem\s+/i,
                ''
            )
            .replace(
                /^voce tem\s+/i,
                ''
            )
            .replace(
                /^dispoe de\s+/i,
                ''
            )
            .trim();


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
 * CANDIDATO DIRETO
 * =========================================================
 *
 * Quando o cliente responde apenas:
 *
 * "Coca"
 * "Fanta"
 * "Manutenção"
 *
 * o estado da conversa pode tornar essa mensagem
 * suficientemente clara para ser um candidato.
 * =========================================================
 */

function extractDirectItemCandidate(
    text,
    state
) {

    const normalized =
        normalizeForComparison(text);

    if (!normalized) {
        return null;
    }


    const allowedStates = [
        'viewing_menu',
        'product_menu',
        'waiting_product',
        'viewing_services',
        'viewing_service',
        'editing_cart_item'
    ];


    if (
        !allowedStates.includes(state)
    ) {

        return null;

    }


    if (
        normalized.length > 80
    ) {

        return null;

    }


    if (
        isAffirmative(normalized) ||
        isNegative(normalized) ||
        isBackAction(normalized)
    ) {

        return null;

    }


    if (
        /^\d+$/.test(normalized)
    ) {

        return null;

    }


    return normalized;
}


/**
 * =========================================================
 * CANDIDATO DE PRODUTO
 * =========================================================
 */

function extractProductCandidate(
    text,
    state
) {

    if (
        !PRODUCT_SELECTION_STATES.includes(state)
    ) {

        return null;

    }


    return (
        extractItemCandidate(text) ||
        extractDirectItemCandidate(text, state)
    );
}


/**
 * =========================================================
 * CANDIDATO DE SERVIÇO
 * =========================================================
 */

function extractServiceCandidate(
    text,
    state
) {

    if (
        !SERVICE_SELECTION_STATES.includes(state)
    ) {

        return null;

    }


    return (
        extractItemCandidate(text) ||
        extractDirectItemCandidate(text, state)
    );
}


/**
 * =========================================================
 * DETECTA ALVO
 * =========================================================
 */

function detectTarget({
    text,
    state,
    intent,
    productCandidate,
    serviceCandidate,
    context
}) {

    const normalized =
        normalizeForComparison(text);


    if (
        /\b(total|tudo|carrinho|pedido|pedidos|pagar|deu|fica tudo)\b/
            .test(normalized)
    ) {

        return 'cart';

    }


    if (
        productCandidate ||
        context?.currentProduct ||
        context?.lastProduct
    ) {

        return 'product';

    }


    if (
        serviceCandidate ||
        context?.service_id ||
        context?.service_name
    ) {

        return 'service';

    }


    if (
        state === 'confirming_order' ||
        intent === 'CONFIRM' ||
        intent === 'DENY'
    ) {

        return 'order';

    }


    return null;
}


/**
 * =========================================================
 * DETECTA COMPORTAMENTO
 * =========================================================
 */

function detectBehavior({
    text,
    state,
    intent,
    quantity,
    addAction,
    removeAction,
    editAction,
    backAction,
    productCandidate,
    serviceCandidate,
    reference,
    context
}) {

    const normalized =
        normalizeForComparison(text);


    /**
     * VOLTAR
     */

    if (backAction) {
        return 'go_back';
    }


    /**
     * CANCELAMENTO
     */

    if (
        intent === 'CANCEL' &&
        state !== 'confirming_order'
    ) {

        return 'cancel';

    }


    /**
     * CONFIRMAÇÃO
     */

    if (
        intent === 'CONFIRM'
    ) {

        if (
            state === 'confirming_order'
        ) {

            return 'confirm_order';

        }

        return 'confirm';
    }


    /**
     * NEGAÇÃO
     */

    if (
        intent === 'DENY'
    ) {

        if (
            state === 'confirming_order'
        ) {

            return 'cancel_order';

        }

        return 'deny';
    }


    /**
     * TOTAL DO CARRINHO
     */

    if (
        (
            intent === 'PRICE' ||
            /\b(quanto|total|deu|pagar|fica|valor)\b/
                .test(normalized)
        ) &&
        (
            /\b(total|tudo|carrinho|pedido|pagar|deu|fica tudo)\b/
                .test(normalized) ||
            state === 'cart_menu' ||
            state === 'confirming_order'
        ) &&
        !productCandidate
    ) {

        return 'ask_total';
    }


    /**
     * SUBSTITUIÇÃO
     */

    if (
        isReplaceAction(normalized)
    ) {

        return 'replace_product';
    }


    /**
     * REMOVER
     */

    if (
        removeAction
    ) {

        return 'remove_product';
    }


    /**
     * ALTERAR QUANTIDADE
     */

    if (
        isQuantityEditAction(
            normalized,
            state,
            quantity
        )
    ) {

        return 'change_quantity';
    }


    /**
     * ADICIONAR
     */

    if (
        addAction &&
        (
            productCandidate ||
            reference ||
            quantity
        )
    ) {

        return 'add_product';
    }


    /**
     * SELECIONAR PRODUTO
     */

    if (
        productCandidate &&
        (
            state === 'viewing_menu' ||
            state === 'waiting_product' ||
            state === 'viewing_product'
        )
    ) {

        return 'select_product';
    }


    /**
     * SELECIONAR SERVIÇO
     */

    if (
        serviceCandidate &&
        (
            state === 'viewing_services' ||
            state === 'viewing_service'
        )
    ) {

        return 'select_service';
    }


    /**
     * PEDIDO DE SERVIÇO
     */

    if (
        intent === 'SERVICE_REQUEST'
    ) {

        return 'request_service';
    }


    /**
     * PREÇO
     */

    if (
        intent === 'PRICE'
    ) {

        return 'ask_price';
    }


    /**
     * MENU
     */

    if (
        intent === 'MENU'
    ) {

        return 'show_menu';
    }


    /**
     * SERVIÇOS
     */

    if (
        intent === 'SERVICES'
    ) {

        return 'show_services';
    }


    /**
     * PEDIDO
     */

    if (
        intent === 'ORDER'
    ) {

        return 'start_order';
    }


    /**
     * LOCALIZAÇÃO
     */

    if (
        intent === 'LOCATION'
    ) {

        return 'show_location';
    }


    /**
     * HORÁRIO
     */

    if (
        intent === 'HOURS'
    ) {

        return 'show_hours';
    }


    /**
     * ATENDENTE
     */

    if (
        intent === 'ATTENDANT'
    ) {

        return 'human_support';
    }


    /**
     * AJUDA
     */

    if (
        intent === 'HELP'
    ) {

        return 'show_help';
    }


    /**
     * AGRADECIMENTO
     */

    if (
        intent === 'THANKS'
    ) {

        return 'respond_thanks';
    }


    /**
     * DESPEDIDA
     */

    if (
        intent === 'GOODBYE'
    ) {

        return 'goodbye';
    }


    return 'unknown';
}


/**
 * =========================================================
 * DETECTA AÇÕES COMPOSTAS
 * =========================================================
 *
 * Exemplo:
 *
 * "tira a coca e coloca duas fanta"
 *
 * O conhecimento identifica que existe mais de uma
 * operação na mesma mensagem.
 *
 * A resolução concreta dos produtos continua sendo feita
 * pelo productService / botEngine.
 * =========================================================
 */

function detectCompoundActions(text) {

    const normalized =
        normalizeForComparison(text);


    const actions = [];


    if (
        /\b(remove|remover|retira|retirar|tira|tirar|elimina|eliminar)\b/
            .test(normalized)
    ) {

        actions.push({
            type: 'remove_product'
        });

    }


    if (
        /\b(adiciona|adicionar|acrescenta|acrescentar|coloca|colocar|manda|quero)\b/
            .test(normalized)
    ) {

        actions.push({
            type: 'add_product'
        });

    }


    if (
        /\b(troca|trocar|substitui|substituir)\b/
            .test(normalized) &&
        /\bpor\b/
            .test(normalized)
    ) {

        return [
            {
                type: 'replace_product'
            }
        ];

    }


    return actions;
}


/**
 * =========================================================
 * EXTRAI PRODUTO ANTIGO E PRODUTO DE SUBSTITUIÇÃO
 * =========================================================
 *
 * Não resolve no banco.
 *
 * Apenas separa linguisticamente os candidatos.
 * =========================================================
 */

function extractReplacementCandidates(text) {

    const normalized =
        normalizeForComparison(text);


    const match =
        normalized.match(
            /(?:troca|trocar|substitui|substituir)\s+(.+?)\s+por\s+(.+)$/i
        );


    if (!match) {

        return {
            targetProductCandidate: null,
            replacementCandidate: null
        };

    }


    const target =
        cleanItemCandidate(
            match[1]
        );


    const replacement =
        cleanItemCandidate(
            match[2]
        );


    return {
        targetProductCandidate:
            target || null,

        replacementCandidate:
            replacement || null
    };
}


/**
 * =========================================================
 * RESOLUÇÃO CONTEXTUAL DA INTENÇÃO
 * =========================================================
 */

function resolveContextualIntent({
    detected,
    message,
    state,
    context
}) {

    const detectedIntent =
        String(
            detected?.intent || 'unknown'
        ).toUpperCase();


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
     * CONFIRMAÇÃO CONTEXTUAL
     * -----------------------------------------------------
     *
     * Confirmação deve poder vencer uma classificação
     * genérica quando o estado exige uma resposta binária.
     */

    if (
        CONFIRMATION_STATES.includes(state) &&
        isAffirmative(text)
    ) {

        return {
            intent: 'CONFIRM',
            confidence: 0.98,
            source: 'context'
        };

    }


    /**
     * -----------------------------------------------------
     * NEGAÇÃO CONTEXTUAL
     * -----------------------------------------------------
     */

    if (
        DENIAL_STATES.includes(state) &&
        isNegative(text)
    ) {

        return {
            intent: 'DENY',
            confidence: 0.98,
            source: 'context'
        };

    }


    /**
     * -----------------------------------------------------
     * REFERÊNCIA COMO CONFIRMAÇÃO
     * -----------------------------------------------------
     */

    if (
        REFERENCE_STATES.includes(state) &&
        isReferenceConfirmation(text)
    ) {

        return {
            intent: 'CONFIRM',
            confidence: 0.95,
            source: 'context'
        };

    }


    /**
     * -----------------------------------------------------
     * CONFIRMAÇÃO EXPLÍCITA
     * -----------------------------------------------------
     */

    if (
        context?.awaitingConfirmation === true
    ) {

        if (
            isAffirmative(text)
        ) {

            return {
                intent: 'CONFIRM',
                confidence: 0.99,
                source: 'context'
            };

        }


        if (
            isNegative(text)
        ) {

            return {
                intent: 'DENY',
                confidence: 0.99,
                source: 'context'
            };

        }

    }


    /**
     * -----------------------------------------------------
     * INTENÇÃO EXPLÍCITA
     * -----------------------------------------------------
     *
     * Mantemos a intenção detectada para compatibilidade,
     * mas agora o comportamento será refinado posteriormente.
     */

    if (
        detectedIntent !== 'UNKNOWN'
    ) {

        return {
            intent: detectedIntent,
            confidence:
                detected.confidence ?? 1,
            source: 'explicit'
        };

    }


    /**
     * -----------------------------------------------------
     * UNKNOWN
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


    const replaceAction =
        isReplaceAction(
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


    const replacementCandidates =
        extractReplacementCandidates(
            normalizedMessage
        );


    const compoundActions =
        detectCompoundActions(
            normalizedMessage
        );


    const behavior =
        detectBehavior({
            text: normalizedMessage,

            state,

            intent:
                resolved.intent,

            quantity,

            addAction,

            removeAction,

            editAction,

            backAction,

            productCandidate,

            serviceCandidate,

            reference,

            context
        });


    const target =
        detectTarget({
            text: normalizedMessage,

            state,

            intent:
                resolved.intent,

            productCandidate,

            serviceCandidate,

            context
        });


    const situation =
        getSituation(
            resolved.intent.toLowerCase(),
            state
        );


    /**
     * A situação continua vindo da arquitetura existente.
     *
     * O behavior estruturado acima representa a interpretação
     * mais específica da mensagem.
     *
     * Assim preservamos compatibilidade com situations.js
     * e behaviors.js.
     */

    const configuredBehavior =
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

        /**
         * Behavior configurado pela situação existente.
         */
        behavior:
            situation.behavior,

        behaviorConfig:
            configuredBehavior,

        /**
         * Behavior interpretado diretamente da mensagem.
         *
         * Este campo é a nova camada de inteligência.
         */
        interpretedBehavior:
            behavior,

        target,

        state,

        context,

        actions:
            compoundActions,

        entities: {

            quantity,

            addAction,

            removeAction,

            editAction,

            replaceAction,

            backAction,

            productCandidate,

            serviceCandidate,

            productPosition,

            reference,

            targetProductCandidate:
                replacementCandidates
                    .targetProductCandidate,

            replacementCandidate:
                replacementCandidates
                    .replacementCandidate
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

    isBackAction,

    isReplaceAction,

    extractQuantity,

    extractProductPosition,

    extractReference,

    extractProductCandidate,

    extractServiceCandidate,

    detectTarget,

    detectBehavior,

    detectCompoundActions,

    extractReplacementCandidates
};