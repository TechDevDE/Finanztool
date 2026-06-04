exports.handler = async function (event, context) {
    return {
        statusCode: 200,
        body: JSON.stringify({ answer: "Herbert hört dich! Das Backend läuft einwandfrei." })
    };
};