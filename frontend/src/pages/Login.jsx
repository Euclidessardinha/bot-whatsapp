import { useState } from 'react';
import { supabase } from '../lib/supabase';
import './Login.css';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleLogin(e) {
        e.preventDefault();

        setLoading(true);
        setError('');

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Erro de login:', error);

            setError(error.message);
            setLoading(false);

            return;
        }

        window.location.href = '/dashboard';
    }

    return (
        <div className="login-page">

            {/* =====================================================
                BACKGROUND
            ===================================================== */}

            <div className="login-bg-glow glow-one"></div>
            <div className="login-bg-glow glow-two"></div>
            <div className="login-bg-grid"></div>

                <button
    type="button"
    className="login-android-download"
    onClick={() => {
        window.location.href = '/download';
    }}
>
    <span className="login-android-icon">
        📱
    </span>

    <span className="login-android-text">
        <strong>
            Aplicativo Android
        </strong>

        <small>
            Tenha o WhatsBot sempre consigo
        </small>
    </span>

    <span className="login-android-action">
        Baixar →
    </span>
</button>

            <div className="login-container">

                {/* =================================================
                    LADO ESQUERDO — BRAND / APRESENTAÇÃO
                ================================================= */}

                <section className="login-showcase">

                    <div className="showcase-content">

                        {/* =================================================
                            BRAND
                        ================================================= */}

                        <div className="brand">

                            <div className="brand-logo">
                                <img
                                    src="/logo.png"
                                    alt="WhatsBot"
                                />
                            </div>

                            <div className="brand-name">
                                <strong>WhatsBot</strong>

                                <span>
                                    Business Automation
                                </span>
                            </div>

                        </div>


                        {/* =================================================
                            BADGE
                        ================================================= */}

                        <div className="automation-badge">

                            <span className="badge-dot"></span>

                            AUTOMATIZAÇÃO INTELIGENTE

                        </div>


                        {/* =================================================
                            TITLE
                        ================================================= */}

                        <h1>
                            Seu WhatsApp.
                            <span>
                                {' '}Trabalhando por você.
                            </span>
                        </h1>


                        <p className="showcase-description">
                            Automatize o atendimento da sua empresa,
                            responda clientes, receba pedidos e mantenha
                            o seu negócio sempre conectado.
                        </p>


                        {/* =================================================
                            FEATURES
                        ================================================= */}

                        <div className="showcase-features">

                            <div className="showcase-feature">

                                <div className="feature-check">
                                    ✓
                                </div>

                                <div>

                                    <strong>
                                        Atendimento automático
                                    </strong>

                                    <span>
                                        Responda seus clientes 24 horas por dia.
                                    </span>

                                </div>

                            </div>


                            <div className="showcase-feature">

                                <div className="feature-check">
                                    ✓
                                </div>

                                <div>

                                    <strong>
                                        Pedidos pelo WhatsApp
                                    </strong>

                                    <span>
                                        Transforme conversas em pedidos.
                                    </span>

                                </div>

                            </div>


                            <div className="showcase-feature">

                                <div className="feature-check">
                                    ✓
                                </div>

                                <div>

                                    <strong>
                                        Gestão simplificada
                                    </strong>

                                    <span>
                                        Clientes, produtos e pedidos num só lugar.
                                    </span>

                                </div>

                            </div>

                        </div>


                        {/* =================================================
                            VISUAL DECORATIVO
                        ================================================= */}

                        <div className="showcase-visual">

                            <div className="visual-orbit orbit-one"></div>
                            <div className="visual-orbit orbit-two"></div>

                            <div className="visual-core">

                                <div className="core-dot"></div>

                                <div className="core-line line-one"></div>
                                <div className="core-line line-two"></div>
                                <div className="core-line line-three"></div>

                            </div>


                            <div className="visual-card card-one">

                                <div className="mini-card-icon">
                                    ✓
                                </div>

                                <div>
                                    <strong>
                                        Mensagem recebida
                                    </strong>

                                    <span>
                                        Atendimento automático
                                    </span>
                                </div>

                            </div>


                            <div className="visual-card card-two">

                                <div className="mini-card-icon">
                                    ⚡
                                </div>

                                <div>
                                    <strong>
                                        Automação ativa
                                    </strong>

                                    <span>
                                        Sistema funcionando
                                    </span>
                                </div>

                            </div>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    LADO DIREITO — LOGIN
                ================================================= */}

                <section className="login-panel">

                    <div className="login-card">

                        {/* CARD TOP GLOW */}

                        <div className="card-top-glow"></div>


                        {/* =================================================
                            HEADER
                        ================================================= */}

                        <div className="login-header">

                            <div className="login-icon">

                                <div className="login-bot-face">

                                    <span></span>
                                    <span></span>

                                </div>

                                <div className="login-antenna"></div>

                            </div>


                            <div className="system-status">

                                <span></span>

                                Sistema online

                            </div>


                            <h2>
                                Bem-vindo de volta
                            </h2>


                            <p>
                                Entre no seu painel de gestão.
                            </p>

                        </div>


                        {/* =================================================
                            FORM
                        ================================================= */}

                        <form
                            className="login-form"
                            onSubmit={handleLogin}
                        >

                            {/* EMAIL */}

                            <div className="form-group">

                                <label htmlFor="email">
                                    Email
                                </label>

                                <div className="input-wrapper">

                                    <span className="input-icon">
                                        @
                                    </span>

                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        placeholder="seu@email.com"
                                        autoComplete="email"
                                        required
                                    />

                                </div>

                            </div>


                            {/* PASSWORD */}

                            <div className="form-group">

                                <div className="password-label">

                                    <label htmlFor="password">
                                        Palavra-passe
                                    </label>

                                    <button
                                        type="button"
                                        className="forgot-password"
                                        onClick={() => {
                                            alert(
                                                'A recuperação de palavra-passe será adicionada em breve.'
                                            );
                                        }}
                                    >
                                        Esqueceu?
                                    </button>

                                </div>


                                <div className="input-wrapper">

                                    <span className="input-icon password-symbol">
                                        •
                                    </span>

                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        required
                                    />

                                </div>

                            </div>


                            {/* ERROR */}

                            {error && (

                                <div className="login-message error">

                                    <span className="error-icon">
                                        !
                                    </span>

                                    <span>
                                        {error}
                                    </span>

                                </div>

                            )}


                            {/* BUTTON */}

                            <button
                                type="submit"
                                disabled={loading}
                                className="login-button"
                            >

                                {loading ? (

                                    <>
                                        <span className="button-spinner"></span>

                                        Entrando...
                                    </>

                                ) : (

                                    <>
                                        Entrar no painel

                                        <span className="button-arrow">
                                            →
                                        </span>
                                    </>

                                )}

                            </button>

                        </form>


                        {/* =================================================
                            DIVIDER
                        ================================================= */}

                        <div className="login-divider">
                            <span>ou</span>
                        </div>


                        {/* =================================================
                            REGISTER
                        ================================================= */}

                        <div className="login-footer">

                            <span>
                                Ainda não tem uma conta?
                            </span>

                            <a href="/register">
                                Criar conta
                            </a>

                        </div>


                        {/* =================================================
                            SECURITY
                        ================================================= */}

                        <div className="login-security">

                            <span className="security-icon">
                                🔒
                            </span>

                            <span>
                                Ambiente seguro e protegido
                            </span>

                        </div>

                    </div>

                </section>

            </div>


            {/* =====================================================
                COPYRIGHT
            ===================================================== */}

            <div className="login-copyright">

                <span>
                    © 2026 WhatsBot
                </span>

                <span className="copyright-separator">
                    •
                </span>

                <span>
                    Automação para negócios através do WhatsApp
                </span>

            </div>

        </div>
    );
}

export default Login;