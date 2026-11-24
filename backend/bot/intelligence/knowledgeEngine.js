
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
 *
 * O Knowledge Engine NÃO resolve produtos ou serviços
 * diretamente no banco.
 *
 * Ele produz candidatos linguísticos.
 *
 * A resolução concreta continua sendo responsabilidade de:
 *
 * productService
 * serviceService
 * botEngine
 *
 * Isso preserva o isolamento multi-tenant.
 *
 * =========================================================
 * REGRA IMPORTANTE
 * =========================================================
 *
 * O Knowledge Engine interpreta.
 *
 * Ele NÃO deve inventar:
 *
 * - produtos
 * - serviços
 * - empresas
 * - preços
 * - quantidades não mencionadas
 * - respostas genéricas de fallback
 *
 * Quando a mensagem não puder ser interpretada com
 * confiança suficiente, o comportamento pode terminar
 * em "unknown".
 *
 * A camada superior decide então se deve permanecer
 * em silêncio.
 *
 * =========================================================
 * MENSAGENS COMPOSTAS
 * =========================================================
 *
 * Exemplo:
 *
 * "Quero chicken e batata"
 *
 * =>
 *
 * [
 *   {
 *      type: 'add_product',
 *      candidate: 'chicken',
 *      quantity: null
 *   },
 *   {
 *      type: 'add_product',
 *      candidate: 'batata',
 *      quantity: null
 *   }
 * ]
 *
 * Outro exemplo:
 *
 * "Quero 2 chicken e 3 batatas"
 *
 * =>
 *
 * [
 *   {
 *      type: 'add_product',
 *      candidate: 'chicken',
 *      quantity: 2
 *   },
 *   {
 *      type: 'add_product',
 *      candidate: 'batatas',
 *      quantity: 3
 *   }
 * ]
 *
 * Nenhum produto é hardcoded aqui.
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
 * ESTADOS DE SELEÇÃO DE PRODUTO
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
 * ESTADOS DE SELEÇÃO DE SERVIÇO
 * =========================================================
 */

const SERVICE_SELECTION_STATES = [
    'viewing_services',
    'viewing_service',
    'service_request'
];


/**
 * =========================================================
 * PREFIXOS CONVERSACIONAIS
 * =========================================================
 *
 * Estes prefixos são importantes porque clientes escrevem
 * naturalmente:
 *
 * "Bom dia, queria chicken"
 * "Olá, queria 2 chicken"
 * "Boa tarde, gostaria de uma pizza"
 *
 * O cumprimento não deve destruir a intenção seguinte.
 * =========================================================
 */

const GREETING_PREFIXES = [
    'oi',
    'oie',
    'ola',
    'olá',
    'bom dia',
    'boa tarde',
    'boa noite'
];

const SOCIAL_GREETING_PREFIXES = [
    'pessoal',
    'amigo',
    'amiga',
    'chefe',
    'malta',
    'gente'
];

const SOCIAL_GREETING_QUESTIONS = [
    'tudo bem',
    'tudo bom',
    'como vai',
    'como vais',
    'como está',
    'como estás'
];

/**
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 */

function normalizeForComparison(text) {

    return normalizeText(text || '')
        .replace(/\s+/g, ' ')
        .trim();

}



