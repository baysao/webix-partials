define(["webix/core/webix"], function webix_window(webix){
(function(){

        var error_key = "__webix_remote_error";

        function RemoteContext(url, config){
	        this._proxy = {};
	        this._queue = [];
	        this._url = url;
	        this._key = "";

	        if (config)
		        this._process(config);
	        else
		        this._ready = webix.ajax(url)
			    .then(function(data){
				    return data.text();
			    })
			    .then(webix.bind(function(text){
				    text = text.split("/*api*/")[1];
				    this._process(JSON.parse(text));
				    return this._proxy;
			    }, this));
        }
        RemoteContext.prototype = {
	        _process:function(config){
		        if (config.$key)
			        this._key = config.$key;
		        if (config.$vars)
			        for (var key in config.$vars)
				        this._proxy[key] = config.$vars[key];

		        this._parse(config, this._proxy, "");
	        },
	        _parse:function(api, obj, prefix){
		        for (var key in api){
			        if (key === "$key" || key === "$vars") continue;
			        var val = api[key];
			        if (typeof val == "object"){
				        var sub = obj[key] = {};
				        this._parse(val, sub, prefix+key+".");
			        } else
				        obj[key] = this._proxy_call(this, prefix+key);
		        }
	        },
	        _call:function(name, args){
		        var def = this._deffer(this, name, args);
		        this._queue.push(def);
		        this._start_queue();
		        return def;
	        },
	        _start_queue:function(){
		        if (!this._timer)
			        this._timer = setTimeout(webix.bind(this._run_queue, this), 1);
	        },
	        _run_queue:function(){
		        var data = [], defs = this._queue;
		        for (var i=0; i<this._queue.length; i++){
			        var def = this._queue[i];
			        if (def.$sync){
				        defs.splice(i,1); i--;
			        } else
				        data.push({ name: def.$name, args: def.$args });	
		        }

		        if (defs.length){
			        var ajax = webix.ajax();
			        var pack = this._pack(data);
			        webix.callEvent("onBeforeRemoteCall", [ajax, pack, {}]);
			        var promise = ajax.post(this._url, pack)
				        .then(function(res){
					        var data = res.json();
					        var results = data.data;
					        for (var i=0; i<results.length; i++){
						        var res = results[i];
						        var error = results[i] && results[i][error_key];
						        if (error){
							        webix.callEvent("onRemoteError", [error]);
							        defs[i].reject(error);
						        } else {
							        defs[i].resolve(res);
						        }
					        }		
				        }, function(res){
					        for (var i=0; i<defs.length; i++)
						        defs[i].reject(res);
					        throw res;
				        });
			        webix.callEvent("onAfterRemoteCall", [promise]);
		        }

		        this._queue = [];
		        this._timer = null;
	        },
	        _sync:function(){
		        var value = null;
		        this.$sync = true;
		        var data = [{ name: this.$name, args: this.$args }];

		        try {
			        var ajax = webix.ajax();
			        var pack = this.$context._pack(data);
			        webix.callEvent("onBeforeRemoteCall", [ajax, pack, { sync: true }]);
			        var xhr = ajax.sync().post(this.$context._url, pack);
			        webix.callEvent("onAfterRemoteCall", [null]);
			        var value = JSON.parse(xhr.responseText).data[0];
			        if (value[error_key])
				        value = null;
		        } catch(e){}

		        return value;
	        },
	        _deffer:function(master, name, args){
		        var pr = webix.promise.defer();
		        pr.sync = master._sync;
		        pr.$name = name;
		        pr.$args = args;
		        pr.$context = this;

		        return pr;
	        },
	        _proxy_call:function(master, name){
		        return function(){
			        return master._call(name, [].slice.call(arguments));
		        };
	        },
	        _getProxy:function(){
		        return this._ready || this._proxy;
	        },
	        _pack:function(obj){
		        return {
			        key: this._key,
			        payload:obj
		        };
	        }
        };

        function getApi(url, config){
	        var ctx = new RemoteContext(url, config);
	        return ctx._getProxy();
        }

        webix.remote = function(url, config){
	        if (typeof url === "object"){
		        var scripts = document.getElementsByTagName("script");
		        config = url;
		        url = scripts[scripts.length - 1].src;
		        webix.remote = getApi(url, config);
	        } else 
		        return getApi(url, config);
        };


    })();
return webix;
});
