const express        = require('express');
const router         = express.Router();
const multer         = require('multer');
const path           = require('path');
const fs             = require('fs');
const Item           = require('../models/Item');
const authMiddleware = require('../middleware/auth');

// ── Multer Setup ───────────────────────────────────────────
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = /jpeg|jpg|png|gif|webp/.test(
            path.extname(file.originalname).toLowerCase()
        );
        ok ? cb(null, true) : cb(new Error('Images only'));
    }
});

// ── GET /api/items — all items (with optional search) ──────
router.get('/', async (req, res) => {
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

// ── GET /api/items/mine — logged in user's items ───────────
// ⚠️ Must be above /:id to avoid route conflict
router.get('/mine', authMiddleware, async (req, res) => {
    try {
        const items = await Item.find({
            'postedBy.userId': req.user.userId
        }).sort({ createdAt: -1 });

        res.json({ success: true, count: items.length, data: items });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── POST /api/items — create new item ─────────────────────
router.post('/', authMiddleware, upload.single('itemImage'), async (req, res) => {
    try {
        const {
            itemName,
            itemStatus,
            itemCategory,
            itemLocation,
            itemDescription
        } = req.body;

        const newItem = new Item({
            itemName,
            itemStatus,
            itemCategory,
            itemLocation,
            itemDescription,
            imagePath: req.file ? req.file.path.replace(/\\/g, '/') : '',
            postedBy:  { userId: req.user.userId, name: req.user.name }
        });

        const saved = await newItem.save();

        res.status(201).json({ success: true, data: saved });

    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// ── PUT /api/items/:id — update item ──────────────────────
router.put('/:id', authMiddleware, upload.single('itemImage'), async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item)
            return res.status(404).json({
                success: false,
                message: 'Item not found.'
            });

        if (item.postedBy.userId.toString() !== req.user.userId)
            return res.status(403).json({
                success: false,
                message: 'Not allowed.'
            });

        const {
            itemName,
            itemStatus,
            itemCategory,
            itemLocation,
            itemDescription
        } = req.body;

        if (itemName)     item.itemName     = itemName;
        if (itemStatus)   item.itemStatus   = itemStatus;
        if (itemCategory) item.itemCategory = itemCategory;
        if (itemLocation) item.itemLocation = itemLocation;

        if (itemDescription !== undefined)
            item.itemDescription = itemDescription;

        if (req.file)
            item.imagePath = req.file.path.replace(/\\/g, '/');

        const updated = await item.save();

        res.json({ success: true, data: updated });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── DELETE /api/items/:id — delete item ───────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item)
            return res.status(404).json({
                success: false,
                message: 'Item not found.'
            });

        if (item.postedBy.userId.toString() !== req.user.userId)
            return res.status(403).json({
                success: false,
                message: 'Not allowed.'
            });

        await item.deleteOne();

        res.json({ success: true, message: 'Item deleted.' });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
