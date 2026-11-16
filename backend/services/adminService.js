const supabase = require('../lib/supabase');

async function getAdminSummary() {
    const [
        companiesResult,
        profilesResult,
        botSettingsResult,
        whatsappResult
    ] = await Promise.all([
        supabase
            .from('companies')
            .select('id', { count: 'exact', head: true }),

        supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true }),

        supabase
            .from('bot_settings')
            .select('id, bot_enabled'),

        supabase
            .from('whatsapp_sessions')
            .select('id, status')
    ]);

    if (companiesResult.error) {
        throw companiesResult.error;
    }

    if (profilesResult.error) {
        throw profilesResult.error;
    }

    if (botSettingsResult.error) {
        throw botSettingsResult.error;
    }

    if (whatsappResult.error) {
        throw whatsappResult.error;
    }

    const botSettings = botSettingsResult.data || [];
    const whatsappSessions = whatsappResult.data || [];

    return {
        companies: companiesResult.count || 0,
        users: profilesResult.count || 0,
        bots: {
            total: botSettings.length,
            enabled: botSettings.filter(bot => bot.bot_enabled).length,
            disabled: botSettings.filter(bot => !bot.bot_enabled).length
        },
        whatsapp: {
            total: whatsappSessions.length,
            connected: whatsappSessions.filter(
                session => session.status === 'connected'
            ).length,
            disconnected: whatsappSessions.filter(
                session => session.status === 'disconnected'
            ).length,
            qr: whatsappSessions.filter(
                session => session.status === 'qr'
            ).length
        }
    };
}

async function getAllCompanies() {
    const { data, error } = await supabase
        .from('companies')
        .select(`
            id,
            name,
            phone,
            location,
            business_type,
            created_at,
            bot_settings (
                bot_enabled,
                menu_enabled,
                orders_enabled,
                human_support_enabled
            ),
            whatsapp_sessions (
                id,
                session_name,
                display_name,
                phone,
                status,
                auto_connect
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        throw error;
    }

    return data || [];
}

async function getCompanyDetails(companyId) {
    const { data: company, error: companyError } = await supabase
        .from('companies')
        .select(`
            id,
            name,
            phone,
            location,
            welcome_message,
            business_type,
            business_hours,
            created_at,
            updated_at,
            bot_settings (
                id,
                bot_enabled,
                menu_enabled,
                orders_enabled,
                human_support_enabled
            ),
            whatsapp_sessions (
                id,
                session_name,
                display_name,
                phone,
                status,
                auto_connect,
                created_at,
                updated_at
            )
        `)
        .eq('id', companyId)
        .maybeSingle();

    if (companyError) {
        throw companyError;
    }

    if (!company) {
        return null;
    }

    const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            role,
            onboarding_completed
        `)
        .eq('company_id', companyId);

    if (usersError) {
        throw usersError;
    }

    return {
        ...company,
        users: users || []
    };
}

async function getAllUsers() {
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id,
            company_id,
            full_name,
            role,
            onboarding_completed,
            companies (
                id,
                name
            )
        `)
        .order('full_name', { ascending: true });

    if (error) {
        throw error;
    }

    return data || [];
}

module.exports = {
    getAdminSummary,
    getAllCompanies,
    getCompanyDetails,
    getAllUsers
};