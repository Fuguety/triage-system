const router = require("express").Router();

const authController = require("../controllers/auth.controller");

router.post("/register", authController.registerHospital);
router.post("/login", authController.loginHospital);

module.exports = router;
