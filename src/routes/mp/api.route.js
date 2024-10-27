const express = require("express");

const router = express.Router();

const apiController = require('../../controllers/v1/auth/ApiController');
const validator = require('../../helpers/validator');

router.get("/team/jobs", apiController.getTeamJobs);
// qr code reader
router.post("/commit-pickup", apiController.postCommitPickup);
// get totals of jobs
router.get("/jobs-count", apiController.getJobsCount);
// post onboarding data
router.post("/onboarding", validator.validateOnboarding, apiController.postOnboarding);


module.exports = router;
