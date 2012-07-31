/**
 * Handles application API
 */

module.exports.createApi = function (app_id, port) {
    return new AppApi(app_id, port);
};

function AppApi(app_id, port) {
    if (typeof app_id == 'undefined' || app_id == 0) {
        throw "Application not selected";
    }
    this.app_id = new Number(app_id).valueOf();

    if (typeof port == 'undefined' || port < 8100) {
        port = 8100 + app_id;
    }
    this.port = new Number(port).valueOf();
    console.log("Using port ", this.port, " for application ", this.app_id);

    this.init();
}

AppApi.prototype.DEFAULT_RESOURCE_PROXY = function (resource) {
    return resource;
};

AppApi.prototype.init = function () {
    var express = require('express')
        , routes = require('./routes')
        , app_storage = require('./app_storage.js')()
        , socket_io = require('socket.io')
        , api = this;


    this.app = app = module.exports = express.createServer();
    this.app_storage = app_storage;

    // Configuration
    app.configure(function () {
        app.set('views', __dirname + '/views');
        app.set('view engine', 'jade');
        app.set('view options', { pretty:true });
        app.use(express.bodyParser());
        app.use(express.methodOverride());
        app.use(express.compiler({ src:__dirname + '/public', enable:['less']}));
        app.use(express.cookieParser());
        app.use(express.session({ secret:'your secret here' }));
        app.use(app.router);
        app.use(express.static(__dirname + '/public'));
    });


    app.configure('development', function () {
        app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
    });

    app.configure('production', function () {
        app.use(express.errorHandler());
    });


    var app_id = this.app_id;
    // Socket.IO
    this.socket_io_port = 10100 + app_id;
    this.io = socket_io.listen(this.socket_io_port);

    this.io.on('connection', function (socket) {
        api.socket = socket;
    });


    // Express.JS
    app.get(/^\/api2\/((\w+\/?)+)/, function (req, res) {
        var parts = req.params[0].split('/');


        res.send(200);

    });

    app.get('/api/', function (req, res) {
        app_storage.getApplication(app_id, function (application) {

            var api_def = {
                app_id:application.id,
                app_name:application.name,

                _resources:[]
            };

            for (var i in application.objtypes) {
                var objType = application.objtypes[i];
                var baseUrl = '/api/' + objType.name;

                api_def._resources.push({
                    ref:objType.name,
                    url:baseUrl
                });

                api_def['create_' + objType.name] = {rel:"create", url:baseUrl};
            }

            res.json(api_def);

        });

    });

    app.get('/api/:resource/:id?', function (req, res) {
        api.handleGet(req.params.resource, req.params.id, function (err, object) {
            if (err != null) {
                res.send(err);
            } else {
                res.json(object);
            }
        });
    });

    app.put('/api/:resource/:id', function (req, res) {
        api.handlePut(req.params.resource, req.body, function (err, object) {
            if (err != null) {
                res.send(err);
            } else {
                res.json(object);
            }
        });
    });


    app.post('/api/:resource/', function (req, res) {
        api.handlePost(req.params.resource, req.body, function (err, object) {
            if (err != null) {
                res.send(err);
            } else {
                res.json(object);
            }
        });
    });

    app.delete('/api/:resource/:id', function (req, res) {
        api.handlePost(req.params.resource, req.body, function (err, object) {
            if (err != null) {
                res.send(err);
            } else {
                res.send(200);
            }
        });
    });

    app.get('/', function (req, res) {
        res.render('app_index', {title:'Application ' + app_id});

    });


    console.log("socket.io port: ", this.socket_io_port);
    app.get('/socket_test/', function (req, res) {
        res.render('socket_io_test', { title:'Application ' + app_id,
            app_id:app_id, socket_io_port:api.socket_io_port});
    });
};


AppApi.prototype.getObjectType = function (resource, callback) {
    this.app_storage.getObjectType(this.app_id, resource, function (err, objectType) {
        if (err == 'not_found') {
            callback(404, null);
            return;
        }

        callback(null, objectType);
    });
};

function getProxy(objectType, defaultProxy) {
    if (typeof objectType.proxy_code != 'undefined') {
        var eval_result = eval(objectType.proxy_code);
        if (typeof proxy == 'undefined') {
            return defaultProxy;
        }
        return proxy;
    } else {
        return defaultProxy;
    }
}

