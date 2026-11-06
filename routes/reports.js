const express = require("express")
const Booking = require("../models/booking")

const router = express.Router()

function bookingAccessFilter(req) {
    return req.user.role === "admin" ? {} : { passenger: req.user.id }
}

router.get("/class/:travelClass", async (req, res, next) => {
    const travelClass = req.params.travelClass.trim()
    if (!travelClass) {
        return res.status(400).json({ message: "Travel class must not be empty" })
    }

    try {
        const [result] = await Booking.aggregate([
            { $match: { ...bookingAccessFilter(req), travelClass } },
            {
                $group: {
                    _id: "$travelClass",
                    totalBookings: { $sum: 1 },
                    totalFare: { $sum: "$fare" }
                }
            },
            { $project: { _id: 0, travelClass: "$_id", totalBookings: 1, totalFare: 1 } }
        ])
        return res.json(result || { travelClass, totalBookings: 0, totalFare: 0 })
    } catch (error) {
        return next(error)
    }
})

router.get("/fare-over/:amount", async (req, res, next) => {
    const amount = Number(req.params.amount)
    if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ message: "Amount must be a non-negative number" })
    }

    try {
        const bookings = await Booking.find({
            ...bookingAccessFilter(req),
            fare: { $gt: amount }
        }).sort({ createdAt: -1 })
        return res.json({
            amount,
            bookings: bookings.map((booking) => ({
                ...booking.toObject(),
                finalFare: booking.fare
            }))
        })
    } catch (error) {
        return next(error)
    }
})

router.get("/daily-summary", async (req, res, next) => {
    try {
        const summary = await Booking.aggregate([
            { $match: bookingAccessFilter(req) },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                            timezone: "UTC"
                        }
                    },
                    totalBookings: { $sum: 1 },
                    totalRevenue: { $sum: "$fare" },
                    averageFare: { $avg: "$fare" }
                }
            },
            {
                $project: {
                    _id: 0,
                    day: "$_id",
                    totalBookings: 1,
                    totalRevenue: 1,
                    averageFare: { $round: ["$averageFare", 2] }
                }
            },
            { $sort: { day: 1 } }
        ])
        return res.json({ days: summary })
    } catch (error) {
        return next(error)
    }
})

module.exports = router



