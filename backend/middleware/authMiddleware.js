
const supabase = require('../lib/supabase');

async function authMiddleware(req, res, next) {
    try {
        // 1. Obter o token enviado pelo frontend
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Autenticação necessária.'
            });
        }

        const token = authHeader.split(' ')[1];

        // 2. Verificar o token no Supabase Auth
        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({
                success: false,
                message: 'Sessão inválida ou expirada.'
            });
        }

        // 3. Procurar o perfil do utilizador
        const {
            data: profile,
            error: profileError
        } = await supabase
            .from('profiles')
            .select('id, company_id, full_name, role')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error(
                'Erro ao consultar perfil:',
                profileError
            );

            return res.status(500).json({
                success: false,
                message: 'Erro ao verificar o perfil.'
            });
        }

        if (!profile || !profile.company_id) {
            return res.status(403).json({
                success: false,
                message: 'Utilizador sem empresa associada.'
            });
        }

        // 4. Disponibilizar os dados verificados
        // para as próximas rotas do backend
        req.user = user;
        req.profile = profile;
        req.companyId = profile.company_id;

        next();

    } catch (error) {
        console.error(
            'Erro na autenticação:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Erro interno de autenticação.'
        });
    }
}

module.exports = authMiddleware;
