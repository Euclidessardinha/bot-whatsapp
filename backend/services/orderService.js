
const supabase = require('../lib/supabase');


/**
 * =========================================================
 * CRIAR PEDIDO
 * =========================================================
 */
async function createOrder(
    companyId,
    customerId,
    conversationId
) {

    if (
        !companyId ||
        !customerId ||
        !conversationId
    ) {

        console.error(
            '❌ Dados insuficientes para criar pedido.'
        );

        return null;
    }


    const {
        data,
        error
    } = await supabase

        .from('orders')

        .insert([
            {
                company_id:
                    companyId,

                customer_id:
                    customerId,

                conversation_id:
                    conversationId,

                status:
                    'pending',

                total:
                    0
            }
        ])

        .select()

        .single();


    if (error) {

        console.error(
            '❌ Erro ao criar pedido:',
            error
        );

        return null;
    }


    console.log(
        `✅ Pedido criado: ${data.id}`
    );


    return data;
}


/**
 * =========================================================
 * ADICIONAR ITEM AO PEDIDO
 * =========================================================
 *
 * IMPORTANTE:
 *
 * A empresa é validada antes de qualquer inserção.
 *
 * O pedido precisa pertencer à empresa.
 *
 * O produto também precisa pertencer à mesma empresa.
 *
 * O preço utilizado vem diretamente do banco de dados.
 *
 * Não confiamos no preço enviado pelo carrinho.
 *
 * Isso protege:
 *
 * Empresa A
 *    ↓
 * somente seus pedidos
 *    ↓
 * somente seus produtos
 */
async function addOrderItem(
    companyId,
    orderId,
    productId,
    quantity
) {

    if (
        !companyId ||
        !orderId ||
        !productId
    ) {

        console.error(
            '❌ Dados insuficientes para adicionar item ao pedido.'
        );

        return null;
    }


    /**
     * =====================================================
     * VALIDAR QUANTIDADE
     * =====================================================
     */

    const parsedQuantity =
        Number(quantity);


    if (
        !Number.isInteger(
            parsedQuantity
        ) ||
        parsedQuantity <= 0
    ) {

        console.error(
            '❌ Quantidade inválida:',
            quantity
        );

        return null;
    }


    /**
     * =====================================================
     * VALIDAR PEDIDO
     * =====================================================
     *
     * O pedido precisa pertencer à empresa informada.
     */
    const {
        data: order,
        error: orderError
    } = await supabase

        .from('orders')

        .select(
            'id, company_id, customer_id, conversation_id, status'
        )

        .eq(
            'id',
            orderId
        )

        .eq(
            'company_id',
            companyId
        )

        .maybeSingle();


    if (orderError) {

        console.error(
            '❌ Erro ao validar pedido:',
            orderError
        );

        return null;
    }


    if (!order) {

        console.error(
            '❌ Pedido não pertence à empresa informada:',
            orderId
        );

        return null;
    }


    /**
     * =====================================================
     * VALIDAR PRODUTO
     * =====================================================
     *
     * O produto precisa:
     *
     * 1. existir;
     * 2. pertencer à mesma empresa;
     * 3. estar disponível.
     */
    const {
        data: product,
        error: productError
    } = await supabase

        .from('products')

        .select(
            'id, company_id, name, price, available'
        )

        .eq(
            'id',
            productId
        )

        .eq(
            'company_id',
            companyId
        )

        .eq(
            'available',
            true
        )

        .maybeSingle();


    if (productError) {

        console.error(
            '❌ Erro ao validar produto:',
            productError
        );

        return null;
    }


    if (!product) {

        console.error(
            '❌ Produto não pertence à empresa ou está indisponível:',
            productId
        );

        return null;
    }


    /**
     * =====================================================
     * VALIDAR PREÇO
     * =====================================================
     *
     * O preço vem do banco de dados.
     *
     * Nunca usamos um preço enviado pelo cliente,
     * frontend ou estado da conversa.
     */
    const parsedUnitPrice =
        Number(product.price);


    if (
        !Number.isFinite(
            parsedUnitPrice
        ) ||
        parsedUnitPrice < 0
    ) {

        console.error(
            '❌ Preço do produto inválido:',
            product.price
        );

        return null;
    }


    /**
     * =====================================================
     * CALCULAR SUBTOTAL
     * =====================================================
     */

    const subtotal =
        parsedQuantity *
        parsedUnitPrice;


    /**
     * =====================================================
     * INSERIR ITEM
     * =====================================================
     */
    const {
        data,
        error
    } = await supabase

        .from('order_items')

        .insert([
            {
                order_id:
                    orderId,

                product_id:
                    productId,

                quantity:
                    parsedQuantity,

                unit_price:
                    parsedUnitPrice,

                subtotal:
                    subtotal
            }
        ])

        .select()

        .single();


    if (error) {

        console.error(
            '❌ Erro ao adicionar produto ao pedido:',
            error
        );

        return null;
    }


    console.log(
        `✅ Item adicionado ao pedido: ${product.name} | ${parsedQuantity} x ${parsedUnitPrice} MT`
    );


    return data;
}


