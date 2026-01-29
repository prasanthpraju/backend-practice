const mongoose = require("mongoose")

const connectDB = async () =>{
    try{
        await mongoose.connect("mongodb://127.0.0.1:27017/praju")
        console.log("Mongo db conneted to praju db")
    }catch (error) {
        console.log("DB connection error", error)
    }
}

module.exports = connectDB ;