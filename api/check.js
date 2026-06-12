const fetch = require("node-fetch");

module.exports = async function handler(req, res) {
    const { id } = req.query;
    const checkRes = await fetch(`https://stablehorde.net/api/v2/generate/check/${id}`);
    const status = await checkRes.json();

    if (status.done) {
        const resultRes = await fetch(`https://stablehorde.net/api/v2/generate/status/${id}`);
        const result = await resultRes.json();
        const imgUrl = result.generations[0].img;
        const buffer = Buffer.from(imgUrl, "base64");
        res.setHeader("Content-Type", "image/webp");
        return res.send(buffer);
    }

    res.json({ done: false, wait_time: status.wait_time });
};