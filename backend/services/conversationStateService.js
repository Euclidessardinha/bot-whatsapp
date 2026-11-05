
const supabase = require('../lib/supabase');


/**
 * =========================================================
 * BUSCAR ESTADO DA CONVERSA
 * =========================================================
 *
 * Agora exigimos:
 *
 * companyId + conversationId
 *
 * Isso garante que uma empresa não consiga consultar
 * o estado de uma conversa pertencente a outra empresa.
 */
async function getConversationState(
    companyId,
    conversationId
) {

    if (
        !companyId ||
        !conversationId
    ) {

        return null;
    }


    const {
        data,
        error
    } = await supabase

        .from('conversations')

        .select(
            'customer_id, company_id, state, context, updated_at'
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


    if (error) {

        console.error(
            '❌ Erro ao buscar estado da conversa:',
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


/**
 * =========================================================
 * ATUALIZAR ESTADO DA CONVERSA
 * =========================================================
 *
 * A atualização somente acontece se:
 *
 * conversationId
 * +
 * companyId
 *
 * corresponderem à mesma conversa.
 */
async function updateConversationState(
    companyId,
    conversationId,
    state,
    context = {}
) {

    if (
        !companyId ||
        !conversationId
    ) {

        return null;
    }


    const {
        data,
        error
    } = await supabase

        .from('conversations')

        .update({

            state:
                state,

            context:
                context,

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
            '❌ Erro ao atualizar estado da conversa:',
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


/**
 * =========================================================
 * ATUALIZAR ÚLTIMA ATIVIDADE
 * =========================================================
 *
 * Atualiza apenas updated_at.
 *
 * Não altera:
 *
 * - state
 * - context
 */
async function touchConversationActivity(
    companyId,
    conversationId
) {

    if (
        !companyId ||
        !conversationId
    ) {

        return null;
    }


    const {
        data,
        error
    } = await supabase

        .from('conversations')

        .update({

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
            '❌ Erro ao atualizar atividade da conversa:',
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


/**
 * =========================================================
 * LIMPAR ESTADO DA CONVERSA
 * =========================================================
 *
 * Volta a conversa para:
 *
 * state = idle
 * context = {}
 *
 * A validação de empresa é feita por
 * updateConversationState().
 */
async function clearConversationState(
    companyId,
    conversationId
) {

    return await updateConversationState(

        companyId,

        conversationId,

        'idle',

        {}
    );
}


module.exports = {

    getConversationState,

    updateConversationState,

    touchConversationActivity,

    clearConversationState
};
