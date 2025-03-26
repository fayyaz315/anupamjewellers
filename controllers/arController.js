require('dotenv').config();
const Shopify = require('shopify-api-node');
const axios = require('axios');

const shopify = new Shopify({
  shopName: process.env.SHOPIFY_SHOP_NAME,
  apiKey: process.env.SHOPIFY_API_KEY,
  password: process.env.SHOPIFY_API_PASSWORD,
});

// Function to fetch valid locations
async function fetchLocations() {
  try {
    const locations = await shopify.location.list();
    return locations;
  } catch (error) {
    console.error('Error fetching locations:', error);
    return null;
  }
}

exports.handleARProduct = async (req, res) => {
  const { productId, size, price, sku, quantity, locationId } = req.body;

  // Record start time
  const startTime = Date.now();

  try {
    // Step 1: Fetch the product details to get the product options
    const product = await shopify.product.get(productId);

    // Step 2: Extract default values for options other than size
    const productOptions = product.options; // Get all the options for the product
    let optionValues = {}; // This will hold default values for other options

    // Set size as the first option
    let option1 = size;
    let option2 = null;
    let option3 = null;

    // Map through the options and set default values
    productOptions.forEach((option, index) => {
      if (option.name !== 'Size') {
        const defaultOptionValue = option.values[0]; // Use the first/default value for other options
        if (index === 1) {
          option2 = defaultOptionValue; // Option 2, e.g., 'Frame color'
        } else if (index === 2) {
          option3 = defaultOptionValue; // Option 3, e.g., 'Finish'
        }
        optionValues[option.name] = defaultOptionValue; // Store it in an object
      }
    });

    console.log('Option values:', optionValues);

    // Step 3: Check if the variant with the same size already exists
    let variant = product.variants.find(v => v.option1 === size);

    let variantMessage = '';

    if (variant) {
      // If variant already exists, log and proceed
      console.log('Variant already exists:', variant.id);
      variantMessage = `Variant already exists: ${variant.id}`;
    } else {
      // Step 4: Create a variant for the product if it doesn't exist
      variant = await shopify.productVariant.create(productId, {
        option1: size,        // Custom size from AR app
        option2: option2,     // Default value for option 2 (e.g., Frame color)
        option3: option3,     // Default value for option 3 (e.g., Finish)
        price: price,         // Calculated price
        sku: sku,             // SKU
        inventory_management: 'shopify',
      });

      if (!variant || !variant.id) {
        return res.status(500).json({ error: 'Failed to create variant or invalid variant ID' });
      }

      console.log('Created Variant ID:', variant.id);
      variantMessage = `Created new variant: ${variant.id}`;
    }

    // Step 5: Verify if the location_id is valid
    let validLocationId = locationId;

    const locations = await fetchLocations();
    if (!locations || locations.length === 0) {
      return res.status(500).json({ error: 'No valid locations found in store' });
    }

    // If the provided location_id is not valid, use the first valid one
    const locationExists = locations.find(loc => loc.id == locationId);
    if (!locationExists) {
      validLocationId = locations[0].id;  // Use the first valid location ID
      console.log('Using valid location ID:', validLocationId);
    }

    // Step 6: Update the inventory for the existing or newly created variant
    const inventoryUpdate = await shopify.inventoryLevel.set({
      inventory_item_id: variant.inventory_item_id,
      location_id: validLocationId,  // Use the verified valid location ID
      available: 999,  // The new quantity to set at this location
    });

    if (!inventoryUpdate) {
      return res.status(500).json({ error: 'Failed to update inventory' });
    }

    console.log('Inventory Updated:', inventoryUpdate);

    // Step 7: Generate the cart URL with the correct format to stay on the cart page
    const cartUrl = `https://www.novaRX.com/cart/add?id=${variant.id}&quantity=${quantity}&return_to=cart`;

    console.log('Added to Cart Successfully:', cartUrl);

    // Record end time and calculate duration
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Return the cart URL along with the time it took to generate
    return res.json({
      cartUrl: cartUrl,
      message: `${variantMessage}. Inventory updated and added to cart.`,
      duration: `${duration} ms`,  // Time it took to generate the URL
    });

  } catch (error) {
    if (error.response && error.response.body) {
      console.error('Shopify Error:', error.response.body);
      return res.status(500).json({
        success: false,
        message: 'Shopify API error',
        error: error.response.body.errors || error.response.body,
      });
    } else {
      console.error('General Error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'An error occurred',
        error: error.message,
      });
    }
  }
};
