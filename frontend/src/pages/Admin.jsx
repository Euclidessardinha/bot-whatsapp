
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './Admin.css';

function Admin() {
    const [summary, setSummary] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);

    const [loading, setLoading] = useState(true);
    const [companiesLoading, setCompaniesLoading] = useState(true);
    const [error, setError] = useState('');
    const [companiesError, setCompaniesError] = useState('');

    const [botActionLoading, setBotActionLoading] = useState(false);
    const [botActionError, setBotActionError] = useState('');
    const [botActionSuccess, setBotActionSuccess] = useState('');

    useEffect(() => {
        loadAdminData();
    }, []);

    async function getAccessToken() {
        const {
            data: { session }
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
            throw new Error('Sessão não encontrada.');
        }

        return session.access_token;
    }

    async function loadAdminData() {
        await Promise.all([
            loadSummary(),
            loadCompanies()
        ]);
    }

    async function loadSummary() {
        try {
            setLoading(true);
            setError('');

            const accessToken = await getAccessToken();

            const response = await fetch(
                'https://bot-whatsapp-production-b00c8a02.up.railway.app/api/admin/summary',
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    'Erro ao carregar painel administrativo.'
                );
            }

            setSummary(data.summary);
        } catch (err) {
            console.error(
                'Erro no painel administrativo:',
                err
            );

            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadCompanies() {
        try {
            setCompaniesLoading(true);
            setCompaniesError('');

            const accessToken = await getAccessToken();

            const response = await fetch(
                'https://bot-whatsapp-production-b00c8a02.up.railway.app/api/admin/companies',
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    'Erro ao carregar empresas.'
                );
            }

            setCompanies(data.companies || []);
        } catch (err) {
            console.error(
                'Erro ao carregar empresas:',
                err
            );

            setCompaniesError(err.message);
        } finally {
            setCompaniesLoading(false);
        }
    }

    function getBotSettings(company) {
        const botSettings = Array.isArray(
            company?.bot_settings
        )
            ? company.bot_settings
            : company?.bot_settings
                ? [company.bot_settings]
                : [];

        return botSettings[0] || null;
    }

    function getWhatsAppSessions(company) {
        return Array.isArray(
            company?.whatsapp_sessions
        )
            ? company.whatsapp_sessions
            : company?.whatsapp_sessions
                ? [company.whatsapp_sessions]
                : [];
    }

    function getBotStatus(company) {
        const bot = getBotSettings(company);

        if (!bot) {
            return {
                label: 'Não configurado',
                className: 'neutral'
            };
        }

        if (bot.admin_bot_enabled === false) {
            return {
                label: 'Bloqueado pelo admin',
                className: 'admin-blocked'
            };
        }

        return bot.bot_enabled
            ? {
                  label: 'Ativo',
                  className: 'active'
              }
            : {
                  label: 'Desativado',
                  className: 'disabled'
              };
    }

    function getWhatsAppStatus(company) {
        const sessions =
            getWhatsAppSessions(company);

        if (sessions.length === 0) {
            return {
                label: 'Sem sessão',
                className: 'neutral'
            };
        }

        const connected = sessions.find(
            session =>
                session.status === 'connected'
        );

        if (connected) {
            return {
                label: 'Conectado',
                className: 'connected'
            };
        }

        const qr = sessions.find(
            session =>
                session.status === 'qr'
        );

        if (qr) {
            return {
                label: 'Aguardando QR',
                className: 'qr'
            };
        }

        return {
            label: 'Desconectado',
            className: 'disconnected'
        };
    }

    function formatBusinessType(type) {
        const types = {
            restaurant: 'Restaurante',
            bar: 'Bar',
            shop: 'Loja',
            salon: 'Salão',
            fitness: 'Fitness',
            services: 'Serviços',
            other: 'Outro'
        };

        return (
            types[type] ||
            type ||
            'Não definido'
        );
    }

    function formatDate(date) {
        if (!date) {
            return '—';
        }

        return new Date(date).toLocaleDateString(
            'pt-MZ',
            {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }
        );
    }

    function getToggleStatus(value) {
        return value
            ? {
                  label: 'Ativo',
                  className: 'active'
              }
            : {
                  label: 'Desativado',
                  className: 'disabled'
              };
    }

    function openCompanyDetails(company) {
        setSelectedCompany(company);
        setBotActionError('');
        setBotActionSuccess('');
    }

    function closeCompanyDetails() {
        setSelectedCompany(null);
        setBotActionError('');
        setBotActionSuccess('');
    }

    async function handleAdminBotToggle() {
        if (!selectedCompany) {
            return;
        }

        const bot = getBotSettings(selectedCompany);

        if (!bot) {
            setBotActionError(
                'Esta empresa não possui configurações de bot.'
            );
            return;
        }

        const isCurrentlyBlocked =
            bot.admin_bot_enabled === false;

        const action = isCurrentlyBlocked
            ? 'unblock'
            : 'block';

        const confirmationMessage =
            isCurrentlyBlocked
                ? `Desbloquear o bot de "${selectedCompany.name}"? O bot poderá voltar a responder normalmente.`
                : `Bloquear o bot de "${selectedCompany.name}"? O WhatsApp continuará conectado, mas o bot deixará de responder aos clientes.`;

        const confirmed =
            window.confirm(
                confirmationMessage
            );

        if (!confirmed) {
            return;
        }

        try {
            setBotActionLoading(true);
            setBotActionError('');
            setBotActionSuccess('');

            const accessToken =
                await getAccessToken();

            const response = await fetch(
                `https://bot-whatsapp-production-b00c8a02.up.railway.app/api/admin/companies/${selectedCompany.id}/bot/${action}`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization:
                            `Bearer ${accessToken}`
                    }
                }
            );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    'Não foi possível alterar o estado administrativo do bot.'
                );
            }

            const updatedBot =
                data.bot;

            setSelectedCompany(
                previous => {
                    if (!previous) {
                        return previous;
                    }

                    return {
                        ...previous,
                        bot_settings: [
                            {
                                ...getBotSettings(previous),
                                ...updatedBot
                            }
                        ]
                    };
                }
            );

            setCompanies(
                previousCompanies =>
                    previousCompanies.map(
                        company => {
                            if (
                                company.id !==
                                selectedCompany.id
                            ) {
                                return company;
                            }

                            return {
                                ...company,
                                bot_settings: [
                                    {
                                        ...getBotSettings(company),
                                        ...updatedBot
                                    }
                                ]
                            };
                        }
                    )
            );

            setBotActionSuccess(
                isCurrentlyBlocked
                    ? 'Bot desbloqueado com sucesso.'
                    : 'Bot bloqueado com sucesso.'
            );

            await loadSummary();

        } catch (err) {
            console.error(
                'Erro ao alterar estado administrativo do bot:',
                err
            );

            setBotActionError(
                err.message ||
                'Não foi possível alterar o estado do bot.'
            );

        } finally {
            setBotActionLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="admin-page">
                <div className="admin-loading">
                    A carregar painel administrativo...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-page">
                <div className="admin-error">
                    <h2>Erro ao carregar painel</h2>

                    <p>{error}</p>

                    <button onClick={loadAdminData}>
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    const selectedBot =
        selectedCompany
            ? getBotSettings(selectedCompany)
            : null;

    const selectedSessions =
        selectedCompany
            ? getWhatsAppSessions(selectedCompany)
            : [];

    const selectedSession =
        selectedSessions.find(
            session =>
                session.status === 'connected'
        ) ||
        selectedSessions[0] ||
        null;

    const selectedBotStatus =
        selectedCompany
            ? getBotStatus(selectedCompany)
            : null;

    const selectedWhatsAppStatus =
        selectedCompany
            ? getWhatsAppStatus(selectedCompany)
            : null;

    const selectedBotBlocked =
        selectedBot?.admin_bot_enabled === false;

    return (
        <div className="admin-page">

            <div className="admin-header">
                <div>
                    <span className="admin-eyebrow">
                        ADMINISTRAÇÃO
                    </span>

                    <h1>
                        Painel Administrativo
                    </h1>

                    <p>
                        Visão geral da plataforma
                        WhatsApp Bot SaaS.
                    </p>
                </div>

                <button
                    className="admin-refresh"
                    onClick={loadAdminData}
                >
                    Atualizar
                </button>
            </div>

            <div className="admin-stats">

                <div className="admin-card">
                    <span>Empresas</span>

                    <strong>
                        {summary.companies}
                    </strong>

                    <small>
                        Empresas registadas
                    </small>
                </div>

                <div className="admin-card">
                    <span>Utilizadores</span>

                    <strong>
                        {summary.users}
                    </strong>

                    <small>
                        Utilizadores registados
                    </small>
                </div>

                <div className="admin-card">
                    <span>Bots</span>

                    <strong>
                        {summary.bots.total}
                    </strong>

                    <small>
                        {summary.bots.enabled} ativos ·{' '}
                        {summary.bots.disabled} desativados
                    </small>
                </div>

                <div className="admin-card">
                    <span>WhatsApp</span>

                    <strong>
                        {summary.whatsapp.total}
                    </strong>

                    <small>
                        {summary.whatsapp.qr}{' '}
                        aguardando QR
                    </small>
                </div>

            </div>

            <div className="admin-sections">

                <div className="admin-panel">

                    <div className="admin-panel-header">
                        <h2>
                            Estado dos Bots
                        </h2>
                    </div>

                    <div className="admin-status-list">

                        <div>
                            <span className="status-dot active"></span>

                            <span>
                                Bots ativos
                            </span>

                            <strong>
                                {summary.bots.enabled}
                            </strong>
                        </div>

                        <div>
                            <span className="status-dot disabled"></span>

                            <span>
                                Bots desativados
                            </span>

                            <strong>
                                {summary.bots.disabled}
                            </strong>
                        </div>

                        <div>
                            <span className="status-dot admin-blocked"></span>

                            <span>
                                Bloqueados pelo admin
                            </span>

                            <strong>
                                {summary.bots.admin_blocked || 0}
                            </strong>
                        </div>

                    </div>
                </div>

                <div className="admin-panel">

                    <div className="admin-panel-header">
                        <h2>
                            Estado do WhatsApp
                        </h2>
                    </div>

                    <div className="admin-status-list">

                        <div>
                            <span className="status-dot connected"></span>

                            <span>
                                Conectados
                            </span>

                            <strong>
                                {summary.whatsapp.connected}
                            </strong>
                        </div>

                        <div>
                            <span className="status-dot disconnected"></span>

                            <span>
                                Desconectados
                            </span>

                            <strong>
                                {summary.whatsapp.disconnected}
                            </strong>
                        </div>

                        <div>
                            <span className="status-dot qr"></span>

                            <span>
                                Aguardando QR
                            </span>

                            <strong>
                                {summary.whatsapp.qr}
                            </strong>
                        </div>

                    </div>
                </div>

            </div>

            <div className="admin-panel admin-companies-panel">

                <div className="admin-panel-header admin-companies-header">

                    <div>
                        <h2>
                            Empresas
                        </h2>

                        <p>
                            Empresas registadas na plataforma.
                        </p>
                    </div>

                    <span className="admin-company-count">
                        {companies.length}
                    </span>

                </div>

                {companiesLoading ? (

                    <div className="admin-table-loading">
                        A carregar empresas...
                    </div>

                ) : companiesError ? (

                    <div className="admin-table-error">

                        <p>
                            {companiesError}
                        </p>

                        <button onClick={loadCompanies}>
                            Tentar novamente
                        </button>

                    </div>

                ) : companies.length === 0 ? (

                    <div className="admin-empty">
                        Nenhuma empresa registada.
                    </div>

                ) : (

                    <div className="admin-table-wrapper">

                        <table className="admin-table">

                            <thead>
                                <tr>
                                    <th>Empresa</th>
                                    <th>Tipo</th>
                                    <th>Localização</th>
                                    <th>Bot</th>
                                    <th>WhatsApp</th>
                                    <th>Registo</th>
                                </tr>
                            </thead>

                            <tbody>

                                {companies.map(
                                    company => {

                                        const botStatus =
                                            getBotStatus(
                                                company
                                            );

                                        const whatsappStatus =
                                            getWhatsAppStatus(
                                                company
                                            );

                                        return (
                                            <tr
                                                key={company.id}
                                                className="admin-company-row"
                                                onClick={() =>
                                                    openCompanyDetails(
                                                        company
                                                    )
                                                }
                                            >

                                                <td>

                                                    <div className="company-name">
                                                        {company.name ||
                                                            'Sem nome'}
                                                    </div>

                                                    <div className="company-phone">
                                                        {company.phone ||
                                                            'Sem telefone'}
                                                    </div>

                                                </td>

                                                <td>
                                                    {formatBusinessType(
                                                        company.business_type
                                                    )}
                                                </td>

                                                <td>
                                                    {company.location ||
                                                        'Não definida'}
                                                </td>

                                                <td>

                                                    <span
                                                        className={`admin-status-badge ${botStatus.className}`}
                                                    >
                                                        <span className="status-dot"></span>

                                                        {botStatus.label}
                                                    </span>

                                                </td>

                                                <td>

                                                    <span
                                                        className={`admin-status-badge ${whatsappStatus.className}`}
                                                    >
                                                        <span className="status-dot"></span>

                                                        {whatsappStatus.label}
                                                    </span>

                                                </td>

                                                <td>
                                                    {formatDate(
                                                        company.created_at
                                                    )}
                                                </td>

                                            </tr>
                                        );
                                    }
                                )}

                            </tbody>

                        </table>

                    </div>
                )}

            </div>

            {selectedCompany && (

                <div
                    className="admin-company-modal-overlay"
                    onClick={event => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeCompanyDetails();
                        }
                    }}
                >

                    <div
                        className="admin-company-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-company-modal-title"
                    >

                        <div className="admin-company-modal-header">

                            <div>
                                <span className="admin-eyebrow">
                                    EMPRESA
                                </span>

                                <h2 id="admin-company-modal-title">
                                    {selectedCompany.name ||
                                        'Sem nome'}
                                </h2>

                                <p>
                                    Detalhes da empresa
                                    registada na plataforma.
                                </p>
                            </div>

                            <button
                                className="admin-company-modal-close"
                                onClick={closeCompanyDetails}
                                aria-label="Fechar detalhes"
                            >
                                ×
                            </button>

                        </div>

                        <div className="admin-company-details">

                            <div className="admin-detail-section">

                                <div className="admin-detail-section-header">
                                    <h3>
                                        Informações da empresa
                                    </h3>
                                </div>

                                <div className="admin-detail-grid">

                                    <div className="admin-detail-item">
                                        <span>
                                            Nome
                                        </span>

                                        <strong>
                                            {selectedCompany.name ||
                                                'Sem nome'}
                                        </strong>
                                    </div>

                                    <div className="admin-detail-item">
                                        <span>
                                            Tipo de negócio
                                        </span>

                                        <strong>
                                            {formatBusinessType(
                                                selectedCompany.business_type
                                            )}
                                        </strong>
                                    </div>

                                    <div className="admin-detail-item">
                                        <span>
                                            Telefone
                                        </span>

                                        <strong>
                                            {selectedCompany.phone ||
                                                'Não definido'}
                                        </strong>
                                    </div>

                                    <div className="admin-detail-item">
                                        <span>
                                            Localização
                                        </span>

                                        <strong>
                                            {selectedCompany.location ||
                                                'Não definida'}
                                        </strong>
                                    </div>

                                    <div className="admin-detail-item">
                                        <span>
                                            Data de registo
                                        </span>

                                        <strong>
                                            {formatDate(
                                                selectedCompany.created_at
                                            )}
                                        </strong>
                                    </div>

                                </div>

                            </div>

                            <div className="admin-detail-section">

                                <div className="admin-detail-section-header">
                                    <h3>
                                        Automação do Bot
                                    </h3>

                                    {selectedBotStatus && (
                                        <span
                                            className={`admin-status-badge ${selectedBotStatus.className}`}
                                        >
                                            <span className="status-dot"></span>

                                            {selectedBotStatus.label}
                                        </span>
                                    )}
                                </div>

                                {selectedBotBlocked && (
                                    <div className="admin-bot-block-notice">
                                        <strong>
                                            Bot bloqueado administrativamente
                                        </strong>

                                        <span>
                                            O WhatsApp permanece conectado,
                                            mas o bot não responde aos clientes.
                                        </span>
                                    </div>
                                )}

                                <div className="admin-detail-grid">

                                    <div className="admin-detail-item">

                                        <span>
                                            Bot principal
                                        </span>

                                        <strong
                                            className={
                                                selectedBot?.bot_enabled
                                                    ? 'detail-active'
                                                    : 'detail-disabled'
                                            }
                                        >
                                            {
                                                getToggleStatus(
                                                    selectedBot?.bot_enabled
                                                ).label
                                            }
                                        </strong>

                                    </div>

                                    <div className="admin-detail-item">

                                        <span>
                                            Estado administrativo
                                        </span>

                                        <strong
                                            className={
                                                selectedBotBlocked
                                                    ? 'detail-admin-blocked'
                                                    : 'detail-active'
                                            }
                                        >
                                            {selectedBotBlocked
                                                ? 'Bloqueado'
                                                : 'Permitido'}
                                        </strong>

                                    </div>

                                    <div className="admin-detail-item">

                                        <span>
                                            Menu
                                        </span>

                                        <strong
                                            className={
                                                selectedBot?.menu_enabled
                                                    ? 'detail-active'
                                                    : 'detail-disabled'
                                            }
                                        >
                                            {
                                                getToggleStatus(
                                                    selectedBot?.menu_enabled
                                                ).label
                                            }
                                        </strong>

                                    </div>

                                    <div className="admin-detail-item">

                                        <span>
                                            Pedidos
                                        </span>

                                        <strong
                                            className={
                                                selectedBot?.orders_enabled
                                                    ? 'detail-active'
                                                    : 'detail-disabled'
                                            }
                                        >
                                            {
                                                getToggleStatus(
                                                    selectedBot?.orders_enabled
                                                ).label
                                            }
                                        </strong>

                                    </div>

                                    <div className="admin-detail-item">

                                        <span>
                                            Suporte humano
                                        </span>

                                        <strong
                                            className={
                                                selectedBot?.human_support_enabled
                                                    ? 'detail-active'
                                                    : 'detail-disabled'
                                            }
                                        >
                                            {
                                                getToggleStatus(
                                                    selectedBot?.human_support_enabled
                                                ).label
                                            }
                                        </strong>

                                    </div>

                                </div>

                                <div className="admin-bot-control">

                                    <div className="admin-bot-control-text">

                                        <strong>
                                            Controle administrativo
                                        </strong>

                                        <span>
                                            {selectedBotBlocked
                                                ? 'O bot está impedido de responder aos clientes desta empresa.'
                                                : 'O bot está autorizado a responder normalmente.'}
                                        </span>

                                    </div>

                                    <button
                                        type="button"
                                        className={
                                            selectedBotBlocked
                                                ? 'admin-bot-action admin-bot-action-unblock'
                                                : 'admin-bot-action admin-bot-action-block'
                                        }
                                        onClick={handleAdminBotToggle}
                                        disabled={
                                            botActionLoading
                                        }
                                    >
                                        {botActionLoading
                                            ? 'A processar...'
                                            : selectedBotBlocked
                                                ? 'Desbloquear bot'
                                                : 'Bloquear bot'}
                                    </button>

                                </div>

                                {botActionError && (
                                    <div className="admin-bot-action-message error">
                                        {botActionError}
                                    </div>
                                )}

                                {botActionSuccess && (
                                    <div className="admin-bot-action-message success">
                                        {botActionSuccess}
                                    </div>
                                )}

                            </div>

                            <div className="admin-detail-section">

                                <div className="admin-detail-section-header">
                                    <h3>
                                        WhatsApp
                                    </h3>

                                    {selectedWhatsAppStatus && (
                                        <span
                                            className={`admin-status-badge ${selectedWhatsAppStatus.className}`}
                                        >
                                            <span className="status-dot"></span>

                                            {selectedWhatsAppStatus.label}
                                        </span>
                                    )}
                                </div>

                                {selectedSession ? (

                                    <div className="admin-detail-grid">

                                        <div className="admin-detail-item">

                                            <span>
                                                Número
                                            </span>

                                            <strong>
                                                {selectedSession.phone ||
                                                    'Não definido'}
                                            </strong>

                                        </div>

                                        <div className="admin-detail-item">

                                            <span>
                                                Sessão
                                            </span>

                                            <strong>
                                                {selectedSession.session_name ||
                                                    'Não definida'}
                                            </strong>

                                        </div>

                                        <div className="admin-detail-item">

                                            <span>
                                                Estado
                                            </span>

                                            <strong>
                                                {selectedSession.status ||
                                                    'Não definido'}
                                            </strong>

                                        </div>

                                        <div className="admin-detail-item">

                                            <span>
                                                Auto-connect
                                            </span>

                                            <strong
                                                className={
                                                    selectedSession.auto_connect
                                                        ? 'detail-active'
                                                        : 'detail-disabled'
                                                }
                                            >
                                                {selectedSession.auto_connect
                                                    ? 'Ativo'
                                                    : 'Desativado'}
                                            </strong>

                                        </div>

                                    </div>

                                ) : (

                                    <div className="admin-detail-empty">
                                        Esta empresa ainda não possui
                                        uma sessão WhatsApp configurada.
                                    </div>

                                )}

                            </div>

                        </div>

                        <div className="admin-company-modal-footer">

                            <span>
                                ID da empresa
                            </span>

                            <code>
                                {selectedCompany.id}
                            </code>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}

export default Admin;
