const https = require('https');

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    
    // Diagnose: Prüfen, ob der Key überhaupt ankommt
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("FEHLER: GEMINI_API_KEY ist in Netlify nicht gesetzt!");
        return { statusCode: 500, body: JSON.stringify({ error: "API Key fehlt" }) };
    }

    try {
        const { question, financialContext } = JSON.parse(event.body);
        const systemInstruction = `Du bist Herbert. Antworte kurz und direkt. Daten: ${JSON.stringify(financialContext)}`;

        const postData = JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\nFrage: ${question}` }] }]
        });

        return await new Promise((resolve) => {
            const req = https.request({
                hostname: 'generativelanguage.googleapis.com',
                path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, (res) => {
                let data = '';
                res.on('data', (c) => data += c);
                res.on('end', () => {
                    console.log("Antwort von Google erhalten:", data.substring(0, 50)); // Debug-Log
                    resolve({ statusCode: 200, body: data });
                });
            });

            req.on('error', (e) => {
                console.error("HTTPS Fehler:", e.message);
                resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
            });
            req.write(postData);
            req.end();
        });
    } catch (e) {
        console.error("Haupt-Fehler:", e.message);
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
};