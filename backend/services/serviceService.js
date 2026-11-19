const supabase = require('../lib/supabase');


/**
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 */

function normalizeText(text) {

    if (!text) {
        return '';
    }

    return String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}


/**
 * =========================================================
 * BUSCAR TODOS OS ALIASES DA EMPRESA
 * =========================================================
 *
 * IMPORTANTE:
 *
 * Os aliases são sempre filtrados por company_id.
 *
 * Portanto:
 *
 * Empresa A
 *   └── aliases dos seus serviços
 *
 * Empresa B
 *   └── aliases dos seus serviços
 *
 * Nunca misturamos conhecimento entre empresas.
 * =========================================================
 */

async function getServiceAliases(
    companyId,
    serviceIds = []
) {

    if (!companyId) {
        return [];
    }


    let query = supabase
        .from('service_aliases')
        .select(
            'id, company_id, service_id, alias'
        )
        .eq(
            'company_id',
            companyId
        );


    /*
     * Se recebemos IDs específicos,
     * limita a busca a esses serviços.
     */

    if (
        Array.isArray(serviceIds) &&
        serviceIds.length
    ) {

        query = query.in(
            'service_id',
            serviceIds
        );
    }


    const {
        data,
        error
    } = await query;


    if (error) {

        console.error(
            '❌ Erro ao buscar aliases dos serviços:',
            error
        );

        return [];
    }


    return data || [];
}


/**
 * =========================================================
 * VERIFICAR SE TEXTO CORRESPONDE AO SERVIÇO
 * =========================================================
 */

function serviceMatchesText(
    service,
    text,
    aliases = []
) {

    if (
        !service ||
        !service.name ||
        !text
    ) {

        return false;
    }


    const normalizedText =
        normalizeText(text);


    if (!normalizedText) {
        return false;
    }


    /**
     * =====================================================
     * 1. NOME COMPLETO DO SERVIÇO
     * =====================================================
     */

    const normalizedServiceName =
        normalizeText(
            service.name
        );


    if (
        normalizedServiceName &&
        normalizedText.includes(
            normalizedServiceName
        )
    ) {

        return true;
    }


    /**
     * =====================================================
     * 2. ALIASES
     * =====================================================
     */

    for (const alias of aliases) {

        /*
         * Aceita tanto:
         *
         * alias.alias
         *
         * como uma string diretamente.
         *
         * Isso mantém a função compatível
         * com diferentes formas de agrupamento.
         */

        const aliasValue =
            typeof alias === 'string'
                ? alias
                : alias?.alias;


        const normalizedAlias =
            normalizeText(
                aliasValue
            );


        if (
            normalizedAlias &&
            normalizedText.includes(
                normalizedAlias
            )
        ) {

            return true;
        }
    }


    /**
     * =====================================================
     * 3. PALAVRAS RELEVANTES DO NOME
     * =====================================================
     *
     * Exemplo:
     *
     * Serviço:
     * "Limpeza de jardim"
     *
     * Cliente:
     * "quero limpeza"
     *
     * A palavra "limpeza" permite encontrar
     * o serviço.
     */

    const serviceWords =
        normalizedServiceName
            .split(' ')
            .filter(
                word =>
                    word.length >= 3
            );


    if (!serviceWords.length) {
        return false;
    }


    const matchedWords =
        serviceWords.filter(
            word =>
                normalizedText.includes(word)
        );


    return matchedWords.length > 0;
}


/**
 * =========================================================
 * BUSCAR TODOS OS SERVIÇOS
 * =========================================================
 *
 * Retorna somente serviços disponíveis
 * daquela empresa.
 * =========================================================
 */

async function getServices(companyId) {

    if (!companyId) {

        console.error(
            '❌ companyId é obrigatório.'
        );

        return [];
    }


    const {
        data,
        error
    } = await supabase
        .from('services')
        .select('*')
        .eq(
            'company_id',
            companyId
        )
        .eq(
            'available',
            true
        )
        .order(
            'created_at',
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            '❌ Erro ao buscar serviços:',
            error
        );

        return [];
    }


    return data || [];
}


