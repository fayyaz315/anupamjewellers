require("dotenv").config()
const axios = require("axios")
const { getToken } = require("./auth")

const API_URL = process.env.API_URL

const requestProductCSVToFTP = async () => {
    const token = await getToken()
    if (!token) {
        console.error("❌ Could not retrieve access token. Aborting.")
        return
    }

    try {
        console.log("🔄 Requesting product CSV to be pushed to FTP...")

        const response = await axios.post(
            `${API_URL}/api/v1/products/sftp-csv`,
            {
                host: process.env.FTP_HOST,
                username: process.env.FTP_USERNAME,
                password: process.env.FTP_PASSWORD,
                directory: process.env.FTP_DIRECTORY,
                port: process.env.FTP_PORT ? parseInt(process.env.FTP_PORT) : undefined
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        )

        if (response.data?.status) {
            console.log("✅ API request accepted:", response.data.data.message)
        } else {
            console.error("❌ API responded with error:", response.data)
        }
    } catch (error) {
        console.error("❌ Error making API request:", error.response?.data || error.message)
    }
}


module.exports = { requestProductCSVToFTP }