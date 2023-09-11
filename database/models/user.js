const { Schema, model } = require("mongoose");

const userSchema = new Schema({
    firstname : {
        type: String,
        default: null
    },
    lastname : {
        type: String,
        default: null
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    requestStatus: {
        type: Object,
        default: {}
    },
    token : {
        type: String
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastActivity: {
        type: Date,
        default: null
    }
})

module.exports = model("User", userSchema, "users");