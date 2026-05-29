const router = require("express").Router();


const triageController = require("../controllers/triage.controller");

router.post("/start", triageController.startTriage);
router.post("/answer", triageController.answerQuestion);
router.post("/back", triageController.goBackQuestion);
router.get("/queue", triageController.getQueue);

module.exports = router;


