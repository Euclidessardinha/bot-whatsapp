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
 * Centro de InteligÃªncia Conversacional.
 *
 * Responsabilidades:
 *
 * 1. Normalizar a mensagem
 * 2. Detectar intenÃ§Ã£o inicial
 * 3. Interpretar a mensagem dentro do contexto
 * 4. Extrair entidades
 * 5. Identificar aÃ§Ãµes
 * 6. Identificar alvo da aÃ§Ã£o
 * 7. Identificar comportamento esperado
 * 8. Determinar situaÃ§Ã£o conversacional
 *
 * IMPORTANTE:
 *
 * O intentService fornece uma intenÃ§Ã£o inicial.
 * Essa intenÃ§Ã£o Ã© uma evidÃªncia, nÃ£o uma verdade absoluta.
 *
 * O contexto da conversa pode determinar o comportamento
 * real que o cliente pretende executar.
 *
 * O Knowledge Engine NÃƒO resolve produtos ou serviÃ§os
 * diretamente no banco.
 *
 * Ele produz candidatos linguÃ­sticos.
 *
 * A resoluÃ§Ã£o concreta continua sendo responsabilidade de:
 *
 * productService
 * serviceService
 * botEngine
 *
 * Isso preserva o isolamento multi-tenant.
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
 * REFERÃŠNCIAS / SELEÃ‡Ã•ES
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
 * ESTADOS DE SELEÃ‡ÃƒO DE PRODUTO
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


/**
 * =========================================================
 * ESTADOS DE SELEÃ‡ÃƒO DE SERVIÃ‡O
 * =========================================================
 */

const SERVICE_SELECTION_STATES = [
    'viewing_services',
    'viewing_service',
    'service_request',
    'idle'
];


/**
 * =========================================================
 * NORMALIZAÃ‡ÃƒO
 * =========================================================
 */

function normalizeForComparison(text) {

    return normalizeText(text)
        .replace(/\s+/g, ' ')
        .trim();

}


/**
 * =========================================================
 * AFIRMAÃ‡ÃƒO
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
 * NEGAÃ‡ÃƒO
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
 * REFERÃŠNCIA / SELEÃ‡ÃƒO
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
 * NÃšMEROS POR EXTENSO
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


    /**
     * Mensagem composta apenas por nÃºmero.
     */
    const numericOnly =
        normalized.match(/^\d+$/);

    if (numericOnly) {

        return Number(
            numericOnly[0]
        );

    }


    /**
     * NÃºmero em algarismos.
     */
    const digitMatch =
        normalized.match(
            /\b(\d+)\b/
        );

    if (digitMatch) {

        return Number(
            digitMatch[1]
        );

    }


    /**
     * NÃºmero por extenso.
     */
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
 * POSIÃ‡ÃƒO DO PRODUTO
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
        quinta: 5,

        sexto: 6,
        sexta: 6,

        setimo: 7,
        setima: 7,

        oitavo: 8,
        oitava: 8,

        nono: 9,
        nona: 9,

        decimo: 10,
        decima: 10
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
 * REFERÃŠNCIA CONTEXTUAL
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
 * AÃ‡ÃƒO DE ADICIONAR
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
        'pode colocar',

        'quero pedir',

        'peÃ§o',
        'peco',

        'pede',
        'pedir'
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
 * AÃ‡ÃƒO DE REMOVER
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

        'quero remover',
        'quero tirar',
        'quero eliminar',

        'pode remover',
        'pode tirar',
        'pode eliminar',

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
 * AÃ‡ÃƒO DE ALTERAR
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
 * AÃ‡ÃƒO DE ALTERAR QUANTIDADE
 * =========================================================
 */

