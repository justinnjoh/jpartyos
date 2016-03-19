// module : jcollection; exposes : jcollection
// Copyright (c) 2015 Lisol Ltd
// Author: Justin Njoh, July 2015
'use strict';

// this is an abstract indexed collection that looks like this:
// {
//    name : (optional) name of collection in DB
//    index : { key1 : <col array index>, key9: <col array index>, ... },
//    collection : [
//      {_id: key1, field1: value1, field2: value2, ..., _op_},
//      {_id: key9, field1: value1, ..., _op_},
//    ]
// }
//    _op_ (changes) : each collection object has a field _op_ as follows: none, new, mod, del
// the index is a hash to provide fast look ups for items in the collection 
// without sequentially scanning it
// These collections are generally expected to be cached in files and persisted
// in a DB (expected to be MongoDB at the time of writing)

var utils = require('./jutils');

function newCollection (name) {
  // return a new collectin object

  var col = {
    name : name || '',
    index : {},
    collection : [],
  };

  return (col);
}

function reindexCollection (col, callback) {
  // re-create the index in this collection
  // if call back is passed, then return it else return normally

  var index = {},
    err = null;

  err = utils.validateCollection (col);

  if ( err ) {
    err = new Error(err + ' --reindexCollection');
    return callback ? callback(err) : err;
  }

  // a valid index item has _id whose value is one or more word characters
  for ( var i = 0, tot = col["collection"].length; i < tot; i++ ) {
    if ( utils.validateObjectProperty(col["collection"][i], "_id", /\w*/) ) {
      err = col["collection"][i];
      break;
    }

    index[col["collection"][i]["_id"]] = i;
  }

  if ( err ) {
    var item = err;
    err = new Error('Re-index failed because an item without an ID was found --reindexCollection');
    err["item"] = item;

    return callback ? callback(err) : err;
  }

  // success
  col["index"] = index;

  return callback ? callback(null, col) : col;
}

function addCollectionItem (col, item, overwrite, callback) {
  // add item to collection 'col'; item must have 'id' field - part of Crud
  // if overwrite is true, then existing items are overwritten, else error
  // if call back is passed, then return it else return normally

  var col = col || newCollection(),
    id = null,
    err = null;

  err = utils.validateCollection(col);
  err = err || utils.validateObject(item, null, 'An item to add to collection is required');
  err = err || utils.validateObjectProperty(item, '_id', /\w*/, 'Cannot add or update - the item does not have a unique ID');

  if ( !err && !overwrite ) {
  	if ( col["index"].hasOwnProperty(item["_id"]) ) {
      err = 'An existing collection item with ID [' + item["_id"] + '] would be overwritten';
  	}
  }

  if ( err ) {
    err = new Error(err + ' --addCollectionItem [' + overwrite + ']');
    return callback ? callback(err) : err;
  }

  // no error, so doit
  if ( col["index"].hasOwnProperty(item["_id"]) ) {
    // item exists, so update
    item["_op_"] = 'mod';
    col["collection"][col["index"][item["_id"]]] = item;
  }
  else {
    // add new
    item["_op_"] = 'new';

  	var count = col["collection"].push(item);
  	col["index"][item["_id"]] = count - 1;
  }

  return callback ? callback(null, col) : col;
}

function getCollectionItemById (col, id, callback) {
  // get item in collection whose _id is 'id' - part of cRud
  // return in callback if passed or return normally

  var err = null,
    item = null;

  err = utils.validateCollection(col);
  err = err || utils.validateObject(id, /\w*/, 'A valid item ID is required');

  if ( err ) {
    err = new Error(err + ' -- getCollectionItemById');
    return callback ? callback(err) : err;
  }

  try {
    item = col["collection"][col["index"][id]];
  }

  catch (err) {
    return callback ? callback(err) : err;
  }

    return callback ? callback(null, item) : item;
}

function upsertCollectionItem (col, item, callback) {
  // update collection item OR insert if not there'; item must have '_id' field - part of CrUd
  // if call back is passed, then return it else return normally

  return addCollectionItem(col, item, true, callback);
}

