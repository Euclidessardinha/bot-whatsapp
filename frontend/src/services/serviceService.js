import { supabase } from '../lib/supabase';

export async function getServices(companyId) {
    if (!companyId) {
        throw new Error('companyId é obrigatório.');
    }

    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erro ao buscar serviços:', error);
        throw error;
    }

    return data || [];
}


export async function createService(
    companyId,
    service
) {
    if (!companyId) {
        throw new Error('companyId é obrigatório.');
    }

    const { data, error } = await supabase
        .from('services')
        .insert([
            {
                company_id: companyId,
                name: service.name.trim(),
                description:
                    service.description?.trim() || null,
                price:
                    service.price === ''
                        ? null
                        : Number(service.price),
                price_type: service.price_type,
                available: service.available
            }
        ])
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar serviço:', error);
        throw error;
    }

    return data;
}


export async function updateService(
    serviceId,
    service
) {
    if (!serviceId) {
        throw new Error('serviceId é obrigatório.');
    }

    const { data, error } = await supabase
        .from('services')
        .update({
            name: service.name.trim(),
            description:
                service.description?.trim() || null,
            price:
                service.price === ''
                    ? null
                    : Number(service.price),
            price_type: service.price_type,
            available: service.available,
            updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .select()
        .single();

    if (error) {
        console.error('Erro ao atualizar serviço:', error);
        throw error;
    }

    return data;
}


export async function deleteService(serviceId) {
    if (!serviceId) {
        throw new Error('serviceId é obrigatório.');
    }

    const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

    if (error) {
        console.error('Erro ao eliminar serviço:', error);
        throw error;
    }

    return true;
}