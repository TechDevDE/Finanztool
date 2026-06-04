// netlify/functions/herbert-ai.js
const https = require('https');

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { question, financialContext } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: "API Key fehlt im Netlify-Dashboard!" }) };
        }

        const systemInstruction = `Du bist Herbert, ein genialer, humorvoller und ehrlicher Finanzberater. 
Du hast Zugriff auf die Live-Daten des Nutzers:
- Aktueller Monatsüberschuss: ${financialContext.surplus} €
- Gesamteinnahmen: ${financialContext.totalInc} €
- Gesamtausgaben: ${financialContext.totalExp} €
- Aktueller Depotwert: ${financialContext.depotValue} €
- Anzahl Assets im Depot: ${financialContext.assetCount}

Nutze diese exakten Zahlen, wenn der Nutzer Fragen stellt. Antworte immer auf Deutsch, sei direkt und nutze ab und zu Finanz-Slang.`;

        const postData = JSON.stringify({
            contents: [
                { role: "user", parts: [{ text: `${systemInstruction}\n\nNutzerfrage: ${question}` }] }
            ]
        });

        // Krisensicherer HTTPS-Call ohne externes "fetch"
        const responseBody = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'generativelanguage.googleapis.com',
                path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            });

            req.on('error', (e) => reject(e));
            req.write(postData);
            req.end();
        });

        const data = JSON.parse(responseBody);
        const aiAnswer = data.candidates[0].content.parts[0].text;

        return {
            statusCode: 200,
            headers: { 
                "Content-Type": "application/json; charset=utf-8",
                "Access-Control-Allow-Origin": "*" 
            },
            body: JSON.stringify({ answer: aiAnswer })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Fehler im Backend: " + error.message })
        };
    }
};