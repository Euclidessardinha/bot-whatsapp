
import { supabase } from '../lib/supabase';


/**
 * =========================================================
 * BUSCAR CLIENTES QUE FIZERAM PEDIDOS
 * =========================================================
 *
 * Mostra somente clientes que pertencem à empresa
 * e que possuem pelo menos um pedido.
 *
 * Pessoas que apenas conversaram com o WhatsApp
 * continuam na tabela customers, mas não aparecem
 * na área "Clientes" até fazerem um pedido.
 */
export async function getCustomers(companyId) {

    if (!companyId) {

        throw new Error(
            'companyId é obrigatório.'
        );
    }


    const {
        data,
        error
    } = await supabase

        .from('customers')

        .select(`
            id,
            company_id,
            phone,
            name,
            created_at,
            orders!inner (
                id,
                status,
                total,
                created_at
            )
        `)

        .eq(
            'company_id',
            companyId
        )

        .order(
            'created_at',
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            '❌ Erro ao buscar clientes que fizeram pedidos:',
            error
        );

        throw error;
    }


    return data || [];
}


/**
 * =========================================================
 * BUSCAR UM CLIENTE PELO ID
 * =========================================================
 *
 * Usado quando o administrador abre os detalhes
 * de um cliente.
 */
export async function getCustomerById(
    customerId
) {

    if (!customerId) {

        throw new Error(
            'customerId é obrigatório.'
        );
    }


    const {
        data,
        error
    } = await supabase

        .from('customers')

        .select(`
            id,
            company_id,
            phone,
            name,
            created_at,
            orders (
                id,
                status,
                total,
                created_at,
                order_items (
                    id,
                    quantity,
                    unit_price,
                    subtotal,
                    products (
                        id,
                        name
                    )
                )
            )
        `)

        .eq(
            'id',
            customerId
        )

        .single();


    if (error) {

        console.error(
            '❌ Erro ao buscar cliente:',
            error
        );

        throw error;
    }


    return data;
}
