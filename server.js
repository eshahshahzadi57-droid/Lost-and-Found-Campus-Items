const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');

const { router: authRouter } = require('./authRoutes');
const authMiddleware          = require('./middleware/auth');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── MongoDB ──────────────────────────────────────────────────────────────────
mongoose.connect('mongodb://127.0.0.1:27017/campusfinder')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB error:', err));

// ─── Item Model ───────────────────────────────────────────────────────────────
const itemSchema = new mongoose.Schema({
    itemName:        { type: String, required: true },
    itemStatus:      { type: String, enum: ['lost', 'found'], required: true },
    itemCategory:    { type: String, required: true },
    itemLocation:    { type: String, required: true },
    itemDescription: { type: String, default: '' },
    imagePath:       { type: String, default: '' },
    // Track who posted it
    postedBy: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name:   { type: String }
    }
}, { timestamps: true });

const Item = mongoose.model('Item', itemSchema);

// ─── Multer ───────────────────────────────────────────────────────────────────
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase());
        ok ? cb(null, true) : cb(new Error('Images only'));
    }
});

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// ─── Public Routes ────────────────────────────────────────────────────────────

// GET /api/items — all items, optional ?search=
app.get('/api/items', async (req, res) => {
    try {
        const { search } = req.query;
        const filter = search ? {
            $or: [
                { itemName:        { $regex: search, $options: 'i' } },
                { itemLocation:    { $regex: search, $options: 'i' } },
                { itemDescription: { $regex: search, $options: 'i' } }
            ]
        } : {};
        const items = await Item.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, count: items.length, data: items });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── Protected Routes (login required) ───────────────────────────────────────

// POST /api/items — create item (must be logged in)
app.post('/api/items', authMiddleware, upload.single('itemImage'), async (req, res) => {
    try {
        const { itemName, itemStatus, itemCategory, itemLocation, itemDescription } = req.body;
        const newItem = new Item({
            itemName, itemStatus, itemCategory, itemLocation, itemDescription,
            imagePath: req.file ? req.file.path.replace(/\\/g, '/') : '',
            postedBy:  { userId: req.user.userId, name: req.user.name }
        });
        const saved = await newItem.save();
        res.status(201).json({ success: true, data: saved });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// GET /api/items/mine — get only logged-in user's items
app.get('/api/items/mine', authMiddleware, async (req, res) => {
    try {
        const items = await Item.find({ 'postedBy.userId': req.user.userId }).sort({ createdAt: -1 });
        res.json({ success: true, count: items.length, data: items });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/items/:id — edit item (only owner)
app.put('/api/items/:id', authMiddleware, upload.single('itemImage'), async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item)
            return res.status(404).json({ success: false, message: 'Item not found.' });

        if (item.postedBy.userId.toString() !== req.user.userId)
            return res.status(403).json({ success: false, message: 'Not allowed. You did not post this.' });

        const { itemName, itemStatus, itemCategory, itemLocation, itemDescription } = req.body;
        if (itemName)        item.itemName        = itemName;
        if (itemStatus)      item.itemStatus      = itemStatus;
        if (itemCategory)    item.itemCategory    = itemCategory;
        if (itemLocation)    item.itemLocation    = itemLocation;
        if (itemDescription !== undefined) item.itemDescription = itemDescription;
        if (req.file)        item.imagePath       = req.file.path.replace(/\\/g, '/');

        const updated = await item.save();
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/items/:id — delete item (only owner)
app.delete('/api/items/:id', authMiddleware, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item)
            return res.status(404).json({ success: false, message: 'Item not found.' });

        if (item.postedBy.userId.toString() !== req.user.userId)
            return res.status(403).json({ success: false, message: 'Not allowed. You did not post this.' });

        await item.deleteOne();
        res.json({ success: true, message: 'Item deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = 5000;
app.listen(PORT, () => console.log(`🌐 Server running at http://localhost:${PORT}`));
