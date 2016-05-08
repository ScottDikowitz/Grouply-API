var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = {
    username: String,
    password: String,
    email: String,
    facebookId: String,
    bio: String
};

var userSchema = new Schema(UserSchema);

userSchema.statics.findOrCreate = function(data, cb) {

    var userModel = this.model('User');
    var query = userModel.where({facebookId: data.facebookId});
    // console.log(data);
    query.findOne(function(err, user){
        if (err){
            console.log(err);
        } else if (user) {
            console.log('user found!');
            debugger;
            console.log(user);
        } else {
            console.log('user not found! Creating user.');
            // this.model('User').create
            var newUser = new userModel ({ name: data.name, facebookId: data.facebookId, email: data.email });
            newUser.save(function (err) {if (err) console.log ('Error on save!');});
        }
    });
    cb();
};

module.exports = mongoose.model('User', userSchema);
