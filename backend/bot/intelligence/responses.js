const {
    chooseVariation
} = require('./variations');


function getResponse(
    type,
    previousResponse = null
) {

    return chooseVariation(
        type,
        previousResponse
    );
}


module.exports = {
    getResponse
};