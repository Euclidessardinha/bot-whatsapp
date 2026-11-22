require('dotenv').config();

const {
    processMessage
} = require('./bot/botEngine');

const supabase =
    require('./lib/supabase');

const {
    createConversation
} = require('./services/conversationService');

const {
    updateConversationState,
    getConversationState
} = require('./services/conversationStateService');

const {
    getProductCandidates
} = require('./services/productService');

const {
    getBotSettings
} = require('./services/botSettingsService');


/**
 * =====================================================
 * CONFIGURAÇÃO
 * =====================================================
 *
 * NÃO colocar company_id fixo no código.
 *
 * PowerShell:
 *
 * $env:TEST_COMPANY_ID="..."
 *
 * ou:
 *
 * $env:COMPANY_ID="..."
 */

const companyId =
    process.env.TEST_COMPANY_ID ||
    process.env.COMPANY_ID;


if (!companyId) {

    throw new Error(
        '❌ Defina TEST_COMPANY_ID ou COMPANY_ID no ambiente.'
    );
}


/**
 * =====================================================
 * MAIN
 * =====================================================
 */

async function main() {

    console.log('\n========================================');
    console.log('🧪 TESTE DO BOT ENGINE');
    console.log('========================================\n');

    console.log(
        '🏢 Company ID:',
        companyId
    );


    /**
     * =====================================================
     * 1. BUSCAR CLIENTE REAL DA EMPRESA
     * =====================================================
     */

    const {
        data: customers,
        error: customerError
    } = await supabase
        .from('customers')
        .select(
            'id, company_id, name, phone'
        )
        .eq(
            'company_id',
            companyId
        )
        .limit(1);


    if (customerError) {
        throw customerError;
    }


    if (
        !customers ||
        customers.length === 0
    ) {

        throw new Error(
            '❌ Nenhum cliente encontrado para esta empresa.'
        );
    }


    const customer =
        customers[0];


    console.log('\n👤 CLIENTE:');
    console.log({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        company_id: customer.company_id
    });


    /**
     * =====================================================
     * 2. CRIAR CONVERSA REAL
     * =====================================================
     */

    const conversation =
        await createConversation(
            companyId,
            customer.id
        );


    if (!conversation) {

        throw new Error(
            '❌ Não foi possível criar a conversa.'
        );
    }


    const conversationId =
        conversation.id;


    console.log(
        '\n💬 Conversation ID:',
        conversationId
    );


    /**
     * =====================================================
     * 3. BOT SETTINGS
     * =====================================================
     */

    const botSettings =
        await getBotSettings(
            companyId
        );


    console.log(
        '\n⚙️ BOT SETTINGS:'
    );


    console.log(
        JSON.stringify(
            botSettings,
            null,
            2
        )
    );


    /**
     * =====================================================
     * 4. PRODUTOS REAIS DA MESMA EMPRESA
     * =====================================================
     */

    const {
        data: products,
        error: productsError
    } = await supabase
        .from('products')
        .select('*')
        .eq(
            'company_id',
            companyId
        )
        .eq(
            'available',
            true
        )
        .order('name');


    if (productsError) {
        throw productsError;
    }


    if (
        !products ||
        products.length === 0
    ) {

        throw new Error(
            '❌ Nenhum produto disponível encontrado para esta empresa.'
        );
    }


    console.log(
        '\n🍔 PRODUTOS DA EMPRESA:'
    );


    products.forEach(
        (product, index) => {

            console.log(
                `${index + 1}. ${product.name} - ${product.price} MT`
            );

        }
    );


    /**
     * =====================================================
     * 5. TESTE DIRETO DO getProductCandidates()
     * =====================================================
     *
     * Usamos o primeiro produto real da empresa.
     *
     * Depois criamos uma pequena variação do nome
     * para verificar se o sistema consegue encontrar
     * candidatos semelhantes.
     */

    const referenceProduct =
        products[0];


    const candidateSearch =
        referenceProduct.name
            .toLowerCase();


    console.log(
        '\n========================================'
    );

    console.log(
        '🔎 TESTE: getProductCandidates()'
    );

    console.log(
        '========================================'
    );


    console.log(
        '\n🔍 Termo pesquisado:',
        candidateSearch
    );


    const candidates =
        await getProductCandidates(
            companyId,
            candidateSearch,
            {
                minScore: 60,
                limit: 5
            }
        );


    console.log(
        '\n📋 CANDIDATOS ENCONTRADOS:'
    );


    console.log(
        JSON.stringify(
            candidates,
            null,
            2
        )
    );


    /**
     * =====================================================
     * 6. CRIAR CARRINHO INICIAL
     * =====================================================
     */

    const selectedProducts =
        products.slice(
            0,
            Math.min(
                3,
                products.length
            )
        );


    const cart =
        selectedProducts.map(
            product => ({

                product_id:
                    product.id,

                product_name:
                    product.name,

                unit_price:
                    Number(
                        product.price
                    ),

                quantity:
                    1,

                subtotal:
                    Number(
                        product.price
                    )
            })
        );


    const total =
        cart.reduce(
            (
                sum,
                item
            ) =>
                sum +
                item.subtotal,
            0
        );


    /**
     * =====================================================
     * 7. COLOCAR CONVERSA NO ESTADO DO CARRINHO
     * =====================================================
     */

    await updateConversationState(
        companyId,
        conversationId,
        'cart_menu',
        {
            cart,

            total,

            lastProduct:
                selectedProducts[0] || null,

            currentProduct:
                selectedProducts[1] || null,

            awaitingConfirmation:
                false,

            editingCartIndex:
                null,

            editingCartProduct:
                null,

            editingCartMode:
                null
        }
    );


    console.log(
        '\n📦 CARRINHO INICIAL:'
    );


    cart.forEach(
        (
            item,
            index
        ) => {

            console.log(
                `${index + 1}. ` +
                `${item.product_name} ` +
                `x${item.quantity} = ` +
                `${item.subtotal} MT`
            );

        }
    );


    console.log(
        `Total: ${total} MT`
    );


    /**
     * =====================================================
     * 8. MENSAGEM DO TESTE
     * =====================================================
     *
     * Aqui testamos a consulta de disponibilidade.
     *
     * A mensagem usa o nome do primeiro produto
     * da empresa, garantindo que o teste seja baseado
     * em dados reais do tenant.
     */

    const message =
    `Vocês têm burguer?`;


    console.log(
        '\n========================================'
    );

    console.log(
        '📨 MENSAGEM DO TESTE'
    );

    console.log(
        '========================================'
    );


    console.log(
        '\n👤 Cliente:'
    );

    console.log(
        message
    );


    /**
     * =====================================================
     * 9. ESTADO ANTES
     * =====================================================
     */

    const stateBefore =
        await getConversationState(
            companyId,
            conversationId
        );


    console.log(
        '\n📥 ESTADO ANTES:'
    );


    console.log(
        JSON.stringify(
            stateBefore,
            null,
            2
        )
    );


    /**
     * =====================================================
     * 10. EXECUTAR BOT ENGINE
     * =====================================================
     */

    const response =
        await processMessage(
            message,
            companyId,
            conversationId
        );


    console.log(
        '\n🤖 RESPOSTA DO BOT:'
    );


    console.log(
        response
    );


    /**
     * =====================================================
     * 11. ESTADO DEPOIS
     * =====================================================
     */

    const stateAfter =
        await getConversationState(
            companyId,
            conversationId
        );


    console.log(
        '\n📤 ESTADO DEPOIS:'
    );


    console.log(
        JSON.stringify(
            stateAfter,
            null,
            2
        )
    );


    /**
     * =====================================================
     * 12. RESULTADO FINAL
     * =====================================================
     */

    console.log(
        '\n========================================'
    );

    console.log(
        '🏁 TESTE TERMINADO'
    );

    console.log(
        '========================================\n'
    );
}


main()
    .catch(
        error => {

            console.error(
                '\n❌ ERRO NO TESTE:\n'
            );

            console.error(
                error
            );

            process.exit(1);
        }
    );