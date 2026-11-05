const supabase = require('../lib/supabase');

/**
 * =========================================================
 * CRIAR UMA NOVA SOLICITAÇÃO DE SERVIÇO
 * =========================================================
 */
async function createRequest(
    companyId,
    customerId,
    conversationId,
    serviceId = null,
    description = null
) {

    if (
        !companyId ||
        !customerId
    ) {
        console.error(
            '❌ companyId e customerId são obrigatórios.'
        );

        return null;
    }

    /**
     * -----------------------------------------------------
     * VALIDAR CLIENTE
     * -----------------------------------------------------
     *
     * Garante que o cliente pertence à empresa.
     */
    const {
        data: customer,
        error: customerError
    } = await supabase
        .from('customers')
        .select('id, customer_id')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .maybeSingle();

    if (customerError) {
        console.error(
            '❌ Erro ao validar cliente:',
            customerError
        );

        return null;
    }

    if (!customer) {
        console.error(
            '❌ Cliente não pertence à empresa.'
        );

        return null;
    }


    /**
     * -----------------------------------------------------
     * VALIDAR CONVERSA
     * -----------------------------------------------------
     *
     * A conversa também precisa pertencer à empresa.
     */
    if (conversationId) {

        const {
            data: conversation,
            error: conversationError
        } = await supabase
            .from('conversations')
            .select('id, customer_id')
            .eq('id', conversationId)
            .eq('company_id', companyId)
            .maybeSingle();

        if (conversationError) {
            console.error(
                '❌ Erro ao validar conversa:',
                conversationError
            );

            return null;
        }

        if (!conversation) {
            console.error(
                '❌ Conversa não pertence à empresa.'
            );

            return null;
        }

        if (
    conversation.customer_id !== customerId
) {
    console.error(
        '❌ A conversa não pertence ao cliente informado.'
    );

    return null;
}
    }


    /**
     * -----------------------------------------------------
     * VALIDAR SERVIÇO
     * -----------------------------------------------------
     *
     * O serviço também precisa pertencer à mesma empresa.
     */
    if (serviceId) {

        const {
            data: service,
            error: serviceError
        } = await supabase
            .from('services')
            .select('id, customer_id')
            .eq('id', serviceId)
            .eq('company_id', companyId)
            .maybeSingle();

        if (serviceError) {
            console.error(
                '❌ Erro ao validar serviço:',
                serviceError
            );

            return null;
        }

        if (!service) {
            console.error(
                '❌ Serviço não pertence à empresa.'
            );

            return null;
        }
    }


    /**
     * -----------------------------------------------------
     * CRIAR SOLICITAÇÃO
     * -----------------------------------------------------
     */
    const {
        data,
        error
    } = await supabase
        .from('customer_requests')
        .insert([
            {
                company_id: companyId,

                customer_id: customerId,

                conversation_id:
                    conversationId || null,

                service_id:
                    serviceId || null,

                description:
                    description
                        ? String(description).trim()
                        : null,

                status: 'pending'
            }
        ])
        .select(`
            *,
            services (
                id,
                name,
                description,
                price,
                price_type
            )
        `)
        .single();

    if (error) {
        console.error(
            '❌ Erro ao criar solicitação:',
            error
        );

        return null;
    }

    console.log(
        `✅ Solicitação criada: ${data.id}`
    );

    return data;
}


/**
 * =========================================================
 * BUSCAR TODAS AS SOLICITAÇÕES DE UMA EMPRESA
 * =========================================================
 */
async function getRequests(companyId) {

    if (!companyId) {
        console.error(
            '❌ companyId é obrigatório.'
        );

        return [];
    }

    const {
        data,
        error
    } = await supabase
        .from('customer_requests')
        .select(`
            *,
            customers (
                id,
                name,
                phone
            ),
            services (
                id,
                name,
                description,
                price,
                price_type
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
            '❌ Erro ao buscar solicitações:',
            error
        );

        return [];
    }

    return data || [];
}


/**
 * =========================================================
 * BUSCAR UMA SOLICITAÇÃO ESPECÍFICA
 * =========================================================
 */
async function getRequestById(
    companyId,
    requestId
) {

    if (
        !companyId ||
        !requestId
    ) {
        console.error(
            '❌ companyId e requestId são obrigatórios.'
        );

        return null;
    }

    const {
        data,
        error
    } = await supabase
        .from('customer_requests')
        .select(`
            *,
            customers (
                id,
                name,
                phone
            ),
            services (
                id,
                name,
                description,
                price,
                price_type
            )
        `)
        .eq(
            'id',
            requestId
        )
        .eq(
            'company_id',
            companyId
        )
        .maybeSingle();

    if (error) {
        console.error(
            '❌ Erro ao buscar solicitação:',
            error
        );

        return null;
    }

    return data || null;
}


/**
 * =========================================================
 * ATUALIZAR O ESTADO DE UMA SOLICITAÇÃO
 * =========================================================
 */
async function updateRequestStatus(
    companyId,
    requestId,
    status
) {

    if (
        !companyId ||
        !requestId ||
        !status
    ) {
        console.error(
            '❌ companyId, requestId e status são obrigatórios.'
        );

        return null;
    }

    const validStatuses = [
        'pending',
        'contacted',
        'approved',
        'rejected',
        'completed',
        'cancelled'
    ];

    if (!validStatuses.includes(status)) {
        console.error(
            '❌ Status inválido:',
            status
        );

        return null;
    }

    const {
        data,
        error
    } = await supabase
        .from('customer_requests')
        .update({
            status: status,

            updated_at:
                new Date().toISOString()
        })
        .eq(
            'id',
            requestId
        )
        .eq(
            'company_id',
            companyId
        )
        .select()
        .maybeSingle();

    if (error) {
        console.error(
            '❌ Erro ao atualizar solicitação:',
            error
        );

        return null;
    }

    if (!data) {
        console.error(
            '❌ Solicitação não encontrada ou não pertence à empresa.'
        );

        return null;
    }

    console.log(
        `✅ Solicitação ${requestId} atualizada para: ${status}`
    );

    return data;
}


/**
 * =========================================================
 * ATUALIZAR A DESCRIÇÃO DE UMA SOLICITAÇÃO
 * =========================================================
 */
async function updateRequestDescription(
    companyId,
    requestId,
    description
) {

    if (
        !companyId ||
        !requestId
    ) {
        console.error(
            '❌ companyId e requestId são obrigatórios.'
        );

        return null;
    }

    const cleanDescription =
        description
            ? String(description).trim()
            : null;

    const {
        data,
        error
    } = await supabase
        .from('customer_requests')
        .update({
            description:
                cleanDescription,

            updated_at:
                new Date().toISOString()
        })
        .eq(
            'id',
            requestId
        )
        .eq(
            'company_id',
            companyId
        )
        .select()
        .maybeSingle();

    if (error) {
        console.error(
            '❌ Erro ao atualizar descrição:',
            error
        );

        return null;
    }

    if (!data) {
        console.error(
            '❌ Solicitação não encontrada ou não pertence à empresa.'
        );

        return null;
    }

    return data;
}


/**
 * =========================================================
 * EXPORTAÇÕES
 * =========================================================
 *
 * createCustomerRequest é mantido como alias de
 * createRequest para manter compatibilidade com o botEngine.
 */
module.exports = {
    createRequest,
    createCustomerRequest: createRequest,
    getRequests,
    getRequestById,
    updateRequestStatus,
    updateRequestDescription
};