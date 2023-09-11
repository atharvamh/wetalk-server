const { Schema, model } = require("mongoose");

const connectionSchema = new Schema({
    userId : {
        type: String,
        default: null
    },
    friends: {
        type: Array,
        default: []
    }
})

module.exports = model("Connection", connectionSchema, "connections");