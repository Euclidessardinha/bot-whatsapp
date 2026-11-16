
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './Admin.css';

function Admin() {
    const [summary, setSummary] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [companiesLoading, setCompaniesLoading] = useState(true);
    const [error, setError] = useState('');
    const [companiesError, setCompaniesError] = useState('');

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
                    data.message || 'Erro ao carregar painel administrativo.'
                );
            }

            setSummary(data.summary);
        } catch (err) {
            console.error('Erro no painel administrativo:', err);
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
                    data.message || 'Erro ao carregar empresas.'
                );
            }

            setCompanies(data.companies || []);
        } catch (err) {
            console.error('Erro ao carregar empresas:', err);
            setCompaniesError(err.message);
        } finally {
            setCompaniesLoading(false);
        }
    }

    function getBotStatus(company) {
        const bot = company.bot_settings?.[0];

        if (!bot) {
            return {
                label: 'Não configurado',
                className: 'neutral'
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
        const sessions = company.whatsapp_sessions || [];

        if (sessions.length === 0) {
            return {
                label: 'Sem sessão',
                className: 'neutral'
            };
        }

        const connected = sessions.find(
            session => session.status === 'connected'
        );

        if (connected) {
            return {
                label: 'Conectado',
                className: 'connected'
            };
        }

        const qr = sessions.find(
            session => session.status === 'qr'
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

        return types[type] || type || 'Não definido';
    }

    function formatDate(date) {
        if (!date) {
            return '—';
        }

        return new Date(date).toLocaleDateString('pt-MZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
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

    return (
        <div className="admin-page">

            <div className="admin-header">
                <div>
                    <span className="admin-eyebrow">
                        ADMINISTRAÇÃO
                    </span>

                    <h1>Painel Administrativo</h1>

                    <p>
                        Visão geral da plataforma WhatsApp Bot SaaS.
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
                    <strong>{summary.companies}</strong>
                    <small>Empresas registadas</small>
                </div>

                <div className="admin-card">
                    <span>Utilizadores</span>
                    <strong>{summary.users}</strong>
                    <small>Utilizadores registados</small>
                </div>

                <div className="admin-card">
                    <span>Bots</span>
                    <strong>{summary.bots.total}</strong>
                    <small>
                        {summary.bots.enabled} ativos ·{' '}
                        {summary.bots.disabled} desativados
                    </small>
                </div>

                <div className="admin-card">
                    <span>WhatsApp</span>
                    <strong>{summary.whatsapp.total}</strong>
                    <small>
                        {summary.whatsapp.qr} aguardando QR
                    </small>
                </div>

            </div>

            <div className="admin-sections">

                <div className="admin-panel">
                    <div className="admin-panel-header">
                        <h2>Estado dos Bots</h2>
                    </div>

                    <div className="admin-status-list">

                        <div>
                            <span className="status-dot active"></span>
                            <span>Bots ativos</span>
                            <strong>{summary.bots.enabled}</strong>
                        </div>

                        <div>
                            <span className="status-dot disabled"></span>
                            <span>Bots desativados</span>
                            <strong>{summary.bots.disabled}</strong>
                        </div>

                    </div>
                </div>

                <div className="admin-panel">
                    <div className="admin-panel-header">
                        <h2>Estado do WhatsApp</h2>
                    </div>

                    <div className="admin-status-list">

                        <div>
                            <span className="status-dot connected"></span>
                            <span>Conectados</span>
                            <strong>{summary.whatsapp.connected}</strong>
                        </div>

                        <div>
                            <span className="status-dot disconnected"></span>
                            <span>Desconectados</span>
                            <strong>{summary.whatsapp.disconnected}</strong>
                        </div>

                        <div>
                            <span className="status-dot qr"></span>
                            <span>Aguardando QR</span>
                            <strong>{summary.whatsapp.qr}</strong>
                        </div>

                    </div>
                </div>

            </div>

            <div className="admin-panel admin-companies-panel">

                <div className="admin-panel-header admin-companies-header">
                    <div>
                        <h2>Empresas</h2>
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
                        <p>{companiesError}</p>

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
                                {companies.map(company => {
                                    const botStatus =
                                        getBotStatus(company);

                                    const whatsappStatus =
                                        getWhatsAppStatus(company);

                                    return (
                                        <tr key={company.id}>

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
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>

        </div>
    );
}

export default Admin;