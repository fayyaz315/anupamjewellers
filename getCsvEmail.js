require("dotenv").config()
const axios = require("axios")
const { getToken } = require("./auth")

const API_URL = process.env.API_URL

// ✅ Function to request CSV file via email
const requestCSVByEmail = async () => {
    const token = await getToken()
    if (!token) {
        console.error("❌ Could not retrieve access token. Aborting request.")
        return
    }

    try {
        console.log("🔄 Sending request to receive CSV file via email...")

        const response = await axios.post(
            `${API_URL}/api/v1/products/email-csv`,
            { email: "fayyazraza@gmail.com" },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        )

        console.log("✅ Request accepted. CSV file will be sent to your email.")
        console.log("📩 Response:", response.data)
    } catch (error) {
        console.error("❌ Error requesting CSV via email:", error.response?.data || error.message)
    }
}

// ✅ Run the function
requestCSVByEmail()

module.exports = { requestCSVByEmail }
