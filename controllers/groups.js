/*jslint node: true, nomen: true, indent: 2 */

'use strict';

/*
 * Groups controller
 */

// var async     = require('async');
var Q         = require('q');
var Group     = require('../models/group');
var User      = require('../models/user');
var realTime  = require('../controllers/web-sockets');

function displayGroup(req, res) {
  console.log('displayGroup');
}

function joinGroup(req, res) {
  // check if already joined (refresh)
  if (req.body.pseudo === req.session.userPseudo) {
    console.log('already here!');
    User.remove({
      pseudo: req.session.userPseudo,
      groupId: req.session.groupId
    }, function () {
      console.log('deleted!');
      realTime.sockets.in(req.session.groupId).emit('leaving', {
        action: 'leaving',
        id: req.session.userId
      });
      // req.flash('success', 'Goodbye!');
      req.session = null;   // "fin" session
      res.redirect('/');
    });
  } else {
    // else create, register, etc…
    Q
      .all([
        User.create({ pseudo: req.body.pseudo, groupId: req.body.groupId }),
        Group.findById(req.body.groupId).exec()
      ])
      .spread(function (user, group) {

        // set cookies for next time (homepage)
        res.cookie('pseudo', user.pseudo);
        // save session informations (pour quoi faire si pas de rechargement possible du groupe ? Peut-être mis dans le "render" ?)
        req.session.userId = user._id;
        req.session.userPseudo = user.pseudo;
        req.session.userStatus = user.status;
        req.session.groupId = group._id;
        req.session.groupName = group.name;

        // notify all the users (may be should use broadcast ?)
        realTime.sockets.in(req.session.groupId).emit('joining', {
          action: 'joining',
          id: req.session.userId,
          pseudo: req.session.userPseudo
        });

        // Get the content of the group
        Q
          .all([
            User.getServing(req.body.groupId),
            User.getPending(req.body.groupId),
            User.getWatching(req.body.groupId)
          ])
          .then(function (results) {
            res.render('group', {
              server: results[0],
              penders: results[1],
              watchers: results[2]
            });
          });
      });
  }
}
function handleGroup(req, res) {
  // si pas de methode additionnelle (DELETE ou PUT)
  var method = req.query._method || 'POST';

  switch (method) {
  case 'DELETE':
    User.findByIdAndRemove(req.session.userId, function () {
      realTime.sockets.in(req.session.groupId).emit('leaving', {
        action: 'leaving',
        id: req.session.userId
      });
      // req.flash('success', 'Goodbye!');
      req.session = null;   // "fin" session
      res.redirect('/');
    });
    break;
  }
}

module.exports = function queueController(app) {
  app.post('/groups', joinGroup);
  // finalement, pas de display direct via GET... On "join" via POST et puis c'est tout !
  // Sinon, on repasse par la case départ :)))
  app.route('/groups/:id')
    // .get(displayGroup)
    .get(function (req, res) {
      req.session = null;
      res.redirect('/');
    })
    .post(handleGroup);
};


/*
Utilisation de 'async' (ancien code, remplacé par Q et ses promises…)

# Note
async permet d'exécuter plusieurs fonctions asynchrones en parallèle et d'effectuer leur callback ensemble, à la fin !

Les méthodes .create(), .findById() ou .exec() (mongoose) peuvent être utilisées avec un callback (optionnel). Sinon, elles renvoient respectivement une <Promise> ou la <query>

Dans notre cas, notre propre méthode .getName(), qui renvoie .exec(), n'utilise pas de callback ! Il n'est donc pas utilisable avec "async" (j'ai pas trouvé)…
Il faut donc "dupliquer" la méthode .getName(), ce qui est un peu bête…

```
getName: function getNameQueue(id) {
  return this
    .findById(id)
    .exec();
}
```
async.parallel(
  {
    user: function (callback) {
      User.create({ pseudo: req.body.pseudo, groupId: req.body.groupId }, callback);
    },
    group: function (callback) {
      Group.findById(req.body.groupId, callback);
    }
  },
  function (error, result) {
    // do stuff after all
  }
);
*/
