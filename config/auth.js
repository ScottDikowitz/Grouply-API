module.exports = {

    'facebookAuth' : {
        clientID      : '999691146773274', // your App ID
        clientSecret  : '91a472b1d2e3ea67f9721969ab0bf105', // your App Secret
        callbackURL   : 'http://localhost:8000/auth/facebook/callback',
        profileFields: ['email', 'name', 'displayName']
    }
};
