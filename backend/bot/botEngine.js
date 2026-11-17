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
    getProductByName
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
            '❌ Erro ao buscar empresa:',
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
            '❌ Erro ao buscar produtos:',
            error
        );

        return [];
    }

    return data || [];
}


/**
 * =========================================================
 * AÇÕES DO MENU PRINCIPAL
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
     * EMPRESAS DE SERVIÇOS
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
                label: 'Ver os nossos serviços'
            });
        }


        actions.push({
            intent: 'service_request',
            label: 'Solicitar um serviço / orçamento'
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
     * LOCALIZAÇÃO
     * =====================================================
     */

    actions.push({
        intent: 'location',
        label: 'Ver localização'
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
        `👋 Olá! Bem-vindo à ${company.name}!`;

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
            `${action.number}️⃣ ${action.label}\n`;
    }


    menu +=
        '\nDigite o número da opção desejada.';


    return menu;
}


/**
 * =========================================================
 * MENU DE OPÇÕES
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
            `${action.number}️⃣ ${action.label}\n`;
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
            '😕 Neste momento não existem ' +
            'produtos disponíveis.'
        );
    }


    let resposta =
        `🍔 *MENU ${companyName.toUpperCase()}*\n\n`;


    products.forEach(
        (
            product,
            index
        ) => {

            resposta +=
                `${index + 1}. ${product.name} — ${product.price} MT\n`;
        }
    );


    resposta +=
        '\nDigite o número ou nome do produto.';


    return resposta;
}


/**
 * =========================================================
 * MENU DE SERVIÇOS
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
            '😕 Neste momento não existem ' +
            'serviços disponíveis.'
        );
    }


    let resposta =
        `🌿 *SERVIÇOS ${companyName.toUpperCase()}*\n\n`;


    services.forEach(
        (
            service,
            index
        ) => {

            let price =
                'Sob orçamento';


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
                `${index + 1}. ${service.name} — ${price}\n`;


            if (
                service.description
            ) {

                resposta +=
                    `   ${service.description}\n`;
            }
        }
    );


    resposta +=
        '\nDigite o número ou nome do serviço.';


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

        return '🛒 O seu carrinho está vazio.';
    }


    let resposta =
        '🛒 *Resumo do pedido*\n\n';


    cart.forEach(
        (
            item,
            index
        ) => {

            const subtotal =
                Number(item.unit_price) *
                Number(item.quantity);


            resposta +=
                `${index + 1}. ${item.quantity}x ${item.product_name} — ${subtotal} MT\n`;
        }
    );


    const total =
        calculateCartTotal(
            cart
        );


    resposta +=
        `\n💵 *Total: ${total} MT*`;


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
            '🛒 O carrinho está vazio.\n\n' +
            'Adicione um produto primeiro.'
        );
    }


    let resposta =
        '✏️ *Alterar carrinho*\n\n';


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
        '\nDigite o número do produto que deseja alterar.\n' +
        '0️⃣ Voltar';


    return resposta;
}


/**
 * =========================================================
 * HORÁRIOS
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
            '🕒 O horário de funcionamento ' +
            'ainda não foi configurado para esta empresa.'
        );
    }


    const days = [
        {
            key: 'monday',
            name: 'Segunda-feira'
        },
        {
            key: 'tuesday',
            name: 'Terça-feira'
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
            name: 'Sábado'
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
                `📅 ${day.name}: Não configurado\n`;

            return;
        }


        if (
            schedule.closed
        ) {

            resposta +=
                `🚫 ${day.name}: Fechado\n`;

            return;
        }


        const open =
            schedule.open || '--:--';

        const close =
            schedule.close || '--:--';


        resposta +=
            `📅 ${day.name}: ${open} - ${close}\n`;
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
        tuesday: 'Terça-feira',
        wednesday: 'Quarta-feira',
        thursday: 'Quinta-feira',
        friday: 'Sexta-feira',
        saturday: 'Sábado'
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
 * EXPIRAÇÃO
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
 * INTERRUPÇÕES
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
 * RESOLUÇÃO INTELIGENTE DE PRODUTO
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
            '❌ Erro ao resolver produto:',
            error
        );

        return null;
    }
}


/**
 * =========================================================
 * RESOLUÇÃO INTELIGENTE DE SERVIÇO
 * =========================================================
 *
 * O serviceService é responsável por procurar:
 *
 * 1. nome real do serviço
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
            '❌ Erro ao resolver serviço:',
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

    const quantity =
        intelligence?.entities?.quantity;


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
 * MEMÓRIA CONTEXTUAL DE PRODUTO
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
 * RESOLUÇÃO DE REFERÊNCIAS CONTEXTUAIS
 * =========================================================
 */

