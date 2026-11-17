/**
 * =========================================================
 * COMPORTAMENTOS
 * =========================================================
 */

const behaviors = {

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
    }
};


function getBehavior(
    behaviorName
) {

    return (
        behaviors[behaviorName] ||
        behaviors.HANDLE_UNKNOWN
    );
}


module.exports = {
    behaviors,
    getBehavior
};