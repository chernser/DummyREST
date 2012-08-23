App.ObjectTypeModel = Backbone.Model.extend({

  initialize:function (attributes) {
    this.attributes.name = attributes.name;
    this.urlRoot = '/api/app/' + attributes.app_id + '/objtype/';

    debug(this);
  }
});