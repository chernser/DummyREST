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
            this.toggleProxyCode();
            this.updateState();

            var view = this;

            $(".objtypelnk").click(function () {
                $(".objtypelnk").each(function(index, item) {
                    $(item).parent().removeClass("active");
                });
                $(this).parent().addClass('active');
                var objname = $(this).attr('obj');
                view.onObjectSelect(objname);
            });


            var objtypes = this.model.get('objtypes');
            if (this.model.has('objectypes') && objtypes.length > 0) {
                this.onObjectSelect(objtypes[0].name);
            }  else {
                this.drawGrid([
                    {name:""}
                ], "/");
            }
        },


        drawGrid:function (data, url) {

            $("#objectInstances").jqGrid("GridUnload");

            var fields = { _id: 1};
            for (var index in data) {
                var obj = data[index];
                for (var field in obj) {
                    fields[field] = 1;
                }
            }

            var colNames = [];
            var colModel = [];
            for (var field in fields) {
                colNames.push(field);
                colModel.push({
                    name:field,
                    index:field,
                    jsonmap:field
                });
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
                width:800,
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


        getSelectedInstance: function() {
            var rowId = $('#objectInstances').jqGrid('getGridParam', 'selrow');
            if (rowId != null) {
                return $("#objectInstances").jqGrid('getRowData', rowId);
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
                $("#rootAppApiLink").attr("href", api_location).text(api_location);
            } else {
                $("#startAppBtn").attr("disabled", false);
                $("#stopAppBtn").attr("disabled", true);
                $("#rootAppApiLink").attr("href", "#").text("");
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
            'click #showProxyCode':'toggleProxyCode',
            'click #addObjectBtn':'onAddObjectBtn',
            'click #saveObjectDefinition':'onSaveObjectDefinition',
            'click #editProxyCode':'toggleProxyCodeEditable',
            'click #saveProxyCode':'saveObjectTypeProxyCode',
            'keypress #objectTypeProxyCode':'toggleSaveProxyCodeButton',
            'change #routesArePublished':'onRoutesPublish',
            'click #editObjectBtn' : 'onEditObjectInstance',
            'click #saveObjectInstance' : 'onSaveObjectInstance',
            'click #createObjectInstance' : 'onCreateObjectInstance',
            'click #removeObjectBtn' : 'onRemoveObjectInstance'

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

            delete newObjectTypeModel;
        },

        onDeleteObjectType:function () {


        },

        onObjectSelect:function (objname) {
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

            var proxy_code =  (typeof this.selectedObjectType.proxy_code != 'undefined') ?
                    this.selectedObjectType.proxy_code : this.DEFAULT_PROXY_CODE;


            this.proxy_code_changed = false;
            $("#saveProxyCode").attr('disabled', true);
            $("#objectTypeProxyCode").text(proxy_code);
            $("#objectInstances").setGridParam({url:this.BASE_OBJECT_INSTANCES_URL + objname});
            $("#objectInstanceJSON").val("");
            this.reloadInstances();
        },

        toggleProxyCode:function () {
            $("#objectTypeProxyCodeFrm").toggle();
        },

        onAddObjectBtn:function () {
            $("#objectDefinitionBtn").val("{\n\n\n}");
        },

        onSaveObjectDefinition:function () {

        },

        DEFAULT_PROXY_CODE: "function proxy(resource) { \n\t return resource; \n } ",

        proxy_code_changed:false,

        toggleProxyCodeEditable:function () {
            if ($("#objectTypeProxyCode").attr("disabled")) {
                $("#editProxyCode").text("cancel");
                $("#objectTypeProxyCode").attr("disabled", false);
            } else {
                var code = this.selectedObjectType == null ? this.DEFAULT_PROXY_CODE :
                    (typeof this.selectedObjectType.proxy_code == 'undefined' ? this.DEFAULT_PROXY_CODE :
                        this.selectedObjectType.proxy_code);
                this.proxy_code_changed = false;
                $("#saveProxyCode").attr('disabled', true);
                $("#objectTypeProxyCode").val(code);
                $("#editProxyCode").text("edit");
                $("#objectTypeProxyCode").attr("disabled", true);
            }
        },

        saveObjectTypeProxyCode:function () {
            var code = $("#objectTypeProxyCode").val();
            $("#proxyCodeError").text("");
            try {
                var fun = eval("var proxy_fun = " + code);
                debug(proxy_fun({}));

                this.selectedObjectType.proxy_code = code;
                var url = '/api/app/' + this.model.id + '/objtype/' + this.selectedObjectType.name + '/';
                $.ajax({
                    url: url,
                    type: 'PUT',
                    dataType: "json",
                    data: JSON.stringify(this.selectedObjectType),
                    contentType: "application/json",
                    success: function(data) {
                        debug("Object type saved: ", data);
                    },

                    error: function() {
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

        onRoutesPublish:function () {
            var areRoutesPublished = $("#routesArePublished").attr("checked") == 'checked';
            debug("Routes are published: ", areRoutesPublished);

            var view = this;
            this.model.save({routes_are_published:areRoutesPublished}, {
                success:function (model) {
                    view.updateState();
                },

                error:function () {
                    debug("Failed to change state");
                    view.updateState();
                }
            });
        },

        onEditObjectInstance: function() {
            var instance = this.getSelectedInstance();
            debug("Editing instance: ", instance);

            var instance_def = JSON.stringify(instance).split(",").join(",\n").replace("{", "{\n").replace("}", "\n}");
            $("#objectInstanceJSON").val(instance_def);

        },


        updateOrCreateObjectInstance: function(json, update) {
            $("#objectInstanceDefinitionError").text("");
            var instance = null;
            try {
                instance = JSON.parse(json);
                if (instance == null || typeof instance != 'object')  {
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
                    url: url,
                    type: update ? 'PUT' : 'POST',
                    data: JSON.stringify(instance),
                    dataType: "json",
                    contentType: "application/json",
                    success: function() {
                        debug("instance saved");
                        view.reloadInstances();
                    },

                    error: function() {
                        debug("failed to save instance");
                    }
                })
            } catch (e) {
                debug(e);
                $("#objectInstanceDefinitionError").text(e.toString());
            }

        },

        onSaveObjectInstance: function() {
            this.updateOrCreateObjectInstance($("#objectInstanceJSON").val(), true);
        },

        onCreateObjectInstance: function() {
            this.updateOrCreateObjectInstance($("#objectInstanceJSON").val(), false);
        },

        onRemoveObjectInstance: function() {
            var instance = this.getSelectedInstance();
            if (instance == null) {
                return;
            }
            var url = '/api/app/' + this.model.id + '/' + this.selectedObjectType.name + '/' + instance._id;

            debug("Removing instance object", url, " : ", instance);
            var view = this;
            $.ajax({
                url: url,
                type: 'DELETE',
                success: function() {
                    debug("instance removed");
                    view.reloadInstances();
                },

                error: function() {
                    debug("failed to save instance");
                }
            })
        }

    });

    if (typeof App.application == 'undefined') {
        App.application = new App.ApplicationModel({id:applicationId});
        App.application.fetch({
            success:function (model) {
                var view = new App.AppView({model:model});
            }
        });
    } else {
        var view = new App.AppView({model:App.application});
    }


});
