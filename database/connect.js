const mongoose = require("mongoose");
const connectionURI = `mongodb+srv://${process.env.MONGOUSER}:${process.env.MONGOPASS}@cluster0.yukt1se.mongodb.net/?retryWrites=true&w=majority`;

async function connectToDatabase(){
    await mongoose.connect(connectionURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then((response) =>
        console.log(`MongoDB connected at host : ${response.connections[0].host}`)
    ).catch((error) => {
        console.log("Failed connecting to database.");
        console.error(error);
    });
}

module.exports = { connectToDatabase };