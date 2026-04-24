const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// ─── User Model ───────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password)
            return res.status(400).json({ success: false, message: 'All fields are required.' });

        if (password.length < 6)
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

        const existing = await User.findOne({ email });
        if (existing)
            return res.status(400).json({ success: false, message: 'Email already registered.' });

        const hashed = await bcrypt.hash(password, 10);
        const user   = await User.create({ name, email, password: hashed });

        const token = jwt.sign(
            { userId: user._id, name: user.name, email: user.email },
            process.env.JWT_SECRET || 'campusfinder_secret_key',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Account created!',
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ success: false, message: 'All fields are required.' });

        const user = await User.findOne({ email });
        if (!user)
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });

        const match = await bcrypt.compare(password, user.password);
        if (!match)
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });

        const token = jwt.sign(
            { userId: user._id, name: user.name, email: user.email },
            process.env.JWT_SECRET || 'campusfinder_secret_key',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Logged in!',
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = { router, User };
