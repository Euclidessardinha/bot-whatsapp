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
 * NOVA CAPACIDADE:
 *
 * Mensagens compostas de produtos podem gerar múltiplas
 * ações de add_product.
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
        extractProductPosition(normalized);

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
        /\b(ultimo|ultima)\b/
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
        normalizeForComparison(text);


    if (!normalized) {
        return false;
    }


    /**
     * =====================================================
     * NUNCA É ADIÇÃO
     * =====================================================
     *
     * Frases que começam com "quero" podem representar
     * muitas intenções diferentes:
     *
     * "quero ver o menu"
     * "quero ver o carrinho"
     * "quero fazer um pedido"
     * "quero falar com uma pessoa"
     *
     * Portanto, "quero" sozinho NÃO é suficiente
     * para caracterizar add_product.
     */


    if (
        /\b(quero|vou querer)\s+(remover|tirar|eliminar|excluir|apagar)\b/
            .test(normalized)
    ) {

        return false;

    }



    /**
 * =====================================================
 * SOLICITAÇÃO DE SERVIÇO NÃO É ADIÇÃO DE PRODUTO
 * =====================================================
 *
 * "quero pedir um serviço"
 * "quero pedir serviço"
 * "pedir um serviço"
 *
 * representam uma solicitação de serviço/orçamento,
 * não a adição de um produto ao carrinho.
 *
 * Não dependemos de nenhuma empresa específica.
 */

if (
    /\b(quero\s+)?pedir\s+(um|uma|o|a|os|as)?\s*servi[cç]o(s)?\b/
        .test(normalized)
) {

    return false;

}



    /**
     * =====================================================
     * AÇÕES EXPLÍCITAS DE ADIÇÃO
     * =====================================================
     *
     * Estas palavras indicam diretamente que o cliente
     * pretende adicionar/colocar/acrescentar algo.
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
     * "QUERO" / "VOU QUERER"
     * =====================================================
     *
     * Só consideramos adição quando existe algo que
     * realmente parece um item sendo pedido logo depois.
     *
     * Exemplos válidos:
     *
     * "quero 2 burgers"
     * "quero um burger"
     * "quero burger"
     * "vou querer uma coca"
     *
     * Exemplos inválidos:
     *
     * "quero ver o carrinho"
     * "quero ver o menu"
     * "quero fazer um pedido"
     * "quero falar com uma pessoa"
     */


    const wantMatch =
        normalized.match(
            /^(quero|vou querer)\s+(.+)$/i
        );


    if (
        !wantMatch
    ) {

        return false;

    }


    const requested =
        wantMatch[2]
            .trim();


    if (!requested) {
        return false;
    }


    /**
     * Verbos/estruturas que indicam que o cliente está
     * falando sobre uma ação, consulta ou fluxo,
     * e não adicionando um produto.
     */


    const nonProductPatterns = [

        /^(ver|mostrar|mostra|consultar|consultar|saber)\b/,

        /^(fazer|efetuar|realizar)\s+(um|uma)?\s*(pedido|compra)\b/,

        /^(falar|conversar)\s+(com|com uma|com um)\b/,

        /^(pedir)\s+(informação|informacoes|informações|ajuda)\b/,

        /^(saber|ver)\s+(o|a|os|as)?\s*(menu|carrinho|total|preço|preco|valor)\b/

    ];


    if (
        nonProductPatterns.some(
            pattern =>
                pattern.test(requested)
        )
    ) {

        return false;

    }


    /**
     * =====================================================
     * CASOS NATURAIS DE "QUERO"
     * =====================================================
     *
     * Se não parece uma instrução de consulta/fluxo,
     * mantemos "quero X" como potencial adição.
     *
     * A resolução real do produto continua sendo feita
     * posteriormente pelos serviços da empresa.
     */


    return true;

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
 * AÇÃO DE ALTERAR QUANTIDADE
 * =========================================================
 */

