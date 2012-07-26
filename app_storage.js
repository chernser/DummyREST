/**
 *  app_storage.js
 *
 *  Hold routines to manage application structure:
 *  1. create/remove application
 *  2. add/remove testsuites to application
 *  3. bootstrap resources
 *
 */



function getAppNextId(db, callback) {
    var collection = db.collection('sequences');

    collection.findAndModify({name:"appSeqNumber"}, {}, {$inc:{ value:1}},
        function (err, result) {
            if (err != null) {
                throw err;
            }

            callback(result.value);
        });
}

function getNextAppResId(db, appId, callback) {
    var collection = db.collection('applications');

    collection.findAndModify({id:appId}, {}, {$inc:{ appResLastId:1}},
        function (err, result) {
            if (err != null) {
                throw err;
            }

            callback(result.appResLastId);
        });
}


function AppStorage(callback) {
    // Imports
    var mongo_db = require("mongodb");

    this.ObjectID = mongo_db.ObjectID;

    // Local
    this.db = new mongo_db.Db("application_storage",
        new mongo_db.Server('localhost', 27017, {}), {});


    var ownCallback = function () {
        if (typeof callback == 'function') {
            callback();
        }
    }


    // Preparing db connection
    var that = this;
    this.db.open(function (err, db) {
        if (err != null) {
            console.log("Db Error: ", err);
            return null;
        }

        that.db.ensureIndex('applications', {id:1}, {unique:true});
        that.db.ensureIndex('sequences', {name:1}, {unique:true});
        that.db.collection('sequences', function (err, collection) {
            collection.insert({name:'appSeqNumber', value:1});
        });

        ownCallback();
    });

    return this;
}

function getValue(field, defaultValue) {
    if (typeof field == 'undefined') {
        return defaultValue;
    }

    return field;
}

function fixApplicationFields(application) {
    if (typeof application == 'undefined') {
        return;
    }

    application.objtypes = getValue(application.objtypes, []);

    delete application._id;
    delete application.appResLastId;

    return application;
}

