
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import './Register.css';

function Register() {
    const [companyName, setCompanyName] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function handleRegister(e) {
        e.preventDefault();

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            /*
             * =====================================================
             * CRIAR UTILIZADOR NO SUPABASE AUTH
             * =====================================================
             *
             * Os dados da empresa são enviados como metadata.
             *
             * A trigger handle_new_user() utilizará estes dados
             * para criar automaticamente:
             *
             * companies
             * profiles
             * bot_settings
             */

            const {
                data: authData,
                error: authError
            } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        company_name: companyName.trim(),
                        full_name: fullName.trim(),
                        phone: phone.trim() || null,
                        location: location.trim() || null
                    }
                }
            });

            if (authError) {
                throw authError;
            }

            const user = authData.user;

            if (!user) {
                throw new Error(
                    'Não foi possível criar a conta.'
                );
            }

            /*
             * =====================================================
             * CONFIRMAÇÃO DE EMAIL
             * =====================================================
             *
             * Como a confirmação de email está ativada,
             * normalmente o Supabase não cria uma sessão
             * imediatamente.
             */

            if (!authData.session) {
                setSuccess(
                    'Conta criada com sucesso! Verifique o seu email para confirmar a conta. Depois volte e faça login.'
                );

                return;
            }

            /*
             * =====================================================
             * CASO A CONFIRMAÇÃO DE EMAIL ESTEJA DESATIVADA
             * =====================================================
             *
             * Neste caso o Supabase cria a sessão imediatamente.
             * A trigger já terá criado a empresa, profile
             * e configurações do bot.
             */

            setSuccess(
                'Conta criada com sucesso! A entrar no painel...'
            );

            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);

        } catch (err) {
            console.error(
                'Erro no cadastro:',
                err
            );

            setError(
                err.message ||
                'Ocorreu um erro ao criar a conta.'
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="register-page">

            <div className="register-background-glow register-glow-one"></div>
            <div className="register-background-glow register-glow-two"></div>

            <div className="register-layout">

                {/* =================================================
                    LADO ESQUERDO
                ================================================= */}

                <div className="register-brand">

                    <div className="register-brand-badge">
                        <span className="register-brand-dot"></span>
                        WhatsApp Bot SaaS
                    </div>

                    <h1>
                        Comece a automatizar
                        <span> o seu negócio.</span>
                    </h1>

                    <p className="register-description">
                        Crie a sua conta e tenha acesso a uma
                        plataforma completa para gerir o atendimento
                        e as operações do seu negócio pelo WhatsApp.
                    </p>

                    <div className="register-steps">

                        <div className="register-step">

                            <div className="step-number">
                                01
                            </div>

                            <div>
                                <strong>
                                    Crie a sua conta
                                </strong>

                                <span>
                                    Registe a sua empresa em poucos minutos.
                                </span>
                            </div>

                        </div>

                        <div className="register-step">

                            <div className="step-number">
                                02
                            </div>

                            <div>
                                <strong>
                                    Configure o seu negócio
                                </strong>

                                <span>
                                    Adicione produtos, serviços e informações.
                                </span>
                            </div>

                        </div>

                        <div className="register-step">

                            <div className="step-number">
                                03
                            </div>

                            <div>
                                <strong>
                                    Comece a atender
                                </strong>

                                <span>
                                    Deixe o bot trabalhar por si.
                                </span>
                            </div>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    CARD DE CADASTRO
                ================================================= */}

                <div className="register-card">

                    <div className="register-header">

                        <div className="register-icon">
                            ✦
                        </div>

                        <h2>
                            Criar a sua conta
                        </h2>

                        <p>
                            Configure o seu negócio para começar.
                        </p>

                    </div>

                    <form
                        className="register-form"
                        onSubmit={handleRegister}
                    >

                        <div className="register-form-grid">

                            <div className="form-group">

                                <label>
                                    Nome da empresa
                                </label>

                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) =>
                                        setCompanyName(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Ex.: Tem Mais Burguer"
                                    required
                                />

                            </div>

                            <div className="form-group">

                                <label>
                                    Nome do responsável
                                </label>

                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) =>
                                        setFullName(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Seu nome completo"
                                    required
                                />

                            </div>

                        </div>

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

                            <label>
                                Palavra-passe
                            </label>

                            <input
                                type="password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(
                                        e.target.value
                                    )
                                }
                                placeholder="Mínimo de 6 caracteres"
                                minLength={6}
                                required
                            />

                        </div>

                        <div className="register-form-grid">

                            <div className="form-group">

                                <label>
                                    Telefone
                                </label>

                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) =>
                                        setPhone(
                                            e.target.value
                                        )
                                    }
                                    placeholder="+258 84 000 0000"
                                />

                            </div>

                            <div className="form-group">

                                <label>
                                    Localização
                                </label>

                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) =>
                                        setLocation(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Ex.: Maputo"
                                />

                            </div>

                        </div>

                        {error && (
                            <div className="register-message error">
                                <span>!</span>
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="register-message success">
                                <span>✓</span>
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="register-button"
                        >
                            {loading ? (
                                <>
                                    <span className="register-spinner"></span>
                                    Criando conta...
                                </>
                            ) : (
                                <>
                                    Criar conta
                                    <span className="register-arrow">
                                        →
                                    </span>
                                </>
                            )}
                        </button>

                    </form>

                    <div className="register-divider">
                        <span>Já utiliza a plataforma?</span>
                    </div>

                    <div className="register-footer">

                        <span>
                            Já tem uma conta?
                        </span>

                        <a href="/">
                            Entrar
                        </a>

                    </div>

                    <div className="register-security">
                        🔒 Os seus dados estão protegidos
                    </div>

                </div>

            </div>

            <div className="register-copyright">
                © 2026 WhatsApp Bot SaaS. Todos os direitos reservados.
            </div>

        </div>
    );
}

export default Register;
