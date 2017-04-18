var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

//session
app.use(session({secret: 'YOLO, no FOMO', cookie: { maxAge: 60000 } }));

app.get('/', util.restrict,
function(req, res) {
  res.render('index');
});

app.get('/create', util.restrict,
function(req, res) {
  res.render('index');
});

app.get('/links', util.restrict,
function(req, res) {
  Links.reset().query({where: {userId: req.session.userID}}).fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links', util.restrict,
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri , userId: req.session.userID}).fetch().then(function(found) {
    if (found) {
      //console.log(found.attributes);
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin,
          userId: req.session.userID
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/signup', function(req, res) {
  res.render('signup');
})

app.post('/signup',
function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({ username: username }).fetch().then(function(found) {
    if (found) {
      res.status(403).send('Username already exists');
    } else {
      Users.create({
        username: username,
        password: password
      })
      .then(function(newUser) {
        req.session.userID = newUser.attributes.id;
        return newUser.save()
      })
      .then(function() {
        res.redirect('/');
      });
    }
  });
});

app.get('/login', function(req, res) {
  res.render('login');
})

app.post('/login', function(req, response) {
  var username = req.body.username;
  var password = req.body.password;

  new User({ username: username }).fetch().then(function(found) {
    if (found) {
      bcrypt.compare(password, found.attributes.password, function(err, isPasswordCorrect) {
        if (!isPasswordCorrect) {
          response.redirect('/login');
        } else {
          console.log(found, 'this is found @@@@@@@@@@@@@@@@')
          req.session.userID = found.attributes.id;
          response.redirect('/')
        }
      })
    } else {
      response.redirect('/login');
    }
  });
})

app.get('/logout', function(req, res) {
  //clear session
    //redirect to login page
  req.session.destroy(function(){
    res.redirect('/login');
  });
})
/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
