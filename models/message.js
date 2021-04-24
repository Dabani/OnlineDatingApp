const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  fullName: {
    type: String
  },
  email: {
    type: String
  },
  message: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);