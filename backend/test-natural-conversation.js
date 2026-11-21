require('dotenv').config();

const {
    processMessage
} = require('./bot/botEngine');

const {
    getConversationState,
    clearConversationState
} = require('./services/conversationService');

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
     * ou use uma variável já existente no .env.
     */

    const companyId =
        process.env.TEST_COMPANY_ID ||
        process.env.COMPANY_ID;

    if (!companyId) {
        throw new Error(
            '❌ Defina TEST_COMPANY_ID ou COMPANY_ID no ambiente.'
        );
    }

    const conversationId =
        `natural-test-${Date.now()}`;

    console.log('\n========================================');
    console.log('🧠 TESTE DE CONVERSA NATURAL');
    console.log('========================================\n');

    console.log('🏢 Company ID:', companyId);
    console.log('💬 Conversation ID:', conversationId);

    /**
     * =====================================================
     * EMPRESA
     * =====================================================
     */

    const company =
        await getCompanyById(companyId);

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
     */

    await clearConversationState(
        companyId,
        conversationId
    );

    /**
     * =====================================================
     * CONVERSA
     * =====================================================
     */

    const messages = [

        // 1. Saudação simples
        'Oi',

        // 2. Pergunta sobre o negócio
        'O que vocês têm?',

        // 3. Pergunta sobre produtos
        'Vocês têm hambúrguer?',

        // 4. Pergunta de preço
        'Quanto custa o chicken?',

        // 5. Pedido de menu
        'Me mostra o menu',

        // 6. Escolha
        'Quero o Chicken Burger',

        // 7. Quantidade
        'Manda 2',

        // 8. Consulta do pedido
        'O que tenho no meu pedido?',

        // 9. Confirmação
        'Pode confirmar'
    ];

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
         * Estado ANTES
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
         * Processar mensagem
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
         * Estado DEPOIS
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