function getObjectId(id, objectType) {
    return typeof objectType.id_field != 'undefined' ? {field: objectType.id_field, id: id} : id;
}

AppApi.prototype.handleGet = function (resource, id, callback) {
    var api = this;
    api.getObjectType(resource, function (err, objectType) {
        if (err != null) {
            callback(err, null);
            return;
        }
        var proxy = getProxy(objectType, api.DEFAULT_RESOURCE_PROXY);

        if (typeof id != 'undefined' && id != null) {
            id = getObjectId(id, objectType);

            api.app_storage.getObjectInstance(api.app_id, objectType.name, id, function (resource) {
                if (typeof resource != 'undefined') {
                    callback(null, proxy(resource));
                } else {
                    callback(null, null);
                }
            });
        } else {
            api.app_storage.getObjectInstances(api.app_id, objectType.name, function (resources) {
                var response = [];
                for (var i in resources) {
                    response.push(proxy(resources[i]));
                }
                callback(null, response);
            })
        }
    });
};

AppApi.prototype.handlePut = function (resource, instance, callback) {
    var api = this;
    api.getObjectType(resource, function (err, objectType) {
        if (err != null) {
            callback(err, null);
            return;
        }

        var proxy = getProxy(objectType, api.DEFAULT_RESOURCE_PROXY);
        id = getObjectId(id, objectType);
        api.app_storage.saveObjectInstance(api.app_id, objectType.name, instance, function (saved) {
            var resource = proxy(saved);
            api.notifyResourceChanged(saved);
            callback(null, resource);
        });
    });
};

AppApi.prototype.handlePost = function (resource, instance, callback) {
    var api = this;
    api.getObjectType(resource, function (err, objectType) {
        if (err != null) {
            callback(err, null);
            return;
        }

        var proxy = getProxy(objectType, api.DEFAULT_RESOURCE_PROXY);

        api.app_storage.addObjectInstace(api.app_id, objectType.name, instance, function (saved) {
            callback(null, proxy(saved));
        });
    });
};

AppApi.prototype.handleDelete = function (resource, id, callback) {
    var api = this;
    api.getObjectType(resource, function (err, objectType) {
        if (err != null) {
            callback(err, null);
            return;
        }
        id = getObjectId(id, objectType);
        api.app_storage.deleteObjectInstance(api.app_id, objectType.name, id, function () {
            callback(null, null);
        });
    });
};


AppApi.prototype.start = function () {
    var app = this.app;
    app.listen(this.port, function () {
        console.log("AppAPI listening on port %d in %s mode", app.address().port, app.settings.env);
    });
};


AppApi.prototype.stop = function () {
    var app = this.app;
    app.close();
};

// Constants
AppApi.prototype.HTTP_ROUTER_EXCHANGE = "f9.http_handler.router";
AppApi.prototype.HTTP_CONF_EXCHANGE = "f9.http_handler.http.conf";
AppApi.prototype.APP_API_EXCHANGE = "dummy.api.app_api";
AppApi.prototype.ADD_ROUTES_ACTION = "add_routes";
AppApi.prototype.DEL_ROUTES_ACTION = "del_routes";


AppApi.prototype.composeRoutesMsg = function (action) {
    var routes = [
        {
            pattern:'api*',
            weight:1,
            destination:"amqp:" + this.APP_API_EXCHANGE + ":app_" + this.app_id
        }
    ];


    return {
        action:action,
        routes:routes
    };

};

AppApi.prototype.sendResponseMsg = function (attributes, req) {

    var api = this;
    var to_node = null;
    var to_pid = null;
    for (var node in req.from) {
        to_pid = req.from[node];
        to_node = node;
        break;
    }
    var response = {
        to:to_pid,
        httpStatus:200
    };

    if (typeof attributes.httpStatus != 'undefined') {
        response.httpStatus = attributes.httpStatus;
    }

    if (typeof  attributes.body != 'undefined') {
        response.httpBody = JSON.stringify(attributes.body);
    }

    console.log("Sending response: ", response);
    api.amqp_connection.exchange(api.HTTP_CONF_EXCHANGE, {}, function (exchange) {
        exchange.publish(to_node, response, {contentType:'application/json'});
    });
};

