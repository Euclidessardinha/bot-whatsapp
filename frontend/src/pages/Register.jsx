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

            {/* =====================================================
                BACKGROUND
            ===================================================== */}

            <div className="register-bg-glow register-glow-one"></div>
            <div className="register-bg-glow register-glow-two"></div>
            <div className="register-bg-grid"></div>


            <div className="register-layout">

                {/* =================================================
                    LADO ESQUERDO
                ================================================= */}

                <section className="register-showcase">

                    <div className="register-showcase-content">

                        {/* BRAND */}

                        <div className="register-brand">

                            <div className="register-brand-logo">
                                <img
                                    src="/logo.png"
                                    alt="WhatsBot"
                                />
                            </div>

                            <div className="register-brand-name">

                                <strong>
                                    WhatsBot
                                </strong>

                                <span>
                                    Business Automation
                                </span>

                            </div>

                        </div>


                        {/* BADGE */}

                        <div className="register-brand-badge">

                            <span className="register-brand-dot"></span>

                            COMEÇAR É SIMPLES

                        </div>


                        {/* TITLE */}

                        <h1>
                            Comece a automatizar
                            <span>
                                o seu negócio.
                            </span>
                        </h1>


                        <p className="register-description">
                            Crie a sua conta e tenha acesso a uma
                            plataforma completa para gerir o atendimento
                            e as operações do seu negócio pelo WhatsApp.
                        </p>


                        {/* STEPS */}

                        <div className="register-steps">

                            <div className="register-step">

                                <div className="step-number">
                                    01
                                </div>

                                <div className="step-content">

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

                                <div className="step-content">

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

                                <div className="step-content">

                                    <strong>
                                        Comece a atender
                                    </strong>

                                    <span>
                                        Deixe o bot trabalhar por si.
                                    </span>

                                </div>

                            </div>

                        </div>


                        {/* VISUAL DECORATIVO */}

                        <div className="register-visual">

                            <div className="register-orbit orbit-one"></div>
                            <div className="register-orbit orbit-two"></div>

                            <div className="register-visual-core">

                                <div className="visual-core-dot"></div>

                                <div className="visual-core-line visual-line-one"></div>
                                <div className="visual-core-line visual-line-two"></div>
                                <div className="visual-core-line visual-line-three"></div>

                            </div>


                            <div className="register-floating-card floating-card-one">

                                <div className="floating-card-icon">
                                    ✓
                                </div>

                                <div>
                                    <strong>
                                        Empresa criada
                                    </strong>

                                    <span>
                                        Tudo pronto para começar
                                    </span>
                                </div>

                            </div>


                            <div className="register-floating-card floating-card-two">

                                <div className="floating-card-icon">
                                    ⚡
                                </div>

                                <div>
                                    <strong>
                                        Automação ativa
                                    </strong>

                                    <span>
                                        Atendimento inteligente
                                    </span>
                                </div>

                            </div>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    CARD DE CADASTRO
                ================================================= */}

                <section className="register-panel">

                    <div className="register-card">

                        <div className="register-card-glow"></div>


                        {/* HEADER */}

                        <div className="register-header">

                            <div className="register-icon">

                                <div className="register-icon-symbol">
                                    +
                                </div>

                            </div>


                            <div className="register-status">

                                <span></span>

                                Crie a sua conta

                            </div>


                            <h2>
                                Comece agora
                            </h2>

                            <p>
                                Configure o seu negócio para começar.
                            </p>

                        </div>


                        {/* FORM */}

                        <form
                            className="register-form"
                            onSubmit={handleRegister}
                        >

                            {/* EMPRESA + RESPONSÁVEL */}

                            <div className="register-form-grid">

                                <div className="form-group">

                                    <label htmlFor="companyName">
                                        Nome da empresa
                                    </label>

                                    <div className="register-input-wrapper">

                                        <span className="register-input-icon">
                                            ◆
                                        </span>

                                        <input
                                            id="companyName"
                                            type="text"
                                            value={companyName}
                                            onChange={(e) =>
                                                setCompanyName(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Ex.: Tem Mais Burguer"
                                            autoComplete="organization"
                                            required
                                        />

                                    </div>

                                </div>


                                <div className="form-group">

                                    <label htmlFor="fullName">
                                        Nome do responsável
                                    </label>

                                    <div className="register-input-wrapper">

                                        <span className="register-input-icon">
                                            ●
                                        </span>

                                        <input
                                            id="fullName"
                                            type="text"
                                            value={fullName}
                                            onChange={(e) =>
                                                setFullName(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Seu nome completo"
                                            autoComplete="name"
                                            required
                                        />

                                    </div>

                                </div>

                            </div>


                            {/* EMAIL */}

                            <div className="form-group">

                                <label htmlFor="email">
                                    Email
                                </label>

                                <div className="register-input-wrapper">

                                    <span className="register-input-icon">
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

                                <label htmlFor="password">
                                    Palavra-passe
                                </label>

                                <div className="register-input-wrapper">

                                    <span className="register-input-icon password-icon">
                                        •
                                    </span>

                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Mínimo de 6 caracteres"
                                        autoComplete="new-password"
                                        minLength={6}
                                        required
                                    />

                                </div>

                            </div>


                            {/* TELEFONE + LOCALIZAÇÃO */}

                            <div className="register-form-grid">

                                <div className="form-group">

                                    <label htmlFor="phone">
                                        Telefone
                                    </label>

                                    <div className="register-input-wrapper">

                                        <span className="register-input-icon">
                                            +
                                        </span>

                                        <input
                                            id="phone"
                                            type="tel"
                                            value={phone}
                                            onChange={(e) =>
                                                setPhone(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="+258 84 000 0000"
                                            autoComplete="tel"
                                        />

                                    </div>

                                </div>


                                <div className="form-group">

                                    <label htmlFor="location">
                                        Localização
                                    </label>

                                    <div className="register-input-wrapper">

                                        <span className="register-input-icon">
                                            ◉
                                        </span>

                                        <input
                                            id="location"
                                            type="text"
                                            value={location}
                                            onChange={(e) =>
                                                setLocation(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Ex.: Maputo"
                                            autoComplete="address-level2"
                                        />

                                    </div>

                                </div>

                            </div>


                            {/* ERROR */}

                            {error && (

                                <div className="register-message error">

                                    <span className="message-icon">
                                        !
                                    </span>

                                    <span>
                                        {error}
                                    </span>

                                </div>

                            )}


                            {/* SUCCESS */}

                            {success && (

                                <div className="register-message success">

                                    <span className="message-icon">
                                        ✓
                                    </span>

                                    <span>
                                        {success}
                                    </span>

                                </div>

                            )}


                            {/* BUTTON */}

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


                        {/* DIVIDER */}

                        <div className="register-divider">
                            <span>Já utiliza a plataforma?</span>
                        </div>


                        {/* FOOTER */}

                        <div className="register-footer">

                            <span>
                                Já tem uma conta?
                            </span>

                            <a href="/">
                                Entrar
                            </a>

                        </div>


                        {/* SECURITY */}

                        <div className="register-security">

                            <span className="security-icon">
                                🔒
                            </span>

                            <span>
                                Os seus dados estão protegidos
                            </span>

                        </div>

                    </div>

                </section>

            </div>


            {/* COPYRIGHT */}

            <div className="register-copyright">

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

export default Register;