require("dotenv").config()
const axios = require("axios")
const { getToken } = require("./auth")

const API_URL = process.env.API_URL

const getProductList = async (productCode, limit = 10) => {
    const token = await getToken()
    if (!token) {
        console.error("❌ Could not retrieve access token. Aborting request.")
        return
    }

    try {
        const response = await axios.get(`${API_URL}/api/v1/products/${productCode}/limit/${limit}`, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            transformResponse: [(data) => {
                const jsonStart = data.indexOf("{")
                if (jsonStart === -1) throw new Error("Invalid response format")
                return JSON.parse(data.substring(jsonStart))
            }]
        })

        if (response.data?.data) {
            console.log("✅ Product List Retrieved:", response.data.data)
            return response.data.data
        } else {
            console.error("❌ Unexpected response format:", response.data)
            return null
        }
    } catch (error) {
        console.error("❌ Error fetching product list:", error.response?.data || error.message)
        return null
    }
}

module.exports = { getProductList }
