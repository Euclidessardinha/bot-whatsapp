
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

        const {
            error
        } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error(
                'Erro de login:',
                error
            );

            setError(error.message);
            setLoading(false);

            return;
        }

        window.location.href = '/dashboard';
    }

    return (
        <div className="login-page">

            <div className="login-background-glow glow-one"></div>
            <div className="login-background-glow glow-two"></div>

            <div className="login-layout">

                {/* LADO ESQUERDO */}

                <div className="login-brand">

                    <div className="brand-badge">
                        <span className="brand-dot"></span>
                        WhatsApp Bot SaaS
                    </div>

                    <h1>
                        Automatize o seu negócio
                        <span> pelo WhatsApp.</span>
                    </h1>

                    <p className="brand-description">
                        Atenda clientes, receba pedidos,
                        apresente produtos e automatize
                        conversas através de um único painel.
                    </p>

                    <div className="brand-features">

                        <div className="feature-item">
                            <div className="feature-icon">
                                ✓
                            </div>

                            <div>
                                <strong>
                                    Atendimento automático
                                </strong>

                                <span>
                                    Respostas rápidas para os seus clientes
                                </span>
                            </div>
                        </div>

                        <div className="feature-item">
                            <div className="feature-icon">
                                ✓
                            </div>

                            <div>
                                <strong>
                                    Gestão centralizada
                                </strong>

                                <span>
                                    Produtos, pedidos e clientes num só lugar
                                </span>
                            </div>
                        </div>

                        <div className="feature-item">
                            <div className="feature-icon">
                                ✓
                            </div>

                            <div>
                                <strong>
                                    Feito para o seu negócio
                                </strong>

                                <span>
                                    Configure o bot conforme a sua empresa
                                </span>
                            </div>
                        </div>

                    </div>

                </div>

                {/* CARD DE LOGIN */}

                <div className="login-card">

                    <div className="login-header">

                        <div className="login-icon">
                            💬
                        </div>

                        <h2>
                            Bem-vindo de volta
                        </h2>

                        <p>
                            Entre no seu painel para continuar.
                        </p>

                    </div>

                    <form
                        className="login-form"
                        onSubmit={handleLogin}
                    >

                        <div className="form-group">

                            <label>
                                Email
                            </label>

                            <input
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                placeholder="seu@email.com"
                                required
                            />

                        </div>

                        <div className="form-group">

                            <div className="password-label">

                                <label>
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

                            <input
                                type="password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(
                                        e.target.value
                                    )
                                }
                                placeholder="••••••••"
                                required
                            />

                        </div>

                        {error && (
                            <div className="login-message error">
                                {error}
                            </div>
                        )}

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
                                    Entrar
                                    <span className="button-arrow">
                                        →
                                    </span>
                                </>
                            )}
                        </button>

                    </form>

                    <div className="login-divider">
                        <span>ou</span>
                    </div>

                    <div className="login-footer">

                        <span>
                            Ainda não tem uma conta?
                        </span>

                        <a href="/register">
                            Criar conta
                        </a>

                    </div>

                    <div className="login-security">
                        🔒 Os seus dados estão protegidos
                    </div>

                </div>

            </div>

            <div className="login-copyright">
                © 2026 WhatsApp Bot SaaS. Todos os direitos reservados.
            </div>

        </div>
    );
}

export default Login;
