const usersCollection = require('../db').db().collection("users")
const followsCollection = require('../db').db().collection("follows")
const ObjectID = require("mongodb").ObjectID
const User = require('./User')

let Follow = function (followedUsername, authorId) {
	this.followedUsername = followedUsername
	this.authorId = authorId
	this.errors = []
}

Follow.prototype.cleanUp = async function () {
	if(typeof(this.followedUsername) != "string") {
		this.followedUsername = ""
	}
}

Follow.prototype.validate = async function (action) {
	// followed username must exist in DB
	let followedAccount = await usersCollection.findOne({username: this.followedUsername})
	if (followedAccount) {
		this.followedId = followedAccount._id
	} else {
		this.errors.push("You can not follow a user that does not exist")
	}
	let doesFollowingAlreadyExist = await followsCollection.findOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
	if (action == "create") {
		if (doesFollowingAlreadyExist) {
			this.errors.push("You are already following this User!")
		}
	}
	if (action == "delete") {
		if (!doesFollowingAlreadyExist) {
			this.errors.push("You cannot stop following someone you do not already follow!")
		}
	}
	// should not be able to follow yourself 
	if(this.followedId.equals(this.authorId)) {
		this.errors.push("You cannot follow yourself, silly! ")
	}
}

Follow.prototype.create = function() {
	return new Promise(async (resolve, reject) => {
		this.cleanUp()
		await this.validate("create")
		if (!this.errors.length) {
			await followsCollection.insertOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
			resolve()
		} else {
			reject(this.errors)
		}
	})
}

Follow.prototype.delete = function() {
	return new Promise(async (resolve, reject) => {
		this.cleanUp()
		await this.validate("delete")
		if (!this.errors.length) {
			await followsCollection.deleteOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
			resolve()
		} else {
			reject(this.errors)
		}
	})
}

Follow.isVisitorFollowing = async function (followedId, visitorId) {
	let followDoc = await followsCollection.findOne({followedId: followedId, authorId: new ObjectID(visitorId)})
	if (followDoc) {
		return true
	} else {
		return false
	}
}

Follow.getFollowersById = function (id) {
	return new Promise(async (resolve, reject) => {
		try {
			let followers = await followsCollection.aggregate([
				{$match: {followedId: id}},
				{$lookup: {from: "users", localField: "authorId", foreignField: "_id", as: "userDoc"}},
				{$project: {
					username: {$arrayElemAt: ["$userDoc.username", 0]},
					email: {$arrayElemAt: ["$userDoc.email", 0]}
				}}
			]).toArray()
			follower = followers.map(function (follower) {
				// create a user
				let user = new User(follower, true)
				return {username: follower.username, avatar: user.avatar}
			})
			resolve(followers)
		} catch (err) {
			reject(err)
		}
	})
}

Follow.getFollowingById = function (id) {
	return new Promise(async (resolve, reject) => {
		try {
			let followers = await followsCollection.aggregate([
				{$match: {authorId: id}},
				{$lookup: {from: "users", localField: "followedId", foreignField: "_id", as: "userDoc"}},
				{$project: {
					username: {$arrayElemAt: ["$userDoc.username", 0]},
					email: {$arrayElemAt: ["$userDoc.email", 0]}
				}}
			]).toArray()
			follower = followers.map(function (follower) {
				// create a user
				let user = new User(follower, true)
				return {username: follower.username, avatar: user.avatar}
			})
			resolve(followers)
		} catch (err) {
			reject(err)
		}
	})
}

Follow.countFollowersById = function(id) {
  return new Promise(async (resolve, reject) => {
    let followerCount = await followsCollection.countDocuments({followedId: id})
    resolve(followerCount)
  })
}

Follow.countFollowingById = function(id) {
  return new Promise(async (resolve, reject) => {
    let count = await followsCollection.countDocuments({authorId: id})
    resolve(count)
  })
}

module.exports = Follow