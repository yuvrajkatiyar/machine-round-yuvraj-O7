const jwt = require("jsonwebtoken")

function authMiddleware(req, res, next) {
    if (req.path === "/auth" || req.path.startsWith("/auth/")) {
        return next()
    }

    const authorization = req.get("authorization")
    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required" })
    }

    const token = authorization.slice("Bearer ".length)
    if (!token) {
        return res.status(401).json({ message: "Authentication required" })
    }

    try {
        const payload = jwt.verify(token, process.env.JWT)
        if (typeof payload !== "object" || !payload.sub || !payload.role) {
            return res.status(401).json({ message: "Invalid or expired token" })
        }

        req.user = { id: payload.sub, role: payload.role }
        return next()
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: "Invalid or expired token" })
        }
        return next(error)
    }
}

module.exports = authMiddleware
