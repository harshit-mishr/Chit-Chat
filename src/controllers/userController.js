import User from "../models/userModel.js";
import Posts from "../models/postModel.js";
import { uploadToCloudinary } from "../utility/cloudinary.js";
import {
	comparePassword,
	createHashedPassword,
} from "../utility/hashedPassword.js";
import { buildQueryObject } from "../utility/dbQueryHelper.js";
import { getPaginatedResults } from "../utility/getPaginatedResult.js";

async function getUserData(req, res) {
	try {
		const { id } = req.user;
		const user = await User.findById(id).select("-password -otp -otp_expiry");
		res.status(200).json(user);
	} catch (error) {
		res.status(500).json({ message: "Internal server error" });
	}
}

async function updateUserData(req, res) {
	try {
		console.log(req.body);
		const { id } = req.user;
		const avatarLocalPath = req.file?.path;
		console.log("avatarLocalPath", avatarLocalPath);

		if (avatarLocalPath) {
			const cloudinaryResponse = await uploadToCloudinary(avatarLocalPath);
			const { url, public_id } = cloudinaryResponse;
			console.log("url", url);
			req.body.profilePicture = url;
		}

		const user = await User.findByIdAndUpdate(id, req.body, {
			new: true,
		}).select("-password -otp -otp_expiry");
		console.log("user", user);
		res.status(200).json(user);
	} catch (error) {
		res.status(500).json({ message: "Internal server error" });
	}
}

async function updateUserPassword(req, res) {
	try {
		const { id } = req.user;
		const user = await User.findById(id);

		const { currentPassword, newPassword, confirmNewPassword } = req.body;

		const match = await comparePassword(currentPassword, user.password);
		if (!match) {
			return res.status(401).json({ message: "Invalid current password" });
		}

		if (newPassword !== confirmNewPassword) {
			return res.status(400).json({
				message: "New password and confirm new password do not match",
			});
		}

		user.password = await createHashedPassword(newPassword);
		await user.save();
		res.status(200).json({ message: "Password Updated Successfully" });
	} catch (error) {
		res.status(500).json({ message: "Internal server error" });
	}
}

async function getMyPosts(req, res) {
	try {
		const { id } = req.user;
		if (!id) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const { page, limit, filterObject } = buildQueryObject(req);

		filterObject.author = id; //add filter for author

		const populateOptions = [
			{
				path: "author",
				select: "-password -otp -otp_expiry",
			},
		];

		const selectFields = ""; // Add the fields you want to select from the Posts model

		const posts = await getPaginatedResults(
			Posts,
			filterObject,
			page,
			limit,
			populateOptions,
			selectFields,
		);

		res.status(200).json(posts);
	} catch (error) {
		res.status(500).json({ message: "Internal server error" });
	}
}

export { getUserData, updateUserData, updateUserPassword, getMyPosts };
