const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({

	partnerId: {
		type: String,
		required: false,
	},
	userId: {
		type: String,
		required: false,
	},
	adminId: {
		type: String,
		required: false,
	},
	firstName: {
		type: String,
		required: false,
		trim: true,
	},
	middleName: {
		type: String,
		required: false,
		trim: true,
	},
	lastName: {
		type: String,
		required: false,
		trim: true,
	},
	phoneNumber: {
		type: String,
		required: false,
		trim: true,
	},
	role: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: false,
		trim: true,
	},
	region: {
		type: String,
		required: false,
	},
	district: {
		type: String,
		required: false,
	},
	assembly: {
		type: String,
		required: false,
	},
	paymentMode: {
		type: String,
		required: false,
	},
	city: {
		type: String,
		required: false,
	},
	password: {
		type: String,
		required: false,
	},

	permissions: {
		type: Object,
		required: false,
	},
	idType: {
		type: String,
		required: false,
	},
	idNumber: {
		type: String,
		required: false,
	},
	idExpiryDate: {
		type: String,
		required: false,
	},
	idPhoto: {
		type: String,
		required: false,
	},
	location: {
		type: Object,
		required: false,
	},
	preferredPayment: {
		type: Object,
		required: false,
	},

	businessName: {
		type: String,
		required: false,
		trim: true,
	},
	certificateOfIncorporation: {
		type: String,
		required: false,
	},
	certificateOfCommenseBusiness: {
		type: String,
		required: false,
	},
	c1_fullname: {
		type: String,
		required: false,
		trim: true,
	},
	c1_phoneNumber: {
		type: String,
		required: false,
		trim: true,
	},
	c1_email: {
		type: String,
		required: false,
		trim: true,
	},
	c2_fullname: {
		type: String,
		required: false,
		trim: true,
	},
	c2_phoneNumber: {
		type: String,
		required: false,
		trim: true,
	},
	c2_email: {
		type: String,
		required: false,
		trim: true,
	},

	read: {
		type: Number,
		required: false,
		default: 0,
	},
	status: {
		type: String,
		enum: ["Active", "Inactive", "Blocked"],
		default: "Active",
	},
	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Admin'
	},
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