function isQuantityEditAction(
    text,
    state,
    quantity
) {

    const normalized =
        normalizeForComparison(text);

    if (quantity === null) {
        return false;
    }

    /**
     * Se o fluxo jÃ¡ estÃ¡ perguntando a quantidade,
     * qualquer quantidade vÃ¡lida pode ser a resposta.
     *
     * Ex:
     * Bot: Quantas unidades?
     * Cliente: 3
     */
    if (
        state === 'editing_cart_item' ||
        state === 'waiting_quantity'
    ) {

        return true;
    }

    /**
     * AlteraÃ§Ã£o explÃ­cita.
     */
   if (
    /\b(muda|mudar|altera|alterar|modifica|modificar|troca|trocar)\b/
        .test(normalized)
) {

    return true;
}

    /**
     * Aumentar / diminuir.
     */
    if (
        /\b(aumenta|aumentar|reduz|reduzir|diminui|diminuir)\b/
            .test(normalized)
    ) {

        return true;
    }


    /**
     * "muda para 3"
     * "altera para 4"
     * "passa para 5"
     * "fica com 2"
     * "fica em 3"
     * "fica 3"
     */
    if (
    /\b(fica|passa|muda|altera|modifica)\b/.test(normalized) &&
    /\b(para|em|com|a)?\s*\d+\b/.test(normalized)
) {

    return true;
}

    /**
     * NÃºmero + contexto de alteraÃ§Ã£o.
     *
     * "quero ficar com 3"
     * "quero 3 unidades"
     *
     * SÃ³ vale em estados de ediÃ§Ã£o.
     */
    if (
        (
            state === 'editing_cart' ||
            state === 'editing_cart_item'
        ) &&
        (
            /\bquero\b/.test(normalized) ||
            /\bficar com\b/.test(normalized)
        )
    ) {

        return true;
    }

    return false;
}
/**
 * =========================================================
 * DETECTA SUBSTITUIÃ‡ÃƒO
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

        'atras',

        'cancelar',
        'sair'
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

    if (!value) {
        return '';
    }


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

        'peÃ§o',
        'peco',

        'pedir',

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
        'dispoe',

        'quero solicitar',
        'solicita',
        'solicitar',

        'preciso de',
        'gostaria de',
        'gostaria do',
        'gostaria da',

        'preciso de',
        'preciso do',
        'preciso da',

        'quero um servico',
        'quero uma servico',
        'quero servico',

        'solicito',
        'solicita',

        'pedido de',
        'pedido para',

        'orcamento de',
        'orcamento para',

        'servico de',
        'servico para'
    ];


    /**
     * Remove o prefixo mais especÃ­fico primeiro.
     */
    prefixes.sort(
        (a, b) =>
            b.length - a.length
    );


    let prefixRemoved = true;

    while (prefixRemoved) {
        prefixRemoved = false;

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

                prefixRemoved = true;
                break;

            }

        }
    }


    /**
     * Remove quantidade inicial.
     */
    value =
        value.replace(
            /^(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|\d+)\s+/,
            ''
        );


    /**
     * Remove artigos.
     */
    value =
        value.replace(
            /^(o|a|os|as)\s+/,
            ''
        );


    /**
     * Remove referÃªncias no final.
     */
    value =
        value
            .replace(/\s+esse mesmo$/i, '')
            .replace(/\s+essa mesma$/i, '')
            .replace(/\s+aquele mesmo$/i, '')
            .replace(/\s+aquela mesma$/i, '')
            .replace(/\s+esse$/i, '')
            .replace(/\s+essa$/i, '')
            .replace(/\s+aquele$/i, '')
            .replace(/\s+aquela$/i, '')
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

        /^peÃ§o\s+/,
        /^peco\s+/,
        /^pedir\s+/,

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
        /^dispoe\s+/,

        /^quero solicitar\s+/,
        /^solicita\s+/,
        /^solicitar\s+/,

        /^preciso de\s+/
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


    /**
     * Limpeza adicional de perguntas.
     */
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
            .replace(
                /^quero solicitar\s+/i,
                ''
            )
            .replace(
                /^solicita\s+/i,
                ''
            )
            .replace(
                /^solicitar\s+/i,
                ''
            )
            .replace(
                /^preciso de\s+/i,
                ''
            )

                        .replace(
                /^gostaria de\s+/i,
                ''
            )
            .replace(
                /^gostaria do\s+/i,
                ''
            )
            .replace(
                /^gostaria da\s+/i,
                ''
            )
            .replace(
                /^preciso do\s+/i,
                ''
            )
            .replace(
                /^preciso da\s+/i,
                ''
            )
            .replace(
                /^solicito\s+/i,
                ''
            )
            .replace(
                /^pedido de\s+/i,
                ''
            )
            .replace(
                /^pedido para\s+/i,
                ''
            )
            .replace(
                /^orcamento de\s+/i,
                ''
            )
            .replace(
                /^orcamento para\s+/i,
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
 * "ManutenÃ§Ã£o"
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
        'viewing_product',

        'viewing_services',
        'viewing_service',

        'editing_cart_item',
        'waiting_quantity'
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


    /**
     * NÃ£o tratar apenas nÃºmeros como produto/serviÃ§o.
     */
    if (
        /^\d+$/.test(normalized)
    ) {

        return null;

    }


    /**
     * NÃ£o transformar perguntas genÃ©ricas em candidatos.
     */
    if (
        /^(quanto|qual|onde|como|quando|tem|tens|voces|voce)\b/
            .test(normalized)
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
        extractDirectItemCandidate(
            text,
            state
        )
    );
}


