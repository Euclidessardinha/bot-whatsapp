
import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import { getCurrentProfile } from '../services/authService';

import {
    uploadWelcomeImage,
    deleteCompanyImage,
    getWelcomeImagePath
} from '../services/storageService';

import './Empresa.css';

const defaultBusinessHours = {
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
        open: '',
        close: '',
        closed: true
    }
};

const daysOfWeek = [
    {
        key: 'monday',
        label: 'Segunda-feira'
    },
    {
        key: 'tuesday',
        label: 'Terça-feira'
    },
    {
        key: 'wednesday',
        label: 'Quarta-feira'
    },
    {
        key: 'thursday',
        label: 'Quinta-feira'
    },
    {
        key: 'friday',
        label: 'Sexta-feira'
    },
    {
        key: 'saturday',
        label: 'Sábado'
    },
    {
        key: 'sunday',
        label: 'Domingo'
    }
];

function Empresa() {
    const [profile, setProfile] = useState(null);

    const [form, setForm] = useState({
        name: '',
        phone: '',
        location: '',
        welcome_message: '',
        business_type: 'other',
        business_hours: defaultBusinessHours
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [welcomeImageFile, setWelcomeImageFile] =
    useState(null);

    const [removeWelcomeImage, setRemoveWelcomeImage] =
    useState(false);

    useEffect(() => {
        loadCompany();
    }, []);

    async function loadCompany() {
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

            const company =
                currentProfile.companies;

            setForm({
                name: company?.name || '',
                phone: company?.phone || '',
                location: company?.location || '',
                welcome_message:
                    company?.welcome_message || '',
                business_type:
                    company?.business_type || 'other',
                business_hours:
                    company?.business_hours || defaultBusinessHours
            });

        } catch (err) {
            console.error(err);

            setError(
                'Não foi possível carregar os dados da empresa.'
            );
        } finally {
            setLoading(false);
        }
    }

    function handleChange(event) {
        const {
            name,
            value
        } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value
        }));

        setMessage('');
        setError('');
    }

    function handleBusinessHoursChange(
        day,
        field,
        value
    ) {
        setForm((current) => ({
            ...current,

            business_hours: {
                ...current.business_hours,

                [day]: {
                    ...current.business_hours[day],
                    [field]: value
                }
            }
        }));

        setMessage('');
        setError('');
    }

    function handleClosedChange(
        day,
        checked
    ) {
        setForm((current) => ({
            ...current,

            business_hours: {
                ...current.business_hours,

                [day]: {
                    ...current.business_hours[day],
                    closed: checked
                }
            }
        }));

        setMessage('');
        setError('');
    }


    function handleWelcomeImageChange(event) {
    const file =
        event.target.files?.[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert(
            'Selecione um ficheiro de imagem válido.'
        );

        event.target.value = '';
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert(
            'A imagem não pode ter mais de 5 MB.'
        );

        event.target.value = '';
        return;
    }

    setWelcomeImageFile(file);
    setRemoveWelcomeImage(false);

    setMessage('');
    setError('');
}

