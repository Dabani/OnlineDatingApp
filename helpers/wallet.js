const keys = require('../config/keys');

module.exports = {
  walletChecker: function(req, res, next) {
    if (req.user.wallet <= 0) {
      res.render('payment/payment', {
        title: 'Kwishyura',
        StripePublishableKey: keys.StripePublishableKey
      });
    } else {
      return next();
    }
  }
};
