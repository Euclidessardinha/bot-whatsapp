import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './Admin.css';

function Admin() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadSummary();
    }, []);

    async function loadSummary() {
        try {
            setLoading(true);
            setError('');

            const {
                data: { session }
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error('Sessão não encontrada.');
            }

            const response = await fetch(
                'https://bot-whatsapp-production-b00c8a02.up.railway.app/api/admin/summary',
                {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`
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

                    <button onClick={loadSummary}>
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
                    onClick={loadSummary}
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

        </div>
    );
}

export default Admin;