/**
 * Plugin for connecting apollo web layer to DummyREST and visa-versa
 *
 * @type {*}
 */


var ApolloWebPlugin = (function (Backbone) {

    var Plugin = {};


    Plugin.view = Backbone.View.extend({

        setRoutesPublished:function (value) {
            debug("Publishing routes");

            var view = this;
            this.model.save({routes_are_published: value}, {
                success:function (model) {
                    debug("Routes are published");
                },

                error:function () {
                    debug("Failed to change state");
                }
            });
        },

        events: {
            'click #publishRoutesButton':'publishRoutes',
            'click #unpublishRoutesButton':'unpublishRoutes'
        },

        publishRoutes: function() {
            this.setRoutesPublished(true);
        },

        unpublishRoutes: function() {
            this.setRoutesPublished(false);
        }

    });



    return Plugin;

}(Backbone));

