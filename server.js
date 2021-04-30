const express = require('express');
const Handlebars = require('handlebars');
const exphbs = require('express-handlebars');
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');

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
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// Make user global object
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Load passport strategies (Facebook, Google, Local)
require('./passport/facebook');
require('./passport/google');
require('./passport/local');

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

app.post('/signup', (req, res) => {
  let errors = [];

  if (req.body.password !== req.body.password2) {
    errors.push({ text: 'Password does NOT match' });
  }

  if (req.body.password.length < 5) {
    errors.push({ text: 'Password must be at least 5 characters' });
  }

  if (errors.length > 0) {
    res.render('newAccount', {
      errors:errors,
      title: 'Error',
      fullname: req.body.username,
      email: req.body.email,
      password: req.body.password,
      password2: req.body.password2
    });
  } else {
    User.findOne({email: req.body.email})
    .then((user) => {
      if (user) {
        let errors = [];
        errors.push({text: 'Email already exists'});
        res.render('newAccount', {
          title: 'Signup',
          errors:errors
        });
      } else {
        var salt = bcrypt.genSaltSync(10);
        var hash = bcrypt.hashSync(req.body.password, salt);
        const newUser = {
          fullname: req.body.username,
          email: req.body.email,
          password: hash
        }
        new User(newUser).save((err, user) => {
          if (err) {
            throw err;
          }
          if (user) {
            let success = [];
            success.push({text: 'You have successfully created account. You can now login!'});
            res.render('home', {
              success: success
            });
          }
        });
      }
    });    
  }
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/profile',
  failureRedirect: '/loginErrors'
}));

app.get('/loginErrors', (req, res) => {
  let errors = [];
  errors.push({text: 'User not found or Password incorrect!'});
  res.render('home', {
    errors:errors
  });
});

// handle get route
app.get('/uploadImage', (req, res) => {
  res.render('uploadImage', {
    title: 'Upload'
  });
});

app.post('/uploadAvatar', (req, res) => {
  User.findById({_id:req.user._id})
    .then((user) => {
      user.image = req.body.upload;
      user.save((err) => {
        if (err) {
          throw err;
        } else {
          res.redirect('/profile');
        }
      })
    })
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
