
const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');

// Serviços do bot
const { processMessage } = require('./bot/botEngine');

const {
    getOrCreateCustomer
} = require('./services/customerService');

const {
    getOrCreateConversation,
    saveMessage
} = require('./services/conversationService');

// Serviços de sessões WhatsApp
const {
    getAllWhatsappSessions,
    getSessionsByCompany,
    createWhatsappSession,
    updateWhatsappSessionStatus,
    updateWhatsappSessionPhone,
    updateWhatsappSessionAutoConnect
} = require('./services/whatsappService');

const {
    getDashboardSummary
} = require('./services/dashboardService');

const {
    startSession,
    requestSessionPairingCode,
    stopSession,
    getSession,
    getAllSessions
} = require('./services/whatsappSessionManager');

// Autenticação do dashboard
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;


// =====================================================
// MONITOR DE MEMÓRIA — DIAGNÓSTICO RENDER
// =====================================================

function logMemoryUsage() {
    const memory = process.memoryUsage();

    const rss = (memory.rss / 1024 / 1024).toFixed(1);
    const heapUsed = (memory.heapUsed / 1024 / 1024).toFixed(1);
    const heapTotal = (memory.heapTotal / 1024 / 1024).toFixed(1);
    const external = (memory.external / 1024 / 1024).toFixed(1);

    console.log(
        `🧠 MEMORY | RSS: ${rss} MB | Heap: ${heapUsed}/${heapTotal} MB | External: ${external} MB`
    );
}

setInterval(logMemoryUsage, 5000);

// Middlewares gerais
app.use(cors());
app.use(express.json());


// =====================================================
// 1. PROCESSAR MENSAGENS RECEBIDAS PELO WHATSAPP
// =====================================================

async function handleIncomingMessage(message, session) {
    try {
        // Ignorar mensagens enviadas pelo próprio bot
        if (message.fromMe) return;

        // Ignorar grupos e estados do WhatsApp
        if (
            message.from.endsWith('@g.us') ||
            message.from === 'status@broadcast'
        ) {
            return;
        }

        // Ignorar mensagens sem texto
        if (!message.body || !message.body.trim()) return;

        // Confirmar se a sessão tem uma empresa associada
        if (!session.company || !session.company.company_id) {
            console.log('⚠️ Sessão sem empresa associada:', session.sessionName);
            return;
        }

        const companyId = session.company.company_id;

        // Obter informações do contacto
        const contact = await message.getContact();

        const phone = contact.number || message.from.split('@')[0];

        const customerName =
            contact.pushname ||
            contact.name ||
            message._data?.notifyName ||
            'Cliente';

        console.log('\n📩 Nova mensagem recebida');
        console.log('Empresa:', session.company.companies?.name);
        console.log('Cliente:', customerName);
        console.log('Mensagem:', message.body);

        // Criar ou localizar cliente
        const customer = await getOrCreateCustomer(
            companyId,
            phone,
            customerName
        );

        // Criar ou localizar conversa
        const conversation = await getOrCreateConversation(
            companyId,
            customer.id
        );

        // Guardar mensagem do cliente
        await saveMessage(
            companyId,
            conversation.id,
            'customer',
            message.body
        );

        // Processar mensagem no motor do bot
        const response = await processMessage(
    message.body,
    companyId,
    conversation.id
);

// Se o bot não tiver resposta, não enviar mensagem
if (!response) return;    
        // Enviar resposta ao cliente
        await message.reply(response);

        // Guardar resposta do bot
        await saveMessage(
            companyId,
            conversation.id,
            'bot',
            response
        );

        console.log('🤖 Resposta enviada:', response);

    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
    }
}


// =====================================================
// 2. ROTA PÚBLICA DE SAÚDE DO BACKEND
// =====================================================

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Backend do WhatsApp Bot SaaS está funcionando.',
        activeSessions: getAllSessions().length
    });
});


// =====================================================
// 3. AUTENTICAÇÃO DAS ROTAS DE WHATSAPP
// =====================================================

// Todas as rotas abaixo exigem utilizador autenticado
app.use('/api/whatsapp', authMiddleware);

