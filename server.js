require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
const path     = require('path');
const fs       = require('fs');

const authRouter = require('./routes/authRoutes');
const itemRouter = require('./routes/itemRoutes');

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static Files ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Ensure uploads folder exists ───────────────────────────
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',  authRouter);
app.use('/api/items', itemRouter);

// ── Default Route ──────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── MongoDB Connection ─────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err  => console.log('❌ MongoDB Error:', err));

// ── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));