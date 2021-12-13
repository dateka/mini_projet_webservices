const Users = require("./Schemas/Users")
const Servers = require("./Schemas/Servers")
const Channels = require("./Schemas/Channels")
const Messages = require("./Schemas/Messages")
require('dotenv').config()
const express = require('express')
const mongoose = require("mongoose");
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const expressOasGenerator = require('express-oas-generator');


const app = express()
const port = 3001

expressOasGenerator.init(app, {});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 

main().catch(err => console.log(err));

async function main() {
    await mongoose.connect('mongodb+srv://toto:toto@test.fv4z6.mongodb.net/test');
}

// ------------------- USERS --------------------
// Create a User
app.post('/users', async (req, res) => {
    try{
        const hashedPassword = bcrypt.hashSync(req.body.password, 10);
        const user = new Users(
            {
                username: req.body.username,
                email: req.body.email,
                password: hashedPassword
            }
        );
        await user.save();
        res.send(201);
    }catch {
        res.sendStatus(500)
    }
})

// Authenticate Users
app.post('/users/login', async (req, res) =>{
    const user = await Users.find({ username : req.body.username })
    if(user == null) return res.status(400).send("Cannot find user")
    try{
       if(await bcrypt.compare(req.body.password, user[0].password)) {
           res.send("Success")
       }else{
           res.send("Not Allowed")
       }
    }catch{
        return res.sendStatus(500)
    }
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

// Update Server creation
app.put('/servers/:id', async (req, res) => {
    Servers.findById(req.params.id, function(err, server) {
        if (!server)
            res.send('Could not load Document');
        else {
            server.name = req.body.name;
            server.description = req.body.description;
            server.save(function(err) {
                if (err)
                    console.log('error');
                else
                    console.log('success');
                    res.send(server);
                }
            );
        }
    });
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

// Update Channel creation
app.put('/channels/:id', async (req, res) => {
    Channels.findById(req.params.id, function(err, channel) {
        if (!channel)
            res.send('Could not load Document');
        else {
            channel.name = req.body.name;
            channel.description = req.body.description;
            channel.save(function(err) {
                if (err)
                    console.log('error');
                else
                    console.log('success');
                    res.send(channel);
                }
            );
        }
    });
})

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

// Get All message for an user
app.get('/messages', authenticateToken, async (req, res) => {
    const result = await Messages.find({ owner_id : req.user._id});
    res.send(result);
})

// Get only One message
/*app.get('/messages/:id', async (req, res) => {
    const result = await Messages.find({ _id : req.params.id});
    res.send(result);
})*/

// Update Message creation
app.put('/messages/:id', authenticateToken, async (req, res) => {
    Messages.findById(req.params.id, function(err, message) {
        if (!message)
            res.send('Could not load Document');
        else if (req.user._id == message.owner_id){
            message.content = req.body.content;
            message.save(function(err) {
                if (err)
                    console.log('error');
                else
                    console.log('success');
                    res.send(message);
            });
        }
    });
})

// Supression d'un message
app.delete('/messages/:id', authenticateToken, async (req, res) => {
    Messages.findById(req.params.id, function(err, message) {
        if (!message)
            res.send('Could not load Document');
        else if (req.user._id == message.owner_id){
            message.delete(function(err) {
                if (err)
                    console.log('error');
                else
                    res.send(204); // bien supprimé
            });
        }else{
            res.send(403) // forbidden
        }
    })
})

// ---------------------- Gestion du user dans un server ------------------------

// ajout d'un user dans le server de son choix
// Il faut ajouter le user dans la list des abonnées du server
app.put('/users/:user_id/servers/:server_id/add', async (req, res) => {
    Servers.findById(req.params.server_id, function(err, server) {
        if (!server)
            res.send('Could not load Document');
        else {
            Servers.updateOne(
                { _id: req.params.server_id},
                { $push: { subscriber_id_list: { $each: [ {id: req.params.user_id} ] } } },
                function(error){
                    if (error)
                        res.sendStatus(500) // internal error
                    else
                        console.log('success');
                        res.send(server);
                }
            )
        }
    });
})

// Supression d'un user du server
// Si un user décide de se désabonner, c'est ici que ça se passe 
app.put('/users/:user_id/servers/:server_id/remove', async (req, res) => {
    Servers.findById(req.params.server_id, function(err, server) {
        if (!server)
            res.send('Could not load Document');
        else {
            Servers.updateOne(
                { _id: req.params.server_id},
                { $pull: { subscriber_id_list: { id: req.params.user_id} } },
                { safe : true} ,function(error) {
                    if (error)
                        console.log('error');
                    else
                        console.log('success');
                        res.send(server);
                }
            )
        }
    });
})

function authenticateToken(req, res, next){
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(" ")[1]
    if(token == null) return res.sendStatus(401)

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if(err) return res.sendStatus(403)
        req.user = user
        next()
    })
}

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})