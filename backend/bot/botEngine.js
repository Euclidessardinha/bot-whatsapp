const supabase = require('../lib/supabase');

const {
    getBotSettings
} = require('../services/botSettingsService');

const {
    getConversationState,
    updateConversationState,
    touchConversationActivity,
    clearConversationState
} = require('../services/conversationStateService');

const {
    getProductByName,
    getProductCandidates
} = require('../services/productService');

const {
    getServices,
    getServiceByName
} = require('../services/serviceService');

const {
    createOrder,
    addOrderItem,
    updateOrderTotal
} = require('../services/orderService');

const {
    createCustomerRequest
} = require('../services/requestService');

const {
    analyzeMessage
} = require('./intelligence/knowledgeEngine');


/**
 * =========================================================
 * EMPRESA
 * =========================================================
 */

async function getCompany(companyId) {

    if (!companyId) {
        return null;
    }

    const {
        data,
        error
    } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

    if (error) {

        console.error(
            'âŒ Erro ao buscar empresa:',
            error
        );

        return null;
    }

    return data;
}


/**
 * =========================================================
 * PRODUTOS
 * =========================================================
 */

async function getProducts(companyId) {

    if (!companyId) {
        return [];
    }

    const {
        data,
        error
    } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .eq('available', true)
        .order('name');

    if (error) {

        console.error(
            'âŒ Erro ao buscar produtos:',
            error
        );

        return [];
    }

    return data || [];
}


/**
 * =========================================================
 * AÃ‡Ã•ES DO MENU PRINCIPAL
 * =========================================================
 */

function getMainMenuActions(
    company,
    settings
) {

    const businessType =
        company.business_type || 'other';

    const actions = [];


    /*
     * =====================================================
     * EMPRESAS DE SERVIÃ‡OS
     * =====================================================
     */

    if (
        businessType === 'services'
    ) {

        if (
            settings.menu_enabled
        ) {

            actions.push({
                intent: 'services',
                label: 'Ver os nossos serviÃ§os'
            });
        }


        actions.push({
            intent: 'service_request',
            label: 'Solicitar um serviÃ§o / orÃ§amento'
        });

    }


    /*
     * =====================================================
     * EMPRESAS COM PRODUTOS / PEDIDOS
     * =====================================================
     */

    else {

        if (
            settings.menu_enabled
        ) {

            actions.push({
                intent: 'menu',
                label: 'Ver o menu'
            });
        }


        if (
            settings.orders_enabled
        ) {

            actions.push({
                intent: 'order',
                label: 'Fazer um pedido'
            });
        }
    }


    /*
     * =====================================================
     * LOCALIZAÃ‡ÃƒO
     * =====================================================
     */

    actions.push({
        intent: 'location',
        label: 'Ver localizaÃ§Ã£o'
    });


    /*
     * =====================================================
     * ATENDIMENTO HUMANO
     * =====================================================
     */

    if (
        settings.human_support_enabled
    ) {

        actions.push({
            intent: 'attendant',
            label: 'Falar com um atendente'
        });
    }


    return actions.map(
        (action, index) => ({
            ...action,
            number: String(index + 1)
        })
    );
}

/**
 * =========================================================
 * MENU PRINCIPAL
 * =========================================================
 */

function getMainMenu(
    company,
    settings
) {

    const welcomeMessage =
        company.welcome_message ||
        `ðŸ‘‹ OlÃ¡! Bem-vindo Ã  ${company.name}!`;

    const actions =
        getMainMenuActions(
            company,
            settings
        );

    let menu =
        `${welcomeMessage}\n\n` +
        'Como podemos ajudar?\n\n';


    for (
        const action of actions
    ) {

        menu +=
            `${action.number}ï¸âƒ£ ${action.label}\n`;
    }


    menu +=
        '\nDigite o nÃºmero da opÃ§Ã£o desejada.';


    return menu;
}


/**
 * =========================================================
 * MENU DE OPÃ‡Ã•ES
 * =========================================================
 */

function getMenuOptions(
    company,
    settings
) {

    const actions =
        getMainMenuActions(
            company,
            settings
        );

    let menu =
        'O que deseja fazer agora?\n\n';


    for (
        const action of actions
    ) {

        menu +=
            `${action.number}ï¸âƒ£ ${action.label}\n`;
    }


    return menu;
}


/**
 * =========================================================
 * MENU DE PRODUTOS
 * =========================================================
 */

async function showProductsMenu(
    companyId,
    companyName
) {

    const products =
        await getProducts(
            companyId
        );


    if (
        products.length === 0
    ) {

        return (
            'ðŸ˜• Neste momento nÃ£o existem ' +
            'produtos disponÃ­veis.'
        );
    }


    let resposta =
        `ðŸ” *MENU ${companyName.toUpperCase()}*\n\n`;


    products.forEach(
        (
            product,
            index
        ) => {

            resposta +=
                `${index + 1}. ${product.name} â€” ${product.price} MT\n`;
        }
    );


    resposta +=
        '\nDigite o nÃºmero ou nome do produto.';


    return resposta;
}


/**
 * =========================================================
 * MENU DE SERVIÃ‡OS
 * =========================================================
 */

async function showServicesMenu(
    companyId,
    companyName
) {

    const services =
        await getServices(
            companyId
        );


    if (
        services.length === 0
    ) {

        return (
            'ðŸ˜• Neste momento nÃ£o existem ' +
            'serviÃ§os disponÃ­veis.'
        );
    }


    let resposta =
        `ðŸŒ¿ *SERVIÃ‡OS ${companyName.toUpperCase()}*\n\n`;


    services.forEach(
        (
            service,
            index
        ) => {

            let price =
                'Sob orÃ§amento';


            if (
                service.price_type === 'fixed' &&
                service.price !== null
            ) {

                price =
                    `${service.price} MT`;
            }


            if (
                service.price_type === 'from' &&
                service.price !== null
            ) {

                price =
                    `A partir de ${service.price} MT`;
            }


            resposta +=
                `${index + 1}. ${service.name} â€” ${price}\n`;


            if (
                service.description
            ) {

                resposta +=
                    `   ${service.description}\n`;
            }
        }
    );


    resposta +=
        '\nDigite o nÃºmero ou nome do serviÃ§o.';


    return resposta;
}


/**
 * =========================================================
 * CARRINHO
 * =========================================================
 */

function calculateCartTotal(
    cart
) {

    if (
        !Array.isArray(cart) ||
        cart.length === 0
    ) {

        return 0;
    }


    return cart.reduce(
        (
            total,
            item
        ) => {

            return (
                total +
                Number(item.unit_price) *
                Number(item.quantity)
            );

        },
        0
    );
}


function formatCart(
    cart
) {

    if (
        !Array.isArray(cart) ||
        cart.length === 0
    ) {

        return 'ðŸ›’ O seu carrinho estÃ¡ vazio.';
    }


    let resposta =
        'ðŸ›’ *Resumo do pedido*\n\n';


    cart.forEach(
        (
            item,
            index
        ) => {

            const subtotal =
                Number(item.unit_price) *
                Number(item.quantity);


            resposta +=
                `${index + 1}. ${item.quantity}x ${item.product_name} â€” ${subtotal} MT\n`;
        }
    );


    const total =
        calculateCartTotal(
            cart
        );


    resposta +=
        `\nðŸ’µ *Total: ${total} MT*`;


    return resposta;
}


function addProductToCart(
    cart,
    product,
    quantity
) {

    const existingItem =
        cart.find(
            item =>
                item.product_id ===
                product.product_id
        );


    if (
        existingItem
    ) {

        existingItem.quantity +=
            quantity;


        existingItem.subtotal =
            Number(
                existingItem.unit_price
            ) *
            Number(
                existingItem.quantity
            );


        return cart;
    }


    cart.push({

        product_id:
            product.product_id,

        product_name:
            product.product_name,

        unit_price:
            Number(
                product.unit_price
            ),

        quantity,

        subtotal:
            Number(
                product.unit_price
            ) *
            quantity
    });


    return cart;
}


function removeProductFromCart(
    cart,
    index
) {

    if (
        !Array.isArray(cart) ||
        index < 0 ||
        index >= cart.length
    ) {

        return false;
    }


    cart.splice(
        index,
        1
    );


    return true;
}


function updateProductQuantity(
    cart,
    index,
    quantity
) {

    if (
        !Array.isArray(cart) ||
        index < 0 ||
        index >= cart.length
    ) {

        return false;
    }


    if (
        quantity <= 0
    ) {

        return removeProductFromCart(
            cart,
            index
        );
    }


    cart[index].quantity =
        quantity;


    cart[index].subtotal =
        Number(
            cart[index].unit_price
        ) *
        quantity;


    return true;
}


function formatCartForEditing(
    cart
) {

    if (
        !Array.isArray(cart) ||
        cart.length === 0
    ) {

        return (
            'ðŸ›’ O carrinho estÃ¡ vazio.\n\n' +
            'Adicione um produto primeiro.'
        );
    }


    let resposta =
        'âœï¸ *Alterar carrinho*\n\n';


    cart.forEach(
        (
            item,
            index
        ) => {

            resposta +=
                `${index + 1}. ${item.quantity}x ${item.product_name}\n`;
        }
    );


    resposta +=
        '\nDigite o nÃºmero do produto que deseja alterar.\n' +
        '0ï¸âƒ£ Voltar';


    return resposta;
}


/**
 * =========================================================
 * HORÃRIOS
 * =========================================================
 */

function formatBusinessHours(
    businessHours
) {

    if (
        !businessHours ||
        typeof businessHours !== 'object'
    ) {

        return (
            'ðŸ•’ O horÃ¡rio de funcionamento ' +
            'ainda nÃ£o foi configurado para esta empresa.'
        );
    }


    const days = [
        {
            key: 'monday',
            name: 'Segunda-feira'
        },
        {
            key: 'tuesday',
            name: 'TerÃ§a-feira'
        },
        {
            key: 'wednesday',
            name: 'Quarta-feira'
        },
        {
            key: 'thursday',
            name: 'Quinta-feira'
        },
        {
            key: 'friday',
            name: 'Sexta-feira'
        },
        {
            key: 'saturday',
            name: 'SÃ¡bado'
        },
        {
            key: 'sunday',
            name: 'Domingo'
        }
    ];


    let resposta = '';


    days.forEach(day => {

        const schedule =
            businessHours[day.key];


        if (
            !schedule
        ) {

            resposta +=
                `ðŸ“… ${day.name}: NÃ£o configurado\n`;

            return;
        }


        if (
            schedule.closed
        ) {

            resposta +=
                `ðŸš« ${day.name}: Fechado\n`;

            return;
        }


        const open =
            schedule.open || '--:--';

        const close =
            schedule.close || '--:--';


        resposta +=
            `ðŸ“… ${day.name}: ${open} - ${close}\n`;
    });


    return resposta.trim();
}


function getCurrentBusinessStatus(
    businessHours
) {

    if (
        !businessHours ||
        typeof businessHours !== 'object'
    ) {

        return {
            configured: false,
            isOpen: false
        };
    }


    const dayNames = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday'
    ];


    const now =
        new Date();


    const currentDay =
        dayNames[now.getDay()];


    const today =
        businessHours[currentDay];


    if (
        !today
    ) {

        return {
            configured: false,
            isOpen: false
        };
    }


    if (
        today.closed
    ) {

        return {
            configured: true,
            isOpen: false,
            day: currentDay,
            schedule: today
        };
    }


    if (
        !today.open ||
        !today.close
    ) {

        return {
            configured: false,
            isOpen: false,
            day: currentDay,
            schedule: today
        };
    }


    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();


    const [openHour, openMinute] =
        today.open
            .split(':')
            .map(Number);


    const [closeHour, closeMinute] =
        today.close
            .split(':')
            .map(Number);


    const openMinutes =
        openHour * 60 +
        openMinute;


    const closeMinutes =
        closeHour * 60 +
        closeMinute;


    return {
        configured: true,

        isOpen:
            currentMinutes >= openMinutes &&
            currentMinutes < closeMinutes,

        day: currentDay,

        schedule: today
    };
}


function getNextOpening(
    businessHours
) {

    if (
        !businessHours ||
        typeof businessHours !== 'object'
    ) {

        return null;
    }


    const dayNames = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday'
    ];


    const dayLabels = {
        sunday: 'Domingo',
        monday: 'Segunda-feira',
        tuesday: 'TerÃ§a-feira',
        wednesday: 'Quarta-feira',
        thursday: 'Quinta-feira',
        friday: 'Sexta-feira',
        saturday: 'SÃ¡bado'
    };


    const now =
        new Date();


    const currentDayIndex =
        now.getDay();


    for (
        let offset = 1;
        offset <= 7;
        offset++
    ) {

        const dayIndex =
            (
                currentDayIndex +
                offset
            ) % 7;


        const day =
            dayNames[dayIndex];


        const schedule =
            businessHours[day];


        if (
            !schedule ||
            schedule.closed ||
            !schedule.open
        ) {

            continue;
        }


        return {
            day: dayLabels[day],
            open: schedule.open,
            close: schedule.close
        };
    }


    return null;
}


/**
 * =========================================================
 * EXPIRAÃ‡ÃƒO
 * =========================================================
 */

const CONVERSATION_TIMEOUT_MINUTES = 60;


function hasConversationExpired(
    updatedAt
) {

    if (!updatedAt) {
        return true;
    }


    const lastActivity =
        new Date(updatedAt);


    const now =
        new Date();


    const differenceMinutes =
        (
            now.getTime() -
            lastActivity.getTime()
        ) /
        (1000 * 60);


    return (
        differenceMinutes >=
        CONVERSATION_TIMEOUT_MINUTES
    );
}


/**
 * =========================================================
 * INTERRUPÃ‡Ã•ES
 * =========================================================
 */

function shouldInterruptConversation(
    intent
) {

    const interruptingIntents = [

        'greeting',
        'cancel',
        'help',
        'goodbye',
        'menu',
        'order',
        'services',
        'service_request',
        'location',
        'hours',
        'price',
        'attendant'
    ];


    return interruptingIntents.includes(
        intent
    );
}


/**
 * =========================================================
 * RESOLUÃ‡ÃƒO INTELIGENTE DE PRODUTO
 * =========================================================
 */

async function resolveProductCandidate(
    companyId,
    productCandidate
) {

    if (
        !companyId ||
        !productCandidate
    ) {

        return null;
    }


    const candidate =
        String(
            productCandidate
        )
            .trim();


    if (!candidate) {
        return null;
    }


    try {

        const product =
            await getProductByName(
                companyId,
                candidate
            );


        return product || null;

    } catch (error) {

        console.error(
            'âŒ Erro ao resolver produto:',
            error
        );

        return null;
    }
}


