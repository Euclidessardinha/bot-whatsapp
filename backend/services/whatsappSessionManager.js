
const {
    Client,
    LocalAuth
} = require('whatsapp-web.js');

const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');

const {
    getCompanyBySession,
    updateWhatsappSessionStatus,
    updateWhatsappSessionPhone
} = require('./whatsappService');


// =====================================================
// ARMAZENAR TODAS AS SESSÕES ATIVAS
// =====================================================

const sessions = new Map();


// =====================================================
// CONFIGURAÇÃO DO AMBIENTE / CHROME
// =====================================================

/*
 * No Windows local:
 * usamos o Chrome instalado no computador.
 *
 * No Render/Linux:
 * não definimos executablePath.
 * Dessa forma, o Puppeteer pode utilizar o navegador
 * disponível no ambiente.
 */

const isWindows = process.platform === 'win32';

const isRender =
    process.env.RENDER === 'true' ||
    process.env.RENDER === '1';

const isProduction =
    process.env.NODE_ENV === 'production' ||
    isRender;

const CHROME_PATH =
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';


// =====================================================
// CONFIGURAÇÃO DO PUPPETEER
// =====================================================

const puppeteerConfig = {
    /*
     * No computador local queremos continuar vendo
     * o navegador para facilitar testes.
     *
     * No Render não existe interface gráfica.
     */
    headless: isProduction,

    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=Translate,BackForwardCache'
    ]
};


/*
 * Somente no Windows local usamos o caminho fixo
 * do Chrome instalado.
 *
 * No Render/Linux NÃO colocamos executablePath.
 */
if (isWindows && !isProduction) {
    puppeteerConfig.executablePath = CHROME_PATH;
} else if (isProduction) {
    const puppeteer = require('puppeteer');

    puppeteerConfig.executablePath = puppeteer.executablePath();

    console.log(
        `🌐 Chrome Puppeteer: ${puppeteerConfig.executablePath}`
    );
}


// =====================================================
// ATUALIZAR ESTADO LOCAL E NO SUPABASE
// =====================================================

async function updateSessionStatus(
    session,
    status
) {

    session.status = status;

    /*
     * IMPORTANTE:
     *
     * Uma sessão só pode ser atualizada se soubermos
     * a empresa à qual ela pertence.
     *
     * Isso evita alterações sem company_id.
     */

    if (!session.companyId) {

        console.error(
            `❌ Não foi possível atualizar a sessão ${session.sessionName}: companyId não encontrado.`
        );

        return;
    }

    try {

        await updateWhatsappSessionStatus(
            session.companyId,
            session.sessionName,
            status
        );

    } catch (error) {

        console.error(
            `❌ Erro ao atualizar sessão ${session.sessionName}:`,
            error.message
        );
    }
}


// =====================================================
// CRIAR E INICIAR UMA SESSÃO
// =====================================================