function deleteCollectionItem (col, id, callback) {
  // mark item whose id is given as 'deleted' (_op_ = del) in collection - part of cruD
  // item will be removed permanently after the collection is persisted in DB
  // or with an explict call to purgeCollection
  // return in callback if passed or return normally - returns new collection

  var err = null;

  err = utils.validateCollection(col);
  err = err || utils.validateObject(id, /\w*/, 'A valid item ID is required');
  err = err || col["index"].hasOwnProperty(id) ? null : 'An item with ID ' + id + ' was not found';

  if ( err ) {
    err = new Error(err + ' -- deleteCollectionItem');
    return callback ? callback(err) : err;
  }

  try {
    col["collection"][col["index"][id]]["_op_"] = 'del';
  }

  catch (err) {
    err["caller"] = "deleteCollectionItem";
    return callback ? callback(err) : err;
  }

  return callback(null, col);
}

function purgeCollection (col, callback) {
  // remove all items marked as 'deleted' (_op_ = del) in this collection
  // return in callback if passed or return normally - returns purged collection

  var err = null,
    item = null,
    op = null,
    result = {
      collection : newCollection(),
      deleted_items : newCollection(),
      deleted : 0,
      delete_errors : [],
      new_items : 0,
      new_errors : [],
    };

  err = utils.validateCollection(col);

  if ( err ) {
    err = new Error(err + ' -- purgeCollection');
    return callback ? callback(err) : err;
  }

  for ( var i = 0, tot = col["collection"].length; i < tot; i++ ) {

    item = col["collection"][i];
    op = item.hasOwnProperty("_op_") ? item["_op_"].substring(0,3).toLowerCase() : null;

    if ( op && op == 'del' ) {

      addCollectionItem(result["deleted_items"], item, false, function (err, res) {
        if ( err ) {
          err.item = item;
          result.delete_errors.push(err);
        }
        else {
          result.deleted += 1;
        }
      });

    } // if _op_ : del
    else {
      // not to be deleted
      addCollectionItem(result["collection"], item, false, function (err, res) {
        if ( err ) {
          err.item = item;
          result["new_errors"].push(err);
        }
        else {
          result.new_items += 1;
        }
      });
    }

  } // for

  // re-index only if items were deleted
  if ( result.deleted_items > 0 ) {

    reindexCollection(result["collection"], function (err, res) {

      if ( err ) {
        result["caller"] = " -- purgeCollection <- reindexCollection";

        return callback ? callback(result) : result;
      }
      else {
        result["collection"]["collection"] = res;

        return callback ? callback(null, result) : result;
      }
    });
  }
  else {
    // no deletes
    return callback ? callback(null, result) : result;
  }

}

function writeCollectionToFile (file, col, callback) {
  // write a collection to a file; attempt to create file if it doesn't exist
  // a callback function is required

  var fs = require('fs'),
    err = null;

  col = col || newCollection(file); // if collection not supplied, use an empty one

  err = file && file.length > 0 ? null : 'A file name to write the collection to is required';
  err = err || utils.validateCollection(col);
  err = err || utils.validateObject(callback, null, 'A callback function is required as the last parameter');

  if ( err ) {
    err = new Error(err + ' -- writeCollectionToFile');
    return callback(err);
  }  

  // default collection name to file name
  col["name"] = col["name"].length > 0 ? col["name"] : file;

  // from here on, only callback return is sensible
  fs.open(file, 'w+', function (err, FH) {
    // w+ = read/write, create if no file or truncate existing file

    if ( err ) {
      return callback(err);
    }

    fs.close(FH);

    // TO DO - CHECK : stringify the collection before storing ? 
    // TO DO - Provide secure write version (ie encrypts data first)

    try {
      col = JSON.stringify(col);
    }

    catch (err) {
      return callback(err);
    }

    // ok to save collection in a file
    fs.writeFile(file, col, {encoding: 'utf8'}, function (err) {

      if ( err ) {
        return callback(err);
      }

      // success - return the data that was saved
      return callback(null, col); 
    });

  });

}

