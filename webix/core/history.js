define(["webix/core/webix"], function webix_history(webix){
    /*
	  Behavior:History - change multiview state on 'back' button

    */

    webix.history = {
	    track:function(id, url){
		    this._init_state(id, url);
		    
		    if (this._aHandler)
			    webix.$$(this._aViewId).detachEvent(this._aHandler);

		    if (id){
			    this._aViewId = id;
			    var view = webix.$$(id);
			    
			    var handler = function(){
				    if (webix.history._ignored) return;

				    if (view.getValue)
					    webix.history.push(id, view.getValue());
			    };

			    if (view.getActiveId)
				    this._aHandler = view.attachEvent("onViewChange", handler);
			    else
				    this._aHandler = view.attachEvent("onChange", handler);
		    }
	    },
	    _set_state:function(view, state){
		    webix.history._ignored = 1;

		    view = webix.$$(view);
		    if (view.callEvent("onBeforeHistoryNav", [state]))
			    if (view.setValue)
				    view.setValue(state);

		    webix.history._ignored = 0;
	    },
	    push:function(view, url, value){
		    view = webix.$$(view);
		    var new_url = "";
		    if (url)
			    new_url = "#!/"+url;
		    if (webix.isUndefined(value)){
			    if (view.getValue)
				    value = view.getValue();
			    else
				    value = url;
		    }

		    window.history.pushState({ webix:true, id:view._settings.id, value:value }, "", new_url);
	    },
	    _init_state:function(view, url){
		    webix.event(window, "popstate", function(ev){
			    if (ev.state && ev.state.webix){
				    webix.history._set_state(ev.state.id, ev.state.value);
			    }
		    });

		    var state = window.location.hash;
		    webix.noanimate = true;
		    if (state && state.indexOf("#!/") === 0)
			    webix.history._set_state(view, state.replace("#!/",""));
		    else if (url){
			    webix.history.push(view, url);
			    webix.history._set_state(view, url);
		    }
		    webix.noanimate = false;
		    
		    this._init_state = function(){};
	    }
    };
return webix;
});
