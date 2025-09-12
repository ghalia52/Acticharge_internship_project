// =====================================================
// database.js - Separate Cosmos DB Configuration
// =====================================================
const { CosmosClient } = require("@azure/cosmos");
require("dotenv").config();

console.log("🔗 Initializing Cosmos DB connection...");

const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_DB_ENDPOINT,
    key: process.env.COSMOS_DB_KEY
});

const database = cosmosClient.database(process.env.COSMOS_DB_DATABASE_NAME);

// Export containers for use in models
const containers = {
    vehicleData: database.container("vehicle_data"),
    predictions: database.container("vehicle_predictions"),
    users: database.container("users")
};

console.log("✅ Cosmos DB containers configured successfully");

module.exports = { containers, database, cosmosClient };