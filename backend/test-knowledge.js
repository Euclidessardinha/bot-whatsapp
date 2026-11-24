const { analyzeMessage } = require('./bot/intelligence/knowledgeEngine');

const messages = ['Quero 2 chicken e 3 batatas'];

for (const message of messages) {

    console.log('\n========================================');
    console.log('MENSAGEM:', message);
    console.log('========================================');

    const result = analyzeMessage({
        message,
        state: 'idle',
        context: {}
    });

    console.dir(result, {
        depth: null,
        colors: true
    });
}
