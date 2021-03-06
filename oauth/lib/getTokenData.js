var errors = require('./errors'),
    grantTypes = require('./grantTypes'),
    kgo = require('kgo');

function isValidAuthorizationCode(authorizationCode, context) {
     return authorizationCode &&
            context.code === authorizationCode.code &&
            authorizationCode.expiresDate > new Date() &&
            '' + context.client_id === '' + authorizationCode.clientId;
}

function getTokenData(context, callback) {
    var authServer = this,
        tokenData = {
            token_type: 'Bearer',
            expires_in: authServer.getExpiresDate(),
            clientId: context.client_id
        };

    if (context.grant_type === grantTypes.AUTHORIZATIONCODE) {
        authServer.authorizationService.getAuthorizationCode(context.code, function(error, authorizationCode){
            if(error){
                return callback(error);
            }

            if(!isValidAuthorizationCode(authorizationCode, context)){
                return callback(errors.invalidAuthorizationCode(context));
            }

            tokenData.accountId = authorizationCode.accountId;
            kgo
            ('token', authServer.tokenService.generateToken)
            ('refreshToken', authServer.tokenService.generateToken)
            ('tokenData', ['token', 'refreshToken'], function(token, refreshToken, done){
                tokenData.access_token = token;
                tokenData.refresh_token = refreshToken;
                done(null, tokenData);
            })
            (['*', 'tokenData'], callback);
        });
        return;
    }

    if (context.grant_type === grantTypes.PASSWORD) {
        authServer.membershipService.areUserCredentialsValid(context.username, context.password, context.scope, function (error, isValidPassword) {
            if(error){
                return callback(error);
            }

            if(!isValidPassword){
                return callback(errors.userCredentialsInvalid(context));
            }

            kgo
            ('token', authServer.tokenService.generateToken)
            ('refreshToken', authServer.tokenService.generateToken)
            ('tokenData', ['token', 'refreshToken'], function(token, refreshToken, done){
                tokenData.access_token = token;
                tokenData.refresh_token = refreshToken;
                done(null, tokenData);
            })
            (['*', 'tokenData'], callback);
        });
        return;
    }

    if (context.grant_type === grantTypes.CLIENTCREDENTIALS) {
        kgo
        ('token', authServer.tokenService.generateToken)
        ('tokenData', ['token'], function(token, done){
            tokenData.access_token = token;
            done(null, tokenData);
        })
        (['*', 'tokenData'], callback);

        return;
    }

    return callback(errors.unsupportedGrantType(context));
}

module.exports = getTokenData;