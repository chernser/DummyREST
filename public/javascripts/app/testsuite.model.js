var TestsuiteModel = Backbone.Model.extend({
  urlRoot: '/api/app/:id/testsuite/',
  appModel: null,

  initialize: function(attributes) {
    this.appModel = attributes.appModel;
    this.urlRoot = '/api/app/' + this.appModel.id + '/testsuite/';
  }
});