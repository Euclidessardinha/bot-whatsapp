/**
 * =========================================================
 * SITUAÇÕES CONVERSACIONAIS
 * =========================================================
 */

const situations = {

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


function getSituation(
    intent,
    state = 'idle'
) {

    /**
     * SIM durante um fluxo
     */
    if (
        intent === 'confirm' &&
        state !== 'idle'
    ) {

        return {
            key: 'CONFIRM',
            ...situations.CONFIRM
        };
    }


    /**
     * NÃO durante um fluxo
     */
    if (
        intent === 'deny' &&
        state !== 'idle'
    ) {

        return {
            key: 'DENY',
            ...situations.DENY
        };
    }


    const map = {

        greeting: 'GREETING',
        price: 'PRICE',
        menu: 'MENU',
        order: 'ORDER',
        services: 'SERVICE',
        service_request: 'SERVICE_REQUEST',
        location: 'LOCATION',
        hours: 'HOURS',
        attendant: 'HUMAN',
        help: 'HELP',
        thanks: 'THANKS',
        goodbye: 'GOODBYE',
        cancel: 'CANCEL',
        unknown: 'UNKNOWN'
    };


    const key =
        map[intent] || 'UNKNOWN';


    /**
     * Saudação durante conversa existente
     */
    if (
        key === 'GREETING' &&
        state !== 'idle'
    ) {

        return {
            key: 'GREETING_WITH_CONTEXT',
            ...situations.GREETING_WITH_CONTEXT
        };
    }


    return {
        key,
        ...situations[key]
    };
}


module.exports = {
    situations,
    getSituation
};