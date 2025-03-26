require("dotenv").config();
const axios = require("axios");

const API_URL = "https://dataapi.treasurehouseco.com";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN; // Store this in .env for security

const productCodes = ["BD013", "BDQ701W/FG5", "CH105/18", "BR258/24", "BN374"];

async function getStockInfo() {
  try {
    const response = await axios.get(
      `${API_URL}/api/v1/products/stock?codes=${productCodes.join(",")}`,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`
        }
      }
    );

    console.log("✅ Stock Information:", response.data);
  } catch (error) {
    console.error("❌ Error fetching stock info:", error.response?.data || error.message);
  }
}

// Call function
getStockInfo();
