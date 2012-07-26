var app_storage = require('../app_storage.js')(onReady);


function onReady() {
    var application = {
        name:"Sample Application 1"
    };


    //app_storage.addApplication(application);
    app_storage.getApplicationList(function(items) {
        console.log("Appp", items);
    });

    console.log("DONE");
}


