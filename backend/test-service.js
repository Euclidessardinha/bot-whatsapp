require('dotenv').config();

const {
    findServiceByText
} = require('./services/serviceService');


const TEM_MAIS_BURGER =
    'd3779995-5533-4198-bee3-556709331dc6';

const CASA =
    '9bb4b999-e166-4f28-88fc-b559fca6c696';


async function test(companyName, companyId, text) {

    const result =
        await findServiceByText(
            companyId,
            text
        );


    console.log(
        `\n[${companyName}]`
    );

    console.log(
        `Cliente: "${text}"`
    );


    if (result) {

        console.log(
            `✅ Encontrado: ${result.name}`
        );

        console.log(
            `   Service ID: ${result.id}`
        );

        console.log(
            `   Company ID: ${result.company_id}`
        );

    } else {

        console.log(
            '❌ Nenhum serviço encontrado'
        );
    }
}


async function main() {

    console.log('\n========================================');
    console.log('TESTE DE ISOLAMENTO MULTI-TENANT');
    console.log('========================================');


    /*
     * =====================================================
     * EMPRESA A — TEM MAIS BURGER
     * =====================================================
     */

    await test(
        'TEM MAIS BURGER',
        TEM_MAIS_BURGER,
        'quero cortar a relva'
    );


    await test(
        'TEM MAIS BURGER',
        TEM_MAIS_BURGER,
        'quero cortar cabelo'
    );


    /*
     * =====================================================
     * EMPRESA B — CASA
     * =====================================================
     */

    await test(
        'CASA',
        CASA,
        'quero cortar cabelo'
    );


    await test(
        'CASA',
        CASA,
        'quero cortar a relva'
    );


    console.log('\n========================================');
    console.log('FIM DO TESTE');
    console.log('========================================\n');
}


main()
    .catch(error => {

        console.error(
            '\n❌ ERRO:',
            error
        );

        process.exit(1);
    });