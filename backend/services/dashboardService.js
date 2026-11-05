const supabase = require('../lib/supabase');

/**
 * =========================================================
 * OBTER RESUMO DO DASHBOARD
 * =========================================================
 *
 * Retorna os principais números da empresa autenticada.
 *
 * IMPORTANTE:
 * Todas as consultas utilizam company_id.
 *
 * Isso garante que:
 *
 * Empresa A -> vê apenas os seus dados
 * Empresa B -> vê apenas os seus dados
 */
async function getDashboardSummary(companyId) {

    if (!companyId) {
        throw new Error(
            'O ID da empresa é obrigatório.'
        );
    }

    /**
     * =====================================================
     * PRODUTOS
     * =====================================================
     *
     * Contamos todos os produtos pertencentes
     * à empresa.
     */
    const productsPromise = supabase
        .from('products')
        .select('*', {
            count: 'exact',
            head: true
        })
        .eq(
            'company_id',
            companyId
        );


    /**
     * =====================================================
     * PEDIDOS
     * =====================================================
     *
     * Contamos todos os pedidos pertencentes
     * à empresa.
     */
    const ordersPromise = supabase
        .from('orders')
        .select('*', {
            count: 'exact',
            head: true
        })
        .eq(
            'company_id',
            companyId
        );


    /**
     * =====================================================
     * CLIENTES
     * =====================================================
     *
     * Contamos todos os clientes pertencentes
     * à empresa.
     */
    const customersPromise = supabase
        .from('customers')
        .select('*', {
            count: 'exact',
            head: true
        })
        .eq(
            'company_id',
            companyId
        );


    /**
     * =====================================================
     * WHATSAPP
     * =====================================================
     *
     * Contamos apenas as conexões que estão
     * realmente conectadas.
     */
    const whatsappPromise = supabase
        .from('whatsapp_sessions')
        .select('*', {
            count: 'exact',
            head: true
        })
        .eq(
            'company_id',
            companyId
        )
        .eq(
            'status',
            'connected'
        );


    /**
     * =====================================================
     * CONFIGURAÇÕES DO BOT
     * =====================================================
     */
    const botSettingsPromise = supabase
        .from('bot_settings')
        .select(`
            bot_enabled,
            menu_enabled,
            orders_enabled,
            human_support_enabled
        `)
        .eq(
            'company_id',
            companyId
        )
        .maybeSingle();


    /**
     * =====================================================
     * EXECUTAR CONSULTAS
     * =====================================================
     *
     * Promise.all permite consultar os dados
     * ao mesmo tempo.
     */
    const [
        productsResult,
        ordersResult,
        customersResult,
        whatsappResult,
        botSettingsResult
    ] = await Promise.all([
        productsPromise,
        ordersPromise,
        customersPromise,
        whatsappPromise,
        botSettingsPromise
    ]);


    /**
     * =====================================================
     * VERIFICAR ERROS
     * =====================================================
     */

    if (productsResult.error) {
        console.error(
            '❌ Erro ao contar produtos:',
            productsResult.error
        );

        throw productsResult.error;
    }


    if (ordersResult.error) {
        console.error(
            '❌ Erro ao contar pedidos:',
            ordersResult.error
        );

        throw ordersResult.error;
    }


    if (customersResult.error) {
        console.error(
            '❌ Erro ao contar clientes:',
            customersResult.error
        );

        throw customersResult.error;
    }


    if (whatsappResult.error) {
        console.error(
            '❌ Erro ao contar WhatsApps:',
            whatsappResult.error
        );

        throw whatsappResult.error;
    }


    if (botSettingsResult.error) {
        console.error(
            '❌ Erro ao buscar configurações do bot:',
            botSettingsResult.error
        );

        throw botSettingsResult.error;
    }


    /**
     * =====================================================
     * RETORNAR RESUMO
     * =====================================================
     */

    return {
        products: productsResult.count || 0,

        orders: ordersResult.count || 0,

        customers: customersResult.count || 0,

        whatsapp: whatsappResult.count || 0,

        bot: {
            enabled:
                botSettingsResult.data?.bot_enabled === true,

            menu_enabled:
                botSettingsResult.data?.menu_enabled === true,

            orders_enabled:
                botSettingsResult.data?.orders_enabled === true,

            human_support_enabled:
                botSettingsResult.data
                    ?.human_support_enabled === true
        }
    };
}


module.exports = {
    getDashboardSummary
};