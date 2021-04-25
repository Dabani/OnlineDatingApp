const passport = require('passport');
const facebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/user');
const keys = require('../config/keys');

passport.serializeUser((user,done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id,(err, id) => {
    done(err, user);
  });
});

passport.use(new facebookStrategy({
  clientID: keys.FacebookAppId,
  clientSecret: keys.FacebookAppSecret,
  callbackURL: 'http://localhost:3000/auth/facebook/callback',
  profileFiels: ['email', 'name', 'displayName', 'photos']
}, (accessToken, refreshToken, profile, done) => {
  console.log(profile);
}));