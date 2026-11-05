const supabase = require('../lib/supabase');


/**
 * =========================================================
 * BUSCAR EMPRESA ATRAVÉS DA SESSÃO
 * =========================================================
 *
 * Esta função é usada pelo gerenciador global de sessões
 * para descobrir a qual empresa uma sessão pertence.
 *
 * O session_name deve ser único no sistema.
 */
async function getCompanyBySession(sessionName) {

    if (!sessionName) {
        throw new Error(
            'Nome da sessão é obrigatório.'
        );
    }

    const {
        data,
        error
    } = await supabase
        .from('whatsapp_sessions')
        .select(`
            id,
            company_id,
            phone,
            session_name,
            display_name,
            status,
            auto_connect,
            companies (
                id,
                name,
                phone,
                location,
                welcome_message,
                business_type
            )
        `)
        .eq(
            'session_name',
            sessionName
        )
        .maybeSingle();

    if (error) {
        console.error(
            '❌ Erro ao buscar sessão:',
            error
        );

        throw error;
    }

    return data;
}


/**
 * =========================================================
 * LISTAR SESSÕES DE UMA EMPRESA
 * =========================================================
 */
async function getSessionsByCompany(companyId) {

    if (!companyId) {
        throw new Error(
            'O ID da empresa é obrigatório.'
        );
    }

    const {
        data,
        error
    } = await supabase
        .from('whatsapp_sessions')
        .select(`
            id,
            company_id,
            phone,
            session_name,
            display_name,
            status,
            auto_connect,
            created_at,
            updated_at
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
            '❌ Erro ao listar sessões:',
            error
        );

        throw error;
    }

    return data || [];
}


/**
 * =========================================================
 * CRIAR NOVA SESSÃO
 * =========================================================
 */
async function createWhatsappSession(
    companyId,
    sessionName,
    phone = null,
    displayName = null
) {

    if (
        !companyId ||
        !sessionName
    ) {
        throw new Error(
            'Empresa e nome da sessão são obrigatórios.'
        );
    }

    const cleanSessionName =
        String(sessionName).trim();

    if (!cleanSessionName) {
        throw new Error(
            'O nome da sessão não pode estar vazio.'
        );
    }

    const {
        data,
        error
    } = await supabase
        .from('whatsapp_sessions')
        .insert([
            {
                company_id:
                    companyId,

                session_name:
                    cleanSessionName,

                phone:
                    phone || null,

                display_name:
                    displayName
                        ? String(displayName).trim()
                        : null,

                status:
                    'disconnected',

                auto_connect:
                    true
            }
        ])
        .select()
        .single();

    if (error) {
        console.error(
            '❌ Erro ao criar sessão:',
            error
        );

        throw error;
    }

    return data;
}


/**
 * =========================================================
 * ATUALIZAR ESTADO DA SESSÃO
 * =========================================================
 *
 * IMPORTANTE:
 * companyId + sessionName são usados juntos.
 *
 * Assim evitamos atualizar uma sessão de outra empresa.
 */
async function updateWhatsappSessionStatus(
    companyId,
    sessionName,
    status
) {

    if (
        !companyId ||
        !sessionName ||
        !status
    ) {
        throw new Error(
            'Empresa, nome da sessão e estado são obrigatórios.'
        );
    }

    const validStatuses = [
        'disconnected',
        'connecting',
        'connected',
        'authenticated',
        'qr',
        'pairing_code',
        'error',
        'auth_failure'
    ];

    if (!validStatuses.includes(status)) {
        throw new Error(
            `Estado de sessão inválido: ${status}`
        );
    }

    const {
        data,
        error
    } = await supabase
        .from('whatsapp_sessions')
        .update({
            status:
                status,

            updated_at:
                new Date().toISOString()
        })
        .eq(
            'company_id',
            companyId
        )
        .eq(
            'session_name',
            sessionName
        )
        .select()
        .maybeSingle();

    if (error) {
        console.error(
            '❌ Erro ao atualizar estado da sessão:',
            error
        );

        throw error;
    }

    if (!data) {
        throw new Error(
            'Sessão não encontrada ou não pertence à empresa.'
        );
    }

    return data;
}


/**
 * =========================================================
 * ATUALIZAR PREFERÊNCIA DE CONEXÃO AUTOMÁTICA
 * =========================================================
 */
async function updateWhatsappSessionAutoConnect(
    companyId,
    sessionName,
    autoConnect
) {

    if (
        !companyId ||
        !sessionName ||
        typeof autoConnect !== 'boolean'
    ) {
        throw new Error(
            'Empresa, nome da sessão e preferência de conexão são obrigatórios.'
        );
    }

    const {
        data,
        error
    } = await supabase
        .from('whatsapp_sessions')
        .update({
            auto_connect:
                autoConnect,

            updated_at:
                new Date().toISOString()
        })
        .eq(
            'company_id',
            companyId
        )
        .eq(
            'session_name',
            sessionName
        )
        .select()
        .maybeSingle();

    if (error) {
        console.error(
            '❌ Erro ao atualizar conexão automática:',
            error
        );

        throw error;
    }

    if (!data) {
        throw new Error(
            'Sessão não encontrada ou não pertence à empresa.'
        );
    }

    return data;
}


/**
 * =========================================================
 * ATUALIZAR NÚMERO DE TELEFONE DA SESSÃO
 * =========================================================
 */
async function updateWhatsappSessionPhone(
    companyId,
    sessionName,
    phone
) {

    if (
        !companyId ||
        !sessionName ||
        !phone
    ) {
        throw new Error(
            'Empresa, nome da sessão e telefone são obrigatórios.'
        );
    }

    const cleanPhone =
        String(phone).trim();

    if (!cleanPhone) {
        throw new Error(
            'O telefone não pode estar vazio.'
        );
    }

    const {
        data,
        error
    } = await supabase
        .from('whatsapp_sessions')
        .update({
            phone:
                cleanPhone,

            updated_at:
                new Date().toISOString()
        })
        .eq(
            'company_id',
            companyId
        )
        .eq(
            'session_name',
            sessionName
        )
        .select()
        .maybeSingle();

    if (error) {
        console.error(
            '❌ Erro ao atualizar telefone da sessão:',
            error
        );

        throw error;
    }

    if (!data) {
        throw new Error(
            'Sessão não encontrada ou não pertence à empresa.'
        );
    }

    return data;
}


/**
 * =========================================================
 * LISTAR TODAS AS SESSÕES WHATSAPP
 * =========================================================
 *
 * Esta função é global e deve ser usada somente por
 * funcionalidades administrativas/internas do sistema.
 */
async function getAllWhatsappSessions() {

    const {
        data,
        error
    } = await supabase
        .from('whatsapp_sessions')
        .select(`
            id,
            company_id,
            phone,
            session_name,
            display_name,
            status,
            auto_connect
        `)
        .order(
            'created_at',
            {
                ascending: true
            }
        );

    if (error) {
        console.error(
            '❌ Erro ao listar todas as sessões:',
            error
        );

        throw error;
    }

    return data || [];
}


/**
 * =========================================================
 * EXPORTAÇÕES
 * =========================================================
 */
module.exports = {
    getCompanyBySession,
    getSessionsByCompany,
    getAllWhatsappSessions,
    createWhatsappSession,
    updateWhatsappSessionStatus,
    updateWhatsappSessionAutoConnect,
    updateWhatsappSessionPhone
};