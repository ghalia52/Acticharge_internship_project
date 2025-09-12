// =====================================================
// Models/ChargingSession.js - CORRECTED VERSION
// =====================================================

// Import database configuration with proper error handling
let containers;
try {
    const dbConfig = require("../database");
    containers = dbConfig.containers;
    
    if (!containers) {
        throw new Error("Containers not found in database configuration");
    }
    
    console.log("✅ ChargingSession model: Database containers loaded successfully");
    
} catch (error) {
    console.error("❌ ChargingSession model: Error loading database configuration:", error.message);
    process.exit(1);
}

class ChargingSession {
    constructor(data) {
        this.id = data.id;
        this.connectionTime_decimal = data.connectionTime_decimal;
        this.chargingDuration = data.chargingDuration;
        this.kWhDelivered = data.kWhDelivered;
        this.dayIndicator = data.dayIndicator;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    // Validate required fields
    static validateData(data) {
        const requiredFields = ['connectionTime_decimal', 'chargingDuration', 'kWhDelivered', 'dayIndicator'];
        const errors = [];

        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null || data[field] === '') {
                errors.push(`Missing required field: ${field}`);
            }
        }

        // Validate numeric fields
        const numericFields = ['connectionTime_decimal', 'chargingDuration', 'kWhDelivered'];
        for (const field of numericFields) {
            if (data[field] !== undefined && isNaN(Number(data[field]))) {
                errors.push(`Field ${field} must be a valid number`);
            }
        }

