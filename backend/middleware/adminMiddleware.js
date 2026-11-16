function adminMiddleware(req, res, next) {
    try {
        if (!req.profile) {
            return res.status(401).json({
                success: false,
                message: 'Autenticação necessária.'
            });
        }

        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso administrativo não autorizado.'
            });
        }

        next();

    } catch (error) {
        console.error(
            'Erro na autorização administrativa:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Erro interno de autorização.'
        });
    }
}

module.exports = adminMiddleware;