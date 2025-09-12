// =====================================================
// Routes/ChargingRoutes.js - ORDRE CORRIGÉ
// =====================================================
const express = require("express");
const router = express.Router();
const ChargingSession = require("../Models/ChargingSession");

// GET all charging sessions (doit être en premier)
router.get("/", async (req, res) => {
    try {
        const sessions = await ChargingSession.getAll();
        res.json(sessions);
    } catch (err) {
        console.error('Error fetching sessions:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET sessions by day indicator (routes spécifiques AVANT /:id)
router.get("/day/:dayIndicator", async (req, res) => {
    try {
        const sessions = await ChargingSession.getByDayIndicator(req.params.dayIndicator);
        res.json(sessions);
    } catch (err) {
        console.error('Error fetching sessions by day:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET sessions with high kWh delivery
router.get("/high-kwh/:threshold", async (req, res) => {
    try {
        const sessions = await ChargingSession.getHighKwhSessions(req.params.threshold);
        res.json(sessions);
    } catch (err) {
        console.error('Error fetching high kWh sessions:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET statistics for a specific day
router.get("/stats/:dayIndicator", async (req, res) => {
    try {
        const stats = await ChargingSession.getDayStatistics(req.params.dayIndicator);
        res.json(stats);
    } catch (err) {
        console.error('Error fetching day statistics:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET single session by ID (DOIT ÊTRE EN DERNIER)
router.get("/:id", async (req, res) => {
    try {
        const session = await ChargingSession.getById(req.params.id);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        res.json(session);
    } catch (err) {
        console.error('Error fetching session:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST new charging session
router.post("/", async (req, res) => {
    try {
        // Input validation
        const requiredFields = ['connectionTime_decimal', 'chargingDuration', 'kWhDelivered', 'dayIndicator'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                message: `Missing required fields: ${missingFields.join(', ')}` 
            });
        }

        const savedSession = await ChargingSession.create(req.body);
        res.status(201).json(savedSession);
    } catch (err) {
        console.error('Error creating session:', err);
        
        if (err.message.includes('Missing required fields') || err.message.includes('must be a valid number')) {
            return res.status(400).json({ message: err.message });
        }
        
        res.status(500).json({ message: "Server error during session creation" });
    }
});

// PUT update session
router.put("/:id", async (req, res) => {
    try {
        const updatedSession = await ChargingSession.update(req.params.id, req.body);
        if (!updatedSession) {
            return res.status(404).json({ message: "Session not found" });
        }
        res.json(updatedSession);
    } catch (err) {
        console.error('Error updating session:', err);
        
        if (err.message.includes('must be a valid number')) {
            return res.status(400).json({ message: err.message });
        }
        
        res.status(500).json({ message: "Server error during session update" });
    }
});

console.log("✅ Charging routes loaded successfully");

module.exports = router;