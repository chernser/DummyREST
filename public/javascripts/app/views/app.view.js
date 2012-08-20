require([
    'objecttype.model',
    'testsuite.model',
    'application.model'
], function () {

    App.AppView = Backbone.View.extend({

        BASE_OBJECT_INSTANCES_URL:'/api/app',

        selectedObjectType:null,

        initialize:function (attributes) {
            this.$el = $("#view");
            this.model = attributes.model;
            this.toggleNewObjectTypeForm();
            this.updateState();

            var view = this;

            $(".objtypelnk").click(function () {
                var objname = $(this).attr('obj');
                view.onObjectSelect(objname);
            });


            $("textarea").keydown(function(objEvent) {
                if (objEvent.keyCode == 9) {  //tab pressed
                    var identHolder = "    ";
                    var startPos = this.selectionStart;
                    var endPos = this.selectionEnd;
                    var scrollTop = this.scrollTop;
                    this.value = this.value.substring(0, startPos) + identHolder + this.value.substring(endPos,this.value.length);
                    this.focus();
                    this.selectionStart = startPos + identHolder.length;
                    this.selectionEnd = startPos + identHolder.length;
                    this.scrollTop = scrollTop;

                    objEvent.preventDefault(); // stops its action
                }
            })


            var objtypes = this.model.get('objtypes');
            if (this.model.has('objtypes') && objtypes.length > 0) {
                this.onObjectSelect(objtypes[0].name);
            } else {
                this.drawGrid([
                    {name:""}
                ], "/");
            }
        },


        drawGrid:function (data, url) {

            this.object_instances = data;

            $("#objectInstances").jqGrid("GridUnload");

            var fields = { _id:1};
            for (var index in data) {
                var obj = data[index];
                for (var field in obj) {
                    fields[field] = 1;
                }
            }

            var colNames = [];
            var colModel = [];
            $("#idField").html("");
            for (var field in fields) {
                colNames.push(field);
                colModel.push({
                    name:field,
                    index:field,
                    jsonmap:field
                });

                $("#idField").append("<option value='" + field + "'>" + field + "</option>");
            }



            var options = {
                url:url,
                datatype:'json',
                mtype:'GET',
                colNames:colNames,
                colModel:colModel,
                jsonReader:{
                    repeatitems:false,
                    id:"id",
                    root:function (obj) {
                        return obj;
                    },
                    page:function (obj) {
                        return 1;
                    },
                    total:function (obj) {
                        return 1;
                    },
                    records:function (obj) {
                        return obj.length;
                    }
                },
                width:700,
                rowNum:10,
                rowList:[10, 20, 30],
                sortname:'name',
                sortorder:'desc',
                viewrecords:false,

                ondblClickRow:function (rowid) {
                    that.editSelectedItem();
                }
            };
            $("#objectInstances").jqGrid(options);

        },


        getSelectedInstance:function () {
            var rowId = $('#objectInstances').jqGrid('getGridParam', 'selrow');
            if (rowId != null) {
                // TODO: it is temp solution until table is sorted
                return this.object_instances[rowId - 1];
                //return $("#objectInstances").jqGrid('getRowData', rowId);
            }

            return null;
        },

        reloadInstances:function () {
            if (this.selectedObjectType == null) {
                return;
            }

            var url = '/api/app/' + this.model.id + '/' + this.selectedObjectType.name + '/';


            var view = this;
            $.ajax({
                url:url,
                dataType:"json",
                success:function (data) {
                    view.drawGrid(data, url);
                    if (_.isString(view.selectedObjectType.id_field)) {
                        $("#idField").val(view.selectedObjectType.id_field);
                    }
                },

                error:function (x, e) {
                    debug("Failed to get instances", x, e);
                }
            });
        },

        updateState:function () {

            $("#routesArePublished").attr("checked", this.model.get("routes_are_published") ? "checked" : null);

            if (this.model.get('state') == 'started') {
                $("#startAppBtn").attr("disabled", true);
                $("#stopAppBtn").attr("disabled", false);
                var api_location = "http://" + window.location.hostname + ":" + this.model.get('api_port') + "/api/";
                debug(api_location);
                var link = $("<a target='_blank'></a>").attr("href", api_location).text(api_location);
                $("#rootAppApiLink").html(link);
            } else {
                $("#startAppBtn").attr("disabled", false);
                $("#stopAppBtn").attr("disabled", true);
                $("#rootAppApiLink").html("is not running");
            }

        },

        setAppStateStarting:function (value, callback) {

            if (value == true) {
                debug("Starting application: ", this.model.id);
            } else {
                debug("Stoping application: ", this.model.id);
            }

            var newState = value ? 'starting' : 'stopping';

            var that = this;
            this.model.save({state:newState}, {
                success:function (model) {
                    that.model = model;
                    if (typeof callback == 'function') {
                        callback(model);
                    }
                },

                error:function (model) {
                    debug("Failed to start application");
                }
            });
        },

        events:{
            'click #startAppBtn':'onStartApp',
            'click #stopAppBtn':'onStopApp',
            'click #deleteAppBtn':'onDeleteApp',
            'click #newObjectType':'toggleNewObjectTypeForm',
            'click #cancelNewObjectType':'toggleNewObjectTypeForm',
            'click #createObjectType':'onCreateObjectType',
            'click #deleteObjectType':'onDeleteObjectType',
            'click #addObjectBtn':'onAddObjectBtn',
            'click #saveObjectDefinition':'onSaveObjectDefinition',
            'click #saveProxyCode':'saveObjectTypeProxyCode',
            'keypress #objectTypeProxyCode':'toggleSaveProxyCodeButton',
            'click #editObjectBtn':'onEditObjectInstance',
            'click #saveObjectInstance':'onSaveObjectInstance',
            'click #createObjectInstance':'onCreateObjectInstance',
            'click #removeObjectBtn':'onRemoveObjectInstance',
            'change #idField': 'onIdFieldChange',
            'click #saveRoutePatternBtn' : 'onSaveRoutePattern',
            'click #deleteObjectType' : 'onDeleteObjectType',
            'click #touchObjectBtn' : 'onObjectTouch'
        },

        onStartApp:function () {
            var view = this;
            this.setAppStateStarting(true, function () {
                view.updateState();
            });
        },

        onStopApp:function () {
            var view = this;
            this.setAppStateStarting(false, function () {
                view.updateState();
            });
        },

        onDeleteApp:function () {
            debug("Removing application: ", this.model.id);
        },

        toggleNewObjectTypeForm:function () {
            $("#newObjectFrm").toggle();
        },

        onCreateObjectType:function () {
            var name = $("#newObjectTypeName").val();
            debug("Creating new object type ", name, " for app ", this.model.id);

            var newObjectTypeModel = new App.ObjectTypeModel({app_id:this.model.id, name:name});
            newObjectTypeModel.save(null, {
                success:function (model) {
                    debug("new object type created", model);
                    window.location.reload();
                },

                error:function () {
                    debug("failed to create new object type");
                }
            });


        },

        getObjectTypeRoute: function (objectType) {
            return typeof objectType.route_pattern != 'undefined' ? objectType.route_pattern : '/' + objectType.name + '/{id}/';
        },

        onObjectSelect:function (objname) {
            $(".objtypelnk").each(function (index, item) {
                if ($(this).attr("obj") == objname) {
                    $(item).parent().addClass("active");
                } else {
                    $(item).parent().removeClass("active");
                }
            });
            $(this).parent().addClass('active');


            debug("Object ", objname, " selected in application", this.model.id);

            var objtypes = this.model.get('objtypes');
            this.selectedObjectType = null;
            for (var i in objtypes) {
                if (objtypes[i].name == objname) {
                    this.selectedObjectType = objtypes[i];
                }
            }

            if (this.selectedObjectType == null) {
                $("#objNameHeader > i").text('_none_');
                return;
            }

            $("#objNameHeader > i").text(objname);

            var proxy_code = (typeof this.selectedObjectType.proxy_code != 'undefined') ?
                this.selectedObjectType.proxy_code : this.DEFAULT_PROXY_CODE;

            this.proxy_code_changed = false;
            $("#saveProxyCode").attr('disabled', true);
            $("#objectTypeProxyCode").val(proxy_code);
            $("#objectInstances").setGridParam({url:this.BASE_OBJECT_INSTANCES_URL + objname});
            $("#objectInstanceJSON").val("");
            $("#routePattern").val(this.getObjectTypeRoute(this.selectedObjectType));
            this.reloadInstances();
        },

        onAddObjectBtn:function () {
            $("#objectDefinitionBtn").val("{\n\n\n}");
        },

        onSaveObjectDefinition:function () {

        },

        DEFAULT_PROXY_CODE:"function proxy(resource) { \n\t return resource; \n } ",

        proxy_code_changed:false,

        saveObjectTypeProxyCode:function () {
            var code = $("#objectTypeProxyCode").val();
            $("#proxyCodeError").text("");
            try {
                var fun = eval("var proxy_fun = " + code);

                this.selectedObjectType.proxy_code = code;
                var url = '/api/app/' + this.model.id + '/objtype/' + this.selectedObjectType.name + '/';
                $.ajax({
                    url:url,
                    type:'PUT',
                    dataType:"json",
                    data:JSON.stringify(this.selectedObjectType),
                    contentType:"application/json",
                    success:function (data) {
                        $("#saveProxyCode").attr('disabled', true);
                    },

                    error:function () {
                        debug("Failed to save object type: ");
                    }
                })

            } catch (e) {
                debug(e);
                $("#proxyCodeError").text(e);
            }
        },

        toggleSaveProxyCodeButton:function () {
            if (!this.proxy_code_changed) {
                $("#saveProxyCode").attr('disabled', false);
                this.proxy_code_changed = true;
            }
        },


        onEditObjectInstance:function () {
            var instance = this.getSelectedInstance();
            debug("Editing instance: ", instance);

            var instance_def = JSON.stringify(instance, null, 4);
            $("#objectInstanceJSON").val(instance_def);

        },


        updateOrCreateObjectInstance:function (json, update) {
            $("#objectInstanceDefinitionError").text("");
            var instance = null;
            try {
                instance = JSON.parse(json);
                if (instance == null || typeof instance != 'object') {
                    throw new Error("Invalid Object Instance definition");
                }

                var view = this;
                var url = '/api/app/' + this.model.id + '/' + this.selectedObjectType.name + '/';

                if (update) {
                    url += instance._id; // add id to url
                } else {
                    delete instance['_id']; // remove id because it is new object
                }

                debug("Saving object", url, " : ", instance);

                $.ajax({
                    url:url,
                    type:update ? 'PUT' : 'POST',
                    data:JSON.stringify(instance),
                    dataType:"json",
                    contentType:"application/json",
                    success:function () {
                        debug("instance saved");
                        view.reloadInstances();
                    },

                    error:function () {
                        debug("failed to save instance");
                    }
                })
            } catch (e) {
                debug(e);
                $("#objectInstanceDefinitionError").text(e.toString());
            }

        },

        onSaveObjectInstance:function () {
            this.updateOrCreateObjectInstance($("#objectInstanceJSON").val(), true);
        },

        onCreateObjectInstance:function () {
            this.updateOrCreateObjectInstance($("#objectInstanceJSON").val(), false);
        },

        onRemoveObjectInstance:function () {
            var instance = this.getSelectedInstance();
            if (instance == null) {
                return;
            }
            var url = '/api/app/' + this.model.id + '/' + this.selectedObjectType.name + '/' + instance._id;

            debug("Removing instance object", url, " : ", instance);
            var view = this;
            $.ajax({
                url:url,
                type:'DELETE',
                success:function () {
                    debug("instance removed");
                    view.reloadInstances();
                },

                error:function () {
                    debug("failed to save instance");
                }
            })
        },

        onIdFieldChange: function() {
            var idField = $("#idField").val();
            debug("changing id field to: ", idField);

            this.selectedObjectType.id_field = idField;
            var selectedObjectTypeModel = new App.ObjectTypeModel(this.selectedObjectType);
            selectedObjectTypeModel.save({id: this.selectedObjectType.name}, {
                success: function(model) {
                    debug("idField is set for ", model.get('name'));
                },

                error: function() {
                    debug("Failed to set id field");
                }
            })

        },

        onSaveRoutePattern: function()  {
            var route_pattern = $("#routePattern").val();
            if (route_pattern.charAt(route_pattern.length - 1) != '/') {
                route_pattern += '/';
                $("#routePattern").val(route_pattern);
            }
            debug("saving route pattern: ", route_pattern, " for object type: ", this.selectedObjectType.name);

            this.selectedObjectType.route_pattern = route_pattern;

            debug(this.selectedObjectType);
            var selectedObjectTypeModel = new App.ObjectTypeModel(this.selectedObjectType);
            selectedObjectTypeModel.save({id: this.selectedObjectType.name}, {
                success: function(model)  {
                    debug("route_pattern saved");
                },

                error: function() {
                    debug("Failed to save route_pattern ");
                }
            });
        },

        onDeleteObjectType: function() {
            debug("Delete object type");
            var selectedObjectTypeModel = new App.ObjectTypeModel(this.selectedObjectType);
            selectedObjectTypeModel.id = this.selectedObjectType.name;
            selectedObjectTypeModel.destroy({
                success: function() {
                    window.location.reload(true);
                },

                error: function() {
                    debug("Failed to delete object type");
                }
            })
        },

        onObjectTouch: function() {
            var instance = this.getSelectedInstance();
            debug("Touching instance: ", instance);

            var instance_def = JSON.stringify(instance, null, 4);
            this.updateOrCreateObjectInstance(instance_def, true);
        }

    });

    function initRouter() {
        App.Router = Backbone.Router.extend({

            routes:{
                "instances":"showInstances",
                "proxy_fun":"showProxyFun",
                "routes":"showRoutes"
            },

            showPane:function (pane) {
                $(".tab-pane").removeClass('active');
                $("#" + pane).addClass('active');

                $("#tabNavigation li").removeClass('active');
                $("#tabNavigation li").find("[href='#" + pane + "']").parent().addClass('active');
            },

            showInstances:function () {
                this.showPane('instances');
            },

            showProxyFun:function () {
                this.showPane('proxy_fun');
            },

            showRoutes:function () {
                this.showPane('routes');
            }

        });

        if (typeof Backbone.history != 'undefined') {
            Backbone.history.stop();
        }

        new App.Router();


        Backbone.history.start();

    }

    function initSubView(model) {
        if (typeof App.SubView != 'undefined') {
            debug("initializing subview");
            var view = new App.SubView({model: model});

        }
    }

    if (typeof App.application == 'undefined') {
        App.application = new App.ApplicationModel({id:applicationId});
        App.application.fetch({
            success:function (model) {
                var view = new App.AppView({model:model});
                initSubView(model);
                initRouter();
            }
        });
    } else {
        var view = new App.AppView({model:App.application});
        initSubView(App.application);
        initRouter();
    }


});
