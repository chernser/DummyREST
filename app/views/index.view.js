

var IndexView = Backbone.View.extend({

    events: {
        'click #createAppBtn' : 'onCreateAppBtn'
    },


    onCreateAppBtn: function() {
        console.log("Create button pressed");
    }


});

new IndexView();