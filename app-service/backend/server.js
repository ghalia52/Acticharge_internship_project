// =====================================================
// server.js - AZURE WEB APP COMPATIBLE VERSION
// =====================================================
const express = require("express");
const cors = require("cors");
require("dotenv").config();

console.log("🚀 Démarrage du serveur...");

// Initialize Express app
const app = express();
console.log("✅ Express app créée");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log("✅ Middleware ajouté");

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Import database configuration with error handling
let containers;
try {
    const dbModule = require("./database");
    containers = dbModule.containers;
    console.log("✅ Database configuration loaded");
} catch (error) {
    console.warn("⚠️ Database configuration not found, continuing without it:", error.message);
    containers = null;
}

// Health check endpoint AVANT les routes API
app.get("/", (req, res) => {
    res.json({ 
        message: "🔋 Smart Grid API is running!",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        port: process.env.PORT || 'default'
    });
});

// API status endpoint
app.get("/api/status", (req, res) => {
    res.json({
        status: "online",
        timestamp: new Date().toISOString(),
        database: containers ? "connected" : "not configured",
        version: "1.0.0",
        environment: process.env.NODE_ENV || 'production'
    });
});

// Import and register routes with error handling
try {
    console.log("Chargement des routes...");
    
    // Try to load auth routes
    try {
        const authRoutes = require("./Routes/auth");
        app.use("/api/auth", authRoutes);
        console.log("✅ Auth routes chargées");
    } catch (error) {
        console.warn("⚠️ Auth routes not found:", error.message);
    }
    
    // Try to load charging routes
    try {
        const chargingRoutes = require("./Routes/ChargingRoutes");
        app.use("/api/charging", chargingRoutes);
        console.log("✅ Charging routes chargées");
    } catch (error) {
        console.warn("⚠️ Charging routes not found:", error.message);
    }
    
    // Try to load prediction routes
    try {
        const predictionRoutes = require("./Routes/predictionRoutes");
        app.use("/api/predictions", predictionRoutes);
        console.log("✅ Prediction routes chargées");
    } catch (error) {
        console.warn("⚠️ Prediction routes not found:", error.message);
    }

    console.log("✅ Route loading completed");

} catch (error) {
    console.error("❌ Error during route loading:", error.message);
    // Don't exit, continue with basic server functionality
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({ 
        message: err.message || "Internal server error",
        ...(isDevelopment && { 
            stack: err.stack,
            timestamp: new Date().toISOString()
        })
    });
});

// 404 handler pour les routes non trouvées
app.use((req, res) => {
    res.status(404).json({ 
        message: "Route not found",
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    server.close(() => {
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start server - IMPORTANT: Azure uses PORT environment variable
const PORT = process.env.PORT || 8000; // Changed default to 8000 for Azure
const HOST = process.env.HOST || '0.0.0.0';

console.log(`\n🚀 Tentative de démarrage sur le port ${PORT}...`);
console.log(`🌐 Host: ${HOST}`);

const server = app.listen(PORT, HOST, () => {
    console.log(`\n🎉 Smart Grid API Server started successfully!`);
    console.log(`📍 Server running on: http://${HOST}:${PORT}`);
    console.log(`🔍 Health check: http://${HOST}:${PORT}/`);
    console.log(`📊 API status: http://${HOST}:${PORT}/api/status`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log('\n✅ Ready to handle requests!\n');
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        console.log("💡 Try killing the process or change the port");
        process.exit(1);
    } else if (error.code === 'EACCES') {
        console.error(`❌ Permission denied for port ${PORT}`);
        process.exit(1);
    } else {
        console.error('❌ Server error:', error);
        process.exit(1);
    }
});

// Export for testing or other modules
module.exports = { app, server, containers };