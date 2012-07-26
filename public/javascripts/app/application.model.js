App.ApplicationModel = Backbone.Model.extend({

    urlRoot:'/api/app/',


    validate:function () {

        if (!_.isString(this.name)) false;
    }
});




