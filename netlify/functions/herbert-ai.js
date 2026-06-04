const https = require('https');

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    // API-Key holen und Leerzeichen entfernen
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";

    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "API Key fehlt" }) };
    }

    try {
        const { question, financialContext } = JSON.parse(event.body);
        
        const systemInstruction = `Du bist Herbert, ein genialer, humorvoller und ehrlicher Finanzberater. 
Du hast Zugriff auf diese Daten: ${JSON.stringify(financialContext)}. 
Antworte immer auf Deutsch, sei direkt und nutze Finanz-Slang.`;

        const postData = JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\nFrage: ${question}` }] }]
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        return await new Promise((resolve) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (c) => data += c);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.candidates && parsed.candidates[0].content.parts[0].text) {
                            resolve({
                                statusCode: 200,
                                body: JSON.stringify({ answer: parsed.candidates[0].content.parts[0].text })
                            });
                        } else {
                            resolve({ statusCode: 500, body: JSON.stringify({ error: "Keine KI-Antwort" }) });
                        }
                    } catch (e) {
                        resolve({ statusCode: 500, body: JSON.stringify({ error: "Parsing Fehler" }) });
                    }
                });
            });
            req.on('error', (e) => resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) }));
            req.write(postData);
            req.end();
        });
    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
};