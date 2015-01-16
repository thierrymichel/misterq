/*jslint browser: true, devel: true, node: true, nomen: true, indent: 2 */
/*global jQuery, io */

(function ($) {
  'use strict';

  var $group,
    groupId,
    $getIn,
    $getOut;

  function initGroup() {

    var url = $group.data('q-url');

    groupId = $group.data('q-group');
    $getIn = $('.get-in');
    $getOut = $('<a href="#" class="get-out">cancel</a>').hide();

    /*
     * window handling
     */
    // alerte en cas refresh, close, etoussa
    window.onbeforeunload = function () {
      var msg = 'You will leave the group!';
      return msg;
    };
    // et redirect en cas de refresh
    $(window).on('unload', function () {
      console.log('bye bye…');
      window.location = 'http://localhost:8080/';
    });
    // sauf lorsqu'on clique sur LEAVE
    $('.leave').on('submit', function () {
      // e.preventDefault();
      window.onbeforeunload = null;
      $(window).off('unload');
    });



    /*
     * Controls settings
     */

    // add hidden "cancel" link
    $group.find('.active').append($getOut);

    // get in/out the queue
    // get the ID of the clicked item
    // hide the clicked link/button
    // post ajax call
    $getIn.add($getOut).on('click', function (e) {
      e.preventDefault();

      var $this = $(this),
        action = $this.attr('class'),
        userId = $this.parent('li').data('q-id'),
        actionURL = url;

      if (action === 'get-out') {
        actionURL += '?_method=DELETE';
      }

      console.log(action);

      $this.hide();
      $.post(
        actionURL,
        {
          groupId: groupId,
          userId: userId
        }
      );
    });
  }

  /*
   * Sockets settings
   */
  function initSockets() {
    // var socket = io.connect('http://localhost:8080');
    var socket = io.connect('http://localhost:8080');
    socket
      .on('connect', function () {
        console.log('register');
        // join the right ROOM (= groupId)
        socket.emit('register', { group: groupId });
      })
      // when some user JOIN the group -> added to the watching list
      .on('joining', function (data) {
        console.log(data.action);
        $('.group__watching .list').append('<li data-q-id="' + data.id + '">' + data.pseudo + '</li>');
      })
      // or LEAVE -> removed from any list
      .on('leaving', function (data) {
        console.log(data.action);
        $('[data-q-id="' + data.id + '"]').fadeOut(300, function () {
          $(this).remove();
        });
      })
      // or GET-IN the queue -> from watching to pending
      .on('pending', function (data) {
        console.log(data.action);

        $('[data-q-id="' + data.id + '"]').fadeOut(300, function () {
          $(this)
            .prepend('<strong class="ticket">' + data.ticket + '</strong>')
            .appendTo('.group__pending .list')
            .fadeIn(300);
          $getOut.show();
        });
      })
      // or GET-OUT the queue -> from pending to watching
      .on('watching', function (data) {
        console.log(data.action);

        $('[data-q-id="' + data.id + '"]').fadeOut(300, function () {
          $(this).find('.ticket').remove();
          $(this)
            .appendTo('.group__watching .list')
            .fadeIn(300);
          $getIn.show();
        });
      });
  }

  function init() {
    $group = $('.group');
    if ($group.length) {
      initGroup();
      initSockets();
    }
  }

  init();

}(jQuery));
