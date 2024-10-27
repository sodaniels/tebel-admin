const jwt = require("jsonwebtoken");
const axios = require("axios");
const { validationResult } = require("express-validator");

const Device = require("../../../models/device");
const Person = require("../../../models/person.model");
const Team = require("../../../models/team.model");
const AssignedJob = require("../../../models/assign-job.model");
const { Log } = require('../../../helpers/Log');

const {
    getRedis,
    setRedis,
    removeRedis,
    setRedisWithExpiry,
} = require("../../../helpers/redis");
const { sendText } = require('../../../helpers/sendText');
const { randId } = require('../../../helpers/randId');

// store device information
async function postDeviceData(req, res) {
    var datetime = new Date();
    const date = datetime.toISOString();

    const device = new Device({
        date: date,
        uuid: req.body.uuid,
        model: req.body.model,
        osVersion: req.body.osVersion,
        sdkVersion: req.body.sdkVersion,
        deviceType: req.body.deviceType,
        os: req.body.os,
        language: req.body.language,
        manufacturer: req.body.manufacturer,
        region: req.body.region,
    });

    device
        .save()
        .then((result) => {
            res.status(201).json({ success: true, message: "DEVICE_SAVED" });
        })
        .catch((err) => {
            return res
                .status(403)
                .json({ success: false, message: "ERROR_OCCURRED" });
        });
}
// send code
async function sendCode(req, res) {
    Log.info(
        `[ApiController.js][sendCode][${req.body.phoneNumber}] \t ****** sending sms `
    );

    const q = req.body.phoneNumber.substr(-9);
    let user = await Person.findOne({ phoneNumber: { $regex: q, $options: "i" } });

    /**user not found */
    if (!user) {
        return res.status(200).json({
            success: false,
            message: "USER_NOT_FOUND",
        });
    }
    /**user not active */
    if (user && user.status !== 'Active') {
        return res.status(200).json({
            success: false,
            message: "USER_NOT_ACTIVE",
        });
    }

    const pin = randId();
    const redisKey = `otp_token_${q}`;
    let message;

    await setRedis(redisKey, pin);

    try {
        message = `Your OTP for Tebel app is: ${pin} and expires in 5 minutes. Keey your account safe. Do not share your on-time access code with anyone.`;

        const response = await sendText( req.body.phoneNumber, message);
        Log.info(
            `[ApiController.js][sendCode][${req.body.phoneNumber}][${pin}][${message}] \t `
        );
        if (response) {
            return res.status(200).json({
                success: true,
                message: "SMS_SENT",
            });
        }
    } catch (error) {
        Log.info(
            `[ApiController.js][sendCode][${req.body.phoneNumber}] \t error sending sms: ${error}`
        );
    }

    return response.status(200).json({
        success: false,
        message: "ERROR",
    });
}
// confirm code
async function confirmCode(req, res) {
    Log.info(
        `[ApiController.js][confirmCode][${req.body.phoneNumber}] \t ****** initiate confirm code  `
    );

    const q = req.body.phoneNumber.substr(-9);

    const redisCode = await getRedis(`otp_token_${q}`);

    if (!redisCode) {
        return {
            success: false,
            message: "CODE_EXPIRED",
        };
    }

    if (redisCode.toString() === req.body.code.toString()) {
        // remove redis code after verification
        await removeRedis(`otp_token_${q}`);

        return {
            success: true,
            message: "SUCCESS",
        };
    }

    Log.info(
        `[ApiController.js][confirmCode][${req.body.phoneNumber}]${req.body.code}]\t .. wrong code`
    );
    return {
        success: false,
        message: "WRONG_CODE",
    };
}
// do login
async function doLogin(req, res) {
    Log.info(
        `[ApiController.js][doLogin][${req.body.phoneNumber}] \t ****** initiating login ...  `
    );

    // confirm code
    try {
        const login_response = await confirmCode(req, res);
        if (login_response) {
            if (login_response.success) {
                Log.info(
                    `[ApiController.js][doLogin][${req.body.phoneNumber}] \t ****** code confirmation successful ...proceed to login  `
                );
                const login = await processUser(login_response, req);
                if (login.success) {
                    console.log('user: ' + JSON.stringify(login));
                    return res.status(200).json(login);
                }
                return res.status(200).json({
                    success: false,
                    message: "ERROR_OCCURRED",
                });

            }
            return res.status(200).json({
                success: false,
                message: "WRONG_CODE",
            });
        }
        return res.status(200).json(login_response);
    } catch (error) {
        Log.info(
            `[ApiController.js][doLogin][${req.body.phoneNumber}] \t ****** login error  ...  ${error}`
        );
        return res.status(200).json({
            success: false,
            message: "ERROR_OCCURRED",
        });
    }

}

async function processUser(login_response, req) {
    const q = req.body.phoneNumber.substr(-9);
    let user = await Person.findOne({ phoneNumber: { $regex: q, $options: "i" } });

    if (user) {
        login_response['user_id'] = user._id;
        login_response['firstName'] = user.firstName;
        login_response['middleName'] = user.middleName;
        login_response['lastName'] = user.lastName;
        login_response['phoneNumber'] = user.phoneNumber;
        login_response['type'] = user.category;
        login_response['email'] = user.email;
        login_response["token"] = await createToken(user._id);
        return login_response;
    } else {
        console.log("User not created");
        return false;
    }
}

async function createToken(_id) {
    const jwtSecret = process.env.JWT_TOKEN;
    const expiresIn = process.env.EXPIRES_IN;

    const acccess_token = jwt.sign({ _id }, jwtSecret, {
        expiresIn,
        issuer: process.env.APP_NAME,
    });
    return { acccess_token, expiresIn };
}



module.exports = {
    postDeviceData,
    sendCode,
    confirmCode,
    doLogin,
}