/**
 * =========================================================
 * CANDIDATO DE SERVIÃ‡O
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


    const normalized =
        normalizeForComparison(text);

    if (!normalized) {
        return null;
    }


    /**
     * Primeiro tentamos interpretar pedidos explÃ­citos
     * de serviÃ§o.
     */
    const serviceRequestPatterns = [

        /^quero solicitar\s+/,

        /^quero um servico\s+/,

        /^quero servico\s+/,

        /^preciso de\s+/,

        /^preciso do\s+/,

        /^preciso da\s+/,

        /^gostaria de\s+/,

        /^gostaria do\s+/,

        /^gostaria da\s+/,

        /^solicito\s+/,

        /^solicita\s+/,

        /^solicitar\s+/,

        /^pedido de\s+/,

        /^pedido para\s+/,

        /^orcamento de\s+/,

        /^orcamento para\s+/
    ];


    const isServiceRequest =
        serviceRequestPatterns.some(
            pattern =>
                pattern.test(normalized)
        );


    if (isServiceRequest) {

        let candidate =
            cleanItemCandidate(
                normalized
            );

        candidate =
            candidate
                .replace(
                    /^quero solicitar\s+/i,
                    ''
                )
                .replace(
                    /^quero um servico\s+/i,
                    ''
                )
                .replace(
                    /^quero servico\s+/i,
                    ''
                )
                .replace(
                    /^preciso de\s+/i,
                    ''
                )
                .replace(
                    /^preciso do\s+/i,
                    ''
                )
                .replace(
                    /^preciso da\s+/i,
                    ''
                )
                .replace(
                    /^gostaria de\s+/i,
                    ''
                )
                .replace(
                    /^gostaria do\s+/i,
                    ''
                )
                .replace(
                    /^gostaria da\s+/i,
                    ''
                )
                .replace(
                    /^solicito\s+/i,
                    ''
                )
                .replace(
                    /^solicita\s+/i,
                    ''
                )
                .replace(
                    /^solicitar\s+/i,
                    ''
                )
                .replace(
                    /^pedido de\s+/i,
                    ''
                )
                .replace(
                    /^pedido para\s+/i,
                    ''
                )
                .replace(
                    /^orcamento de\s+/i,
                    ''
                )
                .replace(
                    /^orcamento para\s+/i,
                    ''
                )
                .trim();


        if (candidate) {
            return candidate;
        }

    }


    /**
     * Depois usamos a lÃ³gica genÃ©rica.
     */
    return (
        extractItemCandidate(text) ||
        extractDirectItemCandidate(
            text,
            state
        )
    );
}


/**
 * =========================================================
 * EXTRAI ALVO DE QUANTIDADE
 * =========================================================
 *
 * Ajuda a distinguir:
 *
 * "quero 3"
 *
 * de:
 *
 * "muda para 3"
 *
 * sem resolver o produto.
 * =========================================================
 */

