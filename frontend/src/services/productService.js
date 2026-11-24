import { supabase } from '../lib/supabase';

export async function getProducts(companyId) {
    const {
        data,
        error
    } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .order('name', {
            ascending: true
        });

    if (error) {
        console.error(
            'Erro ao buscar produtos:',
            error
        );

        throw error;
    }

    return data || [];
}

export async function createProduct(
    companyId,
    product
) {
    const insertData = {
        company_id: companyId,
        name: product.name,
        price: Number(product.price),
        available: product.available
    };

    if (
        Object.prototype.hasOwnProperty.call(
            product,
            'image_url'
        )
    ) {
        insertData.image_url =
            product.image_url || null;
    }

    const {
        data,
        error
    } = await supabase
        .from('products')
        .insert([insertData])
        .select()
        .single();

    if (error) {
        console.error(
            'Erro ao criar produto:',
            error
        );

        throw error;
    }

    return data;
}

export async function updateProduct(
    companyId,
    productId,
    product
) {
    const updateData = {
        name: product.name,
        price: Number(product.price),
        available: product.available
    };

    if (
        Object.prototype.hasOwnProperty.call(
            product,
            'image_url'
        )
    ) {
        updateData.image_url =
            product.image_url || null;
    }

    const {
        data,
        error
    } = await supabase
        .from('products')
        .update(updateData)
        .eq('company_id', companyId)
        .eq('id', productId)
        .select()
        .single();

    if (error) {
        console.error(
            'Erro ao atualizar produto:',
            error
        );

        throw error;
    }

    return data;
}

export async function deleteProduct(
    companyId,
    productId
) {
    const {
        error
    } = await supabase
        .from('products')
        .delete()
        .eq('company_id', companyId)
        .eq('id', productId);

    if (error) {
        console.error(
            'Erro ao eliminar produto:',
            error
        );

        throw error;
    }

    return true;
}