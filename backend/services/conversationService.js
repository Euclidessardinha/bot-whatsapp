
const supabase = require('../lib/supabase');


/**
 * =========================================================
 * BUSCAR CONVERSA ABERTA
 * =========================================================
 *
 * Uma conversa pertence a:
 *
 * company_id
 * +
 * customer_id
 *
 * Isso mantém o isolamento entre empresas.
 */
async function getConversation(
    companyId,
    customerId
) {

    if (
        !companyId ||
        !customerId
    ) {

        console.error(
            '❌ companyId ou customerId inválido.'
        );

        return null;
    }


    const {
        data,
        error
    } = await supabase

        .from('conversations')

        .select('*')

        .eq(
            'company_id',
            companyId
        )

        .eq(
            'customer_id',
            customerId
        )

        .eq(
            'status',
            'open'
        )

        .maybeSingle();


    if (error) {

        console.error(
            '❌ Erro ao buscar conversa:',
            error
        );

        return null;
    }


    return data;
}


/**
 * =========================================================
 * CRIAR CONVERSA
 * =========================================================
 *
 * Antes de criar a conversa, confirmamos que o cliente
 * pertence à mesma empresa.
 *
 * Isso impede:
 *
 * Empresa A
 *    ↓
 * customer_id da Empresa B
 *    ↓
 * criar conversa ❌
 */
async function createConversation(
    companyId,
    customerId
) {

    if (
        !companyId ||
        !customerId
    ) {

        console.error(
            '❌ companyId ou customerId inválido.'
        );

        return null;
    }


    /**
     * =====================================================
     * VALIDAR CLIENTE
     * =====================================================
     *
     * Como o backend usa service_role, não devemos confiar
     * apenas no RLS.
     *
     * O cliente precisa pertencer à empresa informada.
     */
    const {
        data: customer,
        error: customerError
    } = await supabase

        .from('customers')

        .select(
            'id, company_id'
        )

        .eq(
            'id',
            customerId
        )

        .eq(
            'company_id',
            companyId
        )

        .maybeSingle();


    if (customerError) {

        console.error(
            '❌ Erro ao validar cliente antes de criar conversa:',
            customerError
        );

        return null;
    }


    if (!customer) {

        console.error(
            '❌ Cliente não pertence à empresa informada.'
        );

        return null;
    }


    /**
     * =====================================================
     * CRIAR CONVERSA
     * =====================================================
     */
    const {
        data,
        error
    } = await supabase

        .from('conversations')

        .insert([
            {
                company_id:
                    companyId,

                customer_id:
                    customerId,

                status:
                    'open',

                state:
                    'idle',

                context:
                    {}
            }
        ])

        .select()

        .single();


    if (error) {

        console.error(
            '❌ Erro ao criar conversa:',
            error
        );

        return null;
    }


    console.log(
        `💬 Conversa criada: ${data.id}`
    );


    return data;
}


/**
 * =========================================================
 * OBTER OU CRIAR CONVERSA
 * =========================================================
 */
async function getOrCreateConversation(
    companyId,
    customerId
) {

    if (
        !companyId ||
        !customerId
    ) {

        return null;
    }


    let conversation =
        await getConversation(
            companyId,
            customerId
        );


    /**
     * Já existe uma conversa aberta.
     */
    if (conversation) {

        return conversation;
    }


    /**
     * Criar nova conversa.
     *
     * createConversation() já valida que o cliente
     * pertence à empresa.
     */
    conversation =
        await createConversation(
            companyId,
            customerId
        );


    return conversation;
}


/**
 * =========================================================
 * GUARDAR MENSAGEM
 * =========================================================
 *
 * Agora recebe também companyId.
 *
 * Isso permite validar que a conversa pertence à empresa
 * antes de inserir a mensagem.
 */
async function saveMessage(
    companyId,
    conversationId,
    senderType,
    message
) {

    if (
        !companyId ||
        !conversationId ||
        !senderType ||
        !message
    ) {

        console.error(
            '❌ Dados inválidos para guardar mensagem.'
        );

        return null;
    }


    /**
     * =====================================================
     * VALIDAR CONVERSA
     * =====================================================
     *
     * Nunca confiamos somente no conversationId.
     */
    const {
        data: conversation,
        error: conversationError
    } = await supabase

        .from('conversations')

        .select(
            'id, company_id'
        )

        .eq(
            'id',
            conversationId
        )

        .eq(
            'company_id',
            companyId
        )

        .maybeSingle();


    if (conversationError) {

        console.error(
            '❌ Erro ao validar conversa antes de guardar mensagem:',
            conversationError
        );

        return null;
    }


    if (!conversation) {

        console.error(
            '❌ Conversa não pertence à empresa informada.'
        );

        return null;
    }


    /**
     * =====================================================
     * GUARDAR MENSAGEM
     * =====================================================
     */
    const {
        data,
        error
    } = await supabase

        .from('messages')

        .insert([
            {
                conversation_id:
                    conversationId,

                sender_type:
                    senderType,

                message:
                    String(message)
            }
        ])

        .select()

        .single();


    if (error) {

        console.error(
            '❌ Erro ao guardar mensagem:',
            error
        );

        return null;
    }


    return data;
}


/**
 * =========================================================
 * FECHAR CONVERSA
 * =========================================================
 *
 * Agora recebe companyId e valida a propriedade da conversa
 * antes de alterá-la.
 */
async function closeConversation(
    companyId,
    conversationId
) {

    if (
        !companyId ||
        !conversationId
    ) {

        console.error(
            '❌ companyId ou conversationId inválido.'
        );

        return null;
    }


    /**
     * =====================================================
     * ATUALIZAR SOMENTE CONVERSA DA EMPRESA
     * =====================================================
     */
    const {
        data,
        error
    } = await supabase

        .from('conversations')

        .update({
            status:
                'closed',

            updated_at:
                new Date().toISOString()
        })

        .eq(
            'id',
            conversationId
        )

        .eq(
            'company_id',
            companyId
        )

        .select()

        .maybeSingle();


    if (error) {

        console.error(
            '❌ Erro ao fechar conversa:',
            error
        );

        return null;
    }


    if (!data) {

        console.error(
            '❌ Conversa não pertence à empresa informada.'
        );

        return null;
    }


    return data;
}


module.exports = {

    getConversation,

    createConversation,

    getOrCreateConversation,

    saveMessage,

    closeConversation

};
