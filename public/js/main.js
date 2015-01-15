/*jslint browser: true, devel: true, node: true, nomen: true, indent: 2 */
/*global jQuery, io */

(function ($) {
  'use strict';

  var $group,
    groupId;

  function initGroup() {

    var url = $group.data('q-url'),
      $getIn = $('.get-in'),
      $getOut = $('<a href="#" class="get-out">cancel</a>').hide();

    groupId = $group.data('q-group');

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
    $group.find('.active').append($getOut);

    $getIn.on('click', function (e) {
      e.preventDefault();
      console.log('get-in');

      $getIn.hide();
      $group.data('q-status', 'pending');

      $.post(
        url
      );
    });

    $getOut.on('click', function (e) {
      e.preventDefault();
      console.log('get-out');

      $getIn.show();
      $group.data('q-status', 'watching');

      $.post(
        url + '?_method=DELETE'
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
        socket.emit('register', { group: groupId });
      })
      .on('joining', function (data) {
        console.log(data.action);
        $('.group__watching .list').append('<li data-q-id="' + data.id + '">' + data.pseudo + '</li>');
      })
      .on('leaving', function (data) {
        console.log(data.action);
        $('[data-q-id="' + data.id + '"]').fadeOut(300, function () {
          $(this).remove();
        });
      })
      .on('pending', function (data) {
        console.log(data.action);
        $('[data-q-id="' + data.id + '"]').fadeOut(300, function () {
          $(this)
            .appendTo('.group__pending .list')
            .fadeIn(300)
            .filter('.active')
            .find('.get-out')
            .show();
        });
      })
      .on('watching', function (data) {
        console.log(data.action);
        $('[data-q-id="' + data.id + '"]').fadeOut(300, function () {
          $(this)
            .appendTo('.group__watching .list')
            .fadeIn(300)
            .filter('.active')
            .find('.get-out')
            .hide();
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
