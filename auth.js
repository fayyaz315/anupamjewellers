require("dotenv").config();
const axios = require("axios");

const API_URL = process.env.API_URL;
const EMAIL = process.env.THL_EMAIL;
const PASSWORD = process.env.THL_PASSWORD;

const getToken = async () => {
    try {
        const response = await axios.post(`${API_URL}/auth/token`, 
        {
            email: EMAIL,
            password: PASSWORD
        }, 
        {
            headers: { "Content-Type": "application/json" },
            transformResponse: [(data) => {
                // Remove any HTTP headers if present and extract JSON part
                const jsonStart = data.indexOf("{");
                return JSON.parse(data.substring(jsonStart));
            }]
        });

        // Check if response contains token
        if (response.data?.data?.token) {
            const token = response.data.data.token;
            console.log("✅ Access Token Retrieved");
            return token;
        } else {
            console.error("❌ Unexpected response format:", response.data);
            return null;
        }
    } catch (error) {
        console.error("❌ Error fetching access token:", error.response?.data || error.message);
        return null;
    }
};

// Export the function for use in other files
module.exports = { getToken };
