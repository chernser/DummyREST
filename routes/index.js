var app_storage = require('../app_storage.js')(function() { console.log("App Storage is ready"); });

/*
 * GET home page.
 */

exports.index = function(req, res){
  app_storage.getApplicationList(function(applications) {
    res.render('index', { title: 'DummyREST', applications: applications });
  });
};

exports.about = function(req, res) {
  res.render('about', {title: 'About'});
};

exports.application = function(req, res) {
  console.log('Showing application: ', req.params.id);

  var subject = 'objects';
  if (req.params.subject == 'testsuites') {
    subject = 'testsuites';
  } else if (req.params.subject == 'notifications') {
    subject = 'notifications';
  } else if (req.params.subject == 'plugins') {
    subject = 'plugins';
  }

  app_storage.getApplication(req.params.id, function(application) {
    if (typeof application == 'undefined') {
      res.render('app_notfound', {title: 'DummyREST'});
      return;
    }
    res.render('app', {title: 'DummyREST',  app:application,
      sub_view: subject});
  });
};