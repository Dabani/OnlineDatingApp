const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
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
  clientID: keys.GoogleClientId,
  clientSecret: keys.GoogleClientSecret,
  callbackURL: 'https://warm-wildwood-26257.herokuapp.com/auth/google/callback'
},(accessToken, refreshToken, profile, done) => {
  console.log(profile);

  User.findOne({google:profile.id}, (err, user) => {
    if (err) {
      return done(err);
    }
    if (user) {
      return done(null, user);
    } else {
      const newUser = {
        firstname: profile.name.givenName,
        lastname: profile.name.familyName,
        fullname: profile.displayName,
        image: profile.photos[0].value.substring(0,profile.photos[0].value.indexOf('=')),
        google: profile.id
      }
      new User(newUser).save((err, user) => {
        if (err) {
          return done(err);
        }
        if (user) {
          return done(null, user);
        }
      });
    }
  });
}));
