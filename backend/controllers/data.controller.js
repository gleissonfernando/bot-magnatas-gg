const mongoose = require('mongoose');

// Define the User Verification Schema if not already in models/
const UserVerificationSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    verified: { type: Boolean, default: false },
    username: String,
    avatar: String,
    lastVerified: Date
});
const UserVerification = mongoose.models.UserVerification || mongoose.model('UserVerification', UserVerificationSchema);

exports.getUserData = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await UserVerification.findOne({ discordId: userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found in database' });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Data Controller Error:', error);
        res.status(500).json({ error: 'Internal server error fetching data' });
    }
};

exports.updateUserData = async (req, res) => {
    try {
        const userId = req.user.userId;
        const updates = req.body;

        const updatedUser = await UserVerification.findOneAndUpdate(
            { discordId: userId },
            { $set: updates },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            message: 'User data updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Data Controller Error:', error);
        res.status(500).json({ error: 'Internal server error updating data' });
    }
};
