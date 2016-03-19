
// module : utils; exposes : various utilities
// Copyright (c) 2015 Lisol Ltd
// Author: Justin Njoh, May 2015

'use strict';

// general utilities - start

function guid () {
    // generates a guid

    var g ='',
        m = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
        i = 0,
        c = '',
        r = '',
        v = '',
        u = '',
        rb = Math.random() * 0xffffffff | 0;

    while ( i++ < 36 ) {
        c = m[i-1];
        r = rb & 0xf;
        v = c == 'x' ? r : ( r & 0x3 | 0x8 );

        u += ( c == '-' || c == '4' ) ? c : v.toString(16);
        rb = i%8 == 0 ? Math.random()*0xffffffff | 0 : rb >> 4;
    }

    return u;
}

function randomNumber(min, max) {
    // return a random number between min and max

    return Math.floor(Math.random() * (max - min)) + min;
}

function checkPath (root, path, mode, create, callback) {
    // check for existence of path; create if needed (default mode = 644)

    var pth = require('path'),
      fs = require('fs');

    //var p = process.argv[2];
    //console.log(path.normalize(p));

    // set defaults
    root = root && root.length > 0 ? root : __dirname;
    mode = mode && mode.length > 0 ? mode : 644;

    root = pth.normalize(root);
    path = pth.normalize(path);

    var delim = "/";  // default to *nix
    delim = path.length > 0 && path.indexOf("\\") > 0 ? "\\" : delim;

    //console.log('Root: ', root, '; path: ', path, '; delim: ', delim, '; mode: ', mode, '; create: ', create);

    var folders = path.split(delim);

    for ( var i = 0, tot = folders.length; i < tot; i ++ ) {
        root += delim + folders[i];
        if ( !fs.exists(root) ) {
            if ( create ) {
                fs.mkdir(root, mode, function (err) {
                    if ( err ) {
                        err["caller"] = "checkPath";
                        return callback(err);
                    }
                });
            }
            else {
                return callback(new Error('Path [' + root + '] not found --checkPath'));
            }
        }
    }

    return callback(null);
}



// general utilities - start



// validation utilities - start

function objectIsEmpty (obj) {
    // return true if object is empty; relies test for stringified {} length = 2
    // if obj is null, then it is empty

    var empty = typeof(obj) == 'undefined' || !obj;

    if ( !empty ) {
        try {
            empty = JSON.stringify(obj).length <= 2;
        }

        catch (e) {
            // if there was an error, there must be something in the object
            empty = false;
        }
    }

    return empty;
}

function validateObject (obj, regex, err_msg) {
    // check that this is a valid object or literal, ie is NOT null
    // if regex is passed, match it as well if this is NOT an object

    var err = obj ? null : err_msg || 'Invalid object';
    if ( !err && regex && typeof(obj) != 'object' ) {
        err = obj.toString().match(regex) ? null : err_msg || 'Invalid object';
    }

    return (err);
}

function validateObjectProperty (obj, prop, regex, err_msg) {
    // check that this valid object has the given property, ie is NOT null
    // and, if regex is passed, match its value as well

    var err = obj.hasOwnProperty(prop) ? null : err_msg || 'Invalid property';
    //err = err || (regex && obj[prop].toString().match(regex) ? null : err_msg || 'Invalid value');
    if ( !err && regex ) {
        err = obj[prop] && obj[prop].toString().match(regex) ?
            null : err_msg || 'Invalid value';
    }

    return (err);
}

function validateObjectProperties (obj, props) {
    // overkill ? for an object, validate the properties passed
    // properties are an array of objects {prop, rule, err}
    // eg {property: name, rule: /\w/, error_msg: 'Inavlid ..'}, {property: age, ...}
    // exit on first error

    var err = props && Array.isArray(props) ? null :
        'An array of property objects (property, rule, error_msg) is expected';

    var i = 0, tot = props.length,
        prop = null, regex = null, msg = null;

    while ( !err && i < tot ) {
      prop = props[i].hasOwnProperty('property') ? props[i].property : null;
      regex = props[i].hasOwnProperty('rule') ? props[i].rule : null;
      msg = props[i].hasOwnProperty('error_msg') ? props[i].error_msg : null;

      err = validateObjectProperty (obj, prop, regex, msg);
      i += 1;
    }

    return (err);
}

function validateCollection (col) {
  // check whether or not this is a valid jcollection
  // jcollection structure is { name: <optional>, index: <{auto}>, collection: [{}] }

  var err = null;

  err = validateObject(col, null, 'A collection is required');
  err = err || validateObjectProperty(col, 'collection', null, 'Invalid collection - the data storage part is missing');

  return (err);
}