function extractQuantityTarget(text) {

    const normalized =
        normalizeForComparison(text);

    if (!normalized) {
        return null;
    }


    if (
        /\b(quantidade|qtd|unidade|unidades)\b/
            .test(normalized)
    ) {

        return 'quantity';

    }


    if (
        /\b(aumenta|aumentar|reduz|reduzir|diminui|diminuir)\b/
            .test(normalized)
    ) {

        return 'quantity';

    }


    if (
        /\b(fica|passa)\b/.test(normalized) &&
        /\b(para|a)?\s*\d+\b/.test(normalized)
    ) {

        return 'quantity';

    }


    return null;
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


    /**
     * Carrinho / pedido.
     */
    if (
        /\b(total|tudo|carrinho|pedido|pedidos|pagar|deu|fica tudo)\b/
            .test(normalized)
    ) {

        return 'cart';

    }

        /**
     * ServiÃ§o.
     */
    if (
        serviceCandidate ||
        context?.service_id ||
        context?.serviceId ||
        context?.service_name ||
        state === 'viewing_services' ||
        state === 'viewing_service' ||
        state === 'service_request'
    ) {

        return 'service';

    }


    /**
     * Produto.
     */
    if (
        productCandidate ||
        context?.currentProduct ||
        context?.lastProduct ||
        context?.product_id ||
        context?.productId
    ) {

        return 'product';

    }


    /**
     * Produto.
     */
    if (
        productCandidate ||
        context?.currentProduct ||
        context?.lastProduct ||
        context?.product_id ||
        context?.productId
    ) {

        return 'product';

    }


    /**
     * ServiÃ§o.
     */
    if (
        serviceCandidate ||
        context?.service_id ||
        context?.serviceId ||
        context?.service_name
    ) {

        return 'service';

    }


    /**
     * Quantidade.
     */
    if (
        extractQuantityTarget(normalized)
    ) {

        return 'quantity';

    }


    /**
     * Pedido em confirmaÃ§Ã£o.
     */
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
     * =====================================================
     * VOLTAR
     * =====================================================
     */

    if (backAction) {
        return 'go_back';
    }


    /**
     * =====================================================
     * CANCELAMENTO
     * =====================================================
     */

    if (
        intent === 'CANCEL' &&
        state !== 'confirming_order'
    ) {

        return 'cancel';

    }


    /**
     * =====================================================
     * CONFIRMAÃ‡ÃƒO
     * =====================================================
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
     * =====================================================
     * NEGAÃ‡ÃƒO
     * =====================================================
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
     * =====================================================
     * TOTAL DO CARRINHO
     * =====================================================
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
     * =====================================================
     * SUBSTITUIÃ‡ÃƒO
     * =====================================================
     */

    if (
        isReplaceAction(normalized)
    ) {

        return 'replace_product';
    }


    /**
     * =====================================================
     * REMOVER
     * =====================================================
     */

    if (
        removeAction
    ) {

        return 'remove_product';
    }


    /**
     * =====================================================
     * ALTERAR QUANTIDADE
     * =====================================================
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
     * =====================================================
     * PEDIDO / SELEÃ‡ÃƒO DE SERVIÃ‡O
     * =====================================================
     *
     * ServiÃ§os tÃªm prioridade quando estamos dentro
     * do fluxo de serviÃ§os.
     */

    if (
        serviceCandidate &&
        (
            state === 'viewing_services' ||
            state === 'viewing_service' ||
            state === 'service_request'
        )
    ) {

        return 'select_service';
    }


    /**
     * =====================================================
     * PEDIDO DE SERVIÃ‡O
     * =====================================================
     */

    if (
        intent === 'SERVICE_REQUEST'
    ) {

        return 'request_service';
    }


    /**
     * =====================================================
     * ADICIONAR PRODUTO
     * =====================================================
     */

    if (
        addAction &&
        (
            productCandidate ||
            (
                reference &&
                !serviceCandidate
            ) ||
            (
                quantity &&
                !serviceCandidate
            )
        )
    ) {

        return 'add_product';
    }
    /**
     * =====================================================
     * SELECIONAR PRODUTO
     * =====================================================
     */

    if (
        productCandidate &&
        (
            state === 'viewing_menu' ||
            state === 'product_menu' ||
            state === 'waiting_product' ||
            state === 'viewing_product'
        )
    ) {

        return 'select_product';
    }


    /**
     * =====================================================
     * SELECIONAR SERVIÃ‡O
     * =====================================================
     */

    if (
        serviceCandidate &&
        (
            state === 'viewing_services' ||
            state === 'viewing_service' ||
            state === 'service_request'
        )
    ) {

        return 'select_service';
    }


    /**
     * =====================================================
     * PEDIDO DE SERVIÃ‡O
     * =====================================================
     */

    if (
        intent === 'SERVICE_REQUEST'
    ) {

        return 'request_service';
    }


    /**
     * =====================================================
     * PREÃ‡O
     * ===================================================== */

    if (
        intent === 'PRICE'
    ) {

        return 'ask_price';
    }


    /**
     * =====================================================
     * MENU
     * ===================================================== */

    if (
        intent === 'MENU'
    ) {

        return 'show_menu';
    }


    /**
     * =====================================================
     * SERVIÃ‡OS
     * ===================================================== */

    if (
        intent === 'SERVICES'
    ) {

        return 'show_services';
    }


    /**
     * =====================================================
     * PEDIDO
     * ===================================================== */

    if (
        intent === 'ORDER'
    ) {

        return 'start_order';
    }


    /**
     * =====================================================
     * LOCALIZAÃ‡ÃƒO
     * ===================================================== */

    if (
        intent === 'LOCATION'
    ) {

        return 'show_location';
    }


    /**
     * =====================================================
     * HORÃRIO
     * ===================================================== */

    if (
        intent === 'HOURS'
    ) {

        return 'show_hours';
    }


    /**
     * =====================================================
     * ATENDENTE
     * ===================================================== */

    if (
        intent === 'ATTENDANT'
    ) {

        return 'human_support';
    }


    /**
     * =====================================================
     * AJUDA
     * ===================================================== */

    if (
        intent === 'HELP'
    ) {

        return 'show_help';
    }


    /**
     * =====================================================
     * AGRADECIMENTO
     * ===================================================== */

    if (
        intent === 'THANKS'
    ) {

        return 'respond_thanks';
    }


    /**
     * =====================================================
     * DESPEDIDA
     * ===================================================== */

    if (
        intent === 'GOODBYE'
    ) {

        return 'goodbye';
    }


    return 'unknown';
}


