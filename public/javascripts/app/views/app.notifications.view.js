require([
    'objecttype.model',
    'testsuite.model',
    'application.model'
], function () {

    App.SubView = Backbone.View.extend({

        initialize:function (attributes) {
            this.$el = $("#sub_view");
            this.model = attributes.model;

            this.notificationApiUrl = "http://" + window.location.hostname + ':' + (8100 + this.model.get("id")) + '/socket_test/';
            $("#notificationTestPageLink").attr("href", this.notificationApiUrl);

            this.updateProxyFunction();

            this.updateSendNotificationPanel();

            var view = this;
            this.model.on("change", function () {
                if (view.model.hasChanged("state")) {
                    view.updateSendNotificationPanel();
                }
            });
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

        updateSendNotificationPanel: function() {
            if (this.model.get("state") == 'started') {
                $("#sendNotificationForm").removeClass("hidden");
                $("#sendNotificationFormPlaceholder").addClass("hidden");
            } else {
                $("#sendNotificationForm").addClass("hidden");
                $("#sendNotificationFormPlaceholder").removeClass("hidden");
            }

        },

        events:{
            'click #saveNotifyProxyFunction':'onSaveNotifyProxyFunction',
            'click #sendNotification':'onSendEvent'

        },

        onSaveNotifyProxyFunction:function () {
            debug("Saving notification proxy function");
            $("#saveNotifyProxyFunction").text("Saving...");
            try {
                var code = $("#notifyProxyFunction").val();
                eval(code);
                var result = proxy({name:'test_event', type:'msg'}, {id:123, value:333});
                $("#proxySimpleTestOutput").html("<b>Simple test result: </b>" + JSON.stringify(result));
                this.model.set("notify_proxy_fun", code);
                this.model.save(null, {
                    success:function () {
                        debug("Model saved");
                        $("#saveNotifyProxyFunction").text("Saved");
                    },

                    error:function () {
                        debug("Failed to save notify proxy function");
                        $("#saveNotifyProxyFunction").text("Save again").addClass("danger");
                    }
                })
            } catch (e) {
                debug("Something bad happened: ", e.toString());

            }
        },

        onSendEvent:function () {
            var event = {name:$("#eventName").val(), data:$("#eventData").val()};
            debug("Sending event: ", event);


            $.ajax({
                url: this.notificationApiUrl + 'event',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify(event),
                type: 'POST',
                success: function() {
                    debug("event sent");
                    $("#sendResult").text("Sent OK.");
                },

                error: function() {
                    debug("Failed to send event");
                    $("#sendResult").text("Sent BAD.");
                }

            })
        }
    });
});
