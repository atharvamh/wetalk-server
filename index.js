const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const PORT = process.env.PORT;
const app = express();
const httpServer = createServer(app);
const { connectToDatabase } = require("./database/connect");

// route definition
const user = require("./routes/user");
const usernetwork = require("./routes/usernetwork");
const room = require("./routes/room");

const allowedOrigins = ["https://wetalk-jmhc5i3rva-el.a.run.app/","http://localhost:5173"];

// to handle parsing for different request body formats
app.use(express.urlencoded({ extended : false }));
app.use(express.json());
app.use(cors({
    credentials: true,
    origin: function(origin, callback){
        // allow requests with no origin like cURL
        if(!origin) return callback(null, true);

        if(allowedOrigins.indexOf(origin) === -1){
          const msg = 'The CORS policy for this site does not allow access from the specified origin.';
          return callback(new Error(msg), false);
        }

        return callback(null, true);
      }
}))

// routing configuration
app.use("/api/v1/user", user);
app.use("/api/v1/usernetwork", usernetwork);
app.use("/api/v1/room", room);

const io = new Server(httpServer, {
    cors : {
        origin: allowedOrigins
    }
});

app.set("io", io);

io.on("connection",(socket) => {

    // emit acts an event emitter, (eventname, emitData);
    socket.emit("connected", { socketId : socket.id });

    socket.on("join-room", (data) => {
        socket.join(data.room);
    });

    // on acts as an event listener, (eventName, (callback) => {});
    socket.on("send-message-to-room", (data) => {
        io.to(data.roomId).emit("user-message", {
            sender : data.sender, 
            message : data.message,
            timestamp : data.timestamp,
            roomId : data.roomId
        });
    });

    socket.on("user-logout", (data) => {
        io.emit("logout-success", { 
            userId : data.userId,
            event: "LOGOUT",
            timestamp: Date.now()
        });
    })

    socket.on("user-login", (data) => {
        io.emit("login-success", {
            userId : data.userId,
            event: "LOGIN",
            timestamp: Date.now()
        })
    })
})

httpServer.listen(PORT, () => {
    console.log(`\nServer started on port : ${PORT}\n`);
    connectToDatabase();
});
