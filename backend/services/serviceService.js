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
 * ALIASES DO BANCO
 * =========================================================
 *
 * Os aliases agora são específicos de cada empresa
 * e de cada serviço.
 *
 * NÃO existem aliases globais hardcoded.
 */


/**
 * =========================================================
 * BUSCAR TODOS OS ALIASES DA EMPRESA
 * =========================================================
 */

async function getServiceAliases(companyId, serviceIds = []) {

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
     * limita aos serviços correspondentes.
     */

    if (serviceIds.length) {

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


    /*
     * =====================================================
     * 1. NOME DO SERVIÇO
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


    /*
     * =====================================================
     * 2. ALIASES DO SERVIÇO
     * =====================================================
     */

    for (const alias of aliases) {

        const normalizedAlias =
            normalizeText(
                alias.alias
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


    /*
     * =====================================================
     * 3. PALAVRAS RELEVANTES DO NOME
     * =====================================================
     *
     * Mantemos esta camada para frases naturais.
     *
     * Exemplo:
     *
     * "quero limpeza"
     *
     * pode encontrar:
     *
     * "Limpeza de jardim"
     */

    const serviceWords =
        normalizedServiceName
            .split(' ')
            .filter(
                word => word.length >= 3
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
 * Retorna somente os serviços disponíveis
 * daquela empresa.
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
 * BUSCAR SERVIÇO PELO NOME
 * =========================================================
 *
 * Mantém compatibilidade com chamadas existentes.
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
        String(serviceName)
            .trim();


    if (!cleanName) {

        return null;
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

        .ilike(
            'name',
            `%${cleanName}%`
        )

        .limit(1);


    if (error) {

        console.error(
            '❌ Erro ao buscar serviço:',
            error
        );

        return null;
    }


    return data && data.length > 0
        ? data[0]
        : null;
}


/**
 * =========================================================
 * BUSCAR SERVIÇO POR TEXTO
 * =========================================================
 *
 * Recebe uma frase do cliente e tenta identificar
 * o serviço correspondente.
 *
 * Ordem:
 *
 * 1. Nome direto
 * 2. Alias específico do serviço
 * 3. Palavras relevantes do nome
 *
 * Tudo sempre limitado à empresa.
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


    /*
     * =====================================================
     * 1. BUSCA DIRETA PELO NOME
     * =====================================================
     */

    const directMatch =
        await getServiceByName(
            companyId,
            normalizedText
        );


    if (directMatch) {
        return directMatch;
    }


    /*
     * =====================================================
     * 2. CARREGAR SERVIÇOS DA EMPRESA
     * =====================================================
     */

    const services =
        await getServices(
            companyId
        );


    if (!services.length) {
        return null;
    }


    const serviceIds =
        services.map(
            service => service.id
        );


    /*
     * =====================================================
     * 3. CARREGAR ALIASES DA EMPRESA
     * =====================================================
     */

    const aliases =
        await getServiceAliases(
            companyId,
            serviceIds
        );


    /*
     * =====================================================
     * 4. AGRUPAR ALIASES POR SERVIÇO
     * =====================================================
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


    /*
     * =====================================================
     * 5. PROCURAR CORRESPONDÊNCIA
     * =====================================================
     */

    for (const service of services) {

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


    return null;
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

    getServiceByName,

    findServiceByText,

    createService,

    updateService

};