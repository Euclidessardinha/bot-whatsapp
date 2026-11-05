import { useEffect, useState } from 'react';

import { getCurrentProfile } from '../services/authService';

import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct
} from '../services/productService';

import './Produtos.css';

function Produtos() {
    const [profile, setProfile] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const [form, setForm] = useState({
        name: '',
        price: '',
        available: true
    });

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

            setProducts(data);
        } catch (err) {
            console.error(err);

            setError(
                'Não foi possível carregar os produtos.'
            );
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

        setShowForm(true);
    }

    function openEditForm(product) {
        setEditingProduct(product);

        setForm({
            name: product.name,
            price: product.price,
            available: product.available
        });

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
                const updated =
                    await updateProduct(
                        editingProduct.id,
                        form
                    );

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

                setProducts((current) =>
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
            await deleteProduct(product.id);

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

    if (loading) {
        return (
            <div className="products-loading">
                Carregando produtos...
            </div>
        );
    }

    return (
        <div className="products-page">

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

            {error && (
                <div className="products-error">
                    {error}
                </div>
            )}

            <div className="products-stats">

                <div className="stat-card">
                    <span className="stat-icon">
                        🍔
                    </span>

                    <div>
                        <p className="stat-label">
                            Total de produtos
                        </p>

                        <strong className="stat-value">
                            {products.length}
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
                                products.filter(
                                    (product) =>
                                        product.available
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
                                products.filter(
                                    (product) =>
                                        !product.available
                                ).length
                            }
                        </strong>
                    </div>
                </div>

            </div>

            <div className="products-panel">

                <div className="products-panel-header">
                    <h3>
                        Lista de produtos
                    </h3>

                    <span className="products-count">
                        {products.length} produto(s)
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
                                            key={
                                                product.id
                                            }
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        product.name
                                                    }
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

        </div>
    );
}

export default Produtos;