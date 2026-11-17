require('dotenv').config();

const supabase = require('./lib/supabase');

const {
    createCustomer
} = require('./services/customerService');

const {
    getOrCreateConversation
} = require('./services/conversationService');

const {
    processMessage
} = require('./bot/botEngine');


/**
 * ============================================================
 * BUSCAR EMPRESAS
 * ============================================================
 */

async function getCompanies() {

    const {
        data,
        error
    } = await supabase

        .from('companies')

        .select(
            'id, name, business_type'
        )

        .order('name');


    if (error) {

        throw new Error(
            `Erro ao buscar empresas: ${error.message}`
        );
    }


    return data || [];
}


/**
 * ============================================================
 * BUSCAR PRODUTOS
 * ============================================================
 */

async function getProducts(
    companyId
) {

    const {
        data,
        error
    } = await supabase

        .from('products')

        .select(
            'id, name, price, available'
        )

        .eq(
            'company_id',
            companyId
        )

        .eq(
            'available',
            true
        )

        .order('name');


    if (error) {

        throw new Error(
            `Erro ao buscar produtos: ${error.message}`
        );
    }


    return data || [];
}


/**
 * ============================================================
 * BUSCAR SERVIÇOS
 * ============================================================
 */

async function getServices(
    companyId
) {

    const {
        data,
        error
    } = await supabase

        .from('services')

        .select(
            'id, name, price, price_type'
        )

        .eq(
            'company_id',
            companyId
        )

        .order('name');


    if (error) {

        throw new Error(
            `Erro ao buscar serviços: ${error.message}`
        );
    }


    return data || [];
}


/**
 * ============================================================
 * BUSCAR ALIASES
 * ============================================================
 */

async function getAliases(
    companyId
) {

    const {
        data,
        error
    } = await supabase

        .from('service_aliases')

        .select('*')

        .eq(
            'company_id',
            companyId
        )

        .order('alias');


    if (error) {

        console.log(
            `⚠️ Não foi possível carregar aliases: ${error.message}`
        );

        return [];
    }


    return data || [];
}


/**
 * ============================================================
 * CRIAR CLIENTE DE TESTE
 * ============================================================
 *
 * Criamos um cliente real no banco para que o Bot Engine
 * receba exatamente o mesmo tipo de conversation_id usado
 * pela aplicação real.
 *
 * O telefone é único para cada execução.
 */

async function createTestCustomer(
    companyId
) {

    const phone =
        `258TEST${Date.now()}`;

    const customer =
        await createCustomer(
            companyId,
            phone,
            'Cliente Teste Bot Engine'
        );


    if (!customer) {

        throw new Error(
            'Não foi possível criar o cliente de teste.'
        );
    }


    return customer;
}


/**
 * ============================================================
 * CRIAR CONVERSA REAL
 * ============================================================
 */

async function createTestConversation(
    companyId,
    customerId
) {

    const conversation =
        await getOrCreateConversation(
            companyId,
            customerId
        );


    if (!conversation) {

        throw new Error(
            'Não foi possível criar/obter a conversa de teste.'
        );
    }


    return conversation;
}


/**
 * ============================================================
 * LIMPAR CONVERSA
 * ============================================================
 */

async function cleanupConversation(
    companyId,
    conversationId
) {

    if (!conversationId) {

        return;
    }


    const {
        error
    } = await supabase

        .from('conversations')

        .delete()

        .eq(
            'id',
            conversationId
        )

        .eq(
            'company_id',
            companyId
        );


    if (error) {

        console.log(
            `⚠️ Não foi possível limpar conversa ${conversationId}:`,
            error.message
        );

        return;
    }


    console.log(
        '🧹 Conversa de teste removida.'
    );
}


/**
 * ============================================================
 * LIMPAR CLIENTE
 * ============================================================
 */

async function cleanupCustomer(
    companyId,
    customerId
) {

    if (!customerId) {

        return;
    }


    const {
        error
    } = await supabase

        .from('customers')

        .delete()

        .eq(
            'id',
            customerId
        )

        .eq(
            'company_id',
            companyId
        );


    if (error) {

        console.log(
            `⚠️ Não foi possível limpar cliente ${customerId}:`,
            error.message
        );

        return;
    }


    console.log(
        '🧹 Cliente de teste removido.'
    );
}


/**
 * ============================================================
 * EXECUTAR MENSAGEM
 * ============================================================
 */

async function runMessage(
    companyId,
    conversationId,
    message
) {

    console.log(
        '\n' + '─'.repeat(70)
    );

    console.log(
        `👤 Cliente: ${message}`
    );


    try {

        const response =
            await processMessage(
                message,
                companyId,
                conversationId
            );


        console.log(
            `🤖 Bot: ${response ?? '[null]'}`
        );


        return response;

    } catch (error) {

        console.error(
            '❌ Erro ao processar mensagem:'
        );

        console.error(
            error
        );


        return null;
    }
}


/**
 * ============================================================
 * TESTAR EMPRESA
 * ============================================================
 */

