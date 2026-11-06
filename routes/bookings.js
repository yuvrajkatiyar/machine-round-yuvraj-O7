const express = require("express")
const mongoose = require("mongoose")
const Booking = require("../models/booking")

const router = express.Router()
const editableFields = ["origin", "destination", "travelClass", "distanceKm", "passengerCount"]
const allowedFields = new Set(editableFields)

function isValidBookingInput(input, partial = false) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return false
    }

    const keys = Object.keys(input)
    if (keys.some((key) => !allowedFields.has(key)) || (!partial && editableFields.some((key) => !keys.includes(key)))) {
        return false
    }

    if (keys.includes("origin") && (typeof input.origin !== "string" || !input.origin.trim())) {
        return false
    }
    if (keys.includes("destination") && (typeof input.destination !== "string" || !input.destination.trim())) {
        return false
    }
    if (keys.includes("travelClass") && (typeof input.travelClass !== "string" || !input.travelClass.trim())) {
        return false
    }
    if (keys.includes("distanceKm") && (
        typeof input.distanceKm !== "number" ||
        !Number.isFinite(input.distanceKm) ||
        input.distanceKm < 0.1
    )) {
        return false
    }
    if (keys.includes("passengerCount") && (
        !Number.isInteger(input.passengerCount) ||
        input.passengerCount < 1 ||
        input.passengerCount > 8
    )) {
        return false
    }

    return partial ? keys.length > 0 : true
}

function calculateFare(distanceKm, passengerCount) {
    const baseFarePerPassenger = 50
    const farePerKmPerPassenger = 12.5
    return Math.round((baseFarePerPassenger + distanceKm * farePerKmPerPassenger) * passengerCount * 100) / 100
}

function bookingAccessFilter(req) {
    return req.user.role === "admin" ? {} : { passenger: req.user.id }
}

router.post("/", async (req, res, next) => {
    if (!isValidBookingInput(req.body)) {
        return res.status(400).json({
            message: "Provide origin, destination, travelClass, distanceKm (at least 0.1), and passengerCount (1-8)"
        })
    }

    try {
        const booking = await Booking.create({
            ...req.body,
            origin: req.body.origin.trim(),
            destination: req.body.destination.trim(),
            travelClass: req.body.travelClass.trim(),
            passenger: req.user.id,
            fare: calculateFare(req.body.distanceKm, req.body.passengerCount)
        })
        return res.status(201).json(booking)
    } catch (error) {
        return next(error)
    }
})

router.get("/", async (req, res, next) => {
    const page = req.query.page === undefined ? 1 : Number(req.query.page)
    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit)
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ message: "page must be positive and limit must be between 1 and 100" })
    }

    try {
        const filter = bookingAccessFilter(req)
        const [bookings, total] = await Promise.all([
            Booking.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
            Booking.countDocuments(filter)
        ])
        return res.json({
            bookings,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        return next(error)
    }
})

router.get("/:id", async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid booking id" })
    }

    try {
        const booking = await Booking.findOne({
            _id: req.params.id,
            ...bookingAccessFilter(req)
        })
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" })
        }
        return res.json(booking)
    } catch (error) {
        return next(error)
    }
})

router.put("/:id", async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid booking id" })
    }
    if (!isValidBookingInput(req.body, true)) {
        return res.status(400).json({
            message: "Provide one or more valid booking fields: origin, destination, travelClass, distanceKm (at least 0.1), passengerCount (1-8)"
        })
    }

    try {
        const filter = { _id: req.params.id, ...bookingAccessFilter(req) }
        const booking = await Booking.findOne(filter)
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" })
        }

        for (const field of Object.keys(req.body)) {
            booking[field] = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field]
        }
        booking.fare = calculateFare(booking.distanceKm, booking.passengerCount)
        await booking.save()
        return res.json(booking)
    } catch (error) {
        return next(error)
    }
})

router.delete("/:id", async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid booking id" })
    }

    try {
        const booking = await Booking.findOneAndDelete({
            _id: req.params.id,
            ...bookingAccessFilter(req)
        })
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" })
        }
        return res.status(204).end()
    } catch (error) {
        return next(error)
    }
})

module.exports = router
