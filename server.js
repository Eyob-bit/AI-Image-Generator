require('dotenv').config();
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("."));

const HORDE_KEY = "Sut1nNIb6N-uF2W71OmfHQ"; // replace with your key after registering

app.post("/generate", async (req, res) => {
    const { inputs, parameters } = req.body;

    // Clamp dimensions to Stable Horde limits
    const clamp = (val) => Math.min(1024, Math.max(64, Math.round(val / 64) * 64));
    const width = clamp(parameters.width);
    const height = clamp(parameters.height);

    try {
        const submitRes = await fetch("https://stablehorde.net/api/v2/generate/async", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": HORDE_KEY
            },
            body: JSON.stringify({
                prompt: inputs,
                params: { width, height, steps: 20, n: 1 },
                models: ["stable_diffusion"]
            })
        });

        const submitJson = await submitRes.json();
        console.log("Horde response:", submitJson);
        const { id } = submitJson;
        if (!id) throw new Error(submitJson.message || "Failed to submit job");

        // Poll until done
        let imgUrl = null;
        for (let attempt = 0; attempt < 60; attempt++) {
            await new Promise(r => setTimeout(r, 3000));
            const checkRes = await fetch(`https://stablehorde.net/api/v2/generate/check/${id}`);
            const status = await checkRes.json();
            console.log(`Poll ${attempt + 1}:`, status.done, status.wait_time);

            if (status.done) {
                const resultRes = await fetch(`https://stablehorde.net/api/v2/generate/status/${id}`);
                const result = await resultRes.json();
                imgUrl = result.generations[0].img;
                break;
            }
        }

        if (!imgUrl) throw new Error("Timed out");

        const buffer = Buffer.from(imgUrl, "base64");
        res.set("Content-Type", "image/webp");
        res.send(buffer);

    } catch (err) {
        console.error("Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

