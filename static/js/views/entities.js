define([
  'jquery',
  'backbone',
  'underscore',
  'app',
  'models/models',
  'views/views',
  'views/checks',
  'jquerydebounce'
], function($, Backbone, _, App, Models, Views, CheckViews) {

    var EntityDetailsView = Views.DetailsView.extend({

        _makeBody: function() {
            var body = $('<div>');
            body.append($('<h3>').append('details'));
            this._details = $('<dl>').addClass('dl-horizontal');
            body.append(this._details);

            body.append($('<h3>').append('ip_addresses'));
            this._ipAddresses = $('<dl>').addClass('dl-horizontal');
            body.append(this._ipAddresses);

            body.append($('<h3>').append('metadata'));
            this._metadata = $('<dl>').addClass('dl-horizontal');
            body.append(this._metadata);

            this._checks = $('<div>');
            body.append(this._checks);

            this._detailsView = new Views.KeyValueView({
                el: this._details,
                model: this.model,
                editKeys: false,
                editableKeys: ['label', 'agent_id'],
                ignoredKeys: ['ip_addresses', 'metadata', 'checks'],
                formatters: {created_at: function (val) {return (new Date(val));},
                             updated_at: function (val) {return (new Date(val));}}
            });

            this._ipAddressesView = new Views.KeyValueView({
                el: this._ipAddresses,
                modelKey: 'ip_addresses',
                model: this.model,
                editKeys: true
            });

            this._metadataView = new Views.KeyValueView({
                el: this._metadata,
                modelKey: 'metadata',
                model: this.model,
                editKeys: true
            });

            this._checksView = new CheckViews.CheckListView({el: this._checks, collection: this.model.checks});

            return body;
        },

        handleSave: function () {
            var _success = function (model) {
                this.editState = false;
                this.model.fetch();
            };

            var _error = function (model, xhr) {
                var error = {message: 'Unknown Error', details: 'Try again later'};
                try {
                    var r = JSON.parse(xhr.responseText);
                    error.message = r.message;
                    error.details = r.details;
                } catch (e) {}

                this.displayError(error);
                this.model.fetch();
            };

            var newEntity = this._detailsView.getChanged();

            newEntity.ip_addresses = this._ipAddressesView.getValues();
            newEntity.metadata = this._metadataView.getValues();

            this.model.save(newEntity, {success: _success.bind(this), error: _error.bind(this)});
        },

        render: function () {
            this._detailsView.render(this.editState);
            this._ipAddressesView.render(this.editState);
            this._metadataView.render(this.editState);

            this.model.checks.fetch();

            if(this.editState) {
                this._editButton.hide();
                this._saveButton.show();
                this._cancelButton.show();
            } else {
                this._saveButton.hide();
                this._cancelButton.hide();
                this._editButton.show();
            }
        }

    });

    var EntityView = Views.ListElementView.extend({

        template: _.template("<td><a class='details clickable'><%= label %></a></td><td><%= id %></td><td><i class='icon-remove delete clickable'></i></td>"),

        detailsHandler: function () {
            Backbone.history.navigate('entities/' + this.model.id, true);
        },

        deleteHandler: function () {

            /* TODO: display errors */
            this.model.destroy({wait: true});
            this._modal.hide();
        }
    });

    var EntityListView = Views.ListView.extend({

        name: 'entity',
        plural: 'entities',
        elementView: EntityView,

        handleNew: function (label) {

            function saveSuccess(entity) {
                entity.fetch({
                    success: function(e) {
                        this._modal.hide();
                        App.getInstance().account.entities.add(e);
                        Backbone.history.navigate('entities/' + e.id, true);
                    }.bind(this), error: function(e) {
                        this.error('Error fetching ' + this.name);
                        this._modal.hide();
                    }.bind(this)
                });
            }

            function saveError(entity, response) {
                try {
                    r = JSON.parse(response.responseText);
                } catch (e) {
                    r = {'name': 'UnknownError', 'message': 'UnknownError: An unknown error occured.'};
                }
                this.error(r);
                this._modal.hide();
            }
            e = new Models.Entity({label: label});
            e.save({}, {success: saveSuccess.bind(this), error: saveError.bind(this)});
        }

    });

    var renderEntityDetails = function (id) {

        var model = App.getInstance().account.entities.get(id);
        if (!model) {
            Backbone.history.navigate('entities', true);
            return;
        }

        Views.renderView('entity-details', [model]);

        var entityDetailsView = new EntityDetailsView({el: $("#entity-details-view-content"), model: model});
        entityDetailsView.render();
    };

    var renderEntitiesList = function () {
        Views.renderView('entities');

        var entitiesView = new EntityListView({el: $("#entities-view-content"), collection: App.getInstance().account.entities});
        entitiesView.render();
    };

    return {'renderEntityDetails': renderEntityDetails,
            'renderEntitiesList': renderEntitiesList};

});