/**
 * =========================================================
 * BUSCAR SERVIÇO PELO NOME OU ALIAS
 * =========================================================
 *
 * Compatibilidade:
 *
 * getServiceByName(
 *     companyId,
 *     serviceName
 * )
 *
 * A busca é SEMPRE limitada à empresa.
 * =========================================================
 */

async function getServiceByName(
    companyId,
    serviceName
) {

    if (
        !companyId ||
        !serviceName
    ) {

        return null;
    }


    const cleanName =
        normalizeText(
            serviceName
        );


    if (!cleanName) {
        return null;
    }


    try {

        /**
         * =================================================
         * 1. BUSCA DIRETA PELO NOME
         * =================================================
         */

        const {
            data: services,
            error
        } = await supabase
            .from('services')
            .select('*')
            .eq(
                'company_id',
                companyId
            )
            .eq(
                'available',
                true
            )
            .ilike(
                'name',
                `%${cleanName}%`
            )
            .limit(10);


        if (error) {

            console.error(
                '❌ Erro ao buscar serviço:',
                error
            );

            return null;
        }


        /**
         * =================================================
         * 2. ENCONTROU PELO NOME
         * =================================================
         */

        if (
            services &&
            services.length > 0
        ) {

            return services[0];
        }


        /**
         * =================================================
         * 3. CARREGAR SERVIÇOS DA EMPRESA
         * =================================================
         */

        const {
            data: allServices,
            error: servicesError
        } = await supabase
            .from('services')
            .select('*')
            .eq(
                'company_id',
                companyId
            )
            .eq(
                'available',
                true
            );


        if (servicesError) {

            console.error(
                '❌ Erro ao buscar serviços para aliases:',
                servicesError
            );

            return null;
        }


        if (
            !allServices ||
            allServices.length === 0
        ) {

            return null;
        }


        /**
         * =================================================
         * 4. IDS DOS SERVIÇOS
         * =================================================
         */

        const serviceIds =
            allServices.map(
                service => service.id
            );


        /**
         * =================================================
         * 5. CARREGAR ALIASES DA EMPRESA
         * =================================================
         */

        const aliases =
            await getServiceAliases(
                companyId,
                serviceIds
            );


        /**
         * =================================================
         * 6. AGRUPAR ALIASES POR SERVIÇO
         * =================================================
         */

        const aliasesByService =
            new Map();


        for (const alias of aliases) {

            if (
                !aliasesByService.has(
                    alias.service_id
                )
            ) {

                aliasesByService.set(
                    alias.service_id,
                    []
                );
            }


            aliasesByService
                .get(alias.service_id)
                .push(alias);
        }


        /**
         * =================================================
         * 7. PROCURAR POR NOME OU ALIAS
         * =================================================
         */

        for (
            const service
            of allServices
        ) {

            const serviceAliases =
                aliasesByService.get(
                    service.id
                ) || [];


            if (
                serviceMatchesText(
                    service,
                    cleanName,
                    serviceAliases
                )
            ) {

                return service;
            }
        }


        /**
         * =================================================
         * 8. NENHUM SERVIÇO ENCONTRADO
         * =================================================
         */

        return null;

    } catch (error) {

        console.error(
            '❌ Erro ao resolver serviço:',
            error
        );

        return null;
    }
}


/**
 * =========================================================
 * ENCONTRAR SERVIÇO PELO TEXTO
 * =========================================================
 *
 * Esta função é diferente de getServiceByName().
 *
 * getServiceByName():
 *     procura um serviço específico por nome/alias.
 *
 * findServiceByText():
 *     recebe uma frase natural do cliente e tenta
 *     identificar qual serviço está sendo mencionado.
 *
 * Exemplo:
 *
 * "quero limpeza"
 *
 * pode encontrar:
 *
 * "Limpeza de jardim"
 *
 * ou um alias cadastrado:
 *
 * "jardinagem"
 *
 * =========================================================
 */