function readCollectionFromFile (file, callback) {
  // get a collection from a file; assume file exists ... or error
  // a callback is required

  var fs = require('fs'),
    col = null,
    err = null;

  err = file && file.length > 0 ? null : 'A collection file name is required';
  err = err || utils.validateObject(callback, null, 'A callback function is required as the last parameter');

  if ( err ) {
    err = new Error(err + ' -- readCollectionFromFile');
    return callback(err);
  }  

  fs.readFile(file, {encoding: 'utf8'}, function (err, data) {

    if ( err ) {
      return callback(err);
    }

    // attempt to parse data if available
    try {
      col = data && data.length > 0 ? JSON.parse(data) : null;
    }

    catch (e) {
      return callback(e);
    } // else

    return callback(null, col);
  });

}

function writeCollectionToDb (dbCon, col, name, callback) {
  // write a WHOLE collection to the database using bulkOp (from db.js);
  // only changed and new items are written - like this:
  // new item (new): upsert; changed item (mod): upsert; deleted (del): remove;
  // unchanged (non) / unknown status: ignore

  var err = null,
    colName = name;

  err = utils.validateObject(dbCon, null, 'An established database connection is required');
  err = err || utils.validateCollection(col);

  if( !err && ( !colName || colName.length < 1) ) {
    colName = col["name"] && col["name"].length > 0 ? col["name"] : null;
    err = colName && colName.length > 0 ? null : "Please specify the name of a collection to save the data in";
  } 

  if ( err ) {
    err = new Error(err + ' -- writeCollectionToDb');
    return callback ? callback(err) : err;
  }  

  // iterate and separate items into different functional groups

  var upserts = [],
    deletes = [],
    change = null,
    item = null,
    total = col["collection"].length,
    dbUtils = require('./jdb');

  //    changes : none, new, mod, del 
  console.log('Total: ', total);

  for (var i = 0; i < total; i++ ) {

    item = col["collection"][i];
    change = item["_op_"] && item["_op_"].length > 0 ? item["_op_"].substring(0,3).toLowerCase() : null;
    console.log("change ", i, ': ', change );

    switch (change) {

      case "non":  // do nothing
        break; 

      case "new":  // upsert or insert
      case "mod":  // upsert
        upserts.push(item);
        break; 

      case "del":  // delete
        deletes.push(item);
        break;

      default:
        // do nothing
        break; 
    }

  } // for

  // perform op
  if ( total > 0 && (deletes.length > 0 || upserts.length > 0) ) {

    console.log('Upserts: ', upserts.length, '; Deletes: ', deletes.length, '; Col name: ', colName);

    dbUtils.bulkOp (dbCon, colName, upserts, deletes, false, function (err, res) {
      if ( err ) {
        err["caller"] = '-- bulkOp <- writeCollectionToDb';

        console.log('Db write error: ', err);
        return callback(err);
      }

      console.log("Batch result ", require('util').inspect(res, {showHidden:false, depth:null}));
      console.log('Inserted: ', res.nInserted, 'Upserted: ', res.nUpserted, 'Mod: ', res.nModified);

      console.log('Db wrote; inserts: \n', upserts, '\ndeletes\n', deletes, '\n');

      // if there were deletes, purge collection
      if ( deletes.length > 0 ) {

        purgeCollection(col, function (err, res) {

          if ( err ) {
            err["caller"] = '-- purgeCollection <- bulkOp <- writeCollectionToDb';
            return callback(err);
          }

          return callback(null, res);
        });

      } // if deletes
      else {
        return callback(null, col);
      }

    });

  } // if perform op
  else {
    // nothing to do ?
    return callback(null, col);
  }

}

function readCollectionFromDb (dbCon, colName, callback) {
  // read collection name 'colName' from DB using a find method from (from db.js);
  // set _op_ to 'none' (non) for all items; then re-index

  var err = null;

  err = utils.validateObject(dbCon, null, 'An established database connection is required');

  if( !err && ( !colName || colName.length < 1) ) {
    err = "Please specify the name of the collection to read data from";
  } 

  if ( err ) {
    err = new Error(err + ' -- readCollectionFromDb');
    return callback ? callback(err) : err;
  }  

  // iterate and separate items into different functional groups

  var col = newCollection(colName), // data will be stored here
    dbUtils = require('./jdb');

  dbUtils.find (dbCon, colName, {}, function (err, res) {

    if ( err ) {
      err["caller"] = '-- readCollectionFromDb';

      console.log('Db read error: ', err);
      return callback ? callback(err) : err;
    }

    col["collection"] = res;

    // reset _op_ to 'no op' (non)
    for (var i = 0, tot = col["collection"].length; i < tot; i++ ) {
      col["collection"][i]["_op_"] = 'non';
    }

    // create index for the collection
    reindexCollection(col, function (err, res) {

      if ( err ) {
        err["caller"] = " -- readCollectionFromDb <- reindexCollection";

        return callback ? callback(err) : err;
      }

      return callback ? callback(null, res) : res;
    });

  }); // find

}



