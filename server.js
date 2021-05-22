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
const formidable = require('formidable');
const moment = require('moment');

// Load models
const Message = require('./models/message');
const User = require('./models/user');
const Chat = require('./models/chat');
const Smile = require('./models/smile');
const Post = require('./models/post');

const app = express();

// Load keys file
const Keys = require('./config/keys');

// Load Stripe Module
const stripe = require('stripe')(Keys.StripeSecretKey);

// Load helpers
const { requireLogin, ensureGuest } = require('./helpers/auth');
const { uploadImage } = require('./helpers/aws');
const { getLastMoment } = require('./helpers/moment');
const { walletChecker } = require('./helpers/wallet');

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
const hbs = exphbs.create({
  defaultLayout: 'main',
  handlebars: allowInsecurePrototypeAccess(Handlebars),

  /* Custom helpers */
  helpers: {
    if_eq: function (a, b, opts) {
      if (a == b) {
        return opts.fn(this);
      } else {
        return opts.inverse(this);
      }
    },
    getLastMoment: getLastMoment,
    dateFormat: function (date, options) {
      const formatToUse = (arguments[1] && arguments[1].hash && arguments[1].hash.format) || "DD/MM/YYYY"
      return moment(date).format(formatToUse);
    },
    formatTime: function(date, format){
      let mTime = moment(date);
      return mTime.format(format);
    },
    now: function() {
      return new Date();
    }
  }
});

app.engine('handlebars', hbs.engine);
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
    title: 'Ikaze'
  });
});

app.get('/about', ensureGuest, (req, res) => {
  res.render('about', {
    title: 'Abo turi bo'
  });
});

