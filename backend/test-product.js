const {
    getProductCandidates,
    getProductByName
} = require('./services/productService');

const companyId =
    'd3779995-5533-4198-bee3-556709331dc6';

async function test() {

    const tests = [
    'quero uma coca',
    'quero uma bebida',
    'manda duas fritas',
    'quero frango',
    'quero um classic',
    'vou querer um double',
    'me manda um refrigerante',
    'quero hamburguer de frango'
];

    for (const text of tests) {

        console.log('\n================================');
        console.log(`TESTE: "${text}"`);
        console.log('================================');

        const candidates =
            await getProductCandidates(
                companyId,
                text
            );

        console.log(
            candidates.map(c => ({
                product: c.product.name,
                score: c.score,
                matchSource: c.matchSource,
                matchedAlias: c.matchedAlias,
                confidence: c.confidence
            }))
        );

        const product =
            await getProductByName(
                companyId,
                text
            );

        console.log(
            'RESULTADO:',
            product
                ? product.name
                : 'NULL'
        );
    }
}

test()
    .catch(console.error);