/**
 * =========================================================
 * DETECTA AÃ‡Ã•ES COMPOSTAS
 * =========================================================
 *
 * Exemplos:
 *
 * "tira a coca e coloca duas fanta"
 *
 * "remove a coca e adiciona duas fanta"
 *
 * "troca a coca por fanta"
 *
 * Nesta camada apenas identificamos a estrutura.
 *
 * A resoluÃ§Ã£o dos produtos continua no productService.
 * =========================================================
 */

function detectCompoundActions(text) {

    const normalized =
        normalizeForComparison(text);

    const actions = [];


    /**
     * -----------------------------------------------------
     * SUBSTITUIÃ‡ÃƒO
     * -----------------------------------------------------
     */

    if (
        isReplaceAction(normalized)
    ) {

        const replacement =
            extractReplacementCandidates(
                normalized
            );

        return [
            {
                type: 'replace_product',

                targetProductCandidate:
                    replacement.targetProductCandidate,

                replacementCandidate:
                    replacement.replacementCandidate,

                quantity:
                    extractQuantity(
                        normalized
                    )
            }
        ];

    }


    /**
     * -----------------------------------------------------
     * REMOÃ‡ÃƒO
     * -----------------------------------------------------
     */

    const removeMatch =
        normalized.match(
            /\b(remove|remover|retira|retirar|tira|tirar|elimina|eliminar)\s+(.+?)(?=\s+e\s+|\s+mas\s+|\s*,\s*|$)/i
        );


    if (removeMatch) {

        const candidate =
            cleanItemCandidate(
                removeMatch[2]
            );


        actions.push({
            type: 'remove_product',

            candidate:
                candidate || null
        });

    }


    /**
     * -----------------------------------------------------
     * ADIÃ‡ÃƒO
     * -----------------------------------------------------
     */

    const addMatch =
        normalized.match(
            /\b(adiciona|adicionar|acrescenta|acrescentar|coloca|colocar|manda|mandar|quero|vou querer)\s+(.+)$/i
        );


    if (addMatch) {

        let candidateText =
            addMatch[2];


        /**
         * Se houver uma parte anterior Ã  adiÃ§Ã£o,
         * tenta retirar conectores.
         */
        candidateText =
            candidateText
                .replace(
                    /^(tambem|tambÃ©m)\s+/,
                    ''
                )
                .trim();


        const candidate =
            cleanItemCandidate(
                candidateText
            );


        if (candidate) {

            actions.push({
                type: 'add_product',

                candidate,

                quantity:
                    extractQuantity(
                        candidateText
                    )
            });

        }

    }


    return actions;
}


