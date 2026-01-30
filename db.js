const mongoose = require("mongoose")

const connectDB = async () =>{
    try{
        await mongoose.connect(process.env.MONGOOSE)
        console.log("Mongo db conneted to praju db")
    }catch (error) {
        console.log("DB connection error", error)
    }
}

module.exports = connectDB ;