async function findServiceByText(
    companyId,
    text
) {

    if (
        !companyId ||
        !text
    ) {

        return null;
    }


    const normalizedText =
        normalizeText(text);


    if (!normalizedText) {
        return null;
    }


    try {

        /**
         * =================================================
         * 1. BUSCA DIRETA
         * =================================================
         *
         * Primeiro tentamos aproveitar
         * a resolução existente.
         */

        const directMatch =
            await getServiceByName(
                companyId,
                normalizedText
            );


        if (directMatch) {
            return directMatch;
        }


        /**
         * =================================================
         * 2. CARREGAR SERVIÇOS DA EMPRESA
         * =================================================
         */

        const services =
            await getServices(
                companyId
            );


        if (
            !services ||
            !services.length
        ) {

            return null;
        }


        /**
         * =================================================
         * 3. IDS DOS SERVIÇOS
         * =================================================
         */

        const serviceIds =
            services.map(
                service => service.id
            );


        /**
         * =================================================
         * 4. CARREGAR ALIASES
         * =================================================
         */

        const aliases =
            await getServiceAliases(
                companyId,
                serviceIds
            );


        /**
         * =================================================
         * 5. AGRUPAR ALIASES
         * =================================================
         */

        const aliasesByService =
            new Map();


        for (
            const alias
            of aliases
        ) {

            if (
                !aliasesByService.has(
                    alias.service_id
                )
            ) {

                aliasesByService.set(
                    alias.service_id,
                    []
                );
            }


            aliasesByService
                .get(alias.service_id)
                .push(alias);
        }


        /**
         * =================================================
         * 6. PROCURAR CORRESPONDÊNCIA
         * =================================================
         */

        for (
            const service
            of services
        ) {

            const serviceAliases =
                aliasesByService.get(
                    service.id
                ) || [];


            if (
                serviceMatchesText(
                    service,
                    normalizedText,
                    serviceAliases
                )
            ) {

                return service;
            }
        }


        /**
         * =================================================
         * 7. NENHUM SERVIÇO ENCONTRADO
         * =================================================
         */

        return null;

    } catch (error) {

        console.error(
            '❌ Erro ao encontrar serviço pelo texto:',
            error
        );

        return null;
    }
}


/**
 * =========================================================
 * CRIAR SERVIÇO
 * =========================================================
 */

async function createService(
    companyId,
    name,
    description = null,
    price = null,
    priceType = 'fixed'
) {

    if (
        !companyId ||
        !name
    ) {

        console.error(
            '❌ companyId e nome do serviço são obrigatórios.'
        );

        return null;
    }


    const validPriceTypes = [
        'fixed',
        'from',
        'quote'
    ];


    if (
        !validPriceTypes.includes(
            priceType
        )
    ) {

        console.error(
            '❌ Tipo de preço inválido:',
            priceType
        );

        return null;
    }


    const {
        data,
        error
    } = await supabase
        .from('services')
        .insert([
            {
                company_id:
                    companyId,

                name:
                    String(name).trim(),

                description:
                    description
                        ? String(description).trim()
                        : null,

                price:
                    price !== null
                        ? Number(price)
                        : null,

                price_type:
                    priceType,

                available:
                    true
            }
        ])
        .select()
        .single();


    if (error) {

        console.error(
            '❌ Erro ao criar serviço:',
            error
        );

        return null;
    }


    console.log(
        `✅ Serviço criado: ${data.name}`
    );


    return data;
}


/**
 * =========================================================
 * ATUALIZAR SERVIÇO
 * =========================================================
 */

async function updateService(
    serviceId,
    updates
) {

    if (
        !serviceId ||
        !updates
    ) {

        return null;
    }


    const {
        data,
        error
    } = await supabase
        .from('services')
        .update({

            ...updates,

            updated_at:
                new Date().toISOString()

        })
        .eq(
            'id',
            serviceId
        )
        .select()
        .single();


    if (error) {

        console.error(
            '❌ Erro ao atualizar serviço:',
            error
        );

        return null;
    }


    return data;
}


/**
 * =========================================================
 * EXPORTAR
 * =========================================================
 */

module.exports = {

    normalizeText,

    getServices,

    getServiceAliases,

    serviceMatchesText,

    getServiceByName,

    findServiceByText,

    createService,

    updateService

};