/**
 * =========================================================
 * EXTRAI PRODUTO ANTIGO E PRODUTO DE SUBSTITUIÃ‡ÃƒO
 * =========================================================
 *
 * NÃ£o resolve no banco.
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
 * RESOLUÃ‡ÃƒO CONTEXTUAL DA INTENÃ‡ÃƒO
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
     * =====================================================
     * CONFIRMAÃ‡ÃƒO CONTEXTUAL
     * =====================================================
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
     * =====================================================
     * NEGAÃ‡ÃƒO CONTEXTUAL
     * =====================================================
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
     * =====================================================
     * REFERÃŠNCIA COMO CONFIRMAÃ‡ÃƒO
     * =====================================================
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
     * =====================================================
     * CONFIRMAÃ‡ÃƒO EXPLÃCITA
     * =====================================================
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
     * =====================================================
     * REFERÃŠNCIA COM CONTEXTO
     * =====================================================
     *
     * Quando o cliente responde apenas "esse",
     * "essa", etc., o contexto pode ser mais importante
     * do que uma intenÃ§Ã£o genÃ©rica.
     */

    if (
        isReferenceConfirmation(text) &&
        (
            context?.currentProduct ||
            context?.lastProduct ||
            context?.currentService ||
            context?.lastService
        )
    ) {

        return {
            intent: 'CONFIRM',
            confidence: 0.96,
            source: 'context'
        };

    }


    /**
     * =====================================================
     * INTENÃ‡ÃƒO EXPLÃCITA
     * =====================================================
     */

    if (
        detectedIntent !== 'UNKNOWN'
    ) {

        return {
            intent: detectedIntent,

            confidence:
                detected?.confidence ?? 1,

            source: 'explicit'
        };

    }


    /**
     * =====================================================
     * UNKNOWN
     * =====================================================
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


    /**
     * =====================================================
     * ENTIDADES
     * =====================================================
     */

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


    /**
     * =====================================================
     * AÃ‡Ã•ES COMPOSTAS
     * =====================================================
     */

    const compoundActions =
        detectCompoundActions(
            normalizedMessage
        );


    /**
     * =====================================================
     * COMPORTAMENTO INTERPRETADO
     * =====================================================
     */

    const behavior =
        detectBehavior({

            text:
                normalizedMessage,

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


    /**
     * =====================================================
     * ALVO
     * =====================================================
     */

    const target =
        detectTarget({

            text:
                normalizedMessage,

            state,

            intent:
                resolved.intent,

            productCandidate,

            serviceCandidate,

            context
        });


    /**
     * =====================================================
     * SITUAÃ‡ÃƒO
     * =====================================================
     */

    const situation =
        getSituation(

            resolved.intent.toLowerCase(),

            state
        );


    /**
     * =====================================================
     * BEHAVIOR CONFIGURADO
     * =====================================================
     *
     * Mantemos a arquitetura antiga intacta.
     */

    const configuredBehavior =
        getBehavior(
            situation.behavior
        );


    /**
     * =====================================================
     * RETORNO
     * =====================================================
     */

    return {

        message,

        normalizedText:
            detected.normalizedText ||
            detected.text ||
            normalizeText(message),


        /**
         * IntenÃ§Ã£o final.
         */
        intent:
            resolved.intent,


        confidence:
            resolved.confidence,


        intentSource:
            resolved.source,


        /**
         * IntenÃ§Ã£o originalmente detectada.
         */
        detectedIntent:
            detected.intent,


        /**
         * SituaÃ§Ã£o conversacional.
         */
        situation:
            situation.key,


        /**
         * Behavior da arquitetura existente.
         *
         * NÃƒO remover.
         */
        behavior:
            situation.behavior,


        behaviorConfig:
            configuredBehavior,


        /**
         * =================================================
         * NOVA CAMADA DE INTELIGÃŠNCIA
         * =================================================
         *
         * Este Ã© o comportamento mais especÃ­fico
         * interpretado da mensagem.
         */
        interpretedBehavior:
            behavior,


        /**
         * Alvo principal.
         */
        target,


        /**
         * Estado recebido.
         */
        state,


        /**
         * Contexto recebido.
         */
        context,


        /**
         * =================================================
         * AÃ‡Ã•ES ESTRUTURADAS
         * =================================================
         *
         * Agora actions nÃ£o sÃ£o apenas:
         *
         * { type: 'add_product' }
         *
         * Quando possÃ­vel, tambÃ©m carregam os candidatos
         * e a quantidade.
         */
        actions:
            compoundActions,


        /**
         * =================================================
         * ENTIDADES
         * =================================================
         */

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
                    .replacementCandidate,

            quantityTarget:
                extractQuantityTarget(
                    normalizedMessage
                )
        }

    };
}


/**
 * =========================================================
 * EXPORTAÃ‡Ã•ES
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

    isQuantityEditAction,

    isBackAction,

    isReplaceAction,

    extractQuantity,

    extractProductPosition,

    extractReference,

    extractProductCandidate,

    extractServiceCandidate,

    extractQuantityTarget,

    detectTarget,

    detectBehavior,

    detectCompoundActions,

    extractReplacementCandidates,

    cleanItemCandidate
};