function escapeRegExp(value) {
    return String(value || '')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


/**
 * =========================================================
 * DETECÇÃO FLEXÍVEL DE SAUDAÇÕES
 * =========================================================
 *
 * A ideia aqui NÃO é cadastrar todas as frases possíveis.
 *
 * Reconhecemos famílias:
 *
 * oi
 * oii
 * oiii
 * oie
 * oiee
 *
 * ola
 * olá
 * olaaa
 * olááá
 *
 * bom dia
 * bom diaaa
 *
 * boa tarde
 * boa tardeee
 *
 * boa noite
 * boa noiteeee
 *
 * =========================================================
 */

function getGreetingPatterns() {

    return [

        // OI
        /^oi+(?=\s|[,;:!?-]|$)/i,

        // OIE
        /^oie+(?=\s|[,;:!?-]|$)/i,

        // OLA / OLÁ
        /^ola+(?=\s|[,;:!?-]|$)/i,

        // BOM DIA
        /^bom\s+dia+(?=\s|[,;:!?-]|$)/i,

        // BOA TARDE
        /^boa\s+tarde+(?=\s|[,;:!?-]|$)/i,

        // BOA NOITE
        /^boa\s+noite+(?=\s|[,;:!?-]|$)/i
    ];
}


/**
 * Detecta se existe uma saudação no início.
 *
 * Retorna:
 *
 * {
 *   greeting: "...",
 *   remaining: "..."
 * }
 *
 * ou null.
 */
function detectLeadingGreeting(text) {

    const value =
        normalizeForComparison(text);

    if (!value) {
        return null;
    }


    for (
        const pattern
        of getGreetingPatterns()
    ) {

        const match =
            value.match(pattern);

        if (!match) {
            continue;
        }


        let afterGreeting =
            value
                .slice(match[0].length)
                .trim();


        afterGreeting =
            afterGreeting
                .replace(
                    /^[,;:!?-]+\s*/,
                    ''
                )
                .trim();


        /*
         * -----------------------------------------
         * SAUDAÇÃO SOZINHA
         * -----------------------------------------
         *
         * Ex:
         *
         * oi
         * oiii
         * olá
         * bom dia
         *
         * Mantemos a mensagem inteira.
         */

        if (!afterGreeting) {

            return {
                greeting: match[0],
                remaining: ''
            };
        }


        /*
         * -----------------------------------------
         * SAUDAÇÃO + PESSOA
         * -----------------------------------------
         *
         * Ex:
         *
         * oi amigo
         * oi chefe
         * olá pessoal
         *
         * Se for apenas isso, também é uma
         * saudação completa.
         */

        const socialPattern =
            new RegExp(
                `^(${SOCIAL_GREETING_PREFIXES
                    .map(escapeRegExp)
                    .join('|')})(?=\\s|[,;:!?-]|$)`,
                'i'
            );


        const socialMatch =
            afterGreeting.match(
                socialPattern
            );


        if (socialMatch) {

            let afterSocial =
                afterGreeting
                    .slice(
                        socialMatch[0].length
                    )
                    .trim();


            afterSocial =
                afterSocial
                    .replace(
                        /^[,;:!?-]+\s*/,
                        ''
                    )
                    .trim();


            /*
             * "oi amigo"
             *
             * É uma saudação completa.
             */
            if (!afterSocial) {

                return {
                    greeting:
                        `${match[0]} ${socialMatch[0]}`,
                    remaining: ''
                };
            }


            /*
             * "oi amigo quero fazer um pedido"
             *
             * Agora sim removemos toda a saudação.
             */
            return {
                greeting:
                    `${match[0]} ${socialMatch[0]}`,
                remaining:
                    afterSocial
            };
        }


        /*
         * -----------------------------------------
         * SAUDAÇÃO + INTENÇÃO
         * -----------------------------------------
         *
         * Ex:
         *
         * oi quero chicken
         * bom dia quero menu
         * olá quanto custa
         */

        return {
            greeting:
                match[0],
            remaining:
                afterGreeting
        };
    }


    /*
     * ---------------------------------------------
     * CUMPRIMENTOS CONVERSACIONAIS
     * ---------------------------------------------
     */

    const socialQuestionPattern =
        new RegExp(
            `^(${SOCIAL_GREETING_QUESTIONS
                .map(escapeRegExp)
                .join('|')})(?=\\s|[,;:!?-]|$)`,
            'i'
        );


    const socialQuestionMatch =
        value.match(
            socialQuestionPattern
        );


    if (!socialQuestionMatch) {
        return null;
    }


    let remaining =
        value
            .slice(
                socialQuestionMatch[0].length
            )
            .trim();


    remaining =
        remaining
            .replace(
                /^[,;:!?-]+\s*/,
                ''
            )
            .trim();


    return {
        greeting:
            socialQuestionMatch[0],
        remaining
    };
}



/**
 * =========================================================
 * REMOVE CUMPRIMENTO INICIAL
 * =========================================================
 *
 * Exemplos:
 *
 * "Bom dia, queria chicken"
 * =>
 * "queria chicken"
 *
 * "Olá, quero 2 chicken"
 * =>
 * "quero 2 chicken"
 *
 * "Boa tarde queria ver o menu"
 * =>
 * "queria ver o menu"
 *
 * O texto original continua preservado no retorno final.
 * =========================================================
 */

function removeLeadingGreeting(text) {

    const value =
        normalizeForComparison(text);

    if (!value) {
        return '';
    }


    const detected =
        detectLeadingGreeting(value);


    if (!detected) {
        return value;
    }


    /*
     * IMPORTANTE:
     *
     * Se a mensagem for apenas:
     *
     * "oi"
     * "oiii"
     * "olá"
     * "bom dia"
     * "boa tarde"
     *
     * NÃO removemos a saudação.
     *
     * Assim o intentService ainda poderá
     * identificá-la como GREETING.
     */

    if (!detected.remaining) {
        return value;
    }


    return detected.remaining;
}

/**
 * =========================================================
 * REMOVE PREFIXOS SOCIAIS
 * =========================================================
 *
 * Diferente de removeLeadingGreeting(), esta função pode
 * ser utilizada para obter uma versão interpretável da
 * mensagem sem destruir a mensagem original.
 * =========================================================
 */

function normalizeForIntent(text) {

    const normalized =
        normalizeForComparison(text);

    if (!normalized) {
        return '';
    }

    return (
        removeLeadingGreeting(
            normalized
        ) || normalized
    );
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
    três: 3,

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
     * Mensagem composta apenas por número.
     */

    const numericOnly =
        normalized.match(/^\d+$/);

    if (numericOnly) {

        return Number(
            numericOnly[0]
        );

    }


    /**
     * Número em algarismos.
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
     * Número por extenso.
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
 * EXTRAI QUANTIDADE DO INÍCIO DE UM SEGMENTO
 * =========================================================
 *
 * Ao contrário de extractQuantity(), esta função é útil
 * para mensagens compostas.
 *
 * Exemplo:
 *
 * "2 chicken"
 * => 2
 *
 * "3 batatas"
 * => 3
 *
 * "chicken"
 * => null
 *
 * Isso evita associar a quantidade do primeiro item a
 * todos os itens da mensagem.
 * =========================================================
 */

function extractLeadingQuantity(text) {

    const normalized =
        normalizeForComparison(text);

    if (!normalized) {
        return null;
    }


    const digitMatch =
        normalized.match(
            /^(\d+)\b/
        );

    if (digitMatch) {

        return Number(
            digitMatch[1]
        );

    }


    const words =
        Object.entries(
            NUMBER_WORDS
        )
            .sort(
                (a, b) =>
                    b[0].length -
                    a[0].length
            );


    for (
        const [word, value]
        of words
    ) {

        const pattern =
            new RegExp(
                `^${word}\\b`
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
        quinta: 5,

        sexto: 6,
        sexta: 6,

        setimo: 7,
        setima: 7,

        sétimo: 7,
        sétima: 7,

        oitavo: 8,
        oitava: 8,

        nono: 9,
        nona: 9,

        décimo: 10,
        decimo: 10,
        décima: 10,
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
        /\bultima\b/.test(normalized) ||
        /\búltimo\b/.test(normalized) ||
        /\búltima\b/.test(normalized)
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

    if (!normalized) {
        return null;
    }


    /**
     * Posição explícita.
     */

    const position =
        extractProductPosition(
            normalized
        );

    if (position !== null) {

        return {

            type: 'position',

            value: position

        };

    }


    /**
     * Referência relativa.
     */

    if (
        /\b(esse mesmo|essa mesma|aquele mesmo|aquela mesma)\b/
            .test(normalized)
    ) {

        return {

            type: 'relative',

            value: 'last'

        };

    }


    if (
        /\b(esse|essa|aquele|aquela)\b/
            .test(normalized)
    ) {

        return {

            type: 'relative',

            value: 'last'

        };

    }


    if (
        /\b(ultimo|ultima|último|última)\b/
            .test(normalized)
    ) {

        return {

            type: 'relative',

            value: 'last'

        };

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
        normalizeForIntent(text);


    if (!normalized) {
        return false;
    }


    /**
     * =====================================================
     * NUNCA É ADIÇÃO
     * =====================================================
     */

    if (
        /\b(quero|queria|vou querer)\s+(remover|tirar|eliminar|excluir|apagar)\b/
            .test(normalized)
    ) {

        return false;

    }


    /**
     * =====================================================
     * SOLICITAÇÃO DE SERVIÇO
     * =====================================================
     */

    if (
        /\b(quero|queria|gostaria de|vou querer)?\s*pedir\s+(um|uma|o|a|os|as)?\s*servi[cç]o(s)?\b/
            .test(normalized)
    ) {

        return false;

    }


    /**
     * =====================================================
     * QUANTIDADE + PRODUTO
     * =====================================================
     *
     * Exemplos:
     *
     * "2 chicken"
     * "duas chicken"
     * "3 batatas"
     *
     * A quantidade só é considerada uma ação de
     * adição quando existe conteúdo depois dela.
     *
     * Assim:
     *
     * "2"  -> false
     * "2?" -> false
     *
     * A resolução do produto continua sendo feita
     * posteriormente pelas camadas responsáveis.
     * Nenhum produto é hardcoded aqui.
     * =====================================================
     */

    const leadingQuantity =
        extractLeadingQuantity(
            normalized
        );


    if (
        leadingQuantity !== null
    ) {

        const quantityPattern =
            new RegExp(
                '^' +
                '(?:\\d+|' +
                Object.keys(NUMBER_WORDS)
                    .sort(
                        (a, b) =>
                            b.length - a.length
                    )
                    .map(escapeRegExp)
                    .join('|') +
                ')' +
                '\\b\\s+(.+)$',
                'i'
            );


        const quantityMatch =
            normalized.match(
                quantityPattern
            );


        if (
            quantityMatch &&
            quantityMatch[1] &&
            quantityMatch[1].trim()
        ) {

            return true;

        }

    }


    /**
     * =====================================================
     * AÇÕES EXPLÍCITAS DE ADIÇÃO
     * =====================================================
     */

    const explicitAddPrefixes = [

        'adiciona',
        'adicionar',

        'add',

        'acrescenta',
        'acrescentar',

        'coloca',
        'colocar',

        'manda',
        'mandar',

        'pode adicionar',
        'pode colocar',

        'quero pedir',
        'queria pedir',

        'peço',
        'peco',

        'pede',
        'pedir'

    ];


    if (
        explicitAddPrefixes.some(
            phrase =>
                normalized === phrase ||
                normalized.startsWith(
                    `${phrase} `
                )
        )
    ) {

        return true;

    }


    /**
     * =====================================================
     * "QUERO" / "QUERIA" / "VOU QUERER"
     * =====================================================
     */

    const wantMatch =
        normalized.match(
            /^(quero|queria|vou querer|gostaria|desejo|pretendo)\s+(.+)$/i
        );


    if (!wantMatch) {

        return false;

    }


    const requested =
        wantMatch[2]
            .trim();


    if (!requested) {
        return false;
    }


    /**
     * Estruturas que representam consulta ou fluxo.
     */

    const nonProductPatterns = [

        /^(ver|mostrar|mostra|consultar|saber|conhecer|olhar)\b/,

        /^(fazer|efetuar|realizar)\s+(um|uma)?\s*(pedido|compra)\b/,

        /^(falar|conversar)\s+(com|com uma|com um)\b/,

        /^(pedir)\s+(informação|informacoes|informações|ajuda)\b/,

        /^(saber|ver)\s+(o|a|os|as)?\s*(menu|carrinho|total|preço|preco|valor)\b/,

        /^(ver|mostrar|mostra)\s+(o|a|os|as)?\s*(serviço|servicos|serviços)\b/,

        /^(fazer|efetuar|realizar)\s+(uma|um)?\s*(solicitação|solicitacao|orçamento|orcamento)\b/

    ];


    if (
        nonProductPatterns.some(
            pattern =>
                pattern.test(requested)
        )
    ) {

        return false;

    }


    return true;

}


/**
 * =========================================================
 * AÇÃO DE REMOVER
 * =========================================================
 */

function isRemoveAction(text) {

    const normalized =
        normalizeForIntent(text);

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

        'queria remover',
        'queria tirar',
        'queria eliminar',

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
 * AÇÃO DE ALTERAR
 * =========================================================
 */

function isEditAction(text) {

    const normalized =
        normalizeForIntent(text);

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
 * AÇÃO DE ALTERAR QUANTIDADE
 * =========================================================
 */

function isQuantityEditAction(
    text,
    state,
    quantity
) {

    const normalized =
        normalizeForIntent(text);

    if (
        quantity === null
    ) {

        return false;

    }


    /**
     * Se o fluxo já está perguntando a quantidade,
     * qualquer quantidade válida pode ser a resposta.
     */

    if (
        state === 'editing_cart_item' ||
        state === 'waiting_quantity'
    ) {

        return true;

    }


    /**
     * Alteração explícita.
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
        /\b(fica|passa|muda|altera|modifica|deixa)\b/.test(normalized) &&
        /\b(para|em|com|a)?\s*\d+\b/.test(normalized)
    ) {

        return true;

    }


    /**
     * Número + contexto de alteração.
     */

    if (
        (
            state === 'editing_cart' ||
            state === 'editing_cart_item'
        ) &&
        (
            /\bquero\b/.test(normalized) ||
            /\bqueria\b/.test(normalized) ||
            /\bficar com\b/.test(normalized)
        )
    ) {

        return true;

    }


    return false;
}


/**
 * =========================================================
 * DETECTA SUBSTITUIÇÃO
 * =========================================================
 */

function isReplaceAction(text) {

    const normalized =
        normalizeForIntent(text);

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
        normalizeForIntent(text);

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


    /**
     * Primeiro removemos cumprimentos.
     */

    value =
        removeLeadingGreeting(
            value
        );


    /**
     * Prefixos.
     */

    const prefixes = [

        'quero',
        'queria',

        'gostaria',
        'desejo',
        'pretendo',

        'quero um',
        'quero uma',

        'queria um',
        'queria uma',

        'quero dois',
        'quero duas',

        'queria dois',
        'queria duas',

        'quero tres',
        'queria tres',

        'quero quatro',
        'queria quatro',

        'quero cinco',
        'queria cinco',

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

        'add',

        'acrescenta',
        'acrescentar',

        'coloca',
        'colocar',

        'pode adicionar',
        'pode colocar',

        'quero pedir',
        'queria pedir',

        'peço',
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
        'queria solicitar',

        'solicita',
        'solicitar',

        'preciso de',
        'gostaria de',
        'gostaria do',
        'gostaria da',

        'queria de',
        'queria do',
        'queria da',

        'preciso do',
        'preciso da',

        'quero um servico',
        'quero uma servico',
        'quero servico',

        'queria um servico',
        'queria uma servico',
        'queria servico',

        'solicito',
        'pedido de',
        'pedido para',

        'orcamento de',
        'orcamento para',

        'servico de',
        'servico para'

    ];


    /**
     * Remove primeiro os prefixos mais específicos.
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
            /^(um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez|\d+)\s+/,
            ''
        );


    /**
     * Remove artigos.
     */

    value =
        value.replace(
            /^(o|a|os|as|um|uma|uns|umas)\s+/,
            ''
        );


    value =
        value.replace(
            /^(o|a|os|as)\s+/,
            ''
        );


    /**
     * Remove referências no final.
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
        normalizeForIntent(text);

    if (!normalized) {
        return null;
    }


    const actionPatterns = [

        /^(quero|queria)\s+/,
        /^vou querer\s+/,

        /^manda\s+/,

        /^gostaria\b/,
        /^desejo\b/,
        /^pretendo\b/,

        /^adiciona\s+/,
        /^adicionar\s+/,

        /^add\s+/,

        /^acrescenta\s+/,
        /^acrescentar\s+/,

        /^coloca\s+/,
        /^colocar\s+/,

        /^pode adicionar\s+/,
        /^pode colocar\s+/,

        /^(quero|queria) pedir\s+/,

        /^peço\s+/,
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

        /^(quero|queria) solicitar\s+/,
        /^solicita\s+/,
        /^solicitar\s+/,

        /^preciso de\s+/,
        /^gostaria de\s+/,
        /^gostaria do\s+/,
        /^gostaria da\s+/,

        /^queria de\s+/,
        /^queria do\s+/,
        /^queria da\s+/

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
            .replace(
                /^(quero|queria) solicitar\s+/i,
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
                /^queria de\s+/i,
                ''
            )
            .replace(
                /^queria do\s+/i,
                ''
            )
            .replace(
                /^queria da\s+/i,
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
 */

function extractDirectItemCandidate(
    text,
    state
) {

    const normalized =
        normalizeForIntent(text);

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


    if (
        /^\d+$/.test(normalized)
    ) {

        return null;

    }


    if (
        /^(quanto|qual|onde|como|quando|tem|tens|voces|voce)\b/
            .test(normalized)
    ) {

        return null;

    }


    const genericIntentPatterns = [

        /^(quero|queria) ver\b/,

        /^(quero|queria) olhar\b/,

        /^(quero|queria) conhecer\b/,

        /^(quero|queria) saber\b/,

        /^(quero|queria) fazer\b/,

        /^(quero|queria) falar\b/,

        /^(quero|queria) conversar\b/,

        /^(quero|queria) pedir\b/,

        /^(quero|queria) solicitar\b/,

        /^(quero|queria) um pedido\b/,

        /^(quero|queria) o pedido\b/,

        /^(quero|queria) o menu\b/,

        /^(quero|queria) menu\b/,

        /^ver o menu\b/,

        /^ver menu\b/,

        /^mostrar o menu\b/,

        /^mostrar menu\b/,

        /^mostra o menu\b/,

        /^mostra menu\b/,

        /^ver tudo\b/,

        /^mostrar tudo\b/,

        /^mostra tudo\b/,

        /^tudo\b/,

        /^menu\b/,

        /^cardapio\b/,

        /^cardápio\b/,

        /^pedido\b/,

        /^pedidos\b/,

        /^carrinho\b/,

        /^total\b/,

        /^falar com\b/,

        /^atendente\b/,

        /^pessoa\b/,

        /^humano\b/,

        /^ajuda\b/,

        /^obrigado\b/,

        /^obrigada\b/,

        /^tchau\b/,

        /^adeus\b/

    ];


    if (
        genericIntentPatterns.some(
            pattern =>
                pattern.test(normalized)
        )
    ) {

        return null;

    }


    const vagueReferencePatterns = [

        /^(isso|isto|aquilo|esse|essa|este|esta|aquele|aquela)$/,

        /^(ele|ela|eles|elas)$/,

        /^(esse aqui|essa aqui|este aqui|esta aqui)$/,

        /^(o mesmo|a mesma)$/,

        /^(qualquer um|qualquer uma)$/,

        /^(qualquer coisa)$/,

        /^qualquer$/,

        /^(tudo|nada)$/

    ];


    if (
        vagueReferencePatterns.some(
            pattern =>
                pattern.test(normalized)
        )
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


    const normalized =
        normalizeForIntent(text);

    if (!normalized) {
        return null;
    }


    const serviceRequestPatterns = [

        /^(quero|queria) solicitar\s+/,

        /^(quero|queria) um servico\s+/,

        /^(quero|queria) servico\s+/,

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
                    /^(quero|queria) solicitar\s+/i,
                    ''
                )
                .replace(
                    /^(quero|queria) um servico\s+/i,
                    ''
                )
                .replace(
                    /^(quero|queria) servico\s+/i,
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
 */

function extractQuantityTarget(text) {

    const normalized =
        normalizeForIntent(text);

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
        /\b(fica|passa|muda|altera|modifica|deixa)\b/.test(normalized) &&
        /\b(para|em|com|a)?\s*\d+\b/.test(normalized)
    ) {

        return 'quantity';

    }


    return null;
}


/**
 * =========================================================
 * EXTRAI CANDIDATO DE PRODUTO PARA ALTERAÇÃO DE QUANTIDADE
 * =========================================================
 */

function extractQuantityProductCandidate(text) {

    let normalized =
        normalizeForIntent(text);

    if (!normalized) {
        return null;
    }


    normalized =
        normalized
            .replace(
                /^(fica|deixa|passa|muda|altera|modifica)\s+/i,
                ''
            )
            .replace(
                /^fica\s+só\s+/i,
                ''
            );


    normalized =
        normalized
            .replace(
                /\b(para|em|com)\b\s*/i,
                ''
            )
            .replace(
                /^\d+\s+/,
                ''
            )
            .replace(
                /^(um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez)\s+/i,
                ''
            );


    normalized =
        normalized
            .replace(
                /\bso\b/gi,
                ''
            )
            .replace(
                /\s+/g,
                ' '
            )
            .trim();


    return normalized || null;
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
        normalizeForIntent(text);


    /**
     * INTENÇÕES EXPLÍCITAS
     */

    if (
        intent === 'HUMAN' ||
        intent === 'ATTENDANT'
    ) {

        return 'human';

    }


    if (
        intent === 'MENU'
    ) {

        return 'menu';

    }


    if (
        intent === 'SERVICES' ||
        intent === 'SERVICE_REQUEST'
    ) {

        return 'service';

    }


    if (
        intent === 'ORDER'
    ) {

        return 'order';

    }


    if (
        intent === 'LOCATION'
    ) {

        return 'location';

    }


    if (
        intent === 'HOURS'
    ) {

        return 'hours';

    }


    /**
     * CARRINHO / TOTAL
     */

    if (
        /\b(total|carrinho|pedido|pedidos|pagar)\b/
            .test(normalized) ||
        /\b(deu|fica tudo)\b/
            .test(normalized) ||
        (
            /\btudo\b/.test(normalized) &&
            /\b(total|carrinho|pedido|pedidos|pagar|preço|preco|valor|quanto|comprar|itens)\b/
                .test(normalized)
        )
    ) {

        return 'cart';

    }


    /**
     * SERVIÇO
     */

    if (
        serviceCandidate ||
        context?.service_id ||
        context?.serviceId ||
        context?.service_name ||
        context?.currentService ||
        context?.lastService ||
        state === 'viewing_services' ||
        state === 'viewing_service' ||
        state === 'service_request'
    ) {

        return 'service';

    }


    /**
     * PRODUTO
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
     * QUANTIDADE
     */

    if (
        extractQuantityTarget(
            normalized
        )
    ) {

        return 'quantity';

    }


    /**
     * PEDIDO EM CONFIRMAÇÃO
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
    context,
    hasCompoundCartAction,
    hasQuantityChangeAction
}) {

    const normalized =
        normalizeForIntent(text);


    /**
     * VOLTAR
     */

    if (backAction) {

        return 'go_back';

    }


    /**
     * AÇÃO COMPOSTA DE CARRINHO
     */

    if (
        hasCompoundCartAction
    ) {

        return 'composite_cart_action';

    }


    /**
     * ALTERAÇÃO DE QUANTIDADE
     */

    if (
        hasQuantityChangeAction
    ) {

        return 'change_quantity';

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
     * PEDIDO DE SERVIÇO
     */

    if (
        intent === 'SERVICE_REQUEST'
    ) {

        return 'request_service';

    }


    /**
     * SELEÇÃO DE SERVIÇO
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
     * ADICIONAR PRODUTO
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
     * SELECIONAR PRODUTO
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
        intent === 'SERVICE' ||
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
     * ATENDIMENTO HUMANO
     */

    if (
        intent === 'HUMAN' ||
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


    /**
     * CUMPRIMENTO
     */

    if (
        intent === 'GREETING'
    ) {

        return 'greeting';

    }


    return 'unknown';
}


/**
 * =========================================================
 * EXTRAI PRODUTO ANTIGO E PRODUTO DE SUBSTITUIÇÃO
 * =========================================================
 */

function extractReplacementCandidates(text) {

    const normalized =
        normalizeForIntent(text);


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
 * SEPARA ITENS COMPOSTOS
 * =========================================================
 *
 * O objetivo aqui não é resolver produtos.
 *
 * O objetivo é transformar uma mensagem natural em
 * segmentos candidatos.
 *
 * Exemplo:
 *
 * "2 chicken e 3 batatas"
 *
 * =>
 *
 * "2 chicken"
 * "3 batatas"
 *
 * =========================================================
 */

function splitProductSegments(text) {

    const normalized =
        normalizeForIntent(text);

    if (!normalized) {
        return [];
    }


    /**
     * Primeiro tentamos vírgulas.
     */

    const commaParts =
        normalized
            .split(/\s*,\s*/)
            .map(
                part =>
                    part.trim()
            )
            .filter(Boolean);


    if (
        commaParts.length > 1
    ) {

        return commaParts;
    }


    /**
     * Depois +.
     */

    if (
        normalized.includes('+')
    ) {

        const plusParts =
            normalized
                .split(/\s*\+\s*/)
                .map(
                    part =>
                        part.trim()
                )
                .filter(Boolean);

        if (
            plusParts.length > 1
        ) {

            return plusParts;
        }
    }


    /**
     * Finalmente "e" / "também".
     *
     * Esta separação é deliberadamente conservadora.
     */

    const andParts =
        normalized
            .split(
                /\s+(?:e|tambem|também)\s+/i
            )
            .map(
                part =>
                    part.trim()
            )
            .filter(Boolean);


    return andParts;
}


/**
 * =========================================================
 * EXTRAI MÚLTIPLOS CANDIDATOS DE ADIÇÃO
 * =========================================================
 */

function extractMultipleAddCandidates(text) {

    const normalized =
        normalizeForIntent(text);

    if (!normalized) {
        return [];
    }


    /**
     * =====================================================
     * SEPARAÇÃO POR VÍRGULA / + / E
     * =====================================================
     */

    let remaining =
        normalized;


    const addPrefixMatch =
        remaining.match(
            /^(quero|queria|vou querer|manda|mandar|adiciona|adicionar|add|acrescenta|acrescentar|coloca|colocar|pode adicionar|pode colocar|quero pedir|queria pedir|peço|peco|pede|pedir)\s+(.+)$/i
        );


    let prefix = '';

    if (addPrefixMatch) {

        prefix =
            addPrefixMatch[1];

        remaining =
            addPrefixMatch[2]
                .trim();

    }


    /**
     * Se houver prefixo de adição, ele fica somente no
     * primeiro segmento.
     */

    const parts =
        splitProductSegments(
            remaining
        );


    if (
        parts.length < 2
    ) {

        return [];

    }


    const candidates = [];


    for (
        let index = 0;
        index < parts.length;
        index++
    ) {

                let part =
            parts[index];


        /**
         * Quantidade deve ser retirada do segmento
         * original, antes de adicionar o prefixo
         * conversacional.
         */

        const quantity =
            extractLeadingQuantity(
                part
            );


        if (
            index === 0 &&
            prefix
        ) {

            part =
                `${prefix} ${part}`;

        }

        let candidate =
            cleanItemCandidate(
                part
            );


        /**
         * Se a limpeza ainda deixou uma quantidade
         * inicial, removemos novamente.
         */

        candidate =
            candidate
                .replace(
                    /^(um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez|\d+)\s+/i,
                    ''
                )
                .trim();


        if (!candidate) {
            continue;
        }


        /**
         * Evita que intenções conversacionais sejam
         * interpretadas como produtos.
         */

        const genericPatterns = [

            /^ver\b/i,
            /^mostrar\b/i,
            /^mostra\b/i,
            /^consultar\b/i,
            /^saber\b/i,

            /^fazer\s+(um|uma)?\s*(pedido|compra)\b/i,

            /^falar\s+com\b/i,

            /^conversar\s+com\b/i,

            /^menu\b/i,

            /^carrinho\b/i,

            /^total\b/i,

            /^servi[cç]o\b/i

        ];


        if (
            genericPatterns.some(
                pattern =>
                    pattern.test(candidate)
            )
        ) {

            continue;

        }


        candidates.push({

            candidate,

            quantity

        });

    }


    /**
     * Só é mensagem composta quando existem pelo menos
     * dois candidatos reais.
     */

    if (
        candidates.length < 2
    ) {

        return [];

    }


    return candidates;
}


/**
 * =========================================================
 * DETECTA MÚLTIPLAS AÇÕES DE ADIÇÃO
 * =========================================================
 */

function detectMultipleAddActions(text) {

    const candidates =
        extractMultipleAddCandidates(
            text
        );


    return candidates.map(
        item => ({

            type: 'add_product',

            candidate:
                item.candidate,

            quantity:
                item.quantity

        })
    );

}


/**
 * =========================================================
 * DETECTA AÇÕES COMPOSTAS
 * =========================================================
 */

function detectCompoundActions(
    text,
    intent = null
) {

    const normalized =
        normalizeForIntent(text);

    if (!normalized) {

        return [];

    }


    /**
     * Solicitação de serviço não deve ser interpretada
     * como composição de produtos.
     */

    if (
    intent === 'SERVICE_REQUEST'
) {
    const addIntentCandidate =
        isAddAction(normalized) &&
        !/\b(servico|serviços|serviço|corte de relva)\b/i.test(normalized);

    if (!addIntentCandidate) {
        return [];
    }
}


    const actions = [];


    /**
     * =====================================================
     * TROCA DE PRODUTO
     * =====================================================
     */

    if (
        isReplaceAction(normalized)
    ) {

        const replacement =
            extractReplacementCandidates(
                normalized
            );


        if (
            replacement.targetProductCandidate ||
            replacement.replacementCandidate
        ) {

            actions.push({

                type: 'replace_product',

                target: {

                    type:
                        extractProductPosition(
                            replacement.targetProductCandidate
                        ) !== null
                            ? 'position'
                            : 'candidate',

                    value:
                        replacement.targetProductCandidate

                },

                replacementCandidate:
                    replacement.replacementCandidate,

                quantity:
                    extractQuantity(
                        normalized
                    )

            });

        }


        return actions;

    }


  /**
 * =====================================================
 * MÚLTIPLAS ADIÇÕES
 * =====================================================
 *
 * Só tentamos interpretar múltiplas adições quando
 * a mensagem não contém uma ação explícita de remoção
 * ou alteração/substituição.
 *
 * Isto evita que uma mensagem composta como:
 *
 * "remove chicken e adiciona batata e refrigerante"
 *
 * seja interpretada incorretamente apenas como
 * múltiplas adições.
 * =====================================================
 */

const hasRemovalIntent =
    /\b(remove|retira|tira|elimina|nao quero|não quero)\b/.test(
        normalized
    );

const hasEditIntent =
    /\b(muda|troca|altera|modifica|substitui)\b/.test(
        normalized
    );

const multipleAddActions =
    !hasRemovalIntent && !hasEditIntent
        ? detectMultipleAddActions(normalized)
        : [];

if (
    multipleAddActions.length > 1
) {
    actions.push(
        ...multipleAddActions
    );

    return actions;
}




    /**
     * =====================================================
     * SEPARAÇÃO DE AÇÕES
     * =====================================================
     */

    const parts =
        normalized
            .split(
                /\s+(?:e|tambem|também|mas)\s+/i
            )
            .map(
                part =>
                    part.trim()
            )
            .filter(Boolean);


    const segments =
        parts.length > 1
            ? parts
            : [normalized];


    /**
     * =====================================================
     * ANALISA CADA SEGMENTO
     * =====================================================
     */

    for (
        const segment
        of segments
    ) {

        if (!segment) {
            continue;
        }


        /**
         * =================================================
         * REMOVER PRODUTO
         * =================================================
         */

        if (
            isRemoveAction(segment)
        ) {

            const position =
                extractProductPosition(
                    segment
                );


            const reference =
                extractReference(
                    segment
                );


            let candidate = null;


            if (
                position === null &&
                !reference
            ) {

                candidate =
                    cleanItemCandidate(
                        segment
                    );

            }


            actions.push({

                type: 'remove_product',

                target:
                    position !== null

                        ? {
                              type: 'position',
                              value: position
                          }

                        : reference

                            ? reference

                            : {
                                  type: 'candidate',
                                  value: candidate
                              },

                candidate

            });


            continue;

        }


        /**
         * =================================================
         * ALTERAR QUANTIDADE
         * =================================================
         */

        const quantity =
            extractQuantity(
                segment
            );


        if (
            isQuantityEditAction(
                segment,
                null,
                quantity
            )
        ) {

            const reference =
                extractReference(
                    segment
                );


            const position =
                extractProductPosition(
                    segment
                );


            let quantityProductCandidate =
                extractQuantityProductCandidate(
                    segment
                );


            if (
                quantityProductCandidate
            ) {

                quantityProductCandidate =
                    quantityProductCandidate
                        .replace(
                            /\b(fica|fica só|passa|deixa)\b/gi,
                            ''
                        )
                        .replace(
                            /\b(para|em|com)\b/gi,
                            ''
                        )
                        .replace(
                            /\b\d+\b/g,
                            ''
                        )
                        .replace(
                            /\b(um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez)\b/gi,
                            ''
                        )
                        .replace(
                            /\bso\b/gi,
                            ''
                        )
                        .replace(
                            /\s+/g,
                            ' '
                        )
                        .trim();

            }


            actions.push({

                type:
                    'change_quantity',

                quantity,

                target:
                    position !== null

                        ? {
                              type: 'position',
                              value: position
                          }

                        : reference

                            ? reference

                            : quantityProductCandidate

                                ? {
                                      type: 'candidate',
                                      value:
                                          quantityProductCandidate
                                  }

                                : {
                                      type: 'current'
                                  }

            });


            continue;

        }


        /**
         * =================================================
         * ADICIONAR PRODUTO
         * =================================================
         */

        if (
            isAddAction(segment)
        ) {

            let candidate =
                cleanItemCandidate(
                    segment
                );


            if (candidate) {

                actions.push({

                    type:
                        'add_product',

                    candidate,

                    quantity:
                        extractQuantity(
                            segment
                        )

                });

            }


            continue;

        }

    }


    return actions;
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
            detected?.intent ||
            'unknown'
        ).toUpperCase();


    const text =
        normalizeForComparison(
            message
        );


    if (!text) {

        return {

            intent: 'UNKNOWN',

            confidence: 0,

            source: 'unknown'

        };

    }


    /**
     * =====================================================
     * CONFIRMAÇÃO CONTEXTUAL
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
     * NEGAÇÃO CONTEXTUAL
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
     * REFERÊNCIA COMO CONFIRMAÇÃO
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
     * CONFIRMAÇÃO EXPLÍCITA
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
     * REFERÊNCIA COM CONTEXTO
     * =====================================================
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
     * INTENÇÃO EXPLÍCITA
     * =====================================================
     */

    if (
        detectedIntent !== 'UNKNOWN'
    ) {

        return {

            intent:
                detectedIntent,

            confidence:
                detected?.confidence ?? 1,

            source:
                'explicit'

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

    const originalMessage =
        message || '';


    /**
     * =====================================================
     * DETECÇÃO INICIAL
     * =====================================================
     *
     * Primeiro tentamos a mensagem inteira.
     *
     * Depois, quando existe cumprimento inicial, também
     * analisamos a versão sem o cumprimento.
     *
     * Isto é fundamental para:
     *
     * "Bom dia, queria ver o menu"
     *
     * "Olá, quero chicken"
     *
     * "Boa tarde, queria falar com uma pessoa"
     * =====================================================
     */

    const normalizedMessage =
        normalizeForComparison(
            originalMessage
        );


    const intentMessage =
        normalizeForIntent(
            originalMessage
        );


    let detected =
        detectIntent(
            originalMessage
        );


      const leadingGreeting =
    detectLeadingGreeting(originalMessage);

if (
    leadingGreeting &&
    !leadingGreeting.remaining &&
    detected.intent === 'UNKNOWN'
) {

    detected = {
        ...detected,
        intent: 'GREETING',
        confidence: 0.98
    };
}  


    /**
     * Se a mensagem começa por cumprimento e a primeira
     * classificação não capturou a intenção real, tentamos
     * novamente sem o cumprimento.
     */

    const detectedInitialIntent =
        String(
            detected?.intent ||
            'UNKNOWN'
        ).toUpperCase();


    if (
        intentMessage &&
        intentMessage !== normalizedMessage &&
        (
            detectedInitialIntent === 'UNKNOWN' ||
            detectedInitialIntent === 'GREETING'
        )
    ) {

        const contextualDetected =
            detectIntent(
                intentMessage
            );


        const contextualIntent =
            String(
                contextualDetected?.intent ||
                'UNKNOWN'
            ).toUpperCase();


        if (
            contextualIntent !== 'UNKNOWN' &&
            (
                detectedInitialIntent === 'UNKNOWN' ||
                contextualIntent !== 'GREETING'
            )
        ) {

            detected = {

                ...contextualDetected,

                originalText:
                    originalMessage,

                normalizedText:
                    contextualDetected.normalizedText ||
                    intentMessage

            };

        }

    }


    /**
     * =====================================================
     * RESOLUÇÃO CONTEXTUAL
     * =====================================================
     */

    const resolved =
        resolveContextualIntent({

            detected,

            message:
                originalMessage,

            state,

            context

        });


    /**
     * =====================================================
     * ENTIDADES BÁSICAS
     * =====================================================
     */

    const quantity =
        extractQuantity(
            intentMessage
        );


    const addAction =
        isAddAction(
            originalMessage
        );


    const removeAction =
        isRemoveAction(
            originalMessage
        );


    const editAction =
        isEditAction(
            originalMessage
        );


    const backAction =
        isBackAction(
            originalMessage
        );


    const replaceAction =
        isReplaceAction(
            originalMessage
        );


    const productPosition =
        extractProductPosition(
            intentMessage
        );


    const reference =
        extractReference(
            intentMessage
        );


    /**
 * =====================================================
 * CONSULTA DE ATRIBUTO DE PRODUTO
 * =====================================================
 *
 * O Knowledge Engine apenas interpreta a pergunta.
 * A resolução real do produto/atributo continua
 * nas camadas superiores, respeitando company_id.
 *
 * Exemplos:
 *
 * "esse sapato tem tamanho 35?"
 * "tem em preto?"
 * "quais tamanhos tem?"
 *
 * Se não houver confiança suficiente, o detector
 * retorna null.
 * =====================================================
 */

const productAttributeQuery =
    detectProductAttributeQuery(
        intentMessage
    );    



    /**
     * =====================================================
     * AÇÕES COMPOSTAS
     * =====================================================
     */

    const compoundActions =
        detectCompoundActions(
            originalMessage,
            resolved.intent
        );


    /**
     * =====================================================
     * DETECTA SE EXISTE AÇÃO DE CARRINHO COMPOSTA
     * =====================================================
     *
     * Não basta existirem duas ações quaisquer.
     *
     * Por exemplo:
     *
     * "quero saber o preço e o horário"
     *
     * não é uma ação composta de carrinho.
     *
     * Consideramos apenas ações que realmente alteram ou
     * manipulam o carrinho:
     *
     * add_product
     * remove_product
     * change_quantity
     * replace_product
     * =====================================================
     */

    const cartMutationTypes = [

        'add_product',
        'remove_product',
        'change_quantity',
        'replace_product'

    ];


    const cartActions =
        compoundActions.filter(
            action =>
                cartMutationTypes.includes(
                    action.type
                )
        );


    const hasCompoundCartAction =
        cartActions.length > 1;


    const hasQuantityChangeAction =
        compoundActions.some(
            action =>
                action.type === 'change_quantity'
        );


    /**
     * =====================================================
     * CANDIDATOS DE PRODUTOS
     * =====================================================
     */

    const addProductActions =
        compoundActions.filter(
            action =>
                action.type === 'add_product' &&
                action.candidate
        );


    const productCandidates =
        addProductActions.map(
            action =>
                action.candidate
        );


    const hasMultipleProductCandidates =
        productCandidates.length > 1;


    /**
     * =====================================================
     * INTENÇÕES QUE NÃO DEVEM GERAR PRODUTO
     * =====================================================
     */

    const explicitNonItemIntent =
        [
            'GREETING',
            'MENU',
            'SERVICE',
            'SERVICES',
            'SERVICE_REQUEST',
            'HUMAN',
            'ATTENDANT',
            'LOCATION',
            'HOURS',
            'HELP',
            'THANKS',
            'GOODBYE'
        ].includes(
            resolved.intent
        );


    /**
     * =====================================================
     * CANDIDATO SINGULAR
     * =====================================================
     *
     * Mantido para compatibilidade com o fluxo existente.
     */

    const productCandidate =
        explicitNonItemIntent

            ? null

            : (
                hasMultipleProductCandidates

                    ? null

                    : extractProductCandidate(
                          originalMessage,
                          state
                      )
            );


    /**
     * =====================================================
     * CANDIDATO DE SERVIÇO
     * =====================================================
     */

    const serviceCandidate =
        explicitNonItemIntent ||
        productCandidate ||
        hasMultipleProductCandidates

            ? null

            : extractServiceCandidate(
                  originalMessage,
                  state
              );


    /**
     * =====================================================
     * SUBSTITUIÇÃO
     * =====================================================
     */

    const replacementCandidates =
        extractReplacementCandidates(
            originalMessage
        );


    /**
     * =====================================================
     * COMPORTAMENTO INTERPRETADO
     * =====================================================
     */

    const behavior =
        detectBehavior({

            text:
                originalMessage,

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

            context,

            hasCompoundCartAction,

            hasQuantityChangeAction

        });


    /**
     * =====================================================
     * ALVO
     * =====================================================
     */

    const target =
        detectTarget({

            text:
                originalMessage,

            state,

            intent:
                resolved.intent,

            productCandidate,

            serviceCandidate,

            context

        });


    /**
     * =====================================================
     * SITUAÇÃO
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

        message:
            originalMessage,

        normalizedText:
            detected.normalizedText ||
            detected.text ||
            normalizeText(
                originalMessage
            ),


        /**
         * Intenção final.
         */

        intent:
            resolved.intent,


        confidence:
            resolved.confidence,


        intentSource:
            resolved.source,


        /**
         * Intenção originalmente detectada.
         */

        detectedIntent:
            detected.intent,


        /**
         * Texto utilizado para interpretar a intenção.
         */

        intentText:
            intentMessage,


        /**
         * Situação conversacional.
         */

        situation:
            situation.key,


        /**
         * Behavior da arquitetura existente.
         */

        behavior:
            situation.behavior,


        behaviorConfig:
            configuredBehavior,


        /**
         * Comportamento específico interpretado.
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
         * AÇÕES ESTRUTURADAS
         * =================================================
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


            /**
             * Compatibilidade.
             */

            productCandidate,


            /**
             * Lista completa.
             */

            productCandidates,


            /**
             * Indica múltiplos produtos.
             */

            hasMultipleProductCandidates,


            /**
             * Candidato de serviço.
             */

            serviceCandidate,


            /**
             * Posição.
             */

            productPosition,


            /**
             * Referência contextual.
             */

            reference,


            /**
 * Consulta de atributo do produto.
 *
 * Ex:
 * {
 *   type: 'product_attribute_query',
 *   attribute: 'tamanho',
 *   value: '35',
 *   hasValue: true,
 *   confidence: 0.95
 * }
 */

productAttributeQuery,


            /**
             * Produto antigo em substituição.
             */

            targetProductCandidate:
                replacementCandidates
                    .targetProductCandidate,


            /**
             * Novo produto em substituição.
             */

            replacementCandidate:
                replacementCandidates
                    .replacementCandidate,


            /**
             * Alvo de alteração de quantidade.
             */

            quantityTarget:
                extractQuantityTarget(
                    originalMessage
                ),


            /**
             * Informação adicional útil para o bot.
             */

            hasCompoundCartAction,

            hasQuantityChangeAction

        }

    };
}


/**
 * =========================================================
 * ATRIBUTOS DE CATÁLOGO
 * =========================================================
 *
 * Interpreta perguntas sobre atributos de produtos
 * sem assumir um tipo específico de negócio.
 *
 * Exemplos:
 *
 * "esse sapato tem tamanho 35?"
 * "esse produto tem cor preta?"
 * "tem em preto?"
 * "quais cores tem?"
 * "quais tamanhos tem?"
 * "tem armazenamento de 256gb?"
 *
 * O Knowledge Engine apenas interpreta.
 * A resolução real continua no productService.
 * =========================================================
 */

const ATTRIBUTE_QUERY_PATTERNS = [

    {
        attribute: 'tamanho',

        patterns: [
            /\b(?:tem|possui|existe|ha|há|temos)\b.*?\btamanho\s+([a-z0-9]+)/i,
            /\btamanho\s+([a-z0-9]+)\b/i
        ]
    },

    {
        attribute: 'cor',

        patterns: [
            /\b(?:tem|possui|existe|ha|há|temos)\b.*?\b(?:cor|em)\s+([a-z0-9]+)/i,
            /\bcor\s+([a-z0-9]+)\b/i
        ]
    },

    {
        attribute: 'armazenamento',

        patterns: [
            /\b(?:tem|possui|existe|ha|há|temos)\b.*?\barmazenamento\s+([a-z0-9]+)/i,
            /\barmazenamento\s+([a-z0-9]+)/i
        ]
    },

    {
        attribute: 'memoria',

        patterns: [
            /\b(?:tem|possui|existe|ha|há|temos)\b.*?\bmemoria\s+([a-z0-9]+)/i,
            /\bmemoria\s+([a-z0-9]+)/i
        ]
    }

];


/**
 * =========================================================
 * DETECTAR CONSULTA DE ATRIBUTO
 * =========================================================
 */
function detectProductAttributeQuery(text) {

    const normalized =
        normalizeForComparison(text);

    if (!normalized) {
        return null;
    }


    /**
     * -----------------------------------------------------
     * 1. PERGUNTAS COM VALOR
     * -----------------------------------------------------
     *
     * Ex:
     *
     * "esse sapato tem tamanho 35?"
     * "tem em preto?"
     * "esse produto tem cor preta?"
     */
    for (
        const definition
        of ATTRIBUTE_QUERY_PATTERNS
    ) {

        for (
            const pattern
            of definition.patterns
        ) {

            const match =
                normalized.match(
                    pattern
                );

            if (!match) {
                continue;
            }


            const value =
                match[1]
                    ?.trim();


            if (!value) {
                continue;
            }


            return {

                type:
                    'product_attribute_query',

                attribute:
                    definition.attribute,

                value,

                hasValue:
                    true,

                confidence:
                    0.95

            };
        }
    }


    /**
     * -----------------------------------------------------
     * 2. PERGUNTAS QUE PEDEM OS VALORES DISPONÍVEIS
     * -----------------------------------------------------
     *
     * Ex:
     *
     * "quais tamanhos tem?"
     * "quais cores tem?"
     * "que cores possui?"
     */
    const availableValuesPatterns = [

        {
            attribute: 'tamanho',

            patterns: [
                /\bquais?\s+tamanhos?\b/i,
                /\bque\s+tamanhos?\b/i,
                /\btamanhos?\s+(?:tem|possui|ha|há|existem)\b/i
            ]
        },

        {
            attribute: 'cor',

            patterns: [
                /\bquais?\s+cores?\b/i,
                /\bque\s+cores?\b/i,
                /\bcores?\s+(?:tem|possui|ha|há|existem)\b/i
            ]
        },

        {
            attribute: 'armazenamento',

            patterns: [
                /\bquais?\s+armazenamentos?\b/i,
                /\bque\s+armazenamentos?\b/i
            ]
        },

        {
            attribute: 'memoria',

            patterns: [
                /\bquais?\s+memorias?\b/i,
                /\bque\s+memorias?\b/i
            ]
        }

    ];


    for (
        const definition
        of availableValuesPatterns
    ) {

        for (
            const pattern
            of definition.patterns
        ) {

            if (
                pattern.test(
                    normalized
                )
            ) {

                return {

                    type:
                        'product_attribute_query',

                    attribute:
                        definition.attribute,

                    value:
                        null,

                    hasValue:
                        false,

                    confidence:
                        0.95

                };
            }
        }
    }


    return null;
}



/**
 * =========================================================
 * EXPORTAÇÕES
 * =========================================================
 */

module.exports = {

    analyzeMessage,

    resolveContextualIntent,

    detectProductAttributeQuery,

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

    detectMultipleAddActions,

    extractMultipleAddCandidates,

    extractReplacementCandidates,

    extractQuantityProductCandidate,

    cleanItemCandidate,

    removeLeadingGreeting,

    normalizeForIntent,

    extractLeadingQuantity

};
