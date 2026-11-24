import { useEffect, useState } from 'react';

import { getCurrentProfile } from '../services/authService';

import ProdutoVariantes from './ProdutoVariantes';

import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct
} from '../services/productService';

import {
    uploadProductImage,
    deleteCompanyImage,
    getProductImagePath
} from '../services/storageService';

import './Produtos.css';

function Produtos() {
    const [profile, setProfile] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [variantProduct, setVariantProduct] =
    useState(null);

    const [form, setForm] = useState({
    name: '',
    price: '',
    available: true
});

const [imageFile, setImageFile] =
    useState(null);

const [removeImage, setRemoveImage] =
    useState(false);

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
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
                await getProducts(
                    currentProfile.company_id
                );

            setProducts(
                Array.isArray(data)
                    ? data
                    : []
            );
        } catch (err) {
            console.error(err);

            setError(
                'Não foi possível carregar os produtos.'
            );

            setProducts([]);
        } finally {
            setLoading(false);
        }
    }

    function openCreateForm() {
    setEditingProduct(null);

    setForm({
        name: '',
        price: '',
        available: true
    });

    setImageFile(null);
    setRemoveImage(false);

    setShowForm(true);
}

    function openEditForm(product) {
    setEditingProduct(product);

    setForm({
        name: product.name,
        price: product.price,
        available: product.available
    });

    setImageFile(null);
    setRemoveImage(false);

    setShowForm(true);
}

    function closeForm() {
    setShowForm(false);
    setEditingProduct(null);

    setForm({
        name: '',
        price: '',
        available: true
    });

    setImageFile(null);
    setRemoveImage(false);
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
        alert('Digite o nome do produto.');
        return;
    }

    if (
        form.price === '' ||
        Number(form.price) < 0
    ) {
        alert('Digite um preço válido.');
        return;
    }

    if (!profile) {
        return;
    }

    try {
        setSaving(true);

        if (editingProduct) {
            let imageUrl =
                editingProduct.image_url || null;

            const oldImagePath =
                getProductImagePath(
                    profile.company_id,
                    editingProduct.id
                );

            if (imageFile) {
                const uploaded =
                    await uploadProductImage(
                        profile.company_id,
                        editingProduct.id,
                        imageFile
                    );

                imageUrl =
                    uploaded.url;
            } else if (removeImage) {
                imageUrl = null;
            }

            const updated =
                await updateProduct(
                    profile.company_id,
                    editingProduct.id,
                    {
                        ...form,
                        image_url: imageUrl
                    }
                );

            if (
                removeImage ||
                imageFile
            ) {
                try {
                    await deleteCompanyImage(
                        oldImagePath
                    );
                } catch (storageError) {
                    console.warn(
                        'Não foi possível remover a imagem anterior:',
                        storageError
                    );
                }
            }

            setProducts((current) =>
                current.map((product) =>
                    product.id === updated.id
                        ? updated
                        : product
                )
            );
        } else {
            const created =
                await createProduct(
                    profile.company_id,
                    form
                );

            let finalProduct =
                created;

            if (imageFile) {
                const uploaded =
                    await uploadProductImage(
                        profile.company_id,
                        created.id,
                        imageFile
                    );

                finalProduct =
                    await updateProduct(
                        profile.company_id,
                        created.id,
                        {
                            ...form,
                            image_url:
                                uploaded.url
                        }
                    );
            }

            setProducts((current) =>
                [...current, finalProduct].sort(
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
            'Não foi possível guardar o produto.'
        );
    } finally {
        setSaving(false);
    }
}

    async function handleDelete(product) {
        const confirmed =
            window.confirm(
                `Tem certeza que deseja eliminar "${product.name}"?`
            );

        if (!confirmed) {
            return;
        }

        try {
            await deleteProduct(profile.company_id, product.id);

            setProducts((current) =>
                current.filter(
                    (item) =>
                        item.id !== product.id
                )
            );
        } catch (err) {
            console.error(err);

            alert(
                'Não foi possível eliminar o produto.'
            );
        }
    }

    async function toggleAvailability(product) {
        try {
            const updated =
                await updateProduct(
                    profile.company_id,
                    product.id,
                    {
                        name: product.name,
                        price: product.price,
                        available:
                            !product.available
                    }
                );

            setProducts((current) =>
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

    function openVariants(product) {
    setVariantProduct(product);
}

    const totalProducts =
        products.length;

    const availableProducts =
        products.filter(
            (product) =>
                product.available === true
        ).length;

    const unavailableProducts =
        products.filter(
            (product) =>
                product.available !== true
        ).length;

    if (loading) {
        return (
            <div className="products-loading">
                Carregando produtos...
            </div>
        );
    }

    return (
        <div className="products-page">

            {/* =====================================================
                HEADER
            ===================================================== */}

            <div className="products-header">

                <div>
                    <h2 className="products-title">
                        🍔 Produtos
                    </h2>

                    <p className="products-subtitle">
                        Gerencie os produtos que o seu bot pode apresentar e vender.
                    </p>
                </div>

                <button
                    className="btn-primary"
                    onClick={openCreateForm}
                >
                    + Adicionar produto
                </button>

            </div>


            {/* =====================================================
                ERROR
            ===================================================== */}

            {error && (
                <div className="products-error">
                    {error}
                </div>
            )}


            {/* =====================================================
                STATS
            ===================================================== */}

            <div className="products-stats">

                {/* TOTAL */}

                <div className="stat-card">

                    <span className="stat-icon">
                        🍔
                    </span>

                    <div className="stat-content">

                        <p className="stat-label">
                            Total de produtos
                        </p>

                        <span className="stat-number">
                            {totalProducts}
                        </span>

                    </div>

                </div>


                {/* DISPONÍVEIS */}

                <div className="stat-card">

                    <span className="stat-icon">
                        🟢
                    </span>

                    <div className="stat-content">

                        <p className="stat-label">
                            Disponíveis
                        </p>

                        <strong className="stat-value">
                            {availableProducts}
                        </strong>

                    </div>

                </div>


                {/* INDISPONÍVEIS */}

                <div className="stat-card">

                    <span className="stat-icon">
                        🔴
                    </span>

                    <div className="stat-content">

                        <p className="stat-label">
                            Indisponíveis
                        </p>

                        <strong className="stat-value">
                            {unavailableProducts}
                        </strong>

                    </div>

                </div>

            </div>


            {/* =====================================================
                PRODUCTS PANEL
            ===================================================== */}

            <div className="products-panel">

                <div className="products-panel-header">

                    <h3>
                        Lista de produtos
                    </h3>

                    <span className="products-count">
                        {totalProducts} produto(s)
                    </span>

                </div>


                {products.length === 0 ? (

                    <div className="products-empty">

                        <div className="empty-icon">
                            🍔
                        </div>

                        <h3>
                            Ainda não existem produtos
                        </h3>

                        <p>
                            Adicione o primeiro produto da sua empresa.
                        </p>

                        <button
                            className="btn-primary"
                            onClick={openCreateForm}
                        >
                            + Adicionar produto
                        </button>

                    </div>

                ) : (

                    <div className="products-table-wrapper">

                        <table className="products-table">

                            <thead>

                                <tr>

                                    <th>
                                        Produto
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

                                {products.map(
                                    (product) => (

                                        <tr
                                            key={product.id}
                                        >

                                            <td>
                                                <strong>
                                                    {product.name}
                                                </strong>
                                            </td>

                                            <td>
                                                {Number(
                                                    product.price
                                                ).toLocaleString(
                                                    'pt-MZ'
                                                )}{' '}
                                                MT
                                            </td>

                                            <td>

                                                <button
                                                    onClick={() =>
                                                        toggleAvailability(
                                                            product
                                                        )
                                                    }
                                                    className={`availability-badge ${
                                                        product.available
                                                            ? 'available'
                                                            : 'unavailable'
                                                    }`}
                                                >
                                                    {product.available
                                                        ? '● Disponível'
                                                        : '● Indisponível'}
                                                </button>

                                            </td>

                                            <td>

                                                <div className="product-actions">

                                                    <button
                                                        className="btn-edit"
                                                        onClick={() =>
                                                            openVariants(product)
                                                        }
                                                    >
                                                        ⚙️ Variantes
                                                    </button>

                                                    <button
                                                        className="btn-edit"
                                                        onClick={() =>
                                                            openEditForm(
                                                                product
                                                            )
                                                        }
                                                    >
                                                        ✏️ Editar
                                                    </button>

                                                    <button
                                                        className="btn-delete"
                                                        onClick={() =>
                                                            handleDelete(
                                                                product
                                                            )
                                                        }
                                                        aria-label={`Apagar ${product.name}`}
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


            {/* =====================================================
                MODAL
            ===================================================== */}

            {showForm && (

                <div className="modal-overlay">

                    <div className="product-modal">

                        <div className="modal-header">

                            <div>

                                <h3>
                                    {editingProduct
                                        ? 'Editar produto'
                                        : 'Novo produto'}
                                </h3>

                                <p>
                                    Preencha as informações abaixo.
                                </p>

                            </div>

                            <button
                                className="modal-close"
                                onClick={closeForm}
                                type="button"
                                aria-label="Fechar"
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={handleSubmit}
                        >

                            <label>
                                Nome do produto
                            </label>

                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Ex: Classic Burger"
                            />


                            <label>
                                Preço
                            </label>

                            <div className="price-input">

                                <input
                                    type="number"
                                    name="price"
                                    value={form.price}
                                    onChange={handleChange}
                                    placeholder="350"
                                    min="0"
                                    step="1"
                                />

                                <span>
                                    MT
                                </span>

                            </div>

                            <label>
    Imagem do produto
</label>

<input
    type="file"
    accept="image/*"
    onChange={handleImageChange}
/>

{imageFile && (
    <p>
        Nova imagem selecionada: {imageFile.name}
    </p>
)}

{editingProduct?.image_url &&
    !removeImage &&
    !imageFile && (
        <div>
            <img
                src={editingProduct.image_url}
                alt={editingProduct.name}
                style={{
                    maxWidth: '180px',
                    maxHeight: '180px',
                    objectFit: 'cover'
                }}
            />

            <button
                type="button"
                onClick={handleRemoveImage}
            >
                Remover imagem
            </button>
        </div>
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

                                Produto disponível

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
                                        : editingProduct
                                            ? 'Salvar alterações'
                                            : 'Adicionar produto'}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

            {variantProduct && profile && (
    <ProdutoVariantes
        companyId={profile.company_id}
        product={variantProduct}
        onClose={() =>
            setVariantProduct(null)
        }
    />
)}

        </div>
    );
}

export default Produtos;