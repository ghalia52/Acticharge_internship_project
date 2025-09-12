// =====================================================
// Models/Predictions.js - CORRECTED VERSION
// =====================================================

// Import database configuration with proper error handling
let containers;
try {
    const dbConfig = require("../database");
    containers = dbConfig.containers;
    
    if (!containers) {
        throw new Error("Containers not found in database configuration");
    }
    
    console.log("✅ Predictions model: Database containers loaded successfully");
    
} catch (error) {
    console.error("❌ Predictions model: Error loading database configuration:", error.message);
    process.exit(1);
}

class Predictions {
    constructor(data) {
        this.id = data.id;
        this.connectionTime_decimal = data.connectionTime_decimal;
        this.chargingDuration = data.chargingDuration;
        this.kWhDelivered = data.kWhDelivered;
        this.dayIndicator = data.dayIndicator;
        this.avg_power = data.avg_power;
        this.connection_end_time = data.connection_end_time;
        this.predicted_kWh = data.predicted_kWh;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    // Validate required fields
    static validateData(data) {
        const requiredFields = [
            'connectionTime_decimal', 
            'chargingDuration', 
            'kWhDelivered', 
            'dayIndicator',
            'avg_power',
            'connection_end_time',
            'predicted_kWh'
        ];
        const errors = [];

        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null || data[field] === '') {
                errors.push(`Missing required field: ${field}`);
            }
        }

        // Validate numeric fields
        const numericFields = [
            'connectionTime_decimal', 
            'chargingDuration', 
            'kWhDelivered',
            'avg_power',
            'connection_end_time',
            'predicted_kWh'
        ];
        
        for (const field of numericFields) {
            if (data[field] !== undefined && isNaN(Number(data[field]))) {
                errors.push(`Field ${field} must be a valid number`);
            }
        }

