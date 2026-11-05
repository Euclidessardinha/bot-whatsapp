
import { supabase } from '../lib/supabase';

export async function getPendingRequestsCount(
    companyId
) {
    if (!companyId) {
        throw new Error('companyId é obrigatório.');
    }

    const { count, error } = await supabase
        .from('customer_requests')
        .select('id', {
            count: 'exact',
            head: true
        })
        .eq('company_id', companyId)
        .eq('status', 'pending');

    if (error) {
        console.error(
            '❌ Erro ao buscar notificações:',
            error
        );

        throw error;
    }

    return count || 0;
}
