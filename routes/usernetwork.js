const { Router } = require("express");
const verifyToken = require("../middleware/auth");
const User = require("../database/models/user");
const Connection = require("../database/models/connections");
const Room = require("../database/models/room");
const router = Router();
const { updateFriends, removeUserFromRequestStatus } = require("../utils/usernetwork");

router.get("/:id", verifyToken, async (req, res) => {
    try {
        const id = req.params['id'];

        // using projection by using select operator to return specific fields in the result;
        const item = await Connection.findOne({ userId : id }).select({ friends : 1, _id : 0 });
        let tempArray = [];

        if(item != null){
            tempArray = item.friends;
        }
        tempArray.push(id);

        const otherUsers = await User.find({ _id : { $nin : tempArray }}).select({ _id : 1, firstname : 1, lastname : 1, isVerified : 1 });
        const requestStatus = await User.findOne({ _id : id }).select({ _id : 0, requestStatus : 1});
        
        return res.status(200).json({ 
            isSuccess : true, 
            message : "Fetched other users successfully", 
            data : { 
                users : otherUsers,
                requests : requestStatus
            } 
        });
    } catch (error) {
        return res.status(500).json({ isSuccess : false, message : error.data, data : [] });
    }
})

router.get("/:id/friends", verifyToken, async(req, res) => {
    try {
        const id = req.params['id'];
        const item = await Connection.findOne({ userId : id }).select({ friends : 1, _id : 0 });
        let friendUsers;

        if(item != null){
            const friends = item.friends;
            friendUsers = await User.find({ _id : { $in : friends } }).select({ _id : 1, firstname : 1, lastname : 1, isOnline: 1, lastActivity: 1 });
        }

        return res.status(200).json({
            isSuccess : true,
            message: "Fetched friends successfully",
            data : friendUsers
        })

    } catch (error) {
        return res.status(500).json({ isSuccess : false, message : error.data, data : [] });
    }
})

router.post("/connect", verifyToken, async (req, res) => {
    try{
        const fromId = req.body['fromId'];
        const toId = req.body['toId'];

        const fromUser = await User.findOne({ _id : fromId });
        const toUser = await User.findOne({ _id : toId });

        if(toUser){
            const fromUserReqStat = { ...fromUser.requestStatus };
            if(!fromUserReqStat["to"]){
                fromUserReqStat["to"] = {};
            }

            fromUserReqStat.to[toId] = 0; // IMPLIES PENDING STATE
            
            await User.updateOne({ _id : fromId }, { requestStatus : fromUserReqStat });

            const toUserReqStat = { ...toUser.requestStatus };

            if(!toUserReqStat["from"]){
                toUserReqStat["from"] = {};
            }

            toUserReqStat.from[fromId] = 0; // IMPLIES PENDING STATE

            await User.updateOne({ _id : toId }, { requestStatus : toUserReqStat });

            return res.status(200).json({ 
                isSuccess : true,
                message: "Sent connection request"
            });
        }

        else{
            return res.status(404).json({ 
                isSuccess : false,
                message: "Unable to find user to send connection request."
            });
        }

        
    } catch(error){
        return res.status(500).json({ 
            isSuccess: false, message : error 
        });
    }
})

router.get("/:id/pending-requests", verifyToken, async(req, res) => {
    try {
        const id = req.params['id'];
        const { requestStatus } = await User.findOne({ _id : id }).select({ _id : 0, requestStatus : 1 });
        let pendingUserIds = [];
        let users = [];

        if(requestStatus.hasOwnProperty("from")){
            pendingUserIds = Object.keys(requestStatus["from"]);
        }

        if(pendingUserIds.length){
            users = await User.find({ _id : { $in : pendingUserIds }}).select({ _id : 1, firstname : 1, lastname : 1, isVerified : 1 });
        }

        return res.status(200).json({
            isSuccess : true,
            message : "",
            data : users
        })

    } catch (error) {
        return res.status(500).json({ isSuccess : false, message : error, data : [] });
    }
})

router.post("/accept", verifyToken, async(req, res) => {
    try {
        const fromId = req.body["fromId"];
        const currentUserId = req.body["userId"];
        const fromFirstName = req.body["fromFirstName"];
        const fromLastName = req.body["fromLastName"];

        const userA = await Connection.findOne({ userId : currentUserId }).select({ friends : 1 });
        const userB = await Connection.findOne({ userId : fromId }).select({ friends : 1 });

        const newUserAconn = new Connection({ userId : currentUserId, friends : [fromId] });
        const newUserBconn = new Connection({ userId : fromId, friends : [currentUserId] });

        const existingRoom = await Room.findOne({ 
            "members.userId": { $all: [ fromId, currentUserId ]}
        });

        const currentUser = await User.findOne({ _id : currentUserId });

        const newRoom = new Room({
            members: [
                { firstname : fromFirstName, lastname : fromLastName, userId : fromId },
                { firstname : currentUser?.firstname, lastname : currentUser?.lastname, userId : currentUserId }
            ],
            metadata: {
                lastmessage: null,
                lasttimestamp: null
            }
        });

        const roomCreationStatus = existingRoom == null ? await newRoom.save() : "Exists";

        if(roomCreationStatus == null)
            throw new Error("Error creating room for current connection");

        const friendAStatus = userA == null ? await newUserAconn.save() : await updateFriends(currentUserId, fromId);
        const friendBStatus = userB == null ? await newUserBconn.save() : await updateFriends(fromId, currentUserId);

        const rmRequestA = friendAStatus == null ? null : await removeUserFromRequestStatus(currentUserId, fromId);
        const rmRequestB = friendBStatus == null ? null : await removeUserFromRequestStatus(fromId, currentUserId);

        if(rmRequestA?.acknowledged && rmRequestB?.acknowledged){
            return res.status(200).json({
                isSuccess : true,
                message : "Added user to your friends list"
            });
        }

        else{
            return res.status(500).json({
                isSuccess : false,
                message : "Error completing request. Please try again"
            })
        }

    } catch (error) {
        return res.status(500).json({ isSuccess : false, message : error.message, data : [] });
    }
})

module.exports = router;