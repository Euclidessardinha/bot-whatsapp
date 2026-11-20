
import { useEffect, useState } from 'react';

import { getCurrentProfile } from '../services/authService';

import {
    getServices,
    createService,
    updateService,
    deleteService
} from '../services/serviceService';

import {
    uploadServiceImage,
    deleteCompanyImage,
    getServiceImagePath
} from '../services/storageService';

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

    const [imageFile, setImageFile] =
        useState(null);

    const [removeImage, setRemoveImage] =
        useState(false);

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

            setServices(
                Array.isArray(data)
                    ? data
                    : []
            );

        } catch (err) {

            console.error(err);

            setError(
                'Não foi possível carregar os serviços.'
            );

            setServices([]);

        } finally {

            setLoading(false);
        }
    }


    function openCreateForm() {

        setEditingService(null);

        setImageFile(null);
        setRemoveImage(false);

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

        setImageFile(null);
        setRemoveImage(false);

        setForm({
            name: service.name || '',
            description: service.description || '',
            price:
                service.price !== null &&
                service.price !== undefined
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

        setImageFile(null);
        setRemoveImage(false);

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


    function handleImageChange(event) {

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

        setImageFile(file);
        setRemoveImage(false);
    }


    function handleRemoveImage() {

        setImageFile(null);
        setRemoveImage(true);
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

        if (!profile?.company_id) {

            alert(
                'Não foi possível identificar a empresa.'
            );

            return;
        }

        try {

            setSaving(true);


            /*
             * ==========================================
             * EDITAR SERVIÇO
             * ==========================================
             */

            if (editingService) {

                let imageUrl =
                    editingService.image_url ||
                    null;


                /*
                 * Se o utilizador escolheu uma nova imagem,
                 * fazemos upload no mesmo caminho.
                 *
                 * O upsert substitui a imagem anterior.
                 */
                if (imageFile) {

                    const uploaded =
                        await uploadServiceImage(
                            profile.company_id,
                            editingService.id,
                            imageFile
                        );

                    imageUrl =
                        uploaded.url;
                }


                /*
                 * Se o utilizador pediu para remover
                 * a imagem, removemos o ficheiro do Storage.
                 */
                if (removeImage) {

                    const imagePath =
                        getServiceImagePath(
                            profile.company_id,
                            editingService.id
                        );

                    try {

                        await deleteCompanyImage(
                            imagePath
                        );

                    } catch (storageError) {

                        console.warn(
                            'Não foi possível remover a imagem do serviço:',
                            storageError
                        );
                    }

                    imageUrl = null;
                }


                const updated =
                    await updateService(
                        profile.company_id,
                        editingService.id,
                        {
                            ...form,
                            image_url:
                                imageUrl
                        }
                    );


                setServices((current) =>
                    current.map((service) =>
                        service.id === updated.id
                            ? updated
                            : service
                    )
                );


            } else {


                /*
                 * ==========================================
                 * CRIAR SERVIÇO
                 * ==========================================
                 */

                /*
                 * Primeiro criamos o serviço para obter
                 * o ID necessário para o caminho da imagem.
                 */
                const created =
                    await createService(
                        profile.company_id,
                        form
                    );

                let finalService =
                    created;


                /*
                 * Só fazemos upload se o utilizador
                 * realmente selecionou uma imagem.
                 */
                if (imageFile) {

                    const uploaded =
                        await uploadServiceImage(
                            profile.company_id,
                            created.id,
                            imageFile
                        );


                    finalService =
                        await updateService(
                            profile.company_id,
                            created.id,
                            {
                                ...form,
                                image_url:
                                    uploaded.url
                            }
                        );
                }


                setServices((current) =>
                    [...current, finalService].sort(
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
                err?.message ||
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


        if (!profile?.company_id) {

            alert(
                'Não foi possível identificar a empresa.'
            );

            return;
        }


        try {

            /*
             * Primeiro tentamos remover a imagem.
             *
             * Se não existir imagem, não fazemos nada.
             */
            if (service.image_url) {

                const imagePath =
                    getServiceImagePath(
                        profile.company_id,
                        service.id
                    );

                try {

                    await deleteCompanyImage(
                        imagePath
                    );

                } catch (storageError) {

                    console.warn(
                        'Não foi possível remover a imagem do serviço:',
                        storageError
                    );
                }
            }


            /*
             * A eliminação do registro também é protegida
             * pelo company_id.
             */
            await deleteService(
                profile.company_id,
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
                err?.message ||
                'Não foi possível eliminar o serviço.'
            );
        }
    }


    async function toggleAvailability(service) {

        if (!profile?.company_id) {

            alert(
                'Não foi possível identificar a empresa.'
            );

            return;
        }


        try {

            const updated =
                await updateService(
                    profile.company_id,
                    service.id,
                    {
                        name:
                            service.name,

                        description:
                            service.description,

                        price:
                            service.price,

                        price_type:
                            service.price_type,

                        available:
                            !service.available,

                        image_url:
                            service.image_url ||
                            null
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
                err?.message ||
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
                                type="button"
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


                            <label>
                                Imagem do serviço
                            </label>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={
                                    handleImageChange
                                }
                            />


                            {imageFile && (

                                <p>
                                    Nova imagem selecionada:{' '}
                                    {imageFile.name}
                                </p>

                            )}


                            {editingService?.image_url &&
                                !removeImage &&
                                !imageFile && (

                                    <div>

                                        <img
                                            src={
                                                editingService.image_url
                                            }
                                            alt={
                                                editingService.name
                                            }
                                            style={{
                                                maxWidth: '180px',
                                                maxHeight: '180px',
                                                objectFit: 'cover'
                                            }}
                                        />

                                        <button
                                            type="button"
                                            onClick={
                                                handleRemoveImage
                                            }
                                        >
                                            Remover imagem
                                        </button>

                                    </div>

                                )}


                            {removeImage &&
                                !imageFile && (

                                    <p>
                                        A imagem será removida ao guardar.
                                    </p>

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
