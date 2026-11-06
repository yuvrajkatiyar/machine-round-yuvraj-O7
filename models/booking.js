const mongoose = require("mongoose")

const bookingSchema = new mongoose.Schema(
    {
        passenger: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        origin: {
            type: String,
            required: true,
            trim: true
        },
        destination: {
            type: String,
            required: true,
            trim: true
        },
        travelClass: {
            type: String,
            required: true,
            trim: true
        },
        distanceKm: {
            type: Number,
            required: true,
            min: 0.1
        },
        passengerCount: {
            type: Number,
            required: true,
            min: 1,
            max: 8,
            validate: Number.isInteger
        },
        fare: {
            type: Number,
            required: true,
            min: 0
        },
        currency: {
            type: String,
            enum: ["INR"],
            default: "INR",
            required: true
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model("Booking", bookingSchema)
