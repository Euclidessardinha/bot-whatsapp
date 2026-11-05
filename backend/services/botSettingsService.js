
const supabase = require('../lib/supabase');

/*
    Buscar configurações do bot da empresa
*/
async function getBotSettings(companyId) {
    if (!companyId) {
        throw new Error('O ID da empresa é obrigatório.');
    }

    const { data, error } = await supabase
        .from('bot_settings')
        .select(`
            company_id,
            bot_enabled,
            menu_enabled,
            orders_enabled,
            human_support_enabled
        `)
        .eq('company_id', companyId)
        .maybeSingle();

    if (error) {
        console.error(
            '❌ Erro ao buscar configurações do bot:',
            error
        );

        throw error;
    }

    if (!data) {
        console.warn(
            `⚠️ Não existem configurações para a empresa ${companyId}.`
        );

        return null;
    }

    return data;
}

module.exports = {
    getBotSettings
};
