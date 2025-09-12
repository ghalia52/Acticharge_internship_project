// =====================================================
// Models/user.js - CORRECTED VERSION
// =====================================================
const bcrypt = require('bcrypt');
const { containers } = require('../database');

const user = {
    // Create new user
    create: async (userData) => {
        try {
            // Validate required fields
            if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
                throw new Error('Missing required fields: firstName, lastName, email, and password are required');
            }

            // Check if user already exists
            const existingUser = await user.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('User already exists with this email');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            
            // Prepare user document with Cosmos DB structure
            const newUser = {
                id: require('crypto').randomUUID(),
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email.toLowerCase(), 
                password: hashedPassword,
                createdAt: new Date().toISOString(),
                lastLogin: null,
                loginCount: 0,
                partitionKey: userData.email.toLowerCase().split('@')[1]
            };
            
            const { resource } = await containers.users.items.create(newUser);
            return resource;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    // Find user by email
    findByEmail: async (email) => {
        try {
            const { resources } = await containers.users
                .items.query({
                    query: "SELECT * FROM c WHERE c.email = @email",
                    parameters: [{ name: "@email", value: email.toLowerCase() }]
                })
                .fetchAll();
            return resources.length > 0 ? resources[0] : null;
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    },

    // Find user by ID - FIXED
    findById: async (id) => {
        try {
            // Use query instead of direct item lookup since we don't know the partition key
            const { resources } = await containers.users
                .items.query({
                    query: "SELECT * FROM c WHERE c.id = @id",
                    parameters: [{ name: "@id", value: id }]
                })
                .fetchAll();
            return resources.length > 0 ? resources[0] : null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    },

    // Update user login info - FIXED
    updateLogin: async (userId, email) => {
        try {
            const userRecord = await user.findByEmail(email);
            if (userRecord) {
                userRecord.lastLogin = new Date().toISOString();
                userRecord.loginCount = (userRecord.loginCount || 0) + 1;
                
                const { resource } = await containers.users
                    .item(userRecord.id, userRecord.partitionKey)
                    .replace(userRecord);
                return resource;
            }
            return null;
        } catch (error) {
            console.error('Error updating user login:', error);
            throw error;
        }
    },

    // Update user profile
    update: async (id, updateData) => {
        try {
            const existingUser = await user.findById(id);
            if (!existingUser) {
                return null;
            }

            // Merge update data with existing user
            const updatedUser = {
                ...existingUser,
                ...updateData,
                id: id,
                updatedAt: new Date().toISOString()
            };

            // If password is being updated, hash it
            if (updateData.password) {
                updatedUser.password = await bcrypt.hash(updateData.password, 10);
            }

            const { resource } = await containers.users
                .item(id, existingUser.partitionKey)
                .replace(updatedUser);
            return resource;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    // Delete user
    delete: async (id) => {
        try {
            const userRecord = await user.findById(id);
            if (!userRecord) {
                return null;
            }

            await containers.users
                .item(id, userRecord.partitionKey)
                .delete();
            return { message: "User deleted successfully" };
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    // Compare password
    comparePassword: async (inputPassword, hashedPassword) => {
        try {
            return await bcrypt.compare(inputPassword, hashedPassword);
        } catch (error) {
            console.error('Error comparing password:', error);
            return false;
        }
    },

    // Get all users
    getAll: async (offset = 0, limit = 50) => {
        try {
            const { resources } = await containers.users
                .items.query({
                    query: "SELECT * FROM c ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit",
                    parameters: [
                        { name: "@offset", value: offset },
                        { name: "@limit", value: limit }
                    ]
                })
                .fetchAll();
            return resources;
        } catch (error) {
            console.error('Error fetching all users:', error);
            throw error;
        }
    },

    // Get users by login activity
    getActiveUsers: async (daysBack = 30) => {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysBack);
            const cutoffISO = cutoffDate.toISOString();

            const { resources } = await containers.users
                .items.query({
                    query: "SELECT * FROM c WHERE c.lastLogin >= @cutoffDate ORDER BY c.lastLogin DESC",
                    parameters: [{ name: "@cutoffDate", value: cutoffISO }]
                })
                .fetchAll();
            return resources;
        } catch (error) {
            console.error('Error fetching active users:', error);
            throw error;
        }
    },

    // Utility method to remove password from user object before sending to client
    sanitizeUser: (user) => {
        if (!user) return null;
        const { password, ...sanitizedUser } = user;
        return sanitizedUser;
    }
};

module.exports = user;