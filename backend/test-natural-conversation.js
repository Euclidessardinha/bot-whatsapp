
require('dotenv').config();

const {
    processMessage,
    getCompany
} = require('./bot/botEngine');

const {
    getConversationState,
    clearConversationState
} = require('./services/conversationStateService');

const {
    getOrCreateCustomer
} = require('./services/customerService');

const {
    getOrCreateConversation
} = require('./services/conversationService');

const {
    getBotSettings
} = require('./services/botSettingsService');


// =========================================================
// CONFIGURAÇÃO
// =========================================================

const companyId =
    process.env.TEST_COMPANY_ID ||
    process.env.COMPANY_ID;

const customerPhone =
    process.env.TEST_CUSTOMER_PHONE ||
    '258851023441';

if (!companyId) {
    console.error(
        '❌ TEST_COMPANY_ID ou COMPANY_ID não definido.'
    );

    process.exit(1);
}


// =========================================================
// CENÁRIOS
// =========================================================

const scenarios = [

    {
        name: '01 - ADICIONAR PRODUTOS',
        messages: [
            'quero um chicken',
            'adiciona uma batata',
            'manda um refrigerante'
        ]
    },

    {
        name: '02 - QUANTIDADES',
        messages: [
            'quero 2 chicken',
            'adiciona mais 1 chicken',
            'fica só 1 chicken'
        ]
    },

    {
        name: '03 - REMOVER PRODUTOS',
        messages: [
            'quero 2 chicken',
            'adiciona uma batata',
            'tira a batata'
        ]
    },

    {
        name: '04 - TOTAL',
        messages: [
            'quero 2 chicken',
            'adiciona uma batata',
            'quanto deu?'
        ]
    },

    {
        name: '05 - LINGUAGEM NATURAL',
        messages: [
            'olá',
            'quero pedir qualquer coisa',
            'o que tens?',
            'manda 2 chicken e uma batata',
            'afinal tira a batata',
            'mete mais um chicken',
            'quanto fica?'
        ]
    },

    {
        name: '06 - ALTERAÇÕES NATURAIS',
        messages: [
            'quero 2 chicken',
            'espera',
            'deixa só um',
            'não, afinal quero 2',
            'adiciona uma batata',
            'remove a batata',
            'fica só 1 chicken'
        ]
    },

    {
        name: '07 - REFERÊNCIA AO ÚLTIMO PRODUTO',
        messages: [
            'quero um chicken',
            'quero mais um',
            'adiciona mais um',
            'tira esse',
            'quero outro chicken'
        ]
    },

    {
        name: '08 - CANCELAMENTO',
        messages: [
            'quero 2 chicken',
            'adiciona uma batata',
            'não quero mais',
            'cancela'
        ]
    },

    {
        name: '09 - COMPOSTO',
        messages: [
            'quero 2 chicken e uma batata',
            'tira a batata e adiciona refrigerante'
        ]
    },

    {
        name: '10 - CONVERSA COMPLETA',
        messages: [
            'olá',
            'quero pedir alguma coisa',
            'o que tens?',
            'manda 2 chicken',
            'adiciona uma batata',
            'mete um refrigerante',
            'afinal tira a batata',
            'quero mais um chicken',
            'fica só 2 chicken',
            'quanto fica?',
            'está bom',
            'pode finalizar'
        ]
    },

    {
        name: '11 - VARIAÇÕES DE QUANTIDADE',
        messages: [
            'quero um chicken',
            'adiciona dois chicken',
            'deixa 1 chicken',
            'coloca 3 chicken',
            'fica só 2 chicken'
        ]
    },

    {
        name: '12 - VARIAÇÕES DE REMOÇÃO',
        messages: [
            'quero um chicken',
            'adiciona uma batata',
            'remove a batata',
            'adiciona outra batata',
            'não quero a batata',
            'tira o chicken'
        ]
    },

    {
        name: '13 - CONSULTA DE PREÇO',
        messages: [
            'quanto custa o chicken?',
            'e a batata?',
            'quanto custa o refrigerante?'
        ]
    },

    {
        name: '14 - CONTEXTO NATURAL',
        messages: [
            'quero um chicken',
            'e mais um',
            'agora adiciona batata',
            'quero mais uma',
            'tira essa',
            'mete refrigerante'
        ]
    },

    {
        name: '15 - FLUXO REAL DE PEDIDO',
        messages: [
            'boa tarde',
            'quero fazer um pedido',
            'manda 2 chicken',
            'e uma batata',
            'e um refrigerante',
            'espera aí',
            'tira a batata',
            'adiciona mais um chicken',
            'fica só 2 chicken',
            'quanto vou pagar?',
            'está certo',
            'pode finalizar'
        ]
    }
];


