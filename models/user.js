const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  facebook: {
    type: String
  },
  google: {
    type: String
  },
  firstname: {
    type: String
  },
  lastname: {
    type: String
  },
  fullname: {
    type: String
  },
  image: {
    type: String,
    default: '/images/user.jpg'
  },
  email: {
    type: String
  },
  country: {
    type: String
  },
  city: {
    type: String
  },
  area: {
    type: String
  },
  age: {
    type: String
  },
  gender: {
    type: String
  },
  about: {
    type: String,
    default: 'Actively seeking for relationship'
  },
  online: {
    type: Boolean,
    default: false
  },
  wallet: {
    type: Number,
    default: 0
  },
  password: {
    type: String
  }
});

module.exports = mongoose.model('User', userSchema);