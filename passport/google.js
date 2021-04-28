const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuthStrategy;
const User = require('../models/user');
const keys = require('../config/keys');

passport.serializeUser((user, done) => {
  return done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    return done(err, user);
  });
});

passport.use(new GoogleStrategy({
  consumerKey: keys.GoogleClientId,
  consumerSecret: keys.GoogleClientSecret,
  callbackURL: 'http://localhost:3000/auth/google/callback'
},(accessToken, refreshToken, profile, done) => {
  console.log(profile);
}));
