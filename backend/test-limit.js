const axios = require('axios');

async function testPayloadLimit() {
    console.log("Testing Backend Payload Limit...");

    // Create a large payload (~5MB)
    const largeString = 'a'.repeat(5 * 1024 * 1024);
    const payload = {
        certId: "TEST-LMT-001",
        studentName: "Test Student",
        largeData: largeString
    };

    try {
        console.log("Sending ~5MB payload to /api/certificates/generate-pdf...");
        const response = await axios.post('http://localhost:5000/api/certificates/generate-pdf', payload, {
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        console.log("Response status:", response.status);
        console.log("✅ Success! Backend accepted the large payload.");
    } catch (error) {
        if (error.response) {
            console.error("❌ Failed! Status:", error.response.status);
            console.error("Error data:", error.response.data);
            if (error.response.status === 413) {
                console.error("Tip: Request entity too large. Limit might not be active.");
            }
        } else {
            console.error("❌ Connection error. Is the backend running?");
            console.error(error.message);
        }
    }
}

testPayloadLimit();
