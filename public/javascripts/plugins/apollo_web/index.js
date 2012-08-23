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
      this.model.save({routes_are_published:value}, {
        success:function (model) {
          debug("Routes are published");
        },

        error:function () {
          debug("Failed to change state");
        }
      });
    },

    initialize:function (attributes) {
      this.$el = $("#plugin_view");
      if (typeof attributes.model != 'undefined') {
        this.model = attributes.model;
      }
    },

    events:{
      'click #serverPingButton':'pingServer',
      'click #publishRoutesButton':'publishRoutes',
      'click #unpublishRoutesButton':'unpublishRoutes'
    },

    pingServer:function () {
      var server = $("#serverStr").val();
      debug("Pinging server: ", server);
      $.ajax({
        url:'//' + server + '/non_existing_ping.html',
        error:function (xhr) {
          if (xhr.status == 404) {
            debug("Succeed to ping:", xhr.status, xhr.readyState);
            $("#serverPingButton").queue(function () {
              $(this).text('Pong');
              $(this).addClass('btn-success');
              $(this).dequeue();
            }).delay(3000).queue(function () {
              $(this).text('Ping');
              $(this).removeClass('btn-success');
              $(this).dequeue();
            });
          } else {
            debug("Failed to ping:", xhr.status, xhr.readyState);
            $("#serverPingButton").queue(function () {
              $(this).text('Pang');
              $(this).addClass('btn-danger');
              $(this).dequeue();
            }).delay(3000).queue(function () {
              $(this).text('Ping');
              $(this).removeClass('btn-danger');
              $(this).dequeue();
            });
          }
        }
      });
    },

    publishRoutes:function () {
      debug("publishing routes");
      this.setRoutesPublished(true);
    },

    unpublishRoutes:function () {
      debug("unpublishing routes");
      this.setRoutesPublished(false);
    }
  });

  return Plugin;

}(Backbone));

require([
  'objecttype.model',
  'testsuite.model',
  'application.model'
], function () {
  debug("Loading apollo-web plugin");
  App.SubView = ApolloWebPlugin.view;
});