var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  links: function() {
    return this.hasMany(Link);
  },
  initialize: function() {
    this.on('creating', function(model, attrs, options){
      var plainTextPassword = model.get('password');
      bcrypt.hash(plainTextPassword, null, null, function(err, hash) {
        model.set('password', hash);
      })
    })
  }
});

module.exports = User;
