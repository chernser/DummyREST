require([
    'objecttype.model',
    'testsuite.model',
    'application.model'
], function () {
    App.AppNotificationsView = Backbone.View.extend({

        initialize:function (attributes) {
            this.$el = $("#sub_view");
            this.model = attributes.model;

            var notificationTestPageUrl = "http://" + window.location.hostname + ':' + (8100 + this.model.get("id")) + '/socket_test/';
            $("#notificationTestPageLink").attr("href", notificationTestPageUrl);

            this.updateProxyFunction();
        },

        DEFAULT_PROXY_CODE:""
            + "function proxy(event, resource) { \n"
            + "   event.data = resource;\n"
            + "   return event;\n"
            + "}",


        updateProxyFunction:function () {
            var code = this.model.has("notify_proxy_fun") ? this.model.get("notify_proxy_fun") : this.DEFAULT_PROXY_CODE;

            $("#notifyProxyFunction").val(code);
        },

        events:{
            'click #saveNotifyProxyFunction':'onSaveNotifyProxyFunction'

        },

        onSaveNotifyProxyFunction:function () {
            debug("Saving notification proxy function");
            $("#saveNotifyProxyFunction").text("Saving...");
            try {
                var code = $("#notifyProxyFunction").val();
                eval(code);
                var result = proxy({name: 'test_event', type: 'msg'}, {id: 123, value: 333});
                $("#proxySimpleTestOutput").html("<b>Simple test result: </b>" + JSON.stringify(result));
                this.model.set("notify_proxy_fun", code);
                this.model.save(null, {
                    success: function() {
                        debug("Model saved");
                        $("#saveNotifyProxyFunction").text("Saved");
                    },

                    error: function() {
                        debug("Failed to save notify proxy function");
                        $("#saveNotifyProxyFunction").text("Save again").addClass("danger");
                    }
                })
            } catch (e) {
                debug("Something bad happened: ", e.toString());

            }
        }
    });


    if (typeof App.application == 'undefined') {
        App.application = new App.ApplicationModel({id:applicationId});
        App.application.fetch({
            success:function (model) {
                var view = new App.AppNotificationsView({model:model});
            }
        });
    } else {
        var view = new App.AppNotificationsView({model:App.application});
    }

});