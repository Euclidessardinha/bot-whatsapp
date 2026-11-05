
const supabase = require('../lib/supabase');


/**
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 *
 * Exemplos:
 *
 * "Classic Burger"   -> "classic burger"
 * "CLASSIC BURGER"   -> "classic burger"
 * "Pão de Queijo"    -> "pao de queijo"
 * "Classic Burguer"  -> "classic burguer"
 * "Classic Burguers" -> "classic burguers"
 */
function normalizeText(text) {
    if (!text) return '';

    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}


/**
 * =========================================================
 * LIMPEZA DO PEDIDO
 * =========================================================
 *
 * Remove expressões comuns usadas pelo cliente.
 *
 * Exemplos:
 *
 * "eu quero classic burger"
 *              ↓
 * "classic burger"
 *
 * "quero 2 classic burgers"
 *              ↓
 * "classic burgers"
 */
function cleanProductRequest(text) {

    let result =
        normalizeText(text);

    const phrasesToRemove = [

        'eu quero',
        'quero',
        'gostaria de',
        'gostaria',
        'me de',
        'me dê',
        'manda',
        'mande',
        'pode mandar',
        'pode me mandar',
        'vou querer',
        'quero pedir',
        'vou pedir',
        'pedido de',
        'por favor'
    ];

    for (const phrase of phrasesToRemove) {

        const normalizedPhrase =
            normalizeText(phrase);

        result =
            result.replace(
                new RegExp(
                    `\\b${normalizedPhrase}\\b`,
                    'gi'
                ),
                ' '
            );
    }


    /**
     * Remove quantidade no início.
     *
     * "2 classic burger"
     *        ↓
     * "classic burger"
     */
    result =
        result.replace(
            /^\d+\s+/,
            ''
        );


    return result
        .replace(/\s+/g, ' ')
        .trim();
}


/**
 * =========================================================
 * DISTÂNCIA DE LEVENSHTEIN
 * =========================================================
 *
 * Permite detectar pequenos erros de escrita.
 *
 * Exemplos:
 *
 * burger  -> burguer
 * chicken -> chiken
 * pizza   -> piza
 */
function levenshteinDistance(a, b) {

    const matrix =
        Array.from(
            {
                length: b.length + 1
            },
            () =>
                Array(
                    a.length + 1
                ).fill(0)
        );


    for (
        let i = 0;
        i <= b.length;
        i++
    ) {

        matrix[i][0] = i;
    }


    for (
        let j = 0;
        j <= a.length;
        j++
    ) {

        matrix[0][j] = j;
    }


    for (
        let i = 1;
        i <= b.length;
        i++
    ) {

        for (
            let j = 1;
            j <= a.length;
            j++
        ) {

            const cost =
                b[i - 1] === a[j - 1]
                    ? 0
                    : 1;


            matrix[i][j] =
                Math.min(

                    matrix[i - 1][j] + 1,

                    matrix[i][j - 1] + 1,

                    matrix[i - 1][j - 1] + cost
                );
        }
    }


    return matrix[b.length][a.length];
}


/**
 * =========================================================
 * SIMILARIDADE ENTRE DUAS PALAVRAS
 * =========================================================
 */
function calculateWordSimilarity(
    wordA,
    wordB
) {

    if (
        !wordA ||
        !wordB
    ) {
        return 0;
    }


    if (wordA === wordB) {
        return 100;
    }


    /**
     * Caso de plural simples.
     *
     * burger
     * burgers
     *
     * burger
     * burguers
     */
    const singularA =
        wordA.endsWith('s')
            ? wordA.slice(0, -1)
            : wordA;

    const singularB =
        wordB.endsWith('s')
            ? wordB.slice(0, -1)
            : wordB;


    if (
        singularA ===
        singularB
    ) {

        return 98;
    }


    /**
     * Verifica se uma palavra contém a outra.
     *
     * burger
     * burguer
     *
     * chicken
     * chickens
     */
    if (
        wordA.includes(wordB) ||
        wordB.includes(wordA)
    ) {

        return 92;
    }


    const distance =
        levenshteinDistance(
            wordA,
            wordB
        );


    const maxLength =
        Math.max(
            wordA.length,
            wordB.length
        );


    if (maxLength === 0) {
        return 0;
    }


    const similarity =
        1 -
        distance / maxLength;


    return Math.round(
        similarity * 100
    );
}


/**
 * =========================================================
 * PONTUAÇÃO DO PRODUTO
 * =========================================================
 *
 * Compara o texto enviado pelo cliente
 * com o nome real do produto.
 */
