const {
    analyzeMessage
} = require('./bot/intelligence/knowledgeEngine');

const messages = [
    'remove o segundo e adiciona 2 chicken burger',
    'tira a coca e coloca duas fanta',
    'remove a batata e adiciona um burger',
    'troca a coca por fanta'
];

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