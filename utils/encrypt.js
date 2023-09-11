const bcrypt = require("bcryptjs");
const saltrounds = 10;

async function encryptPassword(password){
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, saltrounds, (err, hash) => {
            if(err) reject(err);
            resolve(hash);
        })
    });
}

async function comparePassword(entered, actual){
    return new Promise((resolve, reject) => {
        bcrypt.compare(entered, actual, (err, success) => {
            if(err) reject(err);
            resolve(success);
        })
    })
}

module.exports = { encryptPassword, comparePassword }; 