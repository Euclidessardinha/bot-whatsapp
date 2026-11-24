import { supabase } from '../lib/supabase';

/**
 * =========================================================
 * VARIANTES
 * =========================================================
 */

export async function getProductVariants(
    companyId,
    productId
) {
    const {
        data,
        error
    } = await supabase
        .from('product_variants')
        .select('*')
        .eq('company_id', companyId)
        .eq('product_id', productId)
        .order('created_at', {
            ascending: true
        });

    if (error) {
        console.error(
            'Erro ao buscar variantes:',
            error
        );

        throw error;
    }

    return data || [];
}


export async function createProductVariant(
    companyId,
    productId,
    variant
) {
    const insertData = {
        company_id: companyId,
        product_id: productId,
        sku: variant.sku || null,
        price: Number(variant.price),
        stock: Number(variant.stock || 0),
        available:
            variant.available !== false
    };

    const {
        data,
        error
    } = await supabase
        .from('product_variants')
        .insert([insertData])
        .select()
        .single();

    if (error) {
        console.error(
            'Erro ao criar variante:',
            error
        );

        throw error;
    }

    return data;
}


export async function updateProductVariant(
    companyId,
    variantId,
    variant
) {
    const updateData = {
        sku: variant.sku || null,
        price: Number(variant.price),
        stock: Number(variant.stock || 0),
        available:
            variant.available !== false
    };

    const {
        data,
        error
    } = await supabase
        .from('product_variants')
        .update(updateData)
        .eq('id', variantId)
        .eq('company_id', companyId)
        .select()
        .single();

    if (error) {
        console.error(
            'Erro ao atualizar variante:',
            error
        );

        throw error;
    }

    return data;
}


export async function deleteProductVariant(
    companyId,
    variantId
) {
    const {
        error
    } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId)
        .eq('company_id', companyId);

    if (error) {
        console.error(
            'Erro ao eliminar variante:',
            error
        );

        throw error;
    }

    return true;
}


/**
 * =========================================================
 * ATRIBUTOS
 * =========================================================
 */

export async function getVariantAttributes(
    companyId,
    variantId
) {
    const {
        data,
        error
    } = await supabase
        .from('product_variant_attributes')
        .select('*')
        .eq('company_id', companyId)
        .eq('variant_id', variantId)
        .order('name', {
            ascending: true
        });

    if (error) {
        console.error(
            'Erro ao buscar atributos:',
            error
        );

        throw error;
    }

    return data || [];
}


export async function createVariantAttribute(
    companyId,
    variantId,
    attribute
) {
    const insertData = {
        company_id: companyId,
        variant_id: variantId,
        name: attribute.name,
        value: attribute.value
    };

    const {
        data,
        error
    } = await supabase
        .from('product_variant_attributes')
        .insert([insertData])
        .select()
        .single();

    if (error) {
        console.error(
            'Erro ao criar atributo:',
            error
        );

        throw error;
    }

    return data;
}


export async function updateVariantAttribute(
    companyId,
    attributeId,
    attribute
) {
    const updateData = {
        name: attribute.name,
        value: attribute.value
    };

    const {
        data,
        error
    } = await supabase
        .from('product_variant_attributes')
        .update(updateData)
        .eq('id', attributeId)
        .eq('company_id', companyId)
        .select()
        .single();

    if (error) {
        console.error(
            'Erro ao atualizar atributo:',
            error
        );

        throw error;
    }

    return data;
}


export async function deleteVariantAttribute(
    companyId,
    attributeId
) {
    const {
        error
    } = await supabase
        .from('product_variant_attributes')
        .delete()
        .eq('id', attributeId)
        .eq('company_id', companyId);

    if (error) {
        console.error(
            'Erro ao eliminar atributo:',
            error
        );

        throw error;
    }

    return true;
}