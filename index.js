const themeToggle = document.querySelector(".theme-toggle");
const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-container textarea");
const promptBtn = document.querySelector(".prompt-btn");
const modelSelect = document.querySelector("select[name='model']");
const countSelect = document.querySelector("select[name='count']");
const ratioSelect = document.querySelector("select[name='ratio']");
const gridGallery = document.querySelector(".gallery-grid");



const examplePrompts = [
    "A magic forest with glowing plants and fairy homes among giant mushrooms",
    "An old steampunk airship floating through golden clouds at sunset",
    "A future Mars colony with glass domes and gardens against red mountains",
    "A dragon sleeping on gold coins in a crystal cave",
    "An underwater kingdom with merpeople and glowing coral buildings",
    "A floating island with waterfalls pouring into clouds below",
    "A witch's cottage in fall with purple herbs in the garden",
    "A robot painting in a sunny studio with art supplies around it",
    "A magical library with floating glowing books and spiral staircases",
    "A Japanese shrine during cherry blossom season with lanterns and misty mountains"
];

// Set theme based on saved preference or system default
(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const isDarkTheme = savedTheme === "dark" || (!savedTheme && systemPrefersDark);
    document.body.classList.toggle("dark-theme", isDarkTheme);
    themeToggle.querySelector("i").className = isDarkTheme ? "fa-solid fa-sun" : "fa-solid fa-moon";
})();

// Switch between light and dark themes
const toggleTheme = () => {
    const isDarkTheme = document.body.classList.toggle("dark-theme");
    localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
    themeToggle.querySelector("i").className = isDarkTheme ? "fa-solid fa-sun" : "fa-solid fa-moon";
};

// Fill prompt input with random example
promptBtn.addEventListener("click", () => {
    const prompt = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
    promptInput.value = prompt;
    promptInput.focus();
});

// Calculate optimized image dimensions based on aspect ratio mapping to a base size
const getImageDimensions = (aspectRatio, baseSize = 512) => {
    const [widthRatio, heightRatio] = aspectRatio.split("/").map(Number);
    const scaleFactor = baseSize / Math.sqrt(widthRatio * heightRatio);

    let calculatedWidth = Math.round(widthRatio * scaleFactor);
    let calculatedHeight = Math.round(heightRatio * scaleFactor);

    // AI Models require width and height to be multi-blocks of 16
    calculatedWidth = Math.floor(calculatedWidth / 16) * 16;
    calculatedHeight = Math.floor(calculatedHeight / 16) * 16;

    return { width: calculatedWidth, height: calculatedHeight };
};

// Dynamically inject placeholder cards into the viewport grid
const createPlaceholderCards = (imageCount, aspectRatio) => {
    gridGallery.innerHTML = ""; // Wipe past generations

    for (let i = 0; i < imageCount; i++) {
        gridGallery.innerHTML += `
            <div class="img-card loading" id="img-card-${i}" style="aspect-ratio: ${aspectRatio}">
                <div class="status-container">
                    <div class="spinner"></div>
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p class="status-text">Generating...</p>
                </div>
                <img src="" alt="Generated image" class="result-img">
                <div class="img-overlay">
                    <button type="button" class="img-download-btn" aria-label="Download image">
                        <i class="fa-solid fa-download"></i>
                    </button>
                </div>
            </div>
        `;
    }
};

// Update individual card state upon successful buffer resolution
const updateImageCard = (index, imgUrl) => {
    const card = document.getElementById(`img-card-${index}`);
    const imgElement = card.querySelector(".result-img");
    const downloadBtn = card.querySelector(".img-download-btn");

    imgElement.src = imgUrl;
    
    // Setup download pipeline functionality
    downloadBtn.onclick = () => {
        const a = document.createElement("a");
        a.href = imgUrl;
        a.download = `ai-image-${Date.now()}-${index}.png`;
        a.click();
    };

    imgElement.onload = () => {
        card.classList.remove("loading");
    };
};

// Catch and swap element states into error design patterns
const handleCardError = (index, errorMessage) => {
    const card = document.getElementById(`img-card-${index}`);
    card.classList.remove("loading");
    card.classList.add("error");
    card.querySelector(".status-text").innerText = errorMessage;
};

// Dispatch parallel API generation tasks
const generateImages = async (selectedModel, imageCount, aspectRatio, promptText) => {
    const { width, height } = getImageDimensions(aspectRatio);

    const imagePromises = Array.from({ length: imageCount }, async (_, i) => {
        try {
            // Step 1: Submit
            const submitRes = await fetch("/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inputs: promptText, parameters: { width, height } })
            });
            const { id, error } = await submitRes.json();
            if (!id) throw new Error(error || "Failed to submit");

            // Step 2: Poll from the browser
            for (let attempt = 0; attempt < 60; attempt++) {
                await new Promise(r => setTimeout(r, 4000));
                const checkRes = await fetch(`/check?id=${id}`);

                if (checkRes.headers.get("content-type")?.includes("image")) {
                    const blob = await checkRes.blob();
                    updateImageCard(i, URL.createObjectURL(blob));
                    return;
                }

                const status = await checkRes.json();
                if (!status.done) continue;
            }

            throw new Error("Timed out");

        } catch (err) {
            handleCardError(i, err.message);
        }
    });

    await Promise.allSettled(imagePromises);
};

// Submit Action Pipeline Form Submission Handler
const handleFormSubmit = (e) => {
    e.preventDefault();

    // Pull selected form values
    const selectedModel = modelSelect.value;
    const imageCount = parseInt(countSelect.value) || 1;
    const aspectRatio = ratioSelect.value || "1/1";
    const promptText = promptInput.value.trim();

    // Step 1: Render structural placeholder containers
    createPlaceholderCards(imageCount, aspectRatio);

    // Step 2: Trigger Async Hugging Face requests
    generateImages(selectedModel, imageCount, aspectRatio, promptText);
};

themeToggle.addEventListener("click", toggleTheme);
promptForm.addEventListener("submit", handleFormSubmit);