// export object
var result = {
    newCollection : newCollection,    
    reindexCollection : reindexCollection, 
    addCollectionItem : addCollectionItem, 
    getCollectionItemById : getCollectionItemById,
    upsertCollectionItem : upsertCollectionItem,
    deleteCollectionItem : deleteCollectionItem,
    purgeCollection : purgeCollection,
    writeCollectionToFile : writeCollectionToFile,
    readCollectionFromFile : readCollectionFromFile,
    writeCollectionToDb : writeCollectionToDb,
    readCollectionFromDb : readCollectionFromDb,

}



module.exports = result;


/*

TESTING ...

var c = addCollectionItem(null, {_id: 'justin', name: 'My name'}, false);
console.log('c: ', c);

addCollectionItem(c.collection, {_id: 'justin2', name: 'My name2'}, true, function (err, col) {
  c = col;
	console.log('Err: ', err);
	console.log('Col: ', col);
});

console.log('c now: ', c);

console.log('id justin2: ', getCollectionItem(c, 'justin2'));

writeCollectionToFile('test3.json', c, function (err, data) {
  console.log('write err: ', err);
  console.log('write result: ', data);

  if ( !err ) {

    var r = null;
    readCollectionFromFile('test3.json', function (err, data) {
      console.log('CB err: ', err);
      //console.log('CB result: ', data);

      if (!err) {
        r = data;

        console.log('Read from file:\n', r);

        require('./jconn').getConnection(function(err, cnn) {
          if (err) {
            console.log('con err: \n', err);
          }
          else {
            writeCollectionToDb (cnn, r, 'test3', 20, function (err, res) {
              if (err) {
                console.log('Write to db test err: \n', err);
              }
              else {
                console.log('Write to db test success: \n', res);
              }
            });
          }
        });
      }

    });

  } // err after write to file

});


//  collection: [{_id: 1, name: 'J Godd'}, {_id: 9, name: 'bad item'}]

var col = {
  name: 'testing',
  index: {'1': 0, 10: 1, 9: 2, },
  collection: [
      {_id: 1, name: 'J Godd', _op_: 'del'},
      {_id: 10, name: 'item id 10', _op_: 'mod'}, 
      {_id: 9, name: 'bad item'}, 
      {_id: 5, name: 'good new item', _op_: 'new'}, 
      {_id: 6, name: 'Item number 8. This is item number 8', _op_: 'new'}, 
      {_id: 3, _op_: 'del'},
      {_id: 4, _op_: 'mod'},
      {_id: 'y', name: 'Justin', _op_: 'mod'},
    ]
};



//reindexCollection (col, function (err, res) {
//addCollectionItem(col, {_id: 8, name: 'item 10',}, false, function (err, res) {
//getCollectionItemById (col, 9, function (err, res) {
//upsertCollectionItem (col, {name: 'John Goss', _id: '9',}, function (err, res) {
//deleteCollectionItem (col, 10, function (err, res) {
//purgeCollection (col, function (err, res) {
//writeCollectionToFile ('test4.json', col, function (err, res) {
readCollectionFromFile ('test5.json', function (err, res) {

  if ( err ) {
    console.log('Error: ', err);
  }
  else {
    console.log('Res: ', res);
  }
});


require('./jconn').getConnection( function (err, con) {
  if ( err ) {
    console.log('Con err', err);
    return;
  }

  //writeCollectionToDb (con, col, '', function (err, res) {
  readCollectionFromDb (con, col.name, function (err, res) {
    if (err) {
      console.log("Error: ", err);
    }
    else {
      console.log("Res: ", res);
      //console.log('New col: ', res.collection);
    }
  });

});

*/

