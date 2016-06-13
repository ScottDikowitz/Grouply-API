var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = {
    name: String,
    password: String,
    email: String,
    facebookId: String,
    token: String,
    bio: String,
    socket: String
};

var userSchema = new Schema(UserSchema);

userSchema.statics.findOrCreate = function(data, cb) {
    console.log('finding...');

    var userModel = this.model('User');
    var query = userModel.where({facebookId: data.facebookId});
    // console.log(data);
    query.findOne(function(err, user){
        if (err){
            console.log(err);
            cb(err);
        } else if (user) {
            // console.log('user found!');
            // console.log('found!' + user);
            cb(null, user);
        } else {
            // console.log('user not found! Creating user: ' + JSON.stringify(data));
            var newUser = new userModel ({
                name: data.name,
                facebookId: data.facebookId,
                email: data.email,
                token: data.token });
            newUser.save(
                function (err) {
                    if (err) {
                        console.log ('Error on save!');
                        cb(err);
                    } else {
                        console.log ('successfully created user!: ' + JSON.stringify(newUser));
                        cb(null, {name: newUser.name, id: newUser.facebookId});
                    }
                });
        }
    });
};

module.exports = mongoose.model('User', userSchema);
