const https = require('https');

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    
    // API-Key aus Netlify holen
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "API Key fehlt" }) };
    }

    try {
        const { question, financialContext } = JSON.parse(event.body);
        
        // System-Prompt für Herbert
        const systemInstruction = `Du bist Herbert, ein genialer Finanzberater. Deine Daten: ${JSON.stringify(financialContext)}. Antworte kurz, knackig und auf Deutsch.`;

        const postData = JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\nFrage: ${question}` }] }]
        });

        // Wir nutzen den stabilen Pfad für das Modell
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
                            resolve({ statusCode: 500, body: JSON.stringify({ error: "KI Antwort unleserlich: " + data }) });
                        }
                    } catch (e) {
                        resolve({ statusCode: 500, body: JSON.stringify({ error: "Parsing Fehler: " + data }) });
                    }
                });
            });

            req.on('error', (e) => resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) }));
            req.write(postData);
            req.end();
        });
    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ error: "Systemfehler: " + e.message }) };
    }
};