const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/user")

const router = express.Router()
const allowedRoles = new Set(["passenger", "admin"])

router.post("/register", async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body ?? {}
        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
            typeof password !== "string" ||
            !password ||
            !allowedRoles.has(role)
        ) {
            return res.status(400).json({
                message: "Provide a name, valid email, password, and role (passenger or admin)"
            })
        }

        const normalizedEmail = email.trim().toLowerCase()
        const existingUser = await User.findOne({ email: normalizedEmail })
        if (existingUser) {
            return res.status(409).json({ message: "Email is already registered" })
        }

        const hashedPassword = await bcrypt.hash(password, 12)
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role
        })

        return res.status(201).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        })
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: "Email is already registered" })
        }
        return next(error)
    }
})

router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body ?? {}
        if (typeof email !== "string" || typeof password !== "string" || !password) {
            return res.status(400).json({ message: "Provide an email and password" })
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password")
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid email or password" })
        }

        const token = jwt.sign(
            { role: user.role },
            process.env.JWT,
            { subject: user.id, expiresIn: "1h" }
        )
        return res.json({ token })
    } catch (error) {
        return next(error)
    }
})

module.exports = router
