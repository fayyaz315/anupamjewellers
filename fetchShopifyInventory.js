require("dotenv").config()
const axios = require("axios")
const fs = require("fs")
const path = require("path")

const SHOPIFY_STORE = process.env.SHOPIFY_STORE
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN
const OUTPUT_FILE = path.join(__dirname, "data/shopify_inventory.json")

const GRAPHQL_ENDPOINT = `https://${SHOPIFY_STORE}/admin/api/2024-01/graphql.json`

// GraphQL query to fetch products with SKU, Inventory Item ID & Inventory Quantity
const GET_PRODUCTS_QUERY = `
    query getProducts($cursor: String) {
        products(first: 50, after: $cursor) {
            edges {
                node {
                    id
                    title
                    variants(first: 50) {
                        edges {
                            node {
                                id
                                sku
                                inventoryQuantity
                                inventoryItem {
                                    id
                                }
                            }
                        }
                    }
                }
            }
            pageInfo {
                hasNextPage
                endCursor
            }
        }
    }
`

// Function to fetch all Shopify products
const fetchShopifyInventory = async () => {          
    console.log("📦 Fetching Shopify SKUs, Inventory Item IDs & Inventory Count...")
    
    let allInventory = []
    let cursor = null
    let hasNextPage = true
    let batchNumber = 1
    let totalRetrieved = 0  // Track total count

    while (hasNextPage) {
        try {
            console.log(`🔄 Fetching batch ${batchNumber}...`)

            const response = await axios.post(
                GRAPHQL_ENDPOINT,
                { query: GET_PRODUCTS_QUERY, variables: { cursor } },
                { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN, "Content-Type": "application/json" } }
            )

            const data = response.data?.data?.products
            if (!data) {
                console.error("❌ Error: No data received from Shopify")
                break
            }

            let batchCount = 0

            data.edges.forEach(product => {
                product.node.variants.edges.forEach(variant => {
                    allInventory.push({
                        product_id: product.node.id,
                        title: product.node.title,
                        variant_id: variant.node.id,
                        sku: variant.node.sku,
                        inventory_item_id: variant.node.inventoryItem.id,
                        inventory_quantity: variant.node.inventoryQuantity ?? 0
                    })
                    batchCount++
                })
            })

            totalRetrieved += batchCount  // Update total count
            console.log(`✅ Batch ${batchNumber} fetched: ${batchCount} variants retrieved (Total so far: ${totalRetrieved})`)

            hasNextPage = data.pageInfo.hasNextPage
            cursor = data.pageInfo.endCursor || null

            if (!hasNextPage) {
                console.log(`🚀 All products fetched successfully! Total variants retrieved: ${totalRetrieved}`)
            }

            batchNumber++
        } catch (error) {
            console.error("❌ Error fetching Shopify inventory data:", error.response?.data || error.message)
            break
        }
    }

    // Save data to JSON file
    if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allInventory, null, 2))
    console.log(`📁 Shopify inventory saved to ${OUTPUT_FILE} with ${totalRetrieved} variants`)

    return allInventory
}

// Run the function

module.exports = { fetchShopifyInventory }
