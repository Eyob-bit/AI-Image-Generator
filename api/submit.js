const fetch = require("node-fetch");
const HORDE_KEY = "Sut1nNIb6N-uF2W71OmfHQ";

module.exports = async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();
    const { inputs, parameters } = req.body;
    const clamp = (val) => Math.min(1024, Math.max(64, Math.round(val / 64) * 64));

    const submitRes = await fetch("https://stablehorde.net/api/v2/generate/async", {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": HORDE_KEY },
        body: JSON.stringify({
            prompt: inputs,
            params: { width: clamp(parameters.width), height: clamp(parameters.height), steps: 20, n: 1 },
            models: ["stable_diffusion"]
        })
    });

    const data = await submitRes.json();
    if (!data.id) return res.status(500).json({ error: data.message || "Failed" });
    res.json({ id: data.id });
};