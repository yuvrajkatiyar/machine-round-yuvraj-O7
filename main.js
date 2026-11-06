require("dotenv").config()

const mongoose = require("mongoose")
const app = require("./app")

const { MONGO_URI, JWT } = process.env
if (!JWT) {
    throw new Error("JWT must be set")
}

const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)

    if (!MONGO_URI) {
        console.error("MongoDB is unavailable: MONGO_URI must be set")
        return
    }

    mongoose.connect(MONGO_URI)
        .then(() => {
            console.log("Connected to MongoDB")
        })
        .catch((error) => {
            console.error(`MongoDB connection failed: ${error.message}`)
        })
})
    
