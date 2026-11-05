import { supabase } from '../lib/supabase';

/**
 * Buscar todos os pedidos da empresa
 */
export async function getOrders(companyId) {

    console.log('🔎 Buscando pedidos da empresa:', companyId);

    const { data, error } = await supabase
        .from('orders')
        .select(`
            id,
            company_id,
            customer_id,
            conversation_id,
            status,
            total,
            created_at,
            customers (
                id,
                phone,
                name
            ),
            order_items (
                id,
                product_id,
                quantity,
                unit_price,
                products (
                    id,
                    name
                )
            )
        `)
        .eq('company_id', companyId)
        .order('created_at', {
            ascending: false
        });

        console.log('📦 Pedidos recebidos:', data);
        console.log('❌ Erro ao buscar pedidos:', error);


    if (error) {
        throw error;
    }

    return data || [];
}


/**
 * Atualizar estado do pedido
 */
export async function updateOrderStatus(
    orderId,
    status
) {
    const { data, error } = await supabase
        .from('orders')
        .update({
            status: status
        })
        .eq('id', orderId)
        .select()
        .single();

    if (error) {
        console.error(
            'Erro ao atualizar estado do pedido:',
            error
        );

        throw error;
    }

    return data;
}


/**
 * Buscar um pedido específico
 */
export async function getOrderById(orderId) {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            id,
            company_id,
            customer_id,
            conversation_id,
            status,
            total,
            created_at,
            customers (
                id,
                phone,
                name
            ),
            order_items (
                id,
                product_id,
                quantity,
                unit_price,
                products (
                    id,
                    name
                )
            )
        `)
        .eq('id', orderId)
        .single();

    if (error) {
        console.error(
            'Erro ao buscar pedido:',
            error
        );

        throw error;
    }

    return data;
}