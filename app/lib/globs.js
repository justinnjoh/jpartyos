// module : globs; exposes : globs object holding global variables
// Copyright (c) 2015 Lisol Ltd
// Author: Justin Njoh, August 2015

// TO DO: does this work on multi-core apps ?  

'use strict';

// jcollections : many variables here are jcollections - initialised on first use

var db = null; // a mongodb connection (actual connection, not the connection string)

var objId = null; // mongodb (client) ObjectId() to manage db generated _id data

var _users = null; // registered users cache; _id = email

var _events = null; // events cache; _id : gui (from utils)

//var events = null; // jcollection: a list of all events (parties)
//var users = null; // jcollection: a list of all events (parties)



var users = {};
var messages = [];
var rooms = {};


var globs = {
  db : db,
  users : users,
  messages : messages,
  rooms : rooms,

};


module.exports = globs;

