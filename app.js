const express = require('express')
const mongoose = require("mongoose");
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');

var salt = bcrypt.genSaltSync(10);

// comparer un mot de passe (pour le verifier)
//bcrypt.compareSync("B4c0/\/", hash); // true

const app = express()
const port = 3001

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 

app.get('/', (req, res) => {
  res.send('Hello World!')
})

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb+srv://toto:toto@test.fv4z6.mongodb.net/test');
}

// Users schema 
const UsersSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    server_id_list: Array,
    server_id_permission_admin: Array
});
// Compile schema
const Users = mongoose.model('users', UsersSchema, 'users');

// Server schema 
const ServersSchema = new mongoose.Schema({
    name: String,
    description: String,
    owner_id: String
    });
// Compile schema
const Servers = mongoose.model('servers', ServersSchema);

// Channel schema 
const ChannelsSchema = new mongoose.Schema({
    server_id: String,
    name: String
});
// Compile schema
const Channels = mongoose.model('channels', ChannelsSchema);

// Message schema 
const MessagesSchema = new mongoose.Schema({
    content: String,
    channel_id: String,
    owner_id: String
});
// Compile schema
const Messages = mongoose.model('messages', MessagesSchema);

// ------------------- USERS --------------------
// Create a User
app.post('/users', async (req, res) => {
    var hash = bcrypt.hashSync(req.body.password, salt);
    const user = new Users(
        {
            username: req.body.username,
            email: req.body.email,
            password: hash,
            server_id_list: [],
            server_id_permission_admin: []
        }
    );
    await user.save();
    res.send(user);
})

// Get All Users
app.get('/users', async (req, res) => {
    const result = await Users.find();
    res.send(result);
})

// Get only One user
app.get('/users/:id', async (req, res) => {
    const result = await Users.find({ _id : req.params.id});
    res.send(result);
})

// ------------------- SERVERS --------------------
// New Server creation
app.post('/servers', async (req, res) => {
    const server = new Servers(
        {
            name: req.body.name,
            description: req.body.description,
            owner_id: req.body.owner_id
        }
    );
    await server.save();
    res.send(server);
})

// Get All Servers
app.get('/servers', async (req, res) => {
    const result = await Servers.find();
    res.send(result);
})

// Get only One server
app.get('/servers/:id', async (req, res) => {
    const result = await Servers.find({ _id : req.params.id});
    res.send(result);
})

// Update ne marche pas, a regarder (creer doublon)
// Update Server creation
app.put('/servers/:id', async (req, res) => {
    const server = await Servers.find({ _id : req.params.id});

    const update = {
        name: req.body.name,
        description: req.body.description
    }

    await server.findOneAndUpdate({ _id : req.params.id}, update, {
        new: true
      });
    res.send(server);
})

// Supression d'un server
app.delete('/servers/:id', async (req, res) => {
    const serverDelete = await Servers.findOneAndDelete({_id: req.params.id});
    res.send(serverDelete);
})

// ------------------- CHANNELS --------------------
// New Channels creation
app.post('/channels', async (req, res) => {
    const channel = new Channels(
        {
            server_id: req.body.server_id,
            name: req.body.name
        }
    );
    await channel.save();
    res.send(channel);
})

// Get All channel
app.get('/channels', async (req, res) => {
    const result = await Channels.find();
    res.send(result);
})

// Get only One channel
app.get('/channels/:id', async (req, res) => {
    const result = await Channels.find({ _id : req.params.id});
    res.send(result);
})

// Update a faire 


// Supression d'un channel
app.delete('/channels/:id', async (req, res) => {
    const channelDelete = await Channels.findOneAndDelete({_id: req.params.id});
    res.send(channelDelete);
})


// ------------------- MESSAGES --------------------
// New Messages creation
app.post('/messages', async (req, res) => {
    const message = new Messages(
        {
            content: req.body.content,
            channel_id: req.body.channel_id,
            owner_id: req.body.owner_id
        }
    );
    await message.save();
    res.send(message);
})

// Get All message
app.get('/messages', async (req, res) => {
    const result = await Messages.find();
    res.send(result);
})

// Get only One message
app.get('/messages/:id', async (req, res) => {
    const result = await Messages.find({ _id : req.params.id});
    res.send(result);
})

// update a faire

// Supression d'un message
app.delete('/messages/:id', async (req, res) => {
    const messageDelete = await Messages.findOneAndDelete({_id: req.params.id});
    res.send(messageDelete);
})


app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})