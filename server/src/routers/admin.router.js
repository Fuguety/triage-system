const router = require("express").Router();

const adminController = require("../controllers/admin.controller");
const { requireHospitalAccess } = require("../middlewares/auth.middleware");

router.use(requireHospitalAccess);

router.get("/queue", adminController.getQueue);
router.get("/queue/:sessionId", adminController.getQueuePatient);
router.get("/audit", adminController.getAuditLog);
router.patch("/queue/:sessionId", adminController.updateQueuePatient);
router.post("/queue/:sessionId/assess", adminController.startAssessingPatient);
router.post("/queue/:sessionId/complete", adminController.completeQueuePatient);
router.post("/queue/:sessionId/reject", adminController.rejectQueuePatient);

module.exports = router;
