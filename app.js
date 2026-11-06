const express = require("express")
const mongoose = require("mongoose")
const authRoutes = require("./routes/auth")
const bookingRoutes = require("./routes/bookings")
const reportRoutes = require("./routes/reports")
const authMiddleware = require("./middleware/authMiddleware")

const app = express()

app.use(express.json())
app.use(authMiddleware)

app.get("/auth/health", (req, res) => {
    const connected = mongoose.connection.readyState === 1
    return res.status(connected ? 200 : 503).json({
        server: "running",
        database: connected ? "connected" : "disconnected"
    })
})

function requireDatabase(req, res, next) {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ message: "Database not found" })
    }
    return next()
}

app.use("/auth", requireDatabase, authRoutes)
app.use("/bookings", requireDatabase)
app.use("/reports", requireDatabase)
app.use("/bookings", bookingRoutes)
app.use("/reports", reportRoutes)

app.use((req, res) => {
    res.status(404).json({ message: "Not found" })
})

app.use((error, req, res, next) => {
    console.error(error)
    res.status(500).json({ message: "Internal server error" })
})

module.exports = app



