// app : server side entry point to Lisol Replay
// Copyright (c) 2015 Lisol Ltd
// Author: Justin Njoh, May 2015

'use strict';

var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    url = require('url'),
    sess = require('./lib/jsession'),
    util = require('util');

var globs = require('./lib/globs');

var namespace = io.of('/party');

// store user details against each socket connection
//var users = {};
//var messages = [];
//var rooms = {};

namespace.on('connection', function (socket) {

  console.log('Soc id: ', socket.id, '; Room: ', socket.room, '; uid: ', socket.uid);
  console.log('Users: ', util.inspect(globs.users));

  // set uid to socket id;
  socket.uid = socket.id;
  socket.room = null;

  // stats
  socket.messages = 0;
  socket.guests = 0;
  socket.wishes = 0;
  socket.likes = 0;

  // send uid to client
  var msg = sess.makeMsg('', 'Ack', 'uid', socket);
  sess.sendMsg(JSON.stringify(msg), 'message', socket, false);

  socket.on('name', function (m) {
    //console.log('Name: ' + util.inspect(msg));

    var msg = JSON.parse(m),
      data = msg["data"],
      user = {
        name: null,
        code: null,
        email: null,
      };

    if ( data ) {
      // set logged in user details
      user.name = data.hasOwnProperty('name') ? data.name : null;
      user.code = data.hasOwnProperty('code') ? data.code : null;
      user.email = data.hasOwnProperty('email') ? data.email : null;
    }

    // TO DO: auth / validation checks here & populate rights, session objects below
    var rights = {
          host : 1,
          can_post : 0,
        },
        session = {
          host_organisation : "J Party",
          host_name : "Amy Gossy",
          host_image : "0.jpg",
          session_name : "Amy's party",
          start_time : Date.now(),
          end_time : Date.now(),
          url : "",
        };


    socket.uname = user.name;
    socket.room = msg.room.toLowerCase();

    sess.addSocketToRoom(socket);

    var msg = sess.makeMsg('', socket.uname + ' has joined us', 'name', socket);

    msg.rights = rights;
    msg.session = session;
    msg.user = user;

    sess.sendMsg(JSON.stringify(msg), 'message', socket, false); // to this socket

    msg.verb = 'message';
    sess.sendMsg(JSON.stringify(msg), 'message', socket, true); // to all other sockets

    // store msg
    globs.messages.push(msg);
  });

  socket.on('message', function (m) {
    //console.log('Message: ' + util.inspect(msg));

    var msg = JSON.parse(m);

    // messages count in this room is the msg id
    if ( globs.rooms.hasOwnProperty(socket.room) ) {
      var count = globs.rooms[socket.room].messages + 1;
      socket.messages = count;
      msg["id"] = count;
      globs.rooms[socket.room].messages = count;
    }

    sess.sendMsg(JSON.stringify(msg), 'message', socket, false);
    sess.sendMsg(JSON.stringify(msg), 'message', socket, true);

    // store msg
    globs.messages.push(msg);
  });

  socket.on('feedback', function (m) {
    //var msg = JSON.parse(m);
    console.log('Feedback: ', m);

    var msg = JSON.parse(m),
      room = sess.checkRoom(msg.room),
      verb = msg.hasOwnProperty('verb') ? msg.verb : null,
      act = msg.hasOwnProperty('act') ? msg.act : null;

    if ( room && act ) {
      console.log('Room: ', room, '; V: ', verb, '; A: ', act);

      switch ( act ) {

        case 'like':
          globs.rooms[room].likes += 1;
          break;

        case 'unlike':
          globs.rooms[room].likes -= 1;
          break;

        case 'wish':
          globs.rooms[room].wishes += 1;
          break;

        case 'unwish':
          globs.rooms[room].wishes -= 1;
          break;

      }

      // send a message to this socket to update their planner
      var count = globs.rooms[room].messages + 1;
      socket.messages = count;
      msg["id"] = count;
      globs.rooms[room].messages = count;

      globs.messages.push(msg); // save the feedback message


      // set verb to feedback command (act) and remove it
      //msg["verb"] = msg["act"];
      //msg["act"] = "";


      sess.sendMsg(JSON.stringify(msg), 'message', socket, false);

      // send stats message to all sockets
      msg.guests = globs.rooms[room].guests;
      msg.likes = globs.rooms[room].likes;
      msg.wishes = globs.rooms[room].wishes;
      msg.verb = 'stats';
      msg.act = '';

      sess.sendMsg(JSON.stringify(msg), 'message', socket, false);
      sess.sendMsg(JSON.stringify(msg), 'message', socket, true);
    }

    //console.log('Feedback msg sent back: ', msg);

  });


  socket.on('image', function (m) {

    console.log('Image received')
    //console.log('Image: ' + util.inspect(m));
    var room = globs.rooms.hasOwnProperty(m.room) ? m.room : null;

    if ( room && room.length > 0 ) {

      var msg = sess.makeMsg (m.title, '', 'image', socket),
        path = "public/events/" + room + "/images";

      sess.saveDataUrl( path, msg["id"], m.data, function (er, fn) {

        if ( er ) {
          console.log('Error saving image: ', er);
        }
        else {
          console.log('Image saved ok');
          msg.data = fn;

          //console.log('Would send back: ', msg);

          sess.sendMsg(JSON.stringify(msg), 'message', socket, false);
          sess.sendMsg(JSON.stringify(msg), 'message', socket, true);

          // store msg
          globs.messages.push(msg);
        }
      });

    } // if room
    else {
      console.log('Invalid party room : ', room);
    }

  });




  socket.on('admin', function (m) {
    // form submit action
    var msg = JSON.parse(m),
      act = msg.act;
    
    console.log('Form data: ', m);

    switch ( act ) {
      case 'evsave':
        // add / update event

        break;


      default:
        console.log('Unknown action in: ', m);
        break;

    } // end switch (act)


  });


});






var party = function (request, response) {
  // get room
  var path = url.parse(request.url).path;
  var this_room = null;

  //console.log('url: ', parsed_url);

  if ( path.length > 1 ) {
    // path has form: /party/[room name]

    path = path.split('\/');
    this_room = path.length > 2 ? path[2] : this_room;
  }

  //console.log('This room: ', this_room, 'Path: ', path);

  response.sendFile(__dirname + '/public/views/home/party.html');
}



app.use(express.static(__dirname + '/public'));


app.get('/', function (request, response) {
	response.sendFile(__dirname + '/public/views/home/index.html');
});

app.get('/party*', [party]);



// application starts

// remove DB connection for now
/*
require('./lib/jconn').getConnection( function (err, conn) {

  if ( err ) {
    console.log('App start error:\n', err)
  }
  else {
    globs.db = conn;
*/

    http.listen(9002, function () {
      console.log('Http listening on port 9002');
    });

//  }

//})
