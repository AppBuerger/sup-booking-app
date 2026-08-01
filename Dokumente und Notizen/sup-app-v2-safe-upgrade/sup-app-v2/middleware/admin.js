function checkAdmin(req, res, next) {
  const adminKey = req.headers["x-admin-key"];

  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({
      error: "ADMIN_KEY ist am Server nicht gesetzt.",
    });
  }

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({
      error: "Nicht autorisiert.",
    });
  }

  next();
}

module.exports = {
  checkAdmin,
};
