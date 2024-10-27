const jwt = require("jsonwebtoken");
const axios = require("axios");
const mongoose = require("mongoose");
const qrCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const { Hash } = require('../../../helpers/hash');
const { validationResult } = require("express-validator");
const { sendText } = require('../../../helpers/sendText');
const Person = require("../../../models/person.model");
const User = require('../../../models/user');
const Team = require("../../../models/team.model");
const Dustbin = require("../../../models/dustbin");
const AssignJob = require("../../../models/assign-job.model");
const CompletedJob = require("../../../models/completed-job.model");
const { Log } = require('../../../helpers/Log');
const ObjectId = mongoose.Types.ObjectId;




async function getTeamJobs(req, res) {

    try {
        const team = await Team.findOne({ supervisor: req.user._id }).populate('collectors');
        const teamId = new ObjectId(team._id);

        if (team) {
            try {
                const jobs = await AssignJob.find({ team: { $in: [teamId] } }).populate('job').populate('createdBy');
                const countCompleted = await CompletedJob.countDocuments({ team: teamId });
                if (jobs.length > 0) {
                    const jobsArray = jobs.map(jobItem => jobItem.job);
                    const mergedJobsArray = jobsArray.flat();
                    // console.log("mergedJobsArray: " + JSON.stringify(mergedJobsArray));
                    return res.status(200).json({
                        team: team,
                        job: mergedJobsArray,
                        countCompleted: countCompleted,
                        createdAt: jobs[0].createdAt
                    });
                } else {
                    return res.status(200).json([]);
                }

            } catch (error) {
                Log.error(
                    "[transactionsService.js][transactionsService]..error retrieving jobs",
                    error
                );
                return res.status(500).json([]);

            }

        }


    } catch (error) {
        Log.error(
            "[transactionsService.js][transactionsService]..error retrieving team",
            error
        );
        return [];
    }
}

async function postCommitPickup(req, res) {
    let jobData, updateAssignJob, completedJobs, completedData, countCompleted, dustbin;
    try {

        Log.info("req body: " + JSON.stringify(req.body));

        dustbin = await Dustbin.findOneAndUpdate(
            { barcode: req.body.qrcode },
            { $set: { status: 'PICKED', pickedBy: req.body.teamId } },
            { new: true, useFindAndModify: false, upsert: false }
        ).populate('owner', '-password');

        // console.log(JSON.stringify(dustbin));


        if (dustbin) {

            try {
                updateAssignJob = await AssignJob.findOneAndUpdate(
                    { job: dustbin._id },
                    { $pull: { job: dustbin._id } },
                    { new: true }
                );
                Log.info("updateAssignJob :" + JSON.stringify(updateAssignJob))
            } catch (error) {
                Log.info("updateAssignJob error :" + JSON.stringify(error))
            }

            try {
                completedData = new CompletedJob({
                    job: dustbin._id,
                    team: req.body.teamId,
                    assignedStatus: "Completed",
                });
            } catch (error) {
                Log.info("completedData error: " + JSON.stringify(error));
            }

            // store job to completed collection
            const storeCompleted = await completedData.save();

            // remove completed job from AssignJob collection
            if (storeCompleted) {
                try {
                    updateAssignJob = await AssignJob.findOneAndUpdate(
                        { job: dustbin._id },
                        { $pull: { job: dustbin._id } },
                        { new: true }
                    );
                    Log.info("updateAssignJob error :" + JSON.stringify(updateAssignJob))
                } catch (error) {
                    Log.info("updateAssignJob error :" + JSON.stringify(error))
                }
            }

            if (updateAssignJob) {
                // notify owner of picked dusbin.
                try {
                    const message = `Your dustbin with the ID: ${dustbin.barcode} has been picked up.`;
                    // await sendText(dustbin.owner.phoneNumber, message);
                } catch (error) {

                }

                try {
                    const team = await Team.findOne({ supervisor: req.user._id }).populate('collectors');
                    const teamId = new ObjectId(team._id);

                    if (team) {
                        try {
                            // get assigned jobs
                            const jobs = await AssignJob.find({ team: { $in: [teamId] } }).populate('job').populate('createdBy');
                            // countActive = await AssignJob.countDocuments({ team: { $in: [teamId] }});

                            if (jobs.length > 0) {
                                jobData = jobs[0].job;
                            } else {
                                jobData = [];
                            }
                            //get completed jobs
                            const completed_Jobs = await CompletedJob.find({ team: req.body.teamId }).populate('job');
                            countCompleted = await CompletedJob.countDocuments({ team: req.body.teamId });

                            if (completed_Jobs.length > 0) {
                                completedJobs = completed_Jobs;
                            } else {
                                completedJobs = [];
                            }

                        } catch (error) {
                            Log.error(
                                "[transactionsService.js][transactionsService]..error retrieving jobs",
                                error
                            );

                        }

                    }
                } catch (error) {
                    Log.error(
                        "[transactionsService.js][transactionsService]..error retrieving team",
                        error
                    );
                }

                return res.status(200).json({
                    success: true,
                    message: 'Job marked as picked successfully',
                    job: jobData,
                    completed_Jobs: completedJobs,
                    countCompleted: countCompleted,
                    // countActive: countActive
                });
            } else {
                return res.status(200).json({
                    success: false,
                    message: "Error updating job"
                });
            }

        }
        return res.status(400).json({
            success: false,
            message: 'An error has occurred'
        })

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'An error has occurred',
            error: error,
        })
    }


    // const jobs = await AssignJob.find({ job: { $in: [teamId] } });

}

async function getJobsCount(req, res) {
    const activeJobs = await AssignJob.countDocuments({ team: { $in: [req.query.teamId] } }).populate('job').populate('createdBy');
    const completedJobs = await CompletedJob.countDocuments({ team: req.query.teamId });

    return res.status(200).json({
        success: true,
        jobTotals: {
            Active: activeJobs ? activeJobs : 0,
            Completed: completedJobs ? completedJobs : 0
        }

    });
}

async function postOnboarding(req, res) {
    const errors = validationResult(req);
    const userId = uuidv4();

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const q = req.body.phoneNumber.slice(-9);

    const check = await User.findOne({
        phoneNumber: { $regex: q, $options: "i" },
    });

    if (check) {
        return res.status(209).json({
            success: false,
            code: 209,
            message: "USER_EXISTS"
        });
    }


    try {
        const currentTimeStamp = new Date().getTime();
        const passwd = await Hash(currentTimeStamp.toString());


        const newUser = new User({
            userId: userId,
            adminId: req.body.user_id,
            firstName: req.body.firstName,
            middleName: req.body.middleName,
            lastName: req.body.lastName,
            role: "Subscriber",
            phoneNumber: req.body.phoneNumber,
            email: req.body.email,
            region: req.body.region,
            district: req.body.district,
            assembly: req.body.district,
            city: req.body.district,
            paymentMode: req.body.payment,
            idType: req.body.idType,
            idNumber: req.body.idNumber,
            idExpiryDate: req.body.idExpiryDate,
            location: req.body.location,
            password: passwd,
            read: 1,
            createdBy: req.body.user_id,
        });

        const savedCustomer = await newUser.save();

        if (savedCustomer) {
            return res.status(200).json({
                success: true,
                code: 200,
                message: "SUCCCESS",
                user_id: userId
            })
        } else {
            return res.status(400).json({
                success: false,
                code: 400,
                message: "FAILED"
            })
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            code: 500,
            message: "ERROR_OCCURRED",
            error: error,
        })
    }

}


module.exports = {
    getTeamJobs,
    postCommitPickup,
    getJobsCount,
    postOnboarding,
}