function isContextualProductReference(text) {

    if (!text) return false;

    const value = String(text)
        .toLowerCase()
        .trim();

    return (
        /^(esse|essa|aquele|aquela)$/i.test(value) ||
        /^(esse|essa|aquele|aquela)\s+(produto|item)$/i.test(value) ||
        /^(esse|essa|aquele|aquela)\s+(mesmo|mesma)$/i.test(value) ||
        /^(o|a)\s+mesm[oa]$/i.test(value) ||
        /^(quero|manda|adiciona|coloca|pega|vou querer)\s+(esse|essa|aquele|aquela)$/i.test(value) ||
        /^(quero|manda|adiciona|coloca|pega|vou querer)\s+(esse|essa|aquele|aquela)\s+(produto|item)$/i.test(value)
    );
}


function resolveContextualProduct(
    context,
    text
) {

    if (!isContextualProductReference(text)) {
        return null;
    }

    return getLastProduct(context);
}


/**
 * =========================================================
 * DETECÇÃO DE CONFIRMAÇÃO
 * =========================================================
 */

function isPositiveConfirmation(text) {

    if (!text) return false;

    return /^(sim|s|yes|pode|podes|quero|quero sim|pode ser|claro|ok|okay|adiciona|adicionar|manda|manda vir)$/i
        .test(String(text).trim());
}


function isNegativeConfirmation(text) {

    if (!text) return false;

    return /^(não|nao|n|no|não quero|nao quero|deixa|deixa estar|cancelar|cancela)$/i
        .test(String(text).trim());
}


/**
 * =========================================================
 * QUANTIDADE + REFERÊNCIA CONTEXTUAL
 * =========================================================
 */