AppApi.prototype.publish_routes = function () {
    console.log("Publishing routes for appId: ", this.app_id);
    var routes = this.composeRoutesMsg(this.ADD_ROUTES_ACTION);
    var app_id = this.app_id;
    var api = this;
    var amqp = require('amqp');

    this.amqp_connection = amqp.createConnection({url:"amqp://guest:guest@localhost:5672"}, {}, function (connection) {

        console.log("amqp connected for application: ", app_id);
        connection.exchange(api.HTTP_ROUTER_EXCHANGE, {}, function (exchange) {
            exchange.publish("", routes, {
                contentType:'application/json'
            });
            console.log("Routes ", routes, " were published");
        });


        connection.exchange(api.APP_API_EXCHANGE, {}, function (exchange) {

            connection.queue(exchange.name + "_" + app_id, function (queue) {
                queue.bind(api.APP_API_EXCHANGE, "app_" + app_id);
                var opts = {};
                queue.subscribe(opts, function (message, headers, delivereInfo) {
                    console.log(">> message from http_handler: ", message);
                    var path_callback = null;

                    var parsed_path = message.path.split("/");
                    var resource = parsed_path[parsed_path.length - 2];
                    var resource_id = parsed_path[parsed_path.length - 1];
                    var instance = message.httpBody != '' ? JSON.parse(message.httpBody) : {};

                    if (message.httpMethod == 'GET') {
                        console.log("> resource ", resource, " id ", resource_id);
                        api.app_storage.getObjectType(api.app_id, resource, function (objectType) {
                            if (objectType == null || typeof objectType == 'undefined') {
                                console.log("unknown object type: ", resource);
                                resource = resource_id;
                                resource_id = null;
                            }

                            api.handleGet(resource, resource_id, function (err, object) {
                                if (err != null) {
                                    api.sendResponseMsg({httpStatus:400}, message);
                                } else {
                                    api.sendResponseMsg({httpStatus:200, body:object}, message);
                                }
                            });
                        });


                    } else if (message.httpMethod == 'POST') {
                        api.handlePost(resource, instance, function (err, object) {
                            api.sendResponseMsg({httpStatus:200, body:object}, message);
                        });
                    } else if (message.httpMethod == 'PUT') {
                        api.handlePut(resource, instance, function (err, object) {
                            api.sendResponseMsg({httpStatus:200, body:object}, message);
                        });
                    } else if (message.httpMethod == 'DELETE') {
                        api.handleDelete(resource, resource_id, function (err, object) {
                            api.sendResponseMsg({httpStatus:200}, message);
                        });
                    }
                    // TODO: add code handling routes
                });
            });
        });

    });
};


AppApi.prototype.unpublish_routes = function () {
    var routes = this.composeRoutesMsg(this.DEL_ROUTES_ACTION);
    this.amqp_connection.exchange(this.HTTP_ROUTER_EXCHANGE, {}, function (exchange) {
        exchange.publish("", routes, {
            contentType:'application/json'
        });
    });
};

function DEFAULT_NOTIFY_PROXY(event, resource) {
    event.data = resource;
    return event;
}

function getNotifyProxy(application) {
    if (typeof application.notify_proxy_fun != 'undefined') {
        try {
            eval(application.notify_proxy_fun);
            return proxy;
        } catch (e) {
            console.log("Error: failed to eval notify proxy function: ", e.toString(), e);
        }
    }

    return DEFAULT_NOTIFY_PROXY;
}


AppApi.prototype.send_event = function (eventName, eventData) {
    var api = this;

    if (typeof api.socket == 'undefined') {
        console.log("Socket is not yet initialized");
        return;
    }
    api.app_storage.getApplication(api.app_id, function (application) {

        var proxy = getNotifyProxy(application);
        var event = proxy({name:eventName, type:'event'}, eventData);

        if (typeof event.name != 'undefined' && event.name != '') {
            eventName = event.name;
        }

        if (typeof event.data != 'undefined') {
            eventData = event.data;
        }
        api.socket.emit(eventName, eventData);
    });

};

AppApi.prototype.notifyResourceChanged = function (resource) {
    this.send_event('resource_updated', resource);
};

AppApi.prototype.notifyResourceCreated = function (resource) {
    this.send_event('resource_created', resource);
};

AppApi.prototype.notifyResourceDeleted = function (resource) {
    this.send_event('resource_deleted', resource);
};