/* underscore doesn't play nice with require.js, so we need this shim for
 * underscore and those libraries that expect it to be declared in the global
 * scope
 */
require.config({
  paths: {
    jquery: '/js/extern/jquery/jquery',
    underscore: '/js/extern/underscore/underscore',
    backbone: '/js/extern/backbone/backbone',
    boostrap: '/js/extern/bootstrap/bootstrap'
  },
  shim: {
      'jquery': {
          exports: '$'
      },
      'underscore': {
          exports: '_'
      },
      'backbone': {
          deps: ['underscore', 'jquery'],
          exports: 'Backbone'
      },
      'bootstrap': ['bootstrap']
  }
});

define([
  'underscore',
  'app',
  'router',
  'models/models',
  'views/views'
], function(_, App, Router, Models, Views){

  var account, router;

  var initialize = function (account, callback) {
    
    var error = function (model, response) {
      Views.errorView();
    };

    var entities_fetch_success = function (model, response) {
      callback();
    };

    var account_fetch_success = function (model, response) {
      model.entities.fetch({"success": entities_fetch_success, "error": error});
    };
    account.fetch({"success": account_fetch_success, "error": error});
  };

  /* Show loading view */
  Views.renderLoading();

  /* init */
  account = new Models.Account();
  initialize(account, function () {
    App.initialize({"account": account});
    Router.start();
  });

  return {};
});