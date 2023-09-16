const { Router } = require("express");
const router = Router();
const User = require("../database/models/user");
const Room = require("../database/models/room");
const { isValidEmail } = require("../utils/validate");
const { sendEmail, getVerificationEmailHTML, getPasswordResetEmailHTML } = require("../utils/mailservice");
const { encryptPassword, comparePassword } = require("../utils/encrypt");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/auth");

router.post("/register", async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        const hostUrl = `${req.protocol}://${req.get("host")}`;

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

        await sendEmail(
            process.env.SUPPORT_EMAIL, email, "WeTalk user verification", "",
            getVerificationEmailHTML(firstName, hostUrl, token)
        )

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

router.get("/verify/:token", async (req, res) => {
    const { token } = req.params;
    
    try{
        const decodedToken = jwt.verify(token, process.env.TOKEN_KEY);
        const expiryTime = decodedToken.exp * 1000;

        let message = "Your email has been successfully verified. You can now safely close this window.";

        if(Date.now() > expiryTime){
            return res.status(200).send("This link has expired. Please request a new verification link from your profile settings.");
        }

        const response = await User.findOneAndUpdate({ _id : decodedToken.user_id }, { isVerified : true }, { new  : true });
        
        if(!response?.isVerified){
            return res.status(200).send("Failed to verify user. Please try again");
        }

        return res.status(200).send(message); 
    } catch(error){
        return res.status(500).send(error.message);
    }
})

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

router.post("/request-password-reset", async(req, res) => {
    const { email } = req.body;
    const origin = req.get("origin");
    const url = origin + "/resetpassword";

    try {
        const existinguser = await User.findOne({ email : email });

        if(!existinguser)
            throw new Error("Email address is invalid. Cannot find user");

        const token = jwt.sign(
            {
                user_id : existinguser._id,
                email : existinguser.email,
            },
            process.env.TOKEN_KEY,
            {
                expiresIn: "1h"
            }
        );

        await sendEmail(
            process.env.SUPPORT_EMAIL, existinguser.email, "WeTalk Password Reset", "",
            getPasswordResetEmailHTML(url, token)
        );

        return res.status(200).json({ isSuccess : true, message : "Link sent successfully" });

    } catch (error) {
        return res.status(500).json({ isSuccess : false, message : error.message });
    }
})

router.post("/reset-password", async(req, res) => {
    const { password, token } = req.body;

    try {
        const decodedToken = jwt.verify(token, process.env.TOKEN_KEY);
        const encryptedPassword = await encryptPassword(password);
        const updated = await User.findOneAndUpdate({ _id : decodedToken.user_id }, { password : encryptedPassword }, { new : true });

        if(updated == null)
            throw new Error("Error updating password. Please try again");
        
        return res.status(200).json({ isSuccess : true, message : "Password updated successfully."});

    } catch (error) {
        return res.status(500).json({ isSuccess : false, message : error.message });
    }
})

router.post("/request-verification", verifyToken, async(req, res) => {
    const { email, firstName } = req.body;
    const hostUrl = `${req.protocol}://${req.get("host")}`;

    try {
        const existinguser = await User.findOne({ email });

        if(!existinguser){
            throw new Error("User not found. Cannot initiate verification");
        }

        const token = jwt.sign(
            {
                user_id : existinguser._id,
                email : existinguser.email,
            },
            process.env.TOKEN_KEY,
            {
                expiresIn: "2h"
            }
        );

        await sendEmail(
            process.env.SUPPORT_EMAIL, email, "WeTalk user verification", "",
            getVerificationEmailHTML(firstName, hostUrl, token)
        );

        return res.status(200).json({
            isSuccess: true,
            message: "Verification link sent to registered email address."
        })

    } catch (error) {
        return res.status(500).json({ isSuccess : false, message : error.message });
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