function handleRemoveWelcomeImage() {
    setWelcomeImageFile(null);
    setRemoveWelcomeImage(true);

    setMessage('');
    setError('');
}



    async function handleSubmit(event) {
        event.preventDefault();

        if (!profile?.company_id) {
            return;
        }

        if (!form.name.trim()) {
            setError(
                'O nome da empresa é obrigatório.'
            );
            return;
        }

        try {
            setSaving(true);
            setError('');
            setMessage('');

            let welcomeImageUrl =
    profile.companies?.welcome_image_url ||
    null;

const oldWelcomeImagePath =
    getWelcomeImagePath(
        profile.company_id
    );

if (welcomeImageFile) {
    const uploaded =
        await uploadWelcomeImage(
            profile.company_id,
            welcomeImageFile
        );

    welcomeImageUrl =
        uploaded.url;
} else if (removeWelcomeImage) {
    welcomeImageUrl = null;
}

const {
    error: updateError
} = await supabase
    .from('companies')
    .update({
        name: form.name.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        welcome_message:
            form.welcome_message.trim(),
        welcome_image_url:
            welcomeImageUrl,
        business_type:
            form.business_type,
        business_hours:
            form.business_hours
    })
    .eq(
        'id',
        profile.company_id
    );

if (updateError) {
    throw updateError;
}

if (
    welcomeImageFile ||
    removeWelcomeImage
) {
    try {
        await deleteCompanyImage(
            oldWelcomeImagePath
        );
    } catch (storageError) {
        console.warn(
            'Não foi possível remover a imagem anterior:',
            storageError
        );
    }
}

setProfile((current) => ({
    ...current,
    companies: {
        ...current.companies,
        name: form.name.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        welcome_message:
            form.welcome_message.trim(),
        welcome_image_url:
            welcomeImageUrl,
        business_type:
            form.business_type,
        business_hours:
            form.business_hours
    }
}));

setWelcomeImageFile(null);
setRemoveWelcomeImage(false);

setMessage(
    'Dados da empresa atualizados com sucesso! ✅'
);

        } catch (err) {
            console.error(
                '❌ ERRO COMPLETO:',
                err
            );

            setError(
                err?.message ||
                'Não foi possível atualizar a empresa.'
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="company-loading">
                Carregando empresa...
            </div>
        );
    }

    return (
        <div className="company-page">

            <div className="company-header">

                <div>
                    <h2>
                        🏢 Minha empresa
                    </h2>

                    <p>
                        Configure as informações que serão utilizadas pelo seu bot.
                    </p>
                </div>

            </div>

            {error && (
                <div className="company-error">
                    {error}
                </div>
            )}

            {message && (
                <div className="company-success">
                    {message}
                </div>
            )}

            <div className="company-layout">

                <div className="company-card">

                    <div className="card-header">
                        <h3>
                            Informações da empresa
                        </h3>

                        <p>
                            Esses dados serão utilizados no atendimento do WhatsApp.
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="company-form"
                    >

                        <div className="form-group">

                            <label>
                                Nome da empresa
                            </label>

                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Ex: Tem Mais Burguer"
                            />

                        </div>

                        <div className="form-group">

                            <label>
                                Tipo de negócio
                            </label>

                            <select
                                name="business_type"
                                value={form.business_type}
                                onChange={handleChange}
                            >
                                <option value="restaurant">
                                    🍔 Restaurante
                                </option>

                                <option value="service">
                                    🛠️ Prestação de serviços
                                </option>

                                <option value="shop">
                                    🛍️ Loja
                                </option>

                                <option value="other">
                                    🏢 Outro
                                </option>
                            </select>

                            <span className="field-help">
                                Isso ajuda o bot a adaptar o atendimento ao tipo de negócio.
                            </span>

                        </div>

                        <div className="form-row">

                            <div className="form-group">

                                <label>
                                    Telefone
                                </label>

                                <input
                                    type="text"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="Ex: 841234567"
                                />

                            </div>

                            <div className="form-group">

                                <label>
                                    Localização
                                </label>

                                <input
                                    type="text"
                                    name="location"
                                    value={form.location}
                                    onChange={handleChange}
                                    placeholder="Ex: Maputo"
                                />

                            </div>

                        </div>

                        <div className="form-group">

                            <label>
                                Mensagem de boas-vindas
                            </label>

                            <textarea
                                name="welcome_message"
                                value={
                                    form.welcome_message
                                }
                                onChange={handleChange}
                                placeholder="Ex: 👋 Olá! Bem-vindo à nossa empresa!"
                                rows="5"
                            />

                            <label>
    Imagem de boas-vindas
</label>

<input
    type="file"
    accept="image/*"
    onChange={handleWelcomeImageChange}
/>

{welcomeImageFile && (
    <p>
        Nova imagem selecionada: {welcomeImageFile.name}
    </p>
)}

{profile?.companies?.welcome_image_url &&
    !removeWelcomeImage &&
    !welcomeImageFile && (
        <div>
            <img
                src={
                    profile.companies
                        .welcome_image_url
                }
                alt="Imagem de boas-vindas"
                style={{
                    maxWidth: '220px',
                    maxHeight: '220px',
                    objectFit: 'cover'
                }}
            />

            <button
                type="button"
                onClick={
                    handleRemoveWelcomeImage
                }
            >
                Remover imagem
            </button>
        </div>
    )}

                            <span className="field-help">
                                Essa mensagem será apresentada ao cliente quando ele iniciar uma conversa.
                            </span>

                        </div>

                        <div className="business-hours-section">

                            <div className="card-header">

                                <h3>
                                    🕐 Horário de funcionamento
                                </h3>

                                <p>
                                    Configure os horários em que a empresa está aberta.
                                </p>

                            </div>

                            <div className="business-hours-list">

                                {daysOfWeek.map((day) => {

                                    const hours =
                                        form.business_hours?.[day.key] ||
                                        defaultBusinessHours[day.key];

                                    return (
                                        <div
                                            key={day.key}
                                            className="business-hours-row"
                                        >

                                            <div className="business-day">
                                                {day.label}
                                            </div>

                                            <div className="business-hours-fields">

                                                <input
                                                    type="time"
                                                    value={
                                                        hours.open || ''
                                                    }
                                                    disabled={
                                                        hours.closed
                                                    }
                                                    onChange={(event) =>
                                                        handleBusinessHoursChange(
                                                            day.key,
                                                            'open',
                                                            event.target.value
                                                        )
                                                    }
                                                />

                                                <span>
                                                    até
                                                </span>

                                                <input
                                                    type="time"
                                                    value={
                                                        hours.close || ''
                                                    }
                                                    disabled={
                                                        hours.closed
                                                    }
                                                    onChange={(event) =>
                                                        handleBusinessHoursChange(
                                                            day.key,
                                                            'close',
                                                            event.target.value
                                                        )
                                                    }
                                                />

                                                <label className="closed-checkbox">

                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            Boolean(
                                                                hours.closed
                                                            )
                                                        }
                                                        onChange={(event) =>
                                                            handleClosedChange(
                                                                day.key,
                                                                event.target.checked
                                                            )
                                                        }
                                                    />

                                                    Fechado

                                                </label>

                                            </div>

                                        </div>
                                    );

                                })}

                            </div>

                        </div>

                        <div className="company-form-actions">

                            <button
                                type="submit"
                                className="company-save-button"
                                disabled={saving}
                            >
                                {saving
                                    ? 'Salvando...'
                                    : 'Salvar alterações'}
                            </button>

                        </div>

                    </form>

                </div>

                <div className="company-preview">

                    <div className="preview-header">

                        <span>
                            👁️
                        </span>

                        <div>
                            <h3>
                                Pré-visualização
                            </h3>

                            <p>
                                Como o bot utilizará essas informações
                            </p>
                        </div>

                    </div>

                    <div className="whatsapp-preview">

                        <div className="preview-company">
                            {form.name ||
                                'Nome da empresa'}
                        </div>

                        <div className="preview-message">
                            {form.welcome_message ||
                                'Mensagem de boas-vindas aparecerá aqui...'}
                        </div>

                        <div className="preview-info">
                            📍{' '}
                            {form.location ||
                                'Localização'}
                        </div>

                        <div className="preview-info">
                            📞{' '}
                            {form.phone ||
                                'Telefone'}
                        </div>

                        <div className="preview-info">
                            🏢{' '}
                            {form.business_type === 'restaurant'
                                ? 'Restaurante'
                                : form.business_type === 'service'
                                    ? 'Prestação de serviços'
                                    : form.business_type === 'shop'
                                        ? 'Loja'
                                        : 'Outro'}
                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Empresa;
