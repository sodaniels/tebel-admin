const express = require("express");

const router = express.Router();

const authApiController = require('../../controllers/v1/auth/AuthApiController');

/**Auth */
// store device information
router.post("/device/information/store", authApiController.postDeviceData);
// send code to user phone  
router.post("/send-code", authApiController.sendCode);
// confirm code
router.post("/confirm-code", authApiController.confirmCode);
// do Login
router.post("/login", authApiController.doLogin);
/**Auth */




module.exports = router;
