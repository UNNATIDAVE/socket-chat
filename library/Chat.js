// Defining and initializing modules
var socketio = require('socket.io');
var mongoose = require('mongoose');
var events = require('events');
var load = require('lodash');
var eventEmitter = new events.EventEmitter();
// calling mongoose models
require('../app/models/user.js');
require('../app/models/chat.js');

var userModel = mongoose.model('user');
var chatModel = mongoose.model('chat');
var roomModel = mongoose.model('room');

// Socket.io code for chat... 
module.exports.sockets = function(http) {
 var io = socketio.listen(http);

  // code for setting chat route
  var ioChat = io.of('/chat');
  var userStack = {};
  var oldChats, sendUserStack, setRoom;
  var userSocket = {};

  ioChat.on('connection', function(socket) {
    console.log("socketio chat connected.");

    socket.on('set-user-data', function(username) {
      console.log(username+ "  logged In");

      // code for storing use names.
      socket.username = username;
      userSocket[socket.username] = socket.id;
      socket.broadcast.emit('broadcast',{ description: username + ' Logged In'});
      eventEmitter.emit('get-all-users');

      // code for Setting user online or offline
      sendUserStack = function() {
        for (i in userSocket) {
          for (j in userStack) {
            if (j == i) {
              userStack[j] = "Online";
            }
          }
        }
        ioChat.emit('onlineStack', userStack);
      } 
    }); //end of set-user-data function.

    // code for setting room.
    socket.on('set-room', function(room) {
      socket.leave(socket.room);
      eventEmitter.emit('get-room-data', room);
      
      setRoom = function(roomId) {
        socket.room = roomId;
        console.log("roomId : " + socket.room);
        socket.join(socket.room);
        ioChat.to(userSocket[socket.username]).emit('set-room', socket.room);
      };
    }); 
    // end of setting room event.

    // Code to read old-chatsfrom database.
    socket.on('old-chats-init', function(data) {
      eventEmitter.emit('read-chat', data);
    });

    socket.on('old-chats', function(data) {
      eventEmitter.emit('read-chat', data);
    });
    
    oldChats = function(result, username, room) {
      ioChat.to(userSocket[username]).emit('old-chats', {
        result: result,
        room: room
      });
    }
    // End code for read chat history

    //showing msg on typing.
    socket.on('typing', function() {
      socket.to(socket.room).broadcast.emit('typing', socket.username + " is typing...");
    });

    //for showing chats.
    socket.on('chat-msg', function(data) {
      eventEmitter.emit('save-chat', {
        msgFrom: socket.username,
        msgTo: data.msgTo,
        msg: data.msg,
        room: socket.room,
        date: data.date
      });
      
      ioChat.to(socket.room).emit('chat-msg', {
        msgFrom: socket.username,
        msg: data.msg,
        date: data.date
      });
    });

    // Leaving chat message
    socket.on('disconnect', function() {
      console.log(socket.username+ " logged out");
      socket.broadcast.emit('broadcast',{ description: socket.username + ' Logged out'});
      console.log("chat disconnected.");
      load.unset(userSocket, socket.username);
      userStack[socket.username] = "Offline";
      ioChat.emit('onlineStack', userStack);
    }); //end of leaving chat function

  }); 
  //end of socket.io code for chat feature.
  
  //saving chats to database.
  eventEmitter.on('save-chat', function(data) {

    var newChat = new chatModel({
        msgFrom: data.msgFrom,
        msgTo: data.msgTo,
        msg: data.msg,
        room: data.room,
        createdOn: data.date
    });

    newChat.save(function(err, result) {
      if (err) {
        console.log(err);
      } else if (result == undefined || result == null || result == "") {
        console.log("Chat Is Not Saved.");
      } else {
        console.log("Chat Saved.");
      }
    });
  }); //end of saving chat code.

  // code for reading chat from database.
  eventEmitter.on('read-chat', function(data) {

    chatModel.find({})
      .where('room').equals(data.room)
      .sort('-createdOn')
      .skip(data.msgCount)
      .lean()
      .limit(5)
      .exec(function(err, result) {
        if (err) {
          console.log(err);
        } 
        else {
          oldChats(result, data.username, data.room);
        }
      });
  }); //end of reading chat from database.

  // code for Creating list of all users.
  eventEmitter.on('get-all-users', function() {
    userModel.find({})
      .select('username')
      .exec(function(err, result) {
        if (err) {
          console.log(err);
        } else {
          for (var i = 0; i < result.length; i++) {
            userStack[result[i].username] = "Offline";
          }
          sendUserStack();
        }
      });
  }); //end of get-all-users event.

  // code for get-room-data event.
  eventEmitter.on('get-room-data', function(room) {
    roomModel.find({
      $or: [{
        name1: room.name1
      }, {
        name1: room.name2
      }, {
        name2: room.name1
      }, {
        name2: room.name2
      }]
    }, function(err, result) {
      if (err) {
        console.log(err);
      } 
      else {
        if (result == "" || result == undefined || result == null) {
          var today = Date.now();

          newRoom = new roomModel({
            name1: room.name1,
            name2: room.name2,
            lastActive: today,
            createdOn: today
          });

          newRoom.save(function(err, newResult) {

            if (err) {
              console.log(err);
            }
            else if (newResult == "" || newResult == undefined || newResult == null) {
              console.log("Some Error Occured.");
            } 
            else {
              setRoom(newResult._id);
            }
          }); 
        } 
        else {
          var jresult = JSON.parse(JSON.stringify(result));
          setRoom(jresult[0]._id); 
        }
      } 
    }); 
  });
  //end of database operations for chat feature.

  // code to verify for unique username and email at signup.
  var ioSignup = io.of('/signup');
  var checkUname, checkEmail; 

  ioSignup.on('connection', function(socket) {
    console.log("Successfully signup.");

    socket.on('checkUname', function(uname) {
      eventEmitter.emit('findUsername', uname);
    });

    checkUname = function(data) {
      ioSignup.to(socket.id).emit('checkUname', data); 
    }; //end of checkUsername function.

    // code for check email.
    socket.on('checkEmail', function(email) {
      eventEmitter.emit('findEmail', email); 
    }); //end of checkEmail event.

    // code for emit event for checkEmail.
    checkEmail = function(data) {
      ioSignup.to(socket.id).emit('checkEmail', data);
    }; //end of checkEmail function.

    // code for disconnection.
    socket.on('disconnect', function() {
      console.log("signup disconnected.");
    });

  }); //end of ioSignup connection event.

  // code for find and check username.
  eventEmitter.on('findUsername', function(uname) {

    userModel.find({
      'username': uname
    }, function(err, result) {
      if (err) {
        console.log(err);
      } 
      else {
        if (result == "") {
          checkUname(1);
        } else {
          checkUname(0);
        }
      }
    });

  }); //end of findUsername event.

  // code for find and check Email.
  eventEmitter.on('findEmail', function(email) {

    userModel.find({
      'email': email
    }, function(err, result) {
      if (err) {
        console.log(err);
      } 
      else {
        if (result == "") {
          checkEmail(1);
        } else {
          checkEmail(0);
        }
      }
    });

  }); //end of find email code.

  return io;
};
