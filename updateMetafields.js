const Shopify = require("shopify-api-node")
require("dotenv").config()

const shopify = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    apiKey: process.env.SHOPIFY_API_KEY,
    password: process.env.SHOPIFY_API_PASSWORD
})

// Delay function for throttling requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function updateProductMetafields() {
    try {
        console.log("📦 Fetching all products from Shopify...")

        // Fetch all products (Paginate to handle large stores)
        let products = []
        let params = { limit: 50 }
        do {
            const batch = await shopify.product.list(params)
            products = products.concat(batch)
            params = batch.nextPageParameters
            await delay(1000) // Prevent hitting rate limits
        } while (params)

        console.log(`✅ Retrieved ${products.length} products.`)

        // Loop through each product
        for (const product of products) {
            console.log(`\n🔍 Processing Product: ${product.title} (ID: ${product.id})`)

            for (const variant of product.variants) {
                console.log(`⚙️ Updating Variant ID: ${variant.id}`)

                const currentPrice = parseFloat(variant.price || 0)
                const newDiscountedPrice = (currentPrice * 0.9).toFixed(2) // Apply 10% discount

                // Metafield updates
                const metafields = [
                    {
                        key: "base_price",
                        value: JSON.stringify({ amount: currentPrice.toString(), currency_code: "USD" }),
                        type: "money",
                        namespace: "custom",
                        owner_resource: "variant",
                        owner_id: variant.id
                    },
                    {
                        key: "discounted_price",
                        value: JSON.stringify({ amount: newDiscountedPrice.toString(), currency_code: "USD" }),
                        type: "money",
                        namespace: "custom",
                        owner_resource: "variant",
                        owner_id: variant.id
                    },
                    {
                        key: "total_slots",
                        value: "16",
                        type: "number_integer",
                        namespace: "custom",
                        owner_resource: "variant",
                        owner_id: variant.id
                    },
                    {
                        key: "discounted_slots",
                        value: "6",
                        type: "number_integer",
                        namespace: "custom",
                        owner_resource: "variant",
                        owner_id: variant.id
                    }
                ]

                // Apply metafield updates with throttling
                for (const metafield of metafields) {
                    try {
                        await delay(600) // Avoid rate-limiting
                        await shopify.metafield.create(metafield)
                        console.log(`✅ Updated ${metafield.key} for Variant ID: ${variant.id}`)
                    } catch (error) {
                        console.error(`❌ Error updating ${metafield.key} for Variant ID: ${variant.id}`, error.response?.body || error.message)
                    }
                }
            }
        }

        console.log("\n🚀 All products updated successfully!")
    } catch (error) {
        console.error("❌ Error updating products:", error)
    }
}

// Run the script
updateProductMetafields()
