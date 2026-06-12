const fetch = require("node-fetch");

const HORDE_KEY = "Sut1nNIb6N-uF2W71OmfHQ";

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const { inputs, parameters } = req.body;
    const clamp = (val) => Math.min(1024, Math.max(64, Math.round(val / 64) * 64));
    const width = clamp(parameters.width);
    const height = clamp(parameters.height);

    try {
        const submitRes = await fetch("https://stablehorde.net/api/v2/generate/async", {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": HORDE_KEY },
            body: JSON.stringify({
                prompt: inputs,
                params: { width, height, steps: 20, n: 1 },
                models: ["stable_diffusion"]
            })
        });

        const submitJson = await submitRes.json();
        const { id } = submitJson;
        if (!id) throw new Error(submitJson.message || "Failed to submit job");

        let imgUrl = null;
        for (let attempt = 0; attempt < 60; attempt++) {
            await new Promise(r => setTimeout(r, 3000));
            const checkRes = await fetch(`https://stablehorde.net/api/v2/generate/check/${id}`);
            const status = await checkRes.json();
            if (status.done) {
                const resultRes = await fetch(`https://stablehorde.net/api/v2/generate/status/${id}`);
                const result = await resultRes.json();
                imgUrl = result.generations[0].img;
                break;
            }
        }

        if (!imgUrl) throw new Error("Timed out");

        const buffer = Buffer.from(imgUrl, "base64");
        res.setHeader("Content-Type", "image/webp");
        res.send(buffer);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}