async function testCompany(
    company
) {

    console.log('\n');

    console.log(
        '='.repeat(70)
    );

    console.log(
        `🏢 EMPRESA: ${company.name}`
    );

    console.log(
        `🆔 company_id: ${company.id}`
    );

    console.log(
        `📌 business_type: ${company.business_type}`
    );

    console.log(
        '='.repeat(70)
    );


    const products =
        await getProducts(
            company.id
        );


    const services =
        await getServices(
            company.id
        );


    const aliases =
        await getAliases(
            company.id
        );


    console.log(
        `\n🍔 Produtos disponíveis: ${products.length}`
    );


    products
        .slice(0, 10)
        .forEach(
            (
                product,
                index
            ) => {

                console.log(
                    `   ${index + 1}. ${product.name} — ${product.price} MT`
                );
            }
        );


    console.log(
        `\n🛠️ Serviços: ${services.length}`
    );


    services
        .slice(0, 10)
        .forEach(
            (
                service,
                index
            ) => {

                console.log(
                    `   ${index + 1}. ${service.name} — ${service.price ?? 'sob consulta'}`
                );
            }
        );


    console.log(
        `\n🔤 Aliases: ${aliases.length}`
    );


    aliases
        .slice(0, 15)
        .forEach(
            (
                alias,
                index
            ) => {

                console.log(
                    `   ${index + 1}. "${alias.alias}" → ${alias.service_id}`
                );
            }
        );


    /**
     * ========================================================
     * CLIENTE + CONVERSA REAL
     * ========================================================
     */

    let customer = null;
    let conversation = null;


    try {

        customer =
            await createTestCustomer(
                company.id
            );


        console.log(
            `\n👤 Cliente de teste criado: ${customer.id}`
        );


        conversation =
            await createTestConversation(
                company.id,
                customer.id
            );


        console.log(
            `💬 conversation_id real: ${conversation.id}`
        );


        /**
         * ====================================================
         * TESTE 1 — MENU
         * ====================================================
         */

        await runMessage(
            company.id,
            conversation.id,
            'menu'
        );


        /**
         * ====================================================
         * TESTE 2 — SAUDAÇÃO
         * ====================================================
         */

        await runMessage(
            company.id,
            conversation.id,
            'Olá'
        );


        /**
         * ====================================================
         * TESTE 3 — PRODUTO
         * ====================================================
         */

        if (
            products.length > 0
        ) {

            const product =
                products[0];


            console.log('\n');

            console.log(
                '🧪 TESTE DE PRODUTO'
            );

            console.log(
                `Produto escolhido: ${product.name}`
            );


            /**
             * PREÇO
             */

            await runMessage(
                company.id,
                conversation.id,
                `quanto custa ${product.name}`
            );


            /**
             * QUANTIDADE NÃO INFORMADA
             */

            await runMessage(
                company.id,
                conversation.id,
                `quero ${product.name}`
            );


            /**
             * QUANTIDADE EXPLÍCITA
             */

            await runMessage(
                company.id,
                conversation.id,
                `quero 3 ${product.name}`
            );


            /**
             * REFERÊNCIA CONTEXTUAL
             */

            await runMessage(
                company.id,
                conversation.id,
                'quero esse'
            );


            /**
             * MESMO PRODUTO
             */

            await runMessage(
                company.id,
                conversation.id,
                'mais um'
            );
        }


        /**
         * ====================================================
         * TESTE 4 — SERVIÇOS
         * ====================================================
         */

        if (
            services.length > 0
        ) {

            console.log('\n');

            console.log(
                '🧪 TESTE DE SERVIÇOS'
            );


            await runMessage(
                company.id,
                conversation.id,
                'serviços'
            );


            const service =
                services[0];


            await runMessage(
                company.id,
                conversation.id,
                service.name
            );


            await runMessage(
                company.id,
                conversation.id,
                '1'
            );
        }


    } finally {

        /**
         * ====================================================
         * LIMPEZA
         * ====================================================
         *
         * Primeiro removemos a conversa.
         * Depois removemos o cliente criado exclusivamente
         * para este teste.
         */

        if (
            conversation &&
            conversation.id
        ) {

            await cleanupConversation(
                company.id,
                conversation.id
            );
        }


        if (
            customer &&
            customer.id
        ) {

            await cleanupCustomer(
                company.id,
                customer.id
            );
        }


        console.log(
            '\n🧹 Limpeza do teste concluída.'
        );
    }
}


/**
 * ============================================================
 * MAIN
 * ============================================================
 */

async function main() {

    console.log('\n');

    console.log(
        '╔══════════════════════════════════════════════════════════════╗'
    );

    console.log(
        '║              TESTE DO BOT ENGINE                            ║'
    );

    console.log(
        '╚══════════════════════════════════════════════════════════════╝'
    );


    console.log(
        '\n🔗 SUPABASE_URL:',
        process.env.SUPABASE_URL
    );


    try {

        const companies =
            await getCompanies();


        if (
            !companies.length
        ) {

            console.log(
                '\n❌ Nenhuma empresa encontrada.'
            );

            process.exit(1);
        }


        console.log(
            `\n🏢 Empresas encontradas: ${companies.length}`
        );


        companies.forEach(
            (
                company,
                index
            ) => {

                console.log(
                    `   ${index + 1}. ${company.name} (${company.business_type})`
                );
            }
        );


        /**
         * ====================================================
         * TESTAR AS DUAS PRIMEIRAS EMPRESAS
         * ====================================================
         *
         * Mantemos o teste conservador nesta primeira execução.
         */

        const selectedCompanies =
            companies.slice(0, 2);


        for (
            const company
            of selectedCompanies
        ) {

            await testCompany(
                company
            );
        }


        console.log('\n');

        console.log(
            '='.repeat(70)
        );

        console.log(
            '✅ TESTE DO BOT ENGINE TERMINADO'
        );

        console.log(
            '='.repeat(70)
        );

        console.log('\n');


    } catch (error) {

        console.error(
            '\n❌ TESTE FALHOU'
        );

        console.error(
            error
        );

        process.exit(1);
    }
}


main();