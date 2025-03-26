require("dotenv").config()
const axios = require("axios")
const fs = require("fs")
const path = require("path")
const csvParser = require("csv-parser")

const SHOPIFY_API_URL = `https://${process.env.SHOPIFY_STORE}/admin/api/2024-01`
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN
const SHOPIFY_LOCATION_ID = process.env.SHOPIFY_LOCATION_ID

const CSV_FILE_PATH = path.join(__dirname, "downloads", "unzipped", "ANU1-products.csv")
const SHOPIFY_INVENTORY_PATH = path.join(__dirname, "data", "shopify_inventory.json")

const normalizeSku = (str) => str ? str.trim().replace(/\s+/g, "").toUpperCase() : ""

// ✅ Enable inventory tracking for a product variant
const enableInventoryTracking = async (variantId) => {
    try {
        const url = `${SHOPIFY_API_URL}/variants/${variantId.replace("gid://shopify/ProductVariant/", "")}.json`

        const response = await axios.get(url, {
            headers: {
                "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN
            }
        })

        const currentTracking = response.data?.variant?.inventory_management
        if (currentTracking !== "shopify") {
            await axios.put(
                url,
                { variant: { inventory_management: "shopify" } },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN
                    }
                }
            )
            console.log(`✅ Enabled inventory tracking for variant ${variantId}`)
        }
    } catch (error) {
        console.error(`❌ Failed to enable inventory tracking for ${variantId}:`, error.response?.data || error.message)
    }
}

// ✅ Update Shopify inventory
const updateShopifyInventory = async (inventoryItemId, newQuantity) => {
    try {
        const url = `${SHOPIFY_API_URL}/inventory_levels/set.json`
        await axios.post(
            url,
            {
                location_id: SHOPIFY_LOCATION_ID,
                inventory_item_id: inventoryItemId.replace("gid://shopify/InventoryItem/", ""),
                available: newQuantity
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN
                }
            }
        )
        console.log(`✅ Updated inventory for ${inventoryItemId} to ${newQuantity}`)
    } catch (error) {
        console.error(`❌ Failed to update inventory for ${inventoryItemId}:`, error.response?.data || error.message)
    }
}

// ✅ Process inventory updates
const processInventoryUpdate = async () => {
    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error(`❌ CSV file not found: ${CSV_FILE_PATH}`)
        return
    }
    if (!fs.existsSync(SHOPIFY_INVENTORY_PATH)) {
        console.error(`❌ Shopify inventory file not found: ${SHOPIFY_INVENTORY_PATH}`)
        return
    }

    console.log("🔄 Reading Shopify inventory data...")
    const shopifyInventory = JSON.parse(fs.readFileSync(SHOPIFY_INVENTORY_PATH, "utf-8"))
    const shopifyMap = new Map()

    for (const item of shopifyInventory) {
        if (item.sku) {
            shopifyMap.set(normalizeSku(item.sku), item)
        }
    }

    console.log("🔄 Reading CSV inventory data...")
    const csvData = []
    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csvParser())
        .on("data", (row) => csvData.push(row))
        .on("end", async () => {
            console.log(`✅ Loaded ${csvData.length} products from CSV.`)

            for (const product of csvData) {
                const csvSku = normalizeSku(product.ItemCode)
                const csvStock = product.InStock?.trim().toUpperCase() === "Y" ? 10 : 0

                const shopifyProduct = shopifyMap.get(csvSku)

                if (!shopifyProduct) {
                    console.warn(`⚠️ SKU mismatch: CSV '${csvSku}' not found in Shopify inventory.`)
                    continue
                }

                if (shopifyProduct.inventory_quantity !== csvStock) {
                    await enableInventoryTracking(shopifyProduct.variant_id)
                    console.log(`🔄 Updating Shopify inventory for ${csvSku} (${shopifyProduct.inventory_item_id})`)
                    await updateShopifyInventory(shopifyProduct.inventory_item_id, csvStock)
                } else {
                    console.log(`✅ Inventory already up-to-date for ${csvSku}`)
                }
            }
        })
}

module.exports = { processInventoryUpdate }