async function startSession(
    sessionName,
    onMessage
) {

    if (!sessionName) {
        throw new Error(
            'Nome da sessão obrigatório.'
        );
    }


    // =================================================
    // VALIDAR NOME DA SESSÃO
    // =================================================

    if (!/^[A-Za-z0-9_-]+$/.test(sessionName)) {

        throw new Error(
            'Nome da sessão contém caracteres inválidos.'
        );
    }


    // =================================================
    // VERIFICAR SE A SESSÃO JÁ ESTÁ NA MEMÓRIA
    // =================================================

    if (sessions.has(sessionName)) {

        const existingSession =
            sessions.get(sessionName);

        /*
         * Se ainda estiver em funcionamento,
         * reutilizar a sessão existente.
         */

        if (
            existingSession.status !== 'disconnected' &&
            existingSession.status !== 'auth_failure'
        ) {

            return existingSession;
        }


        /*
         * Se estiver desconectada,
         * limpar o cliente anterior.
         */

        try {

            if (existingSession.client) {

                await existingSession.client.destroy();
            }

        } catch (error) {

            console.log(
                '⚠️ Não foi possível limpar a sessão anterior:',
                error.message
            );
        }

        sessions.delete(sessionName);
    }


    // =================================================
    // DESCOBRIR A EMPRESA DA SESSÃO
    // =================================================

    /*
     * IMPORTANTE:
     *
     * Antes de iniciar o cliente WhatsApp,
     * descobrimos a empresa proprietária da sessão.
     *
     * Assim todos os eventos posteriores terão
     * acesso ao companyId correto.
     */

    let company;

    try {

        company =
            await getCompanyBySession(sessionName);

    } catch (error) {

        console.error(
            `❌ Erro ao localizar empresa da sessão ${sessionName}:`,
            error.message
        );

        throw error;
    }


    if (!company) {

        throw new Error(
            `Nenhuma empresa encontrada para a sessão "${sessionName}".`
        );
    }


    if (!company.company_id) {

        throw new Error(
            `A sessão "${sessionName}" não possui company_id válido.`
        );
    }


    // =================================================
    // CRIAR OBJETO DA SESSÃO
    // =================================================

    const session = {

        sessionName,

        companyId:
            company.company_id,

        company,

        client: null,

        status: 'loading',

        qr: null,

        qrImage: null,

        pairingCode: null,

        pairingCodeGeneratedAt: null,

        phoneNumber: null,

        lastDisconnectReason: null,

        authFailure: null
    };


    sessions.set(
        sessionName,
        session
    );


    // =================================================
    // CRIAR CLIENT WHATSAPP
    // =================================================

    const client = new Client({

        authStrategy: new LocalAuth({
            clientId: sessionName
        }),

        puppeteer: puppeteerConfig
    });


    session.client = client;


    // =================================================
    // QR CODE
    // =================================================

    client.on(
        'qr',
        async (qr) => {

            console.log(
                `📱 QR Code da sessão: ${sessionName}`
            );


            qrcode.generate(
                qr,
                {
                    small: true
                }
            );


            session.qr = qr;


            try {

                session.qrImage =
                    await QRCode.toDataURL(qr);

            } catch (error) {

                console.error(
                    '❌ Erro ao gerar QR:',
                    error
                );

                session.qrImage = null;
            }


            session.lastDisconnectReason =
                null;

            session.authFailure =
                null;


            await updateSessionStatus(
                session,
                'qr'
            );
        }
    );


    // =================================================
    // CÓDIGO DE ASSOCIAÇÃO
    // =================================================

    client.on(
        'code',
        async (code) => {

            console.log(
                `📱 Código de associação gerado para ${sessionName}: ${code}`
            );


            session.pairingCode =
                code;

            session.pairingCodeGeneratedAt =
                Date.now();


            await updateSessionStatus(
                session,
                'pairing_code'
            );
        }
    );


    // =================================================
    // AUTENTICAÇÃO
    // =================================================

    client.on(
        'authenticated',
        async () => {

            console.log(
                `🔐 Sessão autenticada: ${sessionName}`
            );


            session.qr = null;

            session.qrImage = null;

            session.authFailure = null;


            await updateSessionStatus(
                session,
                'authenticated'
            );
        }
    );


    // =================================================
    // FALHA NA AUTENTICAÇÃO
    // =================================================

    client.on(
        'auth_failure',
        async (message) => {

            console.error(
                `❌ Falha de autenticação (${sessionName}):`,
                message
            );


            session.authFailure =
                message;

            session.qr = null;

            session.qrImage = null;


            await updateSessionStatus(
                session,
                'auth_failure'
            );
        }
    );


    // =================================================
    // WHATSAPP PRONTO
    // =================================================

    client.on(
        'ready',
        async () => {

            console.log(
                `🤖 WhatsApp conectado: ${sessionName}`
            );


            // =========================================
            // OBTER NÚMERO REAL DO WHATSAPP
            // =========================================

            try {

                if (
                    client.info &&
                    client.info.wid
                ) {

                    const connectedPhone =
                        client.info.wid.user;


                    if (connectedPhone) {

                        session.phoneNumber =
                            connectedPhone;


                        await updateWhatsappSessionPhone(
                            session.companyId,
                            session.sessionName,
                            connectedPhone
                        );


                        console.log(
                            `📱 Número WhatsApp conectado: ${connectedPhone}`
                        );
                    }
                }

            } catch (phoneError) {

                console.error(
                    `⚠️ Não foi possível guardar o número WhatsApp (${sessionName}):`,
                    phoneError.message
                );
            }


            // =========================================
            // VALIDAR EMPRESA DA SESSÃO
            // =========================================

            try {

                /*
                 * A empresa já foi carregada antes
                 * de iniciar o cliente.
                 *
                 * Fazemos uma nova leitura aqui para
                 * garantir que a associação continua
                 * válida no momento da conexão.
                 */

                const currentCompany =
                    await getCompanyBySession(
                        sessionName
                    );


                if (!currentCompany) {

                    throw new Error(
                        'Empresa associada à sessão não encontrada.'
                    );
                }


                if (
                    currentCompany.company_id !==
                    session.companyId
                ) {

                    throw new Error(
                        'A empresa da sessão foi alterada durante a conexão.'
                    );
                }


                session.company =
                    currentCompany;


                console.log(
                    '🏢 Empresa:',
                    session.company.companies.name
                );


                console.log(
                    '🆔 Company ID:',
                    session.companyId
                );


                // =====================================
                // LIMPAR ESTADOS TEMPORÁRIOS
                // =====================================

                session.qr = null;

                session.qrImage = null;

                session.lastDisconnectReason =
                    null;

                session.pairingCode =
                    null;

                session.pairingCodeGeneratedAt =
                    null;


                await updateSessionStatus(
                    session,
                    'connected'
                );

            } catch (error) {

                console.error(
                    `❌ Erro ao carregar empresa (${sessionName}):`,
                    error
                );


                session.company =
                    null;

                session.lastDisconnectReason =
                    'company_load_failed';


                await updateSessionStatus(
                    session,
                    'disconnected'
                );


                try {

                    await client.destroy();

                } catch (destroyError) {

                    console.error(
                        '⚠️ Erro ao limpar cliente:',
                        destroyError.message
                    );
                }
            }
        }
    );


    // =================================================
    // RECEBER MENSAGENS
    // =================================================

    client.on(
        'message',
        async (message) => {

            if (!session.company) {

                console.error(
                    `❌ Empresa não carregada: ${sessionName}`
                );

                return;
            }


            try {

                await onMessage(
                    message,
                    session
                );

            } catch (error) {

                console.error(
                    `❌ Erro ao processar mensagem (${sessionName}):`,
                    error
                );
            }
        }
    );


    // =================================================
    // DESCONECTAR
    // =================================================

    client.on(
        'disconnected',
        async (reason) => {

            console.log(
                `⚠️ Sessão desconectada (${sessionName}):`,
                reason
            );


            session.company =
                null;

            session.qr =
                null;

            session.qrImage =
                null;

            session.lastDisconnectReason =
                reason;

            session.pairingCode =
                null;

            session.pairingCodeGeneratedAt =
                null;


            await updateSessionStatus(
                session,
                'disconnected'
            );
        }
    );


    // =================================================
    // INICIALIZAR CLIENTE
    // =================================================

    try {

        console.log(
            `🚀 Iniciando sessão ${sessionName}...`
        );

        console.log(
            `🖥️ Ambiente: ${isProduction ? 'produção/Render' : 'desenvolvimento/local'}`
        );

        console.log(
            `🌐 Plataforma: ${process.platform}`
        );

        console.log(
            `👻 Headless: ${puppeteerConfig.headless}`
        );

        if (puppeteerConfig.executablePath) {

            console.log(
                `🌐 Chrome: ${puppeteerConfig.executablePath}`
            );

        } else {

            console.log(
                '🌐 Chrome: navegador gerenciado pelo Puppeteer'
            );
        }


        await client.initialize();

    } catch (error) {

        console.error(
            `❌ Erro ao iniciar sessão ${sessionName}:`,
            error
        );


        try {

            if (session.client) {

                await session.client.destroy();
            }

        } catch (destroyError) {

            console.error(
                '⚠️ Erro ao limpar cliente após falha:',
                destroyError.message
            );
        }


        session.company =
            null;

        session.qr =
            null;

        session.qrImage =
            null;

        session.pairingCode =
            null;

        session.pairingCodeGeneratedAt =
            null;


        await updateSessionStatus(
            session,
            'disconnected'
        );


        sessions.delete(
            sessionName
        );


        throw error;
    }


    return session;
}