AppStorage.prototype = {

    getStateDiff:function (oldState, newState) {

        var diff = {};

        // Copy not matching fields
        for (var field in oldState) {
            if (typeof newState[field] != 'undefined') {
                if (newState[field] != oldState[field]) {
                    diff[field] = {
                        oldS:oldState[field],
                        newS:newState[field]
                    };
                }
            }
        }

        // Copy all new fields
        for (var field in newState) {
            if (typeof oldState[field] == 'undefined') {
                diff[field] = { newS:newState[field] };
            }
        }

        return diff;
    },

    getApplicationList:function (callback) {
        if (this.db.state != 'connected') throw 'db not connected';

        var collection = this.db.collection('applications');

        var cursor = collection.find({});

        cursor.toArray(function (err, items) {
            if (err != null) {
                throw err;
            }

            if (typeof callback == 'function') {
                var fixedItems = [];
                for (var i in items) {
                    fixedItems.push(fixApplicationFields(items[i]));
                }
                callback(fixedItems);
            }
        })
    },


    addApplication:function (application, callback) {
        if (this.db.state != 'connected') throw 'db not connected';

        if ((typeof application.name == 'undefined') ||
            (application.name == '') || application.name == null) {
            throw 'application.name is null';
        }

        application.appResLastId = 0;

        var collection = this.db.collection('applications');
        getAppNextId(this.db, function (appId) {
            application.id = appId;
            collection.save(application);
            if (typeof callback == 'function') {
                callback(fixApplicationFields(application));
            }
        });
    },

    saveApplication:function (application, callback) {
        if (this.db.state != 'connected') throw 'db not connected';

        delete application.appResLastId;

        application.id = new Number(application.id).valueOf();
        this.db.collection('applications', function (err, collection) {
            if (err != null) {
                throw err;
            }

            var selector = {id:application.id};
            collection.update(selector, application, {safe:true}, function (err, saved) {
                if (err != null) {
                    throw err;
                }

                collection.find(selector, function (err, cursor) {
                    if (err != null) {
                        throw err;
                    }

                    if (typeof callback == 'function') {
                        cursor.toArray(function (err, items) {
                            callback(fixApplicationFields(items[0]));
                        });
                    }

                });

            });
        });
    },

    getApplication:function (applicationId, callback) {
        if (this.db.state != 'connected') throw 'db not connected';

        var collection = this.db.collection('applications');
        applicationId = new Number(applicationId).valueOf();

        collection.find({id:applicationId},
            function (err, cursor) {
                cursor.toArray(function (err, items) {
                    callback(fixApplicationFields(items[0]));
                });
            });
    },


    deleteApplication:function (applicationId, callback) {
        if (this.db.state != 'connected') throw 'db not connected';

        applicationId = new Number(applicationId).valueOf();
        this.db.collection('applications', function (err, collection) {
            collection.remove({id:applicationId});

            if (typeof callback == 'function') {
                callback();
            }
        });
    },

    addObjectType:function (appId, objectType, callback) {
        if (typeof objectType.name == 'undefined' || objectType.name == '') {
            throw new Error("Empty object type name");
        }

        var storage = this;
        storage.getApplication(appId, function (application) {

            for (var index in application.objtypes) {
                if (application.objtypes[index].name == objectType.name) {
                    if (typeof callback == 'function') {
                        callback('already_exists', application.objtypes[index]);
                    }
                    return;
                }
            }

            application.objtypes.push(objectType);

            storage.saveApplication(application, function () {
                if (typeof callback == 'function') {
                    callback(null, objectType);
                }
            });

        });
    },

    getObjectType:function (appId, objectTypeName, callback) {
        var storage = this;
        storage.getApplication(appId, function (application) {
            if (typeof application == 'undefined')  {
                callback('not_found', null);
                return;
            }

            for (var index in application.objtypes) {
                if (application.objtypes[index].name == objectTypeName) {
                    if (typeof callback == 'function') {
                        callback(null, application.objtypes[index]);
                    }
                    return;
                }
            }
            callback('not_found', null);
        });
    },


    saveObjectType:function (appId, objectType, callback) {
        var storage = this;
        storage.getApplication(appId, function (application) {

            var doUpdate = false;
            for (var index in application.objtypes) {
                if (application.objtypes[index].name == objectType.name) {
                    application.objtypes[index] = objectType;
                    doUpdate = true;
                    break;
                }
            }


            if (doUpdate) {
                storage.saveApplication(application, function () {
                    if (typeof callback == 'function') {
                        callback(null, objectType);
                    }
                });
            } else {
                if (typeof callback == 'function') {
                    callback('not_found', null);
                }
            }

        });
    },


    deleteObjectType:function (appId, objectTypeName, callback) {
        var storage = this;
        storage.getApplication(appId, function (application) {

            var doUpdate = false;
            for (var index in application.objtypes) {
                if (application.objtypes[index].name == objectType.name) {
                    delete application.objtypes[index];
                    doUpdate = true;
                    break;
                }
            }


            if (doUpdate) {
                storage.saveApplication(application, function () {
                    if (typeof callback == 'function') {
                        callback(null, objectType);
                    }
                });
            } else {
                if (typeof callback == 'function') {
                    callback('not_found', null);
                }
            }

        });
    },

    getResourceCollection:function (appId, objectTypeName) {
        return this.db.collection('app_resources_' + appId + '_' + objectTypeName);
    },

    addObjectInstace:function (appId, objectTypeName, instance, callback) {
        if (this.db.state != 'connected') throw 'db not connected';

        var collection = this.getResourceCollection(appId, objectTypeName);
        collection.insert(instance, function (err, object) {
            if (err != null) {
                throw err;
            }

            if (typeof callback == 'function') {
                callback(object)
            }
        });
    },

    saveObjectInstance:function (appId, objectTypeName, instance, callback) {
        if (this.db.state != 'connected') throw 'db not connected';

        var collection = this.getResourceCollection(appId, objectTypeName);
        var instance_id = this.createIdObject(instance._id);
        if (instance_id == null) {
            if (typeof callback == 'function')
                callback(null);
            return;
        }

        delete instance['_id'];

        collection.findAndModify({_id:instance_id}, {}, instance, {safe:true, 'new':true}, function (err, saved) {
            if (err != null) {
                throw err;
            }

            console.log("saved: ", saved);
            if (typeof callback == 'function') {
                callback(saved);
            }
        });
    },

    createIdObject: function(id) {
        try {
            return this.ObjectID.createFromHexString(id);
        } catch (e ) {
            console.log(e);
           return null;
        }
    },


    getObjectInstance:function (appId, objectTypeName, instanceId, callback) {
        if (this.db.state != 'connected') throw 'db not connected';


        var collection = this.getResourceCollection(appId, objectTypeName);
        var instance_id = this.createIdObject(instanceId);
        if (instance_id == null) {
            if (typeof callback == 'function')
            callback(null);
            return;
        }
        collection.find({_id:instance_id}, function (err, cursor) {
            if (err != null) {
                throw err;
            }

            if (typeof callback == 'function') {
                cursor.toArray(function (err, items) {

                    callback(items[0]);
                });
            }

        });
    },

    getObjectInstances:function (appId, objectType, callback) {
        if (this.db.state != 'connected') throw 'db not connected';

        var collection = this.getResourceCollection(appId, objectType);
        collection.find({}, function (err, cursor) {
            if (err != null) {
                throw err;
            }

            if (typeof callback == 'function') {
                cursor.toArray(function (err, items) {
                    callback(items);
                });
            }
        });

    },

    deleteObjectInstance:function (appId, objectTypeId, instanceId, callback) {
        if (this.db.state != 'connected') throw 'db not connected';

        var collection = this.getResourceCollection(appId, objectTypeName);
        var instance_id = this.createIdObject(instanceId);
        if (instance_id == null) {
            if (typeof callback == 'function')
                callback();
            return;
        }

        collection.remove({_id:instance_id}, function (err, cursor) {
            if (err != null) {
                throw err;
            }

            if (typeof callback == 'function') {
                callback();
            }

        });
    },

    addTestsuite:function (applicationId, callback) {


    },

    removeTestsuite:function (applicationId, callback) {


    }

}

module.exports = function (callback) {

    return new AppStorage(callback);
}