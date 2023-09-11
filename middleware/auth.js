const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const token = req.headers["x-access-token"];
    if(!token){
        return res.status(403).json({ message : "A token is required for authentication" });
    }

    try{
        const decodedToken = jwt.verify(token, process.env.TOKEN_KEY);
        req.user = decodedToken;
    } catch(err){
        return res.status(401).json({ message : "Invalid token" });
    }

    return next();
}

module.exports = verifyToken;