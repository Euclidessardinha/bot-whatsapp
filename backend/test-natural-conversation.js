
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
    getOrCreateConversation
} = require('./services/conversationService');

const {
    getOrCreateCustomer
} = require('./services/customerService');

const {
    getBotSettings
} = require('./services/botSettingsService');


async function main() {

    /**
     * =====================================================
     * CONFIGURAÇÃO DO TESTE
     * =====================================================
     *
     * NÃO colocar company_id fixo no código.
     *
     * Defina no terminal:
     *
     * $env:TEST_COMPANY_ID="..."
     *
     * $env:TEST_CUSTOMER_PHONE="..."
     *
     * Opcional:
     *
     * $env:TEST_MESSAGE="Quero 2 chicken"
     *
     * Se TEST_MESSAGE existir, o teste processará
     * somente essa mensagem.
     *
     * Se TEST_MESSAGE NÃO existir, será executada
     * a conversa completa abaixo.
     */

    const companyId =
        process.env.TEST_COMPANY_ID ||
        process.env.COMPANY_ID;

    if (!companyId) {
        throw new Error(
            '❌ Defina TEST_COMPANY_ID ou COMPANY_ID no ambiente.'
        );
    }

    const customerPhone =
        process.env.TEST_CUSTOMER_PHONE;

    if (!customerPhone) {
        throw new Error(
            '❌ Defina TEST_CUSTOMER_PHONE no ambiente.'
        );
    }

    const customer =
        await getOrCreateCustomer(
            companyId,
            customerPhone
        );

    if (!customer) {
        throw new Error(
            '❌ Não foi possível obter/criar o cliente.'
        );
    }

    const conversation =
        await getOrCreateConversation(
            companyId,
            customer.id
        );

    if (!conversation) {
        throw new Error(
            '❌ Não foi possível obter/criar a conversa.'
        );
    }

    const conversationId =
        conversation.id;

    console.log('\n========================================');
    console.log('🧠 TESTE DE CONVERSA NATURAL');
    console.log('========================================\n');

    console.log('🏢 Company ID:', companyId);
    console.log('👤 Customer ID:', customer.id);
    console.log('📱 Customer Phone:', customerPhone);
    console.log('💬 Conversation ID:', conversationId);

    /**
     * =====================================================
     * EMPRESA
     * =====================================================
     */

    const company =
        await getCompany(companyId);

    if (!company) {
        throw new Error(
            '❌ Empresa não encontrada.'
        );
    }

    console.log('\n🏢 EMPRESA:');

    console.log({
        name: company.name,
        business_type: company.business_type,
        phone: company.phone,
        location: company.location
    });

    /**
     * =====================================================
     * BOT SETTINGS
     * =====================================================
     */

    const settings =
        await getBotSettings(companyId);

    console.log('\n⚙️ BOT SETTINGS:');

    console.log(settings);

    /**
     * =====================================================
     * GARANTIR CONVERSA NOVA
     * =====================================================
     *
     * Limpamos somente o estado da conversa.
     *
     * Os dados da empresa, cliente e conversa continuam
     * pertencendo ao companyId recebido.
     */

    await clearConversationState(
        companyId,
        conversationId
    );

    /**
     * =====================================================
     * MODO DE TESTE
     * =====================================================
     *
     * Se TEST_MESSAGE existir, usamos somente essa
     * mensagem.
     *
     * Caso contrário, usamos a sequência completa.
     */

    const testMessage =
        process.env.TEST_MESSAGE?.trim();

    const messages = testMessage
    ? [testMessage]
    : [

        // 1. Adicionar vários produtos
        'chicken + batata + refrigerante',

        // 2. Aumentar quantidade de um produto
        'quero mais 1 chicken',

        // 3. Remover um produto
        'tira a batata',

        // 4. Reduzir quantidade de um produto
        'fica só 1 chicken'
    ];

    /**
     * =====================================================
     * IDENTIFICAÇÃO DO MODO
     * =====================================================
     */

    if (testMessage) {

        console.log('\n🧪 MODO: MENSAGEM INDIVIDUAL');

        console.log('📝 TEST_MESSAGE:');
        console.log(testMessage);

    } else {

        console.log('\n🧪 MODO: CONVERSA COMPLETA');

        console.log(
            `📝 Total de mensagens: ${messages.length}`
        );
    }

    /**
     * =====================================================
     * PROCESSAMENTO DAS MENSAGENS
     * =====================================================
     */

    for (
        let i = 0;
        i < messages.length;
        i++
    ) {

        const message =
            messages[i];

        console.log('\n\n========================================');
        console.log(`🗣️ MENSAGEM ${i + 1}`);
        console.log('========================================');

        console.log('\n👤 Cliente:');
        console.log(message);

        /**
         * =================================================
         * ESTADO ANTES
         * =================================================
         */

        const stateBefore =
            await getConversationState(
                companyId,
                conversationId
            );

        console.log('\n📥 Estado antes:');

        console.log(
            JSON.stringify(
                stateBefore,
                null,
                2
            )
        );

        /**
         * =================================================
         * PROCESSAR MENSAGEM
         * =================================================
         */

        const response =
            await processMessage(
                message,
                companyId,
                conversationId
            );

        console.log('\n🤖 Bot:');

        console.log(response);

        /**
         * =================================================
         * ESTADO DEPOIS
         * =================================================
         */

        const stateAfter =
            await getConversationState(
                companyId,
                conversationId
            );

        console.log('\n📤 Estado depois:');

        console.log(
            JSON.stringify(
                stateAfter,
                null,
                2
            )
        );
    }

    /**
     * =====================================================
     * ESTADO FINAL
     * =====================================================
     */

    const finalState =
        await getConversationState(
            companyId,
            conversationId
        );

    console.log('\n\n========================================');
    console.log('🏁 ESTADO FINAL DA CONVERSA');
    console.log('========================================');

    console.log(
        JSON.stringify(
            finalState,
            null,
            2
        )
    );

    /**
     * =====================================================
     * FINAL
     * =====================================================
     */

    console.log('\n========================================');
    console.log('✅ TESTE TERMINADO');
    console.log('========================================\n');
}


main()
    .catch(error => {

        console.error(
            '\n❌ ERRO NO TESTE:\n'
        );

        console.error(error);

        process.exit(1);
    });
