const company = {
    name: 'Tem Mais Burguer',

    welcomeMessage:
        '👋 Olá! Bem-vindo ao Tem Mais Burguer 🍔\n\n' +
        'Como podemos ajudar?\n\n' +
        '1️⃣ Ver Menu\n' +
        '2️⃣ Promoções\n' +
        '3️⃣ Localização\n' +
        '4️⃣ Falar com atendente',

    menu: [
        {
            name: 'Classic Burger',
            price: 350
        },
        {
            name: 'Double Cheese',
            price: 450
        },
        {
            name: 'Chicken Burger',
            price: 400
        },
        {
            name: 'Batata',
            price: 150
        },
        {
            name: 'Refrigerante',
            price: 80
        }
    ],

    location:
        '📍 Tem Mais Burguer\n\n' +
        'Consulte a nossa localização através do Google Maps.',

    promotion:
        '🔥 PROMOÇÃO DO DIA\n\n' +
        '🍔 2 Double Cheese\n' +
        '🍟 + 2 Batatas\n' +
        '🥤 + 2 Refrigerantes\n\n' +
        '💰 Apenas 900 MT!'
};

module.exports = company;