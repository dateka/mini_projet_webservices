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
// Verifier si le user à créer n'existe pas déjà A faire
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
        return res.status(201).send("user created \n" + user)
    }catch {
        return res.status(500).send("Internal Server Error")
    }
})

// Promote an user to admin
// Only the principal admin can do this end point 
app.put('/users/:user_id/promote', authenticateToken, async (req, res) => {
    Servers.findById(req.body.server_id, function(err, server) {
        if (!server) return res.status(404).send("Cannot find the server")
        // On verifie si c'est le createur du server -> donc l'admin principal
        if(req.user._id == server.owner_id){
            // On promu notre user
            Users.updateOne(
                { _id: req.params.user_id},
                { $push: { server_permission_id_list: { $each: [ {id: server.id} ] } } },
                function(error){
                    if (error)
                        return res.status(500).send("Internal Server Error") // internal error
                    else
                        return res.status(200).send("User promoted to admin rank \n" + server)
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
            return res.status(404).send("Cannot find user")

        user.delete(function(err) {
        if (err)
            return res.status(500).send("Internal Server Error")
        else
            return res.status(204).send("User successfully deleted \n" + user)
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
    return res.status(201).send("Server created \n" + server)
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
        if (!server) return res.status(404).send("Cannot find server")
        // On verifie si c'est le createur du server -> donc l'admin principal
        if(req.user._id == server.owner_id){
            server.name = req.body.name;
            server.description = req.body.description;
            server.save(function(err) {
                if (err) return res.status(500).send("Internal Server Error")
                else
                    return res.status(200).send("Server successfully updated ! \n" + server)
            });
        }
    });
})

// Supression d'un server
app.delete('/servers/:id', authenticateToken, async (req, res) => {
    Servers.findById(req.params.id, function(err, server) {
        if (!server)
            return res.status(404).send("Cannot find server")
        else if (req.user._id == server.owner_id){
            server.delete(function(err) {
                if (err)
                    return res.status(500).send("Internal Server Error")
                else
                    return res.status(204).send("Server successfully deleted \n" + server)
            });
        }else{
            return res.status(403).send("You cannot do that !")
        }
    })
})

// ------------------- CHANNELS --------------------
// New Channels creation
app.post('/channels', authenticateToken, (req, res) => {
    Servers.findById(req.body.server_id, async function(err, server) {
        if (!server) return res.status(404).send("Cannot find channel")
        // On verifie si c'est le createur du server -> donc l'admin principal
        if(req.user._id == server.owner_id){
            const channel = new Channels(
                {
                    server_id: server.id,
                    name: req.body.name
                }
            );
            await channel.save();
            return res.status(201).send("Channel successfully created ! \n" + channel)
        }
        // On va vérifier si c'est un admin nommé
        const list_permission = req.user.server_permission_id_list;
        for(i = 0; i < list_permission.length; i++){
            if(list_permission[i].id == server.id){
                const channel = new Channels(
                    {
                        server_id: server.id,
                        name: req.body.name
                    }
                );
                await channel.save();
                return res.status(201).send("Channel successfully created ! \n" + channel)
            }else{
                return res.status(403).send("You cannot do that !")
            }
        }
    });
})

// Get All channel (optionnal)
app.get('/channels', async (req, res) => {
    const result = await Channels.find();
    res.send(result);
})

// Get only One channel (optionnal)
app.get('/channels/:id', async (req, res) => {
    const result = await Channels.find({ _id : req.params.id});
    res.send(result);
})

// Update Channel
app.put('/channels/:id', authenticateToken, (req, res) => {

    Channels.findById(req.params.id, function(err, channel) {
        if (!channel) return res.status(404).send("Channel not found")
        Servers.findById(channel.server_id, async function(err, server) {
            if (!server) return res.status(404).send("Server not found")
            // On verifie si c'est le createur du server -> donc l'admin principal
            if(req.user._id == server.owner_id){
                channel.name = req.body.name;
                await channel.save(function(err) {
                    if (err) return res.status(500).send("Server Internal Error")
                    else
                        return res.status(200).send("Channel successfully updated ! \n" + channel)
                });
            }
            // On va vérifier si c'est un admin nommé
            const list_permission = req.user.server_permission_id_list;
            for(i = 0; i < list_permission.length; i++){
                if(list_permission[i].id == server.id){
                    channel.name = req.body.name;
                    await channel.save(function(err) {
                        if (err) return res.status(500).send("Server Internal Error")
                        else
                            return res.status(200).send("Channel successfully updated ! \n" + channel)
                    });
                }else{
                    return res.status(403).send("You cannot do that !")
                }
            }
        });
    });
})

// Supression d'un channel
// A faire pour les admin nommé !!
app.delete('/channels/:id', authenticateToken, async (req, res) => {
    Channels.findById(req.params.id, function(err, channel) {
        if (!channel) return res.status(404).send("Channel not found")
        Servers.findById(channel.server_id, async function(err, server) {
            if (!server) return res.status(404).send("Server not found")
            // On verifie si c'est le createur du server -> donc l'admin principal
            if(req.user._id == server.owner_id){
                await channel.delete(function(err) {
                    if (err)
                        return res.status(500).send("Server Internal Error")
                    else
                        return res.status(204).send("Channel successfully deleted ! \n" + channel)
                });
            }else{
                return res.status(403).send("You cannot do that !")
            }
        });
    });
})

// ------------------- MESSAGES --------------------
// New Messages creation
app.post('/messages', authenticateToken, async (req, res) => {
    Channels.findById(req.body.channel_id, function(err, channel) {
        if (!channel) return res.status(404).send("Channel not found")
        Servers.findById(channel.server_id, async function(err, server) {
            if (!server) return res.status(404).send("Server not found")
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
                    return res.status(201).send("Message successfully created ! \n" + message)
                }else{
                    return res.status(403).send("You cannot do that ! You must be subscribe")
                }
            }
        });
    });
})

// Get All message for an user (optionnal)
app.get('/messages', authenticateToken, async (req, res) => {
    const result = await Messages.find({ owner_id : req.user._id});
    res.send(result);
})

// Get All message from a channel for a subscribe user
app.get('/channels/:channel_id/messages', authenticateToken, async (req, res) => {
    Channels.findById(req.params.channel_id, function(err, channel) {
        if (!channel) return res.status(404).send("Channel not found")
        Servers.findById(channel.server_id, async function(err, server) {
            if (!server) return res.status(404).send("Server not found")
            // On verifie que le user soit bien subscribe
            const subscriber_list = server.subscriber_id_list
            for(u = 0; u < subscriber_list.length; u++){
                if(subscriber_list[u].id == req.user._id){
                    // on affiche tous les messages du channel
                    const result = await Messages.find({ channel_id : channel.id});
                    return res.status(200).send(result)
                }else{
                    return res.status(403).send("You cannot do that ! You must be subscribe")
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
            return res.status(404).send("Channel not found")
        else if (req.user._id == message.owner_id){
            message.content = req.body.content;
            await message.save(function(err) {
                if (err)
                    return res.status(500).send("Internal Server Error")
                else
                    return res.status(200).send("Message successfully updated ! \n" + message)
            });
        }
    });
})

// Supression d'un message
app.delete('/messages/:id', authenticateToken, (req, res) => {
    Messages.findById(req.params.id, async function(err, message) {
        if (!message)
            return res.status(404).send("Message not found")
        // d'abord, on récupère le channel du message
        Channels.findById(message.channel_id, function(err, channel) {
            if (!channel) return res.status(404).send("Channel not found")
            // Ensuite on recupere le serveur pour obtenir le owner_id
            Servers.findById(channel.server_id, async function(err, server) {
                if (!server) return res.status(404).send("Server not found")
                // On verifie si le user est l'admin principal
                if(req.user._id == server.owner_id){
                    await message.delete(function(err) {
                        if (err)
                            return res.status(500).send("Internal Server Error")
                        else
                            return res.status(204).send("Message successfully deleted ! \n " + message)
                    });
                // Si c'est pas l'admin principal, on vérifie si notre user est bien le propriétaire du message
                }else if (req.user._id == message.owner_id){
                    await message.delete(function(err) {
                        if (err)
                            return res.status(500).send("Internal Server Error")
                        else
                            return res.status(204).send("Message successfully deleted ! \n " + message)
                    });
                }else{
                    return res.status(403).send("You cannot do that !")
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
            return res.status(404).send("Server not found")
        else {
            Servers.updateOne(
                { _id: req.params.server_id},
                { $push: { subscriber_id_list: { $each: [ {id: req.body.user_id} ] } } },
                function(error){
                    if (error)
                        return res.status(500).send("Server Internal Error")
                    else
                        return res.status(200).send("User is subscribe !" + server)
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
            return res.status(404).send("Server not found")
        else {
            // On va d'abord vérifier si le user n'est pas l'admin principal
            if(server.owner_id == req.user._id){
                Servers.updateOne(
                    { _id: req.params.server_id},
                    { $pull: { subscriber_id_list: { id: req.body.id} } },
                    { safe : true} ,function(error) {
                        if (error)
                            return res.status(500).send("Server Internal Error")
                        else
                            return res.status(200).send("User is unsubscribe !" + server)
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
                                    return res.status(500).send("Server Internal Error")
                                else
                                    return res.status(200).send("User is unsubscribe !" + server)
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
    if(token == null) return res.status(401).send("Vous n'êtes authorisé !")

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if(err) return res.status(403).send("You cannot do that ! The token has been change or is expired !")
        req.user = user
        next()
    })
}

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})