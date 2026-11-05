
import { supabase } from '../lib/supabase';

export async function getCurrentUser() {
    const {
        data: { user },
        error
    } = await supabase.auth.getUser();

    if (error) {
        console.error(
            'Erro ao obter utilizador:',
            error
        );

        return null;
    }

    return user;
}

export async function getCurrentProfile() {
    const user = await getCurrentUser();

    if (!user) {
        return null;
    }

    const {
        data,
        error
    } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            role,
            company_id,
            companies (
                id,
                name,
                welcome_message,
                location,
                phone,
                business_type,
                business_hours
            )
        `)
        .eq('id', user.id)
        .single();

    if (error) {
        console.error(
            'Erro ao obter perfil:',
            error
        );

        return null;
    }

    return data;
}

export async function getAccessToken() {
    const {
        data: { session },
        error
    } = await supabase.auth.getSession();

    if (error) {
        console.error(
            'Erro ao obter sessão:',
            error
        );

        return null;
    }

    return session?.access_token || null;
}