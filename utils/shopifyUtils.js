require('dotenv').config();
const Shopify = require('shopify-api-node');
const axios = require('axios');

const shopify = new Shopify({
  shopName: process.env.SHOPIFY_SHOP_NAME,
  apiKey: process.env.SHOPIFY_API_KEY,
  password: process.env.SHOPIFY_API_PASSWORD,
});

// Function to create a product variant with enhanced error handling
exports.createVariant = async (productId, size, price, sku) => {
  try {
    const variant = await shopify.productVariant.create(productId, {
      option1: size, // Custom size from AR app
      price: price,  // Calculated price
      sku: sku,      // SKU
      inventory_management: 'shopify',
    });
    console.log('Created Variant ID:', variant.id);  // Log the created variant ID
    return variant;
  } catch (error) {
    if (error.response) {
      console.error('Error creating variant:', error.response.body);
      return {
        success: false,
        message: 'Error creating variant',
        error: error.response.body.errors || error.response.body,
      };
    } else {
      console.error('Error creating variant:', error.message);
      return {
        success: false,
        message: 'Error creating variant',
        error: error.message,
      };
    }
  }
};


// Function to set the inventory level for a variant with enhanced error handling
exports.setInventoryLevel = async (inventoryItemId, locationId, newQuantity) => {
  try {
    const response = await shopify.inventoryLevel.set({
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available: newQuantity,  // The new quantity to set at this location
    });
    return response;  // Return the response which includes updated inventory details
  } catch (error) {
    if (error.response) {
      // Shopify API-specific error details
      console.error('Error setting inventory level:', error.response.body);
      return {
        success: false,
        message: 'Error setting inventory level',
        error: error.response.body.errors || error.response.body,
      };
    } else {
      // Generic error
      console.error('Error setting inventory level:', error.message);
      return {
        success: false,
        message: 'Error setting inventory level',
        error: error.message,
      };
    }
  }
};

// Function to add the product to the Shopify cart using Axios with enhanced error handling
exports.addToCart = async (variantId, quantity) => {
  try {
    if (!variantId) {
      throw new Error('Variant ID is missing or invalid');
    }

    const cartPayload = {
      items: [
        {
          id: variantId,  // Ensure this is the correct variant ID
          quantity: quantity,
        },
      ],
    };

    const cartUrl = `https://${process.env.SHOPIFY_SHOP_NAME}.myshopify.com/cart/add.js`;

    const response = await axios.post(cartUrl, cartPayload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 200) {
      return `https://${process.env.SHOPIFY_SHOP_NAME}.myshopify.com/cart`;
    } else {
      throw new Error('Failed to add item to cart.');
    }
  } catch (error) {
    if (error.response) {
      // Axios response error details
      console.error('Error adding to cart:', error.response.data);
      return {
        success: false,
        message: 'Error adding item to cart',
        error: error.response.data.errors || error.response.data,
      };
    } else {
      // Generic error
      console.error('Error adding to cart:', error.message);
      return {
        success: false,
        message: 'Error adding item to cart',
        error: error.message,
      };
    }
  }
};
