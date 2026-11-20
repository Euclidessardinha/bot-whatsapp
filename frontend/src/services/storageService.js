import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'company-media';

 

export async function uploadProductImage(
    companyId,
    productId,
    file
) {
    if (!companyId || !productId) {
        throw new Error(
            'companyId e productId são obrigatórios.'
        );
    }

    if (!file) {
        throw new Error('Imagem é obrigatória.');
    }

    if (!file.type?.startsWith('image/')) {
        throw new Error(
            'O ficheiro selecionado não é uma imagem válida.'
        );
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error(
            'A imagem não pode ter mais de 5 MB.'
        );
    }

    const path =
        `${companyId}/products/${productId}`;

    const { error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(path, file, {
            upsert: true,
            contentType: file.type,
            cacheControl: '3600'
        });

    if (error) {
        console.error(
            'Erro ao enviar imagem do produto:',
            error
        );

        throw error;
    }

    const {
        data
    } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

    return {
        path,
        url: data.publicUrl
    };
}

export async function uploadServiceImage(
    companyId,
    serviceId,
    file
) {
    if (!companyId || !serviceId) {
        throw new Error(
            'companyId e serviceId são obrigatórios.'
        );
    }

    if (!file) {
        throw new Error('Imagem é obrigatória.');
    }

    if (!file.type?.startsWith('image/')) {
        throw new Error(
            'O ficheiro selecionado não é uma imagem válida.'
        );
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error(
            'A imagem não pode ter mais de 5 MB.'
        );
    }

    const path =
        `${companyId}/services/${serviceId}`;

    const { error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(path, file, {
            upsert: true,
            contentType: file.type,
            cacheControl: '3600'
        });

    if (error) {
        console.error(
            'Erro ao enviar imagem do serviço:',
            error
        );

        throw error;
    }

    const {
        data
    } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

    return {
        path,
        url: data.publicUrl
    };
}

export async function uploadWelcomeImage(
    companyId,
    file
) {
    if (!companyId) {
        throw new Error(
            'companyId é obrigatório.'
        );
    }

    if (!file) {
        throw new Error('Imagem é obrigatória.');
    }

    if (!file.type?.startsWith('image/')) {
        throw new Error(
            'O ficheiro selecionado não é uma imagem válida.'
        );
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error(
            'A imagem não pode ter mais de 5 MB.'
        );
    }

    const path =
        `${companyId}/welcome/welcome`;

    const { error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(path, file, {
            upsert: true,
            contentType: file.type,
            cacheControl: '3600'
        });

    if (error) {
        console.error(
            'Erro ao enviar imagem de boas-vindas:',
            error
        );

        throw error;
    }

    const {
        data
    } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

    return {
        path,
        url: data.publicUrl
    };
}

export async function deleteCompanyImage(
    path
) {
    if (!path) {
        return true;
    }

    const { error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .remove([path]);

    if (error) {
        console.error(
            'Erro ao remover imagem:',
            error
        );

        throw error;
    }

    return true;
}

export function getProductImagePath(
    companyId,
    productId
) {
    return `${companyId}/products/${productId}`;
}

export function getServiceImagePath(
    companyId,
    serviceId
) {
    return `${companyId}/services/${serviceId}`;
}

export function getWelcomeImagePath(
    companyId
) {
    return `${companyId}/welcome/welcome`;
}