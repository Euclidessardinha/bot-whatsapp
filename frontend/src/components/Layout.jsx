
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Layout.css';

function Layout() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const navigate = useNavigate();

    const menuItems = [
        {
            path: '/dashboard',
            icon: '📊',
            label: 'Dashboard'
        },
        {
            path: '/empresa',
            icon: '🏢',
            label: 'Minha empresa'
        },
        {
            path: '/bot',
            icon: '🤖',
            label: 'Configurações do bot'
        },
        {
            path: '/produtos',
            icon: '🍔',
            label: 'Produtos'
        },
        {
            path: '/servicos',
            icon: '🌿',
            label: 'Serviços'
        },
        {
            path: '/pedidos',
            icon: '🛒',
            label: 'Pedidos'
        },
        {
            path: '/clientes',
            icon: '👥',
            label: 'Clientes'
        },
        {
            path: '/solicitacoes',
            icon: '📋',
            label: 'Solicitações'
        },
        {
            path: '/whatsapp',
            icon: '📱',
            label: 'WhatsApp'
        }
    ];

    const closeMenu = () => {
        setMenuOpen(false);
    };

    const handleNavigation = () => {
        closeMenu();
    };

    const handleLogout = async () => {
        if (loggingOut) {
            return;
        }

        setLoggingOut(true);

        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error(
                'Erro ao terminar sessão:',
                error
            );

            setLoggingOut(false);

            return;
        }

        navigate('/', {
            replace: true
        });
    };

    return (
        <div className="layout">

            {/* Overlay mobile */}
            {menuOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={closeMenu}
                />
            )}

            {/* =====================================================
                SIDEBAR
            ===================================================== */}

            <aside
                className={`sidebar ${
                    menuOpen ? 'sidebar-open' : ''
                }`}
            >

                {/* Logo */}
                <div className="sidebar-logo">

                    <div className="brand-mark">
                        <span>🤖</span>
                    </div>

                    <div className="logo-text">
                        <h2>LojaBot</h2>
                        <span>WhatsApp SaaS</span>
                    </div>

                    <button
                        className="mobile-close-button"
                        onClick={closeMenu}
                        aria-label="Fechar menu"
                    >
                        ✕
                    </button>

                </div>

                {/* Status */}
                <div className="sidebar-status">

                    <span className="status-indicator"></span>

                    <span>
                        Sistema operacional
                    </span>

                </div>

                {/* Menu */}
                <nav className="sidebar-menu">

                    <div className="menu-section-title">
                        PRINCIPAL
                    </div>

                    {menuItems.map((item) => (

                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={handleNavigation}
                            className={({ isActive }) =>
                                `sidebar-link ${
                                    isActive
                                        ? 'sidebar-link-active'
                                        : ''
                                }`
                            }
                        >

                            <span className="sidebar-link-icon">
                                {item.icon}
                            </span>

                            <span className="sidebar-link-label">
                                {item.label}
                            </span>

                            <span className="sidebar-link-arrow">
                                ›
                            </span>

                        </NavLink>

                    ))}

                </nav>

                {/* Parte inferior */}
                <div className="sidebar-bottom">

                    {/* Plano */}
                    <div className="plan-box">

                        <div className="plan-glow"></div>

                        <div className="plan-icon">
                            ⭐
                        </div>

                        <div className="plan-info">

                            <span className="plan-title">
                                PLANO ATUAL
                            </span>

                            <strong>
                                Básico
                            </strong>

                        </div>

                        <span className="plan-arrow">
                            ›
                        </span>

                    </div>

                    <div className="sidebar-version">
                        LojaBot v1.0
                    </div>

                </div>

            </aside>

            {/* =====================================================
                ÁREA PRINCIPAL
            ===================================================== */}

            <div className="main-area">

                {/* HEADER */}
                <header className="topbar">

                    <div className="topbar-left">

                        <button
                            className="hamburger-button"
                            onClick={() => setMenuOpen(true)}
                            aria-label="Abrir menu"
                        >
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>

                        <div className="page-indicator">

                            <span className="page-indicator-dot"></span>

                            <div>
                                <strong>
                                    Painel de controle
                                </strong>

                                <span>
                                    Gerencie seu negócio
                                </span>
                            </div>

                        </div>

                    </div>

                    <div className="topbar-right">

                        {/* Notificações */}
                        <button
                            className="notification-button"
                            aria-label="Notificações"
                        >
                            <span className="notification-icon">
                                🔔
                            </span>

                            <span className="notification-dot"></span>
                        </button>

                        <div className="topbar-divider"></div>

                        {/* Utilizador */}
                        <div className="user-area">

                            <div className="user-avatar">
                                A
                            </div>

                            <div className="user-info">

                                <strong>
                                    Administrador
                                </strong>

                                <span>
                                    Proprietário
                                </span>

                            </div>

                            {/* Logout */}
                            <button
                                className="logout-button"
                                onClick={handleLogout}
                                disabled={loggingOut}
                                title="Terminar sessão"
                                aria-label="Terminar sessão"
                            >
                                {loggingOut ? '⏳' : '↪'}
                            </button>

                        </div>

                    </div>

                </header>

                {/* Conteúdo */}
                <main className="page-content">
                    <Outlet />
                </main>

            </div>

        </div>
    );
}

export default Layout;
