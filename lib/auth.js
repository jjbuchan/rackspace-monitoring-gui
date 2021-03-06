/*
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var async = require('async');
var _ = require('underscore');
var log = require('logmagic').local('raxmongui.auth');

var KeystoneClient = require('keystone-client').KeystoneClient;

function Auth(settings) {
  this.settings = settings;
}

/* Get cloudMonitoring url from service catalog */
Auth.prototype._parse_catalog = function(results, callback) {

    var cm, url;
    cm = _.find(results, function (val) {
      return (val['name'] === 'cloudMonitoring');
    });

    if (!cm) {
      callback('Error: "cloudMonitoring" not found in service catalog.', null);
    } else {
      url = cm['endpoints'][0]['publicURL'];
      if (!url) {
        callback('Error: URL not found in endpoint "cloudMonitoring".', null);
      } else {
        return callback(null, url);
      }
    }
};

Auth.prototype._parse_expires = function (results, callback) {

  // Human-readable expire time
  var expires = results.expires;
  if (!expires) {
    callback('Error: expire time missing from response');
    return;
  }
  // TTL in ms - API response - 1 hour
  var expiresIn = Date.parse(expires) - (new Date().getTime() - 3600000);

  callback(null, {expires: expires, expiresIn: expiresIn});

};

Auth.prototype._parse_tenantId = function (results, callback) {

  var tenantId = results.tenantId;
  if (!tenantId) {
    callback('Error: tenantId missing from response');
    return;
  }
  callback(null, tenantId);
};

Auth.prototype._parse_token = function(results, callback) {

  var token = results.token;
  if (!token) {
    callback('Error: token missing from response');
    return;
  }
  callback(null, token);

};

/*
 * Do authentication and parse the response. Because we have to
 * authenticate simultaneously to multiple endpoints, this kind of
 * breaks the 'callback(err, results)' pattern so we can still use
 * async.map by just returning any errors as part of the results object
 */
Auth.prototype._authenticate = function (client, callback) {
  // Do the actual authentication and fetch the resulting
  // TenantId, Token, and Service Catalog
  async.series(
    {
      tenantAndToken: function (cb) {
        client.getTenantIdAndToken({}, cb);
      },
      serviceCatalog: function (cb) {
        client.getServiceCatalog({}, cb);
      }
    },
    function (err, results) {

      // Errors here are a failure to authenticate with the endpoint
      if (err) {
        // HTTP 400/401 - probably a bad password/missing username
        if (err.statusCode === 401 || err.statusCode === 400) {
          callback(null, {errors: ['Error: Invalid username or password.']});
        } else {
          callback(null, {errors: [err.toString()]});
        }
      } else {
        // Parse the auth response
        async.series({
          token: function (callback) {
            this._parse_token(results.tenantAndToken, callback);
          }.bind(this),
          tenantId: function (callback) {
            this._parse_tenantId(results.tenantAndToken, callback);
          }.bind(this),
          expires: function (callback) {
            this._parse_expires(results.tenantAndToken, callback);
          }.bind(this),
          url: function (callback) {
            this._parse_catalog(results.serviceCatalog, callback);
          }.bind(this)
        },
        // Errors here are a failure to parse the successful auth response
        function (err, results) {
          if (err) {
            callback(null, {errors: [err]});
          } else {
            callback(null, results);
          }
        });
      }
    }.bind(this));
};

Auth.prototype.authenticate = function (req, res) {
  var saveSession, opts, ksclientUS, ksclientUK;

  saveSession = (req.body.remember_me === "on");

  opts = {
    username: req.body.username,
    password: req.body.password
  };

  log.info('attempt for username ' + opts.username);

  try {
    ksclientUS = new KeystoneClient(this.settings.authUrlUS, opts);
    ksclientUK = new KeystoneClient(this.settings.authUrlUK, opts);
  } catch (err) {
    log.info('failure for username ' + opts.username, err);
    res.render('login.jade', {errors: [err.toString()]});
    return;
  }

  async.map([ksclientUS, ksclientUK], this._authenticate.bind(this), function (err, results) {

    var result = _.find(results, function (res) {return !_.has(res, 'errors');});

    if (result) {
      log.info('success for username ' + opts.username);
      // set session
      req.session.username = opts.username;
      req.session.token = result.token;
      req.session.tenantId = result.tenantId;
      req.session.url = result.url;
      req.session.expires = result.expires.expires;
      if (saveSession) {
        req.session.cookie.expires = result.expires.expiresIn;
      } else {
        // expire session on browser close
        req.session.cookie.expires = false;
      }
      res.redirect('/');
    } else {
      log.info('failure for username ' + opts.username, results);
      res.render('login.jade', results[0]); //choose first result error to display?
    }

  }.bind(this));
};

module.exports = Auth;