// =========================================================
// HELPERS
// =========================================================

function separator(char = '=') {
    console.log('\n' + char.repeat(70));
}


function printState(label, state) {
    console.log(`\n${label}:`);

    if (!state) {
        console.log('null');
        return;
    }

    console.log(
        JSON.stringify(
            state,
            null,
            2
        )
    );
}


function printCart(state) {
    const cart =
        state?.context?.cart;

    if (!Array.isArray(cart)) {
        return;
    }

    console.log('\n🛒 CARRINHO:');

    if (!cart.length) {
        console.log('   vazio');
        return;
    }

    for (const item of cart) {
        console.log(
            `   ${item.quantity}x ${item.product_name} = ${item.subtotal} MT`
        );
    }

    console.log(
        `   TOTAL = ${state?.context?.total ?? 0} MT`
    );
}


async function runMessage(
    message,
    conversationId
) {
    separator('-');

    console.log('👤 Cliente:');
    console.log(message);

    const before =
        await getConversationState(
            companyId,
            conversationId
        );

    printState(
        '📥 Estado antes',
        before
    );

    let response;

    try {
        response =
            await processMessage(
                message,
                companyId,
                conversationId
            );
    } catch (error) {

        console.error(
            '\n❌ ERRO AO PROCESSAR MENSAGEM'
        );

        console.error(
            error?.stack ||
            error?.message ||
            error
        );

        return {
            ok: false,
            error
        };
    }

    console.log('\n🤖 Bot:');

    if (
        response === null ||
        response === undefined ||
        response === ''
    ) {
        console.log(
            '🔇 [SILÊNCIO / NULL]'
        );
    } else {
        console.log(response);
    }

    const after =
        await getConversationState(
            companyId,
            conversationId
        );

    printState(
        '📤 Estado depois',
        after
    );

    printCart(after);

    return {
        ok: true,
        response,
        before,
        after
    };
}


// =========================================================
// EXECUTAR CENÁRIO
// =========================================================

async function runScenario(
    scenario,
    customerId,
    conversationId
) {
    separator('=');

    console.log(
        `🧪 ${scenario.name}`
    );

    console.log(
        `📝 Mensagens: ${scenario.messages.length}`
    );

    separator('=');

    const results = [];

    for (
        let i = 0;
        i < scenario.messages.length;
        i++
    ) {

        console.log(
            `\n🗣️ MENSAGEM ${i + 1}/${scenario.messages.length}`
        );

        const result =
            await runMessage(
                scenario.messages[i],
                conversationId
            );

        results.push(result);

        if (!result.ok) {
            console.log(
                '\n🛑 Cenário interrompido devido a erro.'
            );

            break;
        }
    }

    return results;
}


// =========================================================
// MAIN
// =========================================================