        return errors;
    }

    // Get all charging sessions
    static async getAll() {
        try {
            console.log("📊 Fetching all charging sessions...");
            
            // Check if containers is properly loaded
            if (!containers || !containers.vehicleData) {
                throw new Error("Database containers not properly initialized. vehicleData container is missing.");
            }

            const { resources } = await containers.vehicleData.items
                .readAll()
                .fetchAll();

            console.log(`✅ Retrieved ${resources.length} charging sessions`);
            return resources;
            
        } catch (error) {
            console.error("❌ Error in ChargingSession.getAll():", error.message);
            throw new Error(`Failed to retrieve charging sessions: ${error.message}`);
        }
    }

    // Get session by ID
    static async getById(id) {
        try {
            console.log(`📊 Fetching charging session with ID: ${id}`);
            
            if (!containers || !containers.vehicleData) {
                throw new Error("Database containers not properly initialized. vehicleData container is missing.");
            }

            const { resource } = await containers.vehicleData.item(id, id).read();
            
            if (!resource) {
                console.log(`⚠️  Charging session with ID ${id} not found`);
                return null;
            }

            console.log(`✅ Retrieved charging session: ${id}`);
            return resource;
            
        } catch (error) {
            if (error.code === 404) {
                console.log(`⚠️  Charging session with ID ${id} not found`);
                return null;
            }
            console.error(`❌ Error in ChargingSession.getById(${id}):`, error.message);
            throw new Error(`Failed to retrieve charging session: ${error.message}`);
        }
    }

    // Get sessions by day indicator
    static async getByDayIndicator(dayIndicator) {
        try {
            console.log(`📊 Fetching charging sessions for day: ${dayIndicator}`);
            
            if (!containers || !containers.vehicleData) {
                throw new Error("Database containers not properly initialized. vehicleData container is missing.");
            }

            const query = {
                query: "SELECT * FROM c WHERE c.dayIndicator = @dayIndicator",
                parameters: [
                    { name: "@dayIndicator", value: dayIndicator }
                ]
            };

            const { resources } = await containers.vehicleData.items
                .query(query)
                .fetchAll();

            console.log(`✅ Retrieved ${resources.length} sessions for day: ${dayIndicator}`);
            return resources;
            
        } catch (error) {
            console.error(`❌ Error in ChargingSession.getByDayIndicator(${dayIndicator}):`, error.message);
            throw new Error(`Failed to retrieve sessions for day ${dayIndicator}: ${error.message}`);
        }
    }

    // Get sessions with high kWh delivery
    static async getHighKwhSessions(threshold) {
        try {
            console.log(`📊 Fetching sessions with kWh > ${threshold}`);
            
            if (!containers || !containers.vehicleData) {
                throw new Error("Database containers not properly initialized. vehicleData container is missing.");
            }

            const query = {
                query: "SELECT * FROM c WHERE c.kWhDelivered > @threshold ORDER BY c.kWhDelivered DESC",
                parameters: [
                    { name: "@threshold", value: parseFloat(threshold) }
                ]
            };

            const { resources } = await containers.vehicleData.items
                .query(query)
                .fetchAll();

            console.log(`✅ Retrieved ${resources.length} high kWh sessions (>${threshold})`);
            return resources;
            
        } catch (error) {
            console.error(`❌ Error in ChargingSession.getHighKwhSessions(${threshold}):`, error.message);
            throw new Error(`Failed to retrieve high kWh sessions: ${error.message}`);
        }
    }

    // Get statistics for a specific day
    static async getDayStatistics(dayIndicator) {
        try {
            console.log(`📊 Calculating statistics for day: ${dayIndicator}`);
            
            if (!containers || !containers.vehicleData) {
                throw new Error("Database containers not properly initialized. vehicleData container is missing.");
            }

            const query = {
                query: `
                    SELECT 
                        COUNT(1) as totalSessions,
                        SUM(c.kWhDelivered) as totalEnergy,
                        AVG(c.kWhDelivered) as avgEnergy,
                        AVG(c.chargingDuration) as avgDuration,
                        MIN(c.kWhDelivered) as minEnergy,
                        MAX(c.kWhDelivered) as maxEnergy
                    FROM c 
                    WHERE c.dayIndicator = @dayIndicator
                `,
                parameters: [
                    { name: "@dayIndicator", value: dayIndicator }
                ]
            };

            const { resources } = await containers.vehicleData.items
                .query(query)
                .fetchAll();

            const stats = resources[0] || {
                totalSessions: 0,
                totalEnergy: 0,
                avgEnergy: 0,
                avgDuration: 0,
                minEnergy: 0,
                maxEnergy: 0
            };

            console.log(`✅ Calculated statistics for day: ${dayIndicator}`);
            return stats;
            
        } catch (error) {
            console.error(`❌ Error in ChargingSession.getDayStatistics(${dayIndicator}):`, error.message);
            throw new Error(`Failed to calculate statistics for day ${dayIndicator}: ${error.message}`);
        }
    }

    // Create new session
    static async create(data) {
        try {
            console.log("📝 Creating new charging session...");
            
            if (!containers || !containers.vehicleData) {
                throw new Error("Database containers not properly initialized. vehicleData container is missing.");
            }

            // Validate data
            const validationErrors = ChargingSession.validateData(data);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Create session object
            const sessionData = {
                id: data.id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                connectionTime_decimal: parseFloat(data.connectionTime_decimal),
                chargingDuration: parseFloat(data.chargingDuration),
                kWhDelivered: parseFloat(data.kWhDelivered),
                dayIndicator: data.dayIndicator,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const { resource } = await containers.vehicleData.items.create(sessionData);
            
            console.log(`✅ Created charging session: ${resource.id}`);
            return resource;
            
        } catch (error) {
            console.error("❌ Error in ChargingSession.create():", error.message);
            throw new Error(`Failed to create charging session: ${error.message}`);
        }
    }

    // Update session
    static async update(id, data) {
        try {
            console.log(`📝 Updating charging session: ${id}`);
            
            if (!containers || !containers.vehicleData) {
                throw new Error("Database containers not properly initialized. vehicleData container is missing.");
            }

            // Get existing session
            const existingSession = await this.getById(id);
            if (!existingSession) {
                return null;
            }

            // Validate numeric fields if provided
            const numericFields = ['connectionTime_decimal', 'chargingDuration', 'kWhDelivered'];
            for (const field of numericFields) {
                if (data[field] !== undefined && isNaN(Number(data[field]))) {
                    throw new Error(`Field ${field} must be a valid number`);
                }
            }

            // Update data
            const updatedData = {
                ...existingSession,
                ...data,
                updatedAt: new Date().toISOString()
            };

            // Convert numeric fields
            if (updatedData.connectionTime_decimal) {
                updatedData.connectionTime_decimal = parseFloat(updatedData.connectionTime_decimal);
            }
            if (updatedData.chargingDuration) {
                updatedData.chargingDuration = parseFloat(updatedData.chargingDuration);
            }
            if (updatedData.kWhDelivered) {
                updatedData.kWhDelivered = parseFloat(updatedData.kWhDelivered);
            }

            const { resource } = await containers.vehicleData.item(id, id).replace(updatedData);
            
            console.log(`✅ Updated charging session: ${id}`);
            return resource;
            
        } catch (error) {
            console.error(`❌ Error in ChargingSession.update(${id}):`, error.message);
            throw new Error(`Failed to update charging session: ${error.message}`);
        }
    }

    // Delete session
    static async delete(id) {
        try {
            console.log(`🗑️  Deleting charging session: ${id}`);
            
            if (!containers || !containers.vehicleData) {
                throw new Error("Database containers not properly initialized. vehicleData container is missing.");
            }

            await containers.vehicleData.item(id, id).delete();
            
            console.log(`✅ Deleted charging session: ${id}`);
            return true;
            
        } catch (error) {
            if (error.code === 404) {
                console.log(`⚠️  Charging session with ID ${id} not found for deletion`);
                return false;
            }
            console.error(`❌ Error in ChargingSession.delete(${id}):`, error.message);
            throw new Error(`Failed to delete charging session: ${error.message}`);
        }
    }
}

console.log("✅ ChargingSession model loaded successfully");

module.exports = ChargingSession;