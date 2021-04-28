const express = require('express');
const Handlebars = require('handlebars');
const exphbs = require('express-handlebars');
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// Load models
const Message = require('./models/message');
const User = require('./models/user');

const app = express();

// Load keys file
const Keys = require('./config/keys');

// Load helpers
const { requireLogin, ensureGuest } = require('./helpers/auth');

// Use body-parser middleware
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

// Configuration for authentication
app.use(cookieParser());
app.use(session({
  secret: 'mySecret',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// Make user global object
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Load social strategies (Facebook, Google)
require('./passport/facebook');
require('./passport/google');

// Connect to mongodb
mongoose.connect(Keys.MongoDB,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
  }).then(() => {
  console.log('Server is connected to MongoDB.');
}).catch((err) => {
  console.log(err);
});

// Environment variable for port
const port = process.env.PORT || 3000;

// Set up view engine

app.engine('handlebars', exphbs({
  defaultLayout:'main',
  handlebars: allowInsecurePrototypeAccess(Handlebars)
}));
app.set('view engine', 'handlebars');

// Set up bootstrap

app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/js', express.static(__dirname + '/node_modules/@popperjs/core/dist/umd')); // redirect JS jQuery
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap
app.use('/css', express.static(__dirname + '/node_modules/bootstrap-icons/font/')); // redirect CSS bootstrap-icons

// setup express static folder to serve js, css, and images files
app.use(express.static('assets'));

app.get('/', ensureGuest, (req,res) => {
  res.render('home',{
    "title": "Home"
  });
});

app.get('/about', ensureGuest, (req, res) => {
  res.render('about', {
    "title": "About"
  });
});

app.get('/contact', ensureGuest, (req, res) => {
  res.render('contact', {
    "title": "Contact"
  });
});

app.get('/auth/facebook', passport.authenticate('facebook', {
  scope: ['email']
}));
app.get('/auth/facebook/callback', passport.authenticate('facebook',{
  successRedirect: '/profile',
  failureRedirect: '/' 
}));

app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile']
}));
app.get('/auth/google/callback', passport.authenticate('google', {
  successRedirect: '/profile',
  failureRedirect: '/'
}));

app.get('/profile', requireLogin, (req, res) => {
  User.findById({_id:req.user._id}).then((user) => {
    if (user) {
      user.online = true;
      user.save((err, user) => {
        if (err) {
          throw err
        } else {
          res.render('profile', {
            title: 'Profile',
            user: user
          });
        }
      });
    }
  });
});

app.get('/newAccount', (req, res) => {
  res.render('newAccount', {
    title: 'Signup'
  });
});

app.get('/logout', (req, res) => {
  User.findById({_id:req.user._id})
  .then((user) => {
    user.online = false;
    user.save((err, user) => {
      if (err) {
        throw err;
      }
      if (user) {
        req.logout();
        res.redirect('/');        
      }
    });
  });
});

app.post('/contactUs', (req, res) => {
  console.log(req.body);
  const newMessage = {
    fullName: req.body.fullName,
    email: req.body.email,
    message: req.body.message,
    date: new Date()
  }
  new Message(newMessage).save((err, message) => {
    if(err){
      throw err;
    } else {
      Message.find({}).then((messages) => {
        if(messages){
          res.render('newmessage', {
            title: "Sent",
            messages: messages
          });
        } else {
          res.render('nomessage', {
            title: "Not found"
          });
        }
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
