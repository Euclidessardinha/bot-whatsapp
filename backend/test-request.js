
const {
    createRequest,
    getRequests
} = require('./services/requestService');

const companyId =
    'd3779995-5533-4198-bee3-556709331dc6';

const customerId =
    '9c292090-7293-4533-b4b7-3c2d0cfc9bc6';

const conversationId =
    '188fdc20-853e-4e1c-b63d-3fb54de06db5';

const serviceId =
    '86f20720-f9a2-4118-8e2a-df5ef6d0dc29';


async function test() {

    console.log('🧪 Testando solicitações...');

    const request =
        await createRequest(
            companyId,
            customerId,
            conversationId,
            serviceId,
            'Preciso de corte e limpeza da relva do meu jardim.'
        );

    console.log(
        '📋 Solicitação criada:'
    );

    console.log(request);


    const requests =
        await getRequests(companyId);

    console.log(
        '📋 Solicitações da empresa:'
    );

    console.log(requests);
}


test();