        return errors;
    }

    // Get all predictions
    static async getAll() {
        try {
            console.log("📊 Fetching all predictions...");
            
            // Check if containers is properly loaded
            if (!containers || !containers.predictions) {
                throw new Error("Database containers not properly initialized. predictions container is missing.");
            }

            const { resources } = await containers.predictions.items
                .readAll()
                .fetchAll();

            console.log(`✅ Retrieved ${resources.length} predictions`);
            return resources;
            
        } catch (error) {
            console.error("❌ Error in Predictions.getAll():", error.message);
            throw new Error(`Failed to retrieve predictions: ${error.message}`);
        }
    }

    // Get prediction by ID
    static async getById(id) {
        try {
            console.log(`📊 Fetching prediction with ID: ${id}`);
            
            if (!containers || !containers.predictions) {
                throw new Error("Database containers not properly initialized. predictions container is missing.");
            }

            const { resource } = await containers.predictions.item(id, id).read();
            
            if (!resource) {
                console.log(`⚠️  Prediction with ID ${id} not found`);
                return null;
            }

            console.log(`✅ Retrieved prediction: ${id}`);
            return resource;
            
        } catch (error) {
            if (error.code === 404) {
                console.log(`⚠️  Prediction with ID ${id} not found`);
                return null;
            }
            console.error(`❌ Error in Predictions.getById(${id}):`, error.message);
            throw new Error(`Failed to retrieve prediction: ${error.message}`);
        }
    }

    // Get predictions by day indicator
    static async getByDayIndicator(dayIndicator) {
        try {
            console.log(`📊 Fetching predictions for day: ${dayIndicator}`);
            
            if (!containers || !containers.predictions) {
                throw new Error("Database containers not properly initialized. predictions container is missing.");
            }

            const query = {
                query: "SELECT * FROM c WHERE c.dayIndicator = @dayIndicator",
                parameters: [
                    { name: "@dayIndicator", value: dayIndicator }
                ]
            };

            const { resources } = await containers.predictions.items
                .query(query)
                .fetchAll();

            console.log(`✅ Retrieved ${resources.length} predictions for day: ${dayIndicator}`);
            return resources;
            
        } catch (error) {
            console.error(`❌ Error in Predictions.getByDayIndicator(${dayIndicator}):`, error.message);
            throw new Error(`Failed to retrieve predictions for day ${dayIndicator}: ${error.message}`);
        }
    }

    // Get predictions with high kWh (above threshold)
    static async getHighKwh(threshold) {
        try {
            console.log(`📊 Fetching predictions with predicted kWh > ${threshold}`);
            
            if (!containers || !containers.predictions) {
                throw new Error("Database containers not properly initialized. predictions container is missing.");
            }

            const query = {
                query: "SELECT * FROM c WHERE c.predicted_kWh > @threshold ORDER BY c.predicted_kWh DESC",
                parameters: [
                    { name: "@threshold", value: parseFloat(threshold) }
                ]
            };

            const { resources } = await containers.predictions.items
                .query(query)
                .fetchAll();

            console.log(`✅ Retrieved ${resources.length} high kWh predictions (>${threshold})`);
            return resources;
            
        } catch (error) {
            console.error(`❌ Error in Predictions.getHighKwh(${threshold}):`, error.message);
            throw new Error(`Failed to retrieve high kWh predictions: ${error.message}`);
        }
    }

    // Get predictions with low kWh (below threshold)
    static async getLowKwh(threshold) {
        try {
            console.log(`📊 Fetching predictions with predicted kWh < ${threshold}`);
            
            if (!containers || !containers.predictions) {
                throw new Error("Database containers not properly initialized. predictions container is missing.");
            }

            const query = {
                query: "SELECT * FROM c WHERE c.predicted_kWh < @threshold ORDER BY c.predicted_kWh ASC",
                parameters: [
                    { name: "@threshold", value: parseFloat(threshold) }
                ]
            };

            const { resources } = await containers.predictions.items
                .query(query)
                .fetchAll();

            console.log(`✅ Retrieved ${resources.length} low kWh predictions (<${threshold})`);
            return resources;
            
        } catch (error) {
            console.error(`❌ Error in Predictions.getLowKwh(${threshold}):`, error.message);
            throw new Error(`Failed to retrieve low kWh predictions: ${error.message}`);
        }
    }

    // Get predictions by power range
    static async getByPowerRange(minPower, maxPower) {
        try {
            console.log(`📊 Fetching predictions with power between ${minPower} and ${maxPower}`);
            
            if (!containers || !containers.predictions) {
                throw new Error("Database containers not properly initialized. predictions container is missing.");
            }

            const query = {
                query: "SELECT * FROM c WHERE c.avg_power >= @minPower AND c.avg_power <= @maxPower",
                parameters: [
                    { name: "@minPower", value: parseFloat(minPower) },
                    { name: "@maxPower", value: parseFloat(maxPower) }
                ]
            };

            const { resources } = await containers.predictions.items
                .query(query)
                .fetchAll();

            console.log(`✅ Retrieved ${resources.length} predictions in power range ${minPower}-${maxPower}`);
            return resources;
            
        } catch (error) {
            console.error(`❌ Error in Predictions.getByPowerRange(${minPower}, ${maxPower}):`, error.message);
            throw new Error(`Failed to retrieve predictions by power range: ${error.message}`);
        }
    }

    // Get prediction accuracy analysis
    static async getPredictionAccuracy(dayIndicator) {
        try {
            console.log(`📊 Calculating prediction accuracy for day: ${dayIndicator}`);
            
            if (!containers || !containers.predictions) {
                throw new Error("Database containers not properly initialized. predictions container is missing.");
            }

            const query = {
                query: `
                    SELECT 
                        COUNT(1) as totalPredictions,
                        AVG(ABS(c.predicted_kWh - c.kWhDelivered)) as avgAbsoluteError,
                        AVG(ABS(c.predicted_kWh - c.kWhDelivered) / c.kWhDelivered * 100) as avgPercentError,
                        MIN(ABS(c.predicted_kWh - c.kWhDelivered)) as minError,
                        MAX(ABS(c.predicted_kWh - c.kWhDelivered)) as maxError
                    FROM c 
                    WHERE c.dayIndicator = @dayIndicator 
                    AND c.kWhDelivered > 0
                `,
                parameters: [
                    { name: "@dayIndicator", value: dayIndicator }
                ]
            };

            const { resources } = await containers.predictions.items
                .query(query)
                .fetchAll();

            const accuracy = resources[0] || {
                totalPredictions: 0,
                avgAbsoluteError: 0,
                avgPercentError: 0,
                minError: 0,
                maxError: 0
            };

            console.log(`✅ Calculated prediction accuracy for day: ${dayIndicator}`);
            return accuracy;
            
        } catch (error) {
            console.error(`❌ Error in Predictions.getPredictionAccuracy(${dayIndicator}):`, error.message);
            throw new Error(`Failed to calculate prediction accuracy: ${error.message}`);
        }
    }

    // Get statistics for a specific day
    static async getDayStatistics(dayIndicator) {
        try {
            console.log(`📊 Calculating prediction statistics for day: ${dayIndicator}`);
            
            if (!containers || !containers.predictions) {
                throw new Error("Database containers not properly initialized. predictions container is missing.");
            }

            const query = {
                query: `
                    SELECT 
                        COUNT(1) as totalPredictions,
                        SUM(c.predicted_kWh) as totalPredictedEnergy,
                        AVG(c.predicted_kWh) as avgPredictedEnergy,
                        AVG(c.avg_power) as avgPower,
                        MIN(c.predicted_kWh) as minPredictedEnergy,
                        MAX(c.predicted_kWh) as maxPredictedEnergy
                    FROM c 
                    WHERE c.dayIndicator = @dayIndicator
                `,
                parameters: [
                    { name: "@dayIndicator", value: dayIndicator }
                ]
            };

            const { resources } = await containers.predictions.items
                .query(query)
                .fetchAll();

            const stats = resources[0] || {
                totalPredictions: 0,
                totalPredictedEnergy: 0,
                avgPredictedEnergy: 0,
                avgPower: 0,
                minPredictedEnergy: 0,
                maxPredictedEnergy: 0
            };

            console.log(`✅ Calculated prediction statistics for day: ${dayIndicator}`);
            return stats;
            
        } catch (error) {
            console.error(`❌ Error in Predictions.getDayStatistics(${dayIndicator}):`, error.message);
            throw new Error(`Failed to calculate prediction statistics: ${error.message}`);
        }
    }

    // Create new prediction
    static async create(data) {
        try {
            console.log("📝 Creating new prediction...");
            
            if (!containers || !containers.predictions) {
                throw new Error("Database containers not properly initialized. predictions container is missing.");
            }

            // Validate data
            const validationErrors = Predictions.validateData(data);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Create prediction object
            const predictionData = {
                id: data.id || `prediction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                connectionTime_decimal: parseFloat(data.connectionTime_decimal),
                chargingDuration: parseFloat(data.chargingDuration),
                kWhDelivered: parseFloat(data.kWhDelivered),
                dayIndicator: data.dayIndicator,
                avg_power: parseFloat(data.avg_power),
                connection_end_time: parseFloat(data.connection_end_time),
                predicted_kWh: parseFloat(data.predicted_kWh),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const { resource } = await containers.predictions.items.create(predictionData);
            
            console.log(`✅ Created prediction: ${resource.id}`);
            return resource;
            
        } catch (error) {
            console.error("❌ Error in Predictions.create():", error.message);
            throw new Error(`Failed to create prediction: ${error.message}`);
        }
    }

    // Update prediction
    static async update(id, data) {
        try {
            console.log(`📝 Updating prediction: ${id}`);
            
            if (!containers || !containers.predictions) {
                throw new Error("Database containers not properly initialized. predictions container is missing.");
            }

            // Get existing prediction
            const existingPrediction = await this.getById(id);
            if (!existingPrediction) {
                return null;
            }

            // Validate numeric fields if provided
            const numericFields = [
                'connectionTime_decimal', 
                'chargingDuration', 
                'kWhDelivered',
                'avg_power',
                'connection_end_time',
                'predicted_kWh'
            ];
            
            for (const field of numericFields) {
                if (data[field] !== undefined && isNaN(Number(data[field]))) {
                    throw new Error(`Field ${field} must be a valid number`);
                }
            }

            // Update data
            const updatedData = {
                ...existingPrediction,
                ...data,
                updatedAt: new Date().toISOString()
            };

            // Convert numeric fields
            numericFields.forEach(field => {
                if (updatedData[field] !== undefined) {
                    updatedData[field] = parseFloat(updatedData[field]);
                }
            });

            const { resource } = await containers.predictions.item(id, id).replace(updatedData);
            
            console.log(`✅ Updated prediction: ${id}`);
            return resource;
            
        } catch (error) {
            console.error(`❌ Error in Predictions.update(${id}):`, error.message);
            throw new Error(`Failed to update prediction: ${error.message}`);
        }
    }

    // Delete prediction
    static async delete(id) {
        try {
            console.log(`🗑️  Deleting prediction: ${id}`);
            
            if (!containers || !containers.predictions) {
                throw new Error("Database containers not properly initialized. predictions container is missing.");
            }

            await containers.predictions.item(id, id).delete();
            
            console.log(`✅ Deleted prediction: ${id}`);
            return true;
            
        } catch (error) {
            if (error.code === 404) {
                console.log(`⚠️  Prediction with ID ${id} not found for deletion`);
                return false;
            }
            console.error(`❌ Error in Predictions.delete(${id}):`, error.message);
            throw new Error(`Failed to delete prediction: ${error.message}`);
        }
    }
}

console.log("✅ Predictions model loaded successfully");

module.exports = Predictions;