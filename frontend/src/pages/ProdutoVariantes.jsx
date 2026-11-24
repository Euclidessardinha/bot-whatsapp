
import { useEffect, useState } from 'react';

import {
    getProductVariants,
    createProductVariant,
    updateProductVariant,
    deleteProductVariant,
    getVariantAttributes,
    createVariantAttribute,
    updateVariantAttribute,
    deleteVariantAttribute
} from '../services/productVariantService';

import './ProdutoVariantes.css';

function ProdutoVariantes({
    companyId,
    product,
    onClose
}) {
    // =========================================================
    // ESTADO
    // =========================================================

    const [variants, setVariants] = useState([]);
    const [attributes, setAttributes] = useState({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [showVariantForm, setShowVariantForm] =
        useState(false);

    const [editingVariant, setEditingVariant] =
        useState(null);

    const [variantForm, setVariantForm] = useState({
        sku: '',
        price: '',
        stock: '',
        available: true
    });

    const [attributeForms, setAttributeForms] =
        useState({});


    // =========================================================
    // CARREGAR DADOS
    // =========================================================

    useEffect(() => {
        loadVariants();
    }, [companyId, product.id]);


    async function loadVariants() {
        try {
            setLoading(true);
            setError('');

            const data = await getProductVariants(
                companyId,
                product.id
            );

            const loadedVariants =
                Array.isArray(data) ? data : [];

            setVariants(loadedVariants);

            // Carregar atributos de cada variante
            for (const variant of loadedVariants) {
                await loadAttributes(variant.id);
            }
        } catch (err) {
            console.error(err);

            setError(
                'Não foi possível carregar as variantes.'
            );
        } finally {
            setLoading(false);
        }
    }


    async function loadAttributes(variantId) {
        try {
            const data = await getVariantAttributes(
                companyId,
                variantId
            );

            setAttributes((current) => ({
                ...current,
                [variantId]:
                    Array.isArray(data) ? data : []
            }));
        } catch (err) {
            console.error(
                `Erro ao carregar atributos da variante ${variantId}:`,
                err
            );

            setAttributes((current) => ({
                ...current,
                [variantId]: []
            }));
        }
    }


    // =========================================================
    // FORMULÁRIO DE VARIANTE
    // =========================================================

    function openCreateVariant() {
        setEditingVariant(null);

        setVariantForm({
            sku: '',
            price: product.price ?? '',
            stock: '',
            available: true
        });

        setShowVariantForm(true);
    }


    function openEditVariant(variant) {
        setEditingVariant(variant);

        setVariantForm({
            sku: variant.sku || '',
            price: variant.price ?? '',
            stock: variant.stock ?? '',
            available: variant.available !== false
        });

        setShowVariantForm(true);
    }


    function closeVariantForm() {
        setShowVariantForm(false);
        setEditingVariant(null);

        setVariantForm({
            sku: '',
            price: '',
            stock: '',
            available: true
        });
    }


    function handleVariantChange(event) {
        const {
            name,
            value,
            type,
            checked
        } = event.target;

        setVariantForm((current) => ({
            ...current,
            [name]:
                type === 'checkbox'
                    ? checked
                    : value
        }));
    }


    async function saveVariant(event) {
        event.preventDefault();

        const price = Number(variantForm.price);
        const stock = Number(variantForm.stock);

        // Preço obrigatório
        if (
            variantForm.price === '' ||
            Number.isNaN(price) ||
            price < 0
        ) {
            alert('Digite um preço válido.');
            return;
        }

        // Stock obrigatório
        if (
            variantForm.stock === '' ||
            Number.isNaN(stock) ||
            stock < 0
        ) {
            alert('Digite um stock válido.');
            return;
        }

        try {
            setSaving(true);

            const data = {
                sku: variantForm.sku.trim(),
                price,
                stock,
                available: variantForm.available
            };

            // Editar variante existente
            if (editingVariant) {
                const updated =
                    await updateProductVariant(
                        companyId,
                        editingVariant.id,
                        data
                    );

                setVariants((current) =>
                    current.map((variant) =>
                        variant.id === updated.id
                            ? updated
                            : variant
                    )
                );
            }

            // Criar nova variante
            else {
                const created =
                    await createProductVariant(
                        companyId,
                        product.id,
                        data
                    );

                setVariants((current) => [
                    ...current,
                    created
                ]);

                setAttributes((current) => ({
                    ...current,
                    [created.id]: []
                }));
            }

            closeVariantForm();
        } catch (err) {
            console.error(err);

            alert(
                err?.message ||
                'Não foi possível guardar a variante.'
            );
        } finally {
            setSaving(false);
        }
    }


    // =========================================================
    // ELIMINAR VARIANTE
    // =========================================================

    async function handleDeleteVariant(variant) {
        const variantName =
            variant.sku || 'esta variante';

        const confirmed = window.confirm(
            `Tem certeza que deseja eliminar "${variantName}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            await deleteProductVariant(
                companyId,
                variant.id
            );

            setVariants((current) =>
                current.filter(
                    (item) =>
                        item.id !== variant.id
                )
            );

            setAttributes((current) => {
                const next = {
                    ...current
                };

                delete next[variant.id];

                return next;
            });

            setAttributeForms((current) => {
                const next = {
                    ...current
                };

                delete next[variant.id];

                return next;
            });
        } catch (err) {
            console.error(err);

            alert(
                err?.message ||
                'Não foi possível eliminar a variante.'
            );
        }
    }


    // =========================================================
    // ATRIBUTOS
    // =========================================================

    function getAttributeForm(variantId) {
        return (
            attributeForms[variantId] || {
                name: '',
                value: ''
            }
        );
    }


    function updateAttributeForm(
        variantId,
        field,
        value
    ) {
        setAttributeForms((current) => ({
            ...current,
            [variantId]: {
                ...(current[variantId] || {}),
                [field]: value
            }
        }));
    }


    async function addAttribute(variantId) {
        const form =
            getAttributeForm(variantId);

        const name = form.name?.trim();
        const value = form.value?.trim();

        if (!name) {
            alert('Digite o nome do atributo.');
            return;
        }

        if (!value) {
            alert('Digite o valor do atributo.');
            return;
        }

        try {
            const created =
                await createVariantAttribute(
                    companyId,
                    variantId,
                    {
                        name,
                        value
                    }
                );

            setAttributes((current) => ({
                ...current,
                [variantId]: [
                    ...(current[variantId] || []),
                    created
                ]
            }));

            setAttributeForms((current) => ({
                ...current,
                [variantId]: {
                    name: '',
                    value: ''
                }
            }));
        } catch (err) {
            console.error(err);

            alert(
                err?.message ||
                'Não foi possível adicionar o atributo.'
            );
        }
    }


    async function editAttribute(
        variantId,
        attribute
    ) {
        const name = window.prompt(
            'Nome do atributo:',
            attribute.name
        );

        if (name === null) {
            return;
        }

        const value = window.prompt(
            'Valor do atributo:',
            attribute.value
        );

        if (value === null) {
            return;
        }

        const cleanName = name.trim();
        const cleanValue = value.trim();

        if (!cleanName || !cleanValue) {
            alert(
                'Nome e valor são obrigatórios.'
            );
            return;
        }

        try {
            const updated =
                await updateVariantAttribute(
                    companyId,
                    attribute.id,
                    {
                        name: cleanName,
                        value: cleanValue
                    }
                );

            setAttributes((current) => ({
                ...current,
                [variantId]:
                    (current[variantId] || []).map(
                        (item) =>
                            item.id === updated.id
                                ? updated
                                : item
                    )
            }));
        } catch (err) {
            console.error(err);

            alert(
                err?.message ||
                'Não foi possível atualizar o atributo.'
            );
        }
    }


    async function removeAttribute(
        variantId,
        attribute
    ) {
        const confirmed = window.confirm(
            `Eliminar "${attribute.name}: ${attribute.value}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            await deleteVariantAttribute(
                companyId,
                attribute.id
            );

            setAttributes((current) => ({
                ...current,
                [variantId]:
                    (current[variantId] || []).filter(
                        (item) =>
                            item.id !== attribute.id
                    )
            }));
        } catch (err) {
            console.error(err);

            alert(
                err?.message ||
                'Não foi possível eliminar o atributo.'
            );
        }
    }


    // =========================================================
    // INTERFACE
    // =========================================================

    return (
        <div className="variants-overlay">

            <div className="variants-modal">

                {/* CABEÇALHO */}
                <div className="variants-header">

                    <div>
                        <h3>
                            Variantes
                        </h3>

                        <p>
                            {product.name}
                        </p>

                        <small>
                            Opcional — use variantes apenas
                            quando este produto tiver
                            diferentes versões, tamanhos,
                            cores ou modelos.
                        </small>
                    </div>

                    <button
                        type="button"
                        className="variants-close"
                        onClick={onClose}
                        aria-label="Fechar"
                    >
                        ×
                    </button>

                </div>


                {/* ERRO */}
                {error && (
                    <div className="variants-error">
                        {error}
                    </div>
                )}


                {/* BARRA DE AÇÕES */}
                <div className="variants-toolbar">

                    <div>
                        <strong>
                            {variants.length}
                        </strong>{' '}
                        {variants.length === 1
                            ? 'variante'
                            : 'variantes'}
                    </div>

                    <button
                        type="button"
                        className="btn-primary"
                        onClick={openCreateVariant}
                    >
                        + Nova variante
                    </button>

                </div>


                {/* FORMULÁRIO DE VARIANTE */}
                {showVariantForm && (
                    <div className="variant-form-card">

                        <div className="variant-form-header">

                            <div>
                                <h4>
                                    {editingVariant
                                        ? 'Editar variante'
                                        : 'Nova variante'}
                                </h4>

                                <p>
                                    Defina preço, stock e
                                    disponibilidade desta
                                    versão do produto.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeVariantForm}
                                aria-label="Fechar formulário"
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={saveVariant}
                        >

                            <div className="form-group">

                                <label htmlFor="variant-sku">
                                    SKU
                                </label>

                                <input
                                    id="variant-sku"
                                    type="text"
                                    name="sku"
                                    value={
                                        variantForm.sku
                                    }
                                    onChange={
                                        handleVariantChange
                                    }
                                    placeholder="Ex: CAM-PRE-M"
                                />

                                <small>
                                    Opcional. Use um código
                                    para identificar esta
                                    variante.
                                </small>

                            </div>


                            <div className="variant-form-grid">

                                <div className="form-group">

                                    <label htmlFor="variant-price">
                                        Preço
                                    </label>

                                    <input
                                        id="variant-price"
                                        type="number"
                                        name="price"
                                        value={
                                            variantForm.price
                                        }
                                        onChange={
                                            handleVariantChange
                                        }
                                        min="0"
                                        step="1"
                                        required
                                    />

                                    <small>
                                        Preço em MT.
                                    </small>

                                </div>


                                <div className="form-group">

                                    <label htmlFor="variant-stock">
                                        Stock
                                    </label>

                                    <input
                                        id="variant-stock"
                                        type="number"
                                        name="stock"
                                        value={
                                            variantForm.stock
                                        }
                                        onChange={
                                            handleVariantChange
                                        }
                                        min="0"
                                        step="1"
                                        required
                                    />

                                    <small>
                                        Quantidade disponível.
                                    </small>

                                </div>

                            </div>


                            <label className="variant-checkbox">

                                <input
                                    type="checkbox"
                                    name="available"
                                    checked={
                                        variantForm.available
                                    }
                                    onChange={
                                        handleVariantChange
                                    }
                                />

                                <span>
                                    Variante disponível
                                </span>

                            </label>


                            <div className="variant-form-actions">

                                <button
                                    type="button"
                                    onClick={closeVariantForm}
                                    disabled={saving}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                >
                                    {saving
                                        ? 'Guardando...'
                                        : editingVariant
                                            ? 'Guardar alterações'
                                            : 'Criar variante'}
                                </button>

                            </div>

                        </form>

                    </div>
                )}


                {/* CONTEÚDO */}
                {loading ? (

                    <div className="variants-loading">
                        Carregando variantes...
                    </div>

                ) : variants.length === 0 ? (

                    <div className="variants-empty">

                        <div className="variants-empty-icon">
                            ⚙️
                        </div>

                        <h4>
                            Este produto não possui variantes
                        </h4>

                        <p>
                            Tudo bem. Variantes são opcionais.
                            O produto continuará funcionando
                            normalmente sem elas.
                        </p>

                        <p>
                            Use esta funcionalidade quando
                            precisar de tamanhos, cores,
                            modelos ou outras versões.
                        </p>

                        <button
                            type="button"
                            className="btn-primary"
                            onClick={openCreateVariant}
                        >
                            + Criar primeira variante
                        </button>

                    </div>

                ) : (

                    <div className="variants-list">

                        {variants.map((variant) => {

                            const variantAttributes =
                                attributes[
                                    variant.id
                                ] || [];

                            const attrForm =
                                getAttributeForm(
                                    variant.id
                                );

                            return (
                                <div
                                    className="variant-card"
                                    key={variant.id}
                                >

                                    {/* CABEÇALHO DA VARIANTE */}
                                    <div className="variant-card-header">

                                        <div className="variant-title">

                                            <div>
                                                <strong>
                                                    {variant.sku ||
                                                        'Sem SKU'}
                                                </strong>

                                                {!variant.sku && (
                                                    <small>
                                                        SKU opcional
                                                    </small>
                                                )}
                                            </div>

                                            <span
                                                className={
                                                    variant.available
                                                        ? 'variant-status available'
                                                        : 'variant-status unavailable'
                                                }
                                            >
                                                {variant.available
                                                    ? 'Disponível'
                                                    : 'Indisponível'}
                                            </span>

                                        </div>


                                        <div className="variant-actions">

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openEditVariant(
                                                        variant
                                                    )
                                                }
                                                aria-label="Editar variante"
                                            >
                                                ✏️
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDeleteVariant(
                                                        variant
                                                    )
                                                }
                                                aria-label="Eliminar variante"
                                            >
                                                🗑️
                                            </button>

                                        </div>

                                    </div>


                                    {/* INFORMAÇÕES DA VARIANTE */}
                                    <div className="variant-info">

                                        <div>
                                            <span>
                                                Preço
                                            </span>

                                            <strong>
                                                {Number(
                                                    variant.price
                                                ).toLocaleString(
                                                    'pt-MZ'
                                                )}{' '}
                                                MT
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Stock
                                            </span>

                                            <strong>
                                                {variant.stock}
                                            </strong>
                                        </div>

                                    </div>


                                    {/* ATRIBUTOS */}
                                    <div className="attributes-section">

                                        <div className="attributes-header">

                                            <div>
                                                <h4>
                                                    Atributos
                                                </h4>

                                                <small>
                                                    Cor, tamanho,
                                                    modelo, etc.
                                                </small>
                                            </div>

                                        </div>


                                        {variantAttributes.length >
                                        0 ? (

                                            <div className="attributes-list">

                                                {variantAttributes.map(
                                                    (attribute) => (
                                                        <div
                                                            className="attribute-row"
                                                            key={
                                                                attribute.id
                                                            }
                                                        >

                                                            <span>
                                                                <strong>
                                                                    {
                                                                        attribute.name
                                                                    }
                                                                </strong>

                                                                :{' '}

                                                                {
                                                                    attribute.value
                                                                }
                                                            </span>

                                                            <div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        editAttribute(
                                                                            variant.id,
                                                                            attribute
                                                                        )
                                                                    }
                                                                    aria-label="Editar atributo"
                                                                >
                                                                    ✏️
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removeAttribute(
                                                                            variant.id,
                                                                            attribute
                                                                        )
                                                                    }
                                                                    aria-label="Eliminar atributo"
                                                                >
                                                                    🗑️
                                                                </button>

                                                            </div>

                                                        </div>
                                                    )
                                                )}

                                            </div>

                                        ) : (

                                            <p className="no-attributes">
                                                Ainda não existem
                                                atributos nesta
                                                variante.
                                            </p>

                                        )}


                                        {/* ADICIONAR ATRIBUTO */}
                                        <div className="attribute-form">

                                            <input
                                                type="text"
                                                placeholder="Nome: cor"
                                                value={
                                                    attrForm.name
                                                }
                                                onChange={(event) =>
                                                    updateAttributeForm(
                                                        variant.id,
                                                        'name',
                                                        event.target.value
                                                    )
                                                }
                                            />

                                            <input
                                                type="text"
                                                placeholder="Valor: Preto"
                                                value={
                                                    attrForm.value
                                                }
                                                onChange={(event) =>
                                                    updateAttributeForm(
                                                        variant.id,
                                                        'value',
                                                        event.target.value
                                                    )
                                                }
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    addAttribute(
                                                        variant.id
                                                    )
                                                }
                                            >
                                                + Atributo
                                            </button>

                                        </div>

                                    </div>

                                </div>
                            );
                        })}

                    </div>

                )}

            </div>

        </div>
    );
}

export default ProdutoVariantes;