function extractContextualQuantity(text) {

    if (!text) return null;

    const value = String(text)
        .toLowerCase()
        .trim();

    const match = value.match(
        /\b(\d+|um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez)\b/
    );

    if (!match) return null;

    const numbers = {
        um: 1,
        uma: 1,
        dois: 2,
        duas: 2,
        tres: 3,
        três: 3,
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
     * EXPIRAÇÃO
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
            '❌ Empresa não encontrada:',
            companyId
        );

        return null;
    }


    /**
     * =====================================================
     * CONFIGURAÇÕES DO BOT
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
            '❌ Configurações do bot não encontradas.'
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
     * CENTRO DE INTELIGÊNCIA CONVERSACIONAL
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
     * ENTIDADES EXTRAÍDAS PELO CÉREBRO
     * =====================================================
     */

    const entities =
        intelligence.entities || {};


    const productCandidate =
        entities.productCandidate ||
        null;


    const serviceCandidate =
        entities.serviceCandidate ||
        null;


    const intelligenceQuantity =
        getIntelligenceQuantity(
            intelligence
        );


    let texto =
        intelligence.normalizedText;


    let intent =
        String(
            intelligence.intent || 'unknown'
        ).toLowerCase();


    /**
     * =====================================================
     * REFERÊNCIA CONTEXTUAL DE PRODUTO
     * =====================================================
     */

    let contextualProduct =
        resolveContextualProduct(
            context,
            texto
        );


    let resolvedProductCandidate =
        productCandidate;


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
     * Log temporário do cérebro.
     */

    console.log(
        '🧠 INTELIGÊNCIA CONVERSACIONAL:',
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
            'ℹ️ O menu e a consulta de produtos ou serviços ' +
            'não estão disponíveis neste momento.'
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
            'ℹ️ Os pedidos e solicitações estão ' +
            'temporariamente desativados.\n\n' +
            'Pode continuar a consultar as informações da empresa.'
        );
    }


    /**
 * =====================================================
 * SAUDAÇÃO
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
        'Como posso ajudar? 😊'
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
            '❌ A operação atual foi cancelada.\n\n' +
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
     * INTERRUPÇÃO DE FLUXO
     * =====================================================
     */

    if (
        state !== 'idle' &&
        shouldInterruptConversation(intent) &&
        state !== 'service_request'
    ) {

        console.log(
            `🔄 Interrompendo fluxo "${state}" ` +
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
     * CONSULTA DE PREÇO DE PRODUTO
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
                `🤔 Não encontrei *${productCandidate}* no nosso menu.`
            );

        }


        return (
            `🍔 *${product.name}*\n\n` +
            `💰 Preço: *${product.price} MT*`
        );
    }


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


        if (!product) {

            return (
                `❌ Não temos *${productCandidate}* disponível no menu.`
            );

        }


        return (
            `✅ Sim, temos *${product.name}*.\n\n` +
            `💰 Preço: *${product.price} MT*\n\n` +
            'Deseja adicionar ao pedido?'
        );
    }


    /**
     * =====================================================
     * RESOLUÇÃO DE PRODUTO POR CONTEXTO
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
                    `✅ Adicionei *${product.name}* ` +
                    `(${intelligenceQuantity}x) ao seu pedido.\n\n` +
                    `${formatCart(cart)}\n\n` +
                    `💵 Total: *${total} MT*`
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
                `🍔 *${product.name}*\n\n` +
                `💰 Preço: *${product.price} MT*\n\n` +
                `Quantas unidades deseja?`
            );
        }
    }


    /**
     * =====================================================
     * CONFIRMAÇÃO CONTEXTUAL
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
                `✅ Adicionei *${confirmedProduct.product_name}* ao seu pedido.\n\n` +
                `${formatCart(cart)}\n\n` +
                `💵 Total: *${total} MT*\n\n` +
                `Deseja adicionar mais alguma coisa ou finalizar o pedido?`
            );
        }
    }


    /**
     * =====================================================
     * RECUSA DE CONFIRMAÇÃO
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
            `Tudo bem 👍 Não adicionei esse produto.\n\n` +
            `Posso ajudar com mais alguma coisa?`
        );
    }


    /**
     * =====================================================
     * REFERÊNCIA CONTEXTUAL + QUANTIDADE
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
                `✅ Adicionei *${contextualQuantity}x ${product.name}* ao seu pedido.\n\n` +
                `${formatCart(cart)}\n\n` +
                `💵 Total: *${total} MT*\n\n` +
                `Deseja adicionar mais alguma coisa ou finalizar o pedido?`
            );
        }
    }


    /**
     * =====================================================
     * RESOLUÇÃO INTELIGENTE DE PRODUTO
     * =====================================================
     */

    if (
        productCandidate &&
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
                    `✅ *${intelligenceQuantity}x ${product.name}* ` +
                    'adicionado ao pedido.\n\n' +

                    `${formatCart(cart)}\n\n` +

                    'O que deseja fazer?\n\n' +

                    '1️⃣ Adicionar outro produto\n' +
                    '2️⃣ Finalizar pedido\n' +
                    '3️⃣ Alterar carrinho\n' +
                    '4️⃣ Cancelar pedido'
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
                `🍔 *${product.name}*\n\n` +
                `💰 Preço: ${product.price} MT\n\n` +
                'Quantas unidades deseja?'
            );
        }
    }


    /**
     * =====================================================
     * NÚMERO DO MENU PRINCIPAL
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
     * SERVIÇOS — LISTA
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
                '😕 Neste momento não existem ' +
                'serviços disponíveis.'
            );
        }


        const serviceNumber =
            parseInt(
                texto,
                10
            );


        let service = null;


        /**
         * 1. Seleção por número.
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
         * 2. Seleção inteligente:
         *
         * Knowledge Engine
         *       ↓
         * serviceCandidate
         *       ↓
         * resolveServiceCandidate()
         *       ↓
         * serviceService
         *       ↓
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
         * simples que o Knowledge Engine não tenha
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
                'Sob orçamento';


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
                `🌿 *${service.name}*\n\n` +

                (
                    service.description
                        ? `${service.description}\n\n`
                        : ''
                ) +

                `💰 Preço: ${price}\n\n` +

                'Deseja solicitar este serviço?\n\n' +

                '1️⃣ Sim\n' +
                '2️⃣ Voltar aos serviços'
            );
        }


        return (
            '❌ Não encontrei esse serviço.\n\n' +
            'Digite o número ou nome do serviço.'
        );
    }


    /**
     * =====================================================
     * PREÇO DO SERVIÇO
     * =====================================================
     */

    if (
        state === 'viewing_service' &&
        intent === 'price'
    ) {

        let price =
            'Sob orçamento';


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
            `💰 *Preço: ${price}*\n\n` +

            `🌿 Serviço: ${context.service_name}\n\n` +

            'Deseja solicitar este serviço?\n\n' +

            '1️⃣ Sim\n' +
            '2️⃣ Voltar aos serviços'
        );
    }


    /**
     * =====================================================
     * SERVIÇO SELECIONADO
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
                `📋 *Solicitação de ${context.service_name}*\n\n` +

                'Explique brevemente o que precisa.\n\n' +

                'Exemplo:\n' +

                '“Preciso cortar a relva do meu jardim ' +
                'de aproximadamente 200 m².”'
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
            '🤔 Escolha uma opção:\n\n' +

            '1️⃣ Sim\n' +
            '2️⃣ Voltar aos serviços'
        );
    }


    /**
     * =====================================================
     * SOLICITAÇÃO DE SERVIÇO
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
                '❌ Não foi possível identificar o cliente.'
            );


            return (
                '❌ Não foi possível identificar o seu cadastro.\n\n' +
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
                '❌ Falha ao registrar solicitação.'
            );


            return (
                '❌ Não foi possível registrar a sua solicitação.\n\n' +
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
            'Serviço solicitado';


        return (
            '✅ *Solicitação registrada com sucesso!*\n\n' +

            `🌿 Serviço: ${serviceName}\n` +

            `📋 Pedido: ${requestText}\n\n` +

            `A ${company.name} recebeu a sua solicitação e poderá ` +
            'entrar em contacto consigo para confirmar os detalhes.\n\n' +

            'Obrigado! 🙌'
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
                '😕 Neste momento não existem ' +
                'produtos disponíveis.'
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
                `🍔 *${product.name}*\n\n` +

                `💰 Preço: ${product.price} MT\n\n` +

                'Deseja fazer um pedido?\n\n' +

                '1️⃣ Sim, fazer pedido\n' +
                '2️⃣ Voltar ao menu'
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
                `🍔 *${product.name}*\n\n` +

                `💰 Preço: ${product.price} MT\n\n` +

                'Deseja fazer um pedido?\n\n' +

                '1️⃣ Sim, fazer pedido\n' +
                '2️⃣ Voltar ao menu'
            );
        }


        return (
            '❌ Não encontrei esse produto.\n\n' +
            'Digite o número do produto ou o nome do produto.'
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
                `🍔 *${product.product_name}*\n\n` +

                `💰 Preço: ${product.unit_price} MT\n\n` +

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
            '🤔 Escolha uma opção:\n\n' +

            '1️⃣ Sim, fazer pedido\n' +
            '2️⃣ Voltar ao menu'
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
                '❌ Não encontrei esse produto.\n\n' +
                'Digite o nome ou número do produto.'
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
            `🍔 *${product.name}*\n\n` +

            `💰 Preço: ${product.price} MT\n\n` +

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
                '❌ Não consegui identificar a quantidade.\n\n' +

                'Por favor, diga quantas unidades deseja.\n\n' +

                'Exemplo: *2*, *dois* ou *quero três*.'
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
                '🤔 Não consegui identificar o produto.\n\n' +
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
            `✅ *${quantity}x ${cartProduct.product_name}* ` +
            'adicionado ao pedido.\n\n' +

            `${formatCart(cart)}\n\n` +

            'O que deseja fazer?\n\n' +

            '1️⃣ Adicionar outro produto\n' +
            '2️⃣ Finalizar pedido\n' +
            '3️⃣ Alterar carrinho\n' +
            '4️⃣ Cancelar pedido'
        );
    }


    /**
     * =====================================================
     * CARRINHO
     * =====================================================
     */

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
         * ADICIONAR MAIS DO ÚLTIMO PRODUTO
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
                `✅ Adicionei mais *${quantity}x ${lastProduct.product_name}*.\n\n` +

                `${formatCart(updatedCart)}\n\n` +

                'O que deseja fazer?\n\n' +

                '1️⃣ Adicionar outro produto\n' +
                '2️⃣ Finalizar pedido\n' +
                '3️⃣ Alterar carrinho\n' +
                '4️⃣ Cancelar pedido'
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
                `🍔 *${lastProduct.product_name}*\n\n` +

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
                `✅ Adicionei mais *1x ${lastProduct.product_name}*.\n\n` +

                `${formatCart(updatedCart)}\n\n` +

                'O que deseja fazer?\n\n' +

                '1️⃣ Adicionar outro produto\n' +
                '2️⃣ Finalizar pedido\n' +
                '3️⃣ Alterar carrinho\n' +
                '4️⃣ Cancelar pedido'
            );
        }


        /**
         * =================================================
         * TOTAL DO CARRINHO
         * =================================================
         */

        if (
            /quanto|total|deu|pagar|fica|valor/i.test(texto) &&
            !productCandidate
        ) {

            const total =
                calculateCartTotal(
                    cart
                );


            return (
                `${formatCart(cart)}\n\n` +

                `💵 O total atual é *${total} MT*.\n\n` +

                'Deseja adicionar mais alguma coisa ou finalizar o pedido?'
            );
        }


        /**
         * =================================================
         * REMOVER PRODUTO
         * =================================================
         */

        if (
            entities.removeAction &&
            (
                productCandidate ||
                entities.productPosition ||
                entities.reference
            )
        ) {

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
                        `🗑️ *${removed.product_name}* ` +
                        'foi removido do pedido.\n\n' +
                        'O carrinho está vazio.\n\n' +
                        'Deseja adicionar algum produto?'
                    );
                }


                return (
                    `🗑️ *${removed.product_name}* ` +
                    'foi removido do pedido.\n\n' +
                    `${formatCart(cart)}\n\n` +
                    `💵 Total: *${total} MT*\n\n` +
                    'O que deseja fazer?\n\n' +
                    '1️⃣ Adicionar outro produto\n' +
                    '2️⃣ Finalizar pedido\n' +
                    '3️⃣ Alterar carrinho\n' +
                    '4️⃣ Cancelar pedido'
                );
            }


            return (
                '🤔 Não consegui identificar qual produto deseja remover.\n\n' +
                `${formatCart(cart)}`
            );
        }


        /**
         * =================================================
         * ALTERAR QUANTIDADE
         * =================================================
         */

        if (
            entities.editAction &&
            productCandidate &&
            intelligenceQuantity
        ) {

            const product =
                await resolveProductCandidate(
                    companyId,
                    productCandidate
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
                        `✏️ Atualizei *${product.name}* ` +
                        `para *${intelligenceQuantity} unidades*.\n\n` +

                        `${formatCart(cart)}\n\n` +

                        `💵 Total: *${total} MT*\n\n` +

                        'Deseja adicionar mais alguma coisa ou finalizar o pedido?'
                    );
                }
            }
        }


        /**
         * =================================================
         * SELECIONAR ITEM PARA SUBSTITUIÇÃO
         * =================================================
         */

        if (
            entities.editAction &&
            !productCandidate &&
            entities.productPosition !== null &&
            entities.productPosition !== undefined
        ) {

            let itemIndex;


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

                const selectedProduct =
                    cart[itemIndex];


                await updateConversationState(
                    companyId,
                    conversationId,
                    'editing_cart_item',
                    {
                        ...context,

                        cart,

                        editingCartIndex:
                            itemIndex,

                        editingCartProduct:
                            selectedProduct
                    }
                );


                return (
                    `🔄 O produto selecionado é *${selectedProduct.product_name}*.\n\n` +

                    'Qual produto deseja colocar no lugar?'
                );
            }


            return (
                '🤔 Não encontrei esse produto no seu carrinho.\n\n' +
                `${formatCart(cart)}`
            );
        }


        /**
         * =================================================
         * OPÇÕES DO CARRINHO
         * =================================================
         */

        if (
            texto === '1' ||
            intent === 'confirm' ||
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
                '➕ *Adicionar outro produto*\n\n' +
                'Qual produto deseja adicionar?'
            );
        }


        if (
            texto === '2' ||
            texto === 'finalizar' ||
            texto === 'terminar'
        ) {

            if (
                cart.length === 0
            ) {

                return '🛒 O seu carrinho está vazio.';
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

                '1️⃣ Confirmar pedido\n' +
                '2️⃣ Cancelar pedido'
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

                return '🛒 O seu carrinho está vazio.';
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
                '❌ *Pedido cancelado.*\n\n' +
                'Digite *Olá* para ver as opções disponíveis.'
            );
        }


        return (
            `${formatCart(cart)}\n\n` +

            '🤔 Escolha uma opção:\n\n' +

            '1️⃣ Adicionar outro produto\n' +
            '2️⃣ Finalizar pedido\n' +
            '3️⃣ Alterar carrinho\n' +
            '4️⃣ Cancelar pedido'
        );
    }


    /**
     * =====================================================
     * REMOVER PRODUTO DO CARRINHO
     * =====================================================
     */

    if (
        entities.removeAction &&
        (
            productCandidate ||
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
                    `🗑️ *${removed.product_name}* ` +
                    'foi removido do pedido.\n\n' +
                    'O carrinho está vazio.\n\n' +
                    'Deseja adicionar algum produto?'
                );
            }


            return (
                `🗑️ *${removed.product_name}* ` +
                'foi removido do pedido.\n\n' +

                `${formatCart(updatedCart)}\n\n` +

                `💵 Total: *${total} MT*\n\n` +

                'O que deseja fazer?\n\n' +

                '1️⃣ Adicionar outro produto\n' +
                '2️⃣ Finalizar pedido\n' +
                '3️⃣ Alterar carrinho\n' +
                '4️⃣ Cancelar pedido'
            );
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

                '1️⃣ Adicionar outro produto\n' +
                '2️⃣ Finalizar pedido\n' +
                '3️⃣ Alterar carrinho\n' +
                '4️⃣ Cancelar pedido'
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
                    selectedNumber - 1
            }
        );


        return (
            `✏️ *${item.product_name}*\n\n` +

            `Quantidade atual: ${item.quantity}\n` +

            `Preço unitário: ${item.unit_price} MT\n\n` +

            'Digite a nova quantidade.\n\n' +

            'Digite *0* para remover este produto.\n' +

            'Digite *voltar* para voltar.'
        );
    }


    /**
     * =====================================================
     * SUBSTITUIÇÃO CONTEXTUAL DE PRODUTO
     * =====================================================
     */

    if (
        state === 'editing_cart_item' &&
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
                    editingCartProduct: null
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
                `🤔 Não encontrei *${texto}* no nosso menu.\n\n` +
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
            `✅ *${oldProduct.product_name}* foi substituído por ` +
            `*${replacementProduct.name}*.\n\n` +

            `${formatCart(cart)}\n\n` +

            `💵 Total: *${total} MT*\n\n` +

            `Deseja adicionar mais alguma coisa ou finalizar o pedido?`
        );
    }


    /**
     * =====================================================
     * INTENÇÃO + REFERÊNCIA CONTEXTUAL
     * =====================================================
     */

    if (
        contextualProduct &&
        businessType !== 'services'
    ) {

        const contextualProductName =
            contextualProduct.product_name;


        /**
         * PREÇO
         */

        if (
            intent === 'price' ||
            /quanto custa|qual o preco|qual o preço|quanto e|quanto é/i
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
                    `🍔 *${product.name}*\n\n` +
                    `💰 Preço: *${product.price} MT*`
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
                    `✅ Sim, temos *${product.name}*.\n\n` +
                    `💰 Preço: *${product.price} MT*\n\n` +
                    `Deseja adicionar ao pedido?`
                );
            }
        }


        /**
         * ADICIONAR PRODUTO CONTEXTUAL
         */

        if (
            /^(adiciona|adicionar|coloca|manda|quero|quero mais|manda mais)/i
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
                        `✅ Adicionei *${contextualQuantity}x ${product.name}* ao seu pedido.\n\n` +
                        `${formatCart(cart)}\n\n` +
                        `💵 Total: *${total} MT*\n\n` +
                        `Deseja adicionar mais alguma coisa ou finalizar o pedido?`
                    );
                }


                /**
                 * Sem quantidade:
                 * NÃO assumir 1.
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
                    `🍔 *${product.name}*\n\n` +
                    `💰 Preço: *${product.price} MT*\n\n` +
                    `Quantas unidades deseja?`
                );
            }
        }


        /**
         * REMOVER
         */

        if (
            /^(remove|remover|tira|tirar|retira|retirar|exclui|excluir)\b/i
                .test(texto)
        ) {

            const cart =
                Array.isArray(context.cart)
                    ? context.cart
                    : [];


            /**
             * CORREÇÃO:
             *
             * contextualProduct é um objeto.
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
                        `🗑️ Removi *${removedProduct.product_name}* do pedido.\n\n` +
                        `O seu carrinho está vazio.`
                    );
                }


                return (
                    `🗑️ Removi *${removedProduct.product_name}* do pedido.\n\n` +
                    `${formatCart(cart)}\n\n` +
                    `💵 Total: *${total} MT*`
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
        state === 'editing_cart_item'
    ) {

        const cart =
            context.cart || [];


        const itemIndex =
            Number(
                context.item_index
            );


        if (
            texto === 'voltar'
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
                '❌ Quantidade inválida.\n\n' +
                'Digite um número igual ou maior que zero.'
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
                `🗑️ *${productName}* foi removido.\n\n` +
                '🛒 O carrinho está vazio.\n\n' +
                'Digite *Olá* para começar novamente.'
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
                total
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
                `🗑️ *${productName}* foi removido do pedido.\n\n` +

                `${formatCart(cart)}\n\n` +

                'O que deseja fazer?\n\n' +

                '1️⃣ Adicionar outro produto\n' +
                '2️⃣ Finalizar pedido\n' +
                '3️⃣ Alterar carrinho\n' +
                '4️⃣ Cancelar pedido'
            );
        }


        return (
            `✅ Quantidade de *${productName}* atualizada.\n\n` +

            `${formatCart(cart)}\n\n` +

            'O que deseja fazer?\n\n' +

            '1️⃣ Adicionar outro produto\n' +
            '2️⃣ Finalizar pedido\n' +
            '3️⃣ Alterar carrinho\n' +
            '4️⃣ Cancelar pedido'
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
                    '❌ O carrinho está vazio.\n\n' +
                    'Não foi possível finalizar o pedido.'
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
                    '❌ Não foi possível criar o pedido.\n\n' +
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
                        '❌ Erro ao adicionar item ao pedido:',
                        item
                    );


                    return (
                        '❌ O pedido foi criado, mas ocorreu ' +
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
                    '❌ Não foi possível calcular ' +
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
                        `🍔 ${item.quantity}x ${item.product_name} — ${subtotal} MT\n`;
                }
            );


            return (
                '✅ *Pedido confirmado com sucesso!*\n\n' +

                `${resumo}\n` +

                `💵 *Total: ${updatedOrder.total} MT*\n\n` +

                'Obrigado pelo seu pedido! 🙌\n\n' +

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
                '❌ *Pedido cancelado.*\n\n' +
                'Digite *Olá* para ver as opções disponíveis.'
            );
        }


        return (
            '🤔 Por favor, escolha uma opção:\n\n' +

            '1️⃣ Confirmar pedido\n' +
            '2️⃣ Cancelar pedido'
        );
    }


    /**
     * =====================================================
     * SERVIÇOS
     * =====================================================
     */

    if (
        intent === 'services'
    ) {

        if (
            businessType !== 'services'
        ) {

            return (
                'ℹ️ Esta empresa trabalha principalmente com produtos.'
            );
        }


        if (
            !settings.menu_enabled
        ) {

            return (
                'ℹ️ Os serviços não estão disponíveis neste momento.'
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
     * SOLICITAR SERVIÇO / ORÇAMENTO
     * =====================================================
     */

    if (
        intent === 'service_request'
    ) {

        if (
            businessType !== 'services'
        ) {

            return (
                'ℹ️ Esta opção não está disponível para este negócio.'
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
                'ℹ️ O menu não está disponível neste momento.'
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
                '😕 Neste momento não existem ' +
                'produtos disponíveis.'
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
                'ℹ️ Os pedidos não estão disponíveis neste momento.'
            );
        }


        if (
            businessType === 'services'
        ) {

            return (
                '🌿 Este negócio trabalha com serviços.\n\n' +
                'Digite *1* para ver os serviços ou *2* ' +
                'para solicitar um serviço/orçamento.'
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
            '🛒 *Vamos fazer o seu pedido!*\n\n' +

            'Qual produto deseja?'
        );
    }


    /**
     * =====================================================
     * LOCALIZAÇÃO
     * =====================================================
     */

    if (
        intent === 'location'
    ) {

        return (
            `📍 *${company.name}*\n\n` +

            (
                company.location ||
                'Localização não configurada.'
            )
        );
    }


    /**
     * =====================================================
     * HORÁRIO
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
            `🕒 *Horário de funcionamento ${company.name}*\n\n` +

            formattedHours
        );
    }


    /**
     * =====================================================
     * PREÇOS
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
                    'ℹ️ Os serviços não estão disponíveis neste momento.'
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
                'ℹ️ O menu não está disponível neste momento.'
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
                'ℹ️ O atendimento humano não está ' +
                'disponível neste momento.'
            );
        }


        return (
            '👤 Um atendente irá falar consigo em breve.\n\n' +

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
            '😊 De nada! Estamos sempre à disposição.\n\n' +

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
            '👋 Até logo!\n\n' +

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
            '❌ A operação atual foi cancelada.\n\n' +

            getMainMenu(
                company,
                settings
            )
        );
    }


    /**
     * =====================================================
     * NÃO RECONHECIDO
     * =====================================================
     */

    return (
        '🤔 Desculpe, não entendi.\n\n' +

        'Pode escrever de várias formas, por exemplo:\n\n' +

        '• Olá\n' +
        '• Bom dia\n' +
        '• Quero ver o menu\n' +
        '• Quero fazer um pedido\n' +
        '• Onde ficam?\n' +
        '• Quero falar com um atendente\n\n' +

        'Ou envie *Olá* para ver as opções disponíveis.'
    );
}


/**
 * =========================================================
 * EXPORTAR
 * =========================================================
 */

module.exports = {
    processMessage
};