app.get('/contact', ensureGuest, (req, res) => {
  res.render('contact', {
    title: 'Twandikire'
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

// Display User Profile Page
app.get('/profile', requireLogin, (req, res) => {
  User.findById({_id:req.user._id}).then((user) => {
    if (user) {
      user.online = true;
      user.save((err, user) => {
        if (err) {
          throw err
        } else {
          Smile.findOne({receiver:req.user._id, receiverReceived:false})
          .then((newSmile) => {
            Chat.findOne({$or:[
              {receiver:req.user._id, receiverRead:false},
              {sender:req.user._id,senderRead:false}
            ]})
            .then((unread) => {
              Post.find({postUser: req.user._id})
              .populate('postUser')
              .sort({date: 'desc'})
              .then((posts) => {
                if (posts) {
                  res.render('profile', {
                    title: 'Imyirondoro',
                    user: user,
                    newSmile: newSmile,
                    unread: unread,
                    posts: posts
                  });
                } else {
                  console.log(`User doesn't have any post!`);
                  res.render('profile', {
                    title: 'Imyirondoro',
                    user: user,
                    newSmile: newSmile,
                    unread: unread
                  });
                }
              })
            });
          });
        }
      });
    }
  });
});

app.post('/updateProfile', requireLogin, (req, res) => {
  User.findById({_id:req.user._id})
  .then((user) => {
    user.fullname = req.body.fullname;
    user.email = req.body.email;
    user.gender = req.body.gender;
    user.age = req.body.age;
    user.about = req.body.about;
    user.country = req.body.country;
    user.city = req.body.city;
    user.area = req.body.area;
    user.save(() => {
      res.redirect('/profile');
    });
  });
});

app.get('/askToDelete', requireLogin, (req, res) => {
  res.render('askToDelete', {
    title: 'Gufunga urubuga'
  });
});

app.get('/deleteAccount', requireLogin, (req, res) => {
  User.deleteOne({_id:req.user._id})
  .then(() => {
    res.render('accountDeleted', {
      title: 'Rwafunzwe'
    });
  });
});

app.get('/newAccount', (req, res) => {
  res.render('newAccount', {
    title: 'Kwibaruza'
  });
});

app.post('/signup', (req, res) => {
  let errors = [];

  if (req.body.password !== req.body.password2) {
    errors.push({ text: `Amagambo y'ibanga ntabwo ahuye` });
  }

  if (req.body.password.length < 5) {
    errors.push({ text: `Ijambo ry'ibanga rigomba kugira byibura inyuguti 5` });
  }

  if (errors.length > 0) {
    res.render('newAccount', {
      errors:errors,
      title: 'Ikosa',
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
        errors.push({text: `Iyi Imeyili ifite undi uyikoresha!`});
        res.render('newAccount', {
          title: 'Kwibaruza',
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
            success.push({text: `Wibaruje neza, injira ku rubuga rwawe!`});
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

// Retreive password process
app.get('/retrievePwd', (req, res) => {
  res.render('retrievePwd', {
    title: 'Kwiyibutsa'
  })
});

app.post('/retrievePwd', (req, res) => {
  let email = req.body.email.trim();
  let pwd1 = req.body.password.trim();
  let pwd2 = req.body.password2.trim();

  if (pwd1 !== pwd2) {
    res.render('pwdDoesNotMatch', {
      title: 'Amagambo ntahura'
    });
  }
  User.findOne({email:email})
  .then((user) => {
    let salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(pwd1, salt);

    user.password = hash;
    user.save((err,user) => {
      if (err) {
        throw err;
      }
      if (user) {
        res.render('pwdUpdated', {
          title: 'Ijambo ryavuguruwe'
        });
      }
    });
  });
});

// handle get route
app.get('/uploadImage', requireLogin, (req, res) => {
  res.render('uploadImage', {
    title: 'Kohereza'
  });
});

app.post('/uploadAvatar', requireLogin, (req, res) => {
  User.findById({_id:req.user._id})
    .then((user) => {
      user.image = `https://rambagiza-online.s3.us-east-2.amazonaws.com/${req.body.upload}`;
      user.save((err) => {
        if (err) {
          throw err;
        } else {
          res.redirect('/profile');
        }
      })
    })
});

app.post('/uploadFile', requireLogin, uploadImage.any(), (req, res) => {
  const form = new formidable.IncomingForm();
  form.on('file', (field, file) => {
    console.log(file);
  });
  form.on('error', (err) => {
    console.log(err);
  });
  form.on('end', () => {
    console.log(`Ishusho yakiriwe ku rubuga ...`);
  });
  form.parse(req);
});

// Handle route for users
app.get('/singles', requireLogin, (req, res) => {
  User.find({})
  .sort({date:'desc'})
  .then((singles) => {
    res.render('singles', {
      title: 'Inshuti',
      singles: singles
    });
  }).catch((err) => {
    console.log(err);
  });
});

app.get('/userProfile/:id', requireLogin, (req, res) => {
  User.findById({_id:req.params.id})
  .then((user) => {
    Smile.findOne({receiver:req.params.id})
    .then((smile) => {
      Post.find({status: 'public', postUser:user._id})
      .populate('postUser')
      .populate('comments.commentUser')
      .populate('likes.likeUser')
      .then((publicPosts) => {
        res.render('userProfile', {
          title: 'Imyirondoro',
          oneUser: user,
          smile: smile,
          publicPosts: publicPosts
        });
      })
    })
  });
});

// Start chat process
app.get('/startChat/:id', requireLogin, (req, res) => {
  Chat.findOne({sender:req.params.id, receiver:req.user._id})
  .then((chat) => {
    if (chat) {
      chat.receiverRead = true;
      chat.senderRead = false;
      chat.date = new Date();
      chat.save((err,chat) => {
        if (err) {
          throw err;
        }
        if (chat) {
          res.redirect(`/chat/${chat._id}`);
        }
      })
    } else {
      Chat.findOne({sender:req.user._id, receiver:req.params.id})
      .then((chat) => {
        if (chat) {
          chat.senderRead = true;
          chat.receiverRead = false;
          chat.date = new Date();
          chat.save((err, chat) => {
            if (err) {
              throw err;
            }
            if (chat) {
              res.redirect(`/chat/${chat._id}`);
            }
          })
        } else {
          const newChat = {
            sender: req.user._id,
            receiver: req.params.id,
            senderRead: true,
            receiverRead: false,
            date: new Date()
          }
          new Chat(newChat).save((err, chat) => {
            if (err) {
              throw err;
            }
            if (chat) {
              res.redirect(`/chat/${chat._id}`);
            }
          })
        }
      })
    }
  })
})

// Display Chat Room
app.get('/chat/:id', requireLogin, (req, res) => {
  Chat.findById({_id:req.params.id})
  .populate('sender')
  .populate('receiver')
  .populate('chats.senderName')
  .populate('chats.receiverName')
  .then((chat) => {
    User.findOne({_id:req.user._id})
    .then((user) => {
      res.render('chatRoom', {
        title: 'Ikiganiro',
        user: user,
        chat: chat
      })
    })
  })
})

// Handle chat message post
app.post('/chat/:id', requireLogin, walletChecker, (req, res) => {
  Chat.findOne({ _id: req.params.id, sender: req.user._id })
  .sort({ date: 'desc' })
  .populate('sender')
  .populate('receiver')
  .populate('chats.senderName')
  .populate('chats.receiverName')
  .then((chat) => {
    if (chat) {
      chat.senderRead = true;
      chat.receiverRead =false;
      chat.date = new Date();

      const newChat = {
        senderName: req.user._id,
        senderRead: true,
        receiverName: chat.receiver._id,
        receiverRead: false,
        date: new Date(),
        senderMessage: req.body.chat
      }

      chat.chats.push(newChat);
      chat.save((err, chat) => {
        if (err) {
          throw err;
        }
        if (chat) {
          Chat.findOne({_id:chat._id})
          .sort({ date:'desc' })
          .populate('sender')
          .populate('receiver')
          .populate('chats.senderName')
          .populate('chats.receiverName')
          .then((chat) => {
            User.findById({_id:req.user._id})
            .then((user) => {
              // We will charge client for each message
              user.wallet = user.wallet - 1;
              user.save((err, user) => {
                if (err) {
                  throw err;
                }
                if (user) {
                  res.render('chatRoom', {
                    title: 'Umushyikirano',
                    chat: chat,
                    user: user
                  })
                }
              })
            })
          })
        }
      })
    }
    // Receiver sends message back
    else {
      Chat.findOne({_id:req.params.id, receiver:req.user._id})
      .sort({date:'desc' })
      .populate('sender')
      .populate('receiver')
      .populate('chats.senderName')
      .populate('chats.receiverName')
      .then((chat) => {
        chat.senderRead = true;
        chat.receiverRead = false;
        chat.date = new Date();

        const newChat = {
          senderName: chat.sender._id,
          senderRead: false,
          receiverName: req.user._id,
          receiverRead: true,
          date: new Date(),
          receiverMessage: req.body.chat
        }
        chat.chats.push(newChat)
        chat.save((err,chat) => {
          if (err) {
            throw err;
          }
          if (chat) {
            Chat.findOne({_id:chat._id})
            .sort({date:'desc'})
            .populate('sender')
            .populate('receiver')
            .populate('chats.senderName')
            .populate('chats.receiverName')
            .then((chat) => {
              User.findById({_id:req.user._id})
              .then((user) => {
                user.wallet = user.wallet - 1;
                user.save((err,user) => {
                  if (err) {
                    throw err;
                  }
                  if (user) {
                    res.render('chatRoom', {
                      title: 'Umushyikirano',
                      user:user,
                      chat:chat
                    })
                  }
                })
              })
            })
          }
        })
      })
    }
  })
})

app.get('/chats', requireLogin, (req, res) => {
  Chat.find({receiver: req.user._id})
  .populate('sender')
  .populate('receiver')
  .populate('chats.senderName')
  .populate('chats.receiverName')
  .sort({date:'desc'})
  .then((received) => {
    Chat.find({ sender: req.user._id })
    .populate('sender')
    .populate('receiver')
    .populate('chats.senderName')
    .populate('chats.receiverName')
    .sort({ date: 'desc' })
    .then((sent) => {
      res.render('chat/chats', {
        title: 'Urutonde rw\'imishyikirano',
        received:received,
        sent: sent
      })
    })
  })
});

// Delete chat
app.get('/deleteChat/:id', requireLogin, (req, res) => {
  Chat.deleteOne({_id:req.params.id})
  .then(() => {
    res.redirect('/chats');
  });
});

// Charge Client (payment)
app.post('/charge10dollars', requireLogin, (req, res) => {
  console.log(req.body);
  const amount = 1000;
  stripe.customers.create({
    email: req.body.stripeEmail,
    source: req.body.stripeToken
  }).then((customer) => {
    stripe.charges.create({
      amount: amount,
      description: 'Ubutumwa 200 ku madolari 10',
      currency: 'usd',
      customer: customer.id,
      receipt_email: customer.email
    }).then((charge) => {
      if (charge) {
        User.findById({_id:req.user._id})
        .then((user) => {
          user.wallet += 200;
          user.save()
          .then(() => {
            res.render('payment/success', {
              title: 'Ubwishyu',
              charge: charge
            });
          });
        });
      }
    }).catch((err) => {
      console.log(err);
    })
  }).catch((err) => {
    console.log(err);
  });
});

app.post('/charge20dollars', requireLogin, (req, res) => {
  console.log(req.body);
  const amount = 2000;
  stripe.customers.create({
    email: req.body.stripeEmail,
    source: req.body.stripeToken
  }).then((customer) => {
    stripe.charges.create({
      amount: amount,
      description: 'Ubutumwa 500 ku madolari 20',
      currency: 'usd',
      customer: customer.id,
      receipt_email: customer.email
    }).then((charge) => {
      if (charge) {
        User.findById({ _id: req.user._id })
          .then((user) => {
            user.wallet += 500;
            user.save()
              .then(() => {
                res.render('payment/success', {
                  title: 'Ubwishyu',
                  charge: charge
                });
              });
          });
      }
    }).catch((err) => {
      console.log(err);
    })
  }).catch((err) => {
    console.log(err);
  });
});

app.post('/charge30dollars', requireLogin, (req, res) => {
  console.log(req.body);
  const amount = 3000;
  stripe.customers.create({
    email: req.body.stripeEmail,
    source: req.body.stripeToken
  }).then((customer) => {
    stripe.charges.create({
      amount: amount,
      description: 'Ubutumwa 1000 ku madolari 30',
      currency: 'usd',
      customer: customer.id,
      receipt_email: customer.email
    }).then((charge) => {
      if (charge) {
        User.findById({ _id: req.user._id })
          .then((user) => {
            user.wallet += 1000;
            user.save()
              .then(() => {
                res.render('payment/success', {
                  title: 'Ubwishyu',
                  charge: charge
                });
              });
          });
      }
    }).catch((err) => {
      console.log(err);
    })
  }).catch((err) => {
    console.log(err);
  });
});

app.post('/charge40dollars', requireLogin, (req, res) => {
  console.log(req.body);
  const amount = 4000;
  stripe.customers.create({
    email: req.body.stripeEmail,
    source: req.body.stripeToken
  }).then((customer) => {
    stripe.charges.create({
      amount: amount,
      description: 'Ubutumwa 2000 ku madolari 40',
      currency: 'usd',
      customer: customer.id,
      receipt_email: customer.email
    }).then((charge) => {
      if (charge) {
        User.findById({ _id: req.user._id })
          .then((user) => {
            user.wallet += 2000;
            user.save()
              .then(() => {
                res.render('payment/success', {
                  title: 'Ubwishyu',
                  charge: charge
                });
              });
          });
      }
    }).catch((err) => {
      console.log(err);
    })
  }).catch((err) => {
    console.log(err);
  });
});

// Get route to send smile
app.get('/sendSmile/:id', requireLogin, (req, res) => {
  const newSmile = {
    sender: req.user._id,
    receiver: req.params.id,
    senderSent: true
  };
  new Smile(newSmile).save((err, smile) => {
    if (err) {
      throw err;
    }
    if (smile) {
      res.redirect(`/userProfile/${req.params.id}`);
    }
  })
});

// Delete smile
app.get('/deleteSmile/:id', requireLogin, (req, res) => {
  Smile.deleteOne({receiver:req.params.id, sender:req.user._id})
  .then(() => {
    res.redirect(`/userProfile/${req.params.id}`);
  });
});

// Show Smile Sender
app.get('/showSmile/:id', requireLogin, (req, res) => {
  Smile.findOne({_id:req.params.id})
  .populate('sender')
  .populate('receiver')
  .then((smile) => {
    smile.receiverReceived = true;
    smile.save((err, smile) => {
      if (err) {
        throw err;
      }
      if (smile) {
        res.render('smile/showSmile', {
          title: 'Intashyo',
          smile: smile
        });
      }
    });
  });
});

// Get method to display post form
app.get('/displayPostForm', requireLogin, (req, res) => {
  res.render('post/displayPostForm', {
    title: 'Inkuru'
  });
});

//Create Post
app.post('/createPost', requireLogin, (req, res) => {
  let allowComments = Boolean;
  if (req.body.allowComments) {
    allowComments = true;
  } else {
    allowComments = false;
  }  
  const newPost = {
    title: req.body.title,
    body: req.body.body,
    status: req.body.status,
    image: `https://rambagiza-online.s3.us-east-2.amazonaws.com/${req.body.image}`,
    postUser: req.user._id,
    allowComments: allowComments,
    date: new Date()
  }
  if (req.body.status === 'public') {
    newPost.icon = 'bi bi-globe';
  }
  if (req.body.status === 'private') {
    newPost.icon = 'bi bi-key';
  } 
  if (req.body.status === 'friends') {
    newPost.icon = 'bi bi-people-fill';
  }
  new Post(newPost).save()
  .then(() => {
    if (req.body.status === 'public') {
      res.redirect('/posts');
    } else {
      res.redirect('/profile');
    }
  });
});

// Display all public posts
app.get('/posts', requireLogin, (req, res) => {
  Post.find({status: 'public'})
  .populate('postUser')
  .sort({date: 'desc'})
  .then((posts) => {
    res.render('post/posts', {
      title: 'Inkuru',
      posts: posts
    })
  });
});

// Delete post
app.get('/deletePost/:id', requireLogin, (req, res) => {
  Post.deleteOne({_id: req.params.id})
  .then(() => {
    res.redirect('/profile');
  });
});

// Edit post
app.get('/editPost/:id', requireLogin, (req, res) => {
  Post.findById({_id: req.params.id})
  .then((post) => {
    res.render('post/editPost', {
      title: 'Kuvugurura',
      post: post
    });
  });
});

// Submit form to update post
app.post('/editPost/:id', requireLogin, (req, res) => {
  Post.findByIdAndUpdate({_id: req.params.id})
    .then((post) => {
      let allowComments = Boolean;
      if (req.body.allowComments) {
        allowComments = true;
      } else {
        allowComments = false;
      }
    post.title = req.body.title;
    post.body = req.body.body;
    post.status = req.body.status;
    post.allowComments = allowComments;
    if ((req.body.image !== '') && (post.image !== `https://rambagiza-online.s3.us-east-2.amazonaws.com/${req.body.image}`)) {
      post.image = `https://rambagiza-online.s3.us-east-2.amazonaws.com/${req.body.image}`;
    }
    post.allowComments = req.body.allowComments;
    if (req.body.status === 'public') {
      post.icon = 'bi bi-globe';
    }
    if (req.body.status === 'private') {
      post.icon = 'bi bi-key';
    }
    if (req.body.status === 'friends') {
      post.icon = 'bi bi-people-fill';
    }
    post.lastUpdate = new Date();

    post.save()
    .then(() => {
      res.redirect('/profile');
    });
  })
});

// Add Like to each Post
app.get('/likePost/:id', requireLogin, (req, res) => {
  Post.findById({_id: req.params.id})
  .then((post) => {
    const newLike = {
      likeUser: req.user._id,
      date: new Date()
    }
    post.likes.push(newLike);
    post.save((err, post) => {
      if (err) {
        throw err;
      }
      if (post) {
        res.redirect(`/fullPost/${post._id}`);
      }
    });
  });
});

app.get('/fullPost/:id', requireLogin, (req, res) => {
  Post.findById({_id: req.params.id})
  .populate('postUser')
  .populate('likes.likeUser')
  .populate('comments.commentUser')
  .sort({date:'desc'})
  .then((post) => {
    res.render('post/fullPost', {
      title: 'Inkuru irambuye',
      post: post
    })
  })
});

// Submit form to leave comment
app.post('/leaveComment/:id', requireLogin, (req, res) => {
  Post.findById({_id:req.params.id})
  .then((post) => {
    const newComment = {
      commentUser: req.user._id,
      commentBody: req.body.commentBody,
      date: new Date()
    }
    post.comments.push(newComment);
    post.save((err, post) => {
      if (err) {
        throw err;
      }
      if (post) {
        res.redirect(`/fullPost/${post._id}`);
      }
    });
  });
});

// Start Friend Request Process
app.get('/sendFriendRequest/:id', requireLogin, (req, res) => {
  User.findOne({_id:req.params.id})
  .then((user) => {
    let newFriendRequest = {
      friend: req.user._id
    }
    user.friends.push(newFriendRequest);
    user.save((err, user) => {
      if (err) {
        throw err;
      }
      if (user) {
        res.render('friends/askFriendRequest', {
          title: 'Gusaba Ubucuti',
          newFriend: user
        });
      }
    })
  });
});

app.get('/showFriendRequest/:id', requireLogin, (req, res) => {
  User.findOne({_id:req.params.id})
    .then((newFriend) => {
    res.render('friends/showFriendRequest', {
      title: 'Wasabwe Ubucuti',
      newFriend: newFriend
    })
  });
});

// Accept Friend Request
app.get('/acceptFriend/:id', requireLogin, (req, res) => {
  User.findById({_id:req.user._id})
  .populate('friends.friend')
  .then((user) => {
    user.friends.filter((friend) => {
      if (friend._id = req.params.id) {
        friend.isFriend = true;
        user.save()
        .then(() => {
          res.send('Wemeje Ubucuti wasabwe!')
        });
      } else {
        console.log(`Ntitwashoboye kubona ubusabe bw'ubucuti!`);
      }
    });
  }).catch((err) => {
    console.log(err);
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
            title: "Ubutumwa bwoherejwe",
            messages: messages
          });
        } else {
          res.render('nomessage', {
            title: "Nta butumwa twabonye"
          });
        }
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
