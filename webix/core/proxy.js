define(["webix/core/webix"], function webix_proxy(webix){
    webix.proxy = function(name, source, extra){
	    webix.assert(webix.proxy[name], "Invalid proxy name: "+name);

	    var copy = webix.copy(webix.proxy[name]);
	    copy.source = source;

	    if (extra)
		    webix.extend(copy, extra, true);

	    if (copy.init) copy.init();
	    return copy;
    };

    webix.proxy.$parse = function(value){
	    if (typeof value == "string" && value.indexOf("->") != -1){
		    var parts = value.split("->");
		    return webix.proxy(parts[0], parts[1]);
	    }
	    return value;
    };

    webix.proxy.post = {
	    $proxy:true,
	    load:function(view, callback, params){
		    params = webix.extend(params||{}, this.params || {}, true);
		    webix.ajax().bind(view).post(this.source, params, callback);
	    }
    };

    webix.proxy.sync = {
	    $proxy:true,
	    load:function(view, callback){
		    webix.ajax().sync().bind(view).get(this.source, null, callback);
	    }
    };

    webix.proxy.connector = {
	    $proxy:true,

	    connectorName:"!nativeeditor_status",
	    load:function(view, callback){
		    webix.ajax(this.source, callback, view);
	    },
	    saveAll:function(view, updates, dp, callback){
		    var url = this.source;

		    var data = {};
		    var ids = [];
		    for (var i = 0; i < updates.length; i++) {
			    var action = updates[i];
			    ids.push(action.id);

			    for (var j in action.data)
				    if (j.indexOf("$")!==0)
					    data[action.id+"_"+j] = action.data[j];
			    data[action.id+"_"+this.connectorName] = action.operation;
		    }

		    data.ids = ids.join(",");
		    data.webix_security = webix.securityKey;
	        
		    url += (url.indexOf("?") == -1) ? "?" : "&";
		    url += "editing=true";

		    webix.ajax().post(url, data, callback);
	    },
	    result:function(state, view, dp, text, data, loader){
		    data = data.xml();
		    if (!data)
			    return dp._processError(null, text, data, loader);
		    

		    var actions = data.data.action;
		    if (!actions.length)
			    actions = [actions];


		    var hash = [];

		    for (var i = 0; i < actions.length; i++) {
			    var obj = actions[i];
			    hash.push(obj);

			    obj.status = obj.type;
			    obj.id = obj.sid;
			    obj.newid = obj.tid;

			    dp.processResult(obj, obj, {text:text, data:data, loader:loader});
		    }

		    return hash;
	    }
    };

    webix.proxy.debug = {
	    $proxy:true,
	    load:function(){},
	    save:function(v,u,d,c){
		    webix.delay(function(){
			    window.console.log("[DP] "+u.id+" -> "+u.operation, u.data);
			    var data = {
				    id:u.data.id,
				    newid:u.data.id,
				    status:u.data.operation
			    };
			    d.processResult(data, data);
		    });
	    }
    };

    webix.proxy.rest = {
	    $proxy:true,
	    load:function(view, callback){
		    webix.ajax(this.source, callback, view);
	    },
	    save:function(view, update, dp, callback){
		    return webix.proxy.rest._save_logic.call(this, view, update, dp, callback, webix.ajax());
	    },
	    _save_logic:function(view, update, dp, callback, ajax){
		    var url = this.source;
		    var query = "";
		    var mark = url.indexOf("?");

		    if (mark !== -1){
			    query = url.substr(mark);
			    url = url.substr(0, mark);
		    }

		    url += url.charAt(url.length-1) == "/" ? "" : "/";
		    var mode = update.operation;


		    var data = update.data;
		    if (mode == "insert") delete data.id;

		    //call rest URI
		    if (mode == "update"){
			    ajax.put(url + data.id + query, data, callback);
		    } else if (mode == "delete") {
			    ajax.del(url + data.id + query, data, callback);
		    } else {
			    ajax.post(url + query, data, callback);
		    }
	    }
    };

    webix.proxy.json = {
	    $proxy:true,
	    load:function(view, callback){
		    webix.ajax(this.source, callback, view);
	    },
	    save:function(view, update, dp, callback){
		    var ajax = webix.ajax().headers({ "Content-Type":"application/json" });
		    return webix.proxy.rest._save_logic.call(this, view, update, dp, callback, ajax);
	    }
    };

    webix.proxy.faye = {
	    $proxy:true,
	    init:function(){
		    this.clientId = this.clientId || webix.uid();
	    },
	    load:function(view){
		    var selfid = this.clientId;

		    this.client.subscribe(this.source, function(update){
			    if (update.clientId == selfid) return;

			    webix.dp(view).ignore(function(){
				    if (update.operation == "delete")
					    view.remove(update.data.id);
				    else if (update.operation == "insert")
					    view.add(update.data);
				    else if (update.operation == "update"){
					    var item = view.getItem(update.data.id);
					    if (item){
						    webix.extend(item, update.data, true);
						    view.refresh(item.id);
					    }
				    }
			    });
		    });
	    },
	    save:function(view, update, dp, callback){
		    update.clientId = this.clientId;
		    this.client.publish(this.source, update);
	    }
    };

    //indexdb->database/collection
    webix.proxy.indexdb = {
	    $proxy:true,
	    create:function(db, config, version, callback){
		    this.source = db + "/";
		    this._get_db(callback, version, function(e){
			    var db = e.target.result;
			    for (var key in config){
				    var data = config[key];
				    var store = db.createObjectStore(key, { keyPath: "id", autoIncrement:true });
				    for (var i = 0; i < data.length; i++)
					    store.put(data[i]);
			    }
		    });
	    },
	    _get_db:function(callback, version, upgrade){
		    if (this.source.indexOf("/") != -1){
			    var parts = this.source.split("/");
			    this.source = parts[1];
			    version = version || parts[2];

			    var _index = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;

			    var db;
			    if (version)
				    db = _index.open(parts[0], version);
			    else
				    db = _index.open(parts[0]);

			    if (upgrade)
				    db.onupgradeneeded = upgrade;
			    db.onerror = function(){ };
			    db.onblocked = function(){ };
			    db.onsuccess = webix.bind(function(e){
				    this.db =  e.target.result;
				    if (callback)
					    callback.call(this);
			    },this);
		    } else if (this.db)
			    callback.call(this);
		    else 
			    webix.delay(this._get_db, this, [callback], 50);
	    },

	    load:function(view, callback){
		    this._get_db(function(){
			    var store = this.db.transaction(this.source).objectStore(this.source);
			    var data = [];

			    store.openCursor().onsuccess = function(e) {
				    var result = e.target.result;
				    if(result){
					    data.push(result.value);
					    result["continue"]();
				    } else {
					    view.parse(data);
					    webix.ajax.$callback(view, callback, "[]", data);
				    }
			    };
		    });
	    },
	    save:function(view, update, dp, callback){
		    this._get_db(function(){
			    var mode = update.operation;
			    var data = update.data;
			    var id = update.id;

			    var store = this.db.transaction([this.source], "readwrite").objectStore(this.source);

			    var req;
			    if (mode == "delete")
	                req = store["delete"](id);
	       	    else if (mode == "update")
	       		    req = store.put(data);
	       	    else if (mode == "insert"){
	       		    delete data.id;
	       		    req = store.add(data);
	       	    }

			    req.onsuccess = function(e) {
				    var result = { status: mode, id:update.id };
				    if (mode == "insert")
					    result.newid = e.target.result;
				    dp.processResult(result, result);
			    };
		    });
	    }
    };

    webix.proxy.binary = {
	    $proxy:true,
	    load:function(view, callback){
		    var parts = this.source.split("@");
		    var ext = parts[0].split(".").pop();
		    return webix.ajax().response("arraybuffer").get(parts[0]).then(function(res){
			    var options = { ext:ext, dataurl : parts[1] };
			    webix.ajax.$callback(view, callback, "", { data:res, options:options }, -1);
		    });
	    }
    };

    /*
	  view.load("offline->some.php")

	  or

	  view.load( webix.proxy("offline", "some.php") );

	  or

	  view.load( webix.proxy("offline", "post->url.php") );
    */

    webix.proxy.offline = {
	    $proxy:true,

	    storage: webix.storage.local,
	    cache:false,
	    data:"",

	    _is_offline : function(){
		    if (!this.cache && !webix.env.offline){
			    webix.callEvent("onOfflineMode",[]);
			    webix.env.offline = true;
		    }
	    },
	    _is_online : function(){
		    if (!this.cache && webix.env.offline){
			    webix.env.offline = false;
			    webix.callEvent("onOnlineMode", []);
		    }
	    },

	    load:function(view, callback){
		    var mycallback = {
			    error:function(){
				    //assuming offline mode
				    var text = this.getCache() || this.data;

				    var loader = { responseText: text };
				    var data = webix.ajax.prototype._data(loader);

				    this._is_offline();
				    webix.ajax.$callback(view, callback, text, data, loader);
			    },
			    success:function(text, data, loader){
				    this._is_online();
				    webix.ajax.$callback(view, callback, text, data, loader);

				    this.setCache(text);
			    }
		    };

		    //in cache mode - always load data from cache
		    if (this.cache && this.getCache())
			    mycallback.error.call(this);
		    else {
			    //else try to load actual data first
			    if (this.source.$proxy)
				    this.source.load(this, mycallback);
			    else
				    webix.ajax(this.source, mycallback, this);
		    }
	    },
	    getCache:function(){
		    return this.storage.get(this._data_name());
	    },
	    clearCache:function(){
		    this.storage.remove(this._data_name());
	    },
	    setCache:function(text){
		    this.storage.put(this._data_name(), text);
	    },
	    _data_name:function(){
		    if (this.source.$proxy)
			    return this.source.source + "_$proxy$_data";
		    else 
			    return this.source + "_$proxy$_data";
	    },
	    saveAll:function(view, update, dp, callback){
		    this.setCache(view.serialize());
		    webix.ajax.$callback(view, callback, "", update);
	    },
	    result:function(id, master, dp, text, data){
		    for (var i = 0; i < data.length; i++)
			    dp.processResult({ id: data[i].id, status: data[i].operation }, {}, {});
	    }
    };

    webix.proxy.cache = {
	    init:function(){
		    webix.extend(this, webix.proxy.offline);
	    },
	    cache:true
    };

    webix.proxy.local = {
	    init:function(){
		    webix.extend(this, webix.proxy.offline);
	    },
	    cache:true,
	    data:[]
    };

return webix;
});
