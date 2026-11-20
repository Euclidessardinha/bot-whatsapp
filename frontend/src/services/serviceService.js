import { supabase } from '../lib/supabase';


export async function getServices(companyId) {

    if (!companyId) {
        throw new Error(
            'companyId é obrigatório.'
        );
    }


    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', {
            ascending: true
        });


    if (error) {

        console.error(
            'Erro ao buscar serviços:',
            error
        );

        throw error;
    }


    return data || [];
}


export async function createService(
    companyId,
    service
) {

    if (!companyId) {
        throw new Error(
            'companyId é obrigatório.'
        );
    }


    const insertData = {

        company_id: companyId,

        name:
            service.name.trim(),

        description:
            service.description?.trim() || null,

        price:
            service.price === ''
                ? null
                : Number(service.price),

        price_type:
            service.price_type,

        available:
            service.available
    };


    if (
        Object.prototype.hasOwnProperty.call(
            service,
            'image_url'
        )
    ) {

        insertData.image_url =
            service.image_url || null;
    }


    const { data, error } = await supabase
        .from('services')
        .insert([insertData])
        .select()
        .single();


    if (error) {

        console.error(
            'Erro ao criar serviço:',
            error
        );

        throw error;
    }


    return data;
}


export async function updateService(
    companyId,
    serviceId,
    service
) {

    if (!companyId) {
        throw new Error(
            'companyId é obrigatório.'
        );
    }


    if (!serviceId) {
        throw new Error(
            'serviceId é obrigatório.'
        );
    }


    const updateData = {

        name:
            service.name.trim(),

        description:
            service.description?.trim() || null,

        price:
            service.price === ''
                ? null
                : Number(service.price),

        price_type:
            service.price_type,

        available:
            service.available,

        updated_at:
            new Date().toISOString()
    };


    if (
        Object.prototype.hasOwnProperty.call(
            service,
            'image_url'
        )
    ) {

        updateData.image_url =
            service.image_url || null;
    }


    const { data, error } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', serviceId)
        .eq('company_id', companyId)
        .select()
        .single();


    if (error) {

        console.error(
            'Erro ao atualizar serviço:',
            error
        );

        throw error;
    }


    return data;
}


export async function deleteService(
    companyId,
    serviceId
) {

    if (!companyId) {
        throw new Error(
            'companyId é obrigatório.'
        );
    }


    if (!serviceId) {
        throw new Error(
            'serviceId é obrigatório.'
        );
    }


    const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)
        .eq('company_id', companyId);


    if (error) {

        console.error(
            'Erro ao eliminar serviço:',
            error
        );

        throw error;
    }


    return true;
}