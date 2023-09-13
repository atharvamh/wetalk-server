const Room = require("../database/models/room");
const { Router } = require("express");
const verifyToken = require("../middleware/auth");
const router = Router();

router.get("/:roomId/conversations", verifyToken, async(req, res) => {
    const roomId = req.params["roomId"];

    try {
        const existingRoom = await Room.findOne({ _id : roomId });
    
        return res.status(200).json({
            isSuccess : true,
            message : "Fetched conversations",
            data : existingRoom?.conversation
        });

    } catch (error) {
        return res.status(500).json({ isSuccess : false, message : `Error fetching conversations : ${error}`, data : [] });
    }
})

router.post("/savemessage", verifyToken, async(req, res) => {
    const { roomId, sender, timestamp, message } = req.body;

    const updateObj = {
        $push: {
          'conversation': { sender, timestamp, message }
        },
        $set: {
          'metadata.lasttimestamp': timestamp,
          'metadata.lastmessage': message
        }
    };
    
    try {
        const status = await Room.findOneAndUpdate({ _id : roomId }, updateObj, {new: true});

        if(status == null)
            throw new Error("Error saving message");

        return res.status(200).json({});

    } catch (error) {
        return res.status(500).json({ isSuccess : false, message : error.message});
    }
});

module.exports = router;