const supabase = require('../lib/supabase');


/**
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
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
     */
    result =
        result.replace(
            /^(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|\d+)\s+/,
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
     * Plural simples.
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
     * Pequenas variações de escrita.
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
     * Correspondência exata.
     */
    if (
        search === product
    ) {

        return 100;
    }


    /**
     * Texto completo contido.
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
     * Comparação por palavras.
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


    const averageSimilarity =
        totalSimilarity /
        matchedWords;


    const wordCoverage =
        matchedWords /
        Math.max(
            searchWords.length,
            productWords.length
        );


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
 * BUSCAR ALIASES DOS PRODUTOS
 * =========================================================
 *
 * Busca somente aliases pertencentes aos produtos
 * da empresa atual.
 *
 * IMPORTANTE:
 * Nunca buscamos aliases de outras empresas.
 */
async function getProductAliases(
    companyId,
    productIds
) {

    if (
        !companyId ||
        !productIds ||
        !productIds.length
    ) {

        return [];
    }


    try {

        const {
            data,
            error
        } = await supabase

            .from('product_aliases')

            .select(
                'id, company_id, product_id, alias'
            )

            .eq(
                'company_id',
                companyId
            )

            .in(
                'product_id',
                productIds
            );


        if (error) {

            console.error(
                '❌ Erro ao buscar aliases de produtos:',
                error
            );

            return [];
        }


        return data || [];

    } catch (error) {

        console.error(
            '❌ Erro inesperado ao buscar aliases:',
            error
        );

        return [];
    }
}


/**
 * =========================================================
 * AVALIAR MELHOR MATCH
 * =========================================================
 *
 * Compara o texto pesquisado com:
 *
 * 1. nome do produto;
 * 2. todos os aliases do produto.
 *
 * O melhor resultado vence.
 */
function calculateBestProductMatch(
    searchText,
    product,
    aliases = []
) {

    /**
     * Match pelo nome original.
     */
    const nameScore =
        calculateProductScore(
            searchText,
            product.name
        );


    let bestScore =
        nameScore;

    let bestMatchType =
        'name';

    let bestAlias =
        null;


    /**
     * Match pelos aliases.
     */
    for (
        const alias
        of aliases
    ) {

        const aliasScore =
            calculateProductScore(
                searchText,
                alias.alias
            );


        if (
            aliasScore >
            bestScore
        ) {

            bestScore =
                aliasScore;

            bestMatchType =
                'alias';

            bestAlias =
                alias.alias;
        }
    }


    return {

        score: bestScore,

        matchType:
            bestMatchType,

        matchedAlias:
            bestAlias
    };
}


/**
 * =========================================================
 * BUSCAR CANDIDATOS DE PRODUTO
 * =========================================================
 *
 * Retorna vários candidatos ordenados por confiança.
 *
 * IMPORTANTE:
 * A pesquisa continua limitada ao company_id.
 *
 * Agora o produto pode ser encontrado por:
 *
 * - nome;
 * - alias;
 * - variação aproximada do nome;
 * - variação aproximada do alias.
 */
async function getProductCandidates(
    companyId,
    productName,
    options = {}
) {

    if (
        !companyId ||
        !productName
    ) {

        return [];
    }


    const {
        minScore = 60,
        limit = 5
    } = options;


    try {

        /**
         * =====================================================
         * 1. BUSCAR PRODUTOS DA EMPRESA
         * =====================================================
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
                '❌ Erro ao buscar candidatos de produtos:',
                error
            );

            return [];
        }


        if (
            !data ||
            data.length === 0
        ) {

            return [];
        }


        /**
         * =====================================================
         * 2. BUSCAR ALIASES
         * =====================================================
         */
        const productIds =
            data.map(
                product =>
                    product.id
            );


        const aliases =
            await getProductAliases(
                companyId,
                productIds
            );


        /**
         * =====================================================
         * 3. AGRUPAR ALIASES POR PRODUTO
         * =====================================================
         */
        const aliasesByProduct =
            new Map();


        for (
            const alias
            of aliases
        ) {

            if (
                !aliasesByProduct.has(
                    alias.product_id
                )
            ) {

                aliasesByProduct.set(
                    alias.product_id,
                    []
                );
            }


            aliasesByProduct
                .get(alias.product_id)
                .push(alias);
        }


        /**
         * =====================================================
         * 4. CALCULAR CANDIDATOS
         * =====================================================
         */
        const candidates = [];


        for (
            const product
            of data
        ) {

            const productAliases =
                aliasesByProduct.get(
                    product.id
                ) || [];


            const match =
                calculateBestProductMatch(
                    productName,
                    product,
                    productAliases
                );


            if (
                match.score < minScore
            ) {

                continue;
            }


            const score =
                match.score;


            candidates.push({

                product,

                score,

                confidence:
                    Number(
                        (
                            score / 100
                        ).toFixed(2)
                    ),

                matchType:
                    score === 100
                        ? 'exact'
                        : score >= 94
                            ? 'strong'
                            : score >= 80
                                ? 'fuzzy'
                                : 'weak',

                /**
                 * Indica se o melhor match veio
                 * do nome ou de um alias.
                 */
                matchSource:
                    match.matchType,

                /**
                 * Preenchido somente quando
                 * o alias venceu o nome.
                 */
                matchedAlias:
                    match.matchedAlias

            });
        }


        /**
         * =====================================================
         * 5. ORDENAR POR CONFIANÇA
         * =====================================================
         */
        candidates.sort(
            (a, b) =>
                b.score -
                a.score
        );


        return candidates.slice(
            0,
            limit
        );

    } catch (error) {

        console.error(
            '❌ Erro inesperado ao buscar candidatos:',
            error
        );

        return [];
    }
}


/**
 * =========================================================
 * BUSCAR PRODUTO PELO NOME
 * =========================================================
 *
 * Mantém a função existente para não quebrar
 * o restante do sistema.
 *
 * Agora utiliza:
 *
 * - nome;
 * - aliases;
 * - fuzzy matching;
 * - proteção contra ambiguidade.
 */
async function getProductByName(
    companyId,
    productName
) {

    const candidates =
        await getProductCandidates(
            companyId,
            productName
        );


    if (
        !candidates.length
    ) {

        console.log(
            '❌ Nenhum produto encontrado para:',
            productName
        );

        return null;
    }


    const best =
        candidates[0];


    /**
     * =====================================================
     * SEGURANÇA CONTRA AMBIGUIDADE
     * =====================================================
     *
     * Se dois produtos possuem scores muito próximos,
     * não escolhemos arbitrariamente.
     *
     * Exemplo:
     *
     * Coca-Cola       86
     * Coca-Cola Zero  84
     *
     * Diferença = 2
     *
     * Nesse caso retornamos null.
     *
     * A mesma proteção continua funcionando quando
     * os matches vêm de aliases.
     */
    const second =
        candidates[1];


    if (
        second &&
        best.score < 95 &&
        (
            best.score -
            second.score
        ) < 5
    ) {

        console.log(
            `⚠️ Produto ambíguo: ` +
            `"${best.product.name}" (${best.score}) ` +
            `vs ` +
            `"${second.product.name}" (${second.score})`
        );

        return null;
    }


    /**
     * =====================================================
     * LOG DO MATCH
     * =====================================================
     */
    if (
        best.matchSource === 'alias'
    ) {

        console.log(
            `✅ Produto encontrado por alias: ` +
            `"${best.product.name}" ` +
            `via "${best.matchedAlias}" ` +
            `(score ${best.score}, ` +
            `confidence ${best.confidence})`
        );

    } else {

        console.log(
            `✅ Produto encontrado: ` +
            `"${best.product.name}" ` +
            `(score ${best.score}, ` +
            `confidence ${best.confidence})`
        );
    }


    return best.product;
}


module.exports = {
    getProductByName,
    getProductCandidates
};