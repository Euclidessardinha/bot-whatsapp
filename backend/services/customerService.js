
const supabase = require('../lib/supabase');


/**
 * =========================================================
 * BUSCAR CLIENTE
 * =========================================================
 *
 * Procura um cliente pelo telefone dentro de uma empresa.
 *
 * Importante:
 * O company_id garante o isolamento entre empresas.
 *
 * Empresa A + telefone X
 * não interfere em
 * Empresa B + telefone X
 */
async function getCustomer(
    companyId,
    phone
) {

    if (
        !companyId ||
        !phone
    ) {

        console.error(
            '❌ companyId ou telefone inválido.'
        );

        return null;
    }


    const {
        data,
        error
    } = await supabase

        .from('customers')

        .select('*')

        .eq(
            'company_id',
            companyId
        )

        .eq(
            'phone',
            phone
        )

        .maybeSingle();


    if (error) {

        console.error(
            '❌ Erro ao buscar cliente:',
            error
        );

        return null;
    }


    return data;
}


/**
 * =========================================================
 * CRIAR CLIENTE
 * =========================================================
 */
async function createCustomer(
    companyId,
    phone,
    name = null
) {

    if (
        !companyId ||
        !phone
    ) {

        console.error(
            '❌ companyId ou telefone inválido.'
        );

        return null;
    }


    const {
        data,
        error
    } = await supabase

        .from('customers')

        .insert([
            {
                company_id:
                    companyId,

                phone:
                    phone,

                name:
                    name
            }
        ])

        .select()

        .single();


    if (error) {

        console.error(
            '❌ Erro ao criar cliente:',
            error
        );

        return null;
    }


    console.log(
        `👤 Cliente criado: ${data.id}`
    );


    return data;
}


/**
 * =========================================================
 * ATUALIZAR NOME DO CLIENTE
 * =========================================================
 *
 * Atualiza o cliente somente se ele pertencer
 * à empresa informada.
 */
async function updateCustomerName(
    companyId,
    customerId,
    name
) {

    if (
        !companyId ||
        !customerId ||
        !name
    ) {

        return null;
    }


    const cleanName =
        String(name).trim();


    if (!cleanName) {
        return null;
    }


    const {
        data,
        error
    } = await supabase

        .from('customers')

        .update({
            name:
                cleanName,

            updated_at:
                new Date().toISOString()
        })

        .eq(
            'id',
            customerId
        )

        .eq(
            'company_id',
            companyId
        )

        .select()

        .maybeSingle();


    if (error) {

        console.error(
            '❌ Erro ao atualizar cliente:',
            error
        );

        return null;
    }


    return data;
}


/**
 * =========================================================
 * OBTER OU CRIAR CLIENTE
 * =========================================================
 *
 * Fluxo:
 *
 * 1. Procurar cliente
 * 2. Se existir -> retornar
 * 3. Se não existir -> criar
 */
async function getOrCreateCustomer(
    companyId,
    phone,
    name = null
) {

    if (
        !companyId ||
        !phone
    ) {

        return null;
    }


    let customer =
        await getCustomer(
            companyId,
            phone
        );


    /**
     * Cliente já existe
     */
    if (customer) {

        /**
         * Se temos um nome novo e o cliente
         * ainda não possui nome, podemos salvar.
         */
        if (
            name &&
            !customer.name
        ) {

            customer =
                await updateCustomerName(
                    companyId,
                    customer.id,
                    name
                ) || customer;
        }


        return customer;
    }


    /**
     * Cliente não existe.
     * Criar novo.
     */
    customer =
        await createCustomer(
            companyId,
            phone,
            name
        );


    return customer;
}


module.exports = {

    getCustomer,

    createCustomer,

    getOrCreateCustomer,

    updateCustomerName

};
