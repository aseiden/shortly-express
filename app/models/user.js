var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  links: function() {
    return this.hasMany(Link);
  },

  initialize: function(){
    this.on('creating', function(model, attrs, options) {
      bcrypt.hash(model.get('password'), null).then(function(hash) {
        model.set('password', hash); 
      })
    })
  }
});

module.exports = User;
