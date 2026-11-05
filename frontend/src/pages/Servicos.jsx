import { useEffect, useState } from 'react';

import { getCurrentProfile } from '../services/authService';

import {
    getServices,
    createService,
    updateService,
    deleteService
} from '../services/serviceService';

import './Servicos.css';


function Servicos() {

    const [profile, setProfile] = useState(null);
    const [services, setServices] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState('');

    const [showForm, setShowForm] =
        useState(false);

    const [editingService, setEditingService] =
        useState(null);


    const [form, setForm] = useState({
        name: '',
        description: '',
        price: '',
        price_type: 'fixed',
        available: true
    });


    useEffect(() => {
        loadServices();
    }, []);


    async function loadServices() {

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


            const data =
                await getServices(
                    currentProfile.company_id
                );


            setServices(data);

        } catch (err) {

            console.error(err);

            setError(
                'Não foi possível carregar os serviços.'
            );

        } finally {

            setLoading(false);
        }
    }


    function openCreateForm() {

        setEditingService(null);

        setForm({
            name: '',
            description: '',
            price: '',
            price_type: 'fixed',
            available: true
        });

        setShowForm(true);
    }


    function openEditForm(service) {

        setEditingService(service);

        setForm({
            name: service.name || '',
            description: service.description || '',
            price:
                service.price !== null
                    ? service.price
                    : '',
            price_type:
                service.price_type || 'fixed',
            available:
                service.available
        });

        setShowForm(true);
    }


    function closeForm() {

        setShowForm(false);
        setEditingService(null);

        setForm({
            name: '',
            description: '',
            price: '',
            price_type: 'fixed',
            available: true
        });
    }


    function handleChange(event) {

        const {
            name,
            value,
            type,
            checked
        } = event.target;


        setForm((current) => ({
            ...current,

            [name]:
                type === 'checkbox'
                    ? checked
                    : value
        }));
    }


    async function handleSubmit(event) {

        event.preventDefault();


        if (!form.name.trim()) {

            alert(
                'Digite o nome do serviço.'
            );

            return;
        }


        if (
            form.price !== '' &&
            Number(form.price) < 0
        ) {

            alert(
                'Digite um preço válido.'
            );

            return;
        }


        if (
            form.price_type !== 'quote' &&
            form.price === ''
        ) {

            alert(
                'Digite o preço do serviço.'
            );

            return;
        }


        if (!profile) {
            return;
        }


        try {

            setSaving(true);


            if (editingService) {

                const updated =
                    await updateService(
                        editingService.id,
                        form
                    );


                setServices((current) =>
                    current.map((service) =>
                        service.id === updated.id
                            ? updated
                            : service
                    )
                );

            } else {

                const created =
                    await createService(
                        profile.company_id,
                        form
                    );


                setServices((current) =>
                    [...current, created].sort(
                        (a, b) =>
                            a.name.localeCompare(
                                b.name
                            )
                    )
                );
            }


            closeForm();

        } catch (err) {

            console.error(err);

            alert(
                'Não foi possível guardar o serviço.'
            );

        } finally {

            setSaving(false);
        }
    }


    async function handleDelete(service) {

        const confirmed =
            window.confirm(
                `Tem certeza que deseja eliminar "${service.name}"?`
            );


        if (!confirmed) {
            return;
        }


        try {

            await deleteService(
                service.id
            );


            setServices((current) =>
                current.filter(
                    (item) =>
                        item.id !== service.id
                )
            );

        } catch (err) {

            console.error(err);

            alert(
                'Não foi possível eliminar o serviço.'
            );
        }
    }


    async function toggleAvailability(service) {

        try {

            const updated =
                await updateService(
                    service.id,
                    {
                        name: service.name,
                        description:
                            service.description,
                        price:
                            service.price,
                        price_type:
                            service.price_type,
                        available:
                            !service.available
                    }
                );


            setServices((current) =>
                current.map((item) =>
                    item.id === updated.id
                        ? updated
                        : item
                )
            );

        } catch (err) {

            console.error(err);

            alert(
                'Não foi possível alterar a disponibilidade.'
            );
        }
    }


    function formatPrice(service) {

        if (
            service.price_type === 'quote' ||
            service.price === null
        ) {

            return 'Sob orçamento';
        }


        const price =
            Number(service.price)
                .toLocaleString('pt-MZ');


        if (
            service.price_type === 'from'
        ) {

            return `A partir de ${price} MT`;
        }


        return `${price} MT`;
    }


    if (loading) {

        return (
            <div className="services-loading">
                Carregando serviços...
            </div>
        );
    }


    return (

        <div className="services-page">

            <div className="services-header">

                <div>

                    <h2 className="services-title">
                        🌿 Serviços
                    </h2>

                    <p className="services-subtitle">
                        Gerencie os serviços que o seu
                        bot pode apresentar e solicitar.
                    </p>

                </div>


                <button
                    className="btn-primary"
                    onClick={openCreateForm}
                >
                    + Adicionar serviço
                </button>

            </div>


            {error && (

                <div className="services-error">
                    {error}
                </div>

            )}


            <div className="services-stats">

                <div className="stat-card">

                    <span className="stat-icon">
                        🌿
                    </span>

                    <div>

                        <p className="stat-label">
                            Total de serviços
                        </p>

                        <strong className="stat-value">
                            {services.length}
                        </strong>

                    </div>

                </div>


                <div className="stat-card">

                    <span className="stat-icon">
                        🟢
                    </span>

                    <div>

                        <p className="stat-label">
                            Disponíveis
                        </p>

                        <strong className="stat-value">
                            {
                                services.filter(
                                    (service) =>
                                        service.available
                                ).length
                            }
                        </strong>

                    </div>

                </div>


                <div className="stat-card">

                    <span className="stat-icon">
                        🔴
                    </span>

                    <div>

                        <p className="stat-label">
                            Indisponíveis
                        </p>

                        <strong className="stat-value">
                            {
                                services.filter(
                                    (service) =>
                                        !service.available
                                ).length
                            }
                        </strong>

                    </div>

                </div>

            </div>


            <div className="services-panel">

                <div className="services-panel-header">

                    <h3>
                        Lista de serviços
                    </h3>

                    <span className="services-count">
                        {services.length} serviço(s)
                    </span>

                </div>


                {services.length === 0 ? (

                    <div className="services-empty">

                        <div className="empty-icon">
                            🌿
                        </div>

                        <h3>
                            Ainda não existem serviços
                        </h3>

                        <p>
                            Adicione o primeiro serviço
                            da sua empresa.
                        </p>

                        <button
                            className="btn-primary"
                            onClick={openCreateForm}
                        >
                            + Adicionar serviço
                        </button>

                    </div>

                ) : (

                    <div className="services-table-wrapper">

                        <table className="services-table">

                            <thead>

                                <tr>

                                    <th>
                                        Serviço
                                    </th>

                                    <th>
                                        Preço
                                    </th>

                                    <th>
                                        Disponibilidade
                                    </th>

                                    <th>
                                        Ações
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {services.map(
                                    (service) => (

                                        <tr
                                            key={
                                                service.id
                                            }
                                        >

                                            <td>

                                                <strong>
                                                    {
                                                        service.name
                                                    }
                                                </strong>

                                                {service.description && (

                                                    <small className="service-description">
                                                        {
                                                            service.description
                                                        }
                                                    </small>

                                                )}

                                            </td>


                                            <td>

                                                {formatPrice(
                                                    service
                                                )}

                                            </td>


                                            <td>

                                                <button
                                                    onClick={() =>
                                                        toggleAvailability(
                                                            service
                                                        )
                                                    }
                                                    className={`availability-badge ${
                                                        service.available
                                                            ? 'available'
                                                            : 'unavailable'
                                                    }`}
                                                >

                                                    {service.available
                                                        ? '● Disponível'
                                                        : '● Indisponível'}

                                                </button>

                                            </td>


                                            <td>

                                                <div className="service-actions">

                                                    <button
                                                        className="btn-edit"
                                                        onClick={() =>
                                                            openEditForm(
                                                                service
                                                            )
                                                        }
                                                    >
                                                        ✏️ Editar
                                                    </button>


                                                    <button
                                                        className="btn-delete"
                                                        onClick={() =>
                                                            handleDelete(
                                                                service
                                                            )
                                                        }
                                                    >
                                                        🗑️
                                                    </button>

                                                </div>

                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>


            {showForm && (

                <div className="modal-overlay">

                    <div className="service-modal">

                        <div className="modal-header">

                            <div>

                                <h3>
                                    {editingService
                                        ? 'Editar serviço'
                                        : 'Novo serviço'}
                                </h3>

                                <p>
                                    Preencha as informações
                                    abaixo.
                                </p>

                            </div>


                            <button
                                className="modal-close"
                                onClick={closeForm}
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={handleSubmit}
                        >

                            <label>
                                Nome do serviço
                            </label>

                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Ex: Corte de relva"
                            />


                            <label>
                                Descrição
                            </label>

                            <textarea
                                name="description"
                                value={
                                    form.description
                                }
                                onChange={handleChange}
                                placeholder="Ex: Corte e limpeza da relva do jardim."
                                rows="4"
                            />


                            <label>
                                Tipo de preço
                            </label>

                            <select
                                name="price_type"
                                value={
                                    form.price_type
                                }
                                onChange={handleChange}
                            >

                                <option value="fixed">
                                    Preço fixo
                                </option>

                                <option value="from">
                                    A partir de
                                </option>

                                <option value="quote">
                                    Sob orçamento
                                </option>

                            </select>


                            {form.price_type !== 'quote' && (

                                <>
                                    <label>
                                        Preço
                                    </label>

                                    <div className="price-input">

                                        <input
                                            type="number"
                                            name="price"
                                            value={
                                                form.price
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="1500"
                                            min="0"
                                            step="1"
                                        />

                                        <span>
                                            MT
                                        </span>

                                    </div>

                                </>

                            )}


                            <label className="checkbox-label">

                                <input
                                    type="checkbox"
                                    name="available"
                                    checked={
                                        form.available
                                    }
                                    onChange={
                                        handleChange
                                    }
                                />

                                Serviço disponível

                            </label>


                            <div className="form-actions">

                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={closeForm}
                                >
                                    Cancelar
                                </button>


                                <button
                                    type="submit"
                                    className="btn-save"
                                    disabled={saving}
                                >

                                    {saving
                                        ? 'Salvando...'
                                        : editingService
                                            ? 'Salvar alterações'
                                            : 'Adicionar serviço'}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}


export default Servicos;