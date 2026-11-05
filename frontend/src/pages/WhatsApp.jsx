import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './WhatsApp.css';

const API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function WhatsApp() {
    const [sessions, setSessions] = useState([]);
    const [qrCodes, setQrCodes] = useState({});
    const [phoneNumbers, setPhoneNumbers] = useState({});
    const [pairingCodes, setPairingCodes] = useState({});
    const [pairingLoading, setPairingLoading] = useState({});
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [actionLoading, setActionLoading] = useState({});
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    // =========================================================
    // TOKEN
    // =========================================================

    const getToken = async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
            throw new Error(
                'A sua sessão expirou. Faça login novamente.'
            );
        }

        return session.access_token;
    };

    // =========================================================
    // API
    // =========================================================

    const apiRequest = async (path, options = {}) => {
        const token = await getToken();

        const response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...(options.headers || {}),
            },
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message || 'Ocorreu um erro na comunicação com o servidor.'
            );
        }

        return data;
    };

    // =========================================================
    // QR CODE
    // =========================================================

    const loadQrCode = useCallback(async (sessionName) => {
        try {
            const data = await apiRequest(
                `/api/whatsapp/sessions/${encodeURIComponent(
                    sessionName
                )}/qr`
            );

            if (data.qr) {
                setQrCodes((current) => ({
                    ...current,
                    [sessionName]: data.qr,
                }));
            } else {
                setQrCodes((current) => {
                    const updated = { ...current };
                    delete updated[sessionName];
                    return updated;
                });
            }
        } catch (err) {
            console.error(
                `Erro ao carregar QR Code da sessão ${sessionName}:`,
                err
            );
        }
    }, []);

    // =========================================================
    // CARREGAR SESSÕES
    // =========================================================

    const loadSessions = useCallback(
        async (showLoading = false) => {
            try {
                if (showLoading) {
                    setLoading(true);
                }

                setError('');

                const data = await apiRequest(
                    '/api/whatsapp/sessions'
                );

                const loadedSessions = data.sessions || [];

                setSessions(loadedSessions);

                // Restaurar números
                const restoredPhones = {};

                // Restaurar códigos de emparelhamento
                const restoredPairingCodes = {};

                for (const item of loadedSessions) {
                    if (item.phone) {
                        restoredPhones[item.session_name] =
                            item.phone;
                    }

                    if (item.pairing_code) {
                        restoredPairingCodes[item.session_name] =
                            item.pairing_code;
                    }

                    if (
                        item.has_qr ||
                        item.status === 'qr'
                    ) {
                        await loadQrCode(item.session_name);
                    } else {
                        setQrCodes((current) => {
                            const updated = { ...current };
                            delete updated[item.session_name];
                            return updated;
                        });
                    }
                }

                // Preservar os números que o utilizador está a escrever
setPhoneNumbers((current) => ({
    ...restoredPhones,
    ...current,
}));

// Restaurar os códigos de emparelhamento
setPairingCodes((current) => ({
    ...restoredPairingCodes,
    ...current,
}));
            } catch (err) {
                console.error(
                    'Erro ao carregar sessões:',
                    err
                );

                setError(
                    err.message ||
                        'Não foi possível carregar as conexões do WhatsApp.'
                );
            } finally {
                if (showLoading) {
                    setLoading(false);
                }
            }
        },
        [loadQrCode]
    );

    // =========================================================
    // CARREGAMENTO INICIAL
    // =========================================================

    useEffect(() => {
        loadSessions(true);
    }, [loadSessions]);

    // =========================================================
    // ATUALIZAÇÃO AUTOMÁTICA
    // =========================================================

    useEffect(() => {
        const interval = setInterval(() => {
            loadSessions(false);
        }, 5000);

        return () => clearInterval(interval);
    }, [loadSessions]);

    // =========================================================
    // CRIAR NOVA CONEXÃO
    // =========================================================

    const createSession = async () => {
        try {
            setCreating(true);
            setError('');
            setNotice('');

            const displayName = window.prompt(
                'Digite um nome para esta conexão do WhatsApp:',
                ''
            );

            // Se o utilizador cancelar
            if (displayName === null) {
                setCreating(false);
                return;
            }

            const cleanDisplayName = displayName.trim();

            if (!cleanDisplayName) {
                setError(
                    'Digite um nome para identificar esta conexão.'
                );

                setCreating(false);
                return;
            }

            const data = await apiRequest(
                '/api/whatsapp/sessions',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        displayName: cleanDisplayName,
                    }),
                }
            );

            setNotice(
                data.message ||
                    'Conexão criada com sucesso. Aguarde a geração do QR Code.'
            );

            await loadSessions(false);
        } catch (err) {
            console.error(
                'Erro ao criar sessão:',
                err
            );

            setError(
                err.message ||
                    'Não foi possível criar a conexão.'
            );
        } finally {
            setCreating(false);
        }
    };

    // =========================================================
    // INICIAR SESSÃO
    // =========================================================

    const startSession = async (sessionName) => {
        try {
            setActionLoading((current) => ({
                ...current,
                [sessionName]: true,
            }));

            setError('');
            setNotice('');

            const data = await apiRequest(
                `/api/whatsapp/sessions/${encodeURIComponent(
                    sessionName
                )}/start`,
                {
                    method: 'POST',
                }
            );

            setNotice(
                data.message ||
                    'A conexão foi iniciada.'
            );

            await loadSessions(false);
        } catch (err) {
            console.error(
                'Erro ao iniciar sessão:',
                err
            );

            setError(
                err.message ||
                    'Não foi possível iniciar a conexão.'
            );
        } finally {
            setActionLoading((current) => ({
                ...current,
                [sessionName]: false,
            }));
        }
    };

    // =========================================================
    // GERAR CÓDIGO DE EMPARELHAMENTO
    // =========================================================

    const generatePairingCode = async (sessionName) => {
        const phoneNumber =
            phoneNumbers[sessionName]?.trim();

        if (!phoneNumber) {
            setError(
                'Digite o número de telefone antes de gerar o código.'
            );
            return;
        }

        try {
            setPairingLoading((current) => ({
                ...current,
                [sessionName]: true,
            }));

            setError('');
            setNotice('');

            const data = await apiRequest(
                `/api/whatsapp/sessions/${encodeURIComponent(
                    sessionName
                )}/pairing-code`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        phoneNumber,
                    }),
                }
            );

            const code =
                data.code || data.pairing_code;

            if (!code) {
                throw new Error(
                    'O servidor não devolveu um código de emparelhamento.'
                );
            }

            setPairingCodes((current) => ({
                ...current,
                [sessionName]: code,
            }));

            setNotice(
                'Código de emparelhamento gerado. Use-o no WhatsApp do telefone.'
            );

            await loadSessions(false);
        } catch (err) {
            console.error(
                'Erro ao gerar código:',
                err
            );

            setError(
                err.message ||
                    'Não foi possível gerar o código de emparelhamento.'
            );
        } finally {
            setPairingLoading((current) => ({
                ...current,
                [sessionName]: false,
            }));
        }
    };

    // =========================================================
    // PARAR SESSÃO
    // =========================================================

    const stopSession = async (sessionName) => {
        const confirmed = window.confirm(
            'Tem certeza que deseja parar esta conexão do WhatsApp?'
        );

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading((current) => ({
                ...current,
                [sessionName]: true,
            }));

            setError('');
            setNotice('');

            const data = await apiRequest(
                `/api/whatsapp/sessions/${encodeURIComponent(
                    sessionName
                )}/stop`,
                {
                    method: 'POST',
                }
            );

            setQrCodes((current) => {
                const updated = { ...current };
                delete updated[sessionName];
                return updated;
            });

            setPairingCodes((current) => {
                const updated = { ...current };
                delete updated[sessionName];
                return updated;
            });

            setNotice(
                data.message ||
                    'A conexão foi parada.'
            );

            await loadSessions(false);
        } catch (err) {
            console.error(
                'Erro ao parar sessão:',
                err
            );

            setError(
                err.message ||
                    'Não foi possível parar a conexão.'
            );
        } finally {
            setActionLoading((current) => ({
                ...current,
                [sessionName]: false,
            }));
        }
    };

    // =========================================================
    // COPIAR CÓDIGO
    // =========================================================

    const copyPairingCode = async (sessionName) => {
        const code = pairingCodes[sessionName];

        if (!code) {
            return;
        }

        try {
            await navigator.clipboard.writeText(code);

            setNotice(
                'Código de emparelhamento copiado.'
            );
        } catch (err) {
            console.error(
                'Erro ao copiar código:',
                err
            );

            setError(
                'Não foi possível copiar o código automaticamente.'
            );
        }
    };

    // =========================================================
    // STATUS
    // =========================================================

    const getStatusInfo = (status) => {
        switch (status) {
            case 'connected':
                return {
                    label: 'Conectado',
                    className: 'connected',
                    description:
                        'O WhatsApp está conectado e o bot pode receber mensagens.',
                };

            case 'qr':
                return {
                    label: 'Aguardando QR Code',
                    className: 'qr',
                    description:
                        'Leia o QR Code com o WhatsApp para conectar esta conta.',
                };

            case 'pairing_code':
                return {
                    label: 'Aguardando emparelhamento',
                    className: 'pairing',
                    description:
                        'Use o código de emparelhamento no WhatsApp do telefone.',
                };

            case 'authenticated':
                return {
                    label: 'Autenticado',
                    className: 'authenticated',
                    description:
                        'A conta foi autenticada e está a finalizar a conexão.',
                };

            case 'auth_failure':
                return {
                    label: 'Falha na autenticação',
                    className: 'auth-failure',
                    description:
                        'Não foi possível autenticar esta conta do WhatsApp.',
                };

            case 'disconnected':
                return {
                    label: 'Desconectado',
                    className: 'disconnected',
                    description:
                        'Esta conexão está parada ou desconectada.',
                };

            default:
                return {
                    label: 'A iniciar',
                    className: 'loading',
                    description:
                        'A conexão está a ser inicializada.',
                };
        }
    };

    // =========================================================
    // ESTATÍSTICAS
    // =========================================================

    const connectedCount = sessions.filter(
        (item) => item.status === 'connected'
    ).length;

    // =========================================================
    // INTERFACE
    // =========================================================

    return (
        <div className="whatsapp-page">
            {/* HEADER */}
            <div className="whatsapp-header">
                <div>
                    <h1>WhatsApp</h1>

                    <p>
                        Gerencie as conexões do WhatsApp da sua empresa.
                    </p>
                </div>

                <div className="whatsapp-header-actions">
                    <button
                        type="button"
                        className="whatsapp-refresh-button"
                        onClick={() => loadSessions(false)}
                        disabled={loading}
                    >
                        ↻ Atualizar
                    </button>

                    <button
                        type="button"
                        className="whatsapp-add-button"
                        onClick={createSession}
                        disabled={creating}
                    >
                        {creating
                            ? 'A criar...'
                            : '+ Adicionar WhatsApp'}
                    </button>
                </div>
            </div>

            {/* ERRO */}
            {error && (
                <div className="whatsapp-error">
                    {error}
                </div>
            )}

            {/* AVISO */}
            {notice && (
                <div className="whatsapp-notice">
                    {notice}
                </div>
            )}

            {/* RESUMO */}
            <div className="whatsapp-summary">
                <div className="whatsapp-summary-card">
                    <span>📱</span>

                    <strong>
                        {sessions.length}
                    </strong>

                    <p>
                        Conexões
                    </p>
                </div>

                <div className="whatsapp-summary-card">
                    <span>🟢</span>

                    <strong>
                        {connectedCount}
                    </strong>

                    <p>
                        Conectadas
                    </p>
                </div>

                <div className="whatsapp-summary-card">
                    <span>⚡</span>

                    <strong>
                        {sessions.length -
                            connectedCount}
                    </strong>

                    <p>
                        Pendentes
                    </p>
                </div>
            </div>

            {/* TÍTULO DA SECÇÃO */}
            <div className="whatsapp-section-heading">
                <div>
                    <h2>
                        Conexões WhatsApp
                    </h2>

                    <p>
                        Adicione e gerencie os números utilizados pelo bot.
                    </p>
                </div>
            </div>

            {/* LOADING */}
            {loading ? (
                <div className="whatsapp-empty-state">
                    <div className="whatsapp-spinner"></div>

                    <h3>
                        A carregar conexões...
                    </h3>

                    <p>
                        Aguarde enquanto buscamos as suas conexões do WhatsApp.
                    </p>
                </div>
            ) : sessions.length === 0 ? (
                /* ESTADO VAZIO */
                <div className="whatsapp-empty-state">
                    <div className="whatsapp-empty-icon">
                        📱
                    </div>

                    <h3>
                        Nenhuma conexão encontrada
                    </h3>

                    <p>
                        Adicione o primeiro WhatsApp para começar a utilizar o bot.
                    </p>

                    <button
                        type="button"
                        className="whatsapp-add-button"
                        onClick={createSession}
                        disabled={creating}
                    >
                        {creating
                            ? 'A criar...'
                            : '+ Adicionar WhatsApp'}
                    </button>
                </div>
            ) : (
                /* LISTA DE SESSÕES */
                <div className="whatsapp-sessions-list">
                    {sessions.map((item) => {
                        const info =
                            getStatusInfo(
                                item.status
                            );

                        const busy =
                            Boolean(
                                actionLoading[
                                    item.session_name
                                ]
                            );

                        const pairingBusy =
                            Boolean(
                                pairingLoading[
                                    item.session_name
                                ]
                            );

                        const pairingCode =
                            pairingCodes[
                                item.session_name
                            ];

                        return (
                            <div
                                className="whatsapp-session-card"
                                key={item.id}
                            >
                                {/* TOPO DO CARTÃO */}
                                <div className="whatsapp-session-top">
                                    <div className="whatsapp-session-title">
                                        <div className="whatsapp-session-icon">
                                            📱
                                        </div>

                                        <div>
                                            <h3>
                                                {item.display_name ||
                                                    item.phone ||
                                                    'Número WhatsApp'}
                                            </h3>

                                            <p>
                                                {item.session_name}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`whatsapp-session-status status-${info.className}`}
                                    >
                                        {info.label}
                                    </div>
                                </div>

                                {/* DESCRIÇÃO */}
                                <div className="whatsapp-session-description">
                                    {info.description}
                                </div>

                                {/* EMPARELHAMENTO POR NÚMERO */}
                                {item.status !==
                                    'connected' && (
                                    <div className="whatsapp-pairing-section">
                                        <h4>
                                            Conectar através do número de telefone
                                        </h4>

                                        <p>
                                            Digite o número do WhatsApp com código do país, sem o sinal +.
                                        </p>

                                        <div className="whatsapp-pairing-form">
                                            <input
                                                type="text"
                                                placeholder="Ex.: 258841234567"
                                                value={
                                                    phoneNumbers[
                                                        item.session_name
                                                    ] || ''
                                                }
                                                onChange={(event) =>
                                                    setPhoneNumbers(
                                                        (current) => ({
                                                            ...current,
                                                            [item.session_name]:
                                                                event.target
                                                                    .value,
                                                        })
                                                    )
                                                }
                                                disabled={
                                                    pairingBusy ||
                                                    busy
                                                }
                                            />

                                            <button
                                                type="button"
                                                className="whatsapp-connect-button"
                                                onClick={() =>
                                                    generatePairingCode(
                                                        item.session_name
                                                    )
                                                }
                                                disabled={
                                                    pairingBusy ||
                                                    busy
                                                }
                                            >
                                                {pairingBusy
                                                    ? 'A gerar...'
                                                    : 'Gerar código'}
                                            </button>
                                        </div>

                                        {pairingCode && (
                                            <div className="whatsapp-pairing-code">
                                                <span>
                                                    Código de emparelhamento
                                                </span>

                                                <strong>
                                                    {pairingCode}
                                                </strong>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        copyPairingCode(
                                                            item.session_name
                                                        )
                                                    }
                                                >
                                                    Copiar
                                                </button>

                                                <p>
                                                    Abra o WhatsApp no telefone, vá em Dispositivos associados, escolha associar um dispositivo e utilize a opção de associar com número de telefone.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* QR CODE */}
                                {item.status ===
                                    'qr' && (
                                    <div className="whatsapp-session-qr">
                                        <h4>
                                            Escaneie o QR Code
                                        </h4>

                                        {qrCodes[
                                            item.session_name
                                        ] ? (
                                            <>
                                                <img
                                                    src={
                                                        qrCodes[
                                                            item.session_name
                                                        ]
                                                    }
                                                    alt="QR Code do WhatsApp"
                                                />

                                                <p className="whatsapp-qr-help">
                                                    Abra o WhatsApp no telefone, vá em Dispositivos associados e escaneie este QR Code.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="whatsapp-qr-loading">
                                                    <div className="whatsapp-spinner"></div>

                                                    <p>
                                                        A gerar QR Code...
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* AVISO */}
                                {item.status ===
                                    'auth_failure' && (
                                    <div className="whatsapp-warning">
                                        ⚠️ Não foi possível autenticar esta conexão. Tente iniciar novamente.
                                    </div>
                                )}

                                {/* AÇÕES */}
                                <div className="whatsapp-session-actions">
                                    {item.status ===
                                    'connected' ? (
                                        <button
                                            type="button"
                                            className="whatsapp-stop-button"
                                            onClick={() =>
                                                stopSession(
                                                    item.session_name
                                                )
                                            }
                                            disabled={busy}
                                        >
                                            {busy
                                                ? 'A parar...'
                                                : 'Parar conexão'}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="whatsapp-connect-button"
                                            onClick={() =>
                                                startSession(
                                                    item.session_name
                                                )
                                            }
                                            disabled={
                                                busy ||
                                                item.status ===
                                                    'qr' ||
                                                item.status ===
                                                    'pairing_code' ||
                                                item.status ===
                                                    'authenticated'
                                            }
                                        >
                                            {busy
                                                ? 'A processar...'
                                                : item.status ===
                                                  'qr'
                                                ? 'Aguardando leitura'
                                                : item.status ===
                                                  'authenticated'
                                                ? 'A autenticar...'
                                                : item.status ===
                                                  'pairing_code'
                                                ? 'Aguardando confirmação'
                                                : item.status ===
                                                  'loading'
                                                ? 'A iniciar...'
                                                : 'Iniciar conexão'}
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className="whatsapp-secondary-button"
                                        onClick={() =>
                                            loadSessions(
                                                false
                                            )
                                        }
                                        disabled={
                                            loading ||
                                            busy
                                        }
                                    >
                                        Atualizar estado
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}