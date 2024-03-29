var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(partials());
  app.use(express.bodyParser())
  app.use(express.static(__dirname + '/public'));

  app.use(express.cookieParser('SECRET'));
  app.use(express.session());
});

// app.get('/', function(req, res) {
//   res.render('index');
// });

// app.get('/create', function(req, res) {
//   res.render('index');
// });

// app.get('/links', function(req, res) {
//   Links.reset().fetch().then(function(links) {
//     res.send(200, links.models);
//   });
// });

// app.post('/links', function(req, res) {
//   var uri = req.body.url;

//   if (!util.isValidUrl(uri)) {
//     console.log('Not a valid url: ', uri);
//     return res.send(404);
//   }

//   new Link({ url: uri }).fetch().then(function(found) {
//     if (found) {
//       res.send(200, found.attributes);
//     } else {
//       util.getUrlTitle(uri, function(err, title) {
//         if (err) {
//           console.log('Error reading URL heading: ', err);
//           return res.send(404);
//         }

//         var link = new Link({
//           url: uri,
//           title: title,
//           base_url: req.headers.origin
//         });

//         link.save().then(function(newLink) {
//           Links.add(newLink);
//           res.send(200, newLink);
//         });
//       });
//     }
//   });
// });

/************************************************************/
// Write your authentication routes here
/************************************************************/

var restrict = function (req, res, next) {

  if (req.session.user_id) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
};

app.get('/', restrict, function(req, res) {
  res.render('index');
});

app.get('/links', function(req, res) {
  Links.query('where', 'user_id', '=', req.session.user_id).fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.get('/login', function (req, res) {
  res.render('login');
});

app.get('/signup', function (req, res) {
  res.render('signup');
});



app.post('/signup', function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username, password: password}).fetch().then(function (found) {
    if (found) {
      res.redirect('/login');
    } else {
      var user = new User ({
        username: username,
        password: password
      });

      user.save().then(function(model){
        req.session.regenerate(function(){
          console.log(model);
          console.log(model.attributes);
          req.session.user_id = model.attributes.id;
          res.redirect('/');
        });
      });
    }
  });
});

app.post('/login', function (req, res) {
  // query validity of login from user table
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username}).fetch().then(function (user) {
    console.log('test database', user.attributes.password);

    if (user.attributes.password === password) {

      console.log('pass ?')
      req.session.regenerate(function(){

        req.session.user_id = user.attributes.id;

        res.redirect('/');

      });
    }
  });
});


// app.get('/links', function(req, res) {
//   Links.reset().fetch().then(function(links) {
//     res.send(200, links.models);
//   });
// });


app.post('/links', restrict, function (req, res) {
  var uri = req.body.url;
  console.log('this is the request body', req.body);
  var user_id = req.session.user_id;
  if (!util.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.send(404);
  }

  new Link({ url: uri, user_id: user_id}).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          user_id: user_id,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});


// app.get('/create', function(req, res) {
//   res.render('index');
// });



  // console.log(username + password);
  // if (!util.isValidUrl(uri)) {
  //   console.log('Not a valid url: ', uri);
  //   return res.send(404);
  // }















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
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