function calculateProductScore(
    searchText,
    productName
) {

    const search =
        cleanProductRequest(
            searchText
        );

    const product =
        normalizeText(
            productName
        );


    if (
        !search ||
        !product
    ) {

        return 0;
    }


    /**
     * =====================================================
     * CORRESPONDÊNCIA EXATA
     * =====================================================
     */

    if (
        search === product
    ) {

        return 100;
    }


    /**
     * =====================================================
     * TEXTO COMPLETO CONTIDO
     * =====================================================
     *
     * Exemplo:
     *
     * "classic burger please"
     *
     * não chega aqui normalmente por causa
     * da limpeza, mas mantemos esta proteção.
     */

    if (
        search.includes(product)
    ) {

        return 96;
    }


    if (
        product.includes(search)
    ) {

        return 94;
    }


    /**
     * =====================================================
     * COMPARAÇÃO POR PALAVRAS
     * =====================================================
     */

    const searchWords =
        search.split(' ');

    const productWords =
        product.split(' ');


    let totalSimilarity = 0;

    let matchedWords = 0;


    for (
        const searchWord
        of searchWords
    ) {

        let bestSimilarity = 0;


        for (
            const productWord
            of productWords
        ) {

            const similarity =
                calculateWordSimilarity(
                    searchWord,
                    productWord
                );


            if (
                similarity >
                bestSimilarity
            ) {

                bestSimilarity =
                    similarity;
            }
        }


        /**
         * Consideramos a palavra
         * correspondente se a semelhança
         * for suficientemente alta.
         */
        if (
            bestSimilarity >= 75
        ) {

            matchedWords++;

            totalSimilarity +=
                bestSimilarity;
        }
    }


    if (
        matchedWords === 0
    ) {

        return 0;
    }


    /**
     * Média de semelhança
     */
    const averageSimilarity =
        totalSimilarity /
        matchedWords;


    /**
     * Cobertura das palavras.
     *
     * Exemplo:
     *
     * Cliente:
     * "classic burguers"
     *
     * Produto:
     * "classic burger"
     *
     * 2 de 2 palavras
     * correspondem.
     */

    const wordCoverage =
        matchedWords /
        Math.max(
            searchWords.length,
            productWords.length
        );


    /**
     * Pontuação final.
     *
     * A cobertura das palavras
     * tem bastante peso.
     */

    const score =
        (
            averageSimilarity * 0.6
        ) +
        (
            wordCoverage * 100 * 0.4
        );


    return Math.round(
        score
    );
}


/**
 * =========================================================
 * BUSCAR PRODUTO PELO NOME
 * =========================================================
 *
 * A pesquisa é feita somente dentro
 * da empresa informada.
 *
 * Isso mantém o sistema multi-tenant.
 */
async function getProductByName(
    companyId,
    productName
) {

    if (
        !companyId ||
        !productName
    ) {

        return null;
    }


    /**
     * Buscar somente produtos
     * disponíveis daquela empresa.
     */
    const {
        data,
        error
    } = await supabase

        .from('products')

        .select('*')

        .eq(
            'company_id',
            companyId
        )

        .eq(
            'available',
            true
        );


    if (error) {

        console.error(
            '❌ Erro ao buscar produtos:',
            error
        );

        return null;
    }


    if (
        !data ||
        data.length === 0
    ) {

        return null;
    }


    /**
     * =====================================================
     * ENCONTRAR MELHOR CORRESPONDÊNCIA
     * =====================================================
     */

    let bestProduct = null;

    let bestScore = 0;


    for (
        const product
        of data
    ) {

        const score =
            calculateProductScore(
                productName,
                product.name
            );


        console.log(
            `🔎 Produto: "${product.name}" | ` +
            `Pesquisa: "${productName}" | ` +
            `Score: ${score}`
        );


        if (
            score > bestScore
        ) {

            bestScore =
                score;

            bestProduct =
                product;
        }
    }


    /**
     * =====================================================
     * LIMITE DE SEGURANÇA
     * =====================================================
     *
     * Evita que qualquer mensagem parecida
     * seja interpretada como produto.
     */

    if (
        bestScore < 60
    ) {

        console.log(
            `❌ Nenhum produto suficientemente parecido. ` +
            `Melhor score: ${bestScore}`
        );

        return null;
    }


    console.log(
        `✅ Produto encontrado: "${bestProduct.name}" ` +
        `(score ${bestScore})`
    );


    return bestProduct;
}


module.exports = {
    getProductByName
};
