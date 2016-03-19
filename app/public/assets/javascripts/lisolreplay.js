// Lisol Replay - v0.0.1
// May 2015
/*
 * Copyright (c) 2015 Lisol Ltd
 * Author Justin Njoh
*/
'use strict';

var lisolReplay = ( function () {

  // local globs
  var my_name = null,
    my_email = null,
    my_code = null,
    uid = null,
    room = null,

    rights = {
      host : 0,
      can_post : 0,
    },
    session = {
      host_organisation : "",
      host_name : "Amy Goss",
      host_image : "0.jpg",
      session_name : "Amy's party",
      start_time : Date.now(),
      end_time : Date.now(),
      url : "",
      host_email : "",
    },

    btnSend = document.getElementById('btnSend'),
    rpl_name_error = document.getElementById('rpl_name_error'),
    rpl_msg = document.getElementById('rpl_msg'),
    rpl_title = document.getElementById('rpl_title'),
    rpl_room = document.getElementById('rpl_room'),
    rpl_room_ctn = document.getElementById('rpl_room_ctn'),
    rpl_ctr_guests = document.getElementById('rpl_ctr_guests'),
    rpl_ctr_likes = document.getElementById('rpl_ctr_likes'),
    rpl_ctr_wishes = document.getElementById('rpl_ctr_wishes'),
    rpl_mode_ssn = document.getElementById('rpl_mode_ssn'),
    btn_mode_ssn = document.getElementById('btn_mode_ssn'),
    rpl_mode_pln = document.getElementById('rpl_mode_pln'),
    btn_mode_pln = document.getElementById('btn_mode_pln'),
    rpl_wishes = document.getElementById('rpl_wishes'),
    rpl_wishes_cnt = document.getElementById('rpl_wishes_cnt'),
    rpl_likes = document.getElementById('rpl_likes'),
    rpl_likes_cnt = document.getElementById('rpl_likes_cnt'),
    rpl_plan = document.getElementById('rpl_plan'),
    rpl_plan_cnt = document.getElementById('rpl_plan_cnt'),
    rpl_resources = document.getElementById('rpl_resources'),
    rpl_resources_cnt = document.getElementById('rpl_resources_cnt'),

    rpl_board = document.getElementById('rpl_board'),
    rpl_info = document.getElementById('rpl_info'),
    rpl_cmd = document.getElementById('rpl_cmd'),
    rpl_cmd_cnt = document.getElementById('rpl_cmd_cnt'),

    rpl_hdn = document.getElementById('rpl_ifr'),
    rpl_ifr = document.getElementById('rpl_ifr');

  var port = window.location.port,
      socket = io.connect(':' + port + '/party');  // name space = party

  // web cam-related; initialised & destroyed at run-time
  var cam_stream = null,
    cam_canvas = null,
    cam_video = null,
    cam_btn_vga = null,
    cam_btn_hd = null,
    cam_btn_snap = null,
    cam_btn_share = null,
    canvas_width = 480,
    canvas_height = 360,
    cam_caption = "",

    media_constraints = {
      audio: false,
      video: true,      
    },

    vga_constraints = {
      video: {
        mandatory: {
          minWidth: 640,
          minHeight: 360,
          maxWidth: 640,
          maxHeight: 360
        }
      }
    },

    hd_constraints = {
      video: {
        mandatory: {
          minWidth: 1280,
          minHeight: 720,
          maxWidth: 1280,
          maxHeight: 720
        }
      }
    };

  navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  // if present, log debug messages in this <ul> container, else use console.log
  var debug = document.getElementById('debug');


  // command processing
  var command = {
    'names' : {
      'cmd' : 'cmd',
      'prv' : 'prv',
    },
    'verbs' : {
      'uid' : 'uid',
      'like' : 'like',
      'wish' : 'wish',
      'plan' : 'plan',
      'message' : 'message',
      'msg' : 'message',
  	  'image' : 'image',
      'cam' : 'image',
  	  'url' : 'url',
      'stats' : 'stats',
  	  'video' : 'video',
  	  'audio' : 'audio',
      'name' : 'name',
  	  'username' : 'username',
  	  'password' : 'password',
  	  'login' : 'login',
  	  'unblock' : 'unblock',
  	  'grant' : 'grant',
  	  'revoke' : 'revoke',
  	  'info' : 'info',
      'rsc' : 'rsc',
    }
  }



  // form event handlers - STARTS
  rpl_cmd.onchange = function (e) {
    var cmd = rpl_cmd.options[rpl_cmd.selectedIndex].value;
    cmd = cmd && cmd.length > 0 ? cmd : 'msg';

    switch ( cmd ) {

      case 'msg':
      case 'info':
        rpl_title.classList.add('hidden');
        rpl_msg.classList.remove('title');
        rpl_msg.classList.remove('hidden');
        break;

      case 'url':
        rpl_title.classList.remove('hidden');
        rpl_msg.classList.add('title');
        rpl_msg.classList.remove('hidden');
        break;

      case 'cam':
        showCam();
        rpl_title.classList.add('hidden');
        rpl_msg.classList.add('hidden');
        break;

      case 'evadd':
        eventForm();
        break;

    }
  }

  function showCam() {
    // shows cam in board area
    var html = "<div class='row' style='margin-right: 0;'>" +
        "<div class='col-md-6 col-sm-12 cam-cnt'>" +
        "<video id='cam_video' class='cam' autoplay></video>" +
        "<span class='btn-quality-cnt'>" +
        "<button class='btn btn-info btn-sm btn-quality' id='cam_btn_vga'>Normal Quality</button>" +
        "<button class='btn btn-info btn-sm btn-quality' id='cam_btn_hd'>HD Quality</button>" +
        "<button class='btn btn-info btn-sm btn-snap' id='cam_btn_snap'><i class='fa fa-camera fa-sm'></i> Snap</button>" +
        "</span>" +
        "</div>" +
        "<div class='col-md-6 col-sm-12 cam-cnt'>" +
        "<canvas id='cam_canvas' class='cam border'></canvas>" +
        "<span>" +
        "<input class='text-line no-pad' id='cam_caption' name='caption' placeholder='Caption'>" +
        "<button class='btn btn-info btn-sm btn-share' id='cam_btn_share'><i class='fa fa-share-alt fa-sm'></i> Share</button>" +
        "</span>" +
        "</div>" +
        "</div>";

    rpl_board.innerHTML = html;

    initCam();
  }

  // form event handlers - ENDS



  // camera / media - STARTS

  function getMedia (constraints) {
    if ( cam_stream ) {
      cam_video.src = null;
      cam_stream.stop();
    }

    navigator.getUserMedia (
        constraints,
        mediaSuccessCallback,
        mediaErrorCallback
      );  
  }

  function mediaErrorCallback (err) {
    cam_btn_snap.disabled = true;
    cam_btn_share.disabled = true;

    rpl_info.innerHTML = "<span class='text-danger'>" +
      "A camera source was not found" +
      "</span>";

    console.log('navigator.getUserMedia error: ', err);
  }

  function mediaSuccessCallback (strm) {
    window.stream = strm; // stream available to console

    if ( strm ) {
      cam_stream = strm;

      if ( window.URL ) {
        cam_video.src = window.URL.createObjectURL(strm);
      }
      else {
        cam_video.src = strm;
      }

      cam_btn_snap.disabled = false;

      rpl_info.innerHTML = "<span class='text-success'>" +
        "Adjust quality and click snap to take a picture" +
        "</span>";
    }
    else {
      console.log('No media stream to show (mediaSuccess...)');
    }
  }

  function vgaQuality () {
    getMedia (vga_constraints);
  }

  function hdQuality () {
    getMedia (hd_constraints);
  }

  function snap (can, vid) {
    if ( vid.src ) {
      can.getContext('2d')
          .drawImage(vid, 0, 0, can.width, can.height);

      cam_btn_share.disabled = false;
    }
    else {
      console.log('No video source (snap)');
    }
  }

  function share (can) {
    // upload image by soc emitting 'image'
    var data = can.toDataURL("image/png"),
        title = cam_caption ? cam_caption.value.trim() : '';

    title = title.length > 0 ? title : 'Image';

    var msg = makeMsg (title, data, 'image', 'cmd');

    console.log('Image msg: ', msg);

    sendMsg(msg, 'image');
  }

  function initCam () {
    // set vars / get dom containers
    cam_video = document.getElementById('cam_video'),
    cam_btn_vga = document.getElementById('cam_btn_vga'),
    cam_btn_hd = document.getElementById('cam_btn_hd'),
    cam_btn_snap = document.getElementById('cam_btn_snap'),
    cam_canvas = document.getElementById('cam_canvas'),
    cam_caption = document.getElementById('cam_caption'),
    cam_btn_share = document.getElementById('cam_btn_share');

    cam_canvas.height = canvas_height;
    cam_canvas.width = canvas_width;

    cam_btn_share.disabled = true;
    cam_btn_snap.disabled = true;

    cam_btn_vga.onclick = function (e) {
      vgaQuality();
    }

    cam_btn_hd.onclick = function (e) {
      hdQuality();
    }

    cam_btn_snap.onclick = function (e) {
      snap(cam_canvas, cam_video);
    }

    cam_btn_share.onclick = function (e) {
      share(cam_canvas);
    }


    getMedia (media_constraints);
  }



  // camera / media - ENDS




  // utilities - START

  function getTimeString(d) {
    // returns 24 hr time string from the date object
    var t = d.getHours() > 9 ? d.getHours() : '0' + d.getHours();
    t += d.getMinutes() > 9 ? ':' + d.getMinutes() : ':0' + d.getMinutes();
  
    return (t);
  }

  function fireEvent (elem, ev) {
    // fire the event ev on the DOM element elem
    var ev = new window.Event(ev);
    elem.dispatchEvent(ev, true);
  }

  function scrollBottom (elem) {
    // scroll to the bottom of this element
    elem.scrollTop = elem.scrollHeight;
  }


  function getCommandName (str) {
    // return the command associated with str
    // cmd names are used when issuing commands directly (eg command line)
    // eg cmd url http://www.lisol.co.uk

    var res = null;
    if ( command.names.hasOwnProperty(str) ) {
      res = command.names[str];
    }

    return (res);
  }

  function getCommandVerb (str) {
    // return the command verb associated with str
    var res = null;
    if ( command.verbs.hasOwnProperty(str) ) {
      res = command.verbs[str];
    }

    return (res);
  }


  function logMsg(msg) {

    if ( debug ) {
  	  var dt = new Date(),
  	    li = document.createElement("li");

      li.innerHTML = dt.toUTCString() + ': ' + msg;

  	  debug.appendChild(li);
    }
    else {
    	console.log(msg);
    }
  }

  function getRoom () {
    // get and set room name, if not already set
    var result = room;
    if ( ! result ) {
      result = window.location.pathname.split('\/');
      if ( result.length > 2 ) {
        result = result[2];
        room = result;
      }
    }

    //console.log('Room is: ', room);

    return (result);
  }



  var utils = {
    logMsg : logMsg,

  }

  // utilities - END


  // messaging - START

  function initSession() {
    // after user has been validated, the info to init session is available
    var rpl_host_image = document.getElementById('rpl_host_image'),
      rpl_host_name = document.getElementById('rpl_host_name'),
      rpl_session_name = document.getElementById('rpl_session_name'),
      html = "";

    console.log('Init sess: ', session, ' Rights: ', rights, ' Img: ', rpl_host_image, ' Sess: ', rpl_session_name);

    if ( rpl_host_image && session.host_image.length > 0 ) {
      rpl_host_image.src = "/assets/images/users/" + session.host_image;
    }

    if ( rpl_host_name ) {
      if ( session.host_organisation.length > 0 ) {
        html = "<h5 class='media-heading'>" + session.host_organisation + "</h5>";
      }

      html += "<p>Hosted by: " + session.host_name + "</p>";

      rpl_host_name.innerHTML = html;
    }

    if ( rpl_session_name ) {
      var start = new Date(session.start_time),
        end = new Date(session.end_time);

      html = "<h4>" + session.session_name + " - " +
        start.toDateString() + " " + getTimeString(start) + " - "
        + getTimeString(end) + "</h4>";

      if ( session.url.length > 0 ) {
        html += "<a href='" + session.url + "' target='_new'>" +
          session.url + "</a>"
      }

      rpl_session_name.innerHTML = html;
    }

    // session layout
    if ( rights.host == 1 ) {
      btn_mode_pln.classList.remove('hidden');
      btn_mode_ssn.classList.remove('hidden');

      rpl_cmd.classList.remove('hidden');
      rpl_mode_pln.classList.remove('hidden');
      rpl_mode_ssn.classList.add('hidden');
    }
    else {
      // not a host
      btn_mode_pln.classList.add('hidden');
      btn_mode_ssn.classList.add('hidden');

      rpl_mode_pln.classList.add('hidden');
      rpl_cmd.classList.add('hidden');

      rpl_mode_ssn.classList.remove('hidden');
    }

  }

  socket.on('message', function (msg) {

    if ( msg ) {
      console.log('Message received', msg);
      processMsg(msg);
    }

  });


  function makeMsg (title, data, verb, cmd) {
    // returns a message object
    var object = {
        'uid' : uid,
        'room' : getRoom(),
        'sender' : my_name,
        'date' : new Date(),
        'cmd' : cmd,
        'verb' : verb,
        'data' : data,
        'title' : title,
      };

    return object;
  }

  function getName() {
    // get name and other initial details - prior to initialising a session
    var object = makeMsg ('', null, 'message', 'cmd'),
      elem = null,
      data = {}; 

    elem = document.getElementById('my_name');
    if ( elem ) {
      data["name"] = elem.value.trim();
    }

    elem = document.getElementById('my_code');
    if ( elem ) {
      data["code"] = elem.value.trim();
    }

    elem = document.getElementById('my_email');
    if ( elem ) {
      data["email"] = elem.value.trim();
    }

    object["data"] = data;

    return (object);
  }

  function getMsg(elem) {
    // get and process message in msg input
    // return object ready to be displayed or sent down a socket
    var object = makeMsg ('', null, 'message', 'cmd'),
      m = elem ? elem.value.trim() : rpl_msg.value.trim(),
      title = rpl_title.value.trim();

    // cmd ?
    if ( rpl_cmd ) {
      var c = rpl_cmd.options[rpl_cmd.selectedIndex].value;
      if ( c && c.length > 0 ) {
        m = "cmd " + c + " " + m;
      }
    }

    object.data = m;
    object.title = title;

    if ( m && m.length > 0 ) {
      var m_split = m.split(/\s+/),
        com = m_split[0],
        vrb = m_split.length > 0 ? m_split[1] : null;

      //console.log('Split to: ', m_split);

      com = getCommandName(com.toLowerCase());
      if ( com && vrb ) {
        // this was a command, so get the verb
        vrb = getCommandVerb(vrb.toLowerCase());

        if ( vrb ) {
          // verb was found as well
         var m = m.replace(m_split[0], '').
                  replace(m_split[1], '');

          // if url, test validity
          if ( vrb == 'url' ) {
            try {

      var html = "<iframe onload='' src='" + m.trim() + "' class='player'></iframe>"; 
      rpl_board.innerHTML = html;

            }
            catch (e) {
              console.log('Error url: ', e);              
            }
          }

          object.data = m.trim();
          object.cmd = com;
          object.verb = vrb;
        }
      }
    }

    console.log('Msg Object: ', object);

    return (object);
  }


  function moveDOMObject (obj, dir) {
    // move this DOM object up (dir 'up') or down (dir 'dwn')
    //console.log('Move: ', obj, '; Dir: ', dir);
    //console.log('Prev: ', obj.previousSibling, '; Next: ', obj.nextSibling);

    if ( obj && dir ) {
      switch ( dir ) {

        case 'dwn':
          if ( obj.parentNode && obj.nextSibling ) {
            obj.parentNode.insertBefore(obj.nextSibling, obj);
          }
          break;

        case 'up':
          if ( obj.parentNode && obj.previousSibling ) {
            obj.parentNode.insertBefore(obj, obj.previousSibling);
          }
          break;

        default:
          // do nothing

      }
    }
  }


  function removeDOMObject (obj, level) {
    // remove this DOM object; by removing from its parent
    // level is 1 for parentNode, 2 for parentNode.parentNode, etc
    if ( obj && level ) {
      switch ( level ) {

        case 1:
          if ( obj.parentNode ) {
            obj.parentNode.removeChild(obj);
          }
          break;

        case 2:
          if ( obj.parentNode.parentNode ) {
            obj.parentNode.parentNode.removeChild(obj.parentNode);
          }
          break;

        default:
          // do nothing

      }
    }
  }

  function getFeedback (obj) {
    // obj = object that triggered this action; cmd and act [like, wish, ] are in this object;
    // msg data is in the parent node

    //console.log('Object: ', obj);
    //console.log('Object parent: ', obj.parentNode);

    if ( obj ) {

      var cmds = obj.dataset,
          act = cmds && cmds.hasOwnProperty('act') ? cmds.act : null,
          cmd = cmds && cmds.hasOwnProperty('cmd') ? cmds.cmd : null,
          dat = obj.parentNode.dataset,
          msg = makeMsg (dat.title, dat.data, dat.verb, dat.cmd);

      console.log('Cmd: ', cmd, '; Act: ', act);

      // cmd can be 'cmd', 'frm' (server bound) or 'prev' (local)
      switch ( cmd ) {

        case 'frm':
          // form processing
          switch (act) {

            case 'evsave':  // add / update event form
              addEvent();
              break;


          } // act switch ends

          break;

        case 'cmd':
          if ( act && act.length > 0 ) {
            // send action to server for processing
            msg.act = act;

            //console.log('Sending feedback: ', msg);

            if ( act == 'shr' ) {
              // share to all
              msg.act = '';
              sendMsg(JSON.stringify(msg), 'message');
            }
            else {
              sendMsg(JSON.stringify(msg), 'feedback');
            }
          }

          // certain actions require more action
          switch ( act ) {
            case 'unwish':
            case 'unlike':
              removeDOMObject(obj, 2);
              break;

            default:
              // do nothing
          }
          break;

        case 'prev':

          switch (act) {

            case 'up':
            case 'dwn':
              moveDOMObject(obj.parentNode, act);
              break;

            case 'rsc':
              _verbRsc(msg);
              break;

            case 'plan':
              _verbPlan(msg);
              break;

            case 'unplan':
            case 'unrsc':
              removeDOMObject(obj, 2);
              break;

            case 'modssn':
            case 'modpln':
              setMode(act);
              break;


            default:
              // everything else goes to msg processor
              // just process the message WITHOUT the feedback command (act)
              //msg.act = '';

              processMsg(JSON.stringify(msg));
              break;
          } // act

        default:
          // nothing for now

      } // switch

    } // if obj

    //console.log('Data: ', dat);
  }


  function if_onload() {
    console.log('IFRAME LOADING');
    //http://stackoverflow.com/questions/26488468/
  }


  function sendMsg (m, emit_type) {
    if ( m ) {
      socket.emit(emit_type, m);
      rpl_msg.value = '';

      return false;
    }
  }

  function processMsg (m) {
    // process message from server
    // ??? in case of command 'prev', this message may be local ???
    // m (message): cmd, sender, date, data, ip(??)

    var msg = m ? JSON.parse(m) : null;

    console.log('Processing: ', m);

    if ( msg && msg.data && msg.data.length > 0 ) {
      //var verb = getCommandVerb(msg.verb.toLowerCase());

      // verb is act (action) if it is specified
      var verb = msg.hasOwnProperty('act') && msg.act.length > 0 ? msg.act : msg.verb;
      verb = getCommandVerb(verb.toLowerCase());

      //console.log('verb: ', verb);

      switch ( verb ) {

        case 'uid':
          //uid = uid || msg.uid;
          //console.log('Set uid to: ', uid);
          _verbuid(msg);
          break;

        case 'message':
          _chatMsg(msg);
          break;

        case 'name':
          _setName(msg);
          break;

        case 'url':
          _verbURL(msg);
          break;

        case 'stats':
          _verbStats(msg);
          break;

        case 'image':
          _verbImage(msg);
          break;

        case 'info':
          _verbInfo(msg);
          break;

        case 'like':
          _verbLike(msg);
          break;

        case 'wish':
          _verbWish(msg);
          break;

        case 'rsc':
          _verbRsc(msg);
          break;



        case 'plan':
          _verbPlan(msg);
          break;



        default:
          logMsg('Unknown verb [' + verb + ']');

      }
    } // msg & data

  }


  function _verbuid(m) {
    // set uid, check room and if set, release validation/auth name button
    uid = uid || m.uid;
    console.log('Set uid to: ', uid);

    var err = uid && uid.length > 0 ? '' : 'Socket not initialised';
    if ( !room || room.length < 1 ) {
      err += err.length > 0 ? '; Session not properly initialised - please ensure you clicked on the right URL' : 'Session not properly initialised - please ensure you clicked on the right URL';
    }

    if ( err.length > 0 ) {
      rpl_name_error.innerHTML = err;
    }
    else {
      btnName.disabled = false;
      rpl_name_error.innerHTML = '';
    }
  }

  function addNodeData (n, m, cls) {
    // adds dataset data from message (m)
    var node = n ? n : null;

    if ( node && m ) {
      if ( cls && cls.length > 0 ) {
        node.setAttribute('class', cls);
      }

      node.setAttribute('data-title', m["title"]);
      node.setAttribute('data-verb', m["verb"]);
      node.setAttribute('data-data', m["data"]);
      node.setAttribute('data-cmd', m["cmd"]);
    }

    return (node);
  }

  function makeFeedbackButtons (m) {
    // returns feedback buttons about resource m for display
    var btns = "<button class='btn btn-info btn-sm btn-feedback' data-act='rsc' data-cmd='prev'>" +
        "<i class='fa fa-folder fa-sm'></i> Resource</button>";

    if ( rights.host == 0 ) {
      // if not in planning mode, show all buttons
      btns = "<button class='btn btn-info btn-sm btn-feedback' data-act='like' data-cmd='cmd'>" +
        "<i class='fa fa-heart fa-sm'></i> Like</button>" +
        "<button class='btn btn-info btn-sm btn-feedback' data-act='wish' data-cmd='cmd'>" +
        "<i class='fa fa-star fa-sm'></i> Wish list</button>" +
        btns;
    }

    btns = "<div class='feedback' data-title='" + m["title"] + "' data-verb='" + m["verb"] +
        "' data-data='" + m["data"] + "' data-cmd='" + m["cmd"] + "'>" + btns + "</div>";

    return (btns);
  }

  function setMode (md) {
    // set mode to 'md' (modssn or modpln)
    switch (md) {

      case 'modssn': // switch to session mode

        if ( rpl_mode_ssn ) {
          btn_mode_ssn.classList.add('hidden');
          rpl_mode_ssn.classList.remove('hidden');

          btn_mode_pln.classList.remove('hidden');
          rpl_mode_pln.classList.add('hidden');
        }
        else {
          logMsg('Session mode not found');
        }

        break;

      case 'modpln': // switch to plan mode
        if ( rpl_mode_pln ) {
          btn_mode_pln.classList.add('hidden');
          rpl_mode_pln.classList.remove('hidden');

          btn_mode_ssn.classList.remove('hidden');
          rpl_mode_ssn.classList.add('hidden');
        }
        else {
          logMsg('Plan mode not found');
        }

        break;

    }
  }

  function eventForm (ev) {
    // create an add / edit event form; if ev is passed then edit it
    var data = ev || {
          'id' : '',
          'host_email' : session.host_email || my_email, 
          'host_name' : session.host_name || my_name,  
          'session_name' : session.session_name.replace("'", "\\"),  
          'host_organisation' : session.host_organisation, 
          'host_image' : session.host_image,  
          'start_time' : new Date(session.start_time), 
          'end_time' : '', 
          'duration' : 60, 
          'url' : session.url, 
          'access' : 0, 
        };

    var html = "<h3>Add or edit an event</h3>" +
      "<input id='event_id' value='" + data.id + "' type='hidden'>" +
      "<input id='host_email' value='" + data.host_email + "' type='hidden'>" +
      "<div id='error_msg' class='text-warning'></div>" +
      "<div class='row'>" +
      "<div class='col-md-6'>" +
      "<div class='event-form'>" +
      "<span>Event name <br /> <input type='text' id='session_name' class='text-line margin-bottom8 no-pad block' value='" + data.session_name + "'></span>" +
      "<span>Start time</span> <br /> <input type='text' id='start_time' class='date text-line margin-bottom8 no-pad block' value='" + data.start_time.toDateString() + "'>" +
      "<span>Duration (minutes)</span> <br /> <input type='text' id='session_duration' class='text-line margin-bottom8 no-pad block' value='60'>" +
      "</div> </div>" +
      "<div class='col-md-6'>" +
      "<div class='event-form'>" +
      "<span>Your name</span> <br />  <input type='text' id='host_name' class='text-line margin-bottom8 no-pad block' value='" + data.host_name + "'>" +
      "<span>Your organisation</span> <br /> <input type='text' id='host_organisation' class='text-line margin-bottom8 no-pad block' value='" + data.host_organisation + "'>" +
      "<span>Website</span> <br /> <input type='text' id='url' class='text-line margin-bottom8 no-pad block' value='" + data.url + "'>" +
      "</div>" + 
      "</div>" +
      "</div>" +
      "<button class='btn btn-info btn-sm btn-feedback center-block' type='button' data-cmd='frm' data-act='evsave'>Save</button>";

    rpl_board.innerHTML = html;
  }

  function indicateError (elem, cls, err_text) {
    // utility to pre-pend err_text to inner HTML of elem
    var ret = false;

    err_text = err_text && err_text.length > 0 ? err_text : '**';
    cls = cls && cls.length > 0 ? cls : 'text-warning';

    if ( elem ) {
      var err = "<span class='" + cls + "'>" + err_text + "</span> ",
        html = elem.innerHTML;

      html.replace(err, '');
      html = err + html;

      elem.innerHTML = html;

      ret = true;
    }

    return (ret);
  }

  function addEvent () {
    // get event data from form
    var data = {},
      key = null,
      value = null,
      err = 0,
      error_msg = document.getElementById('error_msg');

    if ( error_msg ) {
      // remove any previously displayed arrors
      error_msg.innerHTML = '';
    }

    key = document.getElementById('event_id');
    data.id = key ? key.value : '';

    key = document.getElementById('session_name');
    data.session_name = key ? key.value : '';
    if ( data.session_name.length < 1 ) {
      err += 1;
      indicateError(key.parentNode, null,  '**required');
    }

    key = document.getElementById('host_name');
    data.host_name = key ? key.value : '';
    if ( data.host_name.length < 1 ) {
      err += 1;
      indicateError(key.parentNode, null,  '**required');
    }

    key = document.getElementById('url');
    data.url = key ? key.value : '';

    key = document.getElementById('host_email');
    data.host_email = key ? key.value : '';

    key = document.getElementById('host_organisation');
    data.host_organisation = key ? key.value : '';
    if ( data.host_organisation.length < 1 ) {
      err += 1;
      indicateError(key.parentNode, null,  '**required');
    }

    key = document.getElementById('start_time');
    data.start_time = key ? key.value : '';
    if ( data.start_time.length < 1 ) {
      err += 1;
      indicateError(key.parentNode, null,  '**required');
    }

    key = document.getElementById('session_duration');
    data.session_duration = key ? key.value : 60;

    data.access = 0; // not used currently; guests must supply the correct ref / key
    data.host_image = ''; // not used currently;

    if ( err > 0 ) {
      key = document.getElementById('error_msg');
      indicateError(key, null, 'Please correct errors and re-submit');
    }
    else {
      // no errors
      var msg = makeMsg ('Add or update event', data, 'admin', 'cmd');
      msg.act = 'evsave';

      console.log('Event msg: ', msg);

      sendMsg(JSON.stringify(msg), 'admin');
    }

    return err > 0 ? false : true;
  }




  function _verbRsc (m) {
    // save m as a resource
    //console.log('Saving resource : ', m);
    if ( rpl_resources ) {
      var li = addNodeData(document.createElement('li'), m, 'feedback'),
        title = m.title && m.title.length > 0 ? m.title : m.data,
        html = "<button class='btn btn-info btn-sm btn-feedback' data-act='unrsc' data-cmd='prev'>" +
            "<i class='fa fa-close fa-sm'></i></button>" +
            "<button class='btn btn-info btn-sm btn-feedback' data-act='plan' data-cmd='prev'>" +
            "<i class='fa fa-play fa-sm'></i></button>" +
            "<button class='btn btn-info btn-sm btn-feedback' data-act='up' data-cmd='prev'>" +
            "<i class='fa fa-arrow-up fa-sm'></i></button>" +
            "<button class='btn btn-info btn-sm btn-feedback' data-act='dwn' data-cmd='prev'>" +
            "<i class='fa fa-arrow-down fa-sm'></i></button>" +
            "<a href='#' class='btn-feedback' data-act='prev' data-cmd='prev'> " + title + "</a>";

      li.innerHTML = html;
      rpl_resources.appendChild(li);

      if ( rpl_resources_cnt ) {
        scrollBottom(rpl_resources_cnt);
      }

    }
    else {
      logMsg('No resources box for: ' + JSON.stringify(m));
    }

  }

  function _verbInfo (m) {

    // splash message in board
    if ( rpl_board ) {

      var html = "<div class='mood'>" +
        m.data + "</div>";

      var btns = addNodeData(document.createElement('div'), m, 'feedback');
      btns.innerHTML = makeFeedbackButtons(m);

      rpl_info.innerHTML = '';
      rpl_info.appendChild(btns);

      rpl_board.innerHTML = html;
      rpl_msg.value = '';

      rpl_cmd.selectedIndex = 0; // messages
      fireEvent(rpl_cmd, 'change'); 
    }
    else {
      logMsg('No board for splash: ' + JSON.stringify(m));
    }

  }

  function _setName (m) {
    // set logged in user's details in the session
    var user = m.hasOwnProperty('user') ? m.user : null;
    if ( user ) {
      my_name = user.name;
      my_email = user.email;
      my_code = user.code
    }

    var elem = document.getElementById('my_name');
    if ( elem ) {
      elem.value = '';
    }

    rpl_room.innerHTML = '';

    _chatMsg(m);

    elem = document.getElementById('rpl_msg_box');
    if ( elem ) {
      elem.classList.remove('hidden');
    }

    // info
    rpl_info.innerHTML = 'Hi ' + my_name + ' - welcome.';


    // set up info
    if ( m.hasOwnProperty('rights') ) {
      rights = m.rights;
    } 

    if ( m.hasOwnProperty('session') ) {
      session = m.session;
    } 

    initSession();

  }

  function _chatMsg(m) {

    // place message in chat room
    if ( rpl_room ) {

      var dt = new Date(m.date),
        li = document.createElement("li"),
        title = m.title.length > 0 ? "<strong>" + m.title + "</strong> <br />" : "";

      var html = "";

      if ( rights.host == 1 ) {
        html = "<span data-title='" + m["title"] + "' data-verb='" + m["verb"] +
          "' data-data='" + m["data"] + "' data-cmd='cmd'>" +
          "<a href='#' class='btn-feedback' data-act='rsc' data-cmd='prev'>" +
          "<i class='fa fa-folder fa-sm'></i></a> ";
      }
      else {
        html = "<span><i class='fa fa-user'></i> ";
      }

      li.innerHTML = html +
        dt.toLocaleTimeString() + ' ' +
        m.sender + "</span> <br />" +
        title +
        m.data;

      rpl_room.appendChild(li);
      if ( rpl_room_ctn ) {
        scrollBottom(rpl_room_ctn);
      }

      rpl_msg.value = '';
      rpl_title.value = '';
    }
    else {
      logMsg('No room: ' + JSON.stringify(m));
    }

  }

  function _verbPlan (m) {
    // user wants to place this item in the planmer
    if ( rpl_plan ) {
      var li = addNodeData(document.createElement('li'), m, 'feedback'),
        title = m.title && m.title.length > 0 ? m.title : m.data,
        html = "<button class='btn btn-info btn-sm btn-feedback' data-act='unplan' data-cmd='prev'>" +
            "<i class='fa fa-close fa-sm'></i></button>" +
            "<button class='btn btn-info btn-sm btn-feedback' data-act='up' data-cmd='prev'>" +
            "<i class='fa fa-arrow-up fa-sm'></i></button>" +
            "<button class='btn btn-info btn-sm btn-feedback' data-act='dwn' data-cmd='prev'>" +
            "<i class='fa fa-arrow-down fa-sm'></i></button>" +
            "<button class='btn btn-info btn-sm btn-feedback' data-act='shr' data-cmd='" + m.cmd + "'>" +
            "<i class='fa fa-share-alt fa-sm'></i></button>" +
            "<a href='#' class='btn-feedback' data-act='prev' data-cmd='prev'> " + title + "</a>";

      li.innerHTML = html;
      rpl_plan.appendChild(li);

      if ( rpl_plan_cnt ) {
        scrollBottom(rpl_plan_cnt);
      }

    }
    else {
      logMsg('No likes box for: ' + JSON.stringify(m));
    }
  }

  function _verbLike (m) {
    // user has liked an item - place it in their likes box
    if ( rpl_likes ) {
      var li = addNodeData(document.createElement('li'), m, 'feedback'),
        title = m.title && m.title.length > 0 ? m.title : m.data,
        html = "<button class='btn btn-info btn-sm btn-feedback' data-act='unlike' data-cmd='cmd'>" +
            "<i class='fa fa-close fa-sm'></i></button>" +
            "<a href='#' class='btn-feedback' data-act='prev' data-cmd='prev'> " + title + "</a>";

      li.innerHTML = html;
      rpl_likes.appendChild(li);

      if ( rpl_likes_cnt ) {
        scrollBottom(rpl_likes_cnt);
      }

    }
    else {
      logMsg('No likes box for: ' + JSON.stringify(m));
    }
  }

  function _verbWish (m) {
    // user has wished an item - place it in their wishes box
    if ( rpl_wishes ) {
      var li = addNodeData(document.createElement('li'), m, 'feedback'), 
        title = m.title && m.title.length > 0 ? m.title : m.data,
        html = "<button class='btn btn-info btn-sm btn-feedback' data-act='unwish' data-cmd='cmd'>" +
            "<i class='fa fa-close fa-sm'></i></button>" +
            "<a href='#' class='btn-feedback' data-act='prev' data-data='" + m.data + "' data-cmd='prev'> " + title + "</a>";

      li.innerHTML = html;
      rpl_wishes.appendChild(li);

      if ( rpl_wishes_cnt ) {
        scrollBottom(rpl_wishes_cnt);
      }

    }
    else {
      logMsg('No likes box for: ' + JSON.stringify(m));
    }
  }

  function _verbURL (m) {

    var url = m.data && m.data.length > 0 ? m.data : null;

    if ( rpl_board && url ) {
      if ( url.indexOf('://') == -1 ) {
        url = window.location.protocol + "//" + url;
      }

      var html = "<iframe src='" + url + "' class='player'></iframe>"; 
      rpl_board.innerHTML = html;

      rpl_msg.value = '';
      rpl_title.value = '';

      var btns = addNodeData(document.createElement('div'), m, 'feedback');

      btns.innerHTML = makeFeedbackButtons(m);

      rpl_info.innerHTML = '';
      rpl_info.appendChild(btns);
      rpl_cmd.selectedIndex = 0; // messages

      fireEvent(rpl_cmd, 'change'); 
    }
    else {
      logMsg('No board: ' + JSON.stringify(m));
    }

  }

  function _verbImage (m) {

    // url is image name at this stage
    var url = m.data && m.data.length > 0 ? m.data : null;

    if ( rpl_board && url && url.length > 0 ) {
      url = window.location.protocol + "//" +
        window.location.host + "/events/" + m.room + "/images/" + url;

      var html = "<div>" +
        "<img src='" + url + "' class='' />" +
        "</div>"; 
      rpl_board.innerHTML = html;

      rpl_msg.value = '';

      var btns = addNodeData(document.createElement('div'), m, 'feedback');
      btns.innerHTML = makeFeedbackButtons(m);

      rpl_info.innerHTML = '';
      rpl_info.appendChild(btns);
      rpl_cmd.selectedIndex = 0; // messages

      fireEvent(rpl_cmd, 'change'); 
    }
    else {
      logMsg('No board or image: ' + JSON.stringify(m));
    }

  }

  function _verbStats (msg) {
    // show stats
    if ( msg.hasOwnProperty('wishes') ) {
      // assume other stats are there - this is a stats msg
      rpl_ctr_wishes.innerHTML = msg.wishes;
      rpl_ctr_likes.innerHTML = msg.likes;
      rpl_ctr_guests.innerHTML = msg.guests;
    }
  }

  
  var messaging = {
    processMsg : processMsg,
    getMsg : getMsg,
    getName : getName,
    sendMsg : sendMsg,
    getFeedback : getFeedback,

  }


  // messaging - END


  // place all public functions in this object like this:
  // function_name : function_name
  var public_functions = {
    utils : utils,
    messaging : messaging,

  };

  getRoom();
  return (public_functions);

})
()
