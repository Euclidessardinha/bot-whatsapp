import { supabase } from '../lib/supabase';


/*
    Buscar configurações do bot da empresa
*/
export async function getBotSettings(companyId) {
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
            'Erro ao buscar configurações do bot:',
            error
        );

        throw error;
    }

    return data;
}


/*
    Atualizar configurações do bot
*/
export async function updateBotSettings(
    companyId,
    settings
) {
    const { data, error } = await supabase
        .from('bot_settings')
        .update({
            bot_enabled: settings.bot_enabled,
            menu_enabled: settings.menu_enabled,
            orders_enabled: settings.orders_enabled,
            human_support_enabled:
                settings.human_support_enabled
        })
        .eq('company_id', companyId)
        .select()
        .single();

    if (error) {
        console.error(
            'Erro ao atualizar configurações do bot:',
            error
        );

        throw error;
    }

    return data;
}