function extractQuantityProductCandidate(text) {

    if (!text) {
        return null;
    }

    let candidate =
        String(text)
            .trim()
            .toLowerCase();

    candidate =
        candidate
            .replace(
                /^(fica|ficar|deixa|deixar|passa|passar|muda|mudar|altera|alterar)\s+/i,
                ''
            );

    candidate =
        candidate
            .replace(
                /^s[oó]\s+/i,
                ''
            );

    candidate =
        candidate
            .replace(
                /^\d+\s+/i,
                ''
            );

    candidate =
        candidate
            .replace(
                /^(para|pra|com)\s+/i,
                ''
            );

    candidate =
        candidate
            .trim();

    return candidate || null;
}



/**
 * =========================================================
 * RESOLUÃ‡ÃƒO INTELIGENTE DE SERVIÃ‡O
 * =========================================================
 *
 * O serviceService Ã© responsÃ¡vel por procurar:
 *
 * 1. nome real do serviÃ§o
 * 2. alias da empresa
 *
 * Sempre utilizando companyId.
 * =========================================================
 */

async function resolveServiceCandidate(
    companyId,
    serviceCandidate
) {

    if (
        !companyId ||
        !serviceCandidate
    ) {

        return null;
    }


    const candidate =
        String(
            serviceCandidate
        )
            .trim();


    if (!candidate) {
        return null;
    }


    try {

        const service =
            await getServiceByName(
                companyId,
                candidate
            );


        return service || null;

    } catch (error) {

        console.error(
            'âŒ Erro ao resolver serviÃ§o:',
            error
        );

        return null;
    }
}


/**
 * =========================================================
 * NORMALIZA QUANTIDADE
 * =========================================================
 */

function getIntelligenceQuantity(
    intelligence
) {

    const entityQuantity =
        intelligence?.entities?.quantity;

    let quantity =
        entityQuantity;

    /*
     * Algumas ações estruturadas, como
     * change_quantity, carregam a quantidade
     * diretamente dentro da própria action.
     *
     * Exemplo:
     *
     * {
     *   type: "change_quantity",
     *   quantity: 1,
     *   target: {
     *      type: "candidate",
     *      value: "chicken"
     *   }
     * }
     *
     * Se entities.quantity não existir,
     * usamos a quantidade da ação estruturada.
     */
    if (
        quantity === null ||
        quantity === undefined
    ) {

        const changeQuantityAction =
            Array.isArray(
                intelligence?.actions
            )
                ? intelligence.actions.find(
                    action =>
                        action?.type ===
                        'change_quantity'
                )
                : null;

        quantity =
            changeQuantityAction?.quantity;
    }


    if (
        quantity === null ||
        quantity === undefined
    ) {

        return null;
    }


    const parsed =
        parseInt(
            quantity,
            10
        );


    if (
        isNaN(parsed) ||
        parsed <= 0
    ) {

        return null;
    }


    return parsed;
}


/**
 * =========================================================
 * MEMÃ“RIA CONTEXTUAL DE PRODUTO
 * =========================================================
 */

function createProductContext(product) {

    if (!product) {
        return null;
    }

    return {
        product_id:
            product.product_id || product.id,

        product_name:
            product.product_name || product.name,

        unit_price:
            Number(
                product.unit_price ?? product.price ?? 0
            )
    };
}


function getLastProduct(context) {

    if (
        context?.lastProduct
    ) {
        return context.lastProduct;
    }

    if (
        context?.currentProduct
    ) {
        return context.currentProduct;
    }

    if (
        context?.product_id &&
        context?.product_name
    ) {
        return {
            product_id:
                context.product_id,

            product_name:
                context.product_name,

            unit_price:
                Number(
                    context.unit_price || 0
                )
        };
    }

    return null;
}


/**
 * =========================================================
 * RESOLUÃ‡ÃƒO DE REFERÃŠNCIAS CONTEXTUAIS
 * =========================================================
 */

function isContextualProductReference(text) {

    if (!text) {
        return false;
    }

    const value =
        String(text)
            .toLowerCase()
            .trim();

    return (

        // Referências diretas
        /^(esse|essa|aquele|aquela)$/i.test(value) ||

        // Referências com produto/item
        /^(esse|essa|aquele|aquela)\s+(produto|item)$/i.test(value) ||

        // Referências com "mesmo"
        /^(esse|essa|aquele|aquela)\s+(mesmo|mesma)$/i.test(value) ||

        /^(o|a)\s+mesm[oa]$/i.test(value) ||

        // Ações + referência
        /^(quero|manda|adiciona|adicionar|coloca|pega|vou querer)\s+(esse|essa|aquele|aquela)$/i.test(value) ||

        /^(quero|manda|adiciona|adicionar|coloca|pega|vou querer)\s+(esse|essa|aquele|aquela)\s+(produto|item)$/i.test(value) ||

        // "mais desse", "mais daquele", etc.
        /^(mais|adiciona mais|quero mais|manda mais)\s+(desse|dessa|daquele|daquela)$/i.test(value) ||

        /^(mais|adiciona mais|quero mais|manda mais)\s+(desse|dessa|daquele|daquela)\s+(produto|item)$/i.test(value) ||

        // Referência ao último produto
        /^(o|a)?\s*últim[oa]$/i.test(value) ||

        /^(o|a)?\s*últim[oa]\s+(produto|item)$/i.test(value) ||

        // "aquele de antes", etc.
        /^(esse|essa|aquele|aquela)\s+(de\s+antes|anterior)$/i.test(value) ||

        /^(remove|remover|tira|tirar|retira|retirar|exclui|excluir)\s+(esse|essa|aquele|aquela)$/i.test(value) ||

        /^(remove|remover|tira|tirar|retira|retirar|exclui|excluir)\s+(esse|essa|aquele|aquela)\s+(produto|item)$/i.test(value)

    );
}


function resolveContextualProduct(
    context,
    text
) {

    if (
        !isContextualProductReference(text)
    ) {
        return null;
    }

    const lastProduct =
        getLastProduct(context);

    if (!lastProduct) {
        return null;
    }

    return lastProduct;
}


/**
 * =========================================================
 * DETECÇÃO DE AÇÃO COMPOSTA NO CARRINHO
 * =========================================================
 */

function isCompositeCartAction(text) {

    if (!text) {
        return false;
    }

    const value =
        String(text)
            .toLowerCase()
            .trim();

    return (
        /^(remove|remover|tira|tirar|retira|retirar|exclui|excluir)\b/i.test(value) &&
        /\b(e|depois)\b/i.test(value)
    );
}


/**
 * =========================================================
 * EXTRAIR AÇÕES COMPOSTAS DO CARRINHO
 * =========================================================
 */

function parseCompositeCartAction(text) {

    if (!text) {
        return null;
    }

    const value =
        String(text)
            .toLowerCase()
            .trim();

    const match =
        value.match(
            /^(remove|remover|tira|tirar|retira|retirar|exclui|excluir)\s+(.+?)\s+(e|depois)\s+(adiciona|adicionar|coloca|colocar|manda|mandar)\s+(.+)$/i
        );

    if (!match) {
        return null;
    }

    return {
        removeTarget:
            match[2].trim(),

        addTarget:
            match[5].trim()
    };
}


/**
 * =========================================================
 * DETECÃ‡ÃƒO DE CONFIRMAÃ‡ÃƒO
 * =========================================================
 */

function isPositiveConfirmation(text) {

    if (!text) return false;

    return /^(sim|s|yes|pode|podes|quero|quero sim|pode ser|claro|ok|okay|adiciona|adicionar|manda|manda vir)$/i
        .test(String(text).trim());
}


function isNegativeConfirmation(text) {

    if (!text) return false;

    return /^(nÃ£o|nao|n|no|nÃ£o quero|nao quero|deixa|deixa estar|cancelar|cancela)$/i
        .test(String(text).trim());
}


/**
 * =========================================================
 * QUANTIDADE + REFERÃŠNCIA CONTEXTUAL
 * =========================================================
 */

function extractContextualQuantity(text) {

    if (!text) return null;

    const value = String(text)
        .toLowerCase()
        .trim();

    const match = value.match(
        /\b(\d+|um|uma|dois|duas|tres|trÃªs|quatro|cinco|seis|sete|oito|nove|dez)\b/
    );

    if (!match) return null;

    const numbers = {
        um: 1,
        uma: 1,
        dois: 2,
        duas: 2,
        tres: 3,
        trÃªs: 3,
        quatro: 4,
        cinco: 5,
        seis: 6,
        sete: 7,
        oito: 8,
        nove: 9,
        dez: 10
    };

    const valueFound = match[1];

    return numbers[valueFound] || parseInt(valueFound, 10);
}


function rememberProduct(
    context,
    product
) {

    const productContext =
        createProductContext(product);


    if (!productContext) {
        return context;
    }


    return {
        ...context,

        lastProduct:
            productContext,

        currentProduct:
            productContext
    };
}


function getCartProductIndex(
    cart,
    productId
) {

    if (
        !Array.isArray(cart) ||
        !productId
    ) {
        return -1;
    }


    return cart.findIndex(
        item =>
            String(item.product_id) ===
            String(productId)
    );
}


async function processAddProductActions(
    actions,
    companyId,
    conversationId,
    context
) {
    if (
        !Array.isArray(actions) ||
        actions.length === 0 ||
        !companyId
    ) {
        return null;
    }

    const addActions = actions.filter(
        action =>
            action &&
            action.type === 'add_product' &&
            action.candidate
    );

    if (!addActions.length) {
        return null;
    }

    let cart = Array.isArray(context?.cart)
        ? context.cart
        : [];

    const resolvedProducts = [];

    // Primeiro resolve TODOS os produtos.
    // Só depois altera o carrinho.
    for (const action of addActions) {
        const product =
            await resolveProductCandidate(
                companyId,
                action.candidate
            );

        if (!product) {
            console.warn(
                '⚠️ Ação add_product não pôde ser resolvida:',
                {
                    companyId,
                    candidate: action.candidate
                }
            );

            return {
                handled: true,
                response: null
            };
        }

        const productContext =
            createProductContext(product);

        if (!productContext?.product_id) {
            console.warn(
                '⚠️ Produto resolvido sem product_id:',
                product
            );

            return {
                handled: true,
                response: null
            };
        }

        const actionQuantity =
            Number(action.quantity);

        const quantity =
            Number.isFinite(actionQuantity) &&
            actionQuantity > 0
                ? actionQuantity
                : 1;

        resolvedProducts.push({
            productContext,
            quantity
        });
    }

    // Agora adiciona todos os produtos ao carrinho.
    for (const item of resolvedProducts) {
        cart = addProductToCart(
            cart,
            item.productContext,
            item.quantity
        );
    }

    const lastAdded =
        resolvedProducts[
            resolvedProducts.length - 1
        ].productContext;

    const newContext =
        rememberProduct(
            {
                ...context,
                cart,
                awaitingConfirmation: false
            },
            lastAdded
        );

    const total = calculateCartTotal(cart);

    await updateConversationState(
        companyId,
        conversationId,
        'cart_menu',
        {
            ...newContext,
            total
        }
    );

    const addedSummary =
        resolvedProducts
            .map(
                item =>
                    `• ${item.quantity}x ${item.productContext.product_name}`
            )
            .join('\n');

    return {
        handled: true,
        response:
            `✅ Adicionei ao pedido:\n\n` +
            `${addedSummary}\n\n` +
            `${formatCart(cart)}\n\n` +
            `💵 *Total: ${total} MT*\n\n` +
            'Deseja adicionar mais alguma coisa ou finalizar o pedido?'
    };
}



/**
 * =========================================================
 * PROCESSAMENTO PRINCIPAL
 * =========================================================
 */

