// module : jsession; exposes : functions to do with an event (chat) session
// Copyright (c) 2015 Lisol Ltd
// Author: J Njoh, August 2015

'use strict';

var globs = require('./globs');



var utils = require('./jutils'); // app utils, eg guid()

// remove DB connection for now
var dbutils = null; // require('./jdb'); // utils dealing directly with the DB

var jcol = require('./jcollection'); // jcollection utilities

// collection names
var col_events = 'events'; 


// events - START
function createRoom (data) {
  // creates a room whose properties are in json doc data
  // host_email, host_name, host_organisation, host_image, start_time, end_time, url, session_image, url, access [0 public, 10 private]

}

function createEvent (db, data, callback) {
  // creates a room whose properties are in json doc data
  // owner_id, title, organisation, logo_url, start_time, duration, end_time, url, access [0 public, 10 private]
  // passcode will be its ID

  // validate data
  var err = utils.validateObjectProperty (data, 'owner_id', 'An email for the event owner is required');
  err = err || utils.validateObjectProperty (data, 'title', 'Please provide a title for your event');
  err = err || utils.validateObjectProperty (data, 'start_time', 'Please provide a start date and time for your event');

}


function createRoom (data) {
  // creates a room whose properties are in json doc data
  // host_email, host_name, host_organisation, host_image, start_time, end_time, url, session_image, url, access [0 public, 10 private]

}

function checkRoom (rm) {
  // return the room if it exists in rooms object
  var room = globs.rooms.hasOwnProperty(rm) ? rm : null;

  //console.log('Checked room: ', rm, '; output room: ', room);

  return (room);
}



// events - START


function makeMsg (ttl, msg, verb, soc) {
  // package a message
  var data = {
    'id' : null,
    'uid' : soc.uid,
    'room' : soc.room,
    'sender' : soc.uname || 'Replay',
    'cmd' : 'message',
    'verb' : verb,
    'date' : new Date(),
    'data' : msg,
    'title' : ttl,
  }

  // messages count in this room is the msg id
  if ( globs.rooms.hasOwnProperty(soc.room) ) {
    var count = globs.rooms[soc.room].messages + 1;
    soc.messages = count;
    data["id"] = count;
    globs.rooms[soc.room].messages = count;
  }
  
  //messages.push(data);
  //console.log(messages);
  
  return (data);
}

function addSocketToRoom (soc) {
  // add this socket to a room
  // the socket has attributes for room and uname
  if ( soc.hasOwnProperty('room') && soc.room && soc.room != '/' ) {
    soc.join(soc.room);

    if ( globs.rooms.hasOwnProperty(soc.room) ) {
      globs.rooms[soc.room]["guests"] = globs.rooms[soc.room]["guests"] + 1;
    }
    else {
      globs.rooms[soc.room] = {
        guests : 1,
        messages : 0,
        likes : 0,
        wishes : 0,
      };
    }
  }  
}

function sendMsg(m, emit_type, soc, to_room) {
  // msg is ready to send : if to_room, then send to room, else send to socket
  //console.log('Sending', util.inspect(m));

  //console.log('Rooms: ', rooms);

  if ( to_room ) {
    console.log('Sending to room: ', soc.room);

    soc.to(soc.room).emit(emit_type, m);
  }
  else {
    soc.emit(emit_type, m)
  }
}



function saveDataUrl( path, fileName, dataUrl, callback ) {
  // saves a binary stream eg images into a location
  // returns file name

  var dataString = dataUrl.split( "," )[ 1 ],
    buffer = new Buffer( dataString, 'base64'),
    extension = dataUrl.match(/\/(.*)\;/)[ 1 ],
    fs = require( "fs" ),
    fn = fileName + "." + extension,
    fullFileName = path && path.length > 0 ? path + "/" + fn : fn;

  try {
    fs.writeFileSync( fullFileName, buffer, "binary" );
  }

  catch (e) {
    return callback(e);
  }

  return callback(null, fn);
}


// to export
var result = {
  createRoom : createRoom,
  checkRoom : checkRoom,
  makeMsg : makeMsg,
  addSocketToRoom : addSocketToRoom,
  sendMsg : sendMsg,
  saveDataUrl : saveDataUrl,
  
};

module.exports = result;