/**
 * =========================================================
 * ATUALIZAR TOTAL DO PEDIDO
 * =========================================================
 *
 * O pedido precisa pertencer à empresa informada.
 */
async function updateOrderTotal(
    companyId,
    orderId
) {

    if (
        !companyId ||
        !orderId
    ) {

        console.error(
            '❌ companyId ou orderId inválido.'
        );

        return null;
    }


    /**
     * =====================================================
     * VALIDAR PEDIDO
     * =====================================================
     */
    const {
        data: order,
        error: orderError
    } = await supabase

        .from('orders')

        .select(
            'id, company_id'
        )

        .eq(
            'id',
            orderId
        )

        .eq(
            'company_id',
            companyId
        )

        .maybeSingle();


    if (orderError) {

        console.error(
            '❌ Erro ao validar pedido para atualizar total:',
            orderError
        );

        return null;
    }


    if (!order) {

        console.error(
            '❌ Pedido não pertence à empresa informada:',
            orderId
        );

        return null;
    }


    /**
     * =====================================================
     * BUSCAR ITENS DO PEDIDO
     * =====================================================
     */
    const {
        data: items,
        error: itemsError
    } = await supabase

        .from('order_items')

        .select(
            'subtotal'
        )

        .eq(
            'order_id',
            orderId
        );


    if (itemsError) {

        console.error(
            '❌ Erro ao buscar itens do pedido:',
            itemsError
        );

        return null;
    }


    /**
     * =====================================================
     * CALCULAR TOTAL
     * =====================================================
     */
    const total =
        (items || []).reduce(
            (
                sum,
                item
            ) => {

                const subtotal =
                    Number(
                        item.subtotal || 0
                    );


                if (
                    !Number.isFinite(
                        subtotal
                    ) ||
                    subtotal < 0
                ) {

                    return sum;
                }


                return (
                    sum +
                    subtotal
                );

            },
            0
        );


    /**
     * =====================================================
     * ATUALIZAR PEDIDO
     * =====================================================
     */
    const {
        data,
        error: updateError
    } = await supabase

        .from('orders')

        .update({

            total:
                total,

            updated_at:
                new Date().toISOString()

        })

        .eq(
            'id',
            orderId
        )

        .eq(
            'company_id',
            companyId
        )

        .select()

        .maybeSingle();


    if (updateError) {

        console.error(
            '❌ Erro ao atualizar total:',
            updateError
        );

        return null;
    }


    if (!data) {

        console.error(
            '❌ Pedido não encontrado ao atualizar total:',
            orderId
        );

        return null;
    }


    console.log(
        `💰 Total do pedido ${orderId}: ${total} MT`
    );


    return data;
}


/**
 * =========================================================
 * EXPORTAÇÕES
 * =========================================================
 */
module.exports = {

    createOrder,

    addOrderItem,

    updateOrderTotal

};
