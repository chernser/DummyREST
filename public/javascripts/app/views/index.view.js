require([
  'objecttype.model',
  'testsuite.model',
  'application.model'
], function () {

  var IndexView = Backbone.View.extend({

    initialize:function () {
      this.$el = $("#view");
    },

    events:{
      'click #createAppBtn':'onAppCreate'
    },

    onAppCreate:function () {
      var appName = $("#appName").val();
      debug("Creating application: ", appName);

      var application = new App.ApplicationModel({name:appName});
      application.save(null, {
        success:function (model) {
          debug("model saved");
          window.location = '/app/' + model.id;
        },

        error:function () {
          debug("failed to save model");
        }
      });
    }
  });

  new IndexView();
});