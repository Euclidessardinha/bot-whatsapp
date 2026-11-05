
const {
    getServices,
    createService
} = require('./services/serviceService');


const companyId =
    'd3779995-5533-4198-bee3-556709331dc6';


async function test() {

    console.log(
        '🧪 Testando serviços...'
    );


    /**
     * Criar serviço de teste
     */

    const service =
        await createService(

            companyId,

            'Corte de relva',

            'Corte e limpeza da relva do jardim.',

            1500,

            'fixed'

        );


    console.log(
        '🌱 Serviço criado:',
        service
    );


    /**
     * Buscar serviços
     */

    const services =
        await getServices(
            companyId
        );


    console.log(
        '📋 Serviços da empresa:'
    );


    console.log(
        services
    );

}


test();
