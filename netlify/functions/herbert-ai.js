const https = require('https');

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: "API Key fehlt" }) };

    try {
        const { question, financialContext } = JSON.parse(event.body);
        
        // Hier definieren wir das Modell explizit für die REST-API
        const modelName = "gemini-1.5-flash"; // REST-API Pfade nutzen intern oft noch diese Bezeichnung
        const postData = JSON.stringify({
            contents: [{ parts: [{ text: `Du bist Herbert, Finanzberater. Kontext: ${JSON.stringify(financialContext)}. Frage: ${question}` }] }]
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };

        return await new Promise((resolve) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (c) => data += c);
                res.on('end', () => {
                    const parsed = JSON.parse(data);
                    if (parsed.candidates) {
                        resolve({ statusCode: 200, body: JSON.stringify({ answer: parsed.candidates[0].content.parts[0].text }) });
                    } else {
                        resolve({ statusCode: 500, body: JSON.stringify({ error: "Fehler: " + JSON.stringify(parsed) }) });
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