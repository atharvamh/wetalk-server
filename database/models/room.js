const { Schema, model } = require("mongoose");

const roomSchema = new Schema({
    members: {
        type: Array,
        default: []
    },
    conversation: {
        type: Array,
        default: []
    },
    isGroupChat: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: Object,
        default: {}
    }
});

module.exports = model("Room", roomSchema, "rooms");