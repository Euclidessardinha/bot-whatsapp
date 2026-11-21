require('dotenv').config();

const { processMessage } = require('./bot/botEngine');
const supabase = require('./lib/supabase');
const {
    createConversation
} = require('./services/conversationService');
const {
    updateConversationState,
    getConversationState
} = require('./services/conversationStateService');

const companyId =
    'd3779995-5533-4198-bee3-556709331dc6';

async function main() {
    console.log('\n🧪 TESTE DO CARRINHO COMPOSTO\n');

    // 1. Buscar um cliente real da empresa
    const {
        data: customers,
        error: customerError
    } = await supabase
        .from('customers')
        .select('id, company_id, name, phone')
        .eq('company_id', companyId)
        .limit(1);

    if (customerError) {
        throw customerError;
    }

    if (!customers || customers.length === 0) {
        throw new Error('Nenhum cliente encontrado para esta empresa.');
    }

    const customer = customers[0];

    console.log('👤 Cliente:', customer.name);
    console.log('🏢 Company:', customer.company_id);

    // 2. Criar uma conversa REAL no banco
    const conversation = await createConversation(
        companyId,
        customer.id
    );

    const conversationId = conversation.id;

    console.log('💬 Conversation:', conversationId);

    // 3. Buscar produtos reais da MESMA empresa
    const {
        data: products,
        error: productsError
    } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .eq('available', true)
        .order('name');

    if (productsError) {
        throw productsError;
    }

    if (!products || products.length < 3) {
        throw new Error(
            'É necessário ter pelo menos 3 produtos disponíveis.'
        );
    }

    const selectedProducts = products.slice(0, 3);

    console.log('\n🛒 Produtos usados no teste:');

    selectedProducts.forEach((product, index) => {
        console.log(
            `${index + 1}. ${product.name} - ${product.price} MT`
        );
    });

    // 4. Criar carrinho inicial
    const cart = selectedProducts.map((product) => ({
        product_id: product.id,
        product_name: product.name,
        unit_price: Number(product.price),
        quantity: 1,
        subtotal: Number(product.price)
    }));

    const total = cart.reduce(
        (sum, item) => sum + item.subtotal,
        0
    );

    // 5. Colocar a conversa no estado real do carrinho
    await updateConversationState(
        companyId,
        conversationId,
        'cart_menu',
        {
            cart,
            total,
            lastProduct: selectedProducts[0],
            currentProduct: selectedProducts[1],
            awaitingConfirmation: false,
            editingCartIndex: null,
            editingCartProduct: null,
            editingCartMode: null
        }
    );

    console.log('\n📦 Carrinho inicial:');

    cart.forEach((item, index) => {
        console.log(
            `${index + 1}. ${item.product_name} x${item.quantity} = ${item.subtotal} MT`
        );
    });

    console.log(`Total: ${total} MT`);

    // 6. Mensagem que queremos testar
    const message =
'oi';

    console.log('\n📨 Mensagem:');
    console.log(message);

    const { getBotSettings } = require('./services/botSettingsService');

const botSettings = await getBotSettings(companyId);

console.log('\n⚙️ BOT SETTINGS DO TESTE:');
console.log(botSettings);

    // 7. Executar o bot
    const response = await processMessage(
        message,
        companyId,
        conversationId
    );

    console.log('\n🤖 Resposta do bot:');
    console.log(response);

    // 8. Ler o estado final REAL da conversa
    const finalState = await getConversationState(
        companyId,
        conversationId
    );

    console.log('\n📊 ESTADO FINAL:\n');

    console.log(
        JSON.stringify(
            finalState,
            null,
            2
        )
    );
}

main()
    .catch((error) => {
        console.error('\n❌ ERRO NO TESTE:\n');
        console.error(error);
        process.exit(1);
    });