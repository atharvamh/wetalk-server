const Connection = require("../database/models/connections");
const User = require("../database/models/user");

async function updateFriends(uid, friendId){
    try{
        return await Connection.updateOne({ userId : uid }, { $addToSet : { friends : friendId } });
    } catch(error){
        return error;
    }
}

async function removeUserFromRequestStatus(userId, removeId){
    try {
        return await User.updateOne({ _id: userId }, 
            { $unset: { [`requestStatus.from.${removeId}`]: "", [`requestStatus.to.${removeId}`]: "" }
        });
    } catch (error) {
        return error;
    }
}

module.exports = { updateFriends, removeUserFromRequestStatus };