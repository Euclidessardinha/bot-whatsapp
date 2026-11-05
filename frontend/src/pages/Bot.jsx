import { useEffect, useState } from 'react';

import { getCurrentProfile } from '../services/authService';

import {
    getBotSettings,
    updateBotSettings
} from '../services/botSettingsService';

import './Bot.css';

function Bot() {
    const [profile, setProfile] = useState(null);
    const [settings, setSettings] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // =========================================
    // CARREGAR CONFIGURAÇÕES
    // =========================================

    useEffect(() => {
        async function loadSettings() {
            try {
                setLoading(true);
                setError('');

                const currentProfile =
                    await getCurrentProfile();

                if (!currentProfile) {
                    setError(
                        'Não foi possível carregar o perfil.'
                    );

                    return;
                }

                setProfile(currentProfile);

                const botSettings =
                    await getBotSettings(
                        currentProfile.company_id
                    );

                if (!botSettings) {
                    setError(
                        'As configurações do bot ainda não foram criadas para esta empresa.'
                    );

                    return;
                }

                setSettings(botSettings);

            } catch (err) {
                console.error(
                    '❌ Erro ao carregar configurações:',
                    err
                );

                setError(
                    'Ocorreu um erro ao carregar as configurações.'
                );

            } finally {
                setLoading(false);
            }
        }

        loadSettings();
    }, []);

    // =========================================
    // ALTERAR CONFIGURAÇÃO
    // =========================================

    function handleChange(field) {
        setSettings((current) => ({
            ...current,
            [field]: !current[field]
        }));

        setMessage('');
        setError('');
    }

    // =========================================
    // SALVAR
    // =========================================

    async function handleSave() {
        if (!profile || !settings) {
            return;
        }

        try {
            setSaving(true);
            setMessage('');
            setError('');

            await updateBotSettings(
                profile.company_id,
                settings
            );

            setMessage(
                'Configurações atualizadas com sucesso.'
            );

        } catch (err) {
            console.error(
                '❌ Erro ao salvar configurações:',
                err
            );

            setError(
                'Não foi possível salvar as configurações.'
            );

        } finally {
            setSaving(false);
        }
    }

    // =========================================
    // LOADING
    // =========================================

    if (loading) {
        return (
            <div className="bot-page-loading">
                <div className="bot-loading-spinner"></div>

                <p>
                    Carregando configurações...
                </p>
            </div>
        );
    }

    // =========================================
    // ERRO SEM CONFIGURAÇÕES
    // =========================================

    if (error && !settings) {
        return (
            <div className="bot-page">

                <div className="bot-error-state">

                    <div className="bot-error-icon">
                        ⚠️
                    </div>

                    <div>
                        <strong>
                            Não foi possível carregar o bot
                        </strong>

                        <p>
                            {error}
                        </p>
                    </div>

                </div>

            </div>
        );
    }

    if (!settings) {
        return null;
    }

    const botEnabled =
        settings.bot_enabled === true;

    const menuEnabled =
        settings.menu_enabled === true;

    const ordersEnabled =
        settings.orders_enabled === true;

    const humanSupportEnabled =
        settings.human_support_enabled === true;

    const enabledFeatures = [
        botEnabled,
        menuEnabled,
        ordersEnabled,
        humanSupportEnabled
    ].filter(Boolean).length;

    return (
        <div className="bot-page">

            {/* =========================================
                HERO
            ========================================= */}

            <section
                className={
                    `bot-hero ${
                        botEnabled
                            ? 'bot-active'
                            : 'bot-inactive'
                    }`
                }
            >

                <div className="bot-hero-content">

                    <div className="bot-hero-kicker">
                        <span></span>
                        AUTOMAÇÃO WHATSAPP
                    </div>

                    <h1>
                        Configurações do Bot
                    </h1>

                    <p>
                        Controle como o seu assistente automático
                        atende os clientes da sua empresa.
                    </p>

                </div>

                <div className="bot-hero-status">

                    <div className="bot-hero-status-icon">
                        {botEnabled ? '✓' : '×'}
                    </div>

                    <div>
                        <span>
                            Status atual
                        </span>

                        <strong>
                            {botEnabled
                                ? 'Bot ativo'
                                : 'Bot inativo'}
                        </strong>

                        <small>
                            {botEnabled
                                ? 'O atendimento automático está habilitado.'
                                : 'O atendimento automático está desativado.'}
                        </small>
                    </div>

                </div>

            </section>

            {/* =========================================
                MENSAGENS
            ========================================= */}

            {message && (
                <div className="bot-alert success">

                    <span className="alert-icon">
                        ✓
                    </span>

                    <div>
                        <strong>
                            Alterações salvas
                        </strong>

                        <p>
                            {message}
                        </p>
                    </div>

                </div>
            )}

            {error && settings && (
                <div className="bot-alert error">

                    <span className="alert-icon">
                        !
                    </span>

                    <div>
                        <strong>
                            Atenção
                        </strong>

                        <p>
                            {error}
                        </p>
                    </div>

                </div>
            )}

            {/* =========================================
                RESUMO
            ========================================= */}

            <section className="bot-overview-grid">

                <div className="bot-overview-card">

                    <div className="overview-icon">
                        🤖
                    </div>

                    <div>
                        <span>
                            Estado do bot
                        </span>

                        <strong>
                            {botEnabled
                                ? 'Ativo'
                                : 'Inativo'}
                        </strong>
                    </div>

                </div>

                <div className="bot-overview-card">

                    <div className="overview-icon">
                        ⚙️
                    </div>

                    <div>
                        <span>
                            Recursos ativos
                        </span>

                        <strong>
                            {enabledFeatures}/4
                        </strong>
                    </div>

                </div>

                <div className="bot-overview-card">

                    <div className="overview-icon">
                        💬
                    </div>

                    <div>
                        <span>
                            Atendimento
                        </span>

                        <strong>
                            {humanSupportEnabled
                                ? 'Humano disponível'
                                : 'Automático'}
                        </strong>
                    </div>

                </div>

            </section>

            {/* =========================================
                CONFIGURAÇÕES
            ========================================= */}

            <section className="bot-settings-section">

                <div className="section-heading">

                    <div>
                        <span className="section-kicker">
                            CONTROLE DO SISTEMA
                        </span>

                        <h2>
                            Recursos do atendimento
                        </h2>

                        <p>
                            Escolha quais funcionalidades estarão
                            disponíveis para os seus clientes.
                        </p>
                    </div>

                </div>

                <div className="bot-settings-list">

                    {/* BOT */}

                    <div
                        className={
                            `bot-setting-card ${
                                botEnabled
                                    ? 'setting-enabled'
                                    : ''
                            }`
                        }
                    >

                        <div className="setting-icon bot-icon">
                            🤖
                        </div>

                        <div className="bot-setting-content">

                            <div className="setting-title-row">

                                <h3>
                                    Bot automático
                                </h3>

                                <span
                                    className={
                                        botEnabled
                                            ? 'setting-badge active'
                                            : 'setting-badge inactive'
                                    }
                                >
                                    {botEnabled
                                        ? 'Ativo'
                                        : 'Inativo'}
                                </span>

                            </div>

                            <p>
                                Ativa ou desativa completamente
                                o atendimento automático pelo WhatsApp.
                            </p>

                        </div>

                        <button
                            type="button"
                            className={
                                `premium-toggle ${
                                    botEnabled
                                        ? 'active'
                                        : ''
                                }`
                            }
                            onClick={() =>
                                handleChange('bot_enabled')
                            }
                            aria-label="Ativar ou desativar bot"
                            aria-pressed={botEnabled}
                        >
                            <span></span>
                        </button>

                    </div>

                    {/* MENU */}

                    <div
                        className={
                            `bot-setting-card ${
                                menuEnabled
                                    ? 'setting-enabled'
                                    : ''
                            }`
                        }
                    >

                        <div className="setting-icon menu-icon">
                            📋
                        </div>

                        <div className="bot-setting-content">

                            <div className="setting-title-row">

                                <h3>
                                    Menu automático
                                </h3>

                                <span
                                    className={
                                        menuEnabled
                                            ? 'setting-badge active'
                                            : 'setting-badge inactive'
                                    }
                                >
                                    {menuEnabled
                                        ? 'Ativo'
                                        : 'Inativo'}
                                </span>

                            </div>

                            <p>
                                Permite que o bot apresente
                                automaticamente as opções disponíveis
                                aos clientes.
                            </p>

                        </div>

                        <button
                            type="button"
                            className={
                                `premium-toggle ${
                                    menuEnabled
                                        ? 'active'
                                        : ''
                                }`
                            }
                            onClick={() =>
                                handleChange('menu_enabled')
                            }
                            aria-label="Ativar ou desativar menu"
                            aria-pressed={menuEnabled}
                        >
                            <span></span>
                        </button>

                    </div>

                    {/* PEDIDOS */}

                    <div
                        className={
                            `bot-setting-card ${
                                ordersEnabled
                                    ? 'setting-enabled'
                                    : ''
                            }`
                        }
                    >

                        <div className="setting-icon orders-icon">
                            🛒
                        </div>

                        <div className="bot-setting-content">

                            <div className="setting-title-row">

                                <h3>
                                    Pedidos pelo WhatsApp
                                </h3>

                                <span
                                    className={
                                        ordersEnabled
                                            ? 'setting-badge active'
                                            : 'setting-badge inactive'
                                    }
                                >
                                    {ordersEnabled
                                        ? 'Ativo'
                                        : 'Inativo'}
                                </span>

                            </div>

                            <p>
                                Permite que os clientes consultem
                                produtos e façam pedidos diretamente
                                pelo WhatsApp.
                            </p>

                        </div>

                        <button
                            type="button"
                            className={
                                `premium-toggle ${
                                    ordersEnabled
                                        ? 'active'
                                        : ''
                                }`
                            }
                            onClick={() =>
                                handleChange('orders_enabled')
                            }
                            aria-label="Ativar ou desativar pedidos"
                            aria-pressed={ordersEnabled}
                        >
                            <span></span>
                        </button>

                    </div>

                    {/* ATENDIMENTO HUMANO */}

                    <div
                        className={
                            `bot-setting-card ${
                                humanSupportEnabled
                                    ? 'setting-enabled'
                                    : ''
                            }`
                        }
                    >

                        <div className="setting-icon support-icon">
                            👤
                        </div>

                        <div className="bot-setting-content">

                            <div className="setting-title-row">

                                <h3>
                                    Atendimento humano
                                </h3>

                                <span
                                    className={
                                        humanSupportEnabled
                                            ? 'setting-badge active'
                                            : 'setting-badge inactive'
                                    }
                                >
                                    {humanSupportEnabled
                                        ? 'Ativo'
                                        : 'Inativo'}
                                </span>

                            </div>

                            <p>
                                Permite que o cliente solicite
                                atendimento de uma pessoa quando
                                necessário.
                            </p>

                        </div>

                        <button
                            type="button"
                            className={
                                `premium-toggle ${
                                    humanSupportEnabled
                                        ? 'active'
                                        : ''
                                }`
                            }
                            onClick={() =>
                                handleChange(
                                    'human_support_enabled'
                                )
                            }
                            aria-label="Ativar ou desativar atendimento humano"
                            aria-pressed={humanSupportEnabled}
                        >
                            <span></span>
                        </button>

                    </div>

                </div>

            </section>

            {/* =========================================
                RODAPÉ / SALVAR
            ========================================= */}

            <section className="bot-save-area">

                <div className="save-info">

                    <div className="save-info-icon">
                        💡
                    </div>

                    <div>
                        <strong>
                            Alterações pendentes
                        </strong>

                        <p>
                            As alterações feitas nesta página
                            serão aplicadas depois de salvar.
                        </p>
                    </div>

                </div>

                <button
                    type="button"
                    className="bot-save-button"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <>
                            <span className="save-spinner"></span>
                            Salvando...
                        </>
                    ) : (
                        <>
                            Salvar configurações
                            <span>→</span>
                        </>
                    )}
                </button>

            </section>

        </div>
    );
}

export default Bot;