// validation utils - end


// objects - starts

function getObjectPropertyValue (obj, prop, deflt) {
    // return value of this property for this object, or the default
    // result is {error_msg: <err if obj or prop not defined>, value: <val or default>}

    var result = { error_msg: null, value: null};

    result.error_msg = validateObject(obj, null, 'Object passed is not defined');
    result.error_msg = result.error_msg ||
        validateObjectProperty(obj, prop, null, 'Property [' + prop + '] does not exist');

    result["value"] = result.error_msg ? null : obj[prop] || deflt;

    return result;
}



// objects - end




// dates - starts

function dateAdd (dte, interval, amount) {
  // return new date after adding (or subtracting, or setting) an amount (eg 1 day, 2 years)
  // date = string (eg 2015-01-09); amount always defaults to 1; 
  // interval prefixes; + means add; eg +year = add <amount> years; - means subtract; eg -year
  // no prefixes means set; eg year = set year;
  // intervals are 2 character tokens as follows: ye[ear] = year; mo(nth) = month; we(ek) = 7 days;
  // da(y) = day; ho(ur) = hour; mi(nute) = minute; se(cond) = second

  // assume parameters have been validated at least for existence
  
  var date = null, error_msg = null;

  try {
    date = new Date(dte);
  }

  catch (e) {
    return { date: null, error_msg: e.message };
  }

console.log('date: ', date);

  if ( !interval || interval.length < 1 ) {
    error_msg = 'Provide a suitable interval - eg +year, -month';
    return { date: null, error_msg: error_msg };
  }

  amount = !amount || isNaN(amount) ? 1 : parseInt(amount, 10);

  // only the first 2 characters are needed, and case doesn't matter
  interval = interval.match(/^\+|-/) ? interval.substring(0, 3) : interval.substring(0, 2);
  interval = interval.toLowerCase();

  switch (interval) {
    case '+ye':
      date.setYear( date.getFullYear() + amount );
      break;

    case 'ye':
      date.setYear(amount);
      break;

    case '-ye':
      date.setYear( date.getFullYear() - amount );
      break;

    case '+mo':
      date.setMonth( date.getMonth() + amount );
      break;

    case 'mo':
      date.setMonth( amount );
      break;

    case '-mo':
      date.setMonth( date.getMonth() - amount );
      break;

    case '+we':
      date.setDate( date.getDate() + (7*amount) );
      break;

    case 'we':
      date.setDate( 7*amount );
      break;

    case '-we':
      date.setDate( date.getDate() - (7*amount) );
      break;

    case '+da':
      date.setDate( date.getDate() + amount);
      break;

    case 'da':
      date.setDate( amount );
      break;

    case '-da':
      date.setDate( date.getDate() - amount);
      break;

    case '+ho':
      date.setHours( date.getHours() + amount);
      break;

    case 'ho':
      date.setHours( amount );
      break;

    case '-ho':
      date.setHours( date.getHours() - amount);
      break;

    case '+mi':
      date.setMinutes( date.getMinutes() + amount);
      break;

    case 'mi':
      date.setMinutes( amount );
      break;

    case '-mi':
      date.setMinutes( date.getMinutes() - amount);
      break;

    case '+se':
      date.setSeconds( date.getSeconds() + amount);
      break;

    case 'se':
      date.setSeconds( amount );
      break;

    case '-se':
      date.setSeconds( date.getSeconds() - amount);
      break;

  }

  return { date: date.toISOString(), error_msg: null };
}



// dates - end




// to export
var result = {
	guid : guid,
    checkPath : checkPath,
    randomNumber : randomNumber,

    objectIsEmpty : objectIsEmpty,
    validateObject : validateObject,
    validateObjectProperty : validateObjectProperty,
    validateObjectProperties : validateObjectProperties,
    validateCollection : validateCollection,

    getObjectPropertyValue : getObjectPropertyValue,

};


module.exports = result;


/*

// testing 

var obj = {
  name : 'this ia a message',
  name2 : 'h',
  age: '10',
};

//console.log(objectIsEmpty (obj));
//console.log(validateObjectProperty (obj, 'name', /./, 'This is an error'));
//console.log(validateObjectProperties (obj, [{property: 'age', rule: /\d+/, error_msg: 'A numeric age is required'}, {property: 'name2', rule: /\w/, error_msg: 'Name 2 is required' }]));

var d = '2015--22',
  interval = 'mo',
  amount = 2;

console.log( dateAdd (d, interval, amount) );

*/
