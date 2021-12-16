const mongoose = require("mongoose");

const MessagesSchema = new mongoose.Schema({
    content: String,
    username: String,
    channel_id: String,
    owner_id: String
});
// Compile schema
//const Messages = mongoose.model('messages', MessagesSchema);

module.exports = Messages = mongoose.model('messages', MessagesSchema);