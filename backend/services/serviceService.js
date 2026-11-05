
const supabase = require('../lib/supabase');


/**
 * =========================================================
 * BUSCAR TODOS OS SERVIÇOS
 * =========================================================
 *
 * Retorna somente os serviços da empresa.
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
 * Procura um serviço dentro da empresa.
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

    getServices,

    getServiceByName,

    createService,

    updateService

};
