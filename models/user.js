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
    type: String,
    default: 'Rwanda'
  },
  city: {
    type: String,
    default: 'Kigali'
  },
  area: {
    type: String,
    default: 'Nyamirambo'
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
    default: 3
  },
  password: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  friends: [{
    friend: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      unique: true
    },
    isFriend: {
      type: Boolean,
      default: false
    }
  }],
  pictures: [{
    image: {
      type: String
    },
    date: {
      type: Date,
      default: Date.now
    }
  }]
});

module.exports = mongoose.model('User', userSchema);