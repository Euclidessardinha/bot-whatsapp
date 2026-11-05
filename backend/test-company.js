const { getCompanyBySession } = require('./services/whatsappService');

async function test() {
    const session = await getCompanyBySession('tem-mais-burguer');

    console.log('🏢 Sessão encontrada:');
    console.log(session);
}

test();