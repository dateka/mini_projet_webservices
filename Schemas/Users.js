const mongoose = require("mongoose");

const UsersSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
});

module.exports = Users = mongoose.model('users', UsersSchema, 'users');