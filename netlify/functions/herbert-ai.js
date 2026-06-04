const https = require('https');

exports.handler = async function (event, context) {
    // 1. Nur POST-Anfragen erlauben
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }
    
    // 2. API Key sicher laden und Leerzeichen entfernen
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "API Key fehlt" }) };
    }

    try {
        const { question, financialContext } = JSON.parse(event.body);
        
        // 3. Den Prompt zusammenbauen
        const postData = JSON.stringify({
            contents: [{ 
                parts: [{ 
                    text: `Du bist Herbert, ein Finanzberater. Kontext: ${JSON.stringify(financialContext)}. Frage: ${question}` 
                }] 
            }]
        });

        // 4. API-Optionen mit dem spezifischen Modellnamen
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-3-flash:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        // 5. Verbindung zu Google aufbauen
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
                            resolve({ statusCode: 500, body: JSON.stringify({ error: "Antwort-Fehler: " + data }) });
                        }
                    } catch (e) {
                        resolve({ statusCode: 500, body: JSON.stringify({ error: "Parsing-Fehler" }) });
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