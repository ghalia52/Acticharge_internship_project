// =====================================================
// Routes/predictionRoutes.js - ORDRE CORRIGÉ
// =====================================================
const express = require("express");
const router = express.Router();
const Predictions = require("../Models/Predictions");

// GET all predictions (doit être en premier)
router.get("/", async (req, res) => {
    try {
        const predictions = await Predictions.getAll();
        res.json(predictions);
    } catch (err) {
        console.error('Error fetching predictions:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET predictions by day indicator (routes spécifiques AVANT /:id)
router.get("/day/:dayIndicator", async (req, res) => {
    try {
        const predictions = await Predictions.getByDayIndicator(req.params.dayIndicator);
        res.json(predictions);
    } catch (err) {
        console.error('Error fetching predictions by day:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET predictions with high predicted kWh (above threshold)
router.get("/high-kwh/:threshold", async (req, res) => {
    try {
        const predictions = await Predictions.getHighKwh(req.params.threshold);
        res.json(predictions);
    } catch (err) {
        console.error('Error fetching high kWh predictions:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET predictions with low predicted kWh (below threshold)
router.get("/low-kwh/:threshold", async (req, res) => {
    try {
        const predictions = await Predictions.getLowKwh(req.params.threshold);
        res.json(predictions);
    } catch (err) {
        console.error('Error fetching low kWh predictions:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET predictions by power range
router.get("/power-range/:minPower/:maxPower", async (req, res) => {
    try {
        const predictions = await Predictions.getByPowerRange(
            req.params.minPower, 
            req.params.maxPower
        );
        res.json(predictions);
    } catch (err) {
        console.error('Error fetching predictions by power range:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET prediction accuracy analysis for a specific day
router.get("/accuracy/:dayIndicator", async (req, res) => {
    try {
        const accuracy = await Predictions.getPredictionAccuracy(req.params.dayIndicator);
        res.json(accuracy);
    } catch (err) {
        console.error('Error fetching prediction accuracy:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET prediction statistics for a specific day
router.get("/stats/:dayIndicator", async (req, res) => {
    try {
        const stats = await Predictions.getDayStatistics(req.params.dayIndicator);
        res.json(stats);
    } catch (err) {
        console.error('Error fetching prediction statistics:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET single prediction by ID (DOIT ÊTRE EN DERNIER)
router.get("/:id", async (req, res) => {
    try {
        const prediction = await Predictions.getById(req.params.id);
        if (!prediction) {
            return res.status(404).json({ message: "Prediction not found" });
        }
        res.json(prediction);
    } catch (err) {
        console.error('Error fetching prediction:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST new prediction
router.post("/", async (req, res) => {
    try {
        // Input validation
        const requiredFields = [
            'connectionTime_decimal', 
            'chargingDuration', 
            'kWhDelivered', 
            'dayIndicator',
            'avg_power',
            'connection_end_time',
            'predicted_kWh'
        ];

        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                message: `Missing required fields: ${missingFields.join(', ')}` 
            });
        }

        const savedPrediction = await Predictions.create(req.body);
        res.status(201).json(savedPrediction);
    } catch (err) {
        console.error('Error creating prediction:', err);
        
        if (err.message.includes('Missing required fields') || err.message.includes('must be a valid number')) {
            return res.status(400).json({ message: err.message });
        }
        
        res.status(500).json({ message: "Server error during prediction creation" });
    }
});

// PUT update prediction
router.put("/:id", async (req, res) => {
    try {
        const updatedPrediction = await Predictions.update(req.params.id, req.body);
        if (!updatedPrediction) {
            return res.status(404).json({ message: "Prediction not found" });
        }
        res.json(updatedPrediction);
    } catch (err) {
        console.error('Error updating prediction:', err);
        
        if (err.message.includes('must be a valid number')) {
            return res.status(400).json({ message: err.message });
        }
        
        res.status(500).json({ message: "Server error during prediction update" });
    }
});

console.log("✅ Prediction routes loaded successfully");

module.exports = router;