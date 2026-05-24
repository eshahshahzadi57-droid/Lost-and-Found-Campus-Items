const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({

    itemName: {
        type: String,
        required: true
    },

    itemStatus: {
        type: String,
        enum: ['lost', 'found'],
        required: true
    },

    itemCategory: {
        type: String,
        required: true
    },

    itemLocation: {
        type: String,
        required: true
    },

    itemDescription: {
        type: String,
        default: ''
    },

    imagePath: {
        type: String,
        default: ''
    },

    postedBy: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        name: {
            type: String
        }
    }

}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);