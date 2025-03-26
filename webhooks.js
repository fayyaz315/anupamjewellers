const Shopify = require('shopify-api-node');
require('dotenv').config();

const shopify = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN // Correct authentication method
});

const webhookUrl = "https://nomad-4e496388ec0f.herokuapp.com/shopify/webhooks/orders/create";
const webhookTopic = "orders/create";

async function ensureOrderWebhook() {
    try {
        const existingWebhooks = await shopify.webhook.list();

        // Check if webhook already exists
        const webhookExists = existingWebhooks.some(
            webhook => webhook.topic === webhookTopic && webhook.address === webhookUrl
        );

        if (webhookExists) {
            console.log("✅ Order webhook already exists:", webhookUrl);
            return;
        }

        // Create webhook if it doesn't exist
        const newWebhook = await shopify.webhook.create({
            topic: webhookTopic,
            address: webhookUrl,
            format: "json"
        });

        console.log("✅ Order webhook created successfully:", newWebhook);
    } catch (error) {
        console.error("❌ Error managing webhooks:", error.response?.body || error);
    }
}

// Run the function
ensureOrderWebhook();