function isQuantityEditAction(
    text,
    state,
    quantity
) {

    const normalized =
        normalizeForComparison(text);

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
        /\b(fica|passa|muda|altera|modifica)\b/.test(normalized) &&
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
        'solicita',
        'solicitar',

        'preciso de',
        'gostaria de',
        'gostaria do',
        'gostaria da',

        'preciso do',
        'preciso da',

        'quero um servico',
        'quero uma servico',
        'quero servico',

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
            /^(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|\d+)\s+/,
            ''
        );


    /**
     * Remove artigos após limpeza dos prefixos.
     */

    value =
        value.replace(
            /^(o|a|os|as|um|uma|uns|umas)\s+/,
            ''
        );


    /**
     * Remove artigos novamente.
     */

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

        /^quero solicitar\s+/,
        /^solicita\s+/,
        /^solicitar\s+/,

        /^preciso de\s+/,
        /^gostaria de\s+/,
        /^gostaria do\s+/,
        /^gostaria da\s+/

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
 * Extrai um item quando o utilizador envia diretamente
 * o nome de um produto/serviço dentro de um estado de
 * seleção.
 *
 * IMPORTANTE:
 *
 * Não devemos transformar palavras genéricas ou comandos
 * conversacionais em candidatos.
 *
 * Exemplos que NÃO são candidatos:
 *
 * "quero ver tudo"
 * "menu"
 * "quero ver o menu"
 * "quero fazer um pedido"
 * "quero falar com uma pessoa"
 * "isso"
 * "aquilo"
 * "sim"
 * "não"
 *
 * A resolução real do produto/serviço continua dependente
 * dos dados da empresa.
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


    /**
     * =====================================================
     * LIMITE DE TAMANHO
     * =====================================================
     */

    if (
        normalized.length > 80
    ) {

        return null;

    }


    /**
     * =====================================================
     * RESPOSTAS CONVERSACIONAIS
     * =====================================================
     */

    if (
        isAffirmative(normalized) ||
        isNegative(normalized) ||
        isBackAction(normalized)
    ) {

        return null;

    }


    /**
     * =====================================================
     * APENAS NÚMERO
     * =====================================================
     */

    if (
        /^\d+$/.test(normalized)
    ) {

        return null;

    }


    /**
     * =====================================================
     * PERGUNTAS GENÉRICAS
     * =====================================================
     */

    if (
        /^(quanto|qual|onde|como|quando|tem|tens|voces|voce)\b/
            .test(normalized)
    ) {

        return null;

    }


    /**
     * =====================================================
     * INTENÇÕES / COMANDOS GENÉRICOS
     * =====================================================
     *
     * Estes textos representam intenção conversacional,
     * não nomes de produtos ou serviços.
     *
     * Isto evita falsos candidatos como:
     *
     * "quero ver tudo"
     * "quero ver o menu"
     * "quero fazer um pedido"
     * "quero falar com uma pessoa"
     */

    const genericIntentPatterns = [

        /^quero ver\b/,

        /^quero olhar\b/,

        /^quero conhecer\b/,

        /^quero saber\b/,

        /^quero fazer\b/,

        /^quero falar\b/,

        /^quero conversar\b/,

        /^quero pedir\b/,

        /^quero solicitar\b/,

        /^quero um pedido\b/,

        /^quero o pedido\b/,

        /^quero o menu\b/,

        /^quero menu\b/,

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

        /^falar com uma pessoa\b/,

        /^falar com alguem\b/,

        /^falar com alguém\b/,

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


    /**
     * =====================================================
     * REFERÊNCIAS VAGAS
     * =====================================================
     */

    const vagueReferencePatterns = [

        /^(isso|isto|aquilo|esse|essa|este|esta|aquele|aquela)$/,

        /^(ele|ela|eles|elas)$/,

        /^(esse aqui|essa aqui|este aqui|esta aqui)$/,

        /^(o mesmo|a mesma)$/,

        /^(qualquer um|qualquer uma)$/,

        /^(qualquer coisa)$/,

        /^(qualquer)$/,

        /^(tudo|nada)$/,

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
        normalizeForComparison(text);

    if (!normalized) {
        return null;
    }


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
 * EXTRAI CANDIDATO DE PRODUTO PARA ALTERAÇÃO DE QUANTIDADE
 * =========================================================
 *
 * Exemplos:
 *
 * "fica só 1 chicken"
 * "fica 2 batatas"
 * "deixa 1 refrigerante"
 * "passa o chicken para 1"
 * "muda batata para 2"
 *
 * Retorna apenas o candidato linguístico.
 *
 * Não resolve produto no banco.
 * =========================================================
 */

function extractQuantityProductCandidate(text) {

    let normalized =
        normalizeForComparison(text);

    if (!normalized) {
        return null;
    }


    /*
     * Remove estruturas de alteração.
     */

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


    /*
     * Remove expressões de quantidade.
     */

    normalized =
        normalized
            .replace(
                /\b(para|em|com)\b\s*/i,
                ''
            )
            .replace(
                /\b\d+\b/,
                ''
            )
            .replace(
                /\b(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\b/i,
                ''
            );


    /*
     * Remove "só".
     */

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
        normalizeForComparison(text);


    /**
     * =========================================================
     * INTENÇÕES EXPLÍCITAS
     * =========================================================
     *
     * Quando o intentService já identificou claramente a
     * intenção, essa intenção deve ter prioridade sobre
     * candidatos contextuais.
     *
     * Isto evita casos como:
     *
     * "quero ver tudo"
     * → serviceCandidate falso positivo
     * → target: service
     *
     * A intenção explícita deve vencer.
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
     * =========================================================
     * CARRINHO / TOTAL
     * =========================================================
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
     * =========================================================
     * SERVIÇO
     * =========================================================
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
     * =========================================================
     * PRODUTO
     * =========================================================
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
     * =========================================================
     * QUANTIDADE
     * =========================================================
     */

    if (
        extractQuantityTarget(
            normalized
        )
    ) {

        return 'quantity';

    }


    /**
     * =========================================================
     * PEDIDO EM CONFIRMAÇÃO
     * =========================================================
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
        normalizeForComparison(text);


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
     * PEDIDO DE SERVIÇO
     */

    if (
        intent === 'SERVICE_REQUEST'
    ) {

        return 'request_service';

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
     * SELECIONAR SERVIÇO
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
 * =========================================================
 * ATENDIMENTO HUMANO
 * =========================================================
 *
 * HUMAN é a intenção moderna usada pelo intentService.
 * ATTENDANT é mantido por compatibilidade com classificações
 * anteriores.
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


    return 'unknown';
}


/**
 * =========================================================
 * EXTRAI PRODUTO ANTIGO E PRODUTO DE SUBSTITUIÇÃO
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
 * EXTRAI MÚLTIPLOS CANDIDATOS DE ADIÇÃO
 * =========================================================
 *
 * Esta função é importante para mensagens como:
 *
 * "Quero chicken e batata"
 *
 * "Quero chicken, batata e refrigerante"
 *
 * "Manda duas pizzas e uma água"
 *
 * O Knowledge Engine não resolve os produtos.
 *
 * Apenas separa candidatos linguísticos.
 *
 * IMPORTANTE:
 *
 * Não fazemos simplesmente:
 *
 * text.split(' e ')
 *
 * porque nomes de produtos podem conter "e".
 *
 * A divisão é feita somente quando a primeira parte
 * demonstra claramente intenção de adicionar.
 * =========================================================
 */

function extractMultipleAddCandidates(text) {

    const normalized =
        normalizeForComparison(text);

    if (!normalized) {
        return [];
    }


    /**
     * Primeiro tratamos vírgulas.
     */

    const commaParts =
        normalized
            .split(/\s*,\s*/)
            .map(
                part =>
                    part.trim()
            )
            .filter(Boolean);


    /**
     * Se houver vírgulas, cada parte pode representar
     * um item independente.
     *
     * Exemplo:
     *
     * "quero chicken, batata, refrigerante"
     */

    if (
        commaParts.length > 1
    ) {

        const candidates = [];

        for (
            const part
            of commaParts
        ) {

            const candidate =
                cleanItemCandidate(
                    part
                );

            if (
                candidate
            ) {

                candidates.push({
                    candidate,

                    quantity:
                        extractQuantity(part)
                });

            }

        }


        if (
            candidates.length > 1
        ) {

            return candidates;

        }

    }


    /**
     * Detecta uma intenção de adição no início.
     *
     * Exemplos:
     *
     * "quero chicken e batata"
     * "manda chicken e batata"
     * "adiciona chicken e batata"
     * "vou querer chicken e batata"
     */

    const addPrefixMatch =
        normalized.match(
            /^(quero|vou querer|manda|mandar|adiciona|adicionar|acrescenta|acrescentar|coloca|colocar|pode adicionar|pode colocar|quero pedir|peço|peco|pede|pedir)\s+(.+)$/i
        );


    let prefix = '';
    let remaining = normalized;

    if (addPrefixMatch) {

        prefix =
            addPrefixMatch[1];

        remaining =
            addPrefixMatch[2]
                .trim();

    } else {

        const directParts =
            normalized
                .split(/\s*(?:\+|\be\b|tambem|também)\s*/i)
                .map(
                    part =>
                        part.trim()
                )
                .filter(Boolean);

        if (directParts.length < 2) {

            return [];

        }

        const directCandidates = [];

        for (
            const part
            of directParts
        ) {

            const candidate =
                cleanItemCandidate(
                    part
                );

            if (!candidate) {
                continue;
            }

            directCandidates.push({

                candidate,

                quantity:
                    extractQuantity(part)

            });

        }

        if (
            directCandidates.length < 2
        ) {

            return [];

        }

        return directCandidates;

    }


    /**
     * Separação conservadora.
     *
     * Depois de uma intenção explícita de adicionar,
     * " e " pode representar outro item.
     *
     * Não dividimos quando não existe intenção clara
     * de adicionar.
     */

    const parts =
        remaining
                .split(/\s*(?:\+|\be\b|tambem|também)\s*/i)            
                .map(
                part =>
                    part.trim()
            )
            .filter(Boolean);


    /**
     * Se não houve separação, não é mensagem composta.
     */

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
         * A primeira parte pode ainda conter o prefixo.
         */

        if (
            index === 0
        ) {

            part =
                `${prefix} ${part}`;

        }


        const candidate =
            cleanItemCandidate(
                part
            );


        if (!candidate) {
            continue;
        }


        candidates.push({

            candidate,

            quantity:
                extractQuantity(part)

        });

    }


    /**
     * Só consideramos composto quando temos pelo menos
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
 *
 * Exemplos:
 *
 * "tira a coca e coloca duas fanta"
 *
 * "remove a coca e adiciona duas fanta"
 *
 * "quero chicken e batata"
 *
 * "troca a coca por fanta"
 *
 * A resolução concreta dos produtos continua no
 * productService/botEngine.
 * =========================================================
 */

function detectCompoundActions(text, intent = null) {

    const normalized =
        normalizeForComparison(text);

    if (!normalized) {

        return [];

    }


    if (intent === "SERVICE_REQUEST") {

        return [];

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
     * IMPORTANTE:
     *
     * Esta verificação acontece antes do split genérico.
     *
     * Isso corrige:
     *
     * "Quero chicken e batata"
     */

    const multipleAddActions =
        detectMultipleAddActions(
            normalized
        );


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
     * SEPARAÇÃO DE AÇÕES COMPOSTAS
     * =====================================================
     *
     * Exemplo:
     *
     * "remove a coca e adiciona uma fanta"
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
     * ANALISA CADA PARTE
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
                                  type:
                                      'candidate',

                                  value:
                                      candidate
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


let quantityProductCandidate = null;


/*
 * Tenta identificar o produto mencionado
 * juntamente com a alteração de quantidade.
 */

quantityProductCandidate =
    cleanItemCandidate(
        segment
    );


/*
 * Remove a estrutura específica da alteração
 * de quantidade.
 */

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
            /\bso\b/gi,
            ''
        )
        .replace(
            /\s+/g,
            ' '
        )
        .trim();


actions.push({

    type:
        'change_quantity',

    quantity,

    target:
        position !== null

            ? {
                  type:
                      'position',

                  value:
                      position
              }

            : reference

                ? reference

                : quantityProductCandidate

                    ? {
                          type:
                              'candidate',

                          value:
                              quantityProductCandidate
                      }

                    : {
                          type:
                              'current'
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

            const candidate =
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
     * CONFIRMAÇÃO CONTEXTUAL
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
     * NEGAÇÃO CONTEXTUAL
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
     * REFERÊNCIA COMO CONFIRMAÇÃO
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
     * CONFIRMAÇÃO EXPLÍCITA
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
     * REFERÊNCIA COM CONTEXTO
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
     * INTENÇÃO EXPLÍCITA
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
     * UNKNOWN
     */

    return {

        intent: 'UNKNOWN',

        confidence:
            detected?.confidence ?? 0,

        source:
            'unknown'

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
        detectIntent(
            message
        );


    const resolved =
        resolveContextualIntent({

            detected,

            message,

            state,

            context

        });


    const normalizedMessage =
        normalizeForComparison(
            message
        );


    /**
     * =====================================================
     * ENTIDADES BÁSICAS
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


    /**
     * =====================================================
     * AÇÕES COMPOSTAS
     * =====================================================
     */

    const compoundActions =
        detectCompoundActions(
            normalizedMessage,
            resolved.intent
        );


    const hasCompoundCartAction =
    compoundActions.length > 1;

const hasQuantityChangeAction =
    compoundActions.some(
        action =>
            action.type === 'change_quantity'
    );

    /**
     * =====================================================
     * CANDIDATOS DE PRODUTOS
     * =====================================================
     *
     * Exemplo:
     *
     * "Quero chicken e batata"
     *
     * productCandidates:
     *
     * [
     *   "chicken",
     *   "batata"
     * ]
     *
     * O candidato singular continua disponível para
     * compatibilidade com o fluxo existente.
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
 * CANDIDATOS DE PRODUTO / SERVIÇO
 * =====================================================
 *
 * Intenções explícitas de navegação/conversa não devem
 * gerar candidatos genéricos.
 *
 * Exemplos:
 *
 * "quero ver o menu"
 * "quero ver os serviços"
 * "quero falar com uma pessoa"
 * "quero fazer um pedido"
 *
 * Nestes casos a intenção já está identificada.
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


const productCandidate =
    explicitNonItemIntent

        ? null

        : (
            hasMultipleProductCandidates

                ? null

                : extractProductCandidate(
                      normalizedMessage,
                      state
                  )
        );


const serviceCandidate =
    explicitNonItemIntent || productCandidate
        ? null
        : extractServiceCandidate(
              normalizedMessage,
              state
          );


    /**
     * =====================================================
     * SUBSTITUIÇÃO
     * =====================================================
     */

    const replacementCandidates =
        extractReplacementCandidates(
            normalizedMessage
        );


    /**
     * =====================================================
     * DEBUG
     * =====================================================
     */

    console.log(
        '🔎 COMPOUND DEBUG:',
        JSON.stringify(
            compoundActions,
            null,
            2
        )
    );


    console.log(
        '🔎 hasCompoundCartAction:',
        hasCompoundCartAction
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

        message,

        normalizedText:
            detected.normalizedText ||
            detected.text ||
            normalizeText(message),


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
             * Compatibilidade com o fluxo existente.
             *
             * Se houver vários produtos, fica null.
             */

            productCandidate,


            /**
             * NOVO:
             *
             * Lista de candidatos de produtos.
             */

            productCandidates,


            /**
             * NOVO:
             *
             * Indica se existem múltiplos produtos.
             */

            hasMultipleProductCandidates,


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
    
    cleanItemCandidate


};