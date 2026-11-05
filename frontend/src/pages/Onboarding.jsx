
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './Onboarding.css';

function Onboarding() {
    const [step, setStep] = useState(1);

    const [user, setUser] = useState(null);
    const [companyId, setCompanyId] = useState(null);

    const [companyName, setCompanyName] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [businessType, setBusinessType] = useState('other');

    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [businessHours, setBusinessHours] = useState({
        monday: {
            open: '08:00',
            close: '18:00',
            closed: false
        },
        tuesday: {
            open: '08:00',
            close: '18:00',
            closed: false
        },
        wednesday: {
            open: '08:00',
            close: '18:00',
            closed: false
        },
        thursday: {
            open: '08:00',
            close: '18:00',
            closed: false
        },
        friday: {
            open: '08:00',
            close: '18:00',
            closed: false
        },
        saturday: {
            open: '08:00',
            close: '13:00',
            closed: false
        },
        sunday: {
            open: null,
            close: null,
            closed: true
        }
    });

    const [botEnabled, setBotEnabled] = useState(true);
    const [menuEnabled, setMenuEnabled] = useState(true);
    const [ordersEnabled, setOrdersEnabled] = useState(true);
    const [humanSupportEnabled, setHumanSupportEnabled] = useState(true);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadOnboardingData();
    }, []);

    async function loadOnboardingData() {
        try {
            setLoading(true);
            setError('');

            const {
                data: {
                    user: currentUser
                },
                error: userError
            } = await supabase.auth.getUser();

            if (userError) {
                throw userError;
            }

            if (!currentUser) {
                window.location.href = '/';
                return;
            }

            setUser(currentUser);

            const {
                data: profile,
                error: profileError
            } = await supabase
                .from('profiles')
                .select(`
                    id,
                    company_id,
                    onboarding_completed,
                    companies (
                        id,
                        name,
                        phone,
                        location,
                        business_type,
                        welcome_message,
                        business_hours
                    )
                `)
                .eq('id', currentUser.id)
                .single();

            if (profileError) {
                throw profileError;
            }

            if (!profile?.company_id || !profile?.companies) {
                throw new Error(
                    'Não foi possível encontrar a empresa associada à sua conta.'
                );
            }

            if (profile.onboarding_completed) {
                window.location.href = '/dashboard';
                return;
            }

            setCompanyId(profile.company_id);

            const company = profile.companies;

            setCompanyName(company.name || '');
            setPhone(company.phone || '');
            setLocation(company.location || '');
            setBusinessType(company.business_type || 'other');

            setWelcomeMessage(
                company.welcome_message ||
                `👋 Olá! Bem-vindo à ${company.name || 'nossa empresa'}!`
            );

            if (company.business_hours) {
                setBusinessHours({
                    ...businessHours,
                    ...company.business_hours
                });
            }

            const {
                data: settings,
                error: settingsError
            } = await supabase
                .from('bot_settings')
                .select(`
                    menu_enabled,
                    orders_enabled,
                    human_support_enabled,
                    bot_enabled
                `)
                .eq('company_id', profile.company_id)
                .single();

            if (settingsError) {
                throw settingsError;
            }

            if (settings) {
                setBotEnabled(settings.bot_enabled ?? true);
                setMenuEnabled(settings.menu_enabled ?? true);
                setOrdersEnabled(settings.orders_enabled ?? true);
                setHumanSupportEnabled(
                    settings.human_support_enabled ?? true
                );
            }

        } catch (err) {
            console.error(
                'Erro ao carregar onboarding:',
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

    function nextStep() {
        setError('');

        if (step === 1) {
            if (!companyName.trim()) {
                setError(
                    'Digite o nome da empresa.'
                );
                return;
            }
        }

        setStep((current) => Math.min(current + 1, 3));
    }

    function previousStep() {
        setError('');
        setStep((current) => Math.max(current - 1, 1));
    }

    function updateBusinessHour(day, field, value) {
        setBusinessHours((current) => ({
            ...current,
            [day]: {
                ...current[day],
                [field]: value
            }
        }));
    }

    async function finishOnboarding() {
        try {
            setSaving(true);
            setError('');

            if (!user || !companyId) {
                throw new Error(
                    'Sessão inválida. Faça login novamente.'
                );
            }

            /*
             * =====================================================
             * ATUALIZAR EMPRESA
             * =====================================================
             */

            const {
                error: companyError
            } = await supabase
                .from('companies')
                .update({
                    name: companyName.trim(),
                    phone: phone.trim() || null,
                    location: location.trim() || null,
                    business_type: businessType,
                    welcome_message:
                        welcomeMessage.trim() ||
                        `👋 Olá! Bem-vindo à ${companyName.trim()}!`,
                    business_hours: businessHours
                })
                .eq('id', companyId);

            if (companyError) {
                throw companyError;
            }

            /*
             * =====================================================
             * ATUALIZAR CONFIGURAÇÕES DO BOT
             * =====================================================
             */

            const {
                error: settingsError
            } = await supabase
                .from('bot_settings')
                .update({
                    bot_enabled: botEnabled,
                    menu_enabled: menuEnabled,
                    orders_enabled: ordersEnabled,
                    human_support_enabled:
                        humanSupportEnabled
                })
                .eq('company_id', companyId);

            if (settingsError) {
                throw settingsError;
            }

            /*
             * =====================================================
             * MARCAR ONBOARDING COMO CONCLUÍDO
             * =====================================================
             */

            const {
    error: profileError
} = await supabase
    .from('profiles')
    .update({
        onboarding_completed: true
    })
    .eq('id', user.id);

if (profileError) {
    throw profileError;
}
const {
    data: profileCheck,
    error: profileCheckError
} = await supabase
    .from('profiles')
    .select('id, onboarding_completed')
    .eq('id', user.id);

if (profileCheckError) {
    throw profileCheckError;
}

if (
    !profileCheck ||
    profileCheck.length !== 1 ||
    profileCheck[0].onboarding_completed !== true
) {
    throw new Error(
        'O onboarding não foi marcado como concluído no perfil.'
    );
}

window.location.href = '/dashboard';

        } catch (err) {
            console.error(
                'Erro ao finalizar onboarding:',
                err
            );

            setError(
                err.message ||
                'Não foi possível guardar as configurações.'
            );

            setSaving(false);
        }
    }

    function renderStepContent() {
        if (step === 1) {
            return (
                <div className="onboarding-step-content">

                    <div className="onboarding-section-heading">
                        <span className="onboarding-section-icon">
                            🏢
                        </span>

                        <div>
                            <h2>
                                Vamos conhecer o seu negócio
                            </h2>

                            <p>
                                Estas informações serão usadas pelo seu
                                assistente no WhatsApp.
                            </p>
                        </div>
                    </div>

                    <div className="onboarding-form-grid">

                        <div className="onboarding-field full">
                            <label>
                                Nome da empresa
                            </label>

                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) =>
                                    setCompanyName(e.target.value)
                                }
                                placeholder="Ex.: Tem Mais Burguer"
                            />
                        </div>

                        <div className="onboarding-field">
                            <label>
                                Telefone
                            </label>

                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) =>
                                    setPhone(e.target.value)
                                }
                                placeholder="+258 84 000 0000"
                            />
                        </div>

                        <div className="onboarding-field">
                            <label>
                                Localização
                            </label>

                            <input
                                type="text"
                                value={location}
                                onChange={(e) =>
                                    setLocation(e.target.value)
                                }
                                placeholder="Ex.: Maputo"
                            />
                        </div>

                        <div className="onboarding-field full">
                            <label>
                                Tipo de negócio
                            </label>

                            <select
                                value={businessType}
                                onChange={(e) =>
                                    setBusinessType(e.target.value)
                                }
                            >
                                <option value="restaurant">
                                    Restaurante
                                </option>

                                <option value="bar">
                                    Bar
                                </option>

                                <option value="shop">
                                    Loja
                                </option>

                                <option value="salon">
                                    Salão / Beleza
                                </option>

                                <option value="fitness">
                                    Ginásio / Fitness
                                </option>

                                <option value="services">
                                    Prestação de serviços
                                </option>

                                <option value="other">
                                    Outro
                                </option>
                            </select>
                        </div>

                    </div>
                </div>
            );
        }

        if (step === 2) {
            return (
                <div className="onboarding-step-content">

                    <div className="onboarding-section-heading">
                        <span className="onboarding-section-icon">
                            💬
                        </span>

                        <div>
                            <h2>
                                Configure o atendimento
                            </h2>

                            <p>
                                Defina como o seu negócio será apresentado
                                aos clientes.
                            </p>
                        </div>
                    </div>

                    <div className="onboarding-field full">
                        <label>
                            Mensagem de boas-vindas
                        </label>

                        <textarea
                            value={welcomeMessage}
                            onChange={(e) =>
                                setWelcomeMessage(e.target.value)
                            }
                            placeholder="Ex.: 👋 Olá! Bem-vindo à nossa empresa. Como podemos ajudar?"
                            rows="4"
                        />

                        <span className="onboarding-hint">
                            Esta mensagem será utilizada pelo bot no início
                            do atendimento.
                        </span>
                    </div>

                    <div className="onboarding-hours">

                        <h3>
                            Horário de funcionamento
                        </h3>

                        {Object.entries(businessHours).map(
                            ([day, hours]) => (
                                <div
                                    className="onboarding-hours-row"
                                    key={day}
                                >

                                    <div className="onboarding-day">
                                        {getDayLabel(day)}
                                    </div>

                                    <label className="onboarding-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={!hours.closed}
                                            onChange={(e) => {
                                                updateBusinessHour(
                                                    day,
                                                    'closed',
                                                    !e.target.checked
                                                );
                                            }}
                                        />

                                        <span>
                                            Aberto
                                        </span>
                                    </label>

                                    {!hours.closed && (
                                        <>
                                            <input
                                                type="time"
                                                value={
                                                    hours.open || '08:00'
                                                }
                                                onChange={(e) =>
                                                    updateBusinessHour(
                                                        day,
                                                        'open',
                                                        e.target.value
                                                    )
                                                }
                                            />

                                            <span className="hours-separator">
                                                até
                                            </span>

                                            <input
                                                type="time"
                                                value={
                                                    hours.close || '18:00'
                                                }
                                                onChange={(e) =>
                                                    updateBusinessHour(
                                                        day,
                                                        'close',
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </>
                                    )}

                                </div>
                            )
                        )}

                    </div>
                </div>
            );
        }

        return (
            <div className="onboarding-step-content">

                <div className="onboarding-section-heading">
                    <span className="onboarding-section-icon">
                        ⚡
                    </span>

                    <div>
                        <h2>
                            Configure o seu assistente
                        </h2>

                        <p>
                            Escolha quais funcionalidades estarão disponíveis.
                        </p>
                    </div>
                </div>

                <div className="onboarding-settings">

                    <SettingCard
                        title="Assistente automático"
                        description="Permite que o bot responda automaticamente aos clientes."
                        enabled={botEnabled}
                        onChange={setBotEnabled}
                        disabled={false}
                    />

                    <SettingCard
                        title="Menu"
                        description="Permite que os clientes consultem o menu ou catálogo."
                        enabled={menuEnabled}
                        onChange={setMenuEnabled}
                        disabled={!botEnabled}
                    />

                    <SettingCard
                        title="Pedidos"
                        description="Permite receber e gerir pedidos através do WhatsApp."
                        enabled={ordersEnabled}
                        onChange={setOrdersEnabled}
                        disabled={!botEnabled}
                    />

                    <SettingCard
                        title="Atendimento humano"
                        description="Permite encaminhar o cliente para um atendente."
                        enabled={humanSupportEnabled}
                        onChange={setHumanSupportEnabled}
                        disabled={!botEnabled}
                    />

                </div>

                <div className="onboarding-ready">

                    <div className="ready-icon">
                        ✓
                    </div>

                    <div>
                        <strong>
                            Tudo pronto para começar
                        </strong>

                        <span>
                            Poderá alterar estas configurações novamente
                            no dashboard.
                        </span>
                    </div>

                </div>

            </div>
        );
    }

    if (loading) {
        return (
            <div className="onboarding-page">

                <div className="onboarding-loading">

                    <div className="onboarding-spinner"></div>

                    <p>
                        A preparar o seu espaço...
                    </p>

                </div>

            </div>
        );
    }

    return (
        <div className="onboarding-page">

            <div className="onboarding-background-glow onboarding-glow-one"></div>
            <div className="onboarding-background-glow onboarding-glow-two"></div>

            <div className="onboarding-container">

                <header className="onboarding-header">

                    <div className="onboarding-logo">
                        <span className="onboarding-logo-dot"></span>
                        WhatsApp Bot SaaS
                    </div>

                    <div className="onboarding-progress-text">
                        Etapa {step} de 3
                    </div>

                </header>

                <div className="onboarding-progress">

                    <div className="progress-track">

                        <div
                            className="progress-fill"
                            style={{
                                width: `${(step / 3) * 100}%`
                            }}
                        ></div>

                    </div>

                    <div className="progress-steps">

                        <span className={step >= 1 ? 'active' : ''}>
                            Negócio
                        </span>

                        <span className={step >= 2 ? 'active' : ''}>
                            Atendimento
                        </span>

                        <span className={step >= 3 ? 'active' : ''}>
                            Assistente
                        </span>

                    </div>

                </div>

                <main className="onboarding-card">

                    {renderStepContent()}

                    {error && (
                        <div className="onboarding-error">
                            <span>!</span>
                            {error}
                        </div>
                    )}

                    <div className="onboarding-actions">

                        {step > 1 ? (
                            <button
                                type="button"
                                className="onboarding-button secondary"
                                onClick={previousStep}
                                disabled={saving}
                            >
                                ← Voltar
                            </button>
                        ) : (
                            <div></div>
                        )}

                        {step < 3 ? (
                            <button
                                type="button"
                                className="onboarding-button primary"
                                onClick={nextStep}
                            >
                                Continuar
                                <span>→</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="onboarding-button primary"
                                onClick={finishOnboarding}
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <span className="onboarding-button-spinner"></span>
                                        A guardar...
                                    </>
                                ) : (
                                    <>
                                        Concluir configuração
                                        <span>→</span>
                                    </>
                                )}
                            </button>
                        )}

                    </div>

                </main>

                <footer className="onboarding-footer">
                    🔒 Os seus dados estão protegidos
                </footer>

            </div>

        </div>
    );
}

function getDayLabel(day) {
    const labels = {
        monday: 'Segunda',
        tuesday: 'Terça',
        wednesday: 'Quarta',
        thursday: 'Quinta',
        friday: 'Sexta',
        saturday: 'Sábado',
        sunday: 'Domingo'
    };

    return labels[day] || day;
}

function SettingCard({
    title,
    description,
    enabled,
    onChange,
    disabled
}) {
    return (
        <div
            className={`onboarding-setting-card ${
                disabled ? 'disabled' : ''
            }`}
        >

            <div className="setting-info">

                <strong>
                    {title}
                </strong>

                <span>
                    {description}
                </span>

            </div>

            <button
                type="button"
                className={`setting-toggle ${
                    enabled ? 'enabled' : ''
                }`}
                onClick={() => onChange(!enabled)}
                disabled={disabled}
                aria-label={`Alternar ${title}`}
            >
                <span></span>
            </button>

        </div>
    );
}

export default Onboarding;
