require("dotenv").config()
const axios = require("axios")

const SHOPIFY_STORE = process.env.SHOPIFY_STORE
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN
const GRAPHQL_ENDPOINT = `https://${SHOPIFY_STORE}/admin/api/2025-04/graphql.json`

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
              inventoryItem {
                id
                tracked
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

const BULK_UPDATE_MUTATION = `
mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    product {
      id
    }
    productVariants {
      id
    }
    userErrors {
      field
      message
    }
  }
}
`

const enableTrackingForAllVariants = async () => {
  console.log("🚀 Starting inventory tracking update for untracked variants...\n")

  let cursor = null
  let hasNextPage = true
  let updatedProducts = 0
  let updatedVariants = 0

  while (hasNextPage) {
    console.log("📡 Fetching products page...")

    const response = await axios.post(
      GRAPHQL_ENDPOINT,
      { query: GET_PRODUCTS_QUERY, variables: { cursor } },
      {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    )

    const products = response.data?.data?.products
    if (!products) {
      console.error("❌ Invalid response from Shopify:", JSON.stringify(response.data, null, 2))
      throw new Error("Response from Shopify is missing expected 'products' data.")
    }

    for (const product of products.edges) {
      const productId = product.node.id
      const title = product.node.title

      const variantsToUpdate = product.node.variants.edges
        .filter(v => !v.node.inventoryItem.tracked)
        .map(v => ({
          id: v.node.id,
          inventoryManagement: 'SHOPIFY'
        }))

      if (variantsToUpdate.length === 0) {
        console.log(`⏭️  Skipping "${title}" — all variants already tracked`)
        continue
      }

      console.log(`🔧 Updating ${variantsToUpdate.length} variant(s) for product "${title}"...`)

      try {
        const updateResponse = await axios.post(
          GRAPHQL_ENDPOINT,
          {
            query: BULK_UPDATE_MUTATION,
            variables: {
              productId,
              variants: variantsToUpdate
            }
          },
          {
            headers: {
              'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
              'Content-Type': 'application/json'
            }
          }
        )

        const result = updateResponse.data?.data?.productVariantsBulkUpdate

        if (!result) {
          console.error(`❌ Unexpected response while updating "${title}":`, updateResponse.data)
          continue
        }

        const { productVariants, userErrors } = result

        if (userErrors.length > 0) {
          console.error(`❌ Errors updating "${title}":`, userErrors)
        } else {
          console.log(`✅ Successfully updated ${productVariants.length} variant(s) for "${title}"`)
          updatedProducts++
          updatedVariants += productVariants.length
        }
      } catch (err) {
        console.error(`❌ Failed to update variants for "${title}":`, err.response?.data || err.message)
      }
    }

    hasNextPage = products.pageInfo.hasNextPage
    cursor = products.pageInfo.endCursor || null
  }

  console.log(`\n🏁 Completed: ${updatedProducts} product(s), ${updatedVariants} variant(s) updated.`)
}

enableTrackingForAllVariants()
