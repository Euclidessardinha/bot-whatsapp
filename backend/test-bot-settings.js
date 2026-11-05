const { getBotSettings } = require('./services/botSettingsService');

async function test() {
    const companyId = 'd3779995-5533-4198-bee3-556709331dc6';

    const settings = await getBotSettings(companyId);

    console.log('⚙️ Configurações encontradas:');
    console.log(settings);
}

test();