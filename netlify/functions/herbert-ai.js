const https = require('https');

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: "API Key fehlt" }) };

    try {
        const { question, financialContext } = JSON.parse(event.body);
        
        // Das ist das Daten-Format, das die "v1alpha" API für Preview-Modelle verlangt
        const postData = JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `Du bist Herbert. Kontext: ${JSON.stringify(financialContext)}. Frage: ${question}` }] }],
            // Konfiguration für das neue Modell
            generationConfig: {
                thinkingConfig: { thinking_level: "HIGH" }
            }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            // Preview-Modelle laufen meist über die v1alpha API
            path: `/v1alpha/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
        };

        return await new Promise((resolve) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (c) => data += c);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.candidates && parsed.candidates[0].content.parts[0].text) {
                            resolve({ statusCode: 200, body: JSON.stringify({ answer: parsed.candidates[0].content.parts[0].text }) });
                        } else {
                            resolve({ statusCode: 500, body: JSON.stringify({ error: data }) });
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