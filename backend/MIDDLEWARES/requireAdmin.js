function requireAdmin(req, res, next) {
  if (!req.user?.role || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
}
module.exports = requireAdmin