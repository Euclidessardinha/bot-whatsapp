const situations = {

    // =========================================================
    // CONVERSAÇÃO
    // =========================================================

    GREETING: {
        intent: 'greeting',
        behavior: 'WELCOME_CUSTOMER'
    },

    GREETING_WITH_CONTEXT: {
        intent: 'greeting',
        behavior: 'WELCOME_RETURNING_CUSTOMER'
    },

    PRICE: {
        intent: 'price',
        behavior: 'SHOW_RELEVANT_PRICES'
    },

    MENU: {
        intent: 'menu',
        behavior: 'SHOW_MENU'
    },

    ORDER: {
        intent: 'order',
        behavior: 'START_ORDER'
    },

    SERVICE: {
        intent: 'services',
        behavior: 'SHOW_SERVICES'
    },

    SERVICE_REQUEST: {
        intent: 'service_request',
        behavior: 'START_SERVICE_REQUEST'
    },

    LOCATION: {
        intent: 'location',
        behavior: 'SHOW_LOCATION'
    },

    HOURS: {
        intent: 'hours',
        behavior: 'SHOW_BUSINESS_HOURS'
    },

    HUMAN: {
        intent: 'attendant',
        behavior: 'TRANSFER_TO_HUMAN'
    },

    HELP: {
        intent: 'help',
        behavior: 'HELP_CUSTOMER'
    },

    THANKS: {
        intent: 'thanks',
        behavior: 'RESPOND_TO_THANKS'
    },

    GOODBYE: {
        intent: 'goodbye',
        behavior: 'GOODBYE'
    },

    CANCEL: {
        intent: 'cancel',
        behavior: 'CANCEL_FLOW'
    },

    CONFIRM: {
        intent: 'confirm',
        behavior: 'USE_CONTEXT_CONFIRMATION'
    },

    DENY: {
        intent: 'deny',
        behavior: 'USE_CONTEXT_DENIAL'
    },

    UNKNOWN: {
        intent: 'unknown',
        behavior: 'HANDLE_UNKNOWN'
    }
};


// =========================================================
// MAPA DE INTENÇÕES
// =========================================================

const intentMap = {
    greeting: 'GREETING',
    price: 'PRICE',
    menu: 'MENU',
    order: 'ORDER',
    service: 'SERVICE',
    services: 'SERVICE',
    service_request: 'SERVICE_REQUEST',
    location: 'LOCATION',
    hours: 'HOURS',
    human: 'HUMAN',
    attendant: 'HUMAN',
    help: 'HELP',
    thanks: 'THANKS',
    goodbye: 'GOODBYE',
    cancel: 'CANCEL',
    confirm: 'CONFIRM',
    deny: 'DENY',
    unknown: 'UNKNOWN'
};


// =========================================================
// ESTADOS COM CONTEXTO ATIVO
// =========================================================

const ACTIVE_STATES = new Set([
    'viewing_menu',
    'product_menu',
    'waiting_product',
    'viewing_product',
    'waiting_quantity',
    'cart_menu',
    'editing_cart',
    'editing_cart_item',
    'viewing_services',
    'viewing_service',
    'service_request',
    'confirming_order'
]);


// =========================================================
// RESOLUÇÃO DA SITUAÇÃO
// =========================================================

function getSituation(intent, state = 'idle') {

    const normalizedIntent =
        String(intent || 'unknown')
            .trim()
            .toLowerCase();

    const normalizedState =
        String(state || 'idle')
            .trim()
            .toLowerCase();


    // ---------------------------------------------------------
    // CONFIRMAÇÃO / NEGAÇÃO COM CONTEXTO
    // ---------------------------------------------------------

    if (
        normalizedIntent === 'confirm' &&
        normalizedState !== 'idle'
    ) {
        return {
            key: 'CONFIRM',
            ...situations.CONFIRM,
            state: normalizedState,
            activeFlow: true
        };
    }


    if (
        normalizedIntent === 'deny' &&
        normalizedState !== 'idle'
    ) {
        return {
            key: 'DENY',
            ...situations.DENY,
            state: normalizedState,
            activeFlow: true
        };
    }


    // ---------------------------------------------------------
    // SITUAÇÃO NORMAL
    // ---------------------------------------------------------

    const key =
        intentMap[normalizedIntent] ||
        'UNKNOWN';


    // ---------------------------------------------------------
    // SAUDAÇÃO DURANTE UM FLUXO
    // ---------------------------------------------------------

    if (
        key === 'GREETING' &&
        ACTIVE_STATES.has(normalizedState)
    ) {
        return {
            key: 'GREETING_WITH_CONTEXT',
            ...situations.GREETING_WITH_CONTEXT,
            state: normalizedState,
            activeFlow: true
        };
    }


    // ---------------------------------------------------------
    // RESULTADO
    // ---------------------------------------------------------

    return {
        key,
        ...(situations[key] || situations.UNKNOWN),
        state: normalizedState,
        activeFlow: ACTIVE_STATES.has(normalizedState)
    };
}


module.exports = {
    situations,
    getSituation,
    intentMap,
    ACTIVE_STATES
};