app.use('/api/dashboard', authMiddleware);


// =====================================================
// DASHBOARD
// =====================================================

app.get('/api/dashboard/summary', async (req, res) => {
    try {

        const summary =
            await getDashboardSummary(
                req.companyId
            );

        return res.json({
            success: true,
            summary
        });

    } catch (error) {

        console.error(
            '❌ Erro ao carregar resumo do Dashboard:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Não foi possível carregar o resumo do Dashboard.'
        });
    }
});


// =====================================================
// 4. FUNÇÃO AUXILIAR: VALIDAR DONO DA SESSÃO
// =====================================================

async function getOwnedSession(
    companyId,
    sessionName
) {

    if (!companyId || !sessionName) {
        return null;
    }

    const companySessions =
        await getSessionsByCompany(companyId);

    return companySessions.find(
        session =>
            session.session_name === sessionName
    ) || null;
}


// =====================================================
// 5. LISTAR SESSÕES DA EMPRESA
// =====================================================

app.get('/api/whatsapp/sessions', async (req, res) => {
    try {
        const companySessions = await getSessionsByCompany(
            req.companyId
        );

        const sessions = companySessions.map(dbSession => {
            const runtimeSession = getSession(
                dbSession.session_name
            );

return {
    id: dbSession.id,

    // Número utilizado na associação
    phone: runtimeSession?.phoneNumber || dbSession.phone || null,

    session_name: dbSession.session_name,

    // Nome amigável da conexão
    display_name: dbSession.display_name || null,

    // Estado atual da conexão
    status: runtimeSession?.status || dbSession.status,

    // QR Code, caso esteja a ser utilizado
    has_qr: Boolean(runtimeSession?.qrImage),

    // Código de associação por número
    pairing_code:
        runtimeSession?.pairingCode &&
        runtimeSession?.pairingCodeGeneratedAt &&
        Date.now() - runtimeSession.pairingCodeGeneratedAt < 3 * 60 * 1000
            ? runtimeSession.pairingCode
            : null,
        created_at: dbSession.created_at
    };        });

        return res.json({
            success: true,
            sessions
        });

    } catch (error) {
        console.error('❌ Erro ao listar sessões:', error);

        return res.status(500).json({
            success: false,
            message: 'Não foi possível listar as sessões.'
        });
    }
});


// =====================================================
// 6. CRIAR NOVA SESSÃO WHATSAPP
// =====================================================

app.post('/api/whatsapp/sessions', async (req, res) => {
    try {
        const { phone, displayName } = req.body;

        if (
            phone !== undefined &&
            phone !== null &&
            typeof phone !== 'string'
        ) {
            return res.status(400).json({
                success: false,
                message: 'O número de telefone deve ser um texto.'
            });
        }


        if (
    displayName !== undefined &&
    displayName !== null &&
    typeof displayName !== 'string'
) {
    return res.status(400).json({
        success: false,
        message: 'O nome da conexão deve ser um texto.'
    });
}

const cleanDisplayName = displayName?.trim() || null;

        // Gerar um nome único para a sessão
        const sessionName =
            `c_${req.companyId.replace(/-/g, '')}_` +
            randomUUID().replace(/-/g, '');

        // Registar a sessão na base de dados
        const newSession = await createWhatsappSession(
            req.companyId,
            sessionName,
            phone || null,
            cleanDisplayName
        );

        // Iniciar a ligação WhatsApp
        try {
            await startSession(
                sessionName,
                handleIncomingMessage
            );

        } catch (startError) {
            console.error(
                '❌ Sessão registada, mas não foi possível iniciar:',
                startError
            );

            return res.status(201).json({
                success: true,
                message: 'Sessão registada, mas a ligação não iniciou. Tente iniciar novamente.',
                session: {
                    id: newSession.id,
                    session_name: sessionName,
                    display_name: newSession.display_name,
                    status: 'disconnected',
                    has_qr: false
                }
            });
        }

        const runtimeSession = getSession(sessionName);

        return res.status(201).json({
            success: true,
            message: 'Sessão criada e inicializada.',
            session: {
                id: newSession.id,
                session_name: sessionName,
                display_name: newSession.display_name,
                status: runtimeSession?.status || 'loading',
                has_qr: Boolean(runtimeSession?.qrImage)
            }
        });

    } catch (error) {
        console.error('❌ Erro ao criar sessão:', error);

        return res.status(500).json({
            success: false,
            message: 'Não foi possível criar a sessão.'
        });
    }
});


