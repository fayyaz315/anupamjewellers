const axios = require('axios')
const fs = require('fs')
const path = require('path')
const Shopify = require('shopify-api-node')
require('dotenv').config()

const apiClient = axios.create({
    baseURL: process.env.NODE_ENV === 'production' 
        ? process.env.MEYER_API_BASE_URL_PROD 
        : process.env.MEYER_API_BASE_URL_TEST,
    headers: {
        'Authorization': `Espresso ${process.env.API_KEY}:1`
    }
})

const shopify = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    apiKey: process.env.SHOPIFY_API_KEY,
    password: process.env.SHOPIFY_API_PASSWORD
})

const readItemNumbers = () => {
    const dataPath = path.join(__dirname, '..', 'data', 'data.json')
    const rawData = fs.readFileSync(dataPath)
    const items = JSON.parse(rawData)
    return items.map(item => item.item)
}

async function fetchShopifyProducts() {
    let totalProductCount = 0
    try {
        totalProductCount = await shopify.product.count()
    } catch (error) {
        console.log('Failed to fetch total product count:', error)
        return []
    }

    console.log('Fetching Shopify products...')
    let params = { limit: 250 }
    let allProducts = []
    let products = []
    let fetchedCount = 0

    do {
        try {
            products = await shopify.product.list(params)
            allProducts = allProducts.concat(products)
            fetchedCount += products.length
        } catch (error) {
            console.log('Failed to fetch Shopify products:', error)
            break
        }
        params = products.nextPageParameters ? { limit: 250, ...products.nextPageParameters } : undefined
    } while (params)

    return allProducts
}

const addOrUpdateProductOnShopify = async (existingProducts, productData) => {
    const existingProduct = existingProducts.find(p => p.variants.some(v => v.sku === productData.variants[0].sku))

    if (existingProduct) {
        const productId = existingProduct.id
        const variant = existingProduct.variants.find(v => v.sku === productData.variants[0].sku)
        const variantId = variant.id

        if (true) {
            try {
                await shopify.product.update(productId, {
                    title: productData.title,
                    // body_html: productData.body_html,
                    body_html: '',
                    vendor: productData.vendor,
                    tags: productData.tags,
                    options: productData.options,
                    images: productData.images
                })
                await shopify.productVariant.update(variantId, {
                    price: productData.variants[0].price,
                    weight: productData.variants[0].weight,
                    weight_unit: productData.variants[0].weight_unit,
                    cost: productData.variants[0].cost // Added cost price here
                })
                console.log('Product updated on Shopify:', productData.variants[0].sku)
            } catch (error) {
                console.error('Error updating product on Shopify:', error.response ? error.response.data : error.message)
            }
        } else {
            console.log('Product price and weight are the same. Skipping update:', productData.variants[0].sku)
        }
    } else {
        try {
            console.log('Adding new product to Shopify:', JSON.stringify(productData, null, 2))
            const product = await shopify.product.create(productData)
            console.log('Product added to Shopify:')
        } catch (error) {
            console.error('Error adding product to Shopify:', error.response ? error.response.data : error.message)
        }
    }
}

exports.getProductDetails = async (req, res) => {
    const itemNumbers = readItemNumbers()
    const existingProducts = await fetchShopifyProducts()
    let count = 0

    for (const itemNumber of itemNumbers) {
        const url = `/ItemInformation?ItemNumber=${itemNumber}`
        try {
            const response = await apiClient.get(url)
            const productDetails = response.data[0]

            const weightInLbs = productDetails.Weight || 0

            const shopifyProductData = {
                title: productDetails.ItemDescription || 'No Title',
                // body_html: `
                //     <strong>${productDetails.ItemDescription}</strong><br>
                //     <ul>
                //         <li>Item Number: ${productDetails.ItemNumber || 'N/A'}</li>
                //         <li>Manufacturer ID: ${productDetails.ManufacturerID || 'N/A'}</li>
                //         <li>Part Status: ${productDetails.PartStatus || 'N/A'}</li>
                //         <li>Kit: ${productDetails.Kit || 'N/A'}</li>
                //         <li>Kit Only: ${productDetails.KitOnly || 'N/A'}</li>
                //         <li>UPC: ${productDetails.UPC || 'N/A'}</li>
                //         <li>LTL Required: ${productDetails.LTLRequired || 'N/A'}</li>
                //         <li>Length: ${productDetails.Length || 'N/A'}</li>
                //         <li>Width: ${productDetails.Width || 'N/A'}</li>
                //         <li>Height: ${productDetails.Height || 'N/A'}</li>
                //         <li>Weight: ${weightInLbs} lbs</li>
                //         <li>Manufacturer Name: ${productDetails.ManufacturerName || 'N/A'}</li>
                //         <li>Qty Available: ${productDetails.QtyAvailable || 0}</li>
                //         <li>Suggested Retail Price: ${productDetails.SuggestedRetailPrice || 'N/A'}</li>
                //         <li>Jobber Price: ${productDetails.JobberPrice || 'N/A'}</li>
                //         <li>Min Advertised Price: ${productDetails.MinAdvertisedPrice || 'N/A'}</li>
                //         <li>Customer Price: ${productDetails.CustomerPrice || 'N/A'}</li>
                //         <li>Oversize: ${productDetails.Oversize || 'N/A'}</li>
                //         <li>Additional Handling Charge: ${productDetails.AdditionalHandlingCharge || 'N/A'}</li>
                //         <li>Prop 65: ${productDetails.Prop65 || 'N/A'}</li>
                //         <li>Prop 65 Warning: ${productDetails.Prop65Warning || 'N/A'}</li>
                //     </ul>
                // `,
                body_html: '',
                vendor: productDetails.ManufacturerName || 'Unknown',
                tags: [
                    productDetails.PartStatus,
                    productDetails.Kit,
                    productDetails.ManufacturerName,
                    productDetails.UPC,
                    productDetails.Oversize,
                    productDetails.Prop65,
                    "meyer"
                ].filter(Boolean).join(', '),
                variants: [
                    {
                        title: "Default Title",
                        price: productDetails.MinAdvertisedPrice || '0.00',
                        sku: itemNumber,
                        fulfillment_service: "manual",
                        inventory_management: "shopify",
                        option1: "Default Title",
                        taxable: true,
                        barcode: productDetails.UPC || '',
                        weight: weightInLbs,
                        weight_unit: "lb",
                        inventory_quantity: productDetails.QtyAvailable || 0,
                        requires_shipping: true,
                        cost: productDetails.CustomerPrice || '0.00' // Added cost price here
                    }
                ],
                options: [
                    {
                        name: "Title",
                        position: 1,
                        values: [
                            "Default Title"
                        ]
                    }
                ],
                images: []
            }

            await addOrUpdateProductOnShopify(existingProducts, shopifyProductData)
            count++
            console.log(`Product ${count} processed: ${itemNumber}`)

        } catch (error) {
            console.error(`Error fetching details for item ${itemNumber}:`, error.response ? error.response.data : error.message)
        }
    }

    res.json({
        success: true,
        message: `Processed ${count} products`
    })
}
