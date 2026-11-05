
import { supabase } from '../lib/supabase';

export async function getCustomerRequests(companyId) {
    if (!companyId) {
        throw new Error('companyId é obrigatório.');
    }

    console.log(
        '🔎 Buscando solicitações da empresa:',
        companyId
    );

    const { data, error } = await supabase
        .from('customer_requests')
        .select(`
            id,
            company_id,
            customer_id,
            conversation_id,
            service_id,
            request_text,
            status,
            created_at,
            updated_at,
            customers (
                id,
                name,
                phone
            ),
            services (
                id,
                name,
                price,
                price_type
            )
        `)
        .eq('company_id', companyId)
        .order('created_at', {
            ascending: false
        });

    if (error) {
        console.error(
            '❌ ERRO COMPLETO DO SUPABASE:',
            error
        );

        console.error(
            '❌ Código:',
            error.code
        );

        console.error(
            '❌ Mensagem:',
            error.message
        );

        console.error(
            '❌ Detalhes:',
            error.details
        );

        console.error(
            '❌ Hint:',
            error.hint
        );

        throw error;
    }

    console.log(
        '✅ Solicitações encontradas:',
        data
    );

    return data || [];
}

export async function updateCustomerRequestStatus(
    requestId,
    status
) {
    if (!requestId) {
        throw new Error('requestId é obrigatório.');
    }

    if (!status) {
        throw new Error('status é obrigatório.');
    }

    const validStatuses = [
        'pending',
        'contacted',
        'in_progress',
        'completed',
        'cancelled'
    ];

    if (!validStatuses.includes(status)) {
        throw new Error('Status inválido.');
    }

    const { data, error } = await supabase
        .from('customer_requests')
        .update({
            status,
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

    if (error) {
        console.error(
            '❌ Erro ao atualizar solicitação:',
            error
        );

        throw error;
    }

    return data;
}
