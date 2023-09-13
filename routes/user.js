const { Router } = require("express");
const router = Router();
const User = require("../database/models/user");
const Room = require("../database/models/room");
const Connection = require("../database/models/connections");
const { isValidEmail } = require("../utils/validate");
const { encryptPassword, comparePassword } = require("../utils/encrypt");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/auth");

router.post("/register", async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        if(!(email && password && firstName && lastName)){
            throw new Error("Required fields missing");
        }

        else if(!isValidEmail(email)){
            throw new Error("Email format is invalid");
        }

        const olduser = await User.findOne({ email : email });
        if(olduser){
            throw new Error("User already exists. Please login");
        }

        const encryptedPassword = await encryptPassword(password);

        const user = await User.create({
            firstname : firstName,
            lastname : lastName,
            email: email.toLowerCase(),
            password: encryptedPassword
        });

        const token = jwt.sign(
            {
                user_id : user._id,
                email : user.email,
            },
            process.env.TOKEN_KEY,
            {
                expiresIn: "2h"
            }
        )

        user.token = token;

        return res.status(201).json({
            isSuccess: true,
            message: "Signed up successfully"
        });

    } catch (error) {
        return res.status(500).json({ isSuccess : false, message : error.message });
    }
})

router.post("/login", async (req, res) => {
    try{
        const { email, password } = req.body;

        if(!(email && password))
            throw new Error("Required fields missing");

        const existinguser = await User.findOne({ email });

        if(!existinguser)
            throw new Error("User not found. Please sign up");

        const matches = await comparePassword(password, existinguser.password);

        if(existinguser && matches){
            const token = jwt.sign(
                {
                    user_id : existinguser._id,
                    email : existinguser.email,
                },
                process.env.TOKEN_KEY,
                {
                    expiresIn: "2h"
                }
            )

            existinguser.token = token;

            await User.updateOne({ _id : existinguser._id}, { isOnline : true, lastActivity : Date.now() });

            return res.status(200).json({
                isSuccess: true,
                message: "Login success. Please wait",
                data: {
                    _id : existinguser._id,
                    email: existinguser.email,
                    firstName: existinguser.firstname,
                    lastName: existinguser.lastname,
                    token: token
                }
            })
        }

        throw new Error("Invalid credentials");

    } catch(error){
        return res.status(500).json({ isSuccess : false, message : error.message });
    }
});

router.get("/:id", async(req, res) => {
    try {
        const id = req.params["id"];
        const response = await User.findOne({ _id : id }).select({ firstname : 1, lastname : 1, isVerified : 1, 
            email : 1, lastActivity : 1, isOnline: 1 });

        if(!response)
            throw new Error("User not found");

        return res.status(200).json({ isSucess : true, message : "Found user", data : response });

    } catch (error) {
        return res.status(500).json({ isSuccess : false, message : error.message , data : null });
    }
})

router.patch("/:id", verifyToken, async(req, res) => {
    const userid = req.params["id"];
    const updatedItem = req.body;

    try {
        const updated = await User.findByIdAndUpdate(userid, updatedItem, { new: true });
    
        if (!updated)
            throw new Error("User not found");
    
        return res.json({ isSuccess : true, message : "Details updated successfully", data : updated });

    } catch (error) {
        return res.status(500).json({ isSuccess : false, message : error.message });
    }
})

router.get("/:id/logout", async (req, res) => {
    try{
        const id = req.params["id"];
        const response = await User.updateOne({ _id : id }, { isOnline : false, lastActivity : Date.now() });
        
        if(response.acknowledged){
            return res.status(200).json({ isSuccess : true, message : "Logged out successfully" });
        }

        throw new Error("Error logging out. Please try again");
        
    } catch(error){
        return res.status(500).json({ isSuccess : false, message : error.message });
    }
});

router.get("/:userId/rooms", verifyToken, async(req, res) => {
    const userId = req.params["userId"];

    try{
        const rooms = await Room.find({ 
            members: {
                $elemMatch: {
                    userId: { $eq: userId }
                }
            } 
        }).select({ isGroupChat : 1, members : 1, metadata : 1 });

        return res.status(200).json({ 
            isSuccess : true, 
            message : "", 
            data : rooms
        });
    }
    catch(error){
        return res.status(500).json({ isSuccess : false, message : error.message, data : [] });
    }
})

module.exports = router;