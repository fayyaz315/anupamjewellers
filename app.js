const express = require('express');
const bodyParser = require('body-parser');
const Shopify = require('shopify-api-node');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const request = require('request')
const axios = require('axios');
const csv = require('csv-parser');
const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { url } = require('inspector');
const { data } = require('cheerio/lib/api/attributes');
const Order = require('./models/Order')
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const orderRoutes = require('./routes/orderRoutes');
const arRoutes = require('./routes/arRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const { cleanupZips } = require('./cleanupZips')

//const { processProducts } = require('./shopify')
//const {processDeletions } = require('./deleteProducts')
//const { processProducts } = require('./updateMetafields')





require('dotenv').config()
const connectDb = require('./db/connect')

const orders = require('./routes/order')
const productRoutes = require('./routes/productRoutes');
const notFound = require('./middelware/not-found')
const errorHandlerMiddlerware = require('./middelware/error-hanndler');
// const { updateVariantsFromMatchedFile } = require('./updateInventory');

const app = express()
// Enable CORS for all routes
app.use(cors())

// middleware
app.use(express.static('./public'))
app.use(express.json())


const PORT = process.env.NODE_ENV === 'production' ? process.env.PORT : 3000;
require("dotenv").config()
const { requestProductCSVToFTP } = require("./requestCSV")
const { downloadLatestZip } = require("./downloadLatestZip")
const { processInventoryUpdate } = require("./updateInventory");
const { fetchShopifyInventory } = require('./fetchShopifyInventory');


const runCycle = async () => {
    console.log("🟡 Starting inventory sync cycle...")

    await cleanupZips()

    // Step 1: Request CSV to be pushed to FTP
    await requestProductCSVToFTP()

    // Step 2: Wait 15 minutes
    console.log("⏳ Waiting 15 minutes for FTP server to generate the file...")
    await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000))

    // Step 3: Download the latest ZIP and unzip
    await downloadLatestZip()

    // Step 4: Wait 2 more minutes
    console.log("⏳ Waiting 2 minutes before inventory update...")
    await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000))

    // Step 5: Fetch latest Shopify inventory (before comparing)
    await fetchShopifyInventory()

    // Step 6: Run CSV comparison + update logic
    await processInventoryUpdate()

    console.log("✅ Inventory update cycle completed.")

    // Immediately start the next cycle
    runCycle()
}

// Run the first cycle
runCycle()

runCycle()

app.use('/api', webhookRoutes);
app.use('/api', arRoutes);
app.use('/api/v1/orders', orders)
app.use('/api/products', productRoutes)

// Use the order routes
app.use('/api', orderRoutes);




const shopify = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    apiKey: process.env.SHOPIFY_API_KEY,
    password: process.env.SHOPIFY_API_PASSWORD
})

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

app.post("/shopify/webhooks/orders/create", async (req, res) => {
    const orderData = req.body

    try {
        if (!orderData.line_items || !Array.isArray(orderData.line_items) || orderData.line_items.length === 0) {
            console.warn("⚠️ No line items found in the order.")
            return res.status(400).send({ error: "No line items in order" })
        }

        // Extract unique product IDs from order line items
        const productIds = [...new Set(orderData.line_items.map(item => item.product_id))]

        for (const productId of productIds) {
            console.log(`📦 Processing Product ID: ${productId}`)

            try {
                // Fetch product details
                const product = await shopify.product.get(productId)

                // Skip "Pilot" products
                if (product.title.toLowerCase().includes("pilot")) {
                    console.log(`✈️ Skipping product "${product.title}" as it contains "Pilot"`)
                    continue
                }

                const variants = product.variants
                let totalInventoryByMonth = {}

                // First pass: Calculate total inventory per month
                variants.forEach((variant) => {
                    const inventoryQuantity = variant.inventory_quantity || 0
                    const monthOption = variant.option1 

                    if (monthOption) {
                        if (!totalInventoryByMonth[monthOption]) {
                            totalInventoryByMonth[monthOption] = 0
                        }
                        totalInventoryByMonth[monthOption] += inventoryQuantity
                    }
                })

                console.log("📊 Total Inventory by Month:", totalInventoryByMonth)

                // Second pass: Adjust price based on inventory levels
                for (const variant of variants) {
                    const monthOption = variant.option1
                    if (!monthOption) continue

                    try {
                        // Fetch metafields
                        const metafields = await shopify.metafield.list({
                            metafield: {
                                owner_resource: "variant",
                                owner_id: variant.id
                            }
                        })

                        // Extract required metafields
                        const basePriceMetafield = metafields.find(mf => mf.key === "base_price")
                        const totalSlotsMetafield = metafields.find(mf => mf.key === "total_slots")

                        if (!basePriceMetafield || !totalSlotsMetafield) {
                            console.warn(`⚠️ Missing required metafields for Variant ID: ${variant.id}`)
                            continue
                        }

                        const basePriceData = JSON.parse(basePriceMetafield.value)
                        const basePrice = parseFloat(basePriceData.amount || 0)
                        const totalSlots = parseInt(totalSlotsMetafield.value, 10)
                        const discountedSlots = 6

                        // Calculate remaining slots
                        const remainingSlots = totalSlots - discountedSlots
                        const totalMonthInventory = totalInventoryByMonth[monthOption] || 0

                        let newPrice, compareAtPrice

                        if (totalMonthInventory > remainingSlots) {
                            newPrice = (basePrice * 0.9).toFixed(2) // 10% discount
                            compareAtPrice = basePrice
                        } else {
                            newPrice = basePrice.toFixed(2) // Restore base price
                            compareAtPrice = null
                        }

                        console.log(
                            `🛒 Month: ${monthOption} | Variant ID: ${variant.id} | Total Month Inventory: ${totalMonthInventory} | Remaining Slots: ${remainingSlots} | New Price: $${newPrice} | Compare-at Price: $${compareAtPrice || "None"}`
                        )

                        // Update variant price with a 1-second delay per request
                        await delay(1000)
                        await shopify.productVariant.update(variant.id, {
                            price: newPrice,
                            compare_at_price: compareAtPrice
                        })

                        console.log(`✅ Updated Shopify Price for Variant ID: ${variant.id}`)
                    } catch (error) {
                        console.error(`❌ Error updating price for Variant ID: ${variant.id}`, error.response?.body || error.message)
                    }
                }
            } catch (error) {
                console.error(`❌ Error processing Product ID: ${productId}`, error.response?.body || error.message)
            }
        }

        res.status(200).send({ message: "Webhook received, prices updated" })
    } catch (error) {
        console.error("❌ Error processing webhook:", error)
        res.status(500).send({ error: "Internal Server Error" })
    }
})






app.delete('/webhook/orders/delete', async function(req, res){
  orderName = req.body.order
  await Order.deleteOne({orderName})
  res.send('Order Detelted Successfully...')
})
app.use(notFound)
app.use(errorHandlerMiddlerware)


const start = async () => {
  try {
      //await connectDb(process.env.MONGO_URI)
      app.listen(PORT, console.log(`Server is running at ${PORT}...`))
      
  } catch (error) {
      console.log(error)
  }
}
start()


