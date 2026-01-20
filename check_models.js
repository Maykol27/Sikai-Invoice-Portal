
const apiKey = 'AIzaSyDIl8vXV5B6DRs0vGTVD02gtD31bZhSeW8';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        console.error("API Error:", data.error.message);
    } else if (data.models) {
        console.log("Available Models:");
        data.models.forEach(m => {
            // Filter for models that support content generation
            if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                console.log(`- ${m.name}`);
            }
        });
    } else {
        console.log("Unexpected response structure:", data);
    }
} catch (error) {
    console.error("Fetch error:", error);
}
