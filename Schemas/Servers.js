const mongoose = require("mongoose");

const ServersSchema = new mongoose.Schema({
    name: String,
    description: String,
    owner_id: String,
    subscriber_id_list : Array
    });
// Compile schema
//const Servers = mongoose.model('servers', ServersSchema);

module.exports = Servers = mongoose.model('servers', ServersSchema);