require("dotenv").config()
const axios = require("axios")

const SHOPIFY_STORE = process.env.SHOPIFY_STORE
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN
const GRAPHQL_ENDPOINT = `https://${SHOPIFY_STORE}/admin/api/2024-01/graphql.json`

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
              inventoryManagement
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

const enableTracking = async (variantId) => {
  const restEndpoint = `https://${SHOPIFY_STORE}/admin/api/2024-01/variants/${variantId.replace("gid://shopify/ProductVariant/", "")}.json`

  try {
    await axios.put(
      restEndpoint,
      {
        variant: {
          id: variantId.replace("gid://shopify/ProductVariant/", ""),
          inventory_management: "shopify"
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN
        }
      }
    )
    console.log(`✅ Enabled tracking for variant: ${variantId}`)
  } catch (err) {
    console.error(`❌ Failed to enable tracking for ${variantId}:`, err.response?.data || err.message)
  }
}

const enableTrackingForAllVariants = async () => {
  console.log("🚀 Enabling inventory tracking for all variants...")

  let cursor = null
  let hasNextPage = true
  let count = 0

  while (hasNextPage) {
    const response = await axios.post(
      GRAPHQL_ENDPOINT,
      { query: GET_PRODUCTS_QUERY, variables: { cursor } },
      { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN, "Content-Type": "application/json" } }
    )

    const products = response.data.data.products
    for (const product of products.edges) {
      for (const variant of product.node.variants.edges) {
        const variantId = variant.node.id
        const isTracked = variant.node.inventoryManagement === "SHOPIFY"
        if (!isTracked) {
          await enableTracking(variantId)
          count++
        }
      }
    }

    hasNextPage = products.pageInfo.hasNextPage
    cursor = products.pageInfo.endCursor || null
  }

  console.log(`✅ Finished. ${count} variants updated.`)
}

enableTrackingForAllVariants()
