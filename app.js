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
var argv = require('minimist')(process.argv.slice(2));

const app = express()
const port = 3001
const subpath = express()

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 
app.use("/v1", subpath);
const swagger = require('swagger-node-express').createNew(subpath);
app.use(express.static('dist'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/dist/index.html');
});
swagger.configureSwaggerPaths('', 'api-docs', '');

// Configure the API domain
var domain = 'localhost';
if(argv.domain !== undefined)
    domain = argv.domain;
// Set and display the application URL
var applicationUrl = 'http://' + domain + ':' + port;

swagger.configure(applicationUrl, '1.0.0');

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
                password: hashedPassword,
                server_permission_id_list : []
            }
        );
        await user.save();
        res.send(201);
    }catch {
        res.sendStatus(500)
    }
})

// Promote an user to admin
// Only the principal admin can do this end point 
app.put('/users/:user_id/promote', authenticateToken, async (req, res) => {
    Servers.findById(req.body.server_id, function(err, server) {
        if (!server) res.send('Could not find the server');
        // On verifie si c'est le createur du server -> donc l'admin principal
        if(req.user._id == server.owner_id){
            // On promu notre user
            Users.updateOne(
                { _id: req.params.user_id},
                { $push: { server_permission_id_list: { $each: [ {id: server.id} ] } } },
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

// Get All Users (optionnal)
app.get('/users', async (req, res) => {
    const result = await Users.find();
    res.send(result);
})

// Get only One user (optionnal)
app.get('/users/:id', async (req, res) => {
    const result = await Users.find({ _id : req.params.id});
    res.send(result);
})

// Supression d'un user (optionnal)
app.delete('/users/:id', async (req, res) => {
    Users.findById(req.params.id, function(err, user) {
        if (!user)
            res.send('Could not retrieve the user');

            user.delete(function(err) {
            if (err)
                res.sendStatus(500)
            else
                res.send(204); // bien supprimé
        });
    })
})

// ------------------- SERVERS --------------------
// New Server creation
app.post('/servers', async (req, res) => {
    const server = new Servers(
        {
            name: req.body.name,
            description: req.body.description,
            owner_id: req.body.owner_id,
            subscriber_id_list : []
        }
    );
    await server.save();
    res.send(server);
})

// Get All Servers (optionnal)
app.get('/servers', async (req, res) => {
    const result = await Servers.find();
    res.send(result);
})

// Get only One server (optionnal)
app.get('/servers/:id', async (req, res) => {
    const result = await Servers.find({ _id : req.params.id});
    res.send(result);
})

// Update Server
app.put('/servers/:server_id', authenticateToken, async (req, res) => {
    Servers.findById(req.params.server_id, function(err, server) {
        if (!server) res.send('Could not load Document');
        // On verifie si c'est le createur du server -> donc l'admin principal
        if(req.user._id == server.owner_id){
            server.name = req.body.name;
            server.description = req.body.description;
            server.save(function(err) {
                if (err) console.log('error');
                else
                    console.log('success');
                    res.send(server);
            });
        }
    });
})

// Supression d'un server
app.delete('/servers/:id', authenticateToken, async (req, res) => {
    Servers.findById(req.params.id, function(err, server) {
        if (!server)
            res.send('Could not retrieve the server');
        else if (req.user._id == server.owner_id){
            server.delete(function(err) {
                if (err)
                    res.sendStatus(500)
                else
                    res.send(204); // bien supprimé
            });
        }else{
            res.send(403) // forbidden
        }
    })
})

// ------------------- CHANNELS --------------------
// New Channels creation
app.post('/channels', authenticateToken, (req, res) => {
    Servers.findById(req.body.server_id, async function(err, server) {
        if (!server) res.send('Could not find the server');
        // On verifie si c'est le createur du server -> donc l'admin principal
        if(req.user._id == server.owner_id){
            const channel = new Channels(
                {
                    server_id: server.id,
                    name: req.body.name
                }
            );
            await channel.save();
            res.send(channel);
        }else{
            res.sendStatus(403)
        }
    });
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
app.put('/channels/:id', authenticateToken, (req, res) => {

    Channels.findById(req.params.id, function(err, channel) {
        if (!channel) res.send('Could not the channel');
        Servers.findById(channel.server_id, async function(err, server) {
            if (!server) res.send('Could not find the server');
            // On verifie si c'est le createur du server -> donc l'admin principal
            if(req.user._id == server.owner_id){
                channel.name = req.body.name;
                await channel.save(function(err) {
                    if (err) console.log('error');
                    else
                        console.log('success');
                        res.send(channel);
                });
            }else{
                res.sendStatus(403)
            }
        });
    });
})

// Supression d'un channel
app.delete('/channels/:id', authenticateToken, async (req, res) => {
    Channels.findById(req.params.id, function(err, channel) {
        if (!channel) res.send('Could not the channel');
        Servers.findById(channel.server_id, async function(err, server) {
            if (!server) res.send('Could not find the server');
            // On verifie si c'est le createur du server -> donc l'admin principal
            if(req.user._id == server.owner_id){
                await channel.delete(function(err) {
                    if (err)
                        res.sendStatus(500)
                    else
                        res.send(204); // bien supprimé
                });
            }else{
                res.sendStatus(403)
            }
        });
    });
})

// ------------------- MESSAGES --------------------
// New Messages creation
app.post('/messages', authenticateToken, async (req, res) => {
    Channels.findById(req.body.channel_id, function(err, channel) {
        if (!channel) res.send('Could not the channel');
        Servers.findById(channel.server_id, async function(err, server) {
            if (!server) res.send('Could not find the server');
            // On verifie que le user soit bien subscribe
            const subscriber_list = server.subscriber_id_list
            for(u = 0; u < subscriber_list.length; u++){
                if(subscriber_list[u].id == req.user._id){
                    const message = new Messages(
                        {
                            content: req.body.content,
                            username: req.user.username,
                            channel_id: channel.id,
                            owner_id: req.user._id
                        }
                    );
                    await message.save();
                    res.send(message);
                }else{
                    res.send("vous devez vous abonner au serveur pour poster des messages !")
                }
            }
        });
    });
})

// Get All message for an user
app.get('/messages', authenticateToken, async (req, res) => {
    const result = await Messages.find({ owner_id : req.user._id});
    res.send(result);
})

// Get All message from a channel for a subscribe user
app.get('/channels/:channel_id/messages', authenticateToken, async (req, res) => {
    Channels.findById(req.params.channel_id, function(err, channel) {
        if (!channel) res.send('Could not the channel');
        Servers.findById(channel.server_id, async function(err, server) {
            if (!server) res.send('Could not find the server');
            // On verifie que le user soit bien subscribe
            const subscriber_list = server.subscriber_id_list
            for(u = 0; u < subscriber_list.length; u++){
                if(subscriber_list[u].id == req.user._id){
                    // on affiche tous les messages du channel
                    const result = await Messages.find({ channel_id : channel.id});
                    res.send(result);
                }else{
                    res.send("vous devez vous abonner au serveur pour poster des messages !")
                }
            }
        });
    });
})

// Get only One message
/*app.get('/messages/:id', async (req, res) => {
    const result = await Messages.find({ _id : req.params.id});
    res.send(result);
})*/

// Update Message creation
app.put('/messages/:id', authenticateToken, (req, res) => {
    Messages.findById(req.params.id, async function(err, message) {
        if (!message)
            res.send('Could not load Document');
        else if (req.user._id == message.owner_id){
            message.content = req.body.content;
            await message.save(function(err) {
                if (err)
                    res.sendStatus(500)
                else
                    console.log('success');
                    res.send(message);
            });
        }
    });
})

// Supression d'un message
app.delete('/messages/:id', authenticateToken, (req, res) => {
    Messages.findById(req.params.id, async function(err, message) {
        if (!message)
            res.send('Could not retrieve the message');
        // d'abord, on récupère le channel du message
        Channels.findById(message.channel_id, function(err, channel) {
            if (!channel) res.send('Could not the channel');
            // Ensuite on recupere le serveur pour obtenir le owner_id
            Servers.findById(channel.server_id, async function(err, server) {
                if (!server) res.send('Could not find the server');
                // On verifie si le user est l'admin principal
                if(req.user._id == server.owner_id){
                    await message.delete(function(err) {
                        if (err)
                            res.sendStatus(500)
                        else
                            res.send(204); // bien supprimé
                    });
                // Si c'est pas l'admin principal, on vérifie si notre user est bien le propriétaire du message
                }else if (req.user._id == message.owner_id){
                    await message.delete(function(err) {
                        if (err)
                            res.sendStatus(500)
                        else
                            res.send(204); // bien supprimé
                    });
                }else{
                    res.send(403) // forbidden
                }
                
                
            });
        });
    })
})

//just for testing remove after
/*app.delete('/messages/:id', (req, res) => {
    Messages.findById(req.params.id, async function(err, message) {
        if (!message)
            res.send('Could not retrieve the message');
        await message.delete(function(err) {
            if (err)
                res.sendStatus(500)
            else
                res.send(204); // bien supprimé
        });
    })
})*/

// ---------------------- Gestion du user dans un server ------------------------

// ajout d'un user dans le server de son choix
// Il faut ajouter le user dans la list des abonnées du server
app.put('/servers/:server_id/subscribe', (req, res) => {
    Servers.findById(req.params.server_id, function(err, server) {
        if (!server)
            res.send('Could not retrieve the server');
        else {
            Servers.updateOne(
                { _id: req.params.server_id},
                { $push: { subscriber_id_list: { $each: [ {id: req.body.user_id} ] } } },
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
app.put('/servers/:server_id/unsubscribe', authenticateToken, async (req, res) => {
    Servers.findById(req.params.server_id, function(err, server) {
        if (!server)
            res.send('Could not retrieve the server');
        else {
            // On va d'abord vérifier si le user n'est pas l'admin principal
            if(server.owner_id == req.user._id){
                Servers.updateOne(
                    { _id: req.params.server_id},
                    { $pull: { subscriber_id_list: { id: req.body.id} } },
                    { safe : true} ,function(error) {
                        if (error)
                            res.sendStatus(500)
                        else
                            console.log('success');
                            res.send(server);
                    }
                )
            }else{
                // On doit vérifier que l'utilisateur qui souhaite se désabonner est abonné
                // Pour ça, on va comparer les ID du user de la liste des subscribers
                const subscriber_list = server.subscriber_id_list
                for(u = 0; u < subscriber_list.length; u++){
                    if(subscriber_list[u].id == req.user._id){
                        Servers.updateOne(
                            { _id: req.params.server_id},
                            { $pull: { subscriber_id_list: { id: req.user._id} } },
                            { safe : true} ,function(error) {
                                if (error)
                                    res.sendStatus(500)
                                else
                                    console.log('success');
                                    res.send(server);
                            }
                        )
                    }
                }
            }
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