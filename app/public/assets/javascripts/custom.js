// custom ui javascripts

$(document).ready( function() {
  var replay = lisolReplay;

  // toggle menus
  $(document).on('click', '.menu-toggler', function (e) {
    $('#menu').toggleClass("list-inline");
    //$('#menu').toggleClass("menu-vertical");
    $('#menu').toggleClass("visible-md-inline-block");
    $('#menu').toggleClass("visible-lg-inline-block");
    $('#menu').toggleClass("visible-sm-inline-block");

    return false;
  });


  $('#btnSend').click( function (e) {
    var elem = document.getElementById('rpl_msg');
    var m = replay.messaging.getMsg(elem);
    if ( m ) {
      console.log('Got msg: ', m);

      replay.messaging.sendMsg(JSON.stringify(m), 'message');
    }
  });

  $('#btnName').click( function (e) {
    //var elem = document.getElementById('my_name');
    //var m = replay.messaging.getMsg(elem);

    var m = replay.messaging.getName();
    if ( m ) {
      console.log('Got name: ', m);
      replay.messaging.sendMsg(JSON.stringify(m), 'name');
    }
  });

  $("#rpl_msg").keyup ( function (e) {
    if ( e.keyCode == 13 ) {
      $("#btnSend").click();
    }
  });

  $("#rpl_title").keyup ( function (e) {
    if ( e.keyCode == 13 ) {
      $("#btnSend").click();
    }
  });

  $("#my_name").keyup ( function (e) {
    if ( e.keyCode == 13 ) {
      $("#btnName").click();
    }
  });

  $(document).on('click', '.btn-feedback', function (e) {
    e.preventDefault();
    replay.messaging.getFeedback(this);
  });



  (function show_splash() {
  	var text = '';

  	$('.points').each( function () {
      text = $(this).data('text')
      if ( text && text.length > 0 ) {
        text = "<i class='fa fa-check'> " + text;
        $(this).hide().html(text).show(1200);
      }
  	});

    //setTimeout('$(".p1").show(800)', 5000);

  })();


  $(document).on('focusin', '.date', function (e) {
    e.preventDefault();
    $(this).datetimepicker({
      format: 'Y-m-d H:i',
    });
  })



//replay.utils.errorSound();

});