async function processMessage(
    messageText,
    companyId,
    conversationId
) {

    const rawMessage =
        String(messageText || '').trim();


    if (!rawMessage) {
        return null;
    }


    /**
     * =====================================================
     * ESTADO DA CONVERSA
     * =====================================================
     */

    let conversationState =
        await getConversationState(
            companyId,
            conversationId
        );


    let state =
        conversationState?.state ||
        'idle';


    let context =
        conversationState?.context ||
        {};


    /**
     * =====================================================
     * EXPIRAÃ‡ÃƒO
     * =====================================================
     */

    if (
        conversationState &&
        hasConversationExpired(
            conversationState.updated_at
        )
    ) {

        await clearConversationState(
            companyId,
            conversationId
        );


        conversationState =
            null;


        state =
            'idle';


        context =
            {};
    }


    /**
     * Atualiza atividade da conversa.
     */

    if (
        conversationState
    ) {

        await touchConversationActivity(
            companyId,
            conversationId
        );
    }


    /**
     * =====================================================
     * EMPRESA
     * =====================================================
     */

    const company =
        await getCompany(
            companyId
        );


    if (
        !company
    ) {

        console.error(
            'âŒ Empresa nÃ£o encontrada:',
            companyId
        );

        return null;
    }


    /**
     * =====================================================
     * CONFIGURAÃ‡Ã•ES DO BOT
     * =====================================================
     */

    const settings =
        await getBotSettings(
            companyId
        );


    if (
        !settings
    ) {

        console.error(
            'âŒ ConfiguraÃ§Ãµes do bot nÃ£o encontradas.'
        );

        return null;
    }


    /**
     * =====================================================
     * BOT DESATIVADO
     * =====================================================
     */

    if (
        !settings.bot_enabled ||
        settings.admin_bot_enabled === false
    ) {

        return null;
    }


    const businessType =
        company.business_type || 'other';


    /**
     * =====================================================
     * CENTRO DE INTELIGÃŠNCIA CONVERSACIONAL
     * =====================================================
     */

    const intelligence =
        analyzeMessage({

            message:
                rawMessage,

            state,

            context
        });


    /**
     * =====================================================
     * ENTIDADES EXTRAÃDAS PELO CÃ‰REBRO
     * =====================================================
     */

    const entities =
        intelligence.entities || {};


    let productCandidate =
        entities.productCandidate ||
        null;


  /*
 * Algumas frases naturais de alteração de quantidade,
 * como "fica só 1 chicken", podem ser classificadas
 * corretamente como change_quantity, mas o cérebro
 * não preencher entities.productCandidate.
 *
 * Nesse caso, extraímos o produto da própria mensagem.
 */
if (
    !productCandidate &&
    intelligence.behavior === 'change_quantity'
) {

    const quantityProductMatch =
        rawMessage.match(
            /(?:fica|ficar|deixa|deixar|mantem|mantém|passa|passar)\s+(?:so|só)\s*\d+\s+(.+)$/i
        ) ||
        rawMessage.match(
            /(?:fica|ficar|deixa|deixar|mantem|mantém|passa|passar)\s+\d+\s+(.+)$/i
        ) ||
        rawMessage.match(
            /^(?:so|só)\s*\d+\s+(.+)$/i
        );

    if (
        quantityProductMatch?.[1]
    ) {

        productCandidate =
            quantityProductMatch[1]
                .trim()
                .replace(/[.!?,]+$/, '')
                .trim();
    }
}

    const serviceCandidate =
        entities.serviceCandidate ||
        null;


    const intelligenceQuantity =
        getIntelligenceQuantity(
            intelligence
        );

    const compositeCartAction =
    parseCompositeCartAction(
        rawMessage
    );    


    const intelligenceActions =
    Array.isArray(intelligence.actions)
        ? intelligence.actions
        : [];

const changeQuantityAction =
    intelligenceActions.find(
        action =>
            action?.type === 'change_quantity'
    );


const hasAddProductActions =
    intelligenceActions.some(
        action =>
            action?.type === 'add_product' &&
            action?.candidate
    );

console.log(
    '🧠 INTELLIGENCE ACTIONS:',
    JSON.stringify(
        intelligenceActions,
        null,
        2
    )
);


    console.log(
    "DEBUG COMPOSITE CART ACTION:",
    JSON.stringify(compositeCartAction, null, 2)
);


    let texto =
        intelligence.normalizedText;


    let intent =
        String(
            intelligence.intent || 'unknown'
        ).toLowerCase();


    /**
     * =====================================================
     * REFERÃŠNCIA CONTEXTUAL DE PRODUTO
     * =====================================================
     */

    let contextualProduct =
        resolveContextualProduct(
            context,
            texto
        );


    let resolvedProductCandidate =
    productCandidate;


/*
 * Algumas alterações de quantidade são detectadas
 * corretamente em intelligence.actions, mesmo quando
 * entities.productCandidate permanece vazio.
 *
 * Exemplo:
 * "fica só 1 chicken"
 *
 * Nesse caso, usamos o produto indicado pela própria
 * ação change_quantity.
 */
if (
    !resolvedProductCandidate
) {
    const changeQuantityAction =
        intelligenceActions.find(
            action =>
                action?.type === 'change_quantity'
        );

    if (
        changeQuantityAction?.target?.value
    ) {
        resolvedProductCandidate =
            changeQuantityAction.target.value;
    }
}


if (
    !resolvedProductCandidate &&
    contextualProduct
) {

    resolvedProductCandidate =
        contextualProduct.product_name;
}


    /**
     * Compatibilidade com nomes antigos.
     */

    if (
        intent === 'service'
    ) {

        intent = 'services';
    }


    if (
        intent === 'human'
    ) {

        intent = 'attendant';
    }


    /**
     * Log temporÃ¡rio do cÃ©rebro.
     */

    console.log(
        'ðŸ§  INTELIGÃŠNCIA CONVERSACIONAL:',
        {
            message: rawMessage,
            state,
            context,
            intent,
            situation:
                intelligence.situation,
            behavior:
                intelligence.behavior,
            confidence:
                intelligence.confidence,
            entities
        }
    );


    /**
     * =====================================================
     * PROTEGER FLUXOS DESATIVADOS
     * =====================================================
     */

    const menuStates = [
        'viewing_menu',
        'viewing_services',
        'viewing_service'
    ];


    const orderStates = [
        'waiting_product',
        'waiting_quantity',
        'cart_menu',
        'editing_cart',
        'editing_cart_item',
        'confirming_order',
        'service_request'
    ];


    if (
        !settings.menu_enabled &&
        menuStates.includes(state)
    ) {

        await clearConversationState(
            companyId,
            conversationId
        );


        return (
            'â„¹ï¸ O menu e a consulta de produtos ou serviÃ§os ' +
            'nÃ£o estÃ£o disponÃ­veis neste momento.'
        );
    }


    if (
        !settings.orders_enabled &&
        orderStates.includes(state)
    ) {

        await clearConversationState(
            companyId,
            conversationId
        );


        return (
            'â„¹ï¸ Os pedidos e solicitaÃ§Ãµes estÃ£o ' +
            'temporariamente desativados.\n\n' +
            'Pode continuar a consultar as informaÃ§Ãµes da empresa.'
        );
    }


    /**
 * =====================================================
 * SAUDAÃ‡ÃƒO
 * =====================================================
 */

if (
    intent === 'greeting'
) {

    await clearConversationState(
        companyId,
        conversationId
    );


    state = 'idle';
    context = {};


    const welcomeMessage =
        company.welcome_message ||
        `👋 Olá! Bem-vindo à ${company.name}!`;


    return (
        `${welcomeMessage}\n\n` +
        'Como posso ajudar?'
    );
}


    /**
     * =====================================================
     * CANCELAMENTO
     * =====================================================
     */

    if (
        intent === 'cancel'
    ) {

        await clearConversationState(
            companyId,
            conversationId
        );


        return (
            'âŒ A operação atual foi cancelada.\n\n' +
            getMainMenu(
                company,
                settings
            )
        );
    }


    /**
     * =====================================================
     * AJUDA
     * =====================================================
     */

    if (
        intent === 'help'
    ) {

        await clearConversationState(
            companyId,
            conversationId
        );


        return getMainMenu(
            company,
            settings
        );
    }


    /**
     * =====================================================
     * INTERRUPÃ‡ÃƒO DE FLUXO
     * =====================================================
     */

    if (
        state !== 'idle' &&
        shouldInterruptConversation(intent) &&
        state !== 'service_request' &&
        !(
            state === 'cart_menu' &&
            compositeCartAction
        )
    ) {

        console.log(
            `ðŸ”„ Interrompendo fluxo "${state}" ` +
            `para tratar "${intent}".`
        );


        await clearConversationState(
            companyId,
            conversationId
        );


        state = 'idle';
        context = {};
    }

    
    /**
 * =====================================================
 * PROCESSAMENTO DE MÚLTIPLAS AÇÕES DE PRODUTO
 * =====================================================
 *
 * Exemplo:
 *
 * "Quero chicken e batata"
 *
 * intelligence.actions:
 * [
 *   {
 *     type: 'add_product',
 *     candidate: 'chicken',
 *     quantity: null
 *   },
 *   {
 *     type: 'add_product',
 *     candidate: 'batata',
 *     quantity: null
 *   }
 * ]
 *
 * Cada produto é resolvido separadamente usando
 * companyId para preservar o isolamento multiempresa.
 */

if (
    hasAddProductActions &&
    businessType !== 'services' &&
    settings.orders_enabled
) {

    const addProductResult =
        await processAddProductActions(
            intelligenceActions,
            companyId,
            conversationId,
            context
        );

    if (
        addProductResult?.handled
    ) {

        /**
         * Se alguma ação não puder ser resolvida,
         * permanecemos em silêncio.
         */
        if (
            !addProductResult.response
        ) {
            return null;
        }

        return addProductResult.response;
    }
}




    /**
     * =====================================================
     * CONSULTA DE PREÃ‡O DE PRODUTO
     * =====================================================
     */

    if (
        productCandidate &&
        (
            intent === 'price' ||
            /quanto custa|qual o preco|qual o valor|quanto e/i
                .test(texto)
        )
    ) {

        const product =
            await resolveProductCandidate(
                companyId,
                productCandidate
            );


        if (!product) {

            return (
                `ðŸ¤” NÃ£o encontrei *${productCandidate}* no nosso menu.`
            );

        }


        return (
            `ðŸ” *${product.name}*\n\n` +
            `ðŸ’° PreÃ§o: *${product.price} MT*`
        );
    }


    /**
     /**
 * =====================================================
 * CONSULTA DE DISPONIBILIDADE
 * =====================================================
 */

if (
    productCandidate &&
    (
        /^(tem|tens)\s+/i.test(texto) ||
        /voces tem/i.test(texto) ||
        /voce tem/i.test(texto)
    )
) {

        const product =
        await resolveProductCandidate(
            companyId,
            productCandidate
        );


    if (product) {

        return (
            `✅ Sim, temos *${product.name}*.\n\n` +
            `💰 Preço: *${product.price} MT*\n\n` +
            'Deseja adicionar ao pedido?'
        );

    }


    const candidates =
        await getProductCandidates(
            companyId,
            productCandidate,
            {
                minScore: 60,
                limit: 5
            }
        );


    if (
        !candidates ||
        candidates.length === 0
    ) {

        return (
            `❌ Não temos *${productCandidate}* disponível no menu.`
        );

    }


    if (
        candidates.length === 1
    ) {

        const candidate =
            candidates[0]?.product;

        if (!candidate) {

            return (
                `❌ Não foi possível identificar o produto *${productCandidate}*.`
            );

        }

        return (
            `🤔 Talvez esteja a procurar *${candidate.name}*.\n\n` +
            `💰 Preço: *${candidate.price} MT*\n\n` +
            'É esse produto que deseja?'
        );

    }


    const options =
        candidates
            .filter(candidate => candidate?.product)
            .map(
                (candidate, index) => {

                    const product =
                        candidate.product;

                    return (
                        `${index + 1}️⃣ *${product.name}* — ${product.price} MT`
                    );
                }
            )
            .join('\n');


    return (
    `✅ Sim, temos opções de *${productCandidate}* no nosso menu:\n\n` +
    `${options}\n\n` +
    `Qual deseja?`
);

}

    /**
     * =====================================================
     * RESOLUÃ‡ÃƒO DE PRODUTO POR CONTEXTO
     * =====================================================
     */

    if (
        contextualProduct &&
        !productCandidate &&
        businessType !== 'services' &&
        settings.orders_enabled
    ) {

        const product =
            await resolveProductCandidate(
                companyId,
                contextualProduct.product_name
            );


        if (product) {

            const productContext =
                createProductContext({
                    id:
                        product.id,

                    name:
                        product.name,

                    price:
                        product.price
                });


            if (intelligenceQuantity) {

                const currentCart =
                    Array.isArray(context.cart)
                        ? context.cart
                        : [];


                const cart =
                    addProductToCart(
                        currentCart,
                        productContext,
                        intelligenceQuantity
                    );


                const newContext =
                    rememberProduct(
                        {
                            ...context,
                            cart
                        },
                        productContext
                    );


                const total =
                    calculateCartTotal(
                        cart
                    );


                await updateConversationState(
                    companyId,
                    conversationId,
                    'cart_menu',
                    {
                        ...newContext,
                        total
                    }
                );


                return (
                    `âœ… Adicionei *${product.name}* ` +
                    `(${intelligenceQuantity}x) ao seu pedido.\n\n` +
                    `${formatCart(cart)}\n\n` +
                    `ðŸ’µ Total: *${total} MT*`
                );
            }


            await updateConversationState(
                companyId,
                conversationId,
                'waiting_quantity',
                {
                    ...context,

                    lastProduct:
                        productContext,

                    currentProduct:
                        productContext,

                    cart:
                        Array.isArray(context.cart)
                            ? context.cart
                            : []
                }
            );


            return (
                `ðŸ” *${product.name}*\n\n` +
                `ðŸ’° PreÃ§o: *${product.price} MT*\n\n` +
                `Quantas unidades deseja?`
            );
        }
    }


    /**
     * =====================================================
     * CONFIRMAÃ‡ÃƒO CONTEXTUAL
     * =====================================================
     */

    if (
        context.awaitingConfirmation === true &&
        isPositiveConfirmation(texto)
    ) {

        const confirmedProduct =
            getLastProduct(context);


        if (confirmedProduct) {

            const currentCart =
                Array.isArray(context.cart)
                    ? context.cart
                    : [];


            const cart =
                addProductToCart(
                    currentCart,
                    confirmedProduct,
                    1
                );


            const newContext =
                rememberProduct(
                    {
                        ...context,
                        cart,
                        awaitingConfirmation: false
                    },
                    confirmedProduct
                );


            const total =
                calculateCartTotal(
                    cart
                );


            await updateConversationState(
                companyId,
                conversationId,
                'cart_menu',
                {
                    ...newContext,
                    total
                }
            );


            return (
                `âœ… Adicionei *${confirmedProduct.product_name}* ao seu pedido.\n\n` +
                `${formatCart(cart)}\n\n` +
                `ðŸ’µ Total: *${total} MT*\n\n` +
                `Deseja adicionar mais alguma coisa ou finalizar o pedido?`
            );
        }
    }


    /**
     * =====================================================
     * RECUSA DE CONFIRMAÃ‡ÃƒO
     * =====================================================
     */

    if (
        context.awaitingConfirmation === true &&
        isNegativeConfirmation(texto)
    ) {

        await updateConversationState(
            companyId,
            conversationId,
            'viewing_product',
            {
                ...context,
                awaitingConfirmation: false
            }
        );


        return (
            `Tudo bem ðŸ‘ NÃ£o adicionei esse produto.\n\n` +
            `Posso ajudar com mais alguma coisa?`
        );
    }


    /**
     * =====================================================
     * REFERÃŠNCIA CONTEXTUAL + QUANTIDADE
     * =====================================================
     */

    const contextualQuantity =
        extractContextualQuantity(
            texto
        );


    if (
        contextualProduct &&
        contextualQuantity &&
        businessType !== 'services' &&
        settings.orders_enabled
    ) {

        const product =
            await resolveProductCandidate(
                companyId,
                contextualProduct.product_name
            );


        if (product) {

            const productContext =
                createProductContext({
                    id:
                        product.id,

                    name:
                        product.name,

                    price:
                        product.price
                });


            const currentCart =
                Array.isArray(context.cart)
                    ? context.cart
                    : [];


            const cart =
                addProductToCart(
                    currentCart,
                    productContext,
                    contextualQuantity
                );


            const newContext =
                rememberProduct(
                    {
                        ...context,
                        cart,
                        awaitingConfirmation: false
                    },
                    productContext
                );


            const total =
                calculateCartTotal(
                    cart
                );


            await updateConversationState(
                companyId,
                conversationId,
                'cart_menu',
                {
                    ...newContext,
                    total
                }
            );


            return (
                `âœ… Adicionei *${contextualQuantity}x ${product.name}* ao seu pedido.\n\n` +
                `${formatCart(cart)}\n\n` +
                `ðŸ’µ Total: *${total} MT*\n\n` +
                `Deseja adicionar mais alguma coisa ou finalizar o pedido?`
            );
        }
    }


    /**
     * =====================================================
     * RESOLUÃ‡ÃƒO INTELIGENTE DE PRODUTO
     * =====================================================
     */

    if (
    productCandidate &&
    !compositeCartAction &&
    intelligence.behavior !== 'remove_product' &&
    intelligence.behavior !== 'change_quantity' &&
    !entities.removeAction &&
    businessType !== 'services' &&
    settings.orders_enabled
) {

        const product =
            await resolveProductCandidate(
                companyId,
                productCandidate
            );


        if (product) {

            const productContext =
                createProductContext({
                    id:
                        product.id,

                    name:
                        product.name,

                    price:
                        product.price
                });


            if (
                intelligenceQuantity
            ) {

                const currentCart =
                    Array.isArray(context.cart)
                        ? context.cart
                        : [];


                const cart =
                    addProductToCart(
                        currentCart,
                        productContext,
                        intelligenceQuantity
                    );


                const newContext =
                    rememberProduct(
                        {
                            ...context,
                            cart
                        },
                        productContext
                    );


                const total =
                    calculateCartTotal(
                        cart
                    );


                await updateConversationState(
                    companyId,
                    conversationId,

                    'cart_menu',

                    {
                        ...newContext,
                        total
                    }
                );


                return (
                    `âœ… *${intelligenceQuantity}x ${product.name}* ` +
                    'adicionado ao pedido.\n\n' +

                    `${formatCart(cart)}\n\n` +

                    'O que deseja fazer?\n\n' +

                    '1ï¸âƒ£ Adicionar outro produto\n' +
                    '2ï¸âƒ£ Finalizar pedido\n' +
                    '3ï¸âƒ£ Alterar carrinho\n' +
                    '4ï¸âƒ£ Cancelar pedido'
                );
            }


            const newContext =
                rememberProduct(
                    {
                        ...context
                    },
                    productContext
                );


            await updateConversationState(
                companyId,
                conversationId,

                'waiting_quantity',

                {
                    ...newContext,

                    cart:
                        Array.isArray(context.cart)
                            ? context.cart
                            : []
                }
            );


            return (
                `ðŸ” *${product.name}*\n\n` +
                `ðŸ’° PreÃ§o: ${product.price} MT\n\n` +
                'Quantas unidades deseja?'
            );
        }
    }


    /**
     * =====================================================
     * NÃšMERO DO MENU PRINCIPAL
     * =====================================================
     */

    if (
        state === 'idle'
    ) {

        const menuActions =
            getMainMenuActions(
                company,
                settings
            );


        const selectedAction =
            menuActions.find(
                action =>
                    action.number === texto
            );


        if (
            selectedAction
        ) {

            intent =
                selectedAction.intent;
        }
    }


    /**
     * =====================================================
     * SERVIÃ‡OS â€” LISTA
     * =====================================================
     */

    if (
        state === 'viewing_services'
    ) {

        const services =
            await getServices(
                companyId
            );


        if (
            services.length === 0
        ) {

            return (
                'ðŸ˜• Neste momento nÃ£o existem ' +
                'serviÃ§os disponÃ­veis.'
            );
        }


        const serviceNumber =
            parseInt(
                texto,
                10
            );


        let service = null;


        /**
         * 1. SeleÃ§Ã£o por nÃºmero.
         */

        if (
            !isNaN(serviceNumber) &&
            serviceNumber >= 1 &&
            serviceNumber <= services.length
        ) {

            service =
                services[
                    serviceNumber - 1
                ];
        }


        /**
         * 2. SeleÃ§Ã£o inteligente:
         *
         * Knowledge Engine
         *       â†“
         * serviceCandidate
         *       â†“
         * resolveServiceCandidate()
         *       â†“
         * serviceService
         *       â†“
         * nome ou alias da empresa
         */

        if (
            !service &&
            serviceCandidate
        ) {

            service =
                await resolveServiceCandidate(
                    companyId,
                    serviceCandidate
                );
        }


        /**
         * 3. Fallback para o texto original.
         *
         * Isto preserva compatibilidade com mensagens
         * simples que o Knowledge Engine nÃ£o tenha
         * convertido em candidato.
         */

        if (
            !service
        ) {

            service =
                await resolveServiceCandidate(
                    companyId,
                    messageText.trim()
                );
        }


        if (
            service
        ) {

            await updateConversationState(
                companyId,
                conversationId,

                'viewing_service',

                {
                    service_id:
                        service.id,

                    service_name:
                        service.name,

                    description:
                        service.description,

                    price:
                        service.price,

                    price_type:
                        service.price_type
                }
            );


            let price =
                'Sob orÃ§amento';


            if (
                service.price_type === 'fixed' &&
                service.price !== null
            ) {

                price =
                    `${service.price} MT`;
            }


            if (
                service.price_type === 'from' &&
                service.price !== null
            ) {

                price =
                    `A partir de ${service.price} MT`;
            }


            return (
                `ðŸŒ¿ *${service.name}*\n\n` +

                (
                    service.description
                        ? `${service.description}\n\n`
                        : ''
                ) +

                `ðŸ’° PreÃ§o: ${price}\n\n` +

                'Deseja solicitar este serviÃ§o?\n\n' +

                '1ï¸âƒ£ Sim\n' +
                '2ï¸âƒ£ Voltar aos serviÃ§os'
            );
        }


        return (
            'âŒ NÃ£o encontrei esse serviÃ§o.\n\n' +
            'Digite o nÃºmero ou nome do serviÃ§o.'
        );
    }


    /**
     * =====================================================
     * PREÃ‡O DO SERVIÃ‡O
     * =====================================================
     */

    if (
        state === 'viewing_service' &&
        intent === 'price'
    ) {

        let price =
            'Sob orÃ§amento';


        if (
            context.price_type === 'fixed' &&
            context.price !== null &&
            context.price !== undefined
        ) {

            price =
                `${context.price} MT`;
        }


        if (
            context.price_type === 'from' &&
            context.price !== null &&
            context.price !== undefined
        ) {

            price =
                `A partir de ${context.price} MT`;
        }


        return (
            `ðŸ’° *PreÃ§o: ${price}*\n\n` +

            `ðŸŒ¿ ServiÃ§o: ${context.service_name}\n\n` +

            'Deseja solicitar este serviÃ§o?\n\n' +

            '1ï¸âƒ£ Sim\n' +
            '2ï¸âƒ£ Voltar aos serviÃ§os'
        );
    }


    /**
     * =====================================================
     * SERVIÃ‡O SELECIONADO
     * =====================================================
     */

    if (
        state === 'viewing_service'
    ) {

        if (
            texto === '1' ||
            intent === 'confirm'
        ) {

            await updateConversationState(
                companyId,
                conversationId,

                'service_request',

                {
                    ...context
                }
            );


            return (
                `ðŸ“‹ *SolicitaÃ§Ã£o de ${context.service_name}*\n\n` +

                'Explique brevemente o que precisa.\n\n' +

                'Exemplo:\n' +

                'â€œPreciso cortar a relva do meu jardim ' +
                'de aproximadamente 200 mÂ².â€'
            );
        }


        if (
            texto === '2' ||
            intent === 'deny' ||
            texto === 'voltar'
        ) {

            await updateConversationState(
                companyId,
                conversationId,

                'viewing_services',

                {}
            );


            return await showServicesMenu(
                companyId,
                company.name
            );
        }


        return (
            'ðŸ¤” Escolha uma opÃ§Ã£o:\n\n' +

            '1ï¸âƒ£ Sim\n' +
            '2ï¸âƒ£ Voltar aos serviÃ§os'
        );
    }


    /**
     * =====================================================
     * SOLICITAÃ‡ÃƒO DE SERVIÃ‡O
     * =====================================================
     */

    if (
        state === 'service_request'
    ) {

        const requestText =
            messageText.trim();


        if (
            !requestText
        ) {

            return (
                'Por favor, explique brevemente ' +
                'o que precisa.'
            );
        }


        const customerId =
            conversationState?.customer_id;


        if (
            !customerId
        ) {

            console.error(
                'âŒ NÃ£o foi possÃ­vel identificar o cliente.'
            );


            return (
                'âŒ NÃ£o foi possÃ­vel identificar o seu cadastro.\n\n' +
                'Por favor, tente novamente.'
            );
        }


        const serviceId =
            context.service_id || null;


        const request =
            await createCustomerRequest(
                companyId,
                customerId,
                conversationId,
                serviceId,
                requestText
            );


        if (
            !request
        ) {

            console.error(
                'âŒ Falha ao registrar solicitaÃ§Ã£o.'
            );


            return (
                'âŒ NÃ£o foi possÃ­vel registrar a sua solicitaÃ§Ã£o.\n\n' +
                'Por favor, tente novamente.'
            );
        }


        await clearConversationState(
            companyId,
            conversationId
        );


        const serviceName =
            context.service_name ||
            request.services?.name ||
            'ServiÃ§o solicitado';


        return (
            'âœ… *SolicitaÃ§Ã£o registrada com sucesso!*\n\n' +

            `ðŸŒ¿ ServiÃ§o: ${serviceName}\n` +

            `ðŸ“‹ Pedido: ${requestText}\n\n` +

            `A ${company.name} recebeu a sua solicitaÃ§Ã£o e poderÃ¡ ` +
            'entrar em contacto consigo para confirmar os detalhes.\n\n' +

            'Obrigado! ðŸ™Œ'
        );
    }


    /**
     * =====================================================
     * MENU DE PRODUTOS
     * =====================================================
     */

    if (
        state === 'viewing_menu'
    ) {

        const products =
            await getProducts(
                companyId
            );


        if (
            products.length === 0
        ) {

            return (
                'ðŸ˜• Neste momento nÃ£o existem ' +
                'produtos disponÃ­veis.'
            );
        }


        const productNumber =
            parseInt(
                texto,
                10
            );


        if (
            !isNaN(productNumber) &&
            productNumber >= 1 &&
            productNumber <= products.length
        ) {

            const product =
                products[
                    productNumber - 1
                ];


            const productContext =
                createProductContext({
                    id:
                        product.id,

                    name:
                        product.name,

                    price:
                        product.price
                });


            await updateConversationState(
                companyId,
                conversationId,

                'viewing_product',

                {
                    ...rememberProduct(
                        context,
                        productContext
                    )
                }
            );


            return (
                `ðŸ” *${product.name}*\n\n` +

                `ðŸ’° PreÃ§o: ${product.price} MT\n\n` +

                'Deseja fazer um pedido?\n\n' +

                '1ï¸âƒ£ Sim, fazer pedido\n' +
                '2ï¸âƒ£ Voltar ao menu'
            );
        }


        const product =
            await getProductByName(
                companyId,
                messageText.trim()
            );


        if (
            product
        ) {

            const productContext =
                createProductContext({
                    id:
                        product.id,

                    name:
                        product.name,

                    price:
                        product.price
                });


            await updateConversationState(
                companyId,
                conversationId,

                'viewing_product',

                {
                    ...rememberProduct(
                        context,
                        productContext
                    )
                }
            );


            return (
                `ðŸ” *${product.name}*\n\n` +

                `ðŸ’° PreÃ§o: ${product.price} MT\n\n` +

                'Deseja fazer um pedido?\n\n' +

                '1ï¸âƒ£ Sim, fazer pedido\n' +
                '2ï¸âƒ£ Voltar ao menu'
            );
        }


        return (
            'âŒ NÃ£o encontrei esse produto.\n\n' +
            'Digite o nÃºmero do produto ou o nome do produto.'
        );
    }


    /**
     * =====================================================
     * PRODUTO SELECIONADO
     * =====================================================
     */

    if (
        state === 'viewing_product'
    ) {

        if (
            texto === '1' ||
            intent === 'confirm' ||
            texto === 'pedido'
        ) {

            const product =
                context;


            const currentCart =
                context.cart || [];


            await updateConversationState(
                companyId,
                conversationId,

                'waiting_quantity',

                {
                    product_id:
                        product.product_id,

                    product_name:
                        product.product_name,

                    unit_price:
                        product.unit_price,

                    lastProduct:
                        product.lastProduct,

                    currentProduct:
                        product.currentProduct,

                    cart:
                        currentCart
                }
            );


            return (
                `ðŸ” *${product.product_name}*\n\n` +

                `ðŸ’° PreÃ§o: ${product.unit_price} MT\n\n` +

                'Quantas unidades deseja?'
            );
        }


        if (
            texto === '2' ||
            intent === 'deny' ||
            texto === 'voltar'
        ) {

            await updateConversationState(
                companyId,
                conversationId,

                'viewing_menu',

                {}
            );


            return await showProductsMenu(
                companyId,
                company.name
            );
        }


        return (
            'ðŸ¤” Escolha uma opÃ§Ã£o:\n\n' +

            '1ï¸âƒ£ Sim, fazer pedido\n' +
            '2ï¸âƒ£ Voltar ao menu'
        );
    }


    /**
     * =====================================================
     * ESPERANDO PRODUTO
     * =====================================================
     */

    if (
        state === 'waiting_product'
    ) {

        const productNumber =
            parseInt(
                texto,
                10
            );


        let product = null;


        if (
            !isNaN(productNumber) &&
            productNumber > 0
        ) {

            const products =
                await getProducts(
                    companyId
                );


            if (
                productNumber <=
                products.length
            ) {

                product =
                    products[
                        productNumber - 1
                    ];
            }
        }


        if (
            !product &&
            productCandidate
        ) {

            product =
                await resolveProductCandidate(
                    companyId,
                    productCandidate
                );
        }


        if (
            !product
        ) {

            product =
                await getProductByName(
                    companyId,
                    messageText.trim()
                );
        }


        if (
            !product
        ) {

            return (
                'âŒ NÃ£o encontrei esse produto.\n\n' +
                'Digite o nome ou nÃºmero do produto.'
            );
        }


        const currentCart =
            context.cart || [];


        const productContext =
            createProductContext({
                id:
                    product.id,

                name:
                    product.name,

                price:
                    product.price
            });


        await updateConversationState(
            companyId,
            conversationId,

            'waiting_quantity',

            {
                ...rememberProduct(
                    context,
                    productContext
                ),

                cart:
                    currentCart
            }
        );


        return (
            `ðŸ” *${product.name}*\n\n` +

            `ðŸ’° PreÃ§o: ${product.price} MT\n\n` +

            'Quantas unidades deseja?'
        );
    }


    /**
     * =====================================================
     * ESPERANDO QUANTIDADE
     * =====================================================
     */

    if (
        state === 'waiting_quantity'
    ) {

        let quantity =
            intelligenceQuantity;


        if (
            !quantity
        ) {

            const parsed =
                parseInt(
                    texto,
                    10
                );


            if (
                !isNaN(parsed) &&
                parsed > 0
            ) {

                quantity =
                    parsed;
            }
        }


        if (
            !quantity ||
            quantity <= 0
        ) {

            return (
                'âŒ NÃ£o consegui identificar a quantidade.\n\n' +

                'Por favor, diga quantas unidades deseja.\n\n' +

                'Exemplo: *2*, *dois* ou *quero trÃªs*.'
            );
        }


        const product =
            context.currentProduct ||
            getLastProduct(context) ||
            context;


        if (
            !product?.product_id
        ) {

            await updateConversationState(
                companyId,
                conversationId,

                'waiting_product',

                {
                    cart:
                        context.cart || []
                }
            );


            return (
                'ðŸ¤” NÃ£o consegui identificar o produto.\n\n' +
                'Qual produto deseja adicionar?'
            );
        }


        let cart =
            Array.isArray(context.cart)
                ? context.cart
                : [];


        const cartProduct =
            createProductContext(
                product
            );


        cart =
            addProductToCart(
                cart,
                cartProduct,
                quantity
            );


        const newContext =
            rememberProduct(
                {
                    ...context,
                    cart
                },
                cartProduct
            );


        const total =
            calculateCartTotal(
                cart
            );


        await updateConversationState(
            companyId,
            conversationId,

            'cart_menu',

            {
                ...newContext,
                total
            }
        );


        return (
            `âœ… *${quantity}x ${cartProduct.product_name}* ` +
            'adicionado ao pedido.\n\n' +

            `${formatCart(cart)}\n\n` +

            'O que deseja fazer?\n\n' +

            '1ï¸âƒ£ Adicionar outro produto\n' +
            '2ï¸âƒ£ Finalizar pedido\n' +
            '3ï¸âƒ£ Alterar carrinho\n' +
            '4ï¸âƒ£ Cancelar pedido'
        );
    }


    /**
     * =====================================================
     * CARRINHO
     * =====================================================
     */

    console.log(
        'ðŸ§ª DEBUG CARRINHO:',
        {
            rawMessage,
            state,
            compositeCartAction,
            cart: context?.cart
        }
    );

    if (
        state === 'cart_menu'
    ) {

        let cart =
            Array.isArray(context.cart)
                ? context.cart
                : [];


        const lastProduct =
            getLastProduct(context);

                /**
         * =================================================
         * AÇÃO COMPOSTA DO CARRINHO
         *
         * Exemplos:
         * "remove o segundo e adiciona Chicken Burger"
         * "tira o último e coloca Double Cheese"
         * "remove esse e adiciona aquele produto"
         * =================================================
         */

        if (
            compositeCartAction
        ) {

            console.log(
    "DEBUG COMPOSITE CART - ENTROU NO FLUXO COMPOSTO"
);

            if (
                !cart.length
            ) {

                return (
                    '🛒 O carrinho está vazio.\n\n' +
                    'Adicione um produto primeiro.'
                );
            }


            const removeTarget =
                compositeCartAction.removeTarget;

            const addTarget =
                compositeCartAction.addTarget;


            let removeIndex = -1;


            /**
             * -------------------------------------------------
             * 1. RESOLVER O PRODUTO A REMOVER
             * -------------------------------------------------
             */

            const removePositionMatch =
                String(removeTarget)
                    .toLowerCase()
                    .trim()
                    .match(
                        /^(?:o\s+|a\s+)?(primeiro|segundo|terceiro|quarto|quinto|sexto|sétimo|setimo|oitavo|nono|décimo|decimo|último|ultimo)$/i
                    );


            if (
                removePositionMatch
            ) {

                const position =
                    removePositionMatch[1]
                        .toLowerCase()
                        .trim();


                const positions = {
                    primeiro: 1,
                    segundo: 2,
                    terceiro: 3,
                    quarto: 4,
                    quinto: 5,
                    sexto: 6,
                    'sétimo': 7,
                    setimo: 7,
                    oitavo: 8,
                    nono: 9,
                    'décimo': 10,
                    decimo: 10
                };


                if (
                    position === 'último' ||
                    position === 'ultimo'
                ) {

                    removeIndex =
                        cart.length - 1;

                } else {

                    const positionNumber =
                        positions[position];

                    if (
                        positionNumber
                    ) {

                        removeIndex =
                            positionNumber - 1;
                    }
                }
            }


            /**
             * -------------------------------------------------
             * 2. REFERÊNCIA CONTEXTUAL
             *
             * "esse"
             * "essa"
             * "aquele"
             * "aquele produto"
             * -------------------------------------------------
             */

            if (
                removeIndex < 0
            ) {

                const removeContextualProduct =
                    resolveContextualProduct(
                        context,
                        removeTarget
                    );


                if (
                    removeContextualProduct
                ) {

                    removeIndex =
                        getCartProductIndex(
                            cart,
                            removeContextualProduct.product_id
                        );
                }
            }


            /**
             * -------------------------------------------------
             * 3. TENTAR LOCALIZAR PELO NOME / ALIAS
             * -------------------------------------------------
             */

            if (
                removeIndex < 0
            ) {

                const removeProduct =
                    await resolveProductCandidate(
                        companyId,
                        removeTarget
                    );


                if (
                    removeProduct
                ) {

                    removeIndex =
                        getCartProductIndex(
                            cart,
                            removeProduct.id
                        );
                }
            }


            /**
             * -------------------------------------------------
             * 4. VALIDAR PRODUTO A REMOVER
             * -------------------------------------------------
             */

            if (
                removeIndex < 0 ||
                removeIndex >= cart.length
            ) {

                return (
                    `❌ Não encontrei *${removeTarget}* ` +
                    'no seu carrinho.\n\n' +
                    `${formatCart(cart)}`
                );
            }


            const removedProduct =
                cart[removeIndex];


            /**
             * -------------------------------------------------
             * 5. RESOLVER PRODUTO A ADICIONAR
             * -------------------------------------------------
             */

            let addProduct =
                await resolveProductCandidate(
                    companyId,
                    addTarget
                );


            /**
             * Se "adiciona esse/aquele produto"
             * estiver usando referência contextual,
             * tentamos resolver pelo contexto.
             */

            if (
                !addProduct
            ) {

                const addContextualProduct =
                    resolveContextualProduct(
                        context,
                        addTarget
                    );


                if (
                    addContextualProduct
                ) {

                    addProduct =
                        await resolveProductCandidate(
                            companyId,
                            addContextualProduct.product_name
                        );
                }
            }


            /**
             * -------------------------------------------------
             * 6. VALIDAR PRODUTO A ADICIONAR
             *
             * Ainda não alteramos o carrinho.
             * Assim evitamos uma operação parcial.
             * -------------------------------------------------
             */

            if (
                !addProduct
            ) {

                return (
                    `❌ Não encontrei o produto ` +
                    `*${addTarget}*` +
                    ' para adicionar.\n\n' +
                    `${formatCart(cart)}`
                );
            }


            /**
             * -------------------------------------------------
             * 7. REMOVER PRIMEIRO PRODUTO
             * -------------------------------------------------
             */

            const updatedCart =
                cart.filter(
                    (_, index) =>
                        index !== removeIndex
                );


            /**
             * -------------------------------------------------
             * 8. ADICIONAR NOVO PRODUTO
             *
             * Se o cliente informou quantidade,
             * usamos essa quantidade.
             *
             * Caso contrário:
             * 1 unidade.
             * -------------------------------------------------
             */

            const addProductContext =
                createProductContext(
                    addProduct
                );


            const addQuantity =
                intelligenceQuantity &&
                Number(intelligenceQuantity) > 0
                    ? Number(intelligenceQuantity)
                    : 1;


            console.log(
    "DEBUG COMPOSITE CART - updatedCart:",
    JSON.stringify(updatedCart, null, 2)
);

console.log(
    "DEBUG COMPOSITE CART - addProductContext:",
    JSON.stringify(addProductContext, null, 2)
);

console.log(
    "DEBUG COMPOSITE CART - addQuantity:",
    addQuantity
);        


            const finalCart =
                addProductToCart(
                    updatedCart,
                    addProductContext,
                    addQuantity
                );

                console.log(
    "DEBUG COMPOSITE CART - finalCart:",
    JSON.stringify(finalCart, null, 2)
);

            /**
             * -------------------------------------------------
             * 9. RECALCULAR TOTAL
             * -------------------------------------------------
             */

            const total =
                calculateCartTotal(
                    finalCart
                );


            /**
             * -------------------------------------------------
             * 10. ATUALIZAR CONTEXTO
             * -------------------------------------------------
             */

            const newContext =
                rememberProduct(
                    {
                        ...context,

                        cart:
                            finalCart,

                        awaitingConfirmation:
                            false,

                        editingCartIndex:
                            null,

                        editingCartProduct:
                            null,

                        editingCartMode:
                            null
                    },
                    addProductContext
                );


            /**
             * -------------------------------------------------
             * 11. SALVAR ESTADO
             *
             * companyId permanece obrigatório.
             * -------------------------------------------------
             */

            await updateConversationState(
                companyId,
                conversationId,
                'cart_menu',
                {
                    ...newContext,

                    total
                }
            );


            /**
             * -------------------------------------------------
             * 12. RESPOSTA
             * -------------------------------------------------
             */

            return (
                `✅ *${removedProduct.product_name}* ` +
                'foi removido e ' +
                `*${addQuantity}x ${addProduct.name}* ` +
                'foi adicionado ao pedido.\n\n' +

                `${formatCart(finalCart)}\n\n` +

                `💵 Total: *${total} MT*\n\n` +

                'Deseja adicionar mais alguma coisa ou finalizar o pedido?'
            );
        }    


        /**
 * =================================================
 * ADICIONAR MAIS DE UM PRODUTO POR POSIÇÃO
 * =================================================
 */

if (
    intelligenceQuantity &&
    entities.addAction &&
    (
        entities.productPosition !== null &&
        entities.productPosition !== undefined
    )
) {

    let itemIndex = -1;

    if (
        entities.productPosition === 'last'
    ) {

        itemIndex =
            cart.length - 1;

    } else {

        itemIndex =
            Number(
                entities.productPosition
            ) - 1;
    }

    if (
        itemIndex >= 0 &&
        itemIndex < cart.length
    ) {

        const selectedItem =
            cart[itemIndex];

        const product =
            await resolveProductCandidate(
                companyId,
                selectedItem.product_name
            );

        if (
            product
        ) {

            const productContext =
                createProductContext(
                    product
                );

            const updatedCart =
                addProductToCart(
                    cart,
                    productContext,
                    intelligenceQuantity
                );

            const newContext =
                rememberProduct(
                    {
                        ...context,
                        cart: updatedCart
                    },
                    productContext
                );

            const total =
                calculateCartTotal(
                    updatedCart
                );

            await updateConversationState(
                companyId,
                conversationId,
                'cart_menu',
                {
                    ...newContext,
                    total
                }
            );

            return (
                `✅ Adicionei mais *${intelligenceQuantity}x ${product.name}*.\\n\\n` +
                `${formatCart(updatedCart)}\\n\\n` +
                `💵 Total: *${total} MT*\\n\\n` +
                'Deseja adicionar mais alguma coisa ou finalizar o pedido?'
            );
        }
    }
}




        /**
         * =================================================
         * ADICIONAR MAIS DO ÃšLTIMO PRODUTO
         * =================================================
         */

        if (
            lastProduct &&
            intelligenceQuantity &&
            (
                entities.addAction ||
                /mais|adiciona|adicionar|quero|manda/i.test(
                    texto
                )
            )
        ) {

            const quantity =
                intelligenceQuantity;


            const updatedCart =
                addProductToCart(
                    cart,
                    lastProduct,
                    quantity
                );


            const newContext =
                rememberProduct(
                    {
                        ...context,
                        cart: updatedCart
                    },
                    lastProduct
                );


            const total =
                calculateCartTotal(
                    updatedCart
                );


            await updateConversationState(
                companyId,
                conversationId,

                'cart_menu',

                {
                    ...newContext,
                    total
                }
            );


            return (
                `âœ… Adicionei mais *${quantity}x ${lastProduct.product_name}*.\n\n` +

                `${formatCart(updatedCart)}\n\n` +

                'O que deseja fazer?\n\n' +

                '1ï¸âƒ£ Adicionar outro produto\n' +
                '2ï¸âƒ£ Finalizar pedido\n' +
                '3ï¸âƒ£ Alterar carrinho\n' +
                '4ï¸âƒ£ Cancelar pedido'
            );
        }


        /**
         * =================================================
         * "O MESMO"
         * =================================================
         */

        if (
            lastProduct &&
            /^(o mesmo|a mesma|igual|esse mesmo|essa mesma)$/i.test(
                texto
            )
        ) {

            await updateConversationState(
                companyId,
                conversationId,

                'waiting_quantity',

                {
                    ...rememberProduct(
                        context,
                        lastProduct
                    ),

                    cart
                }
            );


            return (
                `ðŸ” *${lastProduct.product_name}*\n\n` +

                'Quantas unidades deseja adicionar?'
            );
        }


        /**
         * =================================================
         * "MAIS UM"
         * =================================================
         */

        if (
            lastProduct &&
            intelligenceQuantity === 1 &&
            /mais|adiciona|adicionar|quero|manda/i.test(texto)
        ) {

            const updatedCart =
                addProductToCart(
                    cart,
                    lastProduct,
                    1
                );


            const newContext =
                rememberProduct(
                    {
                        ...context,
                        cart: updatedCart
                    },
                    lastProduct
                );


            const total =
                calculateCartTotal(
                    updatedCart
                );


            await updateConversationState(
                companyId,
                conversationId,

                'cart_menu',

                {
                    ...newContext,
                    total
                }
            );


            return (
                `âœ… Adicionei mais *1x ${lastProduct.product_name}*.\n\n` +

                `${formatCart(updatedCart)}\n\n` +

                'O que deseja fazer?\n\n' +

                '1ï¸âƒ£ Adicionar outro produto\n' +
                '2ï¸âƒ£ Finalizar pedido\n' +
                '3ï¸âƒ£ Alterar carrinho\n' +
                '4ï¸âƒ£ Cancelar pedido'
            );
        }

        const changeQuantityAction =
    intelligenceActions.find(
        action =>
            action?.type === 'change_quantity'
    );

const hasChangeQuantityAction =
    Boolean(changeQuantityAction);



        /**
         * =================================================
         * TOTAL DO CARRINHO
         * =================================================
         */

        if (
            /quanto|total|deu|pagar|valor/i.test(texto) &&
            !productCandidate &&
            !hasChangeQuantityAction
        ) {

            const total =
                calculateCartTotal(
                    cart
                );


            return (
                `${formatCart(cart)}\n\n` +

                `ðŸ’µ O total atual Ã© *${total} MT*.\n\n` +

                'Deseja adicionar mais alguma coisa ou finalizar o pedido?'
            );
        }


        /**
         * =================================================
         * REMOVER PRODUTO
         * =================================================
         */

        if (
            state !== 'editing_cart' &&
            state !== 'editing_cart_item' &&
            (entities.removeAction || intelligence.behavior === 'remove_product') &&
            (
                productCandidate ||
                entities.productPosition ||
                entities.reference
            )
        ) {
            let itemIndex = -1;
            let resolvedProduct = null;


            if (
                entities.productPosition
            ) {

                itemIndex =
                    Number(
                        entities.productPosition
                    ) - 1;
            }


            if (
    itemIndex < 0 &&
    productCandidate
) {

    resolvedProduct =
        await resolveProductCandidate(
            companyId,
            productCandidate
        );


    if (resolvedProduct) {

        itemIndex =
            getCartProductIndex(
                cart,
                resolvedProduct.id
            );
    }
}


            if (
                itemIndex < 0 &&
                entities.reference === 'last'
            ) {

                itemIndex =
                    cart.length - 1;
            }


            if (
    itemIndex < 0 &&
    resolvedProduct
) {

    return (
        `ℹ️ *${resolvedProduct.name}* não está no seu pedido.\n\n`
        
    );
}



            if (
                itemIndex >= 0 &&
                itemIndex < cart.length
            ) {

                const removed =
                    cart[itemIndex];


                cart =
                    cart.filter(
                        (_, index) =>
                            index !== itemIndex
                    );


                const total =
                    calculateCartTotal(
                        cart
                    );


                await updateConversationState(
                    companyId,
                    conversationId,
                    'cart_menu',
                    {
                        ...context,

                        cart,

                        total,

                        lastProduct:
                            null,

                        currentProduct:
                            null
                    }
                );


                if (
                    !cart.length
                ) {

                    return (
                        `ðŸ—‘ï¸ *${removed.product_name}* ` +
                        'foi removido do pedido.\n\n' +
                        'O carrinho estÃ¡ vazio.\n\n' +
                        'Deseja adicionar algum produto?'
                    );
                }


                return (
                    `ðŸ—‘ï¸ *${removed.product_name}* ` +
                    'foi removido do pedido.\n\n' +
                    `${formatCart(cart)}\n\n` +
                    `ðŸ’µ Total: *${total} MT*\n\n` +
                    'O que deseja fazer?\n\n' +
                    '1ï¸âƒ£ Adicionar outro produto\n' +
                    '2ï¸âƒ£ Finalizar pedido\n' +
                    '3ï¸âƒ£ Alterar carrinho\n' +
                    '4ï¸âƒ£ Cancelar pedido'
                );
            }


            return (
                'ðŸ¤” NÃo consegui identificar qual produto deseja remover.\n\n' +
                `${formatCart(cart)}`
            );
        }


        


       /**
 * =================================================
 * ALTERAR QUANTIDADE
 * =================================================
 */


/*
 * ALTERAR QUANTIDADE POR POSIÇÃO
 *
 * Exemplo:
 * "quero o segundo com 3"
 *
 * Usa diretamente a posição existente no carrinho.
 * Não depende de resolvedProductCandidate.
 */



const quantityProductCandidate =
    extractQuantityProductCandidate(
        typeof segment === 'string'
            ? segment
            : rawMessage
    ) ||
    changeQuantityAction?.target?.value ||
    productCandidate ||
    null;


      console.log('\n🛒 DEBUG CHANGE QUANTITY');
console.log({
    state,
    cart,
    cartLength: Array.isArray(cart) ? cart.length : 'INVALID',
    behavior: intelligence?.behavior,
    hasChangeQuantityAction,
    changeQuantityAction,
    intelligenceQuantity,
    quantityProductCandidate,
    contextualProduct,
    productCandidate,
    productPosition: entities?.productPosition,
    reference: entities?.reference
});

if (
    (
        intelligence.behavior === 'change_quantity' ||
        hasChangeQuantityAction
    ) &&
    intelligenceQuantity &&
    (
        (
            entities.productPosition !== null &&
            entities.productPosition !== undefined
        ) ||
        contextualProduct ||
        quantityProductCandidate ||
        changeQuantityAction?.target?.type === 'current'
    )
) {
            let itemIndex = -1;


/*
 * POSIÇÃO NO CARRINHO
 */
if (
    entities.productPosition !== null &&
    entities.productPosition !== undefined
) {

    if (
        entities.productPosition === 'last'
    ) {

        itemIndex =
            cart.length - 1;

    } else {

        itemIndex =
            Number(
                entities.productPosition
            ) - 1;
    }
}


/*
 * REFERÊNCIA CONTEXTUAL
 */
if (
    itemIndex < 0 &&
    contextualProduct
) {

    itemIndex =
        getCartProductIndex(
            cart,
            contextualProduct.product_id
        );
}


/*
 * PRODUTO IDENTIFICADO NA PRÓPRIA MENSAGEM
 */
if (
    itemIndex < 0 &&
    quantityProductCandidate
) {

    const product =
        await resolveProductCandidate(
            companyId,
            quantityProductCandidate
        );

    if (product) {

        itemIndex =
            getCartProductIndex(
                cart,
                product.id
            );
    }
}


/*
 * ÚLTIMO PRODUTO
 */
if (
    itemIndex < 0 &&
    entities.reference === 'last'
) {

    itemIndex =
        cart.length - 1;
}

            if (
                itemIndex >= 0 &&
                itemIndex < cart.length
            ) {
                const selectedProduct =
                    cart[itemIndex]

                updateProductQuantity(
                    cart,
                    itemIndex,
                    intelligenceQuantity
                )

                const total =
                    calculateCartTotal(
                        cart
                    )

                await updateConversationState(
                    companyId,
                    conversationId,
                    'cart_menu',
                    {
                        ...context,
                        cart,
                        total
                    }
                )

                return (
                    `Atualizei *${selectedProduct.product_name}* ` +
                    `para *${intelligenceQuantity} unidades*.\n\n` +
                    `${formatCart(cart)}\n\n` +
                    `Total: *${total} MT*\n\n` +
                    'Deseja adicionar mais alguma coisa ou finalizar o pedido?'
                )
            }
        }


        if (
            (
                entities.editAction ||
                intelligence.behavior === 'change_quantity'
            ) &&
            resolvedProductCandidate &&
            intelligenceQuantity
        ) {

            const product =
                await resolveProductCandidate(
                    companyId,
                    resolvedProductCandidate
                );


            if (product) {

                const index =
                    getCartProductIndex(
                        cart,
                        product.id
                    );


                if (
                    index >= 0
                ) {

                    cart[index] =
                        {
                            ...cart[index],

                            quantity:
                                intelligenceQuantity,

                            subtotal:
                                Number(
                                    cart[index].unit_price
                                ) *
                                intelligenceQuantity
                        };


                    const total =
                        calculateCartTotal(
                            cart
                        );


                    const productContext =
                        createProductContext(
                            product
                        );


                    await updateConversationState(
                        companyId,
                        conversationId,
                        'cart_menu',
                        {
                            ...context,

                            cart,

                            total,

                            lastProduct:
                                productContext,

                            currentProduct:
                                productContext
                        }
                    );


                    return (
                        `âœï¸ Atualizei *${product.name}* ` +
                        `para *${intelligenceQuantity} unidades*.\n\n` +

                        `${formatCart(cart)}\n\n` +

                        `ðŸ’µ Total: *${total} MT*\n\n` +

                        'Deseja adicionar mais alguma coisa ou finalizar o pedido?'
                    );
                }
            }
        }


        /**
         * =================================================
         * SELECIONAR ITEM PARA SUBSTITUIÃ‡ÃƒO
         * =================================================
         */

        if (
            state === 'editing_cart_item' &&
            context.editingCartMode === 'replace' &&
            context.editingCartIndex !== null &&
            context.editingCartIndex !== undefined
        ) {

            let itemIndex = -1;


/*
 * 1. POSIÇÃO EXPLÍCITA
 *
 * Exemplos:
 * "segundo"
 * "terceiro"
 * "último"
 */
if (
    entities.productPosition !== null &&
    entities.productPosition !== undefined
) {

    if (
        entities.productPosition === 'last'
    ) {

        itemIndex =
            cart.length - 1;

    } else {

        itemIndex =
            Number(
                entities.productPosition
            ) - 1;
    }
}


/*
 * 2. REFERÊNCIA CONTEXTUAL
 *
 * Exemplos:
 * "esse"
 * "esse produto"
 * "aquele"
 * "aquele produto"
 */
if (
    itemIndex < 0 &&
    contextualProduct
) {

    itemIndex =
        getCartProductIndex(
            cart,
            contextualProduct.product_id
        );
}


/*
 * 3. REFERÊNCIA "LAST"
 *
 * Segurança adicional para:
 * "o último"
 */
if (
    itemIndex < 0 &&
    entities.reference === 'last'
) {

    itemIndex =
        cart.length - 1;
}


            if (
                itemIndex >= 0 &&
                itemIndex < cart.length
            ) {

                const selectedProduct =
                    cart[itemIndex];


                await updateConversationState(
    companyId,
    conversationId,
    'editing_cart_item',
    {
        ...context,

        cart,

        item_index:
            itemIndex,

        editingCartIndex:
            itemIndex,

        editingCartProduct:
            selectedProduct,

        editingCartMode:
            'replace'
    }
);


                return (
                    `ðŸ”„ O produto selecionado Ã© *${selectedProduct.product_name}*.\n\n` +

                    'Qual produto deseja colocar no lugar?'
                );
            }


            return (
                'ðŸ¤” NÃ£o encontrei esse produto no seu carrinho.\n\n' +
                `${formatCart(cart)}`
            );
        }


        /**
         * =================================================
         * OPÃ‡Ã•ES DO CARRINHO
         * =================================================
         */

        if (
            texto === '1' ||
            texto === 'adicionar' ||
            texto === 'outro'
        ) {

            await updateConversationState(
                companyId,
                conversationId,

                'waiting_product',

                {
                    cart
                }
            );


            return (
                'âž• *Adicionar outro produto*\n\n' +
                'Qual produto deseja adicionar?'
            );
        }


        if (
    texto === '2' ||
    texto === 'finalizar' ||
    texto === 'terminar' ||
    texto === 'pode confirmar' ||
    texto === 'podes confirmar' ||
    texto === 'pode finalizar' ||
    texto === 'podes finalizar' ||
    texto === 'quero finalizar' ||
    texto === 'quero confirmar' ||
    texto === 'pode fazer o pedido' ||
    texto === 'pode mandar' ||
    texto === 'pode fechar'
) {

            if (
                cart.length === 0
            ) {

                return 'ðŸ›’ O seu carrinho estÃ¡ vazio.';
            }


            const total =
                calculateCartTotal(
                    cart
                );


            await updateConversationState(
                companyId,
                conversationId,

                'confirming_order',

                {
                    cart,
                    total
                }
            );


            return (
                `${formatCart(cart)}\n\n` +

                'Deseja confirmar o pedido?\n\n' +

                '1ï¸âƒ£ Confirmar pedido\n' +
                '2ï¸âƒ£ Cancelar pedido'
            );
        }


        if (
            texto === '3' ||
            texto === 'alterar' ||
            texto === 'editar' ||
            texto === 'carrinho'
        ) {

            if (
                cart.length === 0
            ) {

                return 'ðŸ›’ O seu carrinho estÃ¡ vazio.';
            }


            await updateConversationState(
                companyId,
                conversationId,

                'editing_cart',

                {
                    cart
                    
                }
            );


            return formatCartForEditing(
                cart
            );
        }


        if (
            texto === '4' ||
            intent === 'cancel'
        ) {

            await clearConversationState(
                companyId,
                conversationId
            );


            return (
                'âŒ *Pedido cancelado.*\n\n' +
                'Digite *OlÃ¡* para ver as opÃ§Ãµes disponÃ­veis.'
            );
        }


        return (
            `${formatCart(cart)}\n\n` +

            'ðŸ¤” Escolha uma opÃ§Ã£o:\n\n' +

            '1ï¸âƒ£ Adicionar outro produto\n' +
            '2ï¸âƒ£ Finalizar pedido\n' +
            '3ï¸âƒ£ Alterar carrinho\n' +
            '4ï¸âƒ£ Cancelar pedido'
        );
    }


    /**
     * =====================================================
     * REMOVER PRODUTO DO CARRINHO
     * =====================================================
     */

    if (
    state !== 'cart_menu' &&
    (entities.removeAction || intelligence.behavior === 'remove_product') &&
    (
        productCandidate ||
        contextualProduct ||
        entities.productPosition ||
        entities.reference
    )
) {

        const cart =
            Array.isArray(context.cart)
                ? context.cart
                : [];


        let itemIndex = -1;


        if (
            entities.productPosition
        ) {

            itemIndex =
                Number(
                    entities.productPosition
                ) - 1;
        }


        if (
            itemIndex < 0 &&
            productCandidate
        ) {

            const product =
                await resolveProductCandidate(
                    companyId,
                    productCandidate
                );


            if (product) {

                itemIndex =
                    getCartProductIndex(
                        cart,
                        product.id
                    );
            }
        }

        if (
    itemIndex < 0 &&
    contextualProduct
) {

    itemIndex =
        getCartProductIndex(
            cart,
            contextualProduct.product_id
        );
}


        if (
            itemIndex < 0 &&
            entities.reference === 'last'
        ) {

            itemIndex =
                cart.length - 1;
        }


        if (
            itemIndex >= 0 &&
            itemIndex < cart.length
        ) {

            const removed =
                cart[itemIndex];


            const updatedCart =
                cart.filter(
                    (_, index) =>
                        index !== itemIndex
                );


            const total =
                calculateCartTotal(
                    updatedCart
                );


            await updateConversationState(
                companyId,
                conversationId,
                'cart_menu',
                {
                    ...context,

                    cart:
                        updatedCart,

                    total,

                    lastProduct:
                        null,

                    currentProduct:
                        null
                }
            );


            if (
                !updatedCart.length
            ) {

                return (
                    `ðŸ—‘ï¸ *${removed.product_name}* ` +
                    'foi removido do pedido.\n\n' +
                    'O carrinho estÃ¡ vazio.\n\n' +
                    'Deseja adicionar algum produto?'
                );
            }


            return (
                `ðŸ—‘ï¸ *${removed.product_name}* ` +
                'foi removido do pedido.\n\n' +

                `${formatCart(updatedCart)}\n\n` +

                `ðŸ’µ Total: *${total} MT*\n\n` +

                'O que deseja fazer?\n\n' +

                '1ï¸âƒ£ Adicionar outro produto\n' +
                '2ï¸âƒ£ Finalizar pedido\n' +
                '3ï¸âƒ£ Alterar carrinho\n' +
                '4ï¸âƒ£ Cancelar pedido'
            );
        }
    }


    /**
 * =====================================================
 * SUBSTITUIÇÃO DIRETA NO CARRINHO
 * =====================================================
 *
 * Exemplos:
 *
 * "troca o segundo por Chicken Burger"
 * "substitui o terceiro por Double Cheese"
 * "troca esse por Chicken Burger"
 * "troca aquele por Double Cheese"
 * "troca o último por Classic Burger"
 */

if (
    entities.editAction &&
    (
        entities.productPosition !== null &&
        entities.productPosition !== undefined
        ||
        contextualProduct
        ||
        entities.reference === 'last'
    ) &&
    productCandidate
) {

    const cart =
        Array.isArray(context.cart)
            ? context.cart
            : [];


    let itemIndex = -1;


    /*
     * 1. POSIÇÃO EXPLÍCITA
     *
     * Exemplos:
     * "segundo"
     * "terceiro"
     * "último"
     */
    if (
        entities.productPosition !== null &&
        entities.productPosition !== undefined
    ) {

        if (
            entities.productPosition === 'last'
        ) {

            itemIndex =
                cart.length - 1;

        } else {

            itemIndex =
                Number(
                    entities.productPosition
                ) - 1;
        }
    }


    /*
     * 2. REFERÊNCIA CONTEXTUAL
     *
     * Exemplos:
     * "esse"
     * "essa"
     * "aquele"
     * "aquele produto"
     */
    if (
        itemIndex < 0 &&
        contextualProduct
    ) {

        itemIndex =
            getCartProductIndex(
                cart,
                contextualProduct.product_id
            );
    }


    /*
     * 3. REFERÊNCIA "LAST"
     */
    if (
        itemIndex < 0 &&
        entities.reference === 'last'
    ) {

        itemIndex =
            cart.length - 1;
    }


    /*
     * 4. VALIDAR ITEM DO CARRINHO
     */
    if (
        itemIndex >= 0 &&
        itemIndex < cart.length
    ) {

        const oldProduct =
            cart[itemIndex];


        /*
         * 5. LOCALIZAR NOVO PRODUTO
         *
         * Sempre usando companyId
         * para manter isolamento multiempresa.
         */
        const replacementProduct =
            await resolveProductCandidate(
                companyId,
                productCandidate
            );


        if (
            replacementProduct
        ) {

            /*
             * 6. PRESERVAR A QUANTIDADE
             * DO PRODUTO ANTIGO
             */
             /*
 * Se o cliente informou uma nova quantidade,
 * usamos essa quantidade.
 *
 * Caso contrário, preservamos a quantidade
 * que já estava no carrinho.
 */
const quantity =
    intelligenceQuantity &&
    Number(intelligenceQuantity) > 0
        ? Number(intelligenceQuantity)
        : Number(
            oldProduct.quantity || 1
        );


            /*
             * 7. CRIAR NOVO ITEM
             */
            const replacement = {

                product_id:
                    replacementProduct.id,

                product_name:
                    replacementProduct.name,

                unit_price:
                    Number(
                        replacementProduct.price || 0
                    ),

                quantity,

                subtotal:
                    Number(
                        replacementProduct.price || 0
                    ) * quantity
            };


            /*
             * 8. SUBSTITUIR NO MESMO ÍNDICE
             */
            cart[itemIndex] =
                replacement;


            /*
             * 9. RECALCULAR TOTAL
             */
            const total =
                calculateCartTotal(
                    cart
                );


            /*
             * 10. ATUALIZAR CONTEXTO DO PRODUTO
             */
            const productContext =
                createProductContext(
                    replacementProduct
                );


            /*
             * 11. GUARDAR NOVO ESTADO
             */
            await updateConversationState(
                companyId,
                conversationId,
                'cart_menu',
                {
                    ...context,

                    cart,

                    total,

                    editingCartIndex:
                        null,

                    editingCartProduct:
                        null,

                    editingCartMode:
                        null,

                    lastProduct:
                        productContext,

                    currentProduct:
                        productContext,

                    awaitingConfirmation:
                        false
                }
            );


            /*
             * 12. RESPOSTA
             */
            return (
                `✅ *${oldProduct.product_name}* foi substituído por ` +
                `*${replacementProduct.name}* (${quantity} un.).\n\n`+

                `${formatCart(cart)}\n\n` +

                `💵 Total: *${total} MT*\n\n` +

                'Deseja adicionar mais alguma coisa ou finalizar o pedido?'
            );
        }
    }
}



    /**
     * =====================================================
     * EDITANDO CARRINHO
     * =====================================================
     */

    if (
        state === 'editing_cart'
    ) {

        const cart =
            context.cart || [];


        const selectedNumber =
            parseInt(
                texto,
                10
            );


        if (
            texto === '0' ||
            texto === 'voltar'
        ) {

            await updateConversationState(
                companyId,
                conversationId,

                'cart_menu',

                {
                    cart,

                    total:
                        calculateCartTotal(
                            cart
                        )
                }
            );


            return (
                `${formatCart(cart)}\n\n` +

                'O que deseja fazer?\n\n' +

                '1ï¸âƒ£ Adicionar outro produto\n' +
                '2ï¸âƒ£ Finalizar pedido\n' +
                '3ï¸âƒ£ Alterar carrinho\n' +
                '4ï¸âƒ£ Cancelar pedido'
            );
        }


        if (
            isNaN(selectedNumber) ||
            selectedNumber < 1 ||
            selectedNumber > cart.length
        ) {

            return formatCartForEditing(
                cart
            );
        }


        const item =
            cart[
                selectedNumber - 1
            ];


        await updateConversationState(
    companyId,
    conversationId,

    'editing_cart_item',

    {
        cart,

        item_index:
            selectedNumber - 1,

        editingCartIndex:
            selectedNumber - 1,

        editingCartProduct:
            item,

        editingCartMode:
            'quantity'
    }
);


        return (
            `âœï¸ *${item.product_name}*\n\n` +

            `Quantidade atual: ${item.quantity}\n` +

            `PreÃ§o unitÃ¡rio: ${item.unit_price} MT\n\n` +

            'Digite a nova quantidade.\n\n' +

            'Digite *0* para remover este produto.\n' +

            'Digite *voltar* para voltar.'
        );
    }


    /**
     * =====================================================
     * SUBSTITUIÃ‡ÃƒO CONTEXTUAL DE PRODUTO
     * =====================================================
     */

    if (
        state === 'editing_cart_item' &&
        context.editingCartMode === 'replace' &&
        context.editingCartIndex !== null &&
        context.editingCartIndex !== undefined
    ) {

        const cart =
            Array.isArray(context.cart)
                ? context.cart
                : [];


        const editingIndex =
            Number(
                context.editingCartIndex
            );


        if (
            editingIndex < 0 ||
            editingIndex >= cart.length
        ) {

            await updateConversationState(
                companyId,
                conversationId,
                'cart_menu',
                {
                    ...context,
                    cart,
                    editingCartIndex: null,
                    editingCartProduct: null,
                    editingCartMode: null,


                }
            );


            return (
                '🤔 Não consegui identificar o item que deseja substituir.'
            );
        }


        let replacementProduct = null;


        const contextualReplacement =
            resolveContextualProduct(
                context,
                texto
            );


        if (
            contextualReplacement
        ) {

            replacementProduct =
                await resolveProductCandidate(
                    companyId,
                    contextualReplacement.product_name
                );
        }


        if (
            !replacementProduct &&
            productCandidate
        ) {

            replacementProduct =
                await resolveProductCandidate(
                    companyId,
                    productCandidate
                );
        }


        if (
            !replacementProduct
        ) {

            const cleanedCandidate =
                texto
                    .replace(
                        /^(quero|quero um|quero uma|manda|adiciona|coloca|troca por|substitui por)\s+/i,
                        ''
                    )
                    .trim();


            if (
                cleanedCandidate
            ) {

                replacementProduct =
                    await resolveProductCandidate(
                        companyId,
                        cleanedCandidate
                    );
            }
        }


        if (
            !replacementProduct
        ) {

            return (
                `ðŸ¤” NÃ£o encontrei *${texto}* no nosso menu.\n\n` +
                `Qual produto deseja colocar no lugar?`
            );
        }


        const oldProduct =
            cart[editingIndex];


        const quantity =
            Number(
                oldProduct.quantity || 1
            );


        const replacement = {

            product_id:
                replacementProduct.id,

            product_name:
                replacementProduct.name,

            unit_price:
                Number(
                    replacementProduct.price || 0
                ),

            quantity,

            subtotal:
                Number(
                    replacementProduct.price || 0
                ) * quantity
        };


        cart[editingIndex] =
            replacement;


        const total =
            calculateCartTotal(
                cart
            );


        const productContext =
            createProductContext(
                replacementProduct
            );


        await updateConversationState(
            companyId,
            conversationId,
            'cart_menu',
            {
                ...context,

                cart,

                total,

                editingCartIndex:
                    null,

                editingCartProduct:
                    null,

                lastProduct:
                    productContext,

                currentProduct:
                    productContext,

                awaitingConfirmation:
                    false
            }
        );


        return (
            `âœ… *${oldProduct.product_name}* foi substituÃ­do por ` +
            `*${replacementProduct.name}*.\n\n` +

            `${formatCart(cart)}\n\n` +

            `ðŸ’µ Total: *${total} MT*\n\n` +

            `Deseja adicionar mais alguma coisa ou finalizar o pedido?`
        );
    }


    /**
     * =====================================================
     * INTENÃ‡ÃƒO + REFERÃŠNCIA CONTEXTUAL
     * =====================================================
     */

    if (
        contextualProduct &&
        businessType !== 'services'
    ) {

        const contextualProductName =
            contextualProduct.product_name;


        /**
         * PREÃ‡O
         */

        if (
            intent === 'price' ||
            /quanto custa|qual o preco|qual o preÃ§o|quanto e|quanto Ã©/i
                .test(texto)
        ) {

            const product =
                await resolveProductCandidate(
                    companyId,
                    contextualProductName
                );


            if (product) {

                const productContext =
                    createProductContext(
                        product
                    );


                await updateConversationState(
                    companyId,
                    conversationId,
                    'viewing_product',
                    {
                        ...context,

                        lastProduct:
                            productContext,

                        currentProduct:
                            productContext,

                        awaitingConfirmation:
                            false
                    }
                );


                return (
                    `ðŸ” *${product.name}*\n\n` +
                    `ðŸ’° PreÃ§o: *${product.price} MT*`
                );
            }
        }


        /**
         * DISPONIBILIDADE
         */

        if (
            /tem\s+(mais\s+)?(desse|desse produto)/i.test(texto) ||
            /ainda tem/i.test(texto)
        ) {

            const product =
                await resolveProductCandidate(
                    companyId,
                    contextualProductName
                );


            if (product) {

                const productContext =
                    createProductContext(
                        product
                    );


                await updateConversationState(
                    companyId,
                    conversationId,
                    'viewing_product',
                    {
                        ...context,

                        lastProduct:
                            productContext,

                        currentProduct:
                            productContext,

                        awaitingConfirmation:
                            true
                    }
                );


                return (
                    `âœ… Sim, temos *${product.name}*.\n\n` +
                    `ðŸ’° PreÃ§o: *${product.price} MT*\n\n` +
                    `Deseja adicionar ao pedido?`
                );
            }
        }


        /**
         * ADICIONAR PRODUTO CONTEXTUAL
         */

        if (
    /^(adiciona|adicionar|coloca|manda|quero|mete)(?:\s+mais)?/i
        .test(texto)
) {

    const contextualAddMatch =
        texto.match(
            /^(?:adiciona|adicionar|coloca|manda|quero|mete)(?:\s+mais)?\s+(?:um|uma|1)\s+(.+)$/i
        ) ||
        texto.match(
            /^(?:adiciona|adicionar|coloca|manda|quero|mete)(?:\s+mais)?\s+(\d+)\s+(.+)$/i
        ) ||
        texto.match(
            /^(?:adiciona|adicionar|coloca|manda|quero|mete)(?:\s+mais)?\s+(.+)$/i
        );

    let contextualCandidate =
        null;

    if (contextualAddMatch) {
        contextualCandidate =
            (
                contextualAddMatch[2] ||
                contextualAddMatch[1] ||
                ''
            )
                .trim()
                .replace(/[.!?,]+$/, '')
                .trim();
    }

    const productCandidateForAdd =
        contextualCandidate ||
        contextualProductName;

    const product =
        await resolveProductCandidate(
            companyId,
            productCandidateForAdd
        );


            if (product) {

                const productContext =
                    createProductContext(
                        product
                    );


                /**
                 * Se informou quantidade,
                 * adiciona imediatamente.
                 */

                if (
                    contextualQuantity
                ) {

                    const currentCart =
                        Array.isArray(context.cart)
                            ? context.cart
                            : [];


                    const cart =
                        addProductToCart(
                            currentCart,
                            productContext,
                            contextualQuantity
                        );


                    const newContext =
                        rememberProduct(
                            {
                                ...context,

                                cart,

                                awaitingConfirmation:
                                    false
                            },
                            productContext
                        );


                    const total =
                        calculateCartTotal(
                            cart
                        );


                    await updateConversationState(
                        companyId,
                        conversationId,
                        'cart_menu',
                        {
                            ...newContext,
                            total
                        }
                    );


                    return (
                        `âœ… Adicionei *${contextualQuantity}x ${product.name}* ao seu pedido.\n\n` +
                        `${formatCart(cart)}\n\n` +
                        `ðŸ’µ Total: *${total} MT*\n\n` +
                        `Deseja adicionar mais alguma coisa ou finalizar o pedido?`
                    );
                }


                /**
                 * Sem quantidade:
                 * NÃƒO assumir 1.
                 */

                const newContext =
                    rememberProduct(
                        {
                            ...context,

                            awaitingConfirmation:
                                false
                        },
                        productContext
                    );


                await updateConversationState(
                    companyId,
                    conversationId,
                    'waiting_quantity',
                    {
                        ...newContext,

                        cart:
                            Array.isArray(context.cart)
                                ? context.cart
                                : []
                    }
                );


                return (
                    `ðŸ” *${product.name}*\n\n` +
                    `ðŸ’° PreÃ§o: *${product.price} MT*\n\n` +
                    `Quantas unidades deseja?`
                );
            }
        }

        /**
         * REMOVER
         */

        if (
    !(entities.removeAction || intelligence.behavior === 'remove_product') &&
    /\b(remove|remover|tira|tirar|retira|retirar|exclui|excluir)\b/i
        .test(texto)
) {

            const cart =
                Array.isArray(context.cart)
                    ? context.cart
                    : [];


            /**
             * CORREÃ‡ÃƒO:
             *
             * contextualProduct Ã© um objeto.
             *
             * getCartProductIndex() espera
             * o product_id.
             */

            const index =
                getCartProductIndex(
                    cart,
                    contextualProduct.product_id
                );


            if (
                index !== -1
            ) {

                const removedProduct =
                    cart[index];


                cart.splice(
                    index,
                    1
                );


                const total =
                    calculateCartTotal(
                        cart
                    );


                await updateConversationState(
                    companyId,
                    conversationId,
                    'cart_menu',
                    {
                        ...context,

                        cart,

                        total,

                        lastProduct:
                            null,

                        currentProduct:
                            null,

                        awaitingConfirmation:
                            false
                    }
                );


                if (
                    !cart.length
                ) {

                    return (
                        `ðŸ—‘ï¸ Removi *${removedProduct.product_name}* do pedido.\n\n` +
                        `O seu carrinho estÃ¡ vazio.`
                    );
                }


                return (
                    `ðŸ—‘ï¸ Removi *${removedProduct.product_name}* do pedido.\n\n` +
                    `${formatCart(cart)}\n\n` +
                    `ðŸ’µ Total: *${total} MT*`
                );
            }
        }
    }


    /**
     * =====================================================
     * EDITANDO ITEM
     * =====================================================
     */

    if (
        state === 'editing_cart_item' &&
        context.editingCartMode !== 'replace'

    ) {

        const cart =
            context.cart || [];


        const itemIndex =
    context.editingCartIndex !== null &&
    context.editingCartIndex !== undefined
        ? Number(context.editingCartIndex)
        : Number(context.item_index);


        if (
            texto === 'voltar'
        ) {

            await updateConversationState(
                companyId,
                conversationId,

                'editing_cart',

                {
                    cart,
                    editingCartIndex: null,
                    editingCartProduct: null,
                    editingCartMode: null
                }
            );


            return formatCartForEditing(
                cart
            );
        }


        let quantity =
            intelligenceQuantity;


        if (
            !quantity
        ) {

            quantity =
                parseInt(
                    texto,
                    10
                );
        }


        if (
            isNaN(quantity) ||
            quantity < 0
        ) {

            return (
                'âŒ Quantidade invÃ¡lida.\n\n' +
                'Digite um nÃºmero igual ou maior que zero.'
            );
        }


        if (
            itemIndex < 0 ||
            itemIndex >= cart.length
        ) {

            await updateConversationState(
                companyId,
                conversationId,

                'editing_cart',

                {
                    cart
                }
            );


            return formatCartForEditing(
                cart
            );
        }


        const productName =
            cart[itemIndex].product_name;


        updateProductQuantity(
            cart,
            itemIndex,
            quantity
        );


        if (
            cart.length === 0
        ) {

            await clearConversationState(
                companyId,
                conversationId
            );


            return (
                `ðŸ—‘ï¸ *${productName}* foi removido.\n\n` +
                'ðŸ›’ O carrinho estÃ¡ vazio.\n\n' +
                'Digite *OlÃ¡* para comeÃ§ar novamente.'
            );
        }


        const total =
            calculateCartTotal(
                cart
            );


        await updateConversationState(
    companyId,
    conversationId,

    'cart_menu',

    {
        cart,
        total,
        editingCartIndex: null,
        editingCartProduct: null,
        editingCartMode: null
    }
);


        const itemStillExists =
            cart.some(
                item =>
                    item.product_name ===
                    productName
            );


        if (
            !itemStillExists
        ) {

            return (
                `ðŸ—‘ï¸ *${productName}* foi removido do pedido.\n\n` +

                `${formatCart(cart)}\n\n` +

                'O que deseja fazer?\n\n' +

                '1ï¸âƒ£ Adicionar outro produto\n' +
                '2ï¸âƒ£ Finalizar pedido\n' +
                '3ï¸âƒ£ Alterar carrinho\n' +
                '4ï¸âƒ£ Cancelar pedido'
            );
        }


        return (
            `âœ… Quantidade de *${productName}* atualizada.\n\n` +

            `${formatCart(cart)}\n\n` +

            'O que deseja fazer?\n\n' +

            '1ï¸âƒ£ Adicionar outro produto\n' +
            '2ï¸âƒ£ Finalizar pedido\n' +
            '3ï¸âƒ£ Alterar carrinho\n' +
            '4ï¸âƒ£ Cancelar pedido'
        );
    }


    /**
     * =====================================================
     * CONFIRMANDO PEDIDO
     * =====================================================
     */

    if (
        state === 'confirming_order'
    ) {

        if (
            texto === '1' ||
            intent === 'confirm' ||
            texto === 'confirmar'
        ) {

            const cart =
                context.cart || [];


            if (
                cart.length === 0
            ) {

                return (
                    'âŒ O carrinho estÃ¡ vazio.\n\n' +
                    'NÃ£o foi possÃ­vel finalizar o pedido.'
                );
            }


            const order =
                await createOrder(
                    companyId,
                    conversationState?.customer_id,
                    conversationId
                );


            if (
                !order
            ) {

                return (
                    'âŒ NÃ£o foi possÃ­vel criar o pedido.\n\n' +
                    'Por favor, tente novamente.'
                );
            }


            for (
                const item of cart
            ) {

                const orderItem =
                    await addOrderItem(
                        companyId,
                        order.id,
                        item.product_id,
                        item.quantity
                    );


                if (
                    !orderItem
                ) {

                    console.error(
                        'âŒ Erro ao adicionar item ao pedido:',
                        item
                    );


                    return (
                        'âŒ O pedido foi criado, mas ocorreu ' +
                        'um erro ao adicionar um dos produtos.\n\n' +
                        'Por favor, contacte um atendente.'
                    );
                }
            }


            const updatedOrder =
                await updateOrderTotal(
                    companyId,
                    order.id
                );


            if (
                !updatedOrder
            ) {

                return (
                    'âŒ NÃ£o foi possÃ­vel calcular ' +
                    'o total do pedido.'
                );
            }


            await clearConversationState(
                companyId,
                conversationId
            );


            let resumo = '';


            cart.forEach(
                item => {

                    const subtotal =
                        Number(item.unit_price) *
                        Number(item.quantity);


                    resumo +=
                        `ðŸ” ${item.quantity}x ${item.product_name} â€” ${subtotal} MT\n`;
                }
            );


            return (
                'âœ… *Pedido confirmado com sucesso!*\n\n' +

                `${resumo}\n` +

                `ðŸ’µ *Total: ${updatedOrder.total} MT*\n\n` +

                'Obrigado pelo seu pedido! ðŸ™Œ\n\n' +

                getMenuOptions(
                    company,
                    settings
                )
            );
        }


        if (
            texto === '2' ||
            intent === 'deny' ||
            intent === 'cancel'
        ) {

            await clearConversationState(
                companyId,
                conversationId
            );


            return (
                'âŒ *Pedido cancelado.*\n\n' +
                'Digite *OlÃ¡* para ver as opÃ§Ãµes disponÃ­veis.'
            );
        }


        return (
            'ðŸ¤” Por favor, escolha uma opÃ§Ã£o:\n\n' +

            '1ï¸âƒ£ Confirmar pedido\n' +
            '2ï¸âƒ£ Cancelar pedido'
        );
    }


    /**
     * =====================================================
     * SERVIÃ‡OS
     * =====================================================
     */

    if (
        intent === 'services'
    ) {

        if (
            businessType !== 'services'
        ) {

            return (
                'â„¹ï¸ Esta empresa trabalha principalmente com produtos.'
            );
        }


        if (
            !settings.menu_enabled
        ) {

            return (
                'â„¹ï¸ Os serviÃ§os nÃ£o estÃ£o disponÃ­veis neste momento.'
            );
        }


        await updateConversationState(
            companyId,
            conversationId,

            'viewing_services',

            {}
        );


        return await showServicesMenu(
            companyId,
            company.name
        );
    }


    /**
     * =====================================================
     * SOLICITAR SERVIÃ‡O / ORÃ‡AMENTO
     * =====================================================
     */

    if (
        intent === 'service_request'
    ) {

        if (
            businessType !== 'services'
        ) {

            return (
                'â„¹ï¸ Esta opÃ§Ã£o nÃ£o estÃ¡ disponÃ­vel para este negÃ³cio.'
            );
        }



        await updateConversationState(
            companyId,
            conversationId,

            'viewing_services',

            {}
        );


        return await showServicesMenu(
            companyId,
            company.name
        );
    }


    /**
     * =====================================================
     * MENU
     * =====================================================
     */

    if (
        intent === 'menu'
    ) {

        if (
            !settings.menu_enabled
        ) {

            return (
                'â„¹ï¸ O menu nÃ£o estÃ¡ disponÃ­vel neste momento.'
            );
        }


        if (
            businessType === 'services'
        ) {

            await updateConversationState(
                companyId,
                conversationId,

                'viewing_services',

                {}
            );


            return await showServicesMenu(
                companyId,
                company.name
            );
        }


        const products =
            await getProducts(
                companyId
            );


        if (
            products.length === 0
        ) {

            return (
                'ðŸ˜• Neste momento nÃ£o existem ' +
                'produtos disponÃ­veis.'
            );
        }


        await updateConversationState(
            companyId,
            conversationId,

            'viewing_menu',

            {}
        );


        return await showProductsMenu(
            companyId,
            company.name
        );
    }


    /**
     * =====================================================
     * PEDIDO
     * =====================================================
     */

    if (
        intent === 'order'
    ) {

        if (
            !settings.orders_enabled
        ) {

            return (
                'â„¹ï¸ Os pedidos nÃ£o estÃ£o disponÃ­veis neste momento.'
            );
        }


        if (
            businessType === 'services'
        ) {

            return (
                'ðŸŒ¿ Este negÃ³cio trabalha com serviÃ§os.\n\n' +
                'Digite *1* para ver os serviÃ§os ou *2* ' +
                'para solicitar um serviÃ§o/orÃ§amento.'
            );
        }


        await updateConversationState(
            companyId,
            conversationId,

            'waiting_product',

            {
                cart: []
            }
        );


        return (
            'ðŸ›’ *Vamos fazer o seu pedido!*\n\n' +

            'Qual produto deseja?'
        );
    }


    /**
     * =====================================================
     * LOCALIZAÃ‡ÃƒO
     * =====================================================
     */

    if (
        intent === 'location'
    ) {

        return (
            `ðŸ“ *${company.name}*\n\n` +

            (
                company.location ||
                'LocalizaÃ§Ã£o nÃ£o configurada.'
            )
        );
    }


    /**
     * =====================================================
     * HORÃRIO
     * =====================================================
     */

    if (
        intent === 'hours'
    ) {

        const formattedHours =
            formatBusinessHours(
                company.business_hours
            );


        if (
            !company.business_hours
        ) {

            return formattedHours;
        }


        return (
            `ðŸ•’ *HorÃ¡rio de funcionamento ${company.name}*\n\n` +

            formattedHours
        );
    }


    /**
     * =====================================================
     * PREÃ‡OS
     * =====================================================
     */

    if (
        intent === 'price'
    ) {

        if (
            businessType === 'services'
        ) {

            if (
                !settings.menu_enabled
            ) {

                return (
                    'â„¹ï¸ Os serviÃ§os nÃ£o estÃ£o disponÃ­veis neste momento.'
                );
            }


            await updateConversationState(
                companyId,
                conversationId,

                'viewing_services',

                {}
            );


            return await showServicesMenu(
                companyId,
                company.name
            );
        }


        if (
            !settings.menu_enabled
        ) {

            return (
                'â„¹ï¸ O menu nÃ£o estÃ¡ disponÃ­vel neste momento.'
            );
        }


        await updateConversationState(
            companyId,
            conversationId,

            'viewing_menu',

            {}
        );


        return await showProductsMenu(
            companyId,
            company.name
        );
    }


    /**
     * =====================================================
     * ATENDENTE
     * =====================================================
     */

    if (
        intent === 'attendant'
    ) {

        if (
            !settings.human_support_enabled
        ) {

            return (
                'â„¹ï¸ O atendimento humano nÃ£o estÃ¡ ' +
                'disponÃ­vel neste momento.'
            );
        }


        return (
            'ðŸ‘¤ Um atendente irÃ¡ falar consigo em breve.\n\n' +

            `Obrigado por contactar a ${company.name}!`
        );
    }


    /**
     * =====================================================
     * AJUDA
     * =====================================================
     */

    if (
        intent === 'help'
    ) {

        return getMainMenu(
            company,
            settings
        );
    }


    /**
     * =====================================================
     * AGRADECIMENTO
     * =====================================================
     */

    if (
        intent === 'thanks'
    ) {

        return (
            'ðŸ˜Š De nada! Estamos sempre Ã  disposiÃ§Ã£o.\n\n' +

            getMenuOptions(
                company,
                settings
            )
        );
    }


    /**
     * =====================================================
     * DESPEDIDA
     * =====================================================
     */

    if (
        intent === 'goodbye'
    ) {

        await clearConversationState(
            companyId,
            conversationId
        );


        return (
            'ðŸ‘‹ AtÃ© logo!\n\n' +

            `Obrigado por entrar em contacto com ${company.name}.`
        );
    }


    /**
     * =====================================================
     * CANCELAMENTO
     * =====================================================
     */

    if (
        intent === 'cancel'
    ) {

        await clearConversationState(
            companyId,
            conversationId
        );


        return (
            'âŒ A operaÃ§Ã£o atual foi cancelada.\n\n' +

            getMainMenu(
                company,
                settings
            )
        );
    }


    /**
     * =====================================================
     * NÃƒO RECONHECIDO
     * =====================================================
     */

    return (
        'ðŸ¤” Desculpe, nÃ£o entendi.\n\n' +

        'Pode escrever de vÃ¡rias formas, por exemplo:\n\n' +

        'â€¢ OlÃ¡\n' +
        'â€¢ Bom dia\n' +
        'â€¢ Quero ver o menu\n' +
        'â€¢ Quero fazer um pedido\n' +
        'â€¢ Onde ficam?\n' +
        'â€¢ Quero falar com um atendente\n\n' +

        'Ou envie *OlÃ¡* para ver as opÃ§Ãµes disponÃ­veis.'
    );
}


/**
 * =========================================================
 * EXPORTAR
 * =========================================================
 */

module.exports = {
    processMessage,
    getCompany
};



