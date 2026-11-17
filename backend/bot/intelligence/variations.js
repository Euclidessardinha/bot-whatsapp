/**
 * =========================================================
 * VARIAÇÕES DE RESPOSTA
 * =========================================================
 */

const responseVariations = {

    greeting: [

        'Olá! 😊 Como posso ajudar?',

        'Olá! Seja bem-vindo(a)! 👋',

        'Olá! 😊 Em que posso ajudar?',

        'Seja bem-vindo(a)! O que gostarias de fazer?'
    ],

    returningGreeting: [

        'Olá novamente! 😊 Como posso ajudar?',

        'Que bom ter-te de volta! 👋',

        'Olá! 😊 O que vamos fazer desta vez?',

        'Olá novamente! Em que posso ajudar?'
    ],

    thanks: [

        'De nada! 😊',

        'Sempre às ordens! 🙌',

        'Foi um prazer ajudar! 😊',

        'Estamos aqui para ajudar. 🤝'
    ],

    goodbye: [

        'Até logo! 👋',

        'Até breve! 😊',

        'Obrigado pelo contacto. Até à próxima! 👋',

        'Foi um prazer atender-te. Até logo! 😊'
    ],

    unknown: [

        '🤔 Não consegui entender exatamente o que precisas.',

        'Hmm... não consegui perceber a tua mensagem. 😊',

        'Desculpa, não entendi. Podes explicar de outra forma?',

        'Não consegui identificar o que procuras. 😊'
    ],

    confirmation: [

        'Perfeito! 👍',

        'Ótimo! 😊',

        'Combinado! 🙌',

        'Perfeito, vamos avançar. 👍'
    ],

    denial: [

        'Tudo bem! 😊',

        'Sem problema.',

        'Está bem, sem problemas. 👍',

        'Claro, sem problema.'
    ]
};


/**
 * Evita repetir imediatamente a mesma resposta.
 */

function chooseVariation(
    type,
    previousResponse = null
) {

    const options =
        responseVariations[type] || [];


    if (
        options.length === 0
    ) {

        return null;
    }


    let available =
        options;


    if (
        previousResponse &&
        options.length > 1
    ) {

        available =
            options.filter(
                response =>
                    response !==
                    previousResponse
            );
    }


    const index =
        Math.floor(
            Math.random() *
            available.length
        );


    return available[index];
}


module.exports = {

    responseVariations,

    chooseVariation
};