// =====================================================
// GERAR CÓDIGO DE ASSOCIAÇÃO POR NÚMERO
// =====================================================

async function requestSessionPairingCode(
    sessionName,
    phoneNumber
) {

    const session =
        sessions.get(sessionName);


    if (
        !session ||
        !session.client
    ) {

        throw new Error(
            'Sessão não encontrada ou ainda não iniciada.'
        );
    }


    if (
        session.status === 'connected' ||
        session.status === 'authenticated'
    ) {

        throw new Error(
            'Este WhatsApp já está associado.'
        );
    }


    // =================================================
    // LIMPAR TELEFONE
    // =================================================

    const cleanPhone =
        String(phoneNumber || '')
            .replace(/\D/g, '');


    // =================================================
    // VALIDAR TELEFONE
    // =================================================

    if (
        !/^[1-9]\d{7,14}$/.test(
            cleanPhone
        )
    ) {

        throw new Error(
            'Número inválido. Introduza o indicativo do país e o número, apenas com algarismos.'
        );
    }


    try {

        session.phoneNumber =
            cleanPhone;

        session.pairingCode =
            null;


        console.log(
            `📲 A solicitar código para ${cleanPhone}`
        );


        const code =
            await session.client.requestPairingCode(
                cleanPhone
            );


        session.pairingCode =
            code;


        session.pairingCodeGeneratedAt =
            Date.now();


        await updateSessionStatus(
            session,
            'pairing_code'
        );


        return {
            success: true,
            code
        };

    } catch (error) {

        console.error(
            `❌ Erro ao gerar código (${sessionName}):`,
            error
        );


        throw new Error(
            'Não foi possível gerar o código. Verifique se a sessão está iniciada e tente novamente.'
        );
    }
}


// =====================================================
// DESLIGAR UMA SESSÃO
// =====================================================

async function stopSession(
    sessionName
) {

    const session =
        sessions.get(sessionName);


    if (!session) {
        return false;
    }


    try {

        if (session.client) {

            await session.client.destroy();
        }


        session.company =
            null;

        session.qr =
            null;

        session.qrImage =
            null;


        await updateSessionStatus(
            session,
            'disconnected'
        );


        sessions.delete(
            sessionName
        );


        console.log(
            `🔌 Sessão desligada: ${sessionName}`
        );


        return true;

    } catch (error) {

        console.error(
            `❌ Erro ao desligar sessão ${sessionName}:`,
            error
        );

        throw error;
    }
}


// =====================================================
// OBTER UMA SESSÃO
// =====================================================

function getSession(
    sessionName
) {

    return (
        sessions.get(sessionName) ||
        null
    );
}


// =====================================================
// LISTAR TODAS AS SESSÕES
// =====================================================

function getAllSessions() {

    return Array.from(
        sessions.values()
    );
}


// =====================================================
// EXPORTAÇÕES
// =====================================================

module.exports = {

    startSession,

    requestSessionPairingCode,

    stopSession,

    getSession,

    getAllSessions
};