/**
 * =====================================================
 * GERAR CÓDIGO DE ASSOCIAÇÃO POR NÚMERO DE TELEFONE
 * =====================================================
 */
app.post(
    '/api/whatsapp/sessions/:sessionName/pairing-code',
    async (req, res) => {

        try {
            const { sessionName } = req.params;
            const { phoneNumber } = req.body;

            // Verificar se a sessão pertence à empresa autenticada
            const companySessions = await getSessionsByCompany(
                req.companyId
            );

            const ownsSession = companySessions.some(
                session => session.session_name === sessionName
            );

            if (!ownsSession) {
                return res.status(404).json({
                    success: false,
                    message: 'Sessão não encontrada.'
                });
            }

            // Verificar se a sessão está carregada no gestor
            const session = getSession(sessionName);

            if (!session || !session.client) {
                return res.status(400).json({
                    success: false,
                    message: 'A sessão ainda não está iniciada. Tente novamente.'
                });
            }

            // Solicitar o código ao WhatsApp
            const result = await requestSessionPairingCode(
                sessionName,
                phoneNumber
            );

            // Guardar o número associado à sessão no Supabase
            await updateWhatsappSessionPhone(
                req.companyId,
                sessionName,
                session.phoneNumber
            );

            return res.json({
                success: true,
                message: 'Código de associação gerado com sucesso.',
                code: result.code
            });

        } catch (error) {

            console.error(
                '❌ Erro ao gerar código de associação:',
                error
            );

            return res.status(400).json({
                success: false,
                message: error.message ||
                    'Não foi possível gerar o código.'
            });
        }
    }
);


// =====================================================
// 7. INICIAR OU REINICIAR UMA SESSÃO
// =====================================================

app.post('/api/whatsapp/sessions/:sessionName/start', async (req, res) => {
    try {
        const { sessionName } = req.params;

        // Confirmar que a sessão pertence à empresa autenticada
        const ownedSession = await getOwnedSession(
            req.companyId,
            sessionName
        );


        if (!ownedSession) {
            return res.status(404).json({
                success: false,
                message: 'Sessão não encontrada.'
            });
        }

        await updateWhatsappSessionAutoConnect(req.companyId, sessionName, true);


        const session = await startSession(
            sessionName,
            handleIncomingMessage
        );

        return res.json({
            success: true,
            message: 'Inicialização da sessão solicitada.',
            session: {
                session_name: sessionName,
                status: session.status,
                has_qr: Boolean(session.qrImage)
            }
        });

    } catch (error) {
        console.error('❌ Erro ao iniciar sessão:', error);

        return res.status(500).json({
            success: false,
            message: 'Não foi possível iniciar a sessão.'
        });
    }
});


// =====================================================
// 8. CONSULTAR QR CODE DE UMA SESSÃO
// =====================================================

app.get('/api/whatsapp/sessions/:sessionName/qr', async (req, res) => {
    try {
        const { sessionName } = req.params;

        const ownedSession = await getOwnedSession(
            req.companyId,
            sessionName
        );

        if (!ownedSession) {
            return res.status(404).json({
                success: false,
                message: 'Sessão não encontrada.'
            });
        }

        const session = getSession(sessionName);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'A sessão ainda não foi inicializada.'
            });
        }

        return res.json({
            success: true,
            session_name: sessionName,
            status: session.status,
            qr: session.qrImage || null
        });

    } catch (error) {
        console.error('❌ Erro ao consultar QR Code:', error);

        return res.status(500).json({
            success: false,
            message: 'Não foi possível consultar o QR Code.'
        });
    }
});


