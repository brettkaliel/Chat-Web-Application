let express = require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let path = require("path")


let timeStamp;
let users = [];
let numUsers = 0;
let color;
let chatLog = [];
let chatSize = 0;


app.use(express.static(path.join(__dirname, "public")))

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public' + '/index.html');
});

io.on('connection', function (socket) {
    console.log("A new user has connected");

    color = getRandomColor();
    socket.emit('new user');

    socket.on('make new user', function () {

        numUsers++;
        let nickName = "User" + numUsers;
        console.log(nickName);
        socket.name = nickName;
        socket.color = color;

        users.push({name: nickName, color: color});
        socket.emit('set user', nickName);
        io.emit('user list', users);
        socket.emit('chat history', chatLog);
    });

    socket.on('chat message', function (msg) {
            timeStamp = new Date();
            let hour = timeStamp.getHours();
            let min = timeStamp.getMinutes();

            if (min < 10)
                min = "0" + min;
            msgTime = hour + ":" + min;


            if (msg.startsWith("/nick ")) {
                let newName = msg.slice(6);
                let available = true;
                let position = 0;

                for (let i = 0; i < users.length && available; i++) {
                    if (newName === users[i].name) {
                        available = false;
                        position = i;
                    }
                    else
                        position = i;
                }

                if (available) {
                    users[position].name = newName;
                    socket.name = newName;
                    io.emit('user list', users);
                    socket.emit('set user', newName);
                } else {
                    socket.emit('invalid name', newName)
                }
            } else if (msg.startsWith("/nickcolor ")) {
                let newColor = msg.slice(11);

                if (isHexaColor(newColor)) {


                    for (let i = 0; i < users.length; i++) {
                        if (users[i].name === socket.name) {
                            users[i].color = "#" + newColor;
                            socket.color = "#" + newColor;
                            break;
                        }
                    }

                    io.emit('user list', users);

                }
                else{
                    socket.emit('invalid color', newColor)
                }
            } else {


                if (chatSize < 200) {
                    chatLog.push({name: socket.name, color: socket.color, msgText: msg, time: msgTime});
                    chatSize++;
                } else {
                    chatLog.splice(1, 1);
                    chatLog.push({name: socket.name, color: socket.color, msgText: msg, time: msgTime});
                }


                socket.broadcast.emit('chat message', msg, msgTime, socket.name, socket.color);
                socket.emit('user chat message', msg, msgTime, socket.name, socket.color)
            }

        }
    );

    socket.on('disconnect', function () {
        let discUser = socket.name;
        //io.emit('user list', discUser);
        for (let i = 0; i < users.length; i++) {
            if (users[i].name === discUser)
                users.splice(i, 1);
        }
        io.emit('user list', users);
    });
});


/*Code  from https://stackoverflow.com/questions/1484506/random-color-generator */
function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

/*Code  from https://stackoverflow.com/questions/8027423/how-to-check-if-a-string-is-a-valid-hex-color-representation/8027444 */
function isHexaColor(sNum) {
    return (typeof sNum === "string") && sNum.length === 6
        && !isNaN(parseInt(sNum, 16));
}

http.listen(3000, function () {
    console.log('listening on *:3000');
});