async function main() {

    separator('=');

    console.log(
        '🧠 TESTE COMPLETO DE CONVERSA NATURAL'
    );

    separator('=');

    console.log(
        '🏢 Company ID:',
        companyId
    );

    console.log(
        '📱 Customer Phone:',
        customerPhone
    );


    // -----------------------------------------------------
    // EMPRESA
    // -----------------------------------------------------

    const company =
        await getCompany(
            companyId
        );

    console.log('\n🏢 EMPRESA:');

    console.log(
        JSON.stringify(
            company,
            null,
            2
        )
    );


    if (!company) {
        throw new Error(
            'Empresa não encontrada.'
        );
    }


    // -----------------------------------------------------
    // BOT SETTINGS
    // -----------------------------------------------------

    const botSettings =
        await getBotSettings(
            companyId
        );

    console.log('\n⚙️ BOT SETTINGS:');

    console.log(
        JSON.stringify(
            botSettings,
            null,
            2
        )
    );


    // -----------------------------------------------------
    // CUSTOMER
    // -----------------------------------------------------

    const customer =
        await getOrCreateCustomer(
            companyId,
            customerPhone
        );

    if (!customer) {
        throw new Error(
            'Não foi possível criar/localizar customer.'
        );
    }

    console.log(
        '\n👤 Customer ID:',
        customer.id
    );


    // -----------------------------------------------------
    // CONVERSATION
    // -----------------------------------------------------

    const conversation =
        await getOrCreateConversation(
            companyId,
            customer.id
        );

    if (!conversation) {
        throw new Error(
            'Não foi possível criar/localizar conversation.'
        );
    }

    console.log(
        '💬 Conversation ID:',
        conversation.id
    );


    // -----------------------------------------------------
    // MODO: UMA MENSAGEM
    // -----------------------------------------------------

    if (process.env.TEST_MESSAGE) {

        separator('=');

        console.log(
            '🧪 MODO: MENSAGEM ÚNICA'
        );

        separator('=');

        console.log(
            '📝 TEST_MESSAGE:',
            process.env.TEST_MESSAGE
        );

        await clearConversationState(
            companyId,
            conversation.id
        );

        await runMessage(
            process.env.TEST_MESSAGE,
            conversation.id
        );

        separator('=');

        console.log(
            '✅ TESTE TERMINADO'
        );

        separator('=');

        return;
    }


    // -----------------------------------------------------
    // MODO: CENÁRIO ESPECÍFICO
    // -----------------------------------------------------

    const requestedScenario =
        process.env.TEST_SCENARIO;

    if (requestedScenario) {

        const scenarioIndex =
            Number(requestedScenario) - 1;

        if (
            !Number.isInteger(scenarioIndex) ||
            !scenarios[scenarioIndex]
        ) {
            console.error(
                `❌ Cenário inválido: ${requestedScenario}`
            );

            console.log(
                '\nCenários disponíveis:'
            );

            scenarios.forEach(
                (scenario, index) => {
                    console.log(
                        `${index + 1}. ${scenario.name}`
                    );
                }
            );

            process.exit(1);
        }

        const scenario =
            scenarios[scenarioIndex];

        await clearConversationState(
            companyId,
            conversation.id
        );

        await runScenario(
            scenario,
            customer.id,
            conversation.id
        );

        separator('=');

        console.log(
            `✅ CENÁRIO ${requestedScenario} TERMINADO`
        );

        separator('=');

        return;
    }


    // -----------------------------------------------------
    // MODO: TODOS OS CENÁRIOS
    // -----------------------------------------------------

    console.log(
        `\n🧪 MODO: TODOS OS CENÁRIOS`
    );

    console.log(
        `📝 Total de cenários: ${scenarios.length}`
    );


    const summary = [];


    for (
        let i = 0;
        i < scenarios.length;
        i++
    ) {

        const scenario =
            scenarios[i];

        console.log(
            `\n\n🚀 EXECUTANDO ${i + 1}/${scenarios.length}: ${scenario.name}`
        );


        // Cada cenário começa com
        // o estado limpo.
        await clearConversationState(
            companyId,
            conversation.id
        );


        const results =
            await runScenario(
                scenario,
                customer.id,
                conversation.id
            );


        const failed =
            results.some(
                result =>
                    !result.ok
            );


        summary.push({
            scenario: scenario.name,
            messages: scenario.messages.length,
            status: failed
                ? 'FAILED'
                : 'PASSED'
        });
    }


    // -----------------------------------------------------
    // RESUMO FINAL
    // -----------------------------------------------------

    separator('=');

    console.log(
        '🏁 RESUMO FINAL DOS TESTES'
    );

    separator('=');


    for (const item of summary) {

        const icon =
            item.status === 'PASSED'
                ? '✅'
                : '❌';

        console.log(
            `${icon} ${item.scenario} — ${item.status}`
        );
    }


    const passed =
        summary.filter(
            item =>
                item.status === 'PASSED'
        ).length;

    const failed =
        summary.filter(
            item =>
                item.status === 'FAILED'
        ).length;


    separator('-');

    console.log(
        `📊 PASSARAM: ${passed}/${summary.length}`
    );

    console.log(
        `❌ FALHARAM: ${failed}/${summary.length}`
    );


    separator('=');

    console.log(
        failed === 0
            ? '🎉 TODOS OS CENÁRIOS TERMINARAM SEM ERROS DE EXECUÇÃO.'
            : '⚠️ EXISTEM CENÁRIOS COM ERROS.'
    );

    separator('=');
}


main()
    .catch(error => {

        console.error(
            '\n💥 ERRO FATAL'
        );

        console.error(
            error?.stack ||
            error?.message ||
            error
        );

        process.exit(1);
    });