// =====================================================
// 9. DESLIGAR UMA SESSÃO
// =====================================================

app.post('/api/whatsapp/sessions/:sessionName/stop', async (req, res) => {
    try {
        const { sessionName } = req.params;

        const ownedSession = await getOwnedSession(
            req.companyId,
            sessionName
        );


        if (!ownedSession) {
            return res.status(404).json({
                success: false,
                message: 'Sessão não encontrada.'
            });
        }

        await updateWhatsappSessionAutoConnect(req.companyId, sessionName, false);


        const stopped = await stopSession(sessionName);

        // Atualizar a base de dados mesmo se não existir na memória
        if (!stopped) {
            await updateWhatsappSessionStatus(
                req.companyId,
                sessionName,
                'disconnected'
            );
        }

        return res.json({
            success: true,
            message: 'Sessão desligada.',
            session_name: sessionName,
            status: 'disconnected'
        });

    } catch (error) {
        console.error('❌ Erro ao desligar sessão:', error);

        return res.status(500).json({
            success: false,
            message: 'Não foi possível desligar a sessão.'
        });
    }
});


// =====================================================
// 10. CONSULTAR ESTADO DE UMA SESSÃO
// =====================================================

app.get('/api/whatsapp/sessions/:sessionName/status', async (req, res) => {
    try {
        const { sessionName } = req.params;

        const ownedSession = await getOwnedSession(
            req.companyId,
            sessionName
        );

        if (!ownedSession) {
            return res.status(404).json({
                success: false,
                message: 'Sessão não encontrada.'
            });
        }

        const runtimeSession = getSession(sessionName);

        return res.json({
            success: true,
            session_name: sessionName,
            status: runtimeSession?.status || ownedSession.status,
            has_qr: Boolean(runtimeSession?.qrImage),
            last_disconnect_reason:
                runtimeSession?.lastDisconnectReason || null,
            auth_failure:
                runtimeSession?.authFailure || null
        });

    } catch (error) {
        console.error('❌ Erro ao consultar estado:', error);

        return res.status(500).json({
            success: false,
            message: 'Não foi possível consultar o estado da sessão.'
        });
    }
});


async function initializeWhatsappSessions() {
    try {
        console.log('\n🔄 A carregar sessões WhatsApp registadas...');

        const dbSessions = await getAllWhatsappSessions();

        if (!dbSessions || dbSessions.length === 0) {
            console.log('ℹ️ Nenhuma sessão WhatsApp registada.');
            return;
        }

        const sessionsToConnect = dbSessions.filter(
            session => session.auto_connect === true
        );

        const sessionsToKeepDisconnected = dbSessions.length - sessionsToConnect.length;

        console.log(`📱 Total de sessões: ${dbSessions.length}`);
        console.log(`🟢 Sessões autorizadas para reconectar: ${sessionsToConnect.length}`);
        console.log(`🔴 Sessões que permanecerão desligadas: ${sessionsToKeepDisconnected}`);

        for (const dbSession of sessionsToConnect) {
            try {
                console.log(`🔄 A iniciar sessão: ${dbSession.session_name}`);

                await startSession(
                    dbSession.session_name,
                    handleIncomingMessage
                );

            } catch (error) {
                console.error(
                    `❌ Não foi possível iniciar ${dbSession.session_name}:`,
                    error.message
                );
            }
        }

        console.log('✅ Processo de inicialização das sessões concluído.');

    } catch (error) {
        console.error('❌ Erro ao carregar sessões WhatsApp:', error);
    }
}


// =====================================================
// 12. INICIAR SERVIDOR
// =====================================================

app.listen(PORT, async () => {
    console.log('\n======================================');
    console.log('🚀 WHATSAPP BOT SAAS');
    console.log(`🌐 Backend disponível na porta ${PORT}`);
    console.log('======================================\n');

    await initializeWhatsappSessions();
});


// =====================================================
// 13. TRATAMENTO DE ERROS GLOBAIS
// =====================================================

process.on('unhandledRejection', (reason) => {
    console.error('❌ Erro não tratado (Promise):', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Erro não tratado:', error);
});
