import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    getCurrentProfile,
    getAccessToken
} from '../services/authService';

import './Dashboard.css';

function Dashboard() {
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [summary, setSummary] = useState(null);
    const [whatsappSessions, setWhatsappSessions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);

    const [error, setError] = useState('');

    useEffect(() => {
        let interval;

        async function loadDashboard() {
            try {
                // =========================================
                // 1. PERFIL
                // =========================================

                const data = await getCurrentProfile();

                if (!data) {
                    navigate('/');
                    return;
                }

                setProfile(data);

                // =========================================
                // 2. RESUMO
                // =========================================

                async function loadSummary() {
                    try {
                        const apiUrl =
                            import.meta.env.VITE_API_URL ||
                            'http://localhost:3000';

                        const accessToken =
                            await getAccessToken();

                        if (!accessToken) {
                            throw new Error(
                                'Sessão de autenticação não encontrada.'
                            );
                        }

                        const response = await fetch(
                            `${apiUrl}/api/dashboard/summary`,
                            {
                                method: 'GET',
                                headers: {
                                    Authorization:
                                        `Bearer ${accessToken}`
                                }
                            }
                        );

                        if (!response.ok) {
                            throw new Error(
                                'Não foi possível carregar o resumo do Dashboard.'
                            );
                        }

                        const result =
                            await response.json();

                        if (!result.success) {
                            throw new Error(
                                result.message ||
                                'Erro ao carregar o Dashboard.'
                            );
                        }

                        setSummary(result.summary);
                        setError('');

                    } catch (err) {
                        console.error(
                            '❌ Erro ao atualizar resumo:',
                            err
                        );

                        setError(
                            err.message ||
                            'Não foi possível carregar os dados.'
                        );
                    } finally {
                        setSummaryLoading(false);
                    }
                }

                await loadSummary();

                // =========================================
                // 3. WHATSAPP
                // =========================================

                async function loadWhatsappSessions() {
                    try {
                        const apiUrl =
                            import.meta.env.VITE_API_URL ||
                            'http://localhost:3000';

                        const accessToken =
                            await getAccessToken();

                        if (!accessToken) {
                            throw new Error(
                                'Sessão de autenticação não encontrada.'
                            );
                        }

                        const response = await fetch(
                            `${apiUrl}/api/whatsapp/sessions`,
                            {
                                method: 'GET',
                                headers: {
                                    Authorization:
                                        `Bearer ${accessToken}`
                                }
                            }
                        );

                        if (!response.ok) {
                            throw new Error(
                                'Não foi possível carregar as conexões WhatsApp.'
                            );
                        }

                        const result =
                            await response.json();

                        if (!result.success) {
                            throw new Error(
                                result.message ||
                                'Erro ao carregar conexões WhatsApp.'
                            );
                        }

                        setWhatsappSessions(
                            result.sessions || []
                        );

                    } catch (err) {
                        console.error(
                            '❌ Erro ao carregar conexões WhatsApp:',
                            err
                        );
                    }
                }

                await loadWhatsappSessions();

                // =========================================
                // 4. ATUALIZAÇÃO AUTOMÁTICA
                // =========================================

                interval = setInterval(async () => {
                    await loadSummary();
                    await loadWhatsappSessions();
                }, 10000);

            } catch (err) {
                console.error(
                    '❌ Erro ao carregar Dashboard:',
                    err
                );

                setError(
                    err.message ||
                    'Não foi possível carregar os dados.'
                );
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };

    }, [navigate]);

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Carregando seu painel...</p>
            </div>
        );
    }

    const company = profile?.companies;

    const botEnabled =
        summary?.bot?.enabled === true;

    const whatsappOnline =
        (summary?.whatsapp || 0) > 0;

    const connectedWhatsapp =
        whatsappSessions.filter(
            session => session.status === 'connected'
        ).length;

    const firstName =
        profile?.full_name
            ? profile.full_name.split(' ')[0]
            : 'Administrador';

    return (
        <div className="dashboard">

            {/* =========================================
                HERO
            ========================================= */}

            <section className="dashboard-hero">

                <div className="hero-content">

                    <div className="hero-eyebrow">
                        <span className="hero-eyebrow-dot"></span>
                        Painel de controle
                    </div>

                    <h1>
                        Olá, {firstName} 👋
                    </h1>

                    <p>
                        Acompanhe o desempenho e gerencie
                        o atendimento da sua empresa em um só lugar.
                    </p>

                </div>

                <div
                    className={
                        `hero-status ${
                            botEnabled
                                ? 'active'
                                : 'inactive'
                        }`
                    }
                >
                    <span className="hero-status-indicator"></span>

                    <div>
                        <strong>
                            {botEnabled
                                ? 'Bot ativo'
                                : 'Bot inativo'}
                        </strong>

                        <small>
                            {botEnabled
                                ? 'Atendimento automático funcionando'
                                : 'Atendimento automático desativado'}
                        </small>
                    </div>
                </div>

            </section>

            {/* =========================================
                ERRO
            ========================================= */}

            {error && (
                <div className="dashboard-error">
                    <span>⚠️</span>
                    <div>
                        <strong>Não foi possível atualizar os dados</strong>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {/* =========================================
                MÉTRICAS
            ========================================= */}

            <section className="dashboard-metrics">

                {/* PRODUTOS */}

                <div className="metric-card">

                    <div className="metric-top">
                        <div className="metric-icon products">
                            🛍️
                        </div>

                        <span className="metric-arrow">
                            →
                        </span>
                    </div>

                    <div className="metric-info">
                        <span>Produtos</span>

                        <strong>
                            {summaryLoading
                                ? '...'
                                : summary?.products ?? 0}
                        </strong>

                        <small>
                            Produtos cadastrados
                        </small>
                    </div>

                </div>

                {/* PEDIDOS */}

                <div className="metric-card">

                    <div className="metric-top">
                        <div className="metric-icon orders">
                            🛒
                        </div>

                        <span className="metric-arrow">
                            →
                        </span>
                    </div>

                    <div className="metric-info">
                        <span>Pedidos</span>

                        <strong>
                            {summaryLoading
                                ? '...'
                                : summary?.orders ?? 0}
                        </strong>

                        <small>
                            Pedidos registrados
                        </small>
                    </div>

                </div>

                {/* CLIENTES */}

                <div className="metric-card">

                    <div className="metric-top">
                        <div className="metric-icon customers">
                            👥
                        </div>

                        <span className="metric-arrow">
                            →
                        </span>
                    </div>

                    <div className="metric-info">
                        <span>Clientes</span>

                        <strong>
                            {summaryLoading
                                ? '...'
                                : summary?.customers ?? 0}
                        </strong>

                        <small>
                            Clientes cadastrados
                        </small>
                    </div>

                </div>

                {/* WHATSAPP */}

                <div className="metric-card">

                    <div className="metric-top">
                        <div className="metric-icon whatsapp">
                            💬
                        </div>

                        <span className="metric-arrow">
                            →
                        </span>
                    </div>

                    <div className="metric-info">
                        <span>WhatsApp</span>

                        <strong>
                            {summaryLoading
                                ? '...'
                                : whatsappOnline
                                    ? summary.whatsapp
                                    : 0}
                        </strong>

                        <small>
                            {whatsappOnline
                                ? `${connectedWhatsapp} conexão${connectedWhatsapp !== 1 ? 'ões' : ''} ativa${connectedWhatsapp !== 1 ? 's' : ''}`
                                : 'Nenhuma conexão ativa'}
                        </small>
                    </div>

                </div>

            </section>

            {/* =========================================
                PAINÉIS PRINCIPAIS
            ========================================= */}

            <section className="dashboard-main-grid">

                {/* =====================================
                    EMPRESA
                ===================================== */}

                <div className="premium-panel">

                    <div className="panel-header">

                        <div>
                            <span className="panel-kicker">
                                PERFIL DA EMPRESA
                            </span>

                            <h2>
                                Minha empresa
                            </h2>
                        </div>

                        <div className="panel-header-icon">
                            🏢
                        </div>

                    </div>

                    <div className="company-profile">

                        <div className="company-avatar">
                            {company?.name
                                ? company.name.charAt(0).toUpperCase()
                                : 'E'}
                        </div>

                        <div className="company-profile-main">
                            <strong>
                                {company?.name || 'Minha empresa'}
                            </strong>

                            <span>
                                {company?.location ||
                                    'Localização não definida'}
                            </span>
                        </div>

                    </div>

                    <div className="company-details">

                        <div className="detail-item">
                            <span>Localização</span>
                            <strong>
                                {company?.location || '—'}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>Telefone</span>
                            <strong>
                                {company?.phone || '—'}
                            </strong>
                        </div>

                    </div>

                    <button
                        className="premium-button secondary"
                        onClick={() => navigate('/empresa')}
                    >
                        <span>Editar informações</span>
                        <span>→</span>
                    </button>

                </div>

                {/* =====================================
                    BOT
                ===================================== */}

                <div className="premium-panel bot-panel">

                    <div className="panel-header">

                        <div>
                            <span className="panel-kicker">
                                AUTOMAÇÃO
                            </span>

                            <h2>
                                Bot WhatsApp
                            </h2>
                        </div>

                        <div className="bot-panel-icon">
                            🤖
                        </div>

                    </div>

                    <div
                        className={
                            `bot-overview ${
                                botEnabled
                                    ? 'enabled'
                                    : 'disabled'
                            }`
                        }
                    >

                        <div className="bot-overview-icon">
                            {botEnabled ? '✓' : '×'}
                        </div>

                        <div className="bot-overview-content">

                            <strong>
                                {botEnabled
                                    ? 'Seu bot está ativo'
                                    : 'Seu bot está inativo'}
                            </strong>

                            <p>
                                {botEnabled
                                    ? whatsappOnline
                                        ? 'O atendimento automático está pronto para receber clientes.'
                                        : 'O bot está ativo, mas ainda não existe um WhatsApp conectado.'
                                    : 'Ative o bot para começar a automatizar o atendimento.'}
                            </p>

                        </div>

                    </div>

                    <div className="bot-features">

                        <div className="bot-feature">
                            <span>✓</span>
                            Respostas automáticas
                        </div>

                        <div className="bot-feature">
                            <span>✓</span>
                            Atendimento 24/7
                        </div>

                        <div className="bot-feature">
                            <span>✓</span>
                            Gestão pelo painel
                        </div>

                    </div>

                    <button
                        className="premium-button primary"
                        onClick={() => navigate('/bot')}
                    >
                        <span>
                            Configurar bot
                        </span>

                        <span>→</span>
                    </button>

                </div>

            </section>

            {/* =========================================
                WHATSAPP
            ========================================= */}

            <section className="whatsapp-panel">

                <div className="whatsapp-panel-header">

                    <div className="whatsapp-heading">

                        <div className="whatsapp-heading-icon">
                            💬
                        </div>

                        <div>
                            <span className="panel-kicker">
                                CONECTIVIDADE
                            </span>

                            <h2>
                                Conexões WhatsApp
                            </h2>

                            <p>
                                Gerencie os números conectados ao seu bot.
                            </p>
                        </div>

                    </div>

                    <button
                        className="premium-button secondary whatsapp-manage-button"
                        onClick={() => navigate('/whatsapp')}
                    >
                        Gerenciar conexões
                        <span>→</span>
                    </button>

                </div>

                {whatsappSessions.length === 0 ? (

                    <div className="whatsapp-empty">

                        <div className="empty-icon">
                            💬
                        </div>

                        <div className="empty-content">

                            <strong>
                                Nenhum WhatsApp conectado
                            </strong>

                            <p>
                                Conecte um número para começar
                                a receber e responder mensagens
                                automaticamente.
                            </p>

                        </div>

                        <button
                            className="premium-button primary"
                            onClick={() => navigate('/whatsapp')}
                        >
                            Conectar WhatsApp
                            <span>→</span>
                        </button>

                    </div>

                ) : (

                    <div className="whatsapp-list">

                        {whatsappSessions.map((session) => {

                            const isConnected =
                                session.status === 'connected';

                            const isConnecting =
                                session.status === 'connecting';

                            const statusClass =
                                isConnected
                                    ? 'connected'
                                    : isConnecting
                                        ? 'connecting'
                                        : 'disconnected';

                            const statusLabel =
                                isConnected
                                    ? 'Conectado'
                                    : isConnecting
                                        ? 'Conectando...'
                                        : session.status === 'disconnected'
                                            ? 'Desconectado'
                                            : 'Outro estado';

                            return (
                                <div
                                    className="whatsapp-row"
                                    key={session.id}
                                >

                                    <div className="whatsapp-row-main">

                                        <div
                                            className={
                                                `whatsapp-status-icon ${statusClass}`
                                            }
                                        >
                                            💬
                                        </div>

                                        <div className="whatsapp-row-details">

                                            <strong>
                                                {session.display_name ||
                                                    session.phone ||
                                                    'Número WhatsApp'}
                                            </strong>

                                            <span>
                                                {session.phone ||
                                                    'Número ainda não conectado'}
                                            </span>

                                        </div>

                                    </div>

                                    <div
                                        className={
                                            `whatsapp-status-pill ${statusClass}`
                                        }
                                    >
                                        <span></span>
                                        {statusLabel}
                                    </div>

                                </div>
                            );
                        })}

                    </div>
                )}

            </section>

        </div>
    );
}

export default Dashboard;