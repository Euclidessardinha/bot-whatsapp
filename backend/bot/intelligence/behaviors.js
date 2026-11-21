const behaviors = {

    // =========================================================
    // COMPORTAMENTOS CONVERSACIONAIS
    // =========================================================

    WELCOME_CUSTOMER: {
        clearState: true,
        showMenu: true,
        varyResponse: true
    },

    WELCOME_RETURNING_CUSTOMER: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    SHOW_RELEVANT_PRICES: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    SHOW_MENU: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    START_ORDER: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    SHOW_SERVICES: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    START_SERVICE_REQUEST: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    SHOW_LOCATION: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    SHOW_BUSINESS_HOURS: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    TRANSFER_TO_HUMAN: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    HELP_CUSTOMER: {
        clearState: false,
        showMenu: true,
        varyResponse: true
    },

    RESPOND_TO_THANKS: {
        clearState: false,
        showMenu: true,
        varyResponse: true
    },

    GOODBYE: {
        clearState: true,
        showMenu: false,
        varyResponse: true
    },

    CANCEL_FLOW: {
        clearState: true,
        showMenu: true,
        varyResponse: true
    },

    USE_CONTEXT_CONFIRMATION: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    USE_CONTEXT_DENIAL: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    HANDLE_UNKNOWN: {
        clearState: false,
        showMenu: true,
        varyResponse: true
    },


    // =========================================================
    // OPERAÇÕES DE PRODUTO / CARRINHO
    // =========================================================

    ADD_PRODUCT: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    REMOVE_PRODUCT: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    REPLACE_PRODUCT: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    CHANGE_QUANTITY: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    SELECT_PRODUCT: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    ASK_TOTAL: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    CONFIRM_ORDER: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    CANCEL_ORDER: {
        clearState: true,
        showMenu: true,
        varyResponse: true
    },

    GO_BACK: {
        clearState: false,
        showMenu: true,
        varyResponse: true
    },

    COMPOSITE_CART_ACTION: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },


    // =========================================================
    // OPERAÇÕES DE SERVIÇO
    // =========================================================

    SELECT_SERVICE: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    REQUEST_SERVICE: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    ASK_PRICE: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    },

    HUMAN_SUPPORT: {
        clearState: false,
        showMenu: false,
        varyResponse: true
    }
};


// =========================================================
// NORMALIZAÇÃO
// =========================================================

function normalizeBehaviorName(behaviorName) {
    return String(behaviorName || '')
        .trim()
        .toUpperCase();
}


// =========================================================
// RESOLUÇÃO
// =========================================================

function getBehavior(behaviorName) {

    const key =
        normalizeBehaviorName(behaviorName);

    return (
        behaviors[key] ||
        behaviors.HANDLE_UNKNOWN
    );
}


module.exports = {
    behaviors,
    getBehavior,
    normalizeBehaviorName
};