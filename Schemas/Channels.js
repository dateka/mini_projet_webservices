const mongoose = require("mongoose");

const ChannelsSchema = new mongoose.Schema({
    server_id: String,
    name: String
});
// Compile schema
//const Channels = mongoose.model('channels', ChannelsSchema)

module.exports = Channels = mongoose.model('channels', ChannelsSchema);