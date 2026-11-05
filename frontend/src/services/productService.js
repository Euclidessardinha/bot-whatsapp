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
    const {
        data,
        error
    } = await supabase
        .from('products')
        .insert([
            {
                company_id: companyId,
                name: product.name,
                price: Number(product.price),
                available: product.available
            }
        ])
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
    productId,
    product
) {
    const {
        data,
        error
    } = await supabase
        .from('products')
        .update({
            name: product.name,
            price: Number(product.price),
            available: product.available
        })
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
    productId
) {
    const {
        error
    } = await supabase
        .from('products')
        .delete()
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