const mongoose = require("mongoose");

const UsersSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    server_permission_id_list : Array
});

module.exports = Users = mongoose.model('users', UsersSchema, 'users');