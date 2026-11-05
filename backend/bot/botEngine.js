
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
    detectIntent
} = require('../services/intentService');


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

        .eq(
            'id',
            companyId
        )

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

        .eq(
            'company_id',
            companyId
        )

        .eq(
            'available',
            true
        )

        .order(
            'name'
        );


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
 * MENU PRINCIPAL
 * =========================================================
 */

/**
 * =========================================================
 * AÇÕES DO MENU PRINCIPAL
 * =========================================================
 *
 * Esta função é a única fonte de verdade dos números
 * apresentados ao cliente.
 */
function getMainMenuActions(
    company,
    settings
) {

    const businessType =
        company.business_type || 'other';

    const actions = [];


    /**
     * VER MENU / SERVIÇOS
     */
    if (
        settings.menu_enabled
    ) {

        actions.push({
            intent:
                businessType === 'service'
                    ? 'services'
                    : 'menu',

            label:
                businessType === 'service'
                    ? 'Ver os nossos serviços'
                    : 'Ver o menu'
        });
    }


    /**
     * PEDIDO / SOLICITAÇÃO DE SERVIÇO
     */
    if (
        settings.orders_enabled
    ) {

        actions.push({
            intent:
                businessType === 'service'
                    ? 'service_request'
                    : 'order',

            label:
                businessType === 'service'
                    ? 'Solicitar um serviço / orçamento'
                    : 'Fazer um pedido'
        });
    }


    /**
     * LOCALIZAÇÃO
     *
     * A localização fica sempre disponível.
     */
    actions.push({
        intent: 'location',
        label: 'Ver localização'
    });


    /**
     * ATENDENTE
     */
    if (
        settings.human_support_enabled
    ) {

        actions.push({
            intent: 'attendant',
            label: 'Falar com um atendente'
        });
    }


    /**
     * Atribui os números automaticamente.
     */
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
 * MENU DE OPÇÕES APÓS UMA AÇÃO
 * =========================================================
 *
 * Não inclui a mensagem de boas-vindas novamente.
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

        quantity:
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
 * HORÁRIOS DE FUNCIONAMENTO
 * =========================================================
 */

function formatBusinessHours(businessHours) {

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


/**
 * =========================================================
 * VERIFICAR SE A EMPRESA ESTÁ ABERTA
 * =========================================================
 */

function getCurrentBusinessStatus(businessHours) {

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
        dayNames[
            now.getDay()
        ];


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


    const isOpen =
        currentMinutes >= openMinutes &&
        currentMinutes < closeMinutes;


    return {
        configured: true,
        isOpen: isOpen,
        day: currentDay,
        schedule: today
    };
}


/**
 * =========================================================
 * PRÓXIMO HORÁRIO DE FUNCIONAMENTO
 * =========================================================
 */

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
 * EXPIRAÇÃO DA CONVERSA
 * =========================================================
 *
 * Se o cliente ficar muito tempo sem responder,
 * o fluxo atual é encerrado automaticamente.
 *
 * 60 minutos = 1 hora.
 */

const CONVERSATION_TIMEOUT_MINUTES = 60;


function hasConversationExpired(
    updatedAt
) {

    if (!updatedAt) {

        return true;
    }


    const lastActivity =
        new Date(
            updatedAt
        );


    const now =
        new Date();


    const differenceMilliseconds =
        now.getTime() -
        lastActivity.getTime();


    const differenceMinutes =
        differenceMilliseconds /
        (1000 * 60);


    return (
        differenceMinutes >=
        CONVERSATION_TIMEOUT_MINUTES
    );
}


/**
 * =========================================================
 * INTENÇÕES QUE PODEM INTERROMPER UM FLUXO
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
 * PROCESSAMENTO PRINCIPAL
 * =========================================================
 */

async function processMessage(
    messageText,
    companyId,
    conversationId
) {

    /**
     * =====================================================
     * DETECTAR INTENÇÃO
     * =====================================================
     *
     * Agora a interpretação da linguagem natural é feita
     * pelo intentService.
     */

    const detectedIntent =
        detectIntent(
            messageText
        );


    /**
     * O intentService já devolve o texto normalizado.
     */

    const texto =
        detectedIntent.text;


    /**
     * Converte a intenção para minúsculas para manter
     * compatibilidade com os handlers existentes.
     */

    let intent =
        detectedIntent.intent.toLowerCase();


    /**
     * Compatibilidade entre os nomes do intentService
     * e os nomes utilizados neste botEngine.
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
     * =====================================================
     * ESTADO DA CONVERSA
     * =====================================================
     */

const conversationState =
    await getConversationState(
        companyId,
        conversationId
    );


if (
    !conversationState
) {

    return (
        '❌ Não foi possível carregar ' +
        'o estado da conversa.'
    );
}


/**
 * =====================================================
 * ESTADO INICIAL DA CONVERSA
 * =====================================================
 */

let state =
    conversationState.state || 'idle';


let context =
    conversationState.context || {};


/**
 * =====================================================
 * VERIFICAR SE A CONVERSA EXPIROU
 * =====================================================
 */

const conversationExpired =
    hasConversationExpired(
        conversationState.updated_at
    );


if (
    conversationExpired &&
    state !== 'idle'
) {

    console.log(
        `⏰ Conversa ${conversationId} expirou. ` +
        `Estado anterior: ${state}`
    );


    await clearConversationState(
        companyId,
        conversationId
    );


    state =
        'idle';


    context =
        {};
}


/**
 * =====================================================
 * ATUALIZAR ÚLTIMA ATIVIDADE
 * =====================================================
 *
 * A partir daqui consideramos que o cliente voltou
 * a estar ativo.
 */

await touchConversationActivity(
    companyId,
    conversationId
);


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

        return (
            '❌ Não foi possível carregar ' +
            'as informações da empresa.'
        );
    }


    /**
     * =====================================================
     * CONFIGURAÇÕES
     * =====================================================
     */

    const settings =
        await getBotSettings(
            companyId
        );


    if (
        !settings
    ) {

        return (
            '❌ Não foi possível carregar ' +
            'as configurações do bot.'
        );
    }


    /**
     * =====================================================
     * BOT DESATIVADO
     * =====================================================
     */

    if (
        !settings.bot_enabled
    ) {

        return null;
    }


    const businessType =
        company.business_type || 'other';


      /**
 * =====================================================
 * PROTEGER FLUXOS QUANDO UMA OPÇÃO É DESATIVADA
 * =====================================================
 */

// Fluxos que dependem do menu
const menuStates = [
    'viewing_menu',
    'viewing_services',
    'viewing_service'
];

// Fluxos que dependem de pedidos
const orderStates = [
    'waiting_product',
    'waiting_quantity',
    'cart_menu',
    'editing_cart',
    'editing_cart_item',
    'confirming_order',
    'service_request'
];

// Se o menu foi desativado durante uma consulta
if (
    !settings.menu_enabled &&
    menuStates.includes(state)
) {
    await clearConversationState(companyId,conversationId);

    return (
        'ℹ️ O menu e a consulta de produtos ou serviços ' +
        'não estão disponíveis neste momento.'
    );
}

// Se os pedidos foram desativados durante uma operação
if (
    !settings.orders_enabled &&
    orderStates.includes(state)
) {
    await clearConversationState(companyId, conversationId);

    return (
        'ℹ️ Os pedidos e solicitações estão ' +
        'temporariamente desativados.\n\n' +
        'Pode continuar a consultar as informações da empresa.'
    );
}  

/**
 * =========================================================
 * COMANDOS QUE PODEM INTERROMPER QUALQUER FLUXO
 * =========================================================
 *
 * Algumas intenções devem ter prioridade sobre o estado
 * atual da conversa.
 *
 * Exemplo:
 *
 * Bot: Quantas unidades deseja?
 * Cliente: Olá
 *
 * O "Olá" deve reiniciar a conversa.
 */


/**
 * SAUDAÇÃO
 */

if (
    intent === 'greeting'
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
 * CANCELAMENTO
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
 * AJUDA
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
 *
 * Se o cliente estiver no meio de uma operação e enviar
 * uma intenção completamente diferente, abandonamos
 * o fluxo atual e tratamos a nova intenção.
 *
 * Exemplo:
 *
 * Bot: Quantas unidades deseja?
 *
 * Cliente: Onde ficam?
 *
 * Resultado:
 *
 * waiting_quantity
 *        ↓
 *     location
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


    state =
        'idle';


    context =
        {};
}
        


/**
 * =====================================================
 * NÚMEROS DO MENU PRINCIPAL
 * =====================================================
 *
 * Os números são obtidos dinamicamente através
 * de getMainMenuActions().
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


        let service =
            null;


        /**
         * Escolha pelo número
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
         * Escolha pelo nome
         */

        if (
            !service
        ) {

            service =
                await getServiceByName(
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
 *
 * Permite que o cliente pergunte pelo preço enquanto
 * está vendo os detalhes de um serviço.
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
     * SERVIÇOS — DETALHES
     * =====================================================
     */

    if (
        state === 'viewing_service'
    ) {

        if (
            texto === '1' ||
            texto === 'sim' ||
            texto === 's'
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
            texto === 'nao' ||
            texto === 'não' ||
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
            conversationState.customer_id;


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


            await updateConversationState(
                companyId,
                conversationId,

                'viewing_product',

                {
                    product_id:
                        product.id,

                    product_name:
                        product.name,

                    unit_price:
                        product.price
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

            await updateConversationState(
                companyId,
                conversationId,

                'viewing_product',

                {
                    product_id:
                        product.id,

                    product_name:
                        product.name,

                    unit_price:
                        product.price
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

            'Digite o número do produto ' +
            'ou o nome do produto.'
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
            texto === 'sim' ||
            texto === 's' ||
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
            texto === 'nao' ||
            texto === 'não' ||
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


        let product =
            null;


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

                'Digite o nome ou número ' +
                'do produto.'
            );
        }


        const currentCart =
            context.cart || [];


        await updateConversationState(
            companyId,
            conversationId,

            'waiting_quantity',

            {
                product_id:
                    product.id,

                product_name:
                    product.name,

                unit_price:
                    product.price,

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

        const quantity =
            parseInt(
                texto,
                10
            );


        if (
            isNaN(quantity) ||
            quantity <= 0
        ) {

            return (

                '❌ Quantidade inválida.\n\n' +

                'Digite apenas um número ' +
                'maior que zero.'
            );
        }


        const product =
            context;


        let cart =
            context.cart || [];


        const cartProduct = {

            product_id:
                product.product_id,

            product_name:
                product.product_name,

            unit_price:
                Number(
                    product.unit_price
                )
        };


        cart =
            addProductToCart(

                cart,

                cartProduct,

                quantity
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
                cart:
                    cart,

                total:
                    total
            }
        );


        return (

            `✅ *${quantity}x ${product.product_name}* ` +
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

        const cart =
            context.cart || [];


        if (
            texto === '1' ||
            texto === 'sim' ||
            texto === 'adicionar' ||
            texto === 'outro'
        ) {

            await updateConversationState(
                companyId,
                conversationId,

                'waiting_product',

                {
                    cart:
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

                return (
                    '🛒 O seu carrinho está vazio.'
                );
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
                    cart:
                        cart,

                    total:
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

                return (
                    '🛒 O seu carrinho está vazio.'
                );
            }


            await updateConversationState(
                companyId,
                conversationId,

                'editing_cart',

                {
                    cart:
                        cart
                }
            );


            return formatCartForEditing(
                cart
            );
        }


        if (
            texto === '4' ||
            texto === 'cancelar'
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
                    cart:
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
                cart:
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
                    cart:
                        cart
                }
            );


            return formatCartForEditing(
                cart
            );
        }


        const quantity =
            parseInt(
                texto,
                10
            );


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
                    cart:
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
                cart:
                    cart,

                total:
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

                `🗑️ *${productName}* foi removido ` +
                'do pedido.\n\n' +

                `${formatCart(cart)}\n\n` +

                'O que deseja fazer?\n\n' +

                '1️⃣ Adicionar outro produto\n' +
                '2️⃣ Finalizar pedido\n' +
                '3️⃣ Alterar carrinho\n' +
                '4️⃣ Cancelar pedido'
            );
        }


        return (

            `✅ Quantidade de *${productName}* ` +
            'atualizada.\n\n' +

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
            texto === 'sim' ||
            texto === 's' ||
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

                    conversationState.customer_id,

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

                        item.quantity,

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


            let resumo =
                '';


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
            texto === 'nao' ||
            texto === 'não' ||
            texto === 'n' ||
            texto === 'cancelar'
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
            businessType !== 'service'
        ) {

            return (
                'ℹ️ Esta empresa trabalha principalmente ' +
                'com produtos.'
            );
        }


        if (
            !settings.menu_enabled
        ) {

            return (
                'ℹ️ Os serviços não estão disponíveis ' +
                'neste momento.'
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
            businessType !== 'service'
        ) {

            return (
                'ℹ️ Esta opção não está disponível ' +
                'para este negócio.'
            );
        }


        if (
            !settings.orders_enabled
        ) {

            return (
                'ℹ️ As solicitações de serviço ' +
                'não estão disponíveis neste momento.'
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
     * MENU DE PRODUTOS
     * =====================================================
     */

    if (
    intent === 'menu'
    ) {

        if (!settings.menu_enabled) {
            return (
                'ℹ️ O menu não está disponível ' +
                'neste momento.'
            );
        }

    if (
        businessType === 'service'
    ) {
        return await showServicesMenu(
            companyId,
            company.name
        );
    }


        if (
            !settings.menu_enabled
        ) {

            return (
                'ℹ️ O menu não está disponível ' +
                'neste momento.'
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

        if (!settings.orders_enabled) {
            return (
                'ℹ️ Os pedidos não estão disponíveis ' +
                'neste momento.'
            );  
        }

        if (
            businessType === 'service'
        ) {

            return (
                '🌿 Este negócio trabalha com serviços.\n\n' +
                'Digite *1* para ver os serviços ou *2* ' +
                'para solicitar um serviço/orçamento.'
            );
        }


        if (
            !settings.orders_enabled
        ) {

            return (
                'ℹ️ Os pedidos não estão disponíveis ' +
                'neste momento.'
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

            `${
                company.location ||
                'Localização não configurada.'
            }`
        );
    }


    /**
     * =====================================================
     * HORÁRIO
     * =====================================================
     *
     * A intenção já é reconhecida pelo intentService.
     *
     * Como o campo de horário ainda não faz parte da
     * estrutura confirmada da empresa, não inventamos
     * informação.
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
            businessType === 'service'
        ) {

            if (
                !settings.menu_enabled
            ) {

                return (
                    'ℹ️ Os serviços não estão disponíveis ' +
                    'neste momento.'
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
                'ℹ️ O menu não está disponível ' +
                'neste momento.'
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

            '👤 Um atendente irá falar consigo ' +
            'em breve.\n\n' +

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
     * MENSAGEM NÃO RECONHECIDA
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
