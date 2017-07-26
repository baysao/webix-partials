define([], function webix_core(){
    /*
      @license
      webix UI v.4.4.5
      This software is covered by Webix Trial License.
      Usage without proper license is prohibited.
      (c) XB Software Ltd.
    */
    if (!window.webix) 
	    webix={};

    //check some rule, show message as error if rule is not correct
    webix.assert = function(test, message){
	    if (!test){
		    webix.assert_error(message);
	    }
    };

    webix.assert_config = function(obj){
	    var coll = obj.cells || obj.rows || obj.elements || obj.cols;
	    if (coll)
		    for (var i=0; i<coll.length; i++)
			    if (coll[i] === null || typeof coll[i] === "undefined")
				    webix.assert_error("You have trailing comma or Null element in collection's configuration");
    };

    webix.assert_error = function(message){
	    //jshint debug:true
	    webix.log("error",message);
	    if (webix.message && typeof message == "string")
		    webix.message({ type:"debug", text:message, expire:-1 });
	    if (webix.debug !== false)
		    debugger;
    };

    //entry point for analitic scripts
    webix.assert_core_ready = function(){
	    if (window.webix_on_core_ready)	
		    window.webix_on_core_ready();
    };

    webix.assert_level = 0;

    webix.assert_level_in = function(){
	    webix.assert_level++;
	    if (webix.assert_level == 100)
		    webix.assert_error("Attempt to copy object with self reference");
    };
    webix.assert_level_out = function(){
	    webix.assert_level--;
    };

    /*
	  Common helpers
    */
    webix.version="4.4.5";
    webix.codebase="./";
    webix.name = "core";
    webix.cdn = "//cdn.webix.com";

    //coding helpers
    webix.clone = function(source){
	    var f = webix.clone._function;
	    f.prototype = source;
	    return new f();
    };
    webix.clone._function = function(){};

    //copies methods and properties from source to the target
    webix.extend = function(base, source, force){
	    webix.assert(base,"Invalid mixing target");
	    webix.assert(source,"Invalid mixing source");

	    if (base.$protoWait){
		    webix.PowerArray.insertAt.call(base.$protoWait, source,1);
		    return base;
	    }
	    
	    //copy methods, overwrite existing ones in case of conflict
	    for (var method in source)
		    if ((!(method in base)) || force)
			    base[method] = source[method];
		
	    //in case of defaults - preffer top one
	    if (source.defaults)
		    webix.extend(base.defaults, source.defaults);
	    
	    //if source object has init code - call init against target
	    if (source.$init)	
		    source.$init.call(base);
		
	    return base;	
    };

    //copies methods and properties from source to the target from all levels
    webix.copy = function(source){
	    webix.assert(source,"Invalid mixing target");
	    webix.assert_level_in();

	    var target;
	    if(arguments.length>1){
		    target = arguments[0];
		    source = arguments[1];
	    } else 
		    target = (webix.isArray(source)?[]:{});

	    for (var method in source){
		    var from = source[method];
		    if(from && typeof from == "object" && !(from instanceof RegExp)){
			    if (!webix.isDate(from)){
				    target[method] = (webix.isArray(from)?[]:{});
				    webix.copy(target[method],from);
			    } else
				    target[method] = new Date(from);
		    } else {
			    target[method] = from;
		    }
	    }

	    webix.assert_level_out();
	    return target;	
    };

    webix.single = function(source){ 
	    var instance = null;
	    var t = function(config){
		    if (!instance)
			    instance = new source({});
			
		    if (instance._reinit)
			    instance._reinit.apply(instance, arguments);
		    return instance;
	    };
	    return t;
    };

    webix.protoUI = function(){
	    if (webix.debug_proto)
		    webix.log("UI registered: "+arguments[0].name);
		
	    var origins = arguments;
	    var selfname = origins[0].name;
	    
	    var t = function(data){
		    if (!t)
			    return webix.ui[selfname].prototype;

		    var origins = t.$protoWait;
		    if (origins){
			    var params = [origins[0]];
			    
			    for (var i=1; i < origins.length; i++){
				    params[i] = origins[i];

				    if (params[i].$protoWait)
					    params[i] = params[i].call(webix, params[i].name);

				    if (params[i].prototype && params[i].prototype.name)
					    webix.ui[params[i].prototype.name] = params[i];
			    }
			    webix.ui[selfname] = webix.proto.apply(webix, params);

			    if (t._webix_type_wait)	
				    for (var i=0; i < t._webix_type_wait.length; i++)
					    webix.type(webix.ui[selfname], t._webix_type_wait[i]);
				
			    t = origins = null;	
		    }
			
		    if (this != webix)
			    return new webix.ui[selfname](data);
		    else 
			    return webix.ui[selfname];
	    };
	    t.$protoWait = Array.prototype.slice.call(arguments, 0);
	    return (webix.ui[selfname]=t);
    };

    webix.proto = function(){
	    
	    if (webix.debug_proto)
		    webix.log("Proto chain:"+arguments[0].name+"["+arguments.length+"]");

	    var origins = arguments;
	    var compilation = origins[0];
	    var has_constructor = !!compilation.$init;
	    var construct = [];
	    
	    webix.assert(compilation,"Invalid mixing target");
		
	    for (var i=origins.length-1; i>0; i--) {
		    webix.assert(origins[i],"Invalid mixing source");
		    if (typeof origins[i]== "function")
			    origins[i]=origins[i].prototype;
		    if (origins[i].$init) 
			    construct.push(origins[i].$init);
		    if (origins[i].defaults){ 
			    var defaults = origins[i].defaults;
			    if (!compilation.defaults)
				    compilation.defaults = {};
			    for (var def in defaults)
				    if (webix.isUndefined(compilation.defaults[def]))
					    compilation.defaults[def] = defaults[def];
		    }
		    if (origins[i].type && compilation.type){
			    for (var def in origins[i].type)
				    if (!compilation.type[def])
					    compilation.type[def] = origins[i].type[def];
		    }
			
		    for (var key in origins[i]){
			    if (!compilation[key] && compilation[key] !== false)
				    compilation[key] = origins[i][key];
		    }
	    }
	    
	    if (has_constructor)
		    construct.push(compilation.$init);
	    
	    
	    compilation.$init = function(){
		    for (var i=0; i<construct.length; i++)
			    construct[i].apply(this, arguments);
	    };
	    if (compilation.$skin)
		    compilation.$skin();

	    var result = function(config){
		    this.$ready=[];
		    webix.assert(this.$init,"object without init method");
		    this.$init(config);
		    if (this._parseSettings)
			    this._parseSettings(config, this.defaults);
		    for (var i=0; i < this.$ready.length; i++)
			    this.$ready[i].call(this);
	    };
	    result.prototype = compilation;
	    
	    compilation = origins = null;
	    return result;
    };
    //creates function with specified "this" pointer
    webix.bind=function(functor, object){ 
	    return function(){ return functor.apply(object,arguments); };  
    };

    //loads module from external js file
    webix.require=function(module, callback, master){
	    var promise = webix.promise.defer();

	    if (callback && callback !== true)
		    promise = promise.then(function(){ callback.call(master || this); });

	    if (webix.require.disabled){
		    promise.resolve();
		    return promise;
	    }

	    //multiple files required at once
	    if (typeof module != "string"){
		    var count = module.length||0;
		    
		    if (!count){
			    // { file: true, other: true }
			    for (var file in module) count++;
			    var callback2 = function(){
				    count--;
				    if (count === 0)
					    promise.resolve();
			    };
			    for (var file in module)
				    webix.require(file, callback2, master);
		    } else {
			    // [ file, other ]
			    var callback2 = function(){
				    if (count){
					    count--;
					    webix.require(module[module.length - count - 1], callback2, master);
				    } else {
					    promise.resolve();
				    }
			    };
			    callback2();
		    }
		    return;
	    }

	    if (webix._modules[module] !== true){
		    var fullpath = module;
		    if (!module.toString().match(/^([a-z]+\:)*\/\//i))
			    fullpath = webix.codebase + module;

		    //css, async, no waiting
		    if (module.substr(module.length-4) == ".css") {
			    var link = webix.html.create("LINK",{  type:"text/css", rel:"stylesheet", href:fullpath});
			    document.getElementsByTagName('head')[0].appendChild(link);
			    promise.resolve();
			    return promise;
		    }

		    //js, async, waiting
		    if (callback === true){
			    //sync mode
			    webix.exec( webix.ajax().sync().get(fullpath).responseText );
			    webix._modules[module]=true;

		    } else {

			    if (!webix._modules[module]){	//first call
				    webix._modules[module] = [promise];

				    webix.ajax(fullpath, function(text){
					    webix.exec(text);	//evaluate code
					    var calls = webix._modules[module];	//callbacks
					    webix._modules[module] = true;
					    for (var i=0; i<calls.length; i++)
						    calls[i].resolve();
				    });
			    } else	//module already loading
				    webix._modules[module].push(promise);
		    }
	    } else 
		    promise.resolve();

	    return promise;
    };
    webix._modules = {};	//hash of already loaded modules

    //evaluate javascript code in the global scoope
    webix.exec=function(code){
	    if (window.execScript)	//special handling for IE
		    window.execScript(code);
	    else window.eval(code);
    };

    webix.wrap = function(code, wrap){
	    if (!code) return wrap;
	    return function(){
		    var result = code.apply(this, arguments);
		    wrap.apply(this,arguments);
		    return result;
	    };
    };

    //check === undefined
    webix.isUndefined=function(a){
	    return typeof a == "undefined";
    };
    //delay call to after-render time
    webix.delay=function(method, obj, params, delay){
	    return window.setTimeout(function(){
		    if(!(obj&&obj.$destructed)){
			    var ret = method.apply(obj,(params||[]));
			    method = obj = params = null;
			    return ret;
		    }
	    },delay||1);
    };

    webix.once=function(method){
	    var flag = true;
	    return function(){
		    if (flag){
			    flag = false;
			    method.apply(this, arguments);
		    }
	    };
    };

    //common helpers

    //generates unique ID (unique per window, nog GUID)
    webix.uid = function(){
	    if (!this._seed) this._seed=(new Date()).valueOf();	//init seed with timestemp
	    this._seed++;
	    return this._seed;
    };
    //resolve ID as html object
    webix.toNode = function(node){
	    if (typeof node == "string") return document.getElementById(node);
	    return node;
    };
    //adds extra methods for the array
    webix.toArray = function(array){ 
	    return webix.extend((array||[]),webix.PowerArray, true);
    };
    //resolve function name
    webix.toFunctor=function(str, scope){ 
	    if (typeof(str)=="string"){
		    var method = str.replace("()","");
		    if (scope && scope[method]) return scope[method];
		    return window[method] || eval(str);
	    }
	    return str;
    };
    /*checks where an object is instance of Array*/
    webix.isArray = function(obj) {
	    return Array.isArray?Array.isArray(obj):(Object.prototype.toString.call(obj) === '[object Array]');
    };
    webix.isDate = function(obj){
	    return obj instanceof Date;
    };
    // converts an object into a string with respect to dates
    webix.stringify = function(obj){
	    var origin = Date.prototype.toJSON;
	    Date.prototype.toJSON = function(){
		    return webix.i18n.parseFormatStr(this);
	    };

	    var result;
	    if (obj instanceof Date)
		    result = obj.toJSON();
	    else
		    result = JSON.stringify(obj);

	    Date.prototype.toJSON = origin;
	    return result;
    };

    //dom helpers

    //hash of attached events
    webix._events = {};
    //private version of API, do not register ID for event detaching
    webix._event = function(a,b,c,d){
	    d = d || {};
	    d.inner = true;
	    webix.event(a,b,c,d);
    };
    //attach event to the DOM element
    webix.event=function(node,event,handler,context){
	    context = context || {};
	    node = webix.toNode(node);
	    webix.assert(node, "Invalid node as target for webix.event");
	    
	    var id = context.id || webix.uid();

	    if(context.bind)
		    handler=webix.bind(handler,context.bind);

	    var info = [node,event,handler,context.capture];
	    if (!context.inner)
		    webix._events[id]=info;	//store event info, for detaching
		
	    //use IE's of FF's way of event's attaching
	    if (node.addEventListener)
		    node.addEventListener(event, handler, !!context.capture);
	    else if (node.attachEvent)
		    node.attachEvent("on"+event, info[2] = function(){
			    return handler.apply(node, arguments);	//IE8 fix
		    });

	    return id;	//return id of newly created event, can be used in eventRemove
    };

    //remove previously attached event
    webix.eventRemove=function(id){
	    
	    if (!id) return;
	    webix.assert(this._events[id],"Removing non-existing event");
		
	    var ev = webix._events[id];
	    //browser specific event removing
	    if (ev[0].removeEventListener)
		    ev[0].removeEventListener(ev[1],ev[2],!!ev[3]);
	    else if (ev[0].detachEvent)
		    ev[0].detachEvent("on"+ev[1],ev[2]);

		
	    delete this._events[id];	//delete all traces
    };


    //debugger helpers
    //anything starting from error or log will be removed during code compression

    //add message in the log
    webix.log = function(type,message,details){
	    if (arguments.length == 1){
		    message = type;
		    type = "log";
	    }
	    /*jsl:ignore*/
	    if (window.console && window.console.log){
		    type=type.toLowerCase();
		    if (window.console[type])
			    window.console[type](message||"unknown error");
		    else
			    window.console.log(type +": "+message);

		    if (details) 
			    window.console.log(details);
	    }	
	    /*jsl:end*/
    };
    //register rendering time from call point 
    webix.log_full_time = function(name){
	    webix._start_time_log = new Date();
	    webix.log("Timing start ["+name+"]");
	    window.setTimeout(function(){
		    var time = new Date();
		    webix.log("Timing end ["+name+"]:"+(time.valueOf()-webix._start_time_log.valueOf())/1000+"s");
	    },1);
    };
    //register execution time from call point
    webix.log_time = function(name){
	    var fname = "_start_time_log"+name;
	    if (!webix[fname]){
		    webix[fname] = new Date();
		    webix.log("Info","Timing start ["+name+"]");
	    } else {
		    var time = new Date();
		    webix.log("Info","Timing end ["+name+"]:"+(time.valueOf()-webix[fname].valueOf())/1000+"s");
		    webix[fname] = null;
	    }
    };
    webix.debug_code = function(code){
	    code.call(webix);
    };
    //event system
    webix.EventSystem={
	    $init:function(){
		    if (!this._evs_events){
			    this._evs_events = {};		//hash of event handlers, name => handler
			    this._evs_handlers = {};	//hash of event handlers, ID => handler
			    this._evs_map = {};
		    }
	    },
	    //temporary block event triggering
	    blockEvent : function(){
		    this._evs_events._block = true;
	    },
	    //re-enable event triggering
	    unblockEvent : function(){
		    this._evs_events._block = false;
	    },
	    mapEvent:function(map){
		    webix.extend(this._evs_map, map, true);
	    },
	    on_setter:function(config){
		    if(config){
			    for(var i in config){
				    var method = webix.toFunctor(config[i], this.$scope);
				    var sub = i.indexOf("->");
				    if (sub !== -1){
					    this[i.substr(0,sub)].attachEvent(i.substr(sub+2), webix.bind(method, this));
				    } else
					    this.attachEvent(i, method);
			    }
		    }
	    },
	    //trigger event
	    callEvent:function(type,params){
		    if (this._evs_events._block) return true;
		    
		    type = type.toLowerCase();
		    var event_stack =this._evs_events[type.toLowerCase()];	//all events for provided name
		    var return_value = true;

		    if (webix.log)
			    if ((webix.debug || this.debug) && !webix.debug_blacklist[type])	//can slowdown a lot
				    webix.log("info","["+this.name+"@"+((this._settings||{}).id)+"] event:"+type,params);
		    
		    if (event_stack)
			    for(var i=0; i<event_stack.length; i++){
				    /*
					  Call events one by one
					  If any event return false - result of whole event will be false
					  Handlers which are not returning anything - counted as positive
				    */
				    if (event_stack[i].apply(this,(params||[]))===false) return_value=false;
			    }
		    if (this._evs_map[type]){
			    var target = this._evs_map[type];
			    target.$eventSource = this;
			    if (!target.callEvent(type,params))
				    return_value =	false;
			    target.$eventSource = null;
		    }

		    return return_value;
	    },
	    //assign handler for some named event
	    attachEvent:function(type,functor,id){
		    webix.assert(functor, "Invalid event handler for "+type);

		    type=type.toLowerCase();
		    
		    id=id||webix.uid(); //ID can be used for detachEvent
		    functor = webix.toFunctor(functor, this.$scope);	//functor can be a name of method

		    var event_stack=this._evs_events[type]||webix.toArray();
		    //save new event handler
		    if (arguments[3])
			    event_stack.unshift(functor);
		    else
			    event_stack.push(functor);
		    this._evs_events[type]=event_stack;
		    this._evs_handlers[id]={ f:functor,t:type };
		    
		    return id;
	    },
	    //remove event handler
	    detachEvent:function(id){
		    if(!this._evs_handlers[id]){
			    var name = (id+"").toLowerCase();
			    if (this._evs_events[name]){
				    this._evs_events[name] = webix.toArray();
			    }
			    return;
		    }
		    var type=this._evs_handlers[id].t;
		    var functor=this._evs_handlers[id].f;
		    
		    //remove from all collections
		    var event_stack=this._evs_events[type];
		    event_stack.remove(functor);
		    delete this._evs_handlers[id];
	    },
	    hasEvent:function(type){
		    type=type.toLowerCase();
		    var stack = this._evs_events[type];
		    if (stack && stack.length) return true;

		    var parent = this._evs_map[type];
		    if (parent)
			    return parent.hasEvent(type);
		    return false;
	    }
    };

    webix.extend(webix, webix.EventSystem, true);

    //array helper
    //can be used by webix.toArray()
    webix.PowerArray={
	    //remove element at specified position
	    removeAt:function(pos,len){
		    if (pos>=0) this.splice(pos,(len||1));
	    },
	    //find element in collection and remove it 
	    remove:function(value){
		    this.removeAt(this.find(value));
	    },	
	    //add element to collection at specific position
	    insertAt:function(data,pos){
		    if (!pos && pos!==0)	//add to the end by default
			    this.push(data);
		    else {	
			    var b = this.splice(pos,(this.length-pos));
			    this[pos] = data;
			    this.push.apply(this,b); //reconstruct array without loosing this pointer
		    }
	    },
	    //return index of element, -1 if it doesn't exists
	    find:function(data){ 
		    for (var i=0; i<this.length; i++) 
			    if (data==this[i]) return i;
		    return -1; 
	    },
	    //execute some method for each element of array
	    each:function(functor,master){
		    for (var i=0; i < this.length; i++)
			    functor.call((master||this),this[i]);
	    },
	    //create new array from source, by using results of functor 
	    map:function(functor,master){
		    for (var i=0; i < this.length; i++)
			    this[i]=functor.call((master||this),this[i]);
		    return this;
	    }, 
	    filter:function(functor, master){
		    for (var i=0; i < this.length; i++)
			    if (!functor.call((master||this),this[i])){
				    this.splice(i,1);
				    i--;
			    }
		    return this;
	    }
    };

    webix.env = {};

    // webix.env.transform 
    // webix.env.transition
    (function(){
	    webix.env.strict = !!window.webix_strict;
	    webix.env.https = document.location.protocol === "https:";

	    var agent = navigator.userAgent;

	    if (agent.indexOf("Mobile")!=-1 || agent.indexOf("Windows Phone")!=-1)
		    webix.env.mobile = true;
	    if (webix.env.mobile || agent.indexOf("iPad")!=-1 || agent.indexOf("Android")!=-1)
		    webix.env.touch = true;
	    if (agent.indexOf('Opera')!=-1)
		    webix.env.isOpera=true;
	    else{
		    //very rough detection, but it is enough for current goals
		    webix.env.isIE=!!document.all || (agent.indexOf("Trident") !== -1);
		    if (webix.env.isIE){
			    var version = parseFloat(navigator.appVersion.split("MSIE")[1]);
			    if (version == 8)
				    webix.env.isIE8 = true;
		    }
		    webix.env.isEdge=(agent.indexOf("Edge")!=-1);
		    webix.env.isFF=(agent.indexOf("Firefox")!=-1);
		    webix.env.isWebKit=(agent.indexOf("KHTML")!=-1);
		    webix.env.isSafari=webix.env.isWebKit && (agent.indexOf('Mac')!=-1) && (agent.indexOf('Chrome')==-1);

		    //maximum height/width for HTML elements in pixels (rough), bigger values will be ignored by browser
		    if(webix.env.isIE || webix.env.isEdge || webix.env.isFF)
			    webix.env.maxHTMLElementSize = 10000000;
		    if(webix.env.isSafari)
			    webix.env.maxHTMLElementSize = 100000000;
	    }

	    if(agent.toLowerCase().indexOf("android")!=-1){
		    webix.env.isAndroid = true;
		    if(agent.toLowerCase().indexOf("trident")){
			    webix.env.isAndroid = false;
			    webix.env.isIEMobile = true;
		    }
	    }

	    webix.env.transform = false;
	    webix.env.transition = false;

	    var found_index = -1;
	    var js_list =  ['', 'webkit', 'Moz', 'O', 'ms'];
	    var css_list = ['', '-webkit-', '-Moz-', '-o-', '-ms-'];

	    
	    var d = document.createElement("DIV");
	    for (var j=0; j < js_list.length; j++) {
		    var name = js_list[j] ? (js_list[j]+"Transform") : "transform";
		    if(typeof d.style[name] != 'undefined'){
			    found_index = j;
			    break;
		    }
	    }


	    if (found_index > -1){
		    webix.env.cssPrefix = css_list[found_index];
		    var jp = webix.env.jsPrefix = js_list[found_index];

		    webix.env.transform = jp ? jp+"Transform" : "transform";
		    webix.env.transition = jp ? jp+"Transition" : "transition";
		    webix.env.transitionDuration = jp ? jp+"TransitionDuration" : "transitionDuration";

		    d.style[webix.env.transform] = "translate3d(0,0,0)";
		    webix.env.translate = (d.style[webix.env.transform])?"translate3d":"translate";
		    webix.env.transitionEnd = ((webix.env.cssPrefix == '-Moz-')?"transitionend":(jp ? jp+"TransitionEnd" : "transitionend"));
	    }

	    webix.env.pointerevents = (!webix.env.isIE ||(new RegExp("Trident/.*rv:11")).exec(agent) !== null);
    })();


    webix.env.svg = (function(){
	    return document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1");
    })();

    webix.env.svganimation = (function(){
	    return document.implementation.hasFeature("https://www.w3.org/TR/SVG11/feature#SVG-animation", "1.1");
    })();


    //html helpers
    webix.html={
	    _native_on_selectstart:0,
	    _style_element:{},
	    denySelect:function(){
		    if (!webix._native_on_selectstart)
			    webix._native_on_selectstart = document.onselectstart;
		    document.onselectstart = webix.html.stopEvent;
	    },
	    allowSelect:function(){
		    if (webix._native_on_selectstart !== 0){
			    document.onselectstart = webix._native_on_selectstart||null;
		    }
		    webix._native_on_selectstart = 0;

	    },
	    index:function(node){
		    var k=0;
		    //must be =, it is not a comparation!
		    while ((node = node.previousSibling)) k++;
		    return k;
	    },
	    _style_cache:{},
	    createCss:function(rule, sufix){
		    var text = "";
			sufix = sufix || "";

		    for (var key in rule)
			    text+= key+":"+rule[key]+";";
		    
		    var name = this._style_cache[text+sufix];
		    if (!name){
			    name = "s"+webix.uid();
			    this.addStyle("."+name+(sufix||"")+"{"+text+"}");
			    this._style_cache[text+sufix] = name;
		    }
		    return name;
	    },
	    addStyle:function(rule, group){
		    var style = group ? this._style_element[group] :this._style_element["default"];
		    if(!style){
			    style = document.createElement("style");
			    style.setAttribute("type", "text/css");
			    style.setAttribute("media", "screen,print");
			    document.getElementsByTagName("head")[0].appendChild(style);

			    if (group)
				    this._style_element[group] = style;
			    else
				    this._style_element["default"] = style;
		    }
		    /*IE8*/
		    if (style.styleSheet)
			    style.styleSheet.cssText += rule;
		    else
			    style.appendChild(document.createTextNode(rule));
	    },
	    removeStyle:function(group){
		    var box = this._style_element[group||"default"];
		    if (box)
			    box.innerHTML = "";
	    },
	    create:function(name,attrs,html){
		    attrs = attrs || {};
		    var node = document.createElement(name);
		    for (var attr_name in attrs)
			    node.setAttribute(attr_name, attrs[attr_name]);
		    if (attrs.style)
			    node.style.cssText = attrs.style;
		    if (attrs["class"])
			    node.className = attrs["class"];
		    if (html)
			    node.innerHTML=html;
		    return node;
	    },
	    //return node value, different logic for different html elements
	    getValue:function(node){
		    node = webix.toNode(node);
		    if (!node) return "";
		    return webix.isUndefined(node.value)?node.innerHTML:node.value;
	    },
	    //remove html node, can process an array of nodes at once
	    remove:function(node){
		    if (node instanceof Array)
			    for (var i=0; i < node.length; i++)
				    this.remove(node[i]);
		    else if (node && node.parentNode)
			    node.parentNode.removeChild(node);
	    },
	    //insert new node before sibling, or at the end if sibling doesn't exist
	    insertBefore: function(node,before,rescue){
		    if (!node) return;
		    if (before && before.parentNode)
			    before.parentNode.insertBefore(node, before);
		    else
			    rescue.appendChild(node);
	    },
	    //return custom ID from html element 
	    //will check all parents starting from event's target
	    locate:function(e,id){
		    var trg;
		    if (e.tagName)
			    trg = e;
		    else {
			    e=e||event;
			    trg=e.target||e.srcElement;
		    }
		    
		    while (trg){
			    if (trg.getAttribute){	//text nodes has not getAttribute
				    var test = trg.getAttribute(id);
				    if (test) return test;
			    }
			    trg=trg.parentNode;
		    }	
		    return null;
	    },
	    //returns position of html element on the page
	    offset:function(elem) {
		    if (elem.getBoundingClientRect) { //HTML5 method
			    var box = elem.getBoundingClientRect();
			    var body = document.body;
			    var docElem = document.documentElement;
			    var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
			    var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;
			    var clientTop = docElem.clientTop || body.clientTop || 0;
			    var clientLeft = docElem.clientLeft || body.clientLeft || 0;
			    var top  = box.top +  scrollTop - clientTop;
			    var left = box.left + scrollLeft - clientLeft;
			    return { y: Math.round(top), x: Math.round(left), width:elem.offsetWidth, height:elem.offsetHeight };
		    } else { //fallback to naive approach
			    var top=0, left=0;
			    while(elem) {
				    top = top + parseInt(elem.offsetTop,10);
				    left = left + parseInt(elem.offsetLeft,10);
				    elem = elem.offsetParent;
			    }
			    return { y: top, x: left, width:elem.offsetHeight, height:elem.offsetWidth };
		    }
	    },
	    //returns relative position of event
	    posRelative:function(ev){
		    ev = ev || event;
		    if (!webix.isUndefined(ev.offsetX))
			    return { x:ev.offsetX, y:ev.offsetY };	//ie, webkit
		    else
			    return { x:ev.layerX, y:ev.layerY };	//firefox
	    },
	    //returns position of event
	    pos:function(ev){
		    ev = ev || event;
		    if (ev.touches && ev.touches[0])
			    ev = ev.touches[0];

		    if(ev.pageX || ev.pageY)	//FF, KHTML
			    return {x:ev.pageX, y:ev.pageY};
		    //IE
		    var d  =  ((webix.env.isIE)&&(document.compatMode != "BackCompat"))?document.documentElement:document.body;
		    return {
			    x:ev.clientX + d.scrollLeft - d.clientLeft,
			    y:ev.clientY + d.scrollTop  - d.clientTop
		    };
	    },
	    //prevent event action
	    preventEvent:function(e){
		    if(e && e.preventDefault) e.preventDefault();
		    if(e) e.returnValue = false;
		    return webix.html.stopEvent(e);
	    },
	    //stop event bubbling
	    stopEvent:function(e){
		    e = (e||event);
		    if(e.stopPropagation) e.stopPropagation();
		    e.cancelBubble=true;
		    return false;
	    },
	    triggerEvent:function(node, type, name){
		    if(document.createEventObject){
			    var ev = document.createEventObject();
			    if (node.fireEvent)
				    node.fireEvent("on"+name, ev);
		    } else{
			    var ev = document.createEvent(type);
			    ev.initEvent(name, true, true);
			    if (node.dispatchEvent)
				    node.dispatchEvent(ev);
		    }
	    },
	    //add css class to the node
	    addCss:function(node,name,check){
		    if (!check || node.className.indexOf(name) === -1)
			    node.className+=" "+name;
	    },
	    //remove css class from the node
	    removeCss:function(node,name){
		    node.className=node.className.replace(RegExp(" "+name,"g"),"");
	    },
	    getTextSize:function(text, css, width){
		    var d = webix.html.create("DIV",{"class":"webix_view webix_measure_size "+(css||"")},"");
		    d.style.cssText = "height:auto;visibility:hidden; position:absolute; top:0px; left:0px; overflow:hidden;"+(width?("width:"+width+"px;"):"width:auto;white-space:nowrap;");
		    document.body.appendChild(d);

		    var all = (typeof text !==  "object") ? [text] : text;
		    var width = 0;
		    var height = 0;

		    for (var i = 0; i < all.length; i++) {
			    d.innerHTML = all[i];
			    width = Math.max(width, d.offsetWidth);
			    height = Math.max(height, d.offsetHeight);
		    }
		    
		    webix.html.remove(d);
		    return { width:width, height:height };
	    },
	    download:function(data, filename){
		    var objUrl = false;

		    if(typeof data =="object"){//blob
			    if(window.navigator.msSaveBlob)
				    return window.navigator.msSaveBlob(data, filename);
			    else {
				    data = window.URL.createObjectURL(data);
				    objUrl = true;
			    }
		    }
		    //data url or blob url
		    var link = document.createElement("a");
		    link.href = data;
		    link.download = filename;
		    document.body.appendChild(link);
		    link.click(); 

		    webix.delay(function(){
			    if(objUrl) window.URL.revokeObjectURL(data);
			    document.body.removeChild(link);
			    link.remove();
		    });
	    },
	    _getClassName: function(node){
		    if(!node) return "";

		    var className = node.className || "";
		    if(className.baseVal)//'className' exist but not a string - IE svg element in DOM
			    className = className.baseVal;

		    if(!className.indexOf)
			    className = "";

		    return className;
	    },
	    setSelectionRange:function(node, start, end){
		    start = start || 0;
		    end  = end || start;

		    node.focus();
		    if(node.setSelectionRange)
			    node.setSelectionRange(start, end);
		    else{
			    //ie8
			    var textRange = node.createTextRange();
			    textRange.collapse(true);
			    textRange.moveEnd('character', end);
			    textRange.moveStart('character', start);
			    textRange.select();
		    }
	    },
	    getSelectionRange:function(node){
		    if("selectionStart" in node)
			    return {start:node.selectionStart || 0, end:node.selectionEnd || 0};
		    else{
			    //ie8
			    node.focus();
			    var selection = document.selection.createRange();
			    var bookmark = selection.getBookmark();
			    var textRange = node.createTextRange();
                
			    textRange.moveToBookmark(bookmark);
			    var length = textRange.text.length;
			    
			    textRange.collapse(true);
			    textRange.moveStart('character', -node.value.length);
                
			    var start = textRange.text.length;
			    return {start:start, end: start + length};
		    }
	    }
    };

    webix.ready = function(code){
	    if (this._ready) code.call();
	    else this._ready_code.push(code);
    };
    webix.debug_ready = webix.ready; //same command but will work only in dev. build
    webix._ready_code = [];

    //autodetect codebase folder
    (function(){
	    var temp = document.getElementsByTagName("SCRIPT");	//current script, most probably
	    webix.assert(temp.length,"Can't locate codebase");
	    if (temp.length){
		    //full path to script
		    temp = (temp[temp.length-1].getAttribute("src")||"").split("/");
		    //get folder name
		    temp.splice(temp.length-1, 1);
		    webix.codebase = temp.slice(0, temp.length).join("/")+"/";
	    }

	    var ready = function(){
		    if(webix.env.isIE)
			    document.body.className += " webix_ie";
		    webix.callEvent("onReady",[]);
	    };

	    var doit = function(){
		    webix._ready = true;

		    //global plugins
		    if (window.webix_ready && webix.isArray(webix_ready))
			    webix._ready_code = webix_ready.concat(webix._ready_code);

		    for (var i=0; i < webix._ready_code.length; i++)
			    webix._ready_code[i].call();
		    webix._ready_code=[];
	    };

	    webix.attachEvent("onReady", function(force){
		    if (force) 
			    doit();
		    else 
			    webix.delay(doit);
	    });

	    if (document.readyState == "complete") ready();
	    else webix.event(window, "load", ready);
	    
    })();

    webix.locale=webix.locale||{};


    webix.assert_core_ready();


    webix.ready(function(){
	    webix.event(document.body,"click", function(e){
		    webix.callEvent("onClick",[e||event]);
	    });
    });
    webix.editStop = function(){
	    webix.callEvent("onEditEnd", []);
    };


    webix.debug_blacklist={
	    onmousemoving:1
    };

    // (function(){
    // 	var key = "VGhpcyBhcHAgdXNlcyBhIHRyaWFsIHZlcnNpb24gb2YgV2ViaXggVUkuIFRoZSB0cmlhbCBwZXJpb2QgaGFzIGV4cGlyZWQuIDxicj4gSWYgeW91ciB3YW50IHRvIGNvbnRpbnVlIHVzaW5nIFdlYml4IFVJLCBwbGVhc2UgdXBncmFkZSB0byBDb21tZXJjaWFsIG9yIEdQTCBlZGl0aW9uLg==";
    // 	if (window.atob && (new Date()) > (new Date(2017,7,21)))
    // 		setTimeout(function(){
    // 			webix.message({ type:"error", expire:-1, text:atob(key) });
    // 		}, Math.floor(Math.random()*5000) + 1000);
    // })();




    /*
	  UI:DataView
    */


    webix.skin={};


    webix.skin.flat = {
	    topLayout:"space",
	    //bar in accordion
	    barHeight:46,			//!!!Set the same in skin.less!!!
	    tabbarHeight: 46,
	    rowHeight:34,
	    toolbarHeight:46,
	    listItemHeight:34,		//list, grouplist, dataview, etc.
	    inputHeight: 38,
	    buttonHeight: 38,
	    inputPadding: 3,
	    menuHeight: 34,
	    labelTopHeight: 22,
	    propertyItemHeight: 28,

	    inputSpacing: 4,
	    borderWidth: 1,

	    sliderHandleWidth: 16,
	    sliderPadding: 10,
	    sliderBorder: 1,

	    //margin - distance between cells
	    layoutMargin:{ space:10, wide:10, clean:0, head:4, line:-1, toolbar:4, form:8, accordion: 10  },
	    //padding - distance insede cell between cell border and cell content
	    layoutPadding:{ space:10, wide:0, clean:0, head:0, line:0, toolbar:4, form:17, accordion: 0  },
	    //space between tabs in tabbar
	    tabMargin:4,
	    tabOffset: 0,
	    tabBottomOffset: 6,
	    tabTopOffset:1,

	    customCheckbox: true,
	    customRadio: true,

	    popupPadding: 8,

	    calendarHeight: 70,
	    padding:0,
	    accordionType: "accordion",

	    optionHeight: 32
    };



    webix.skin.set = function(name){
	    webix.assert(webix.skin[name], "Incorrect skin name: "+name);

	    webix.skin.$active = webix.skin[name];
	    webix.skin.$name = name;
	    if (webix.ui){
		    for (var key in webix.ui){
			    var view = webix.ui[key];
			    if (view && view.prototype && view.prototype.$skin)
				    view.prototype.$skin(view.prototype);
		    }
	    }		
    };
    webix.skin.set(window.webix_skin || "flat");


    /*
	  Behavior:Destruction
	  
	  @export
	  destructor
    */



    webix.Destruction = {
	    $init:function(){
		    //wrap in object to simplify removing self-reference
		    var t  = this._destructor_handler = { obj: this};

		    //register self in global list of destructors
		    webix.destructors.push(t);
	    },
	    //will be called automatically on unload, can be called manually
	    //simplifies job of GC
	    destructor:function(){
		    var config = this._settings;

		    if (this._last_editor)
			    this.editCancel();

		    if(this.callEvent)
			    this.callEvent("onDestruct",[]);

		    //destructor can be called only once
		    this.destructor=function(){};
		    //remove self reference from global destructions collection
		    this._destructor_handler.obj = null;

		    //destroy child and related cells
		    if (this.getChildViews){
			    var cells = this.getChildViews();
			    if (cells)
				    for (var i=0; i < cells.length; i++)
					    cells[i].destructor();

			    if (this._destroy_with_me)
				    for (var i=0; i < this._destroy_with_me.length; i++)
					    this._destroy_with_me[i].destructor();
		    }

		    delete webix.ui.views[config.id];

		    if (config.$id){
			    var top = this.getTopParentView();
			    if (top && top._destroy_child)
				    top._destroy_child(config.$id);
		    }

		    //html collection
		    this._htmlmap  = null;
		    this._htmlrows = null;
		    this._html = null;


		    if (this._contentobj) {
			    this._contentobj.innerHTML="";
			    this._contentobj._htmlmap = null;
		    }

		    //removes view container
		    if (this._viewobj&&this._viewobj.parentNode){
			    this._viewobj.parentNode.removeChild(this._viewobj);
		    }

		    if (this.data && this.data.destructor)
			    this.data.destructor();

		    if (this.unbind)
			    this.unbind();

		    this.data = null;
		    this._viewobj = this.$view = this._contentobj = this._dataobj = null;
		    this._evs_events = this._evs_handlers = {};

		    //remove focus from destructed view
		    if (webix.UIManager._view == this)
			    webix.UIManager._view = null;

		    var url = config.url;
		    if (url && url.$proxy && url.release)
			    url.release();

		    this.$scope = null;
		    // this flag is checked in delay method
		    this.$destructed = true;
	    }
    };
    //global list of destructors
    webix.destructors = [];
    webix.event(window,"unload",function(){
	    webix.callEvent("unload", []);
	    webix._final_destruction = true;
	    
	    //call all registered destructors
	    for (var i=0; i<webix.destructors.length; i++){
		    var obj = webix.destructors[i].obj;
		    if (obj)
			    obj.destructor();
	    }
	    webix.destructors = [];
	    webix.ui._popups = webix.toArray();

	    //detach all known DOM events
	    for (var a in webix._events)
		    webix.eventRemove(a);
    });

    /*
	  Behavior:Settings
	  
	  @export
	  customize
	  config
    */

    /*
	  Template - handles html templates
    */



    (function(){

        var _cache = {};
        var _csp_cache = {};
        var newlines = new RegExp("(\\r\\n|\\n)","g");
        var quotes   = new RegExp("(\\\")","g");
        var slashes  = new RegExp("(\\\\)","g");
        var escape = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#x27;",
            "`": "&#x60;"
        };
        var badChars = /[&<>"'`]/g;
        var escapeChar = function(chr) {
            return escape[chr] || "&amp;";
        };


        webix.template = function(str){
	        if (typeof str == "function") return str;
	        if (_cache[str])
		        return _cache[str];
		    
	        str=(str||"").toString();			
	        if (str.indexOf("->")!=-1){
		        var teststr = str.split("->");
		        switch(teststr[0]){
			    case "html": 	//load from some container on the page
				    str = webix.html.getValue(teststr[1]);
				    break;
			    case "http": 	//load from external file
				    str = new webix.ajax().sync().get(teststr[1],{uid:webix.uid()}).responseText;
				    break;
			    default:
				    //do nothing, will use template as is
				    break;
		        }
	        }
		    
	        //supported idioms
	        // {obj.attr} => named attribute or value of sub-tag in case of xml
	        str=(str||"").toString();		

	        // Content Security Policy enabled
	        if(webix.env.strict){
		        if (!_csp_cache[str]){
			        _csp_cache[str] = [];

			        // get an array of objects (not sorted by position)
			        var temp_res = [];
			        str.replace(/\{obj\.([^}?]+)\?([^:]*):([^}]*)\}/g,function(search,s1,s2,s3,pos){
					    temp_res.push({pos: pos, str: search, fn: function(obj,common){
						    return obj[s1]?s2:s3;
					    }});
			        });
			        str.replace(/\{common\.([^}\(]*)\}/g,function(search,s,pos){
				        temp_res.push({pos: pos, str: search, fn: function(obj,common){
					        return common[s]||'';
				        }});
			        });
			        str.replace(/\{common\.([^\}\(]*)\(\)\}/g,function(search,s,pos){
				        temp_res.push({pos: pos, str: search, fn: function(obj,common){
					        return (common[s]?common[s].apply(this, arguments):"");
				        }});
			        });
			        str.replace(/\{obj\.([^:}]*)\}/g,function(search,s,pos){
				        temp_res.push({pos: pos, str: search, fn: function(obj,common){
					        return obj[s];
				        }});
			        });
			        str.replace("{obj}",function(search,s,pos){
				        temp_res.push({pos: pos, str: search, fn: function(obj,common){
					        return obj;
				        }});
			        });
			        str.replace(/#([^#'";, ]+)#/gi,function(search,s,pos){
				        if(s.charAt(0)=="!"){
					        s = s.substr(1);
					        temp_res.push({pos: pos, str: search, fn: function(obj,common){
						        if(s.indexOf(".")!= -1)
							        obj = webix.CodeParser.collapseNames(obj); // apply complex properties
						        return webix.template.escape(obj[s]);
					        }});
				        }
				        else{
					        temp_res.push({pos: pos, str: search, fn: function(obj,common){
						        if(s.indexOf(".")!= -1)
							        obj = webix.CodeParser.collapseNames(obj); // apply complex properties
						        return obj[s];
					        }});
				        }

			        });

			        // sort template parts by position
			        temp_res.sort(function(a,b){
				        return (a.pos > b.pos)?1:-1;
			        });

			        // create an array of functions that return parts of html string
			        if(temp_res.length){
				        var lastPos = 0;
				        var addStr = function(str,n0,n1){
					        _csp_cache[str].push(function(){
						        return str.slice(n0,n1);
					        });
				        };
				        for(var i = 0; i< temp_res.length; i++){
					        var pos = temp_res[i].pos;
					        addStr(str,lastPos,pos);
					        _csp_cache[str].push(temp_res[i].fn);
					        lastPos = pos + temp_res[i].str.length;
				        }
				        addStr(str,lastPos,str.length);
			        }
			        else
				        _csp_cache[str].push(function(){return str;});
		        }
		        return function(){
			        var s = "";
			        for(var i=0; i < _csp_cache[str].length;i++){
				        s += _csp_cache[str][i].apply(this,arguments);
			        }
			        return s;
		        };
	        }

	        str=str.replace(slashes,"\\\\");
	        str=str.replace(newlines,"\\n");
	        str=str.replace(quotes,"\\\"");

	        str=str.replace(/\{obj\.([^}?]+)\?([^:]*):([^}]*)\}/g,"\"+(obj.$1?\"$2\":\"$3\")+\"");
	        str=str.replace(/\{common\.([^}\(]*)\}/g,"\"+(common.$1||'')+\"");
	        str=str.replace(/\{common\.([^\}\(]*)\(\)\}/g,"\"+(common.$1?common.$1.apply(this, arguments):\"\")+\"");
	        str=str.replace(/\{obj\.([^}]*)\}/g,"\"+(obj.$1)+\"");
	        str=str.replace("{obj}","\"+obj+\"");
	        str=str.replace(/#([^#'";, ]+)#/gi,function(str, key){
		        if (key.charAt(0)=="!")
			        return "\"+webix.template.escape(obj."+key.substr(1)+")+\"";
		        else
			        return "\"+(obj."+key+")+\"";
	        });

	        try {
		        _cache[str] = Function("obj","common","return \""+str+"\";");
	        } catch(e){
		        webix.assert_error("Invalid template:"+str);
	        }

	        return _cache[str];
        };



        webix.template.escape  = function(str){
	        if (str === webix.undefined || str === null) return "";
	        return (str.toString() || "" ).replace(badChars, escapeChar);
        };
        webix.template.empty=function(){	return "";	};
        webix.template.bind =function(value){	return webix.bind(webix.template(value),this); };


	    /*
		  adds new template-type
		  obj - object to which template will be added
		  data - properties of template
	    */
        webix.type=function(obj, data){ 
	        if (obj.$protoWait){
		        if (!obj._webix_type_wait)
			        obj._webix_type_wait = [];
				obj._webix_type_wait.push(data);
		        return;
	        }
		    
	        //auto switch to prototype, if name of class was provided
	        if (typeof obj == "function")
		        obj = obj.prototype;
	        if (!obj.types){
		        obj.types = { "default" : obj.type };
		        obj.type.name = "default";
	        }
	        
	        var name = data.name;
	        var type = obj.type;
	        if (name)
		        type = obj.types[name] = webix.clone(data.baseType?obj.types[data.baseType]:obj.type);
	        
	        for(var key in data){
		        if (key.indexOf("template")===0)
			        type[key] = webix.template(data[key]);
		        else
			        type[key]=data[key];
	        }

	        return name;
        };

    })();


    webix.Settings={
	    $init:function(){
		    /* 
			   property can be accessed as this.config.some
			   in same time for inner call it have sense to use _settings
			   because it will be minified in final version
		    */
		    this._settings = this.config= {}; 
	    },
	    define:function(property, value){
		    if (typeof property == "object")
			    return this._parseSeetingColl(property);
		    return this._define(property, value);
	    },
	    _define:function(property,value){
		    //method with name {prop}_setter will be used as property setter
		    //setter is optional
		    var setter = this[property+"_setter"];
		    return (this._settings[property]=setter?setter.call(this,value,property):value);
	    },
	    //process configuration object
	    _parseSeetingColl:function(coll){
		    if (coll){
			    for (var a in coll)				//for each setting
				    this._define(a,coll[a]);		//set value through config
		    }
	    },
	    //helper for object initialization
	    _parseSettings:function(obj,initial){
		    //initial - set of default values
		    var settings = {}; 
		    if (initial)
			    settings = webix.extend(settings,initial);
			
		    //code below will copy all properties over default one
		    if (typeof obj == "object" && !obj.tagName)
			    webix.extend(settings,obj, true);	
		    //call config for each setting
		    this._parseSeetingColl(settings);
	    },
	    _mergeSettings:function(config, defaults){
		    for (var key in defaults)
			    switch(typeof config[key]){
				case "object": 
					config[key] = this._mergeSettings((config[key]||{}), defaults[key]);
					break;
				case "undefined":
					config[key] = defaults[key];
					break;
				default:	//do nothing
					break;
			    }
		    return config;
	    }
    };
    /* 
	   ajax operations 
	   
	   can be used for direct loading as
	   webix.ajax(ulr, callback)
	   or
	   webix.ajax().getItem(url)
	   webix.ajax().post(url)

    */





    webix.ajax = function(url,params,call){
	    //if parameters was provided - made fast call
	    if (arguments.length!==0)
		    return (new webix.ajax()).get(url,params,call);

	    if (!this.getXHR) return new webix.ajax(); //allow to create new instance without direct new declaration

	    return this;
    };
    webix.ajax.count = 0;
    webix.ajax.prototype={
	    master:null,
	    //creates xmlHTTP object
	    getXHR:function(){
		    return new XMLHttpRequest();
	    },
	    stringify:function(obj){
		    return webix.stringify(obj);
	    },
	    /*
		  send data to the server
		  params - hash of properties which will be added to the url
		  call - callback, can be an array of functions
	    */
	    _send:function(url, params, call, mode){
		    var master;
		    if (params && (webix.isArray(params) || (typeof (params.success || params.error || params) == "function"))){
			    master = call;
			    call = params;
			    params = null;
		    }

		    var defer = webix.promise.defer();

		    var x=this.getXHR();
		    if (!webix.isArray(call))
			    call = [call];

		    call.push({ success: function(t, d){ defer.resolve(d);	},
					    error: function(t, d){ defer.reject(x);	}});

		    var headers = this._header || {};

		    if (!webix.callEvent("onBeforeAjax", [mode, url, params, x, headers, null, defer])) return;

		    //add content-type to POST|PUT|DELETE
		    var json_mode = false;
		    if (mode !== 'GET'){
			    var found = false;
			    for (var key in headers)
				    if (key.toString().toLowerCase() == "content-type"){
					    found = true;
					    if (headers[key] == "application/json")
						    json_mode = true;
				    }
			    if (!found)
				    headers['Content-Type'] = 'application/x-www-form-urlencoded';
		    }

		    //add extra params to the url
		    if (typeof params == "object" && !(window.FormData && (params instanceof window.FormData))){
			    if (json_mode)
				    params = this.stringify(params);
			    else {
				    var t=[];
				    for (var a in params){
					    var value = params[a];
					    if (value === null || value === webix.undefined)
						    value = "";
				        if(typeof value==="object")
				            value = this.stringify(value);
					    t.push(a+"="+encodeURIComponent(value));// utf-8 escaping
			 	    }
				    params=t.join("&");
			    }
		    }

		    if (params && mode==='GET'){
			    url=url+(url.indexOf("?")!=-1 ? "&" : "?")+params;
			    params = null;
		    }

		    x.open(mode, url, !this._sync);

		    var type = this._response;
		    if (type) x.responseType = type;

		    //if header was provided - use it
		    for (var key in headers)
			    x.setRequestHeader(key, headers[key]);
		    
		    //async mode, define loading callback
		    var self=this;
		    this.master = this.master || master;
		    x.onreadystatechange = function(){
			    if (!x.readyState || x.readyState == 4){
				    if (webix.debug_time) webix.log_full_time("data_loading");	//log rendering time

				    webix.ajax.count++;
				    if (call && self && !x.aborted){
					    //IE8 and IE9, handling .abort call
					    if (webix._xhr_aborted.find(x) != -1)
						    return webix._xhr_aborted.remove(x);

					    var owner = self.master||self;

					    var is_error = x.status >= 400 || x.status === 0;
					    var text, data;
					    if (x.responseType == "blob" || x.responseType == "arraybuffer"){
						    text = "";
						    data = x.response;
					    } else {
						    text = x.responseText||"";
						    data = self._data(x);
					    }

					    webix.ajax.$callback(owner, call, text, data, x, is_error);
				    }
				    if (self) self.master=null;
				    call=self=master=null;	//anti-leak
			    }
		    };

		    if (this._timeout)
			    x.timeout = this._timeout;

		    //IE can use sync mode sometimes, fix it
		    if (!this._sync)
			    setTimeout(function(){
				    if (!x.aborted){
					    //abort handling in IE9
					    if (webix._xhr_aborted.find(x) != -1)
						    webix._xhr_aborted.remove(x);
					    else
						    x.send(params||null);
				    }
			    }, 1);
		    else
			    x.send(params||null);

		    if (this.master && this.master._ajax_queue)
			    this.master._ajax_queue.push(x);

		    return this._sync?x:defer; //return XHR, which can be used in case of sync. mode
	    },
	    _data:function(x){
		    return {
			    xml:function(){ 
				    try{
					    return webix.DataDriver.xml.tagToObject(webix.DataDriver.xml.toObject(x.responseText, this));
				    }
				    catch(e){
					    webix.log(x.responseText);
					    webix.log(e.toString()); webix.assert_error("Invalid xml data for parsing"); 
				    }
			    },
			    rawxml:function(){ 
				    if (!window.XPathResult)
					    return webix.DataDriver.xml.fromString(x.responseText);
				    return x.responseXML;
			    },
			    text:function(){ return x.responseText; },
			    json:function(){
				    return webix.DataDriver.json.toObject(x.responseText, false);
			    }
		    };
	    },
	    //GET request
	    get:function(url,params,call){
		    return this._send(url,params,call,"GET");
	    },
	    //POST request
	    post:function(url,params,call){
		    return this._send(url,params,call,"POST");
	    },
	    //PUT request
	    put:function(url,params,call){
		    return this._send(url,params,call,"PUT");
	    },
	    //DELETE request
	    del:function(url,params,call){
		    return this._send(url,params,call,"DELETE");
	    },
	    //PATCH request
	    patch:function(url,params,call){
		    return this._send(url,params,call,"PATCH");
	    },

	    sync:function(){
		    this._sync = true;
		    return this;
	    },
	    timeout:function(num){
		    this._timeout = num;
		    return this;
	    },
	    response:function(value){
		    this._response = value;
		    return this;
	    },
	    //deprecated, remove in 3.0
	    //[DEPRECATED]
	    header:function(header){
		    webix.assert(false, "ajax.header is deprecated in favor of ajax.headers");
		    this._header = header;
		    return this;
	    },
	    headers:function(header){
		    this._header = webix.extend(this._header||{},header);
		    return this;
	    },
	    bind:function(master){
		    this.master = master;
		    return this;
	    }
    };
    webix.ajax.$callback = function(owner, call, text, data, x, is_error){
	    if (owner.$destructed) return;
	    if (x === -1 && data && typeof data.json == "function")
		    data = data.json();

	    if (is_error)
		    webix.callEvent("onAjaxError", [x]);

	    if (!webix.isArray(call))
		    call = [call];

	    if (!is_error)
		    for (var i=0; i < call.length; i++){
			    if (call[i]){
				    var before = call[i].before;
				    if (before)
					    before.call(owner, text, data, x);
			    }
		    }

	    for (var i=0; i < call.length; i++)	//there can be multiple callbacks
		    if (call[i]){
			    var method = (call[i].success||call[i]);
			    if (is_error)
				    method = call[i].error;
			    if (method && method.call)
				    method.call(owner,text,data,x);
		    }
    };

    /*submits values*/
    webix.send = function(url, values, method, target){
	    var form = webix.html.create("FORM",{
		    "target":(target||"_self"),
		    "action":url,
		    "method":(method||"POST")
	    },"");
	    for (var k in values) {
		    var field = webix.html.create("INPUT",{"type":"hidden","name": k,"value": values[k]},"");
		    form.appendChild(field);
	    }
	    form.style.display = "none";
	    document.body.appendChild(form);
	    form.submit();
	    document.body.removeChild(form);
    };


    webix.AtomDataLoader={
	    $init:function(config){
		    //prepare data store
		    this.data = {}; 
		    this.waitData = webix.promise.defer();

		    if (config)
			    this._settings.datatype = config.datatype||"json";
		    this.$ready.push(this._load_when_ready);
	    },
	    _load_when_ready:function(){
		    this._ready_for_data = true;
		    
		    if (this._settings.url)
			    this.url_setter(this._settings.url);
		    if (this._settings.data)
			    this.data_setter(this._settings.data);
	    },
	    url_setter:function(value){
		    value = webix.proxy.$parse(value);

		    if (!this._ready_for_data) return value;
		    this.load(value, this._settings.datatype);	
		    return value;
	    },
	    data_setter:function(value){
		    if (!this._ready_for_data) return value;
		    this.parse(value, this._settings.datatype);
		    return true;
	    },
	    //loads data from external URL
	    load:function(url,call){
		    var details = arguments[2] || null;

		    if(!this.callEvent("onBeforeLoad",[]))
			    return webix.promise.reject();		

		    if (typeof call == "string"){	//second parameter can be a loading type or callback
			    //we are not using setDriver as data may be a non-datastore here
			    this.data.driver = webix.DataDriver[call];
			    call = arguments[2];
		    } else if (!this.data.driver)
			    this.data.driver = webix.DataDriver.json;

		    //load data by async ajax call
		    //loading_key - can be set by component, to ignore data from old async requests
		    var callback = [{
			    success: this._onLoad,
			    error: this._onLoadError
		    }];
		    
		    if (call){
			    if (webix.isArray(call))
				    callback.push.apply(callback,call);
			    else
				    callback.push(call);
		    }
		    
		    //proxy	
		    url = webix.proxy.$parse(url);
		    if (url.$proxy && url.load)
			    return url.load(this, callback, details);

		    //promize
		    if (typeof url === "function"){
			    return url(details).then(
				    webix.bind(function(data){
					    webix.ajax.$callback(this, callback, "", data, -1);
				    }, this),
				    webix.bind(function(x){
					    webix.ajax.$callback(this, callback, "", null, x, true);
				    }, this)
			    );
		    }

		    //normal url
		    return webix.ajax(url,callback,this);
	    },
	    //loads data from object
	    parse:function(data,type){
		    //[webix.remote]
		    if (data && data.then && typeof data.then == "function"){
			    return data.then(webix.bind(function(data){ 
				    if (data && typeof data.json == "function")
					    data = data.json();
				    this.parse(data, type); 
			    }, this));
		    }

		    //loading data from other component
		    if (data && data.sync && this.sync)
			    return this._syncData(data);

		    if(!this.callEvent("onBeforeLoad",[]))
			    return webix.promise.reject();

		    this.data.driver = webix.DataDriver[type||"json"];
		    this._onLoad(data,null);
	    },
	    _syncData: function(data){
		    if(this.data)
			    this.data.attachEvent("onSyncApply",webix.bind(function(){
				    if(this._call_onready)
					    this._call_onready();
			    },this));

		    this.sync(data);
	    },
	    _parse:function(data){
		    var parsed, record,
			    driver = this.data.driver;

		    record = driver.getRecords(data)[0];
		    parsed = record?driver.getDetails(record):{};

		    if (this.setValues)
			    this.setValues(parsed);
		    else
			    this.data = parsed;
	    },
	    _onLoadContinue:function(data, text, response, loader){
		    if (data){
			    if(!this.$onLoad || !this.$onLoad(data, this.data.driver)){
				    if(this.data && this.data._parse)
					    this.data._parse(data); //datastore
				    else
					    this._parse(data);
			    }
		    }
		    else
			    this._onLoadError(text, response, loader);

		    //data loaded, view rendered, call onready handler
		    if(this._call_onready)
			    this._call_onready();

		    this.callEvent("onAfterLoad",[]);
		    this.waitData.resolve();
	    },
	    //default after loading callback
	    _onLoad:function(text, response, loader){
		    var driver = this.data.driver;
		    var data;

		    if (loader === -1)
			    data = driver.toObject(response);
		    else{
			    //ignore data loading command if data was reloaded 
			    if(this._ajax_queue)
				    this._ajax_queue.remove(loader);
			    data = driver.toObject(text, response);
		    }
			
		    if(!data || !data.then)
			    this._onLoadContinue(data);
		    else if(data.then && typeof data.then == "function")
			    data.then(webix.bind(this._onLoadContinue, this));
	    },
	    _onLoadError:function(text, xml, xhttp){
		    this.callEvent("onAfterLoad",[]);
		    this.callEvent("onLoadError",arguments);
		    webix.callEvent("onLoadError", [text, xml, xhttp, this]);
	    },
	    _check_data_feed:function(data){
		    if (!this._settings.dataFeed || this._ignore_feed || !data) return true;
		    var url = this._settings.dataFeed;
		    if (typeof url == "function")
			    return url.call(this, (data.id||data), data);
		    url = url+(url.indexOf("?")==-1?"?":"&")+"action=get&id="+encodeURIComponent(data.id||data);
		    if(!this.callEvent("onBeforeLoad",[])) 
			    return false;
		    webix.ajax(url, function(text,xml,loader){
			    this._ignore_feed=true;
			    var driver = webix.DataDriver.json;
			    var data = driver.toObject(text, xml);
			    if (data)
				    this.setValues(driver.getDetails(driver.getRecords(data)[0]));
			    else
				    this._onLoadError(text,xml,loader);
			    this._ignore_feed=false;
			    this.callEvent("onAfterLoad",[]);
		    }, this);
		    return false;
	    }
    };

    /*
	  Abstraction layer for different data types
    */

    webix.DataDriver={};
    webix.DataDriver.json={
	    //convert json string to json object if necessary
	    toObject:function(data){
		    if (!data) return null;
		    if (typeof data == "string"){
			    try{
				    if (this.parseDates){
					    var isodate = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{1-3})?Z/;
					    data = JSON.parse(data, function(key, value){
						    if (typeof value == "string"){
							    if (isodate.test(value))
								    return new Date(value);
						    }
						    return value;
					    });
				    } else {
					    data =JSON.parse(data);
				    }
			    } catch(e){
				    webix.log(e);
				    webix.log(data);
				    webix.assert_error("Invalid JSON data for parsing");
				    return null;
			    }
		    }

		    return data;
	    },
	    //get array of records
	    getRecords:function(data){
		    if (data && data.data)
			    data = data.data;

		    if (data && !webix.isArray(data))
			    return [data];
		    return data;
	    },
	    //get hash of properties for single record
	    getDetails:function(data){
		    if (typeof data == "string")
			    return { id:(data||webix.uid()), value:data };
		    return data;
	    },
	    getOptions:function(data){
		    return data.collections;
	    },
	    //get count of data and position at which new data need to be inserted
	    getInfo:function(data){
		    return {
			    size:(data.total_count||0),
			    from:(data.pos||0),
			    parent:(data.parent||0),
			    config:(data.config),
			    key:(data.webix_security)
		    };
	    },
	    child:"data",
	    parseDates:false
    };

    webix.DataDriver.html={
	    /*
		  incoming data can be
		  - ID of parent container
		  - HTML text
	    */
	    toObject:function(data){
		    if (typeof data == "string"){
		        var t=null;
		        if (data.indexOf("<")==-1)	//if no tags inside - probably its an ID
			        t = webix.toNode(data);
		        if (!t){
			        t=document.createElement("DIV");
			        t.innerHTML = data;
		        }
		        
		        return t.firstChild;
		    }
		    return data;
	    },
	    //get array of records
	    getRecords:function(node){
		    return node.getElementsByTagName(this.tag);
	    },
	    //get hash of properties for single record
	    getDetails:function(data){
		    return webix.DataDriver.xml.tagToObject(data);
	    },
	    getOptions:function(){ 
		    return false;
	    },
	    //dyn loading is not supported by HTML data source
	    getInfo:function(data){
		    return {
			    size:0,
			    from:0
		    };
	    },
	    tag: "LI"
    };

    webix.DataDriver.jsarray={
	    //parse jsarray string to jsarray object if necessary
	    toObject:function(data){
		    if (typeof data == "string")
			    return JSON.parse(data);
		    return data;
	    },
	    //get array of records
	    getRecords:function(data){
		    if (data && data.data)
			    data = data.data;
		    return data;
	    },
	    //get hash of properties for single record, in case of array they will have names as "data{index}"
	    getDetails:function(data){
		    var result = {};
		    for (var i=0; i < data.length; i++)
		        result["data"+i]=data[i];
		    if (this.idColumn !== null)
			    result.id = data[this.idColumn];
		    
		    return result;
	    },
	    getOptions:function(){ return false; },
	    //dyn loading is not supported by js-array data source
	    getInfo:function(data){
		    return {
			    size:0,
			    from:0
		    };
	    },
	    idColumn:null
    };

    webix.DataDriver.csv={
	    //incoming data always a string
	    toObject:function(data){
		    return data;
	    },
	    //get array of records
	    getRecords:function(data){
		    return data.split(this.row);
	    },
	    //get hash of properties for single record, data named as "data{index}"
	    getDetails:function(data){
		    data = this.stringToArray(data);
		    var result = {};
		    for (var i=0; i < data.length; i++) 
			    result["data"+i]=data[i];

		    if (this.idColumn !== null)
			    result.id = data[this.idColumn];
		    
		    return result;
	    },
	    getOptions:function(){ return false; },
	    //dyn loading is not supported by csv data source
	    getInfo:function(data){
		    return {
			    size:0,
			    from:0
		    };
	    },
	    //split string in array, takes string surrounding quotes in account
	    stringToArray:function(data){
		    data = data.split(this.cell);
		    for (var i=0; i < data.length; i++)
		        data[i] = data[i].replace(/^[ \t\n\r]*(\"|)/g,"").replace(/(\"|)[ \t\n\r]*$/g,"");
		    return data;
	    },
	    idColumn:null,
	    row:"\n",	//default row separator
	    cell:","	//default cell separator
    };

    webix.DataDriver.xml={
	    _isValidXML:function(data){
		    if (!data || !data.documentElement)
			    return null;
		    if (data.getElementsByTagName("parsererror").length)
			    return null;
		    return data;
	    },
	    //convert xml string to xml object if necessary
	    toObject:function(text, response){
		    var data = response ? (response.rawxml ? response.rawxml() : response) :null;
		    if (this._isValidXML(data))
			    return data;
		    if (typeof text == "string")
			    data = this.fromString(text.replace(/^[\s]+/,""));
		    else
			    data = text;

		    if (this._isValidXML(data))
			    return data;
		    return null;
	    },
	    //get array of records
	    getRecords:function(data){
		    return this.xpath(data,this.records);
	    },
	    records:"/*/item",
	    child:"item",
	    config:"/*/config",
	    //get hash of properties for single record
	    getDetails:function(data){
		    return this.tagToObject(data,{});
	    },
	    getOptions:function(){ 
		    return false;
	    },
	    //get count of data and position at which new data_loading need to be inserted
	    getInfo:function(data){
		    
		    var config = this.xpath(data, this.config);
		    if (config.length)
			    config = this.assignTypes(this.tagToObject(config[0],{}));
		    else 
			    config = null;

		    return {
			    size:(data.documentElement.getAttribute("total_count")||0),
			    from:(data.documentElement.getAttribute("pos")||0),
			    parent:(data.documentElement.getAttribute("parent")||0),
			    config:config,
			    key:(data.documentElement.getAttribute("webix_security")||null)
		    };
	    },
	    //xpath helper
	    xpath:function(xml,path){
		    if (window.XPathResult){	//FF, KHTML, Opera
		        var node=xml;
		        if(xml.nodeName.indexOf("document")==-1)
		            xml=xml.ownerDocument;
		        var res = [];
		        var col = xml.evaluate(path, node, null, XPathResult.ANY_TYPE, null);
		        var temp = col.iterateNext();
		        while (temp){ 
			        res.push(temp);
			        temp = col.iterateNext();
		        }
		        return res;
		    }	
		    else {
			    var test = true;
			    try {
				    if (typeof(xml.selectNodes)=="undefined")
					    test = false;
			    } catch(e){ /*IE7 and below can't operate with xml object*/ }
			    //IE
			    if (test)
				    return xml.selectNodes(path);
			    else {
				    //there is no interface to do XPath
				    //use naive approach
				    var name = path.split("/").pop();

				    return xml.getElementsByTagName(name);
			    }
		    }
	    },
	    assignTypes:function(obj){
		    for (var k in obj){
			    var test = obj[k];
			    if (typeof test == "object")
				    this.assignTypes(test);
			    else if (typeof test == "string"){
				    if (test === "") 
					    continue;
				    if (test == "true")
					    obj[k] = true;
				    else if (test == "false")
					    obj[k] = false;
				    else if (test == test*1)
					    obj[k] = obj[k]*1;
			    }
		    }
		    return obj;
	    },
	    //convert xml tag to js object, all subtags and attributes are mapped to the properties of result object
	    tagToObject:function(tag,z){
		    var isArray = tag.nodeType == 1 && tag.getAttribute("stack");
		    var hasSubTags = 0;

		    if (!isArray){
			    z=z||{};
			    

			    //map attributes
			    var a=tag.attributes;
			    if(a && a.length)
				    for (var i=0; i<a.length; i++){
			 		    z[a[i].name]=a[i].value;
			 		    hasSubTags = 1;
			 	    }

			    //map subtags
			    var b=tag.childNodes;
			    for (var i=0; i<b.length; i++)
				    if (b[i].nodeType==1){
					    var name = b[i].tagName;
					    if (z[name]){
						    if (typeof z[name].push != "function")
							    z[name] = [z[name]];
						    z[name].push(this.tagToObject(b[i],{}));
					    } else
						    z[name]=this.tagToObject(b[i],{});	//sub-object for complex subtags
					    hasSubTags = 2;
				    }

			    if (!hasSubTags)
				    return this.nodeValue(tag);
			    //each object will have its text content as "value" property
			    //only if has not sub tags
			    if (hasSubTags < 2)
				    z.value = z.value||this.nodeValue(tag);

		    } else {
			    z = [];
			    var b=tag.childNodes;
			    for (var i=0; i<b.length; i++)
				    if (b[i].nodeType==1)
					    z.push(this.tagToObject(b[i],{}));
		    }

		    return z;
	    },
	    //get value of xml node 
	    nodeValue:function(node){
		    if (node.firstChild){
			    return node.firstChild.wholeText || node.firstChild.data;
		    }
		    return "";
	    },
	    //convert XML string to XML object
	    fromString:function(xmlString){
		    try{
			    if (window.DOMParser)		// FF, KHTML, Opera
				    return (new DOMParser()).parseFromString(xmlString,"text/xml");
			    if (window.ActiveXObject){	// IE, utf-8 only 
				    var temp=new ActiveXObject("Microsoft.xmlDOM");
				    temp.loadXML(xmlString);
				    return temp;
			    }
		    } catch(e){
			    webix.assert_error(e);
			    return null;
		    }
		    webix.assert_error("Load from xml string is not supported");
	    }
    };


    webix.debug_code(function(){
	    webix.debug_load_event = webix.attachEvent("onLoadError", function(text, xml, xhttp, owner){
		    text = text || "[EMPTY DATA]";
		    var error_text = "Data loading error, check console for details";
		    if (text.indexOf("<?php") === 0)
			    error_text = "PHP support missed";
		    else if (text.indexOf("WEBIX_ERROR:") === 0)
			    error_text = text.replace("WEBIX_ERROR:","");

		    if (webix.message)
			    webix.message({
				    type:"debug",
				    text:error_text,
				    expire:-1
			    });
		    if (window.console){
			    var logger = window.console;
			    logger.log("Data loading error");
			    logger.log("Object:", owner);
			    logger.log("Response:", text);
			    logger.log("XHTTP:", xhttp);
		    }
	    });

	    webix.ready(function(){
		    var path = document.location.href;
		    if (path.indexOf("file:")===0){
			    if (webix.message)
				    webix.message({
					    type:"error", 
					    text:"Please open sample by http,<br>not as file://",
					    expire:-1
				    });
			    else 
				    window.alert("Please open sample by http, not as file://");
		    }
	    });
	    
    });



    //UI interface
    webix.BaseBind = {
	    bind:function(target, rule, format){
		    if (!this.attachEvent)
			    webix.extend(this, webix.EventSystem);

		    if (typeof target == 'string')
			    target = webix.$$(target);
			
		    if (target._initBindSource) target._initBindSource();
		    if (this._initBindSource) this._initBindSource();

		    
			
		    if (!target.getBindData)
			    webix.extend(target, webix.BindSource);

		    this._bind_ready();

		    target.addBind(this._settings.id, rule, format);
		    this._bind_source = target._settings.id;

		    if (webix.debug_bind)
			    webix.log("[bind] "+this.name+"@"+this._settings.id+" <= "+target.name+"@"+target._settings.id);

		    var target_id = this._settings.id;
		    //FIXME - check for touchable is not the best solution, to detect necessary event
		    this._bind_refresh_handler = this.attachEvent(this.touchable?"onAfterRender":"onBindRequest", function(){
			    return target.getBindData(target_id);
		    });

		    if (this.refresh && this.isVisible(this._settings.id))
			    this.refresh();
	    },
	    unbind:function(){
		    if (this._bind_source){
			    var target = webix.$$(this._bind_source);
			    if (target)
				    target.removeBind(this._settings.id);
			    this.detachEvent(this._bind_refresh_handler);
			    this._bind_source = null;
		    }
	    },
	    _bind_ready:function(){
		    var config = this._settings;
		    if (this.filter){
			    var key = config.id;
			    this.data._on_sync = webix.bind(function(){
				    webix.$$(this._bind_source)._bind_updated[key] = false;
			    }, this);
		    }

		    var old_render = this.render;
		    this.render = function(){
			    if (this._in_bind_processing) return;
			    
			    this._in_bind_processing = true;
			    var result = this.callEvent("onBindRequest");
			    this._in_bind_processing = false;
			    
			    return old_render.apply(this, ((result === false)?arguments:[]));
		    };

		    if (this.getValue||this.getValues)
			    this.save = function(data){
				    var source = webix.$$(this._bind_source);
				    if (data)
					    source.setBindData(data);
				    else {
					    if (this.validate && !this.validate()) return false;
					    var values = this.getValue?this.getValue:this.getValues();
					    source.setBindData(values,this._settings.id);
					    //reset form, so it will be counted as saved
					    if (this.setDirty)
						    this.setDirty(false);
				    }
			    };

		    this._bind_ready = function(){};
	    }
    };

    //bind interface
    webix.BindSource = {
	    $init:function(){
		    this._bind_hash = {};		//rules per target
		    this._bind_updated = {};	//update flags
		    this._ignore_binds = {};
		    
		    //apply specific bind extension
		    this._bind_specific_rules(this);
	    },
	    saveBatch:function(code){
		    this._do_not_update_binds = true;
		    code.call(this);
		    this._do_not_update_binds = false;
		    this._update_binds();
	    },
	    setBindData:function(data, key){
		    //save called, updating master data
		    if (key)
			    this._ignore_binds[key] = true;

		    if (webix.debug_bind)
				webix.log("[bind:save] "+this.name+"@"+this._settings.id+" <= "+"@"+key);
		    if (this.setValue)
			    this.setValue(data);
		    else if (this.setValues)
			    this.setValues(data);
		    else {
			    var id = this.getCursor();
			    if (id)
				    this.updateItem(id, data);
			    else
				    this.add(data);
		    }
		    this.callEvent("onBindUpdate", [data, key]);		
		    if (this.save)
			    this.save();
		    
		    if (key)
			    this._ignore_binds[key] = false;
	    },
	    //fill target with data
	    getBindData:function(key, update){
		    //fire only if we have data updates from the last time
		    if (this._bind_updated[key]) return false;
		    var target = webix.$$(key);
		    //fill target only when it visible
		    if (target.isVisible(target._settings.id)){
			    this._bind_updated[key] = true;
			    if (webix.debug_bind)
				    webix.log("[bind:request] "+this.name+"@"+this._settings.id+" => "+target.name+"@"+target._settings.id);
			    this._bind_update(target, this._bind_hash[key][0], this._bind_hash[key][1]); //trigger component specific updating logic
			    if (update && target.filter)
				    target.refresh();
		    }
	    },
	    //add one more bind target
	    addBind:function(source, rule, format){
		    this._bind_hash[source] = [rule, format];
	    },
	    removeBind:function(source){
		    delete this._bind_hash[source];
		    delete this._bind_updated[source];
		    delete this._ignore_binds[source];
	    },
	    //returns true if object belong to "collection" type
	    _bind_specific_rules:function(obj){
		    if (obj.filter)
			    webix.extend(this, webix.CollectionBind);
		    else if (obj.setValue)
			    webix.extend(this, webix.ValueBind);
		    else
			    webix.extend(this, webix.RecordBind);
	    },
	    //inform all binded objects, that source data was updated
	    _update_binds:function(){
		    if (!this._do_not_update_binds)
			    for (var key in this._bind_hash){
				    if (this._ignore_binds[key]) continue;
				    this._bind_updated[key] = false;
				    this.getBindData(key, true);
			    }
	    },
	    //copy data from source to the target
	    _bind_update_common:function(target, rule, data){
		    if (target.setValue)
			    target.setValue((data&&rule)?data[rule]:data);
		    else if (!target.filter){
			    if (!data && target.clear)
				    target.clear();
			    else {
				    if (target._check_data_feed(data))
					    target.setValues(webix.clone(data));
			    }
		    } else {
			    target.data.silent(function(){
				    this.filter(rule,data);
			    });
		    }
		    target.callEvent("onBindApply", [data,rule,this]);
	    }
    };


    //pure data objects
    webix.DataValue = webix.proto({
	    name:"DataValue",
	    isVisible:function(){ return true; },
	    $init:function(config){ 
		    if (!config || webix.isUndefined(config.value))
			    this.data = config||"";

		    var id = (config&&config.id)?config.id:webix.uid();
		    this._settings = { id:id };
		    webix.ui.views[id] = this;
	    },
	    setValue:function(value){
		    this.data = value;
		    this.callEvent("onChange", [value]);
	    },
	    getValue:function(){
		    return this.data;
	    },
	    refresh:function(){ this.callEvent("onBindRequest"); }
    }, webix.EventSystem, webix.BaseBind);

    webix.DataRecord = webix.proto({
	    name:"DataRecord",
	    isVisible:function(){ return true; },
	    $init:function(config){
		    this.data = config||{}; 
		    var id = (config&&config.id)?config.id:webix.uid();
		    this._settings = { id:id };
		    webix.ui.views[id] = this;
	    },
	    getValues:function(){
		    return this.data;
	    },
	    setValues:function(data, update){
		    this.data = update?webix.extend(this.data, data, true):data;
		    this.callEvent("onChange", [data]);
	    },
	    refresh:function(){ this.callEvent("onBindRequest"); }
    }, webix.EventSystem, webix.BaseBind, webix.AtomDataLoader, webix.Settings);


    webix.ValueBind={
	    $init:function(){
		    this.attachEvent("onChange", this._update_binds);
	    },
	    _bind_update:function(target, rule, format){
		    rule = rule || "value";
		    var data = this.getValue()||"";
		    if (format) data = format(data);
		    
		    if (target.setValue)
			    target.setValue(data);
		    else if (!target.filter){
			    var pod = {}; pod[rule] = data;
			    if (target._check_data_feed(data))
				    target.setValues(pod);
		    } else{
			    target.data.silent(function(){
				    this.filter(rule,data);
			    });
		    }
		    target.callEvent("onBindApply", [data,rule,this]);
	    }
    };

    webix.RecordBind={
	    $init:function(){
		    this.attachEvent("onChange", this._update_binds);		
	    },
	    _bind_update:function(target, rule, format){
		    var data = this.getValues()||null;
		    if (format)
			    data = format(data);
		    this._bind_update_common(target, rule, data);
	    }
    };

    webix.CollectionBind={
	    $init:function(){
		    this._cursor = null;
		    this.attachEvent("onSelectChange", function(data){
			    var sel = this.getSelectedId();
			    this.setCursor(sel?(sel.id||sel):null);
		    });
		    this.attachEvent("onAfterCursorChange", this._update_binds);		
		    this.attachEvent("onAfterDelete", function(id){
			    if (id == this.getCursor())
				    this.setCursor(null);
		    });
		    this.data.attachEvent("onStoreUpdated", webix.bind(function(id, data, mode){
			    //paint - ignored
			    //delete - handled by onAfterDelete above
			    if (id && id == this.getCursor() && mode != "paint" && mode != "delete")
				    this._update_binds();
			    
		    },this));
		    this.data.attachEvent("onClearAll", webix.bind(function(){
			    this._cursor = null;
		    },this));
		    this.data.attachEvent("onIdChange", webix.bind(function(oldid, newid){
			    if (this._cursor == oldid){
				    this._cursor = newid;
				    this._update_binds();
			    }
		    },this));
	    },
	    refreshCursor:function(){
		    if (this._cursor)
			    this.callEvent("onAfterCursorChange",[this._cursor]);
	    },
	    setCursor:function(id){
		    if (id == this._cursor || (id !== null && !this.getItem(id))) return;
		    
		    this.callEvent("onBeforeCursorChange", [this._cursor]);
		    this._cursor = id;
		    this.callEvent("onAfterCursorChange",[id]);
	    },
	    getCursor:function(){
		    return this._cursor;
	    },
	    _bind_update:function(target, rule, format){
		    if (rule == "$level" && this.data.getBranch)
			    return (target.data || target).importData(this.data.getBranch(this.getCursor()));

		    var data = this.getItem(this.getCursor())|| this._settings.defaultData || null;
		    if (rule == "$data"){
			    if (typeof format === "function")
				    format.call(target, data, this);
			    else
				    target.data.importData(data?data[format]:[]);
			    target.callEvent("onBindApply", [data,rule,this]);
		    } else {
			    if (format)
				    data = format(data);
			    this._bind_update_common(target, rule, data);
		    }
	    }
    };	



    /*
	  REnders single item. 
	  Can be used for elements without datastore, or with complex custom rendering logic
	  
	  @export
	  render
    */



    webix.AtomRender={
	    //convert item to the HTML text
	    _toHTML:function(obj){
		    if (obj.$empty )
			    return "";
		    return this._settings.template(obj, this);
	    },
	    //render self, by templating data object
	    render:function(){
		    var cfg = this._settings;
		    if (this.isVisible(cfg.id)){
			    if (webix.debug_render)
				    webix.log("Render: "+this.name+"@"+cfg.id);
			    if (!this.callEvent || this.callEvent("onBeforeRender",[this.data])){
				    if (this.data && !cfg.content){
					    //it is critical to have this as two commands
					    //its prevent destruction race in Chrome
					    this._dataobj.innerHTML = "";
					    this._dataobj.innerHTML = this._toHTML(this.data);
				    }
				    if (this.callEvent) this.callEvent("onAfterRender",[]);
			    }
			    return true;
		    }
		    return false;
	    },
	    sync:function(source){
		    this._backbone_sync = false;
		    if (source.name != "DataStore"){
			    if (source.data && source.name == "DataStore"){
				    source = source.data;
			    } else {
				    this._backbone_sync = true;
			    }
		    }
			

		    if (this._backbone_sync)
			    source.bind("change", webix.bind(function(data){
				    if (data.id == this.data.id){
					    this.data = data.attributes;
					    this.refresh();
				    }
			    }, this));
		    else
			    source.attachEvent("onStoreUpdated", webix.bind(function(id){
				    if (!id || id == this.data.id){
					    this.data = source.pull[id];
					    this.refresh();
				    }
			    }, this));
	    },
	    template_setter:webix.template
    };

    webix.SingleRender=webix.proto({
        template_setter:function(value){
		    this.type.template=webix.template(value);
	    },
	    //convert item to the HTML text
	    _toHTML:function(obj){
		    var type = this.type;
		    return (type.templateStart?type.templateStart(obj,type):"") + type.template(obj,type) + (type.templateEnd?type.templateEnd(obj,type):"");
	    },
	    customize:function(obj){
		    webix.type(this,obj);
	    }
    }, webix.AtomRender);

    webix.UIManager = {
	    _view: null,
	    _hotkeys: {},
	    _focus_time:0,
	    _controls: {
		    'enter': 13,
		    'tab': 9,
		    'esc': 27,
		    'escape': 27,
		    'up': 38,
		    'down': 40,
		    'left': 37,
		    'right': 39,
		    'pgdown': 34,
		    'pagedown': 34,
		    'pgup': 33,
		    'pageup': 33,
		    'end': 35,
		    'home': 36,
		    'insert': 45,
		    'delete': 46,
		    'backspace': 8,
		    'space': 32,
		    'meta': 91,
		    'win': 91,
		    'mac': 91,
		    'multiply': 106,
		    'add': 107,
		    'subtract': 109,
		    'decimal': 110,
		    'divide': 111,
		    'scrollock':145,
		    'pausebreak':19,
		    'numlock':144,
		    '5numlocked':12,
		    'shift':16,
		    'capslock':20
	    },
	    _inputs:{
		    "input": 1,
		    "button":1,
		    "textarea":1,
		    "select":1
	    },
	    _enable: function() {
		    // attaching events here
		    webix.event(document.body, "click", webix.bind(this._focus_click, this));
		    webix.event(document, "keydown", webix.bind(this._keypress, this));

		    if (document.body.addEventListener)
			    webix.event(document.body, "focus", this._focus_tab, { capture:true, bind: this });

		    webix.destructors.push({obj:this});
	    },
	    destructor:function(){
		    webix.UIManager._view = null;
	    },
	    getFocus: function() {
		    return this._view;
	    },
	    _focus_action:function(view){
		    this._focus_was_there = this._focus_was_there || view._settings.id;
	    },
	    setFocus: function(view, only_api){
		    //view can be empty
		    view = webix.$$(view);
		    //unfocus if view is hidden
		    if (view && !view.$view) view = null;

		    //store last click time, it is necessary to prevent refocusing
		    //for example when user moves focus from onclick handler somewher
		    //and we want to prevent autofocusing, when event will reach document.body
		    this._focus_time = webix._focus_time = new Date();

		    if (this._view === view) return true;
		    if (this._view && this._view.callEvent)
			    this._view.callEvent("onBlur", [this._view]);

		    if (view && view.callEvent)
			    view.callEvent("onFocus", [view, this._view]);
		    webix.callEvent("onFocusChange", [view, this._view]);

		    if (this._view && this._view.blur && !only_api) this._view.blur();
		    this._view = view;
		    if (view && view.focus && !only_api) view.focus();
		    return true;
	    },
	    applyChanges: function(element){
		    var view = this.getFocus();
		    if (view && view != element && view._applyChanges)
			    view._applyChanges(element);
	    },
	    hasFocus: function(view) {
		    return (view === this._view) ? true : false;
	    },
	    _focus: function(e, dont_clear) {
		    var view = webix.html.locate(e, "view_id") || this._focus_was_there;

		    //if html was repainted we can miss the view, so checking last processed one
		    view = webix.$$(view);
		    this._focus_was_there = null;

		    //set timer, to fix issue with Android input focusin
		    webix._focus_time = new Date();

		    if (view == this._view) return;

		    if (!dont_clear)
			    this._focus_was_there = null;
		    
		    if (view){
			    view = webix.$$(view);
			    if (this.canFocus(view)){
				    //[ACTIVECONTENT] focus operations for active content
				    if (view.getNode) view.getNode(e);
				    this.setFocus(view);
			    }
		    } else if (!dont_clear)
			    this.setFocus(null);

		    return true;
	    },
	    _focus_click:function(e){
		    // if it was onfocus/onclick less then 100ms behore then we ignore it
		    if ((new Date())-this._focus_time < 100) {
			    this._focus_was_there = null;
			    return false;
		    }
		    return this._focus(e);
	    },
	    _focus_tab: function(e) {
		    if(!this._inputs[e.target.nodeName.toLowerCase()])
			    return false;
		    return this._focus(e, true);
	    },
	    canFocus:function(view){
		    return view.isVisible() && view.isEnabled();
	    },

	    _moveChildFocus: function(check_view){
		    var focus = this.getFocus();
		    //we have not focus inside of closing item
		    if (check_view && !this._is_child_of(check_view, focus))
			    return false;

		    if (!this._focus_logic("getPrev", check_view))
			    this._view = null;
	    },
	    _translation_table:{
	    },
	    _is_child_of: function(parent, child) {
		    if (!parent) return false;
		    if (!child) return false;
		    while (child) {
			    if (child === parent) return true;
			    child = child.getParentView();
		    }
		    return false;
	    },
	    _keypress_timed:function(){
		    if (this && this.callEvent)
			    this.callEvent("onTimedKeyPress",[]);
	    },
	    _isNumPad: function(code){
		    return code < 112 &&  code>105;
	    },
	    _keypress: function(e) {
		    var code = e.which || e.keyCode;
		    if(code>95 && code< 106)
			    code -= 48; //numpad support (numbers)
		    code = this._translation_table[code] || code;
		    
		    var ctrl = e.ctrlKey;
		    var shift = e.shiftKey;
		    var alt = e.altKey;
		    var meta = e.metaKey;
		    var codeid = this._keycode(code, ctrl, shift, alt, meta);
		    var view = this.getFocus();
		    if (view && view.callEvent) {
			    if (view.callEvent("onKeyPress", [code,e]) === false)
				    webix.html.preventEvent(e);
			    if (view.hasEvent("onTimedKeyPress")){
				    clearTimeout(view._key_press_timeout);
				    view._key_press_timeout = webix.delay(this._keypress_timed, view, [], (view._settings.keyPressTimeout||250));
			    }
		    }

		    if(!this._isNumPad(code))
			    codeid = this._keycode(String.fromCharCode(code), ctrl, shift, alt, meta);
		    //flag, that some non-special key was pressed
		    var is_any = !ctrl && !alt && !meta && (code!=9)&&(code!=27)&&(code!=13);

		    if (this._check_keycode(codeid, is_any, e) === false) {
			    webix.html.preventEvent(e);
			    return false;
		    }
	    },

	    // dir - getNext or getPrev
	    _focus_logic: function(dir) {
		    if (!this.getFocus()) return null;

		    dir = dir || "getNext";
		    var next = this.getFocus();
		    var start = next;
		    var marker = webix.uid();

		    while (true) {
			    next = this[dir](next);
			    // view with focus ability
			    if (next && this.canFocus(next))
				    return this.setFocus(next);

			    // elements with focus ability not found
			    if (next === start || next.$fmarker == marker)
				    return null;
			    
			    //prevents infinity loop
			    next.$fmarker = marker;
		    }
	    },
	    _tab_logic:function(view, e){
		    var mode = !e.shiftKey;
		    webix.UIManager._tab_time = new Date();
		    if (view && view._custom_tab_handler && !view._custom_tab_handler(mode, e))
			    return false;

		    if (view && view._in_edit_mode){
			    if (view.editNext)
				    return view.editNext(mode);
			    else if (view.editStop){
				    view.editStop();
				    return true;
			    }
		    } else
			    webix.delay(function(){
				    webix.UIManager.setFocus(webix.$$(document.activeElement), true);
			    },1);
	    },
	    getTop: function(id) {
		    var next, view = webix.$$(id);

		    while (view && (next = view.getParentView()))
			    view = next;
		    return view;
	    },

	    getNext: function(view, _inner_call) {
		    var cells = view.getChildViews();
		    //tab to first children
		    if (cells.length && !_inner_call) return cells[0];

		    //unique case - single view without child and parent
		    var parent = view.getParentView();
		    if (!parent)
			    return view;

		    var p_cells = parent.getChildViews();
		    if (p_cells.length){
			    var index = webix.PowerArray.find.call(p_cells, view)+1;
			    while (index < p_cells.length) {
				    //next visible child
				    if (this.canFocus(p_cells[index])) 
					    return p_cells[index];

				    index++;
			    }
		    } 

		    //sibling of parent
		    return this.getNext(parent, true);
	    },

	    getPrev: function(view, _inner_call) {
		    var cells = view.getChildViews();
		    //last child of last child
		    if (cells.length && _inner_call) 
			    return this.getPrev(cells[cells.length - 1], true);
		    if (_inner_call) return view;

		    //fallback from top to bottom
		    var parent = view.getParentView();
		    if (!parent) return this.getPrev(view, true);


		    var p_cells = parent.getChildViews();
		    if (p_cells) {
			    var index = webix.PowerArray.find.call(p_cells, view)-1;
			    while (index >= 0) {
				    if (this.canFocus(p_cells[index]))
					    return this.getPrev(p_cells[index], true);
				    index--;
			    }
		    }

		    return parent;
	    },
	    addHotKey: function(keys, handler, view) {
		    webix.assert(handler, "Hot key handler is not defined");
		    var pack = this._parse_keys(keys);
		    webix.assert(pack.letter, "Unknown key code");
		    if (!view) view = null;
		    pack.handler = handler;
		    pack.view = view;
		    

		    var code = this._keycode(pack.letter, pack.ctrl, pack.shift, pack.alt, pack.meta);
		    if (!this._hotkeys[code]) this._hotkeys[code] = [];
		    this._hotkeys[code].push(pack);

		    return keys;
	    },
	    removeHotKey: function(keys, func, view){
		    var pack = this._parse_keys(keys);
		    var code = this._keycode(pack.letter, pack.ctrl, pack.shift, pack.alt, pack.meta);
		    if (!func && !view)
			    delete this._hotkeys[code];
		    else {
			    var t = this._hotkeys[code];
			    if (t){
				    for (var i = t.length - 1; i >= 0; i--) {
					    if (view && t[i].view !== view) continue;
					    if (func && t[i].handler !== func) continue;
					    t.splice(i,1);
				    }
				    if (!t.length)
					    delete this._hotkeys[code];
			    }

		    }
	    },
	    _keycode: function(code, ctrl, shift, alt, meta) {
		    return code+"_"+["", (ctrl ? '1' : '0'), (shift ? '1' : '0'), (alt ? '1' : '0'), (meta ? '1' : '0')].join('');
	    },

	    _check_keycode: function(code, is_any, e){
		    var focus = this.getFocus();
		    if (this._hotkeys[code])
			    return  this._process_calls(this._hotkeys[code], focus, e);
		    else if (is_any && this._hotkeys["ANY_0000"])
			    return  this._process_calls(this._hotkeys["ANY_0000"], focus, e);

		    return true;
	    },
	    _process_calls:function(calls, focus, e){
		    for (var i = 0; i < calls.length; i++) {
			    var key = calls[i];
			    var call = false;
			    if ((key.view !== null) &&		//common hot-key
				    (focus !== key.view) &&		//hot-key for current view
				    //hotkey for current type of view
				    (typeof(key.view) !== 'string' || !focus || focus.name !== key.view)) continue;

			    var temp_result = key.handler(focus, e);
			    if (!!temp_result === temp_result) return temp_result;
		    }
		    return true;
	    },
	    _parse_keys: function(keys) {
		    var controls = this._controls;
		    var parts = keys.toLowerCase().split(/[\+\-_]/);
		    var ctrl, shift, alt, meta;
		    ctrl = shift = alt = meta = 0;
		    var letter = "";
		    for (var i = 0; i < parts.length; i++) {
			    if (parts[i] === 'ctrl') ctrl = 1;
			    else if (parts[i] === 'shift') shift = 1;
			    else if (parts[i] === 'alt') alt = 1;
			    else if (parts[i] === 'command') meta = 1;
			    else {
				    if (controls[parts[i]]) {
					    var code = controls[parts[i]];
					    if(this._isNumPad(code))
						    letter = code.toString();
					    else
						    letter = String.fromCharCode(code);
				    } else {
					    letter = parts[i];
				    }
			    }
		    }
		    return {
			    letter: letter.toUpperCase(),
			    ctrl: ctrl,
			    shift: shift,
			    alt: alt,
			    meta: meta,
			    debug:keys
		    };
	    }
    };

    webix.ready(function() {
	    webix.UIManager._enable();

	    webix.UIManager.addHotKey("enter", function(view, ev){
		    if (view && view.editStop && view._in_edit_mode){
			    view.editStop();
			    return true;
		    } else if (view && view.touchable){
			    var form = view.getFormView();
			    if (form && !view._skipSubmit)
				    form.callEvent("onSubmit",[view,ev]);
		    }
	    });
	    webix.UIManager.addHotKey("esc", function(view){
		    if (view){
			    if (view.editCancel && view._in_edit_mode){
				    view.editCancel();
				    return true;
			    }
			    var top = view.getTopParentView();
			    if (top && top.setPosition)
				    top._hide();
		    }
	    });
	    webix.UIManager.addHotKey("shift+tab", webix.UIManager._tab_logic);
	    webix.UIManager.addHotKey("tab", webix.UIManager._tab_logic);
    });

    webix.IdSpace = {
	    $init:function(){
		    this._elements = {};
		    this._translate_ids = {};
		    this.getTopParentView = this._get_self = webix.bind(function(){ return this;}, this);

		    this._run_inner_init_logic();
		    this.$ready.push(this._run_after_inner_init_logic);
	    },
	    $$:function(id){
		    return this._elements[id];
	    },
	    innerId:function(id){
		    return this._translate_ids[id];
	    },
	    _run_inner_init_logic:function(callback){
		    this._prev_global_col = webix._global_collection;
		    webix._global_collection = this;
	    },
	    _run_after_inner_init_logic:function(temp){
		    for (var name in this._elements){
			    var input = this._elements[name];
			    if (this.callEvent && input.mapEvent && !input._evs_map.onitemclick)
				    input.mapEvent({
					    onitemclick:this
				    });
			    input.getTopParentView = this._get_self;
		    }

		    webix._global_collection = this._prev_global_col;
		    this._prev_global_col = 0;
	    },
	    _destroy_child:function(id){
		    delete this._elements[id];
	    },
	    ui:function(){
		    this._run_inner_init_logic();
		    var temp = webix.ui.apply(webix, arguments);
		    this._run_after_inner_init_logic();
		    return temp;
	    }
    };


    (function(){

        var resize = [];
        var ui = webix.ui;

        if (!webix.ui){
	        ui = webix.ui = function(config, parent, id){
		        webix._ui_creation = true;
		        var multiset = webix.isArray(config);
		        var node = webix.toNode((config.container||parent)||document.body);

		        // solve problem with non-unique ids
		        if(node._settings)
			        id = _correctId(node, multiset, id);

		        var top_node;
		        var body_child = (node == document.body);
		        if (config._settings || (node && multiset)){
			        top_node = config;
		        } else {
			        if (node && body_child)
				        config.$topView = true;
			        if (!config._inner)
				        config._inner = {};

			        top_node = ui._view(config);
		        }

		        if (body_child && !top_node.setPosition && !top_node.$apiOnly)
			        webix.ui._fixHeight();

		        if (top_node._settings && top_node._settings._hidden && !node.$view){
			        top_node._settings._container = node;
		        } else if (!top_node.$apiOnly){
			        if (node.appendChild)
				        _appendDom(node, top_node, config);
			        else if (node.destructor){
				        var target = node;

				        //addView or view moving with target id
				        if (!id && id!==0 && !webix.isArray(top_node)){
					        id = node;
					        node = node.getParentView();
				        }

				        //if target supports view adding
				        if (node && node._replace){
					        //if source supports view removing
					        if (top_node.getParentView && top_node.getParentView())
						        top_node.getParentView()._remove(top_node);

					        node._replace(top_node, id);
				        } else {
					        var parent = target.$view.parentNode;
					        target.destructor();
					        _appendDom(parent, top_node, config);
				        }
			        } else
				        webix.assert_error("Not existing parent:"+config.container);
		        }
		        
		        webix._ui_creation = false;
		        return top_node;
	        };

	        var _appendDom = function(node, top_node, config){
		        node.appendChild(top_node._viewobj);
		        //resize window with position center or top
		        //do not resize other windows and elements
		        // which are attached to custom html containers
		        if (((!top_node.setPosition || top_node._settings.fullscreen) && node == document.body) || top_node._settings.position )
			        resize.push(top_node._destructor_handler);
		        if (!config.skipResize)
			        top_node.adjust();
	        };

	        var _correctId = function(target, multiset, id){
		        //replace view
		        var views = [target];
		        //replace content of layout
		        if (multiset)
			        views = target.getChildViews();
		        //replace content of window
		        else if (target._body_cell)
			        views = [target._body_cell];
		        //add cell in layout by number
		        else if (typeof id == "number"){
			        return id;
		            //replace cell in layout by id
		        } else if (id){
			        views = [webix.$$(id)];
			        _deleteIds(views);
			        return views[0].config.id;
		        }

		        _deleteIds(views);
		        return id;
	        };

	        var _deleteIds = function(views){
		        for (var i = views.length - 1; i >= 0; i--){
			        //remove original id
			        delete webix.ui.views[views[i].config.id];
			        //create temp id
			        views[i].config.id = "x"+webix.uid();
			        webix.ui.views[views[i].config.id] = views[i];
			        //process childs
			        _deleteIds(views[i].getChildViews());
		        }
	        };
        }

        webix.ui.animate = function(ui, parent, config){
	        var pobj = webix.$$(parent);
	        if (pobj){
		        var aniset = config || { type:"slide", direction:"left" };
		        var d = pobj._viewobj.cloneNode(true);
		        var view = webix.ui(ui, parent);

		        view._viewobj.parentNode.appendChild(d);
		        var line = webix.animate.formLine(
			        view._viewobj,
			        d,
			        aniset
		        );

		        aniset.callback = function(){
			        webix.animate.breakLine(line);
		        };
		        webix.animate(line, aniset);

		        return view;
	        }
        };

        webix.ui.animateView = function(view, stateHandler, config){
	        view = webix.$$(view);
	        if (view){
		        config = config || { type:"slide", direction:"left" };

		        var getHTML = function(view){
			        var el = view._viewobj;
			        var css = el.className;
			        var content =el.innerHTML;
			        return "<div class='"+css+"' style='width:"+el.offsetWidth+"px;height:"+el.offsetHeight+"px;'>"+content+"</div>";
		        };

		        // get 'display' state of child nodes
		        var display = [];
		        for(var i =0; i< view._viewobj.childNodes.length;i++){
			        var node = view._viewobj.childNodes[i];
			        var value = node.currentStyle ?node.currentStyle.display : getComputedStyle(node, null).display;
			        display.push(value||"");
		        }
		        // get current html content
		        var currentState = getHTML(view);

		        // apply new state
		        if(typeof stateHandler == "function"){
			        stateHandler.call(this);
		        }

		        // get new html content
		        var newState = getHTML(view);

		        // insert elements into the view
		        var tempParent = view._viewobj.insertBefore(webix.html.create("DIV",{
			        "class" : "webix_view_animate",
			        "style" : "width:"+view._viewobj.offsetWidth+"px;height:"+view._viewobj.offsetHeight+"px;"
		        }, newState+currentState),view._viewobj.firstChild);

		        // hide child nodes
		        for(var i =1; i< view._viewobj.childNodes.length;i++){
			        view._viewobj.childNodes[i].style.display = "none";
		        }

		        // animate inserted elements
		        var line = webix.animate.formLine(
			        tempParent.childNodes[0],
			        tempParent.childNodes[1],
			        config
		        );
		        config.callback = function(){
			        if(tempParent){
				        view._viewobj.removeChild(tempParent);
				        tempParent = null;
				        // restore 'display' state of child nodes
				        for(var i =0; i< view._viewobj.childNodes.length;i++){
					        view._viewobj.childNodes[i].style.display = display[i];
				        }
			        }
		        };
		        webix.animate(line, config);

		        return view;
	        }
        };

        /*called in baseview $init for calculate scrollSize*/
        webix.ui._detectScrollSize = function(){
	        var div = webix.html.create("div");
	        div.className = "webix_skin_mark";
	        div.style.cssText="position:absolute;left:-1000px;width:100px;padding:0px;margin:0px;min-height:100px;overflow-y:scroll;";

	        document.body.appendChild(div);
	        var width = div.offsetWidth-div.clientWidth;
	        var skin = { 110:"air", 120:"aircompact", 130:"clouds", 140:"web", 150:"terrace", 160:"metro", 170:"light", 180:"glamour", 190:"touch", 200:"flat" , 210:"compact", 220:"material", 230: "contrast" }[Math.floor(div.offsetHeight/10)*10];
	        document.body.removeChild(div);

	        if (skin){
		        var skinobj = webix.skin[skin];
		        if (skinobj && skinobj != webix.skin.$active)
			        webix.skin.set(skin);
	        }

	        if (webix.env.$customScroll) return 0;
	        return width;
        };
        webix.ui.scrollSize = ((webix.env.touch||webix.env.$customScroll)?0:17);
        webix.ready(function(){
	        var size = webix.ui._detectScrollSize();
	        webix.ui.scrollSize = webix.env.touch ? 0 : size;
        });

        webix.ui._uid = function(name){
	        return "$"+name+(this._namecount[name] = (this._namecount[name]||0)+1);
        };
        webix.ui._namecount = {};

        webix.ui._fixHeight = function (){
	        webix.html.addStyle("html, body{ height:100%; }");
	        document.body.className+=" webix_full_screen";
	        webix.ui._fixHeight = function(){};
	        webix.Touch.limit(false);
        };
        webix.ui.resize = function(){
	        webix.UIManager.applyChanges();
	        webix.callEvent("onClick",[]);
	        if (!webix.ui.$freeze)
		        for (var i=resize.length - 1; i>=0; i--){
			        if (resize[i].obj)
				        resize[i].obj.adjust();
		        }
        };
        webix.ui.each = function(parent, logic, master, include){
	        if (parent){
		        var children = include ? [parent] : parent.getChildViews();
		        for (var i = 0; i < children.length; i++){
			        if (logic.call((master || webix), children[i]) !== false)
				        webix.ui.each(children[i], logic, master);
		        }
	        }
        };
        webix.event(window, "resize", function() {
	        // check for virtual keyboard
	        if(webix.env.touch && ( webix.edit_open_time && (new Date())-webix.edit_open_time < 750 || webix._focus_time && (new Date())-webix._focus_time < 750)){
		        //workaround for android chrome bug with scrolling to the focused input if overflow:hidden on container
		        if(webix.env.isWebKit && document.activeElement){
			        var wactiv = webix.$$(document.activeElement);
			        if (wactiv && wactiv.getInputNode && document.activeElement.scrollIntoView)
				        document.activeElement.scrollIntoView();
		        }
		        return;
	        } else {
		        webix.ui.resize();
	        }
        });

        ui._delays = {};
        ui.delay = function(config){
	        webix.ui._delays[config.id] = config;
        };
        ui.hasMethod = function(view, method){
	        var obj = webix.ui[view];
	        if (!obj) return false;

	        if (obj.$protoWait)
		        obj = obj.call(webix);

	        return !!webix.ui[view].prototype[method];
        };
        webix.ui.zIndex = function(){
	        return webix.ui.zIndexBase++;
        };
        webix.ui.zIndexBase = 100;

        ui._view = function(config){
	        webix.assert_config(config);
	        if (config.view){
		        var view = config.view;
		        webix.assert(ui[view], "unknown view:"+view);
		        return new ui[view](config);
	        } else if (config.rows || config.cols){
		        var cells = config.rows||config.cols;
		        var accordion = false;
		        for (var i=0; i<cells.length; i++){
			        if (cells[i].body && !cells[i].view && !cells[i].align)
				        accordion = true;
		        }
		        if (accordion){
			        return new ui.headerlayout(config);
		        } else
			        return new ui.layout(config);
	        }
	        else if (config.cells)
		        return new ui.multiview(config);
	        else if (config.template || config.content)
		        return new ui.template(config);	
	        else if (config.align && config.body){
		        return new ui.align(config);
	        } else return new ui.spacer(config);
        };

        ui.views = {};
        webix.$$ = function(id){
	        if (!id) return null;
	        
	        if (ui.views[id]) return ui.views[id];
	        if (ui._delays[id]) return webix.ui(ui._delays[id]);
	        
	        var name = id;
	        if (typeof id == "object"){
		        if (id._settings)
			        return id;
		        name = (id.target||id.srcElement)||id;
	        }
	        return ui.views[webix.html.locate({ target:webix.toNode(name)},"view_id")];
        };
        if (webix.isUndefined(window.$$)) window.$$=webix.$$;

        webix.UIExtension = window.webix_view||{};

        webix.protoUI({
	        name:"baseview",
	        //attribute , which will be used for ID storing
	        $init:function(config){
		        if (!config.id) 
			        config.id = webix.ui._uid(this.name);
		        
		        this._parent_cell = webix._parent_cell;
		        webix._parent_cell = null;

		        this.$scope = config.$scope || (this._parent_cell ? this._parent_cell.$scope : null);
		        
		        if (!this._viewobj){
			        this._contentobj = this._viewobj = webix.html.create("DIV",{
				        "class":"webix_view"
			        });
			        this.$view = this._viewobj;
		        }
	        },
	        $skin:false,
	        defaults:{
		        width:0,
		        height:0,
		        gravity:1
	        },
	        getNode:function(){
		        return this._viewobj;
	        },
	        getParentView:function(){
		        return this._parent_cell||null;	
	        },
	        getTopParentView:function(){
		        var parent = this.getParentView();
		        return parent ? parent.getTopParentView() :  this;
	        },
	        getFormView:function(){
		        var parent = this.getParentView();
		        return (!parent || parent.setValues) ? parent : parent.getFormView();
	        },
	        getChildViews:function(){ return []; },
	        isVisible:function(base_id, prev_id){
		        if (this._settings.hidden){
                    if(base_id){
                        if (!this._hidden_render) {
                            this._hidden_render = [];
                            this._hidden_hash = {};
                        }
                        if (!this._hidden_hash[base_id]){
                            this._hidden_hash[base_id] =  true;
                            this._hidden_render.push(base_id);
                        }
                    }
			        return false;
		        }
		        
		        var parent = this.getParentView();
		        if (parent) return parent.isVisible(base_id, this._settings.id);
		        
		        return true;
	        },
	        isEnabled:function(){
		        if(this._disable_cover)
			        return false;

		        var parent= this.getParentView();
		        if(parent)
			        return parent.isEnabled();

		        return true;
	        },
	        disable:function(){
		        webix.html.remove(this._disable_cover);
		        this._settings.disabled = true;

		        this._disable_cover = webix.html.create('div',{
			        "class":"webix_disabled"
		        });

		        if(window.getComputedStyle)
			        this._disabled_view_pos = window.getComputedStyle(this._viewobj, null).getPropertyValue("position");
		        
		        if (this._disabled_view_pos != "absolute")
			        this._viewobj.style.position = "relative";
		        this._viewobj.appendChild(this._disable_cover);
		        this._viewobj.setAttribute("aria-disabled", "true");
		        webix.html.addCss(this._viewobj,"webix_disabled_view",true);
		        webix.UIManager._moveChildFocus(this);
	        },
	        enable:function(){
		        this._settings.disabled = false;

		        if (this._disable_cover){
			        webix.html.remove(this._disable_cover);
			        webix.html.removeCss(this._viewobj,"webix_disabled_view");
			        this._viewobj.removeAttribute("aria-disabled");
			        this._disable_cover = null;
			        if(this._disabled_view_pos)
				        this._viewobj.style.position = this._disabled_view_pos;
		        }
	        },
	        disabled_setter:function(value){
		        if (value)
			        this.disable();
		        else
			        this.enable();
		        return value;
	        },
	        container_setter:function(value){
		        webix.assert(webix.toNode(value),"Invalid container");
		        return true;
	        },
	        css_setter:function(value){
		        if (typeof value == "object")
			        value = webix.html.createCss(value);

		        this._viewobj.className += " "+value;
		        return value;
	        },
	        id_setter:function(value){
		        if (webix._global_collection && (webix._global_collection != this || this._prev_global_col)){
			        var oldvalue = this.config.$id = value;
			        (this._prev_global_col || webix._global_collection)._elements[value] = this;
			        value = webix.ui._uid(this.name);
			        (this._prev_global_col || webix._global_collection)._translate_ids[value]=oldvalue;
		        }
		        webix.assert(!webix.ui.views[value], "Non unique view id: "+value);
		        webix.ui.views[value] = this;
		        this._viewobj.setAttribute("view_id", value);
		        return value;
	        },
	        $setSize:function(x,y){
		        var last = this._last_size;
		        if (last && last[0]==x && last[1]==y) {
			        webix.debug_size_box(this, [x,y,"not changed"]);
			        return false;
		        }

		        webix.debug_size_box(this, [x,y]);
		        
		        this._last_size = [x,y];
		        this.$width  = this._content_width = x-(this._scroll_y?webix.ui.scrollSize:0);
		        this.$height = this._content_height = y-(this._scroll_x?webix.ui.scrollSize:0);

		        var config = this._settings;
		        if (!config.flex){
			        this._viewobj.style.width = x+"px";
			        this._viewobj.style.height = y+"px";
		        }

		        return true;
	        },
	        $getSize:function(dx, dy){
		        var s = this._settings;

		        var size = [
			        (s.width || s.minWidth || 0)*1,
			        (s.width || s.maxWidth || 100000)*1,
			        (s.height || s.minHeight || 0)*1,
			        (s.height || s.maxHeight || 100000)*1,
			        s.gravity
		        ];

		        if (webix.assert){
			        var check = (isNaN(size[0]) || isNaN(size[1]) || isNaN(size[2]) || isNaN(size[3]));
			        if (check){
				        webix.assert(false, "Size is not a number "+this._settings.id);
				        s.width = s.height = s.maxWidth = s.maxHeight = s.minWidth = s.minHeight = 0;
				        size = [0,0,100000,100000,1];
			        }
		        }

		        size[0]+=dx; size[1]+=dx;
		        size[2]+=dy; size[3]+=dy;
		        return size;
	        },
	        show:function(force, animate_settings){
		        var parent = this.getParentView();
                var show = !arguments[2];
		        if (parent) {
			        if(!animate_settings && animate_settings !== false && this._settings.animate)
				        if (parent._settings.animate)
					        animate_settings = webix.extend((parent._settings.animate?webix.extend({},parent._settings.animate):{}), this._settings.animate, true);

			        if (show?parent._show:parent._hide)
				        (show?parent._show:parent._hide).call(parent, this, animate_settings);
			        if (show)
				        this._render_hidden_views();

			        //force show of parent view
			        //stop further processing is view is a part of isolated scope
			        if (force && show)  
				        parent.show(parent.$$?false:force);
		        }
                else{
                    if (this._settings.hidden){
            	        if (show){
            		        var node = webix.toNode(this._settings._container||document.body);
        			        node.appendChild(this._viewobj);
        			        this._settings.hidden = false;

        			        this.adjust();
        			        this._render_hidden_views();
            	        }
                    } else {
            	        if (!show){
            		        this._settings.hidden = this._settings._hidden = true;
            		        if (this._viewobj){
            			        this._settings._container = this._viewobj.parentNode;
        				        webix.html.remove(this._viewobj);
        			        }
            	        }
                    }
                }
	        },
	        _render_hidden_views:function(){
		        if (this._hidden_render){
			        for (var i=0; i < this._hidden_render.length; i++){
				        var ui_to_render = webix.$$(this._hidden_render[i]);
				        if (ui_to_render)
					        ui_to_render.render();
			        }
			        this._hidden_render = [];
			        this._hidden_hash = {};
		        }
	        },
	        _onKeyPress:function(code, e){
		        var target = e.srcElement || e.target, role = target.getAttribute("role");

		        if((code === 13 || code === 32) && role == "button" && !this._settings.disabled){
			        webix.html.triggerEvent(target, "MouseEvents", "click");
			        webix.html.preventEvent(e);
		        }
	        },
	        hidden_setter:function(value){
		        if (value) this.hide();
		        return this._settings.hidden;
	        },
	        hide:function(){
		        this.show(null, null, true);
		        webix.UIManager._moveChildFocus(this);
	        },
	        adjust:function(){
		        if(!this._viewobj.parentNode)
			        return false;

		        var x = this._viewobj.parentNode.clientWidth||0;
		        var y = this._viewobj.parentNode.clientHeight||0;

		        var sizes=this.$getSize(0,0);
		        var fullscreen = (this._viewobj.parentNode == document.body) && !this.setPosition;

		        //minWidth
		        if (sizes[0]>x) x = sizes[0];
		        //minHeight
		        if (sizes[2]>y) y = sizes[2];

		        //maxWidth rule
		        if ((!fullscreen || this._settings.width)  && x>sizes[1]) x = sizes[1];
		        //maxHeight rule
		        if ((!fullscreen || this._settings.height) && y>sizes[3]) y = sizes[3];

		        this.$setSize(x,y);
		        if (webix._responsive_exception){
			        webix._responsive_exception = false;
			        this.adjust();
		        }
	        },
	        resize:function(force){
		        if (webix._child_sizing_active || webix.ui.$freeze || webix._responsive_tinkery ) return;

		        var parent = this.getParentView();
		        if (parent){
			        if (parent.resizeChildren)
				        parent.resizeChildren();
			        else
				        parent.resize();
		        } else {
			        this.adjust();
			        webix.callEvent("onResize",[]);
		        }
	        }
        }, webix.Settings, webix.Destruction, webix.BaseBind, webix.UIExtension);



        /*
	      don't render borders itself , but aware of layout , which can set some borders
        */
        webix.protoUI({
	        name:"view",
	        $init:function(config){
		        this._set_inner(config);
	        },

	        //deside, will component use borders or not
	        _set_inner:function(config){
		        var border_not_set = webix.isUndefined(config.borderless);
		        if (border_not_set && !this.setPosition && config.$topView){
			        config.borderless = true;
			        border_not_set = false;
		        }

		        if ((border_not_set && this.defaults.borderless) || config.borderless){
			        //button and custom borderless
			        config._inner = { top:true, left:true, bottom:true, right:true };
		        } else {
			        //default borders
			        if (!config._inner)
				        config._inner = {};
			        this._contentobj.style.borderWidth="1px";
		        }
	        },

	        $getSize:function(dx, dy){

		        var _borders = this._settings._inner;
		        if (_borders){
			        dx += (_borders.left?0:1)+(_borders.right?0:1);
			        dy += (_borders.top?0:1)+(_borders.bottom?0:1);
		        }
		        
		        var size = webix.ui.baseview.prototype.$getSize.call(this, dx, dy);
		        
		        webix.debug_size_box(this, size, true);
		        return size;
	        },
	        $setSize:function(x,y){
		        webix.debug_size_box(this, [x,y]);
			    
		        var _borders = this._settings._inner;
		        if (_borders){
			        x -= (_borders.left?0:1)+(_borders.right?0:1);
			        y -= (_borders.top?0:1)+(_borders.bottom?0:1);
		        }
			    
		        return webix.ui.baseview.prototype.$setSize.call(this,x,y);
	        }
        }, webix.ui.baseview);

    })();

    webix.ui.view.call(webix);

    webix.debug_size_indent = 0;
    webix.debug_size_step = function(){
	    var str = "";
	    for (var i=0; i<webix.debug_size_indent; i++)
		    str+="|  ";
	    return str;
    };
    webix.debug_size_box_start = function(comp, get){
	    if (!webix.debug_size) return;
	    if (!webix.debug_size_indent)
		    webix.log(get?"--- get sizes ---":"--- set sizes ---");
	    webix.log(webix.debug_size_step()+comp.name+"@"+comp.config.id);
	    webix.debug_size_indent++;
    };
    webix.debug_size_box_end = function(comp, sizes){
	    if (!webix.debug_size) return;
	    webix.debug_size_indent--;
	    webix.log(webix.debug_size_step()+sizes.join(","));
    };

    webix.debug_size_box = function(comp, sizes, get){
	    if (!webix.debug_size) return;
	    if (!webix.debug_size_indent)
		    webix.log(get?"--- get sizes ---":"--- set sizes ---");
	    webix.log(webix.debug_size_step()+comp.name+"@"+comp.config.id+" "+sizes.join(","));
    };



    webix.FlexLayout = {
	    $init:function(){
		    this.$view.className += " webix_flexlayout";
	    },
	    _fix_vertical_layout:function(){

	    },
	    _beforeResetBorders:function(){

	    },
	    _afterResetBorders:function(){

	    },
	    $getSize:function(dx, dy){
		    webix.debug_size_box_start(this, true);
		    
		    var w=0, h=0, g = this._settings.gravity;
		    this._sizes = [];

		    for (var i=0; i<this._cells.length; i++){
			    var size = this._cells[i].$getSize(0,0);
			    this._sizes.push(size);

			    w = Math.max(w, size[0]);
			    h = Math.max(h, size[2]);
		    }

		    w += (this._paddingX||0)*2;
		    h += (this._paddingY||0)*2;

		    if (this._settings.width)
			    w = Math.max(w, this._settings.width);
		    if (this._settings.height)
			    h = Math.max(h, this._settings.height);

		    var self_size = [w, 100000, h, 100000, g];
		    webix.debug_size_box_end(this, self_size);
		    return self_size;
	    },
	    _set_child_size:function(x,y){
		    var st = this.$view.style;
		    var margin = Math.round(this._margin/2);
		    st.paddingTop = st.paddingBottom = this._paddingY-margin + "px";
		    st.paddingLeft = st.paddingRight = this._paddingX-margin + "px";

		    for (var i=0; i<this._cells.length; i++){
			    if (this._cells[i]._settings.hidden) continue;
			    var view = this._cells[i].$view;
			    var size = this._sizes[i];
			    var config = this._cells[i]._settings;

			    if (view){
				    view.style.minWidth = size[0]+"px";
				    if (size[1] < 100000 && size[1] != size[0])
					    view.style.maxWidth = size[1]+"px";

				    view.style.flexBasis = config.flexBasis || (size[0])+"px";
				    view.style.flexGrow = config.flexGrow || ((size[1] != size[0]) ? size[4] : 0);
				    view.style.height = (size[3] != size[2]) ? "auto" : (size[2] + "px");

				    view.style.minHeight = size[2]+"px";
				    if (size[3] < 100000 && size[3] != size[2])
					    view.style.maxHeight = size[3]+"px";

				    view.style.margin = margin + "px";
			    }
		    }

		    var whs = [];
		    for (var i=0; i<this._cells.length; i++){
			    if (this._cells[i]._settings.hidden) continue;
			    var view = this._cells[i].$view;
			    whs[i] = [view.offsetWidth, view.offsetHeight];
		    }
		    
		    for (var i=0; i<this._cells.length; i++){
			    if (this._cells[i]._settings.hidden) continue;
			    var cell = this._cells[i];
			    var view = cell.$view;
			    if (view){
				    cell._settings.flex = true;
				    var size = this._sizes[i];
				    var h = size[2] == size[3] ? size[2] : whs[i][1];
				    cell.$setSize(whs[i][0], h);
				    cell._settings.flex = false;
			    }
		    }

		    this.$height = this._content_height = this.$view.scrollHeight;
		    this.$view.style.height = this._content_height+"px";
	    }
    };






    // webix.animate = function(html_element, config){
	//     var animation = config;
	//     if (webix.isArray(html_element)){
	// 	    for (var i=0; i < html_element.length; i++) {
	// 		    if(webix.isArray(config))
	// 			    animation = config[i];

	// 		    if(animation.type == 'slide'){
	// 			    if(animation.subtype == 'out' && i===0) { // next
	// 			        continue;
	// 			    }
	// 			    if(animation.subtype == 'in' && i==1) { // current
	// 			        continue;
	// 			    }
	// 		    }
	// 		    if(animation.type == 'flip'){
	// 			    var animation_copy = webix.clone(animation);
	// 			    if(i===0) { // next
	// 			        animation_copy.type = 'flipback';
	// 			    }
	// 			    if(i==1) { // current
	// 			        animation_copy.callback = null;
	// 			    }
	// 			    webix.animate(html_element[i], animation_copy);
	// 			    continue;
	// 		    }
	// 		    webix.animate(html_element[i], animation);
	// 	    }
	// 	    return;
	//     }
	//     var node = webix.toNode(html_element);
	//     if (node._has_animation)
	// 	    webix.animate.end(node, animation);
	//     else
	// 	    webix.animate.start(node, animation);
    // };
    // webix.animate.end = function(node, animation){
	//     //stop animation
	//     node.style[webix.env.transitionDuration] = "1ms";
	//     node._has_animation = null;
	//     //clear animation wait order, if any
	//     if (webix._wait_animate)
	// 	    window.clearTimeout(webix._wait_animate);

	//     //plan next animation, if any
	//     webix._wait_animate = webix.delay(webix.animate, webix, [node,animation],10);
    // };
    // webix.animate.isSupported=function(){
	//     return !webix.$testmode && !webix.noanimate && webix.env.transform && webix.env.transition && !webix.env.isOpera;
    // };
    // webix.animate.formLine=function(next, current, animation){
    //     var direction = animation.direction;

    //     //sometimes user can initiate animation multiple times ( fast clicking )
    //     //as result animation may be called against already removed from the dom node
    //     if(current.parentNode)
    //         current.parentNode.style.position = "relative";
        
    //     current.style.position = "absolute";
	//     next.style.position = "absolute";

	//     //this is initial shift of second view in animation
	//     //normally we need to have this value as 0
	//     //but FF has bug with animation initially invisible elements
	//     //so we are adjusting this value, to make 1px of second view visible
	//     var defAniPos = webix.env.isFF ? ( direction == "top" || direction == "left" ? -1 : 1) : 0;

	//     if(direction=="top"||direction=="bottom"){
	// 	    next.style.left="0px";
	// 	    next.style.top = (animation.top || defAniPos) + (direction=="top"?1:-1)*current.offsetHeight+"px";
	//     }
	//     else{
	// 	    next.style.top = (animation.top || 0) + "px";
	// 	    next.style.left = defAniPos + (direction=="left"?1:-1)*current.offsetWidth+"px";
	//     }

	//     // apply 'keepViews' mode, iframe, datatable with x scroll solution
	//     //( keepViews won't work in case of "in" and "out" subtypes )
	//     if(current.parentNode == next.parentNode && animation.keepViews)
	// 	    next.style.display = "";
	//     else
	// 	    webix.html.insertBefore(next, current.nextSibling, current.parentNode);

	//     if(animation.type == 'slide' && animation.subtype == 'out') {
	// 	    next.style.left = "0px";
	// 	    next.style.top = (animation.top || 0)+"px";
	// 	    current.parentNode.removeChild(current);
	// 	    webix.html.insertBefore(current, next.nextSibling, next.parentNode);
	//     }
	//     return [next, current];
    // };
    // webix.animate.breakLine=function(line){
	//     if(arguments[1])
	// 	    line[1].style.display = "none"; // 'keepViews' multiview mode
	//     else
	// 	    webix.html.remove(line[1]); // 1 = current
	//     webix.animate.clear(line[0]);
	//     webix.animate.clear(line[1]);
	//     line[0].style.position="";
    // };
    // webix.animate.clear=function(node){
	//     node.style[webix.env.transform] = "none";
	//     node.style[webix.env.transition] = "none";
	//     node.style.top = node.style.left = "";
    // };
    // webix.animate.defaults = {
	// 	type: 'slide',
	// 	delay: '0',
	// 	duration: '500',
	// 	timing: 'ease-in-out',
	// 	x: 0,
	// 	y: 0
    // };
    // webix.animate.start = function(node, animation){
	//     //getting config object by merging specified and default options
 	//     if (typeof animation == 'string')
	// 	    animation = {type: animation};

    //     animation = webix.Settings._mergeSettings(animation,webix.animate.defaults);

	//     var prefix = webix.env.cssPrefix;
    //     var settings = node._has_animation = animation;
    //     var skew_options, scale_type;

    //     //jshint -W086:true
	//     switch(settings.type == 'slide' && settings.direction) { // getting new x, y in case it is slide with direction
	// 	case 'right':
	// 		settings.x = node.offsetWidth;
	// 		break;
	// 	case 'left':
	// 		settings.x = -node.offsetWidth;
	// 		break;
	// 	case 'top':
	// 		settings.y = -node.offsetHeight;
	// 		break;
	// 	case 'bottom':
	// 	default:
	// 		settings.y = settings.y||node.offsetHeight;
	// 		break;
	//     }

    //     if(settings.type == 'flip' || settings.type == 'flipback') {
    // 		skew_options = [0, 0];
    //         scale_type = 'scaleX';
    //         if(settings.subtype == 'vertical') {
    //             skew_options[0] = 20;
    //             scale_type = 'scaleY';
    //         }
    //         else
    //             skew_options[1] = 20;
    //         if(settings.direction == 'right' || settings.direction == 'bottom') {
    //             skew_options[0] *= -1; skew_options[1] *= -1;
    //         }
    //     }

	//     var duration = settings.duration + "ms " + settings.timing + " " + settings.delay+"ms";
	//     var css_general = prefix+"TransformStyle: preserve-3d;"; // general css rules
	//     var css_transition = '';
	//     var css_transform = '';

	//     switch(settings.type) {
	// 	case 'fade': // changes opacity to 0
	// 		css_transition = "opacity " + duration;
	// 		css_general = "opacity: 0;";
	// 		break;
	// 	case 'show': // changes opacity to 1
	// 		css_transition = "opacity " + duration;
	// 		css_general = "opacity: 1;";
	// 		break;
    //     case 'flip':
    //         duration = (settings.duration/2) + "ms " + settings.timing + " " + settings.delay+"ms";
    //         css_transform = "skew("+skew_options[0]+"deg, "+skew_options[1]+"deg) "+scale_type+"(0.00001)";
    //         css_transition = "all "+(duration);
    //         break;
    //     case 'flipback':
    //         settings.delay += settings.duration/2;
    //         duration = (settings.duration/2) + "ms " + settings.timing + " " + settings.delay+"ms";
    //         node.style[webix.env.transform] = "skew("+(-1*skew_options[0])+"deg, "+(-1*skew_options[1])+"deg) "+scale_type+"(0.00001)";
    //         node.style.left = "0";

    //         css_transform = "skew(0deg, 0deg) "+scale_type+"(1)";
    //         css_transition = "all "+(duration);
    //         break;
	// 	case 'slide': // moves object to specified location
	// 		var x = settings.x +"px";
	// 		var y = settings.y +"px";
    //         // translate(x, y) OR translate3d(x, y, 0)
	// 		css_transform = webix.env.translate+"("+x+", "+y+((webix.env.translate=="translate3d")?", 0":"")+")";
	// 		css_transition = prefix+"transform " + duration;
	// 		break;
	// 	default:
	// 		break;
	//     }

	//     //set styles only after applying transition settings
    //     webix.delay(function(){
    //         node.style[webix.env.transition] = css_transition;
    //         webix.delay(function(){
    //             if (css_general)
    //                 node.style.cssText += css_general;
    //             if (css_transform)
    //                 node.style[webix.env.transform] = css_transform;
    //             var transitionEnded = false;
    //             var tid = webix.event(node, webix.env.transitionEnd, function(ev){
    //                 node._has_animation = null;
    //                 if (settings.callback) settings.callback.call((settings.master||window), node,settings,ev);
    //                 transitionEnded = true;
    //                 webix.eventRemove(tid);
    //             });
    //             window.setTimeout(function(){
    //                 if(!transitionEnded){
    //                     node._has_animation = null;
    //                     if (settings.callback) settings.callback.call((settings.master||window), node,settings);
    //                     transitionEnded = true;
    //                     webix.eventRemove(tid);
    //                 }
    //             }, (settings.duration*1+settings.delay*1)*1.3);
    //         });
    //     });
    // };

    /*
	  Behavior:MouseEvents - provides inner evnets for  mouse actions
    */

    // webix.MouseEvents={
	//     $init: function(config){
	// 	    config = config || {};

	// 	    this._clickstamp = 0;
	// 	    this._dbl_sensetive = 300;
	// 	    this._item_clicked = null;

	// 	    this._mouse_action_extend(config.onClick, "on_click");
	// 	    this._mouse_action_extend(config.onContext, "on_context");
	// 	    this._mouse_action_extend(config.onDblClick, "on_dblclick");
	// 	    this._mouse_action_extend(config.onMouseMove, "on_mouse_move");

	// 	    //attach dom events if related collection is defined
	// 	    if (this.on_click){
	// 		    webix._event(this._contentobj,"click",this._onClick,{bind:this});
	// 		    if (webix.env.isIE8 && this.on_dblclick)
	// 			    webix._event(this._contentobj, "dblclick", this._onDblClick, {bind:this});
	// 	    }
	// 	    if (this.on_context)
	// 		    webix._event(this._contentobj,"contextmenu",this._onContext,{bind:this});

	// 	    if (this.on_mouse_move)
	// 		    this._enable_mouse_move();
	//     },

	//     _enable_mouse_move:function(){
	// 	    if (!this._mouse_move_enabled){
	// 		    this.on_mouse_move = this.on_mouse_move || {};
	// 		    webix._event(this._contentobj,"mousemove",this._onMouse,{bind:this});
	// 		    webix._event(this._contentobj,(webix.env.isIE?"mouseleave":"mouseout"),this._onMouse,{bind:this});
	// 		    this._mouse_move_enabled = 1;
	// 		    this.attachEvent("onDestruct", function(){
	// 			    if (this._mouse_move_timer)
	// 				    window.clearTimeout(this._mouse_move_timer);
	// 		    });
	// 	    }

	//     },

	//     _mouse_action_extend:function(config, key){
	// 	    if (config){
	// 		    var now = this[key];
	// 		    var step = now ? webix.extend({}, now) : {};
	// 		    this[key] = webix.extend(step, config);
	// 	    }
	//     },

	//     //inner onclick object handler
	//     _onClick: function(e){
	// 	    if(!this.isEnabled())
	// 		    return false;

	// 	    webix.UIManager._focus_action(this);
	// 	    if(this.on_dblclick){
	// 		    // emulates double click
	// 		    var stamp = (new Date()).valueOf();

	// 		    if (stamp - this._clickstamp <= this._dbl_sensetive && this.locate){
	// 			    var item = this.locate(e);
	// 			    if (""+item == ""+this._item_clicked) {
	// 				    this._clickstamp = 0;
	// 				    return this._onDblClick(e);
	// 			    }
	// 		    }
	// 		    this._clickstamp = stamp;
	// 	    }

	// 	    var result = this._mouseEvent(e,this.on_click,"ItemClick");
	// 	    return result;
	//     },
	//     //inner ondblclick object handler
	//     _onDblClick: function(e) {
	// 	    return this._mouseEvent(e,this.on_dblclick,"ItemDblClick");
	//     },
	//     //process oncontextmenu events
	//     _onContext: function(e) {
	// 	    this._mouseEvent(e, this.on_context, "BeforeContextMenu", "AfterContextMenu");
	//     },
	//     /*
	// 	  event throttler - ignore events which occurs too fast
	// 	  during mouse moving there are a lot of event firing - we need no so much
	// 	  also, mouseout can fire when moving inside the same html container - we need to ignore such fake calls
	//     */
	//     _onMouse:function(e){
	// 	    if (this.$destructed) return;
	// 	    if (document.createEventObject)	//make a copy of event, will be used in timed call
	// 		    e = document.createEventObject(event);
	// 	    else if (!webix.$testmode && !webix.isUndefined(e.movementY) && !e.movementY && !e.movementX)
	// 		    return; //logitech mouse driver can send false signals in Chrome
			
			
			
			
	// 	    if (this._mouse_move_timer)	//clear old event timer
	// 		    window.clearTimeout(this._mouse_move_timer);
			
	// 	    //this event just inform about moving operation, we don't care about details
	// 	    this.callEvent("onMouseMoving",[e]);
	// 	    //set new event timer
	// 	    this._mouse_move_timer = window.setTimeout(webix.bind(function(){
	// 		    //called only when we have at least 100ms after previous event
	// 		    if (e.type == "mousemove")
	// 			    this._onMouseMove(e);
	// 		    else
	// 			    this._onMouseOut(e);
	// 	    },this),(this._settings.mouseEventDelay||500));
	//     },

	//     //inner mousemove object handler
	//     _onMouseMove: function(e) {
	// 	    if (!this._mouseEvent(e,this.on_mouse_move,"MouseMove"))
	// 		    this.callEvent("onMouseOut",[e||event]);
	//     },
	//     //inner mouseout object handler
	//     _onMouseOut: function(e) {
	// 	    this.callEvent("onMouseOut",[e||event]);
	//     },
	//     //common logic for click and dbl-click processing
	//     _mouseEvent:function(e,hash,name, pair){
	// 	    e=e||event;

	// 	    if (e.processed || !this._viewobj) return;
	// 	    e.processed = true;

	// 	    var trg=e.target||e.srcElement;

	// 	    //IE8 can't modify event object
	// 	    //so we need to stop event bubbling to prevent double processing
	// 	    if (webix.env.isIE8){
	// 		    var vid = this._settings.id;
	// 		    var wid = trg.w_view;

	// 		    if (!wid) trg.w_view = vid; else if (wid !== vid) return;
	// 	    }

	// 	    var css = "";
	// 	    var id = null;
	// 	    var found = false;
	// 	    //loop through all parents
	// 	    //we need to check for this._viewobj as some handler can destroy the view
	// 	    while (trg && trg.parentNode && this._viewobj && trg != this._viewobj.parentNode){
	// 		    if (!found && trg.getAttribute){													//if element with ID mark is not detected yet
	// 			    id = trg.getAttribute(this._id);							//check id of current one
	// 			    if (id){
	// 				    this._item_clicked = id;
	// 				    if (this.callEvent){
	// 					    //it will be triggered only for first detected ID, in case of nested elements
	// 					    if (!this.callEvent("on"+name,[id,e,trg])) return;
	// 					    if (pair) this.callEvent("on"+pair,[id,e,trg]);
	// 				    }
	// 				    //set found flag
	// 				    found = true;
	// 			    }
	// 		    }
	// 		    css=webix.html._getClassName(trg);
	// 		    if (css){		//check if pre-defined reaction for element's css name exists
	// 			    css = css.toString().split(" ");
	// 			    for (var i=0; i<css.length; i++){
	// 				    if (hash[css[i]]){
	// 					    var functor = webix.toFunctor(hash[css[i]], this.$scope);
	// 					    var res =  functor.call(this,e,id||webix.html.locate(e, this._id),trg);
	// 					    if(res === false)
	// 						    return found;
	// 				    }
	// 			    }
	// 		    }
	// 		    trg=trg.parentNode;
	// 	    }
			
	// 	    return found;	//returns true if item was located and event was triggered
	//     }
    // };







    /*
	  Behavior:DND - low-level dnd handling
	  @export
	  getContext
	  addDrop
	  addDrag
	  
	  DND master can define next handlers
	  onCreateDrag
	  onDragIng
	  onDragOut
	  onDrag
	  onDrop
	  all are optional
    */



    // webix.DragControl={
	//     //has of known dnd masters
	//     _drag_masters : webix.toArray(["dummy"]),
	//     /*
	// 	  register drop area
	// 	  @param node 			html node or ID
	// 	  @param ctrl 			options dnd master
	// 	  @param master_mode 		true if you have complex drag-area rules
	//     */
	//     addDrop:function(node,ctrl,master_mode){
	// 	    node = webix.toNode(node);
	// 	    node.webix_drop=this._getCtrl(ctrl);
	// 	    if (master_mode) node.webix_master=true;
	//     },
	//     //return index of master in collection
	//     //it done in such way to prevent dnd master duplication
	//     //probably useless, used only by addDrop and addDrag methods
	//     _getCtrl:function(ctrl){
	// 	    ctrl = ctrl||webix.DragControl;
	// 	    var index = this._drag_masters.find(ctrl);
	// 	    if (index<0){
	// 		    index = this._drag_masters.length;
	// 		    this._drag_masters.push(ctrl);
	// 	    }
	// 	    return index;
	//     },
	//     _createTouchDrag: function(e){
	// 	    var dragCtrl = webix.DragControl;
	// 	    var master = this._getActiveDragMaster();
	// 	    // for data items only
	// 	    if(master && master._getDragItemPos){

	// 		    if(!dragCtrl._html)
	// 			    dragCtrl.createDrag(e);
	// 		    var ctx = dragCtrl._drag_context;
	// 		    dragCtrl._html.style.left= e.x+dragCtrl.left+ (ctx.x_offset||0)+"px";
	// 		    dragCtrl._html.style.top= e.y+dragCtrl.top+ (ctx.y_offset||0) +"px";
	// 	    }
	//     },
	//     /*
	// 	  register drag area
	// 	  @param node 	html node or ID
	// 	  @param ctrl 	options dnd master
	//     */
	//     addDrag:function(node,ctrl){
	//         node = webix.toNode(node);
	//         node.webix_drag=this._getCtrl(ctrl);
	// 	    webix._event(node,webix.env.mouse.down,this._preStart,{ bind:node });
	// 	    webix._event(node,"dragstart",webix.html.preventEvent);
	//     },
	//     //logic of drag - start, we are not creating drag immediately, instead of that we hears mouse moving
	//     _preStart:function(e){
	// 	    if (webix.DragControl._active){
	// 		    //if we have nested drag areas, use the top one and ignore the inner one
	// 		    if (webix.DragControl._saved_event == e) return;
	// 		    webix.DragControl._preStartFalse();
	// 		    webix.DragControl.destroyDrag(e);
	// 	    }
	// 	    webix.DragControl._active=this;

	// 	    var evobj = webix.env.mouse.context(e);
	// 	    webix.DragControl._start_pos=evobj;
	// 	    webix.DragControl._saved_event = e;

	// 	    webix.DragControl._webix_drag_mm = webix.event(document.body,webix.env.mouse.move,webix.DragControl._startDrag);
	// 	    webix.DragControl._webix_drag_mu = webix.event(document,webix.env.mouse.up,webix.DragControl._preStartFalse);

	// 	    //need to run here, or will not work in IE
	// 	    webix.html.addCss(document.body,"webix_noselect", 1);
	//     },
	//     //if mouse was released before moving - this is not a dnd, remove event handlers
	//     _preStartFalse:function(){
	// 	    webix.DragControl._clean_dom_after_drag();
	//     },
	//     //mouse was moved without button released - dnd started, update event handlers
	//     _startDrag:function(e){
	// 	    //prevent unwanted dnd
	// 	    var pos = webix.env.mouse.context(e);
	// 	    var master = webix.DragControl._getActiveDragMaster();
	// 	    // only long-touched elements can be dragged

	// 	    var longTouchLimit = (master && webix.env.touch && master._getDragItemPos && !webix.Touch._long_touched);
	// 	    if (longTouchLimit || Math.abs(pos.x-webix.DragControl._start_pos.x)<5 && Math.abs(pos.y-webix.DragControl._start_pos.y)<5)
	// 		    return;

	// 	    webix.DragControl._clean_dom_after_drag(true);
	// 	    if(!webix.DragControl._html)
	// 		    if (!webix.DragControl.createDrag(webix.DragControl._saved_event)) return;
		    
	// 	    webix.DragControl.sendSignal("start"); //useless for now
	// 	    webix.DragControl._webix_drag_mm = webix.event(document.body,webix.env.mouse.move,webix.DragControl._moveDrag);
	// 	    webix.DragControl._webix_drag_mu = webix.event(document,webix.env.mouse.up,webix.DragControl._stopDrag);
	// 	    webix.DragControl._moveDrag(e);

	// 	    if (webix.env.touch)
	// 		    return webix.html.preventEvent(e);
	//     },
	//     //mouse was released while dnd is active - process target
	//     _stopDrag:function(e){
	// 	    webix.DragControl._clean_dom_after_drag();
	// 	    webix.DragControl._saved_event = null;

	// 	    if (webix.DragControl._last){	//if some drop target was confirmed
	// 		    webix.DragControl.$drop(webix.DragControl._active, webix.DragControl._last, e);
	// 		    webix.DragControl.$dragOut(webix.DragControl._active,webix.DragControl._last,null,e);
	// 	    }
	// 	    webix.DragControl.destroyDrag(e);
	// 	    webix.DragControl.sendSignal("stop");	//useless for now
	//     },
	//     _clean_dom_after_drag:function(still_drag){
	// 	    this._webix_drag_mm = webix.eventRemove(this._webix_drag_mm);
	// 	    this._webix_drag_mu = webix.eventRemove(this._webix_drag_mu);
	// 	    if (!still_drag)
	// 		    webix.html.removeCss(document.body,"webix_noselect");
	//     },
	//     //dnd is active and mouse position was changed
	//     _moveDrag:function(e){
	// 	    var dragCtrl = webix.DragControl;
	// 	    var pos = webix.html.pos(e);
	// 	    var evobj = webix.env.mouse.context(e);

	// 	    //give possibility to customize drag position
	// 	    var customPos = dragCtrl.$dragPos(pos, e);
	// 	    //adjust drag marker position
	// 	    var ctx = dragCtrl._drag_context;
	// 	    dragCtrl._html.style.top=pos.y+dragCtrl.top+(customPos||!ctx.y_offset?0:ctx.y_offset) +"px";
	// 	    dragCtrl._html.style.left=pos.x+dragCtrl.left+(customPos||!ctx.x_offset?0:ctx.x_offset)+"px";

	// 	    if (dragCtrl._skip)
	// 		    dragCtrl._skip=false;
	// 	    else {
	// 		    var target = evobj.target = webix.env.touch ? document.elementFromPoint(evobj.x, evobj.y) : evobj.target;
	// 		    var touch_event = webix.env.touch ? evobj : e;
	// 		    dragCtrl._checkLand(target, touch_event);
	// 	    }
		    
	// 	    return webix.html.preventEvent(e);
	//     },
	//     //check if item under mouse can be used as drop landing
	//     _checkLand:function(node,e){
	// 	    while (node && node.tagName!="BODY"){
	// 		    if (node.webix_drop){	//if drop area registered
	// 			    if (this._last && (this._last!=node || node.webix_master))	//if this area with complex dnd master
	// 				    this.$dragOut(this._active,this._last,node,e);			//inform master about possible mouse-out
	// 			    if (!this._last || this._last!=node || node.webix_master){	//if this is new are or area with complex dnd master
	// 				    this._last=null;										//inform master about possible mouse-in
	// 				    this._landing=this.$dragIn(webix.DragControl._active,node,e);
	// 				    if (this._landing)	//landing was rejected
	// 					    this._last=node;
	// 				    return;				
	// 			    } 
	// 			    return;
	// 		    }
	// 		    node=node.parentNode;
	// 	    }
	// 	    if (this._last)	//mouse was moved out of previous landing, and without finding new one 
	// 		    this._last = this._landing = this.$dragOut(this._active,this._last,null,e);
	//     },
	//     //mostly useless for now, can be used to add cross-frame dnd
	//     sendSignal:function(signal){
	// 	    webix.DragControl.active=(signal=="start");
	//     },
	    
	//     //return master for html area
	//     getMaster:function(t){
	// 	    return this._drag_masters[t.webix_drag||t.webix_drop];
	//     },
	//     //return dhd-context object
	//     getContext:function(){
	// 	    return this._drag_context;
	//     },
	//     getNode:function(){
	// 	    return this._html;
	//     },
	//     //called when dnd is initiated, must create drag representation
	//     createDrag:function(e){ 
	// 	    var dragCtl = webix.DragControl;
	// 	    var a=dragCtl._active;

	// 	    dragCtl._drag_context = {};
	// 	    var master = this._drag_masters[a.webix_drag];
    //         var drag_container;

	// 	    //if custom method is defined - use it
	// 	    if (master.$dragCreate){
	// 		    drag_container=master.$dragCreate(a,e);
	// 		    if (!drag_container) return false;
	// 		    this._setDragOffset(e);
	// 		    drag_container.style.position = 'absolute';
	// 	    } else {
	// 	        //overvise use default one
	// 		    var text = dragCtl.$drag(a,e);
	// 		    dragCtl._setDragOffset(e);

	// 		    if (!text) return false;
	// 		    drag_container = document.createElement("DIV");
	// 		    drag_container.innerHTML=text;
	// 		    drag_container.className="webix_drag_zone";
	// 		    document.body.appendChild(drag_container);

	// 		    var context = dragCtl._drag_context;
	// 		    if (context.html && webix.env.pointerevents){
	// 			    context.x_offset = -Math.round(drag_container.offsetWidth  * 0.5);
	// 			    context.y_offset = -Math.round(drag_container.offsetHeight * 0.75);
	// 		    }
	// 	    }
	// 	    /*
	// 		  dragged item must have topmost z-index
	// 		  in some cases item already have z-index
	// 		  so we will preserve it if possible
	// 	    */
	// 	    drag_container.style.zIndex = Math.max(drag_container.style.zIndex,webix.ui.zIndex());

	// 	    webix.DragControl._skipDropH = webix.event(drag_container,webix.env.mouse.move,webix.DragControl._skip_mark);

	// 	    if (!webix.DragControl._drag_context.from)
	// 		    webix.DragControl._drag_context = {source:a, from:a};
		    
	// 	    webix.DragControl._html=drag_container;
	// 	    return true;
	//     },
	//     //helper, prevents unwanted mouse-out events
	//     _skip_mark:function(){
	// 	    webix.DragControl._skip=true;
	//     },
	//     //after dnd end, remove all traces and used html elements
	//     destroyDrag:function(e){
	// 	    var a=webix.DragControl._active;
	// 	    var master = this._drag_masters[a.webix_drag];

	// 	    if (master && master.$dragDestroy){
	// 		    webix.DragControl._skipDropH = webix.eventRemove(webix.DragControl._skipDropH);
	// 		    if(webix.DragControl._html)
	// 			    master.$dragDestroy(a,webix.DragControl._html,e);
	// 	    }
	// 	    else{
	// 		    webix.html.remove(webix.DragControl._html);
	// 	    }
	// 	    webix.DragControl._landing=webix.DragControl._active=webix.DragControl._last=webix.DragControl._html=null;
	// 	    //webix.DragControl._x_offset = webix.DragControl._y_offset = null;
	//     },
	//     _getActiveDragMaster: function(){
	// 	    return webix.DragControl._drag_masters[webix.DragControl._active.webix_drag];
	//     },
	//     top:5,	 //relative position of drag marker to mouse cursor
	//     left:5,
	//     _setDragOffset:function(e){
	// 	    var dragCtl = webix.DragControl;
	// 	    var pos = dragCtl._start_pos;
	// 	    var ctx = dragCtl._drag_context;

	// 	    if(typeof ctx.x_offset != "undefined" && typeof ctx.y_offset != "undefined")
	// 		    return null;

	// 	    ctx.x_offset = ctx.y_offset = 0;
	// 	    if(webix.env.pointerevents){
	// 		    var m=webix.DragControl._getActiveDragMaster();

	// 		    if (m._getDragItemPos && m!==this){
	// 			    var itemPos = m._getDragItemPos(pos,e);

	// 			    if(itemPos){
	// 				    ctx.x_offset = itemPos.x - pos.x;
	// 				    ctx.y_offset = itemPos.y - pos.y;
	// 			    }

	// 		    }

	// 	    }
	//     },
	//     $dragPos:function(pos, e){
	// 	    var m=this._drag_masters[webix.DragControl._active.webix_drag];
	// 	    if (m.$dragPos && m!=this){
	// 		    m.$dragPos(pos, e, webix.DragControl._html);
	// 		    return true;
	// 	    }
	//     },
	//     //called when mouse was moved in drop area
	//     $dragIn:function(s,t,e){
	// 	    var m=this._drag_masters[t.webix_drop];
	// 	    if (m.$dragIn && m!=this) return m.$dragIn(s,t,e);
	// 	    t.className=t.className+" webix_drop_zone";
	// 	    return t;
	//     },
	//     //called when mouse was moved out drop area
	//     $dragOut:function(s,t,n,e){
	// 	    var m=this._drag_masters[t.webix_drop];
	// 	    if (m.$dragOut && m!=this) return m.$dragOut(s,t,n,e);
	// 	    t.className=t.className.replace("webix_drop_zone","");
	// 	    return null;
	//     },
	//     //called when mouse was released over drop area
	//     $drop:function(s,t,e){
	// 	    var m=this._drag_masters[t.webix_drop];
	// 	    webix.DragControl._drag_context.from = webix.DragControl.getMaster(s);
	// 	    if (m.$drop && m!=this) return m.$drop(s,t,e);
	// 	    t.appendChild(s);
	//     },
	//     //called when dnd just started
	//     $drag:function(s,e){
	// 	    var m=this._drag_masters[s.webix_drag];
	// 	    if (m.$drag && m!=this) return m.$drag(s,e);
	// 	    return "<div style='"+s.style.cssText+"'>"+s.innerHTML+"</div>";
	//     }	
    // };

    // //global touch-drag handler
    // webix.attachEvent("onLongTouch", function(ev){
	//     if(webix.DragControl._active)
	// 	    webix.DragControl._createTouchDrag(ev);
    // });

    /*
	  Behavior:DataMove - allows to move and copy elements, heavily relays on DataStore.move
	  @export
	  copy
	  move
    */
    webix.DataMove={
	    //creates a copy of the item
	    copy:function(sid,tindex,tobj, details){
		    details = details || {};
		    var new_id = details.newId || sid;
		    tobj = tobj||this;

		    var data = this.getItem(sid);
		    webix.assert(data,"Incorrect ID in DataMove::copy");
		    
		    //make data conversion between objects
		    if (tobj)
			    data = tobj._externalData(data);
		    
		    //adds new element same as original
		    return tobj.data.add(tobj._externalData(data,new_id),tindex,(details.parent || 0));
	    },
	    _next_move_index:function(nid, next, source){
		    if (next && nid){
			    var new_index = this.getIndexById(nid);
			    return new_index+(source == this && source.getIndexById(next)<new_index?0:1);
		    }
	    },
	    //move item to the new position
	    move:function(sid,tindex,tobj, details){
		    details = details || {};
		    var new_id = details.newId || sid;

		    tobj = tobj||this;
		    webix.assert(tobj.data, "moving attempt to component without datastore");
		    if (!tobj.data) return;

		    //can process an arrya - it allows to use it from onDrag 
		    if (webix.isArray(sid)){
			    //block separate repaint operations
			    if (sid.length > 3) //heuristic value, duplicated below
				    this.$blockRender = tobj.$blockRender = true;

			    for (var i=0; i < sid.length; i++) {
				    //increase index for each next item in the set, so order of insertion will be equal to order in the array
				    var nid = this.move(sid[i], tindex, tobj, details);
				    tindex = tobj._next_move_index(nid, sid[i+1], this);
			    }

			    this.$blockRender = tobj.$blockRender = false;
			    if (sid.length > 3){
				    //repaint whole component
				    this.refresh();
				    if (tobj != this)
					    tobj.refresh();
			    }
			    return;
		    }
		    
		    var nid = sid; //id after moving

		    var data = this.getItem(sid);
		    webix.assert(data,"Incorrect ID in DataMove::move");
		    
		    if (!tobj || tobj == this){
			    if (tindex < 0) tindex = this.data.order.length - 1;
			    this.data.move(this.getIndexById(sid),tindex);	//move inside the same object
			    this.data.callEvent("onDataMove", [sid, tindex, null, this.data.order[tindex+1]]);
		    } else {
			    //copy to the new object
			    nid = tobj.data.add(tobj._externalData(data,new_id),tindex, (details.parent || 0));
			    this.data.remove(sid);//delete in old object
		    }
		    return nid;	//return ID of item after moving
	    },
	    //move item on one position up
	    moveUp:function(id,step){
		    return this.move(id,this.getIndexById(id)-(step||1));
	    },
	    //move item on one position down
	    moveDown:function(id,step){
		    return this.moveUp(id, (step||1)*-1);
	    },
	    //move item to the first position
	    moveTop:function(id){
		    return this.move(id,0);
	    },
	    //move item to the last position
	    moveBottom:function(id){
		    return this.move(id,this.data.count()-1);
	    },
	    /*
		  this is a stub for future functionality
		  currently it just makes a copy of data object, which is enough for current situation
	    */
	    _externalData:function(data,id){
		    var newdata = webix.extend({},data);
		    newdata.id = (!id || this.data.pull[id])?webix.uid():id;
		    

		    newdata.$template=null;

		    if (this._settings.externalData)
			    newdata = this._settings.externalData.call(this, newdata, id, data);
		    return newdata;
	    }
    };


    webix.Movable = {
	    move_setter: function (value) { 
		    if (value){
			    this._move_admin = webix.clone(this._move_admin);
			    this._move_admin.master = this;

			    webix.DragControl.addDrag(this._headobj, this._move_admin);
		    }
		    return value;
	    },
	    _move_admin: {
		    $dragCreate:function(object, e){
			    if(this.master.config.move){
				    var offset = webix.html.offset(object);
				    var pos = webix.html.pos(e);
				    webix.DragControl.top = offset.y - pos.y;
				    webix.DragControl.left = offset.x - pos.x;

				    return webix.toNode(this.master._viewobj);
			    }
		    },
		    $dragDestroy:function(node, drag){
			    var view = this.master;
			    if (view._settings){
				    view._settings.top = parseInt(drag.style.top,10);
				    view._settings.left = parseInt(drag.style.left,10);
			    }

			    webix.DragControl.top = webix.DragControl.left = 5;
			    this.master.callEvent("onViewMoveEnd", []);
			    return;
		    },
		    $dragPos:function(pos, e){
			    this.master.callEvent("onViewMove", [pos, e]);
		    }
	    }
    };



    webix.Modality = {
        _modal_set:function(value){
	        if (value){
	    	    if (!this._modal_cover){
		            this._modal_cover = webix.html.create('div',{
		        	    "class":"webix_modal"
		    	    });
		    	    /*	with below code we will have the same zIndex for modal layer as for the previous 
					    abs positioned element, but because of attaching order modal layer will be on top anyway
		    	    */
		    	    var zIndex = this._settings.zIndex||webix.ui.zIndex();

		    	    //set topmost modal layer
		    	    this._previous_modality = webix._modality;
		    	    webix._modality = zIndex;


		    	    this._modal_cover.style.zIndex = zIndex-1;
		    	    this._viewobj.style.zIndex = zIndex;
		            document.body.appendChild(this._modal_cover);
		            document.body.style.overflow = "hidden";
				    webix._event( this._modal_cover, "click", webix.bind(this._ignore_clicks, this));
	            }
	        }
	        else {
	            if (this._modal_cover){
	                webix.html.remove(this._modal_cover);
	                document.body.style.overflow = "visible";

	                //restore topmost modal layer
	        	    //set delay, as current window closing may have not finished click event
	        	    //need to wait while it is not fully processed
	        	    var topmost = this._previous_modality;
	        	    setTimeout(function(){ webix._modality = topmost; }, 1);

	        	    this._modal_cover = null;
	            }
	        }
	        return value;
        }
    };

	

    webix.ui._popups = webix.toArray();



    /*aria-style handling for options of multiple-value controls (radio, segmented, tabbar)*/

    webix.HTMLOptions = {
	    $init:function(config){
		    if(webix.skin.$active.customRadio || this.addOption)
			    webix._event( this.$view, "keydown", this._moveSelection, {bind:this});
	    },
	    _focus: function(){
		    var input = this._getInputNode();
		    if(input)
			    for(var i=0; i<input.length; i++){
				    if(input[i].getAttribute("tabindex") == "0")
					    input[i].focus();
			    }
	    },
	    _blur: function(){
		    var input = this._getInputNode();
		    if(input)
			    for(var i=0; i<input.length; i++){
				    if(input[i].getAttribute("tabindex") == "0") input[i].blur();
			    }
	    },
	    _moveSelection:function(e){
		    var code = e.which || e.keyCode;

		    var startCode = this.addOption?34:36;

		    if(code>startCode && code <41){
			    webix.html.preventEvent(e);
			    var index;
			    var inp = this._getInputNode();

			    if(code == 35) index = inp.length-1;
			    else if(code === 36 ) index = 0;
			    else{
				    var dir = (code === 37 || code ===38)?-1:1;
				    for(var i =0; i<inp.length; i++){
					    if(inp[i].getAttribute("tabindex") == "0"){
						    index = i + dir;
						    if(index<0) index = inp.length-1;
						    else if(index>=inp.length) index = 0;
						    break;
					    }
				    }
			    }
			    if(!webix.isUndefined(index)){
				    var id = this.addOption ? inp[index].getAttribute("button_id") : inp[index].value;
				    if(webix.skin.$active.customRadio && !this.addOption)
					    inp = this.$view.getElementsByTagName("BUTTON");

				    this.setValue(id);
				    inp[index].focus();
			    }
		    }
	    }
    };


    webix.attachEvent("onClick", function(e){
	    var element = webix.$$(e);
	    if (element && element.touchable){
		    webix.UIManager.applyChanges(element);

		    //for inline elements - restore pointer to the master element
		    element.getNode(e);
		    //reaction on custom css elements in buttons
		    var trg=e.target||e.srcElement;
		    if (trg.className == "webix_disabled")
			    return;

		    var css = "";
		    var id = null;
		    var found = false;
		    if (trg.className && trg.className.toString().indexOf("webix_view")===0) return;

		    if (element)
			    webix.UIManager._focus_action(element);

		    //loop through all parents
		    while (trg && trg.parentNode){
			    if (trg.getAttribute){
				    if (trg.getAttribute("view_id"))
					    break;
					
				    css=trg.className;
				    if (css){
					    css = css.toString().split(" ");
					    for (var i =0; i<css.length; i++){
						    if (element.on_click[css[i]]){
							    var res =  element.on_click[css[i]].call(element,e,element._settings.id,trg);
							    if (res===false)
								    return;
						    }
					    }
				    }
			    }
			    trg=trg.parentNode;
		    }


		    if (element._settings.click){
			    var code = webix.toFunctor(element._settings.click, element.$scope);
			    if (code && code.call) code.call(element, element._settings.id, e);
		    }



		    var popup = element._settings.popup;
		    if (element._settings.popup && !element._settings.readonly){
			    if (typeof popup == "object" && !popup.name)
				    popup = element._settings.popup = webix.ui(popup)._settings.id;

			    var popup = webix.$$(popup);
			    webix.assert(popup, "Unknown popup");

			    if (!popup.isVisible()){
				    popup._settings.master = element._settings.id;
				    popup.show((element.getInputNode()||element.getNode()),null,true);
			    }
		    }

		    element.callEvent("onItemClick", [element._settings.id, e]);
	    }
    });












    /*
	  Renders collection of items
	  Behavior uses plain strategy which suits only for relative small datasets
	  
    */


    webix.RenderStack={
	    $init:function(){
		    webix.assert(this.data,"RenderStack :: Component doesn't have DataStore");
            webix.assert(webix.template,"webix.template :: webix.template is not accessible");

		    //used for temporary HTML elements
		    //automatically nulified during destruction
		    this._html = document.createElement("DIV");
			
		    this.data.attachEvent("onIdChange", webix.bind(this._render_change_id, this));
		    this.attachEvent("onItemClick", this._call_onclick);
		    
		    //create copy of default type, and set it as active one
		    if (!this.types){ 
			    this.types = { "default" : this.type };
			    this.type.name = "default";
		    }

		    this.type = webix.clone(this.type);
	    },
	    
	    customize:function(obj){ 
		    webix.type(this,obj);
	    },
	    item_setter:function(value){
		    return this.type_setter(value);
	    },
	    type_setter:function(value){
		    if(!this.types[value])
			    this.customize(value);
		    else {
			    this.type = webix.clone(this.types[value]);
			    if (this.type.css) 
				    this._contentobj.className+=" "+this.type.css;
		    }
		    if (this.type.on_click)
			    webix.extend(this.on_click, this.type.on_click);

		    return value;
	    },
	    
	    template_setter:function(value){
		    this.type.template=webix.template(value);
	    },
	    //convert single item to HTML text (templating)
	    _toHTML:function(obj){
			var mark = this.data._marks[obj.id];
			//check if related template exist
			webix.assert((!obj.$template || this.type["template"+obj.$template]),"RenderStack :: Unknown template: "+obj.$template);
			this.callEvent("onItemRender",[obj]);
			return this.type.templateStart(obj,this.type, mark)+(obj.$template?this.type["template"+obj.$template]:this.type.template)(obj,this.type,mark)+this.type.templateEnd(obj, this.type,mark);
	    },
	    //convert item to HTML object (templating)
	    _toHTMLObject:function(obj){
		    this._html.innerHTML = this._toHTML(obj);
		    return this._html.firstChild;
	    },
	    _render_change_id:function(old, newid){
		    var obj = this.getItemNode(old);
		    if (obj) {
			    obj.setAttribute(this._id, newid);
			    this._htmlmap[newid] = this._htmlmap[old];
			    delete this._htmlmap[old];
		    }
	    },
	    //calls function that is set in onclick property
	    _call_onclick:function(){
		    if (this._settings.click){
			    var code = webix.toFunctor(this._settings.click, this.$scope);
			    if (code && code.call) code.apply(this,arguments);
		    }
	    },
	    //return html container by its ID
	    //can return undefined if container doesn't exists
	    getItemNode:function(search_id){
		    if (this._htmlmap)
			    return this._htmlmap[search_id];
			
		    //fill map if it doesn't created yet
		    this._htmlmap={};
		    
		    var t = this._dataobj.childNodes;
		    for (var i=0; i < t.length; i++){
			    var id = t[i].getAttribute(this._id); //get item's
			    if (id)
				    this._htmlmap[id]=t[i];
		    }
		    //call locator again, when map is filled
		    return this.getItemNode(search_id);
	    },
	    //return id of item from html event
	    locate:function(e){ return webix.html.locate(e,this._id); },
	    /*change scrolling state of top level container, so related item will be in visible part*/
	    showItem:function(id){

		    var html = this.getItemNode(id);
		    if (html&&this.scrollTo){
			    var txmin = Math.abs(this._contentobj.offsetLeft-html.offsetLeft);
			    var txmax = txmin + html.offsetWidth;
			    var tymin = Math.abs(this._contentobj.offsetTop-html.offsetTop);
			    var tymax = tymin + html.offsetHeight;
			    var state = this.getScrollState();

			    var x = state.x;
			    if (x > txmin || x + this._content_width < txmax )
				    x = txmin;
			    var y = state.y;
			    if (y > tymin || y + this._content_height < tymax )
				    y = tymin - 5;

			    this.scrollTo(x,y);
			    if(this._setItemActive)
				    this._setItemActive(id);
		    }
	    },
	    //update view after data update
	    //method calls low-level rendering for related items
	    //when called without parameters - all view refreshed
	    render:function(id,data,type){
		    if (!this.isVisible(this._settings.id) || this.$blockRender)
			    return;
		    
		    if (webix.debug_render)
			    webix.log("Render: "+this.name+"@"+this._settings.id+", mode:"+(type||"#")+", item:"+(id||"#"));
			
		    if (id){
			    var cont = this.getItemNode(id); //get html element of updated item
			    switch(type){
				case "paint":
				case "update":
					//in case of update - replace existing html with updated one
					if (!cont) return;
					var t = this._htmlmap[id] = this._toHTMLObject(data);
					webix.html.insertBefore(t, cont); 
					webix.html.remove(cont);
					break;
				case "delete":
					//in case of delete - remove related html
					if (!cont) return;
					webix.html.remove(cont);
					delete this._htmlmap[id];
					break;
				case "add":
					//in case of add - put new html at necessary position
					var t = this._htmlmap[id] = this._toHTMLObject(data);
					webix.html.insertBefore(t, this.getItemNode(this.data.getNextId(id)), this._dataobj);
					break;
				case "move":
					//moving without repainting the item
					webix.html.insertBefore(this.getItemNode(id), this.getItemNode(this.data.getNextId(id)), this._dataobj);
					break;
				default:
					webix.assert_error("Unknown render command: "+type);
					break;
			    }
		    } else {
			    //full reset
			    if (this.callEvent("onBeforeRender",[this.data])){
				    /*if (this.getScrollState)
					  var scroll = this.getScrollState();*/
					
				    //getRange - returns all elements
				    (this._renderobj||this._dataobj).innerHTML = this.data.getRange().map(this._toHTML,this).join("");
				    this._htmlmap = null; //clear map, it will be filled at first getItemNode
				    this.callEvent("onAfterRender",[]);
                    var t = this._dataobj.offsetHeight;
                    
				    /*if (this.getScrollState)
					  this.scrollTo(scroll.x, scroll.y);*/
			    }
		    }
	    }
    };







    webix.ValidateData = {
	    $init:function(){
		    if(this._events)
			    this.attachEvent("onChange",this.clearValidation);
	    },
	    clearValidation:function(){
		    if(this.elements){
			    for(var id in this.elements){
				    this._clear_invalid(id);
			    }
		    }
	    },
	    validate:function(mode, obj) {
		    webix.assert(this.callEvent, "using validate for eventless object");
		    
		    this.callEvent("onBeforeValidate", []);
		    var failed = this._validate_details = {};

		    //optimistic by default :) 
		    var result =true;
		    var rules = this._settings.rules;
		    
		    var isHidden = this.isVisible && !this.isVisible();
		    var validateHidden = mode && mode.hidden;
		    var validateDisabled = mode && mode.disabled;

            //prevent validation of hidden elements
		    var elements = {}, hidden = {};
            for(var i in this.elements){
                var name = this.elements[i].config.name;
                //we are ignoring hidden and disabled fields during validation
                //if mode doesn not instruct us otherwise
                //if form itself is hidden, we can't separate hidden fiels,
                //so we will vaidate all fields
                if((isHidden || this.elements[i].isVisible() || validateHidden) && (this.elements[i].isEnabled() || validateDisabled))
				    elements[name] = this.elements[i];
                else{
				    hidden[name]=true;
                }
            }
		    if (rules || elements)
			    if(!obj && this.getValues)
				    obj = this.getValues();

		    if (rules){
			    //complex rule, which may chcek all properties of object
			    if (rules.$obj)
				    result = this._validate(rules.$obj, obj, obj, "") && result;
			    
			    //all - applied to all fields
			    var all = rules.$all;
			    var data = obj;

			    if (this._settings.complexData)
				    data = webix.CodeParser.collapseNames(obj);

			    if (all)
				    for (var key in obj){
                        if(hidden[key]) continue;
                        var subresult = this._validate(all, data[key], obj, key);
					    if (!subresult)
						    failed[key] = true;
					    result =  subresult && result;
				    }


			    //per-field rules
			    for (var key in rules){
                    if(hidden[key]) continue;
				    if (key.indexOf("$")!==0 && !failed[key]){
					    webix.assert(rules[key], "Invalid rule for:"+key);
					    var subresult = this._validate(rules[key], data[key], obj, key);
					    if (!subresult)
						    failed[key] = true;
					    result = subresult && result;
				    }
			    }
		    }

		    //check personal validation rules
		    if (elements){
			    for (var key in elements){
				    if (failed[key]) continue;

				    var subview = elements[key];
				    if (subview.validate){
					    var subresult = subview.validate();
					    result = subresult && result;
					    if (!subresult)
						    failed[key] = true;
				    } else {
					    var input = subview._settings;
					    if (input){	//ignore non webix inputs
						    var validator = input.validate;
						    if (!validator && input.required)
							    validator = webix.rules.isNotEmpty;

						    if (validator){
							    var subresult = this._validate(validator, obj[key], obj, key);
							    if (!subresult)
								    failed[key] = true;
							    result = subresult && result;
						    }
					    }
				    }
			    }
		    }
	        
		    this.callEvent("onAfterValidation", [result, this._validate_details]);
		    return result;
	    },
	    _validate:function(rule, data, obj, key){
		    if (typeof rule == "string")
			    rule = webix.rules[rule];
		    if (rule.call(this, data, obj, key)){
			    if(this.callEvent("onValidationSuccess",[key, obj]) && this._clear_invalid)
				    this._clear_invalid(key);
			    return true;
		    }
		    else {
			    if(this.callEvent("onValidationError",[key, obj]) && this._mark_invalid)
				    this._mark_invalid(key);
		    }
		    return false;
	    }
    };


    webix.ValidateCollection = {
	    _validate_init_once:function(){
		    this.data.attachEvent("onStoreUpdated",webix.bind(function(id, data, mode){
			    if (id && (mode == "add" || mode == "update"))
				    this.validate(id);
		    }, this));
		    this.data.attachEvent("onClearAll",webix.bind(this.clearValidation, this));

		    this._validate_init_once = function(){};
	    },
	    rules_setter:function(value){
		    if (value){
			    this._validate_init_once();
		    }
		    return value;
	    },
	    clearValidation:function(){
		    this.data.clearMark("webix_invalid", true);
	    },
	    validate:function(id){
		    var result = true;
		    if (!id)
			    for (var key in this.data.pull)
				    var result = this.validate(key) && result;
		    else {
			    this._validate_details = {};
			    var obj = this.getItem(id);
			    result = webix.ValidateData.validate.call(this, null, obj);
			    if (result){
				    if (this.callEvent("onValidationSuccess",[id, obj]))
					    this._clear_invalid(id);
			    } else {
				    if (this.callEvent("onValidationError",[id, obj, this._validate_details]))
					    this._mark_invalid(id, this._validate_details);
			    }
		    }
		    return result;
	    },
	    _validate:function(rule, data, obj, key){
		    if (typeof rule == "string")
			    rule = webix.rules[rule];

		    var res = rule.call(this, data, obj, key);
		    if (!res){
			    this._validate_details[key] = true;
		    }
		    return res;
	    },
	    _clear_invalid:function(id){
		    this.data.removeMark(id, "webix_invalid", true);
	    },
	    _mark_invalid:function(id, details){
		    this.data.addMark(id, "webix_invalid", true);
	    }
    };


    webix.rules = {
	    isEmail: function(value){
		    return (/\S+@[^@\s]+\.[^@\s]+$/).test((value || "").toString());
	    },
	    isNumber: function(value){
		    return (parseFloat(value) == value);
	    },
	    isChecked: function(value){
		    return (!!value) || value === "0";
	    },
	    isNotEmpty: function(value){
		    return (value === 0 || value);
	    }
    };
    /*Data collection mapping logic */

    webix.MapCollection = {
        $init:function(){
            this.$ready.push(this._create_scheme_init);
            this.attachEvent("onStructureUpdate", this._create_scheme_init);
            this.attachEvent("onStructureLoad", function(){
                if(!this._scheme_init_order.length)
                    this._create_scheme_init();
            });
        },
        _create_scheme_init:function(order){
            var order = this._scheme_init_order = [];
            var config = this._settings;

            if (config.columns)
                this._build_data_map(config.columns);
            if (this._settings.map)
                this._process_field_map(config.map);

            if (this._scheme_init_order.length){
                try {
                    this.data._scheme_init = Function("obj",order.join("\n"));
                } catch(e){
                    webix.assert_error("Invalid data map:"+order.join("\n"));
                }
            }
        },
        _process_field_map:function(map){
            for (var key in map)
                this._scheme_init_order.push(this._process_single_map(key, map[key]));
        },
        _process_single_map:function(id, map, extra){
            var start = "";
            var end = "";

            if (map.indexOf("(date)")===0){
                start = "webix.i18n.parseFormatDate("; end=")";
                if (extra && !extra.format) extra.format = webix.i18n.dateFormatStr;
                map = map.replace("(date)","");
            } else if (map.indexOf("(number)")===0){
                start = "("; end=")*1";
                map = map.replace("(number)","");
            }

            if (map !== ""){
                map=map.replace(/\{obj\.([^}]*)\}/g,"\"+(obj.$1||'')+\"");
                map=map.replace(/#([^#'";, ]+)#/gi,"\"+(obj.$1||'')+\"");
            } else
                map = "\"+(obj."+id+"||'')+\"";


            return "obj."+id+" = "+start+'"'+map+'"'+end+";";
        },
        _build_data_map:function(columns){ //for datatable
            for (var i=0; i<columns.length; i++){
                var map = columns[i].map;
                var id = columns[i].id;
                if (!id) {
                    id = columns[i].id = "i"+webix.uid();
                    if (!columns[i].header)
                        columns[i].header = "";
                }
                if (map)
                    this._scheme_init_order.push(this._process_single_map(id, map, columns[i]));

                this._map_options(columns[i]);
            }
        },
        _map_options:function(element){
            var options = element.options||element.collection;
            if(options){
                if (typeof options === "string"){
                    //id of some other view
                    var options_view = webix.$$(options);
                    //or url
                    if (!options_view){
                        options_view = new webix.DataCollection({ url: options });
                        this._destroy_with_me.push(options_view);
                    }
                    //if it was a view, special check for suggests
                    if (options_view.getBody) options_view = options_view.getBody();
                    this._bind_collection(options_view, element);
                } else if (!options.loadNext){
                    if (options[0] && typeof options[0] == "object"){
                        //[{ id:1, value:"one"}, ...]
                        options = new webix.DataCollection({ data:options });
                        this._bind_collection(options, element);
                        this._destroy_with_me.push(options);
                    } else {
                        //["one", "two"]
                        //or
                        //{ 1: "one", 2: "two"}
                        if (webix.isArray(options)){
                            var data = {};
                            for (var ij=0; ij<options.length; ij++) data[options[ij]] = options[ij];
                            element.options = options = data;
                        }
                        element.template = element.template || this._collection_accesser(options, element.id, element.optionslist);
                    }
                } else {
                    //data collection or view
                    this._bind_collection(options, element);
                }
            }
        },
        _bind_collection:function(options, element){
            if (element){
                delete element.options;
                element.collection = options;
                element.template = element.template || this._bind_accesser(options, element.id, element.optionslist);
	            var id = options.data.attachEvent("onStoreUpdated", webix.bind(function(){
		            this.refresh();
                    if(this.refreshFilter)
                        this.refreshFilter(element.id);
	            }, this));
                this.attachEvent("onDestruct", function(){
            	    if (!options.$destructed) options.data.detachEvent(id);
                });
            }
        },
        _collection_accesser:function(options, id, multi){
            if (multi){
                var separator = typeof multi=="string"?multi:",";
                return function(obj, common){
                    var value = obj[id] || obj.value;
                    if (!value) return "";
                    var ids = value.split(separator);
                    for (var i = 0; i < ids.length; i++)
                        ids[i] = options[ids[i]] || "";
                    
                    return ids.join(", ");
                };
            } else {
                return function(obj, common){
                    return options[obj[id]]||obj.value||"";
                };
            }
        },
        _bind_accesser:function(col, id, multi){
            if (multi) {
                var separator = typeof multi=="string"?multi:",";
                return function(obj, common){
                    var value = obj[id] || obj.value;
                    if (!value) return "";

                    var ids = value.split(separator);
                    for (var i = 0; i < ids.length; i++){
                        var data = col.data.pull[ids[i]];
                        ids[i] = data ? (data.value  || "") : "";
                    }
                    
                    return ids.join(", ");
                };
            } else {
                return function(obj, common){
                    var prop = obj[id]||obj.value,
                        data = col.data.pull[prop];
                    if (data && (data.value || data.value ===0))
                        return data.value;
                    return "";
                };
            }
        }
    };
    webix.Undo= {
	    $init:function(){
		    this._undoHistory = webix.extend([],webix.PowerArray,true);
		    this._undoCursor = -1;
	    },
	    undo_setter: function(value){
		    if(value){
			    this._init_undo();
			    this._init_undo = function(){};
		    }
		    return value;
	    },
	    _init_undo: function(){
		    var view = this;

		    // drag-n-drop
		    this.attachEvent("onBeforeDrop", function(context){
			    if(context.from == context.to){
				    var item = view._draggedItem = webix.copy(this.getItem(context.start));
				    if(this.data.branch){
					    item.$index = this.getBranchIndex(item.id);
				    }
				    else
					    item.$index = this.getIndexById(item.id);
			    }
		    });
		    this.data.attachEvent("onDataMove", function( sid ){
			    if(view._draggedItem && view._draggedItem.id == sid){
				    var data = view._draggedItem;
				    view._draggedItem = null;
				    view._addToHistory(sid, data, "move");
			    }
		    });

		    // add, remove
		    this.data.attachEvent("onBeforeDelete", function(id){
			    if(this.getItem(id)){
				    var item = view._deletedItem = webix.copy(this.getItem(id));
				    if(this.branch){
					    item.$index = this.getBranchIndex(id);
					    if(this.branch[id])
						    item.$branch = webix.copy(this.serialize(id));
				    }
				    else
					    item.$index = this.getIndexById(id);
			    }
		    });
		    this.data.attachEvent("onDataUpdate", function(id, data, old){
			    view._addToHistory(id+"", old, "update");
		    });
		    this.data.attachEvent("onStoreUpdated", function(id, item, mode){
			    var data = null;
			    if(id){
				    if(mode == "add"){
					    data = webix.copy(item);
				    }
				    else if( mode == "delete") {
					    data = view._deletedItem;
				    }

				    if(data)
					    view._addToHistory(id, data, mode);
			    }
		    });

		    // id change
		    this.data.attachEvent("onIdChange", function(oldId,newId){
			    if(typeof oldId == "object")
				    oldId = oldId.row;
			    for(var i =0; i < view._undoHistory.length; i++){
				    if(view._undoHistory[i].id == oldId){
					    view._undoHistory[i].id = newId;
				    }
			    }
		    });
	    },
	    _addToHistory: function(id, data, action){
		    if(!this._skipHistory && this._settings.undo){
			    this._undoHistory.push({id: id, action: action, data: data});
			    if(this._undoHistory.length==20)
				    this._undoHistory.splice(0,1);
			    if(!this._skipCursorInc)
				    this._undoCursor = this._undoHistory.length - 1;
		    }
	    },
	    ignoreUndo: function(func, master){
		    this._skipHistory = true;
		    func.call(master||this);
		    this._skipHistory = false;
	    },
	    removeUndo: function(id){
		    for( var i = this._undoHistory.length-1; i >=0; i--){
			    if(this._undoHistory[i].id == id){
				    if(this._undoHistory[i].action == "id"){
					    id = this._undoHistory[i].data;
				    }
				    this._undoHistory.removeAt(i);
			    }
		    }
		    this._undoCursor = this._undoHistory.length - 1;
	    },
	    undo: function(id){
		    if(id){
			    this.ignoreUndo(function(){
				    var data, i;
				    for( i = this._undoHistory.length-1; !data && i >=0; i--){
					    if(this._undoHistory[i].id == id)
						    data = this._undoHistory[i];
				    }

				    if(data){
					    /*if(data.action == "id")
						  id = data.data;*/
					    this._undoAction(data);
					    this._undoHistory.removeAt(i+1);
					    this._undoCursor = this._undoHistory.length - 1;
				    }
			    });
		    }
		    else{
			    var data = this._undoHistory[this._undoCursor];
			    if(data){
				    this.ignoreUndo(function(){
					    this._undoAction(data);
					    this._undoHistory.removeAt(this._undoCursor);
				    });
				    this._undoCursor--;
				    /*if(data.action == "id")
					  this.undo();*/
			    }
		    }
	    },
	    _undoAction: function(obj){
		    if(obj.action == "delete"){
			    var branch = null,
				    parentId = obj.data.$parent;

			    if(obj.data.$branch){
				    branch = {
					    parent: obj.id,
					    data: webix.copy(obj.data.$branch)
				    };
				    delete obj.data.$branch;
				    if(parentId && !this.data.branch[parentId])
					    parentId = 0;
			    }

			    this.add(obj.data, obj.data.$index, parentId);
			    if(branch){
				    this.parse(branch);
			    }
		    }
		    else if(obj.action == "add"){
			    this.remove(obj.id);
		    }
		    else if(obj.action == "update"){
			    this.updateItem(obj.id, obj.data);
		    }
		    else if(obj.action == "move"){
			    if(obj.data.$parent){
				    if(this.getItem(obj.data.$parent))
					    this.move(obj.id, obj.data.$index, null, {parent: obj.data.$parent});
			    }
			    else
				    this.move(obj.id, obj.data.$index);
		    }
		    /*else if(obj.action == "id"){
			  this.data.changeId(obj.id, obj.data);
		      }*/
	    }
    };

    /*
	  Behavior:DataLoader - load data in the component
	  
	  @export
	  load
	  parse
    */
    webix.DataLoader=webix.proto({
	    $init:function(config){
		    //prepare data store
		    config = config || "";
		    
		    //list of all active ajax requests
		    this._ajax_queue = webix.toArray();
		    this._feed_last = {};

		    this.data = new webix.DataStore();

		    this.data.attachEvent("onClearAll",webix.bind(this._call_onclearall,this));
		    this.data.attachEvent("onServerConfig", webix.bind(this._call_on_config, this));
		    this.attachEvent("onDestruct", this._call_onclearall);

		    this.data.feed = this._feed;
		    this.data.owner = config.id;
	    },
	    _feed:function(from,count,callback){
		    //allow only single request at same time
		    if (this._load_count)
			    return (this._load_count=[from,count,callback]);	//save last ignored request
		    else
			    this._load_count=true;
		    this._feed_last.from = from;
		    this._feed_last.count = count;
		    this._feed_common.call(this, from, count, callback);
	    },
	    _feed_common:function(from, count, callback, url, details){
		    var state = null,
			    url = url || this.data.url;

		    var final_callback = [
			    { success: this._feed_callback, error: this._feed_callback },
			    callback
		    ];

		    if (from<0) from = 0;

		    if(!details)
			    details = { start: from, count:count };

		    if(this.count())
			    details["continue"] = "true";

		    if (this.getState)
			    state = this.getState();

		    // proxy
		    if (url && typeof url != "string"){
			    if (state){
				    if (state.sort)
					    details.sort = state.sort;
				    if (state.filter)
					    details.filter = state.filter;
			    }
			    this.load(url, final_callback, details);
		    } else { // GET
			    url = url+((url.indexOf("?")==-1)?"?":"&");

			    var params = [];
			    for(var d in details){
				    params.push(d+"="+details[d]);
			    }
			    if (state){
				    if (state.sort)
					    params.push("sort["+state.sort.id+"]="+encodeURIComponent(state.sort.dir));
				    if (state.filter)
					    for (var key in state.filter){
						    var filterValue = state.filter[key];
						    if(typeof filterValue == "object")
							    filterValue = webix.ajax().stringify(filterValue); //server daterangefilter
						    params.push("filter["+key+"]="+encodeURIComponent(filterValue));
					    }
			    }

			    url += params.join("&");
			    if (this._feed_last.url !== url){
				    this._feed_last.url = url;
				    this.load(url, final_callback);
			    } else {
				    this._load_count = false;
			    }
		    }
	    },
	    _feed_callback:function(){
		    //after loading check if we have some ignored requests
		    var temp = this._load_count;
		    this._load_count = false;
		    if (typeof temp =="object")
			    this.data.feed.apply(this, temp);	//load last ignored request
	    },
	    //loads data from external URL
	    load:function(url,call){
		    var url = webix.proxy.$parse(url);
		    var ajax = webix.AtomDataLoader.load.apply(this, arguments);

		    //prepare data feed for dyn. loading
		    if (!this.data.url)
			    this.data.url = url;

		    return ajax;
	    },
	    //load next set of data rows
	    loadNext:function(count, start, callback, url, now){
		    var config = this._settings;
		    if (config.datathrottle && !now){
			    if (this._throttle_request)
				    window.clearTimeout(this._throttle_request);
			    this._throttle_request = webix.delay(function(){
				    this.loadNext(count, start, callback, url, true);
			    },this, 0, config.datathrottle);
			    return;
		    }

		    if (!start && start !== 0) start = this.count();
		    if (!count)
			    count = config.datafetch || this.count();

		    this.data.url = this.data.url || url;
		    if (this.callEvent("onDataRequest", [start,count,callback,url]) && this.data.url)
			    this.data.feed.call(this, start, count, callback);
	    },
	    _maybe_loading_already:function(count, from){
		    var last = this._feed_last;
		    if(this._load_count && last.url){
			    if (last.from<=from && (last.count+last.from >= count + from )) return true;
		    }
		    return false;
	    },
	    removeMissed_setter:function(value){
		    return (this.data._removeMissed = value);
	    },
	    //init of dataprocessor delayed after all settings processing
	    //because it need to be the last in the event processing chain
	    //to get valid validation state
	    _init_dataprocessor:function(){
		    var url = this._settings.save;

		    if (url === true)
			    url = this._settings.save = this._settings.url;

		    var obj = { master: this };
		    
		    if (url && url.url)
			    webix.extend(obj, url);
		    else
			    obj.url = url;

		    webix.dp(obj);
	    },
	    save_setter:function(value){
		    if (value)
			    this.$ready.push(this._init_dataprocessor);

		    return value;
	    },
	    scheme_setter:function(value){
		    this.data.scheme(value);
	    },
	    dataFeed_setter:function(value){
		    value = webix.proxy.$parse(value);

		    this.data.attachEvent("onBeforeFilter", webix.bind(function(text, filtervalue){
			    //complex filtering, can't be routed to dataFeed
			    if (typeof text == "function") return true;

			    //we have dataFeed and some text
			    if (this._settings.dataFeed && (text || filtervalue)){
				    text = text || "id";
				    if (filtervalue && typeof filtervalue == "object")
						filtervalue = filtervalue.id;

				    this.clearAll();
				    var url = this._settings.dataFeed;

				    //js data feed
				    if (typeof url == "function"){
					    var filter = {};
					    filter[text] = filtervalue;
					    url.call(this, filtervalue, filter);
				    } else if (url.$proxy) {
					    if (url.load){
						    var filterobj = {}; filterobj[text] = filtervalue;
						    url.load(this, {
							    success: this._onLoad,
							    error: this._onLoadError
						    }, { filter: filterobj });
					    }
				    } else {
				        //url data feed
					    var urldata = "filter["+text+"]="+encodeURIComponent(filtervalue);
					    this.load(url+(url.indexOf("?")<0?"?":"&")+urldata, this._settings.datatype);
				    }
				    return false;
			    }
		    },this));
		    return value;
	    },
	    _call_onready:function(){
		    if (this._settings.ready && !this._ready_was_used){
			    var code = webix.toFunctor(this._settings.ready, this.$scope);
			    if (code)
				    webix.delay(code, this, arguments);
			    if (this.callEvent)
				    webix.delay(this.callEvent, this, ["onReady", []]);
			    this._ready_was_used = true;
		    }
	    },
	    _call_onclearall:function(soft){
		    for (var i = 0; i < this._ajax_queue.length; i++){
			    var xhr = this._ajax_queue[i];

			    //IE9 and IE8 deny extending of ActiveX wrappers
			    try { xhr.aborted = true; } catch(e){ 
				    webix._xhr_aborted.push(xhr);
			    }
			    xhr.abort();
		    }
		    if (!soft){
			    this._load_count = false;
			    this._feed_last = {};
			    this._ajax_queue = webix.toArray();
			    this.waitData = webix.promise.defer();
		    }
	    },
	    _call_on_config:function(config){
		    this._parseSeetingColl(config);
	    }
    },webix.AtomDataLoader);

    //ie8 compatibility
    webix._xhr_aborted = webix.toArray();

    webix.DataMarks = {
	    addCss:function(id, css, silent){
		    if (!this.addRowCss && !silent){
			    if (!this.hasCss(id, css)){
				    var node = this.getItemNode(id);
				    if (node){
					    node.className += " "+css;
					    silent = true;
				    }
			    }
		    }
		    return this.data.addMark(id, css, 1, 1, silent);
	    },
	    removeCss:function(id, css, silent){
		    if (!this.addRowCss && !silent){
			    if (this.hasCss(id, css)){
				    var node = this.getItemNode(id);
				    if (node){
					    node.className = node.className.replace(css,"").replace("  "," ");
					    silent = true;
				    }
			    }
		    }
		    return this.data.removeMark(id, css, 1, silent);
	    },
	    hasCss:function(id, mark){
		    return this.data.getMark(id, mark);
	    },
	    clearCss:function(css, silent){
		    return this.data.clearMark(css, 1, silent);
	    }
    };

    /*
	  DataStore is not a behavior, it standalone object, which represents collection of data.
	  Call provideAPI to map data API

	  @export
	  exists
	  getIdByIndex
	  getIndexById
	  get
	  set
	  refresh
	  count
	  sort
	  filter
	  next
	  previous
	  clearAll
	  first
	  last
    */
    webix.DataStore = function(){
	    this.name = "DataStore";
	    
	    webix.extend(this, webix.EventSystem);

	    this.setDriver("json");	//default data source is an
	    this.pull = {};						//hash of IDs
	    this.order = webix.toArray();		//order of IDs
	    this._marks = {};
    };

    webix.DataStore.prototype={
	    //defines type of used data driver
	    //data driver is an abstraction other different data formats - xml, json, csv, etc.
	    setDriver:function(type){
		    webix.assert(webix.DataDriver[type],"incorrect DataDriver");
		    this.driver = webix.DataDriver[type];
	    },
	    //process incoming raw data
	    _parse:function(data,master){
		    this.callEvent("onParse", [this.driver, data]);

		    if (this._filter_order)
			    this.filter();
	        
		    //get size and position of data
		    var info = this.driver.getInfo(data);

		    //generated by connectors only
		    if (info.key)
			    webix.securityKey = info.key;

		    if (info.config)
			    this.callEvent("onServerConfig",[info.config]);

		    var options = this.driver.getOptions(data);
		    if (options)
			    this.callEvent("onServerOptions", [options]);

		    //get array of records
		    var recs = this.driver.getRecords(data);

		    this._inner_parse(info, recs);

		    //in case of tree store we may want to group data
		    if (this._scheme_group && this._group_processing && !this._not_grouped_order)
			    this._group_processing(this._scheme_group);

		    //optional data sorting
		    if (this._scheme_sort){
			    this.blockEvent();
			    this.sort(this._scheme_sort);
			    this.unblockEvent();
		    }

		    this.callEvent("onStoreLoad",[this.driver, data]);
		    //repaint self after data loading
		    this.refresh();
	    },
	    _inner_parse:function(info, recs){
		    var from = (info.from||0)*1;
		    var subload = true;
		    var marks = false;

		    if (from === 0 && this.order[0] && this.order[this.order.length-1]){ //update mode
			    if (this._removeMissed){
				    //update mode, create kill list
				    marks = {};
				    for (var i=0; i<this.order.length; i++)
					    marks[this.order[i]]=true;
			    }
			    
			    subload = false;
			    from = this.order.length;
		    }

		    var j=0;
		    for (var i=0; i<recs.length; i++){
			    //get hash of details for each record
			    var temp = this.driver.getDetails(recs[i]);
			    var id = this.id(temp); 	//generate ID for the record
			    if (!this.pull[id]){		//if such ID already exists - update instead of insert
				    this.order[j+from]=id;	
				    j++;
			    } else if (subload && this.order[j+from])
				    j++;

			    if(this.pull[id]){
				    webix.extend(this.pull[id],temp,true);//add only new properties
				    if (this._scheme_update)
					    this._scheme_update(this.pull[id]);
				    //update mode, remove item from kill list
				    if (marks)
					    delete marks[id];
			    } else{
				    this.pull[id] = temp;
				    if (this._scheme_init)
					    this._scheme_init(temp);
			    }
			    
		    }

		    //update mode, delete items which are not existing in the new xml
		    if (marks){
			    this.blockEvent();
			    for (var delid in marks)
				    this.remove(delid);
			    this.unblockEvent();
		    }

		    if (!this.order[info.size-1])
			    this.order[info.size-1] = webix.undefined;
	    },
	    //generate id for data object
	    id:function(data){
		    return data.id||(data.id=webix.uid());
	    },
	    changeId:function(old, newid){
		    //webix.assert(this.pull[old],"Can't change id, for non existing item: "+old);
		    if(this.pull[old])
			    this.pull[newid] = this.pull[old];
		    
		    this.pull[newid].id = newid;
		    this.order[this.order.find(old)]=newid;
		    if (this._filter_order)
			    this._filter_order[this._filter_order.find(old)]=newid;
		    if (this._marks[old]){
			    this._marks[newid] = this._marks[old];
			    delete this._marks[old];
		    }


		    this.callEvent("onIdChange", [old, newid]);
		    if (this._render_change_id)
			    this._render_change_id(old, newid);
		    delete this.pull[old];
	    },
	    //get data from hash by id
	    getItem:function(id){
		    return this.pull[id];
	    },
	    //assigns data by id
	    updateItem:function(id, update, mode){
		    var data = this.getItem(id);
		    var old = null;

		    //check is change tracking active
		    var changeTrack = this.hasEvent("onDataUpdate");
	        
		    webix.assert(data, "Ivalid ID for updateItem");
		    webix.assert(!update || !update.id || update.id == id, "Attempt to change ID in updateItem");
		    if (!webix.isUndefined(update) && data !== update){
			    //preserve original object
			    if (changeTrack)
				    old = webix.copy(data);

			    id = data.id;	//preserve id
			    webix.extend(data, update, true);
			    data.id = id;
		    }

		    if (this._scheme_update)
			    this._scheme_update(data);

		    this.callEvent("onStoreUpdated",[id.toString(), data, (mode||"update")]);

		    if (changeTrack)
			    this.callEvent("onDataUpdate", [id, data, old]);
	    },
	    //sends repainting signal
	    refresh:function(id){
		    if (this._skip_refresh) return; 
		    
		    if (id){
			    if (this.exists(id))
				    this.callEvent("onStoreUpdated",[id, this.pull[id], "paint"]);
		    }else
			    this.callEvent("onStoreUpdated",[null,null,null]);
	    },
	    silent:function(code, master){
		    this._skip_refresh = true;
		    code.call(master||this);
		    this._skip_refresh = false;
	    },
	    //converts range IDs to array of all IDs between them
	    getRange:function(from,to){		
		    //if some point is not defined - use first or last id
		    //BEWARE - do not use empty or null ID
		    if (from)
			    from = this.getIndexById(from);
		    else 
			    from = (this.$min||this.startOffset)||0;
		    if (to)
			    to = this.getIndexById(to);
		    else {
			    to = this.$max === 0 ? 0 : Math.min((this.$max?this.$max-1:(this.endOffset||Infinity)),(this.count()-1));
			    if (to<0) to = 0; //we have not data in the store
		    }

		    if (from>to){ //can be in case of backward shift-selection
			    var a=to; to=from; from=a;
		    }

		    return this.getIndexRange(from,to);
	    },
	    //converts range of indexes to array of all IDs between them
	    getIndexRange:function(from,to){
		    to=Math.min((to === 0 ? 0 :(to||Infinity)),this.count()-1);
		    
		    var ret=webix.toArray(); //result of method is rich-array
		    for (var i=(from||0); i <= to; i++)
			    ret.push(this.getItem(this.order[i]));
		    return ret;
	    },
	    //returns total count of elements
	    count:function(){
		    return this.order.length;
	    },
	    //returns truy if item with such ID exists
	    exists:function(id){
		    return !!(this.pull[id]);
	    },
	    //nextmethod is not visible on component level, check DataMove.move
	    //moves item from source index to the target index
	    move:function(sindex,tindex){
		    webix.assert(sindex>=0 && tindex>=0, "DataStore::move","Incorrect indexes");
		    if (sindex == tindex) return;

		    var id = this.getIdByIndex(sindex);
		    var obj = this.getItem(id);

		    if (this._filter_order)
			    this._move_inner(this._filter_order, 0, 0, this.getIdByIndex(sindex), this.getIdByIndex(tindex));

		    this._move_inner(this.order, sindex, tindex);
		    
		    
		    //repaint signal
		    this.callEvent("onStoreUpdated",[id,obj,"move"]);
	    },
	    _move_inner:function(col, sindex, tindex, sid, tid){
		    if (sid||tid){
			    sindex = tindex = -1;
			    for (var i=0; i<col.length; i++){
				    if (col[i] == sid && sindex<0)
					    sindex = i;
				    if (col[i] == tid && tindex<0)
					    tindex = i;
			    }
		    }
		    var id = col[sindex];
		    col.removeAt(sindex);	//remove at old position
		    col.insertAt(id,Math.min(col.length, tindex));	//insert at new position
	    },
	    scheme:function(config){
		    this._scheme = {};
		    this._scheme_save = config.$save;
		    this._scheme_init = config.$init||config.$change;
		    this._scheme_update = config.$update||config.$change;
		    this._scheme_serialize = config.$serialize;
		    this._scheme_group = config.$group;
		    this._scheme_sort = config.$sort;

		    //ignore $-starting properties, as they have special meaning
		    for (var key in config)
			    if (key.substr(0,1) != "$")
				    this._scheme[key] = config[key];
	    },
	    importData:function(target, silent){
		    var data = target ? (target.data || target) : [];
		    this._filter_order = null;

		    if (typeof data.serialize == "function"){
			    this.order = webix.toArray([].concat(data.order));

			    //make full copy, to preserve object properties
			    //[WE-CAN-DO-BETTER]
			    if (this._make_full_copy){
				    this._make_full_copy = false;
				    this.pull = {};
				    for (var key in data.pull)
					    this.pull[key] = webix.copy(data.pull[key]);
			    }
			    else
				    this.pull = data.pull;

			    if (data.branch && this.branch){
				    this.branch = webix.copy(data.branch);
				    this._filter_branch = null;
			    }

		    } else {
			    this.order = webix.toArray();
			    this.pull = {};
			    var id, obj;

			    if (webix.isArray(target))
				    for (var key=0; key<target.length; key++){
					    obj = id = target[key];
					    if (typeof obj == "object")
						    obj.id  = obj.id || webix.uid();
					    else
						    obj = { id:id, value:id };

					    this.order.push(obj.id);
					    if (this._scheme_init)
						    this._scheme_init(obj);
					    this.pull[obj.id] = obj;
				    }
			    else
				    for (var key in data){
					    this.order.push(key);
					    this.pull[key] = { id:key, value: data[key] };
				    }
		    }
		    if (this._extraParser && !data.branch){
			    this.branch = { 0:[]};
			    if (!this._datadriver_child)
				    this._set_child_scheme("data");

			    for (var i = 0; i<this.order.length; i++){
				    var key = this.order[i];
				    this._extraParser(this.pull[key], 0, 0, false);
			    }
		    }

		    this.callEvent("onStoreLoad",[]);
		    if (!silent)
			    this.callEvent("onStoreUpdated",[]);
	    },
	    sync:function(source, filter, silent){
		    this.unsync();

		    var type = typeof source;
		    if (type == "string")
			    source = webix.$$("source");

		    if (type != "function" && type != "object"){
			    silent = filter;
			    filter = null;
		    }
		    
		    if (webix.debug_bind){
			    this.debug_sync_master = source; 
			    webix.log("[sync] "+this.debug_bind_master.name+"@"+this.debug_bind_master._settings.id+" <= "+this.debug_sync_master.name+"@"+this.debug_sync_master._settings.id);
		    }

		    if (source.name != "DataStore"){
			    if (source.data && (source.data.name === "DataStore" || source.data.name === "TreeStore"))
				    source = source.data;
			    else {
				    this._sync_source = source;
				    return webix.callEvent("onSyncUnknown", [this, source, filter]);
			    }
		    }

		    var	sync_logic = webix.bind(function(mode, record, data){
			    if (this._skip_next_sync) return;

			    //sync of tree-structure with after-filtering
			    //we need to make a full copy, to preserve $count
			    //[WE-CAN-DO-BETTER]
			    if (filter && this.branch) this._make_full_copy = true;
			    this.importData(source, true);
			    
			    if (filter)
				    this.silent(filter);
			    if (this._on_sync)
				    this._on_sync();
			    if (this._make_full_copy){

			    }

			    if (webix.debug_bind)
				    webix.log("[sync:request] "+this.debug_sync_master.name+"@"+this.debug_sync_master._settings.id + " <= "+this.debug_bind_master.name+"@"+this.debug_bind_master._settings.id);

			    this.callEvent("onSyncApply",[]);

			    if (!silent) 
				    this.refresh();
			    else
				    silent = false;
		    }, this);



		    this._sync_events = [
			    source.attachEvent("onStoreUpdated", sync_logic),
			    source.attachEvent("onIdChange", webix.bind(function(old, nid){ this.changeId(old, nid); this.refresh(nid); }, this))
		    ];
		    this._sync_source = source;

		    //backward data saving
		    this._back_sync_handler = this.attachEvent("onStoreUpdated", function(id, data, mode){
			    if (mode == "update" || mode == "save"){
				    this._skip_next_sync = 1;
				    source.updateItem(id, data);
				    this._skip_next_sync = 0;
			    }
		    });

		    sync_logic();
	    },
	    unsync:function(){
		    if (this._sync_source){
			    var source = this._sync_source;

			    if (source.name != "DataStore" &&
					(!source.data || source.data.name != "DataStore")){
				    //data sync with external component
				    webix.callEvent("onUnSyncUnknown", [this, source]);
			    } else {
				    //data sync with webix component
				    for (var i = 0; i < this._sync_events.length; i++)
					    source.detachEvent(this._sync_events[i]);
				    this.detachEvent(this._back_sync_handler);
			    }

			    this._sync_source = null;
		    }
	    },
	    destructor:function(){
		    this.unsync();

		    this.pull = this.order = this._marks = null;
		    this._evs_events = this._evs_handlers = {};
	    },
	    //adds item to the store
	    add:function(obj,index){
		    //default values		
		    if (this._scheme)
			    for (var key in this._scheme)
				    if (webix.isUndefined(obj[key]))
					    obj[key] = this._scheme[key];
		    
		    if (this._scheme_init)
			    this._scheme_init(obj);
		    
		    //generate id for the item
		    var id = this.id(obj);

		    //in case of treetable order is sent as 3rd parameter
		    var order = arguments[2]||this.order;
		    
		    //by default item is added to the end of the list
		    var data_size = order.length;
		    
		    if (webix.isUndefined(index) || index < 0)
			    index = data_size; 
		    //check to prevent too big indexes			
		    if (index > data_size){
			    webix.log("Warning","DataStore:add","Index of out of bounds");
			    index = Math.min(order.length,index);
		    }
		    if (this.callEvent("onBeforeAdd", [id, obj, index]) === false) return false;

		    webix.assert(!this.exists(id), "Not unique ID");
		    
		    this.pull[id]=obj;
		    order.insertAt(id,index);
		    if (this._filter_order){	//adding during filtering
			    //we can't know the location of new item in full dataset, making suggestion
			    //put at end of original dataset by default
			    var original_index = this._filter_order.length;
			    //if some data exists, put at the same position in original and filtered lists
			    if (this.order.length)
				    original_index = Math.min((index || 0), original_index);

			    this._filter_order.insertAt(id,original_index);
		    }
		    
		    //repaint signal
		    this.callEvent("onStoreUpdated",[id,obj,"add"]);
		    this.callEvent("onAfterAdd",[id,index]);

		    return obj.id;
	    },
	    
	    //removes element from datastore
	    remove:function(id){
		    //id can be an array of IDs - result of getSelect, for example
		    if (webix.isArray(id)){
			    for (var i=0; i < id.length; i++)
				    this.remove(id[i]);
			    return;
		    }
		    if (this.callEvent("onBeforeDelete",[id]) === false) return false;
		    
		    webix.assert(this.exists(id), "Not existing ID in remove command"+id);

		    var obj = this.getItem(id);	//save for later event
		    //clear from collections
		    this.order.remove(id);
		    if (this._filter_order) 
			    this._filter_order.remove(id);
			
		    delete this.pull[id];
		    if (this._marks[id])
			    delete this._marks[id];

		    //repaint signal
		    this.callEvent("onStoreUpdated",[id,obj,"delete"]);
		    this.callEvent("onAfterDelete",[id]);
	    },
	    //deletes all records in datastore
	    clearAll:function(soft){
		    //instead of deleting one by one - just reset inner collections
		    this.pull = {};
		    this._marks = {};
		    this.order = webix.toArray();
		    //this.feed = null;
		    this._filter_order = null;
		    if (!soft)
			    this.url = null;
		    this.callEvent("onClearAll",[soft]);
		    this.refresh();
	    },
	    //converts id to index
	    getIdByIndex:function(index){
		    webix.assert(index >= 0,"DataStore::getIdByIndex Incorrect index");
		    return this.order[index];
	    },
	    //converts index to id
	    getIndexById:function(id){
		    var res = this.order.find(id);	//slower than getIdByIndex
		    if (!this.pull[id])
			    return -1;
			
		    return res;
	    },
	    //returns ID of next element
	    getNextId:function(id,step){
		    return this.order[this.getIndexById(id)+(step||1)];
	    },
	    //returns ID of first element
	    getFirstId:function(){
		    return this.order[0];
	    },
	    //returns ID of last element
	    getLastId:function(){
		    return this.order[this.order.length-1];
	    },
	    //returns ID of previous element
	    getPrevId:function(id,step){
		    return this.order[this.getIndexById(id)-(step||1)];
	    },
	    /*
		  sort data in collection
		  by - settings of sorting
		  
		  or
		  
		  by - sorting function
		  dir - "asc" or "desc"
		  
		  or
		  
		  by - property
		  dir - "asc" or "desc"
		  as - type of sortings
		  
		  Sorting function will accept 2 parameters and must return 1,0,-1, based on desired order
	    */
	    sort:function(by, dir, as){
		    var sort = by;	
		    if (typeof by == "function")
			    sort = {as:by, dir:dir};
		    else if (typeof by == "string")
			    sort = {by:by.replace(/#/g,""), dir:dir, as:as};

		    
		    var parameters = [sort.by, sort.dir, sort.as, sort];
		    if (!this.callEvent("onBeforeSort",parameters)) return;	
		    
		    this.order = this._sort_core(sort, this.order);
		    if (this._filter_order && this._filter_order.length != this.order.length)
			    this._filter_order = this._sort_core(sort, this._filter_order);
		    
		    //repaint self
		    this.refresh();
		    
		    this.callEvent("onAfterSort",parameters);
	    },
	    _sort_core:function(sort, order){
		    var sorter = this.sorting.create(sort);
		    if (this.order.length){
			    var pre = order.splice(0, this.$freeze);
			    //get array of IDs
			    var neworder = webix.toArray();
			    for (var i=order.length-1; i>=0; i--)
				    neworder[i] = this.pull[order[i]];
			    
			    neworder.sort(sorter);
			    return webix.toArray(pre.concat(neworder.map(function(obj){ 
				    webix.assert(obj, "Client sorting can't be used with dynamic loading");
				    return this.id(obj);
			    },this)));
		    }
		    return order;
	    },
	    /*
		  Filter datasource
		  
		  text - property, by which filter
		  value - filter mask
		  
		  or
		  
		  text  - filter method
		  
		  Filter method will receive data object and must return true or false
	    */
	    _filter_reset:function(preserve){
		    //remove previous filtering , if any
		    if (this._filter_order && !preserve){
			    this.order = this._filter_order;
			    delete this._filter_order;
		    }
	    },
	    _filter_core:function(filter, value, preserve){
		    var neworder = webix.toArray();
		    var freeze = this.$freeze || 0;
		    
		    for (var i=0; i < this.order.length; i++){
			    var id = this.order[i];
			    if (i < freeze || filter(this.getItem(id),value))
				    neworder.push(id);
		    }
		    //set new order of items, store original
		    if (!preserve ||  !this._filter_order)
			    this._filter_order = this.order;
		    this.order = neworder;
	    },
	    find:function(config, first){
		    var result = [];

		    for(var i in this.pull){
			    var data = this.pull[i];

			    var match = true;
			    if (typeof config == "object"){
				    for (var key in config)
					    if (data[key] != config[key]){
						    match = false;
						    break;
					    }
			    } else if (!config(data))
				    match = false;

			    if (match)
				    result.push(data);
			    
			    if (first && result.length)
				    return result[0];
		    }

		    return result;
	    },
	    filter:function(text,value,preserve){
		    //unfilter call but we already in not-filtered state
		    if (!text && !this._filter_order && !this._filter_branch) return;
		    if (!this.callEvent("onBeforeFilter", [text, value])) return;
		    
		    this._filter_reset(preserve);
		    if (!this.order.length) return;
		    
		    //if text not define -just unfilter previous state and exit
		    if (text){
			    var filter = text;
			    value = value||"";
			    if (typeof text == "string"){
				    text = text.replace(/#/g,"");
				    if (typeof value == "function")
					    filter = function(obj){
						    return value(obj[text]);
					    };
				    else{
					    value = value.toString().toLowerCase();
					    filter = function(obj,value){	//default filter - string start from, case in-sensitive
						    webix.assert(obj, "Client side filtering can't be used with dynamic loading");
						    return (obj[text]||"").toString().toLowerCase().indexOf(value)!=-1;
					    };
				    }
			    }
			    
			    this._filter_core(filter, value, preserve, this._filterMode);
		    }
		    //repaint self
		    this.refresh();
		    
		    this.callEvent("onAfterFilter", []);
	    },
	    /*
		  Iterate through collection
	    */
	    _obj_array:function(){
		    var data = [];
		    for (var i = this.order.length - 1; i >= 0; i--)
			    data[i]=this.pull[this.order[i]];

		    return data;
	    },
	    each:function(method, master, all){
		    var order = this.order;
		    if (all)
			    order = this._filter_order || order;

		    for (var i=0; i<order.length; i++)
			    method.call((master||this), this.getItem(order[i]), i);
	    },
	    _methodPush:function(object,method){
		    return function(){ return object[method].apply(object,arguments); };
	    },
	    /*
		  map inner methods to some distant object
	    */
	    provideApi:function(target,eventable){
		    this.debug_bind_master = target;
			
		    if (eventable){
			    this.mapEvent({
				    onbeforesort:	target,
				    onaftersort:	target,
				    onbeforeadd:	target,
				    onafteradd:		target,
				    onbeforedelete:	target,
				    onafterdelete:	target,
				    ondataupdate:	target/*,
				                            onafterfilter:	target,
				                            onbeforefilter:	target*/
			    });
		    }
			
		    var list = ["sort","add","remove","exists","getIdByIndex","getIndexById","getItem","updateItem","refresh","count","filter","find","getNextId","getPrevId","clearAll","getFirstId","getLastId","serialize","sync"];
		    for (var i=0; i < list.length; i++)
			    target[list[i]] = this._methodPush(this,list[i]);
	    },
	    addMark:function(id, mark, css, value, silent){
		    var obj = this._marks[id]||{};
		    this._marks[id] = obj;
		    if (!obj[mark]){
			    obj[mark] = value||true;	
			    if (css){
				    var old_css = obj.$css||"";
				    obj.$css = old_css+" "+mark;
			    }
			    if (!silent)
				    this.refresh(id);
		    }
		    return obj[mark];
	    },
	    removeMark:function(id, mark, css, silent){
		    var obj = this._marks[id];
		    if (obj){
			    if (obj[mark])
				    delete obj[mark];
			    if (css){
				    var current_css = obj.$css;
				    if (current_css){
					    obj.$css = current_css.replace(mark, "").replace("  "," ");
				    }
			    }
			    if (!silent) 
				    this.refresh(id);
		    }
	    },
	    getMark:function(id, mark){
		    var obj = this._marks[id];
		    return (obj?obj[mark]:false);
	    },
	    clearMark:function(name, css, silent){
		    for (var id in this._marks){
			    var obj = this._marks[id];
			    if (obj[name]){
				    delete obj[name];
				    if (css && obj.$css)
					    obj.$css = obj.$css.replace(name, "").replace("  "," ");
				    if (!silent)
					    this.refresh(id);
			    }
		    }
	    },	
	    /*
		  serializes data to a json object
	    */
	    serialize: function(all){
		    var ids = this.order;
		    if (all && this._filter_order)
			    ids = this._filter_order;

		    var result = [];
		    for(var i=0; i< ids.length;i++) {
			    var el = this.pull[ids[i]];
			    if (this._scheme_serialize){
				    el = this._scheme_serialize(el);
				    if (el===false) continue;
			    }
			    result.push(el);
		    }
		    return result;
	    },
	    sorting:{
		    create:function(config){
			    return this._dir(config.dir, this._by(config.by, config.as));
		    },
		    as:{
			    //handled by dataFeed
			    "server":function(){
				    return false;
			    },
			    "date":function(a,b){
				    a=a-0; b=b-0;
				    return a>b?1:(a<b?-1:0);
			    },
			    "int":function(a,b){
				    a = a*1; b=b*1;
				    return a>b?1:(a<b?-1:0);
			    },
			    "string_strict":function(a,b){
				    a = a.toString(); b=b.toString();
				    return a>b?1:(a<b?-1:0);
			    },
			    "string":function(a,b){
				    if (!b) return 1;
				    if (!a) return -1;
				    
				    a = a.toString().toLowerCase(); b=b.toString().toLowerCase();
				    return a>b?1:(a<b?-1:0);
			    },
			    "raw":function(a,b){
				    return a>b?1:(a<b?-1:0);
			    }
		    },
		    _by:function(prop, method){
			    if (!prop)
				    return method;
			    if (typeof method != "function")
				    method = this.as[method||"string"];

			    webix.assert(method, "Invalid sorting method");
			    return function(a,b){
				    return method(a[prop],b[prop]);
			    };
		    },
		    _dir:function(prop, method){
			    if (prop == "asc" || !prop)
				    return method;
			    return function(a,b){
				    return method(a,b)*-1;
			    };
		    }
	    }
    };


    webix.DataCollection = webix.proto({
	    name:"DataCollection",
	    isVisible:function(){ 
		    if (!this.data.order.length && !this.data._filter_order && !this._settings.dataFeed) return false;
		    return true; 
	    },
	    $init:function(config){
		    this.data.provideApi(this, true);
		    var id = (config&&config.id)?config.id:webix.uid();
		    this._settings.id =id;
		    webix.ui.views[id] = this;
		    this.data.attachEvent("onStoreLoad", webix.bind(function(){
			    this.callEvent("onBindRequest",[]);
		    }, this));
	    },
	    refresh:function(){ this.callEvent("onBindRequest",[]); }
    }, webix.DataMove, webix.CollectionBind, webix.BindSource, webix.ValidateCollection, webix.DataLoader, webix.MapCollection, webix.EventSystem, webix.BaseBind, webix.Destruction, webix.Settings);






    webix.Scrollable = {
	    $init:function(config){
		    //do not spam unwanted scroll containers for templates 
		    if (config && !config.scroll && this._one_time_scroll) 
			    return (this._dataobj = (this._dataobj||this._contentobj));
		    
		    (this._dataobj||this._contentobj).appendChild(webix.html.create("DIV",{ "class" : "webix_scroll_cont" },""));
		    this._dataobj=(this._dataobj||this._contentobj).firstChild;

		    if(!webix.env.touch)
			    webix._event(this._viewobj,"scroll", webix.bind(function(e){
				    if(this.callEvent)
					    webix.delay(function(){
						    this.callEvent("onAfterScroll", []);
					    }, this);
			    },this));
	    },
	    /*defaults:{
		  scroll:true
	      },*/
	    scroll_setter:function(value){
		    if (!value) return false;
		    var marker =  (value=="x"?"x":(value=="xy"?"xy":(value=="a"?"xy":"y")));
		    if (webix.Touch && webix.Touch.$active){
			    this._dataobj.setAttribute("touch_scroll",marker);
			    if (this.attachEvent)
				    this.attachEvent("onAfterRender", webix.bind(this._refresh_scroll,this));
			    this._touch_scroll = true;
		    } else {
			    if (webix.env.$customScroll){
				    webix.CustomScroll.enable(this, marker);
			    } else {
				    var node = this._dataobj.parentNode.style;
				    if (value.toString().indexOf("a")!=-1){
					    node.overflowX = node.overflowY = "auto";
				    } else {
					    if (marker.indexOf("x")!=-1){
						    this._scroll_x = true;
						    node.overflowX = "scroll";
					    }
					    if (marker.indexOf("y")!=-1){
						    this._scroll_y = true;
						    node.overflowY = "scroll";
					    }
				    }
			    }
		    }
		    return marker;
	    },
	    _onoff_scroll:function(mode){
		    if (!!this._settings.scroll == !!mode) return;

		    if (!webix.env.$customScroll){
			    var style = this._dataobj.parentNode.style;
			    style.overflowX = style.overflowY = mode?"auto":"hidden";
		    }

		    this._scroll_x = this._scroll_y = !!mode;
		    this._settings.scroll = !!mode;
	    },
	    getScrollState:function(){
		    if (webix.Touch && webix.Touch.$active){
			    var temp = webix.Touch._get_matrix(this._dataobj);
			    return { x : -temp.e, y : -temp.f };
		    } else
			    return { x : this._dataobj.parentNode.scrollLeft, y : this._dataobj.parentNode.scrollTop };
	    },
	    scrollTo:function(x,y){
		    if (webix.Touch && webix.Touch.$active){
			    y = Math.max(0, Math.min(y, this._dataobj.offsetHeight - this._content_height));
			    x = Math.max(0, Math.min(x, this._dataobj.offsetWidth - this._content_width));
			    webix.Touch._set_matrix(this._dataobj, -x, -y, this._settings.scrollSpeed||"100ms");
		    } else {
			    this._dataobj.parentNode.scrollLeft=x;
			    this._dataobj.parentNode.scrollTop=y;
		    }
	    },
	    _refresh_scroll:function(){
		    if (this._settings.scroll.toString().indexOf("x")!=-1){
			    var x =  this._dataobj.scrollWidth;
			    if (x){ //in hidden state we will have a Zero scrollWidth
				    this._dataobj.style.width = "100%";
				    this._dataobj.style.width = this._dataobj.scrollWidth + "px";
			    }
		    }
			
		    if(webix.Touch && webix.Touch.$active && this._touch_scroll){
			    webix.Touch._clear_artefacts();
			    webix.Touch._scroll_end();
			    var s = this.getScrollState();
			    var dx = this._dataobj.offsetWidth - this.$width - s.x;
			    var dy = this._dataobj.offsetHeight - this.$height - s.y;

			    //if current scroll is outside of data area
			    if(dx<0 || dy < 0){
				    //scroll to the end of data area
				    var x = (dx<0?Math.min(-dx - s.x,0):- s.x);
				    var y = (dy<0?Math.min(-dy - s.y,0):- s.y);
				    webix.Touch._set_matrix(this._dataobj, x, y, 0);
			    }
		    }
	    }
    };


    webix.locale.pager = {
	    first: " &lt;&lt; ",
	    last: " &gt;&gt; ",
	    next: " &gt; ",
	    prev: " &lt; "
    };


    webix.PagingAbility = {
	    pager_setter:function(pager){
		    if (typeof pager == "string"){
			    var ui_pager = webix.$$(pager);
			    if (!ui_pager){
				    this.$blockRender = true;
				    webix.delay(function(){
					    var obj = webix.$$(pager);

					    this._settings.pager = this.pager_setter(obj);
					    var s = obj._settings;
					    s.count = this.data._count_pager_total(s.level);
					    obj.refresh();

					    this.$blockRender = false;
					    this.render();
				    }, this);
				    return null;
			    }
			    pager = ui_pager;
		    }

		    function check_pager_sizes(repeat){
			    if (pager.config.autosize && this.getVisibleCount){
				    var count = this.getVisibleCount();
				    if (isNaN(count)){
					    pager.config.size = 1;
					    webix.delay(check_pager_sizes, this, [true]);
				    } else if (count != pager.config.size){
					    pager.config.size = count;
					    pager.refresh();
					    if (repeat === true)
						    this.refresh();
				    }
			    }
			    
			    var s = this._settings.pager;
			    //initial value of pager = -1, waiting for real value
			    if (s.page == -1) return false;	
			    
			    this.data.$min = this._count_pager_index(0, s.page*s.size);	//affect data.getRange
			    this.data.$max = this._count_pager_index(this.data.$min, s.size);
			    this.data.$pagesize = this.data.$max - this.data.$min;

			    return true;
		    }

		    this.attachEvent("onBeforeRender",check_pager_sizes);

		    if (!pager.$view){
			    pager.view = "pager";
			    pager = webix.ui(pager);
		    }
		    this._pager = pager;
		    pager.$master = this;

		    this.data.attachEvent("onStoreUpdated", function(){
			    var s = pager._settings;
			    s.count = this._count_pager_total(s.level);
			    pager.refresh();
		    });
		    this.data._count_pager_total = this._count_pager_total;

		    return pager._settings;
	    },
	    _count_pager_total:function(level){
		    if (level && level !== 0){
			    var count = 0; 
			    this.each(function(obj){
				    if (obj.$level == level) count++;
			    });
			    return count;
		    } else
			    return this.count();
	    },
	    _count_pager_index:function(start, count){
		    var s = this._settings.pager;

		    if (s.level && s.level !== 0){
			    var end = start;
			    var max = this.data.order.length;

			    if (count)
				    while (end < max){
					    if (this.data.getItem(this.data.order[end]).$level == s.level){
						    if (count === 0)
							    break;
						    else
							    count--;
					    }
					    end++;
				    }

			    return end;
		    } else
			    return start+count;
	    },
	    setPage:function(value){
		    if (this._pager)
			    this._pager.select(value);
	    },
	    getPage:function(){
		    return this._pager._settings.page;
	    },
	    getPager:function(){
		    return this._pager;
	    }
    };
    /*
	  Behavior: AutoTooltip - links tooltip to data driven item
    */

    /*
	  UI: Tooltip
	  
	  @export
	  show
	  hide
    */




	


    webix.AutoTooltip = {
	    tooltip_setter:function(value){
		    if (value){
			    if (typeof value == "function")
				    value = { template:value };

			    var col_mode = !value.template;
			    var t = new webix.ui.tooltip(value);
			    this._enable_mouse_move();
			    var showEvent = this.attachEvent("onMouseMove",function(id,e){	//show tooltip on mousemove
				    this._mouseEventX = e.clientX;
				    this._mouseEventY = e.clientY;
				    if (this.getColumnConfig){
					    var config = t.type.column = this.getColumnConfig(id.column);
					    if (col_mode){
						    //empty tooltip - ignoring
						    if (!config.tooltip && config.tooltip != webix.undefined)
							    return;
						    var trg = e.target || e.srcElements;

						    if(trg.getAttribute("webix_area") && config.tooltip){
							    var area = trg.getAttribute("webix_area");
							    t.type.template = function(obj,common){
								    var values = obj[common.column.id];
								    return webix.template(config.tooltip).call(this,obj,common,values[area],area);
							    };
						    }
						    else{
							    if (config.tooltip)
								    t.type.template = config.tooltip = webix.template(config.tooltip);
							    else {
								    var text = this.getText(id.row, id.column);
								    t.type.template = function(){ return text; };
							    }
						    }
					    }
				    }

				    if (!webix.DragControl.active)
					    t.show(this.getItem(id),webix.html.pos(e));
			    });
			    // [[IMPROVE]]  As we can can have only one instance of tooltip per page 
			    //				this handler can be attached once per page, not once per component
			    var hideEvent = webix.event(document.body, "mousemove", webix.bind(function(e){
				    e = e||event;
				    if(this._mouseEventX != e.clientX || this._mouseEventY != e.clientY)
					    t.hide();
			    },this));
			    this.attachEvent("onDestruct",function(){
				    if(this.config.tooltip)
					    this.config.tooltip.destructor();
			    });
			    this.attachEvent("onAfterScroll", function(){
				    t.hide();
			    });
			    t.attachEvent("onDestruct",webix.bind(function(){
				    this.detachEvent(showEvent);
				    webix.eventRemove(hideEvent);
			    },this));
			    return t;
		    }
	    }
    };

    webix.protoUI({
	    name:"proto",
	    $init:function(){
		    this.data.provideApi(this, true);
		    this._dataobj = this._dataobj || this._contentobj;
		    
		    //render self , each time when data is updated
		    this.data.attachEvent("onStoreUpdated",webix.bind(function(){
			    this.render.apply(this,arguments);
		    },this));
	    },
	    $setSize:function(){
		    if (webix.ui.view.prototype.$setSize.apply(this, arguments))
			    this.render();
	    },
	    _id:"webix_item",
	    on_mouse_move:{
	    },
	    type:{}
    }, webix.PagingAbility, webix.DataMarks, webix.AutoTooltip,webix.ValidateCollection,webix.RenderStack, webix.DataLoader, webix.ui.view, webix.EventSystem, webix.Settings);

    webix.CodeParser = {
	    //converts a complex object into an object with primitives properties
	    collapseNames:function(base, prefix, data){
		    data = data || {};
		    prefix = prefix || "";

		    if(!base || typeof base != "object")
			    return null;

		    for(var prop in base){
			    if(base[prop] && typeof base[prop] == "object" && !webix.isDate(base[prop]) && !webix.isArray(base[prop])){
				    webix.CodeParser.collapseNames(base[prop], prefix+prop+".", data);
			    } else {
				    data[prefix+prop] = base[prop];
			    }
		    }
		    return data;
	    },
	    //converts an object with primitive properties into an object with complex properties
	    expandNames:function(base){
		    var data = {},
			    i, lastIndex, name, obj, prop;

		    for(prop in base){
			    name = prop.split(".");
			    lastIndex = name.length-1;
			    obj = data;
			    for( i =0; i < lastIndex; i++ ){
				    if(!obj[name[i]])
					    obj[name[i]]  = {};
				    obj = obj[name[i]];
			    }
			    obj[name[lastIndex]] = base[prop];
		    }

		    return data;
	    }
    };

    webix.Values = {
	    $init:function(){
		    this.elements = {};
	    },
	    focus:function(name){
		    if (name){
			    webix.assert(this.elements[name],"unknown input name: "+name);
			    this._focus(this.elements[name]);
		    } else{
			    for(var n in this.elements){
				    if(this._focus(this.elements[n]))
					    return true;
			    }
		    }
	    },
	    _focus: function(target){
		    if (target && target.focus){
			    target.focus();
			    return true;
		    }
	    },
	    setValues:function(data, update){
		    if (this._settings.complexData)
			    data = webix.CodeParser.collapseNames(data);

		    this._inner_setValues(data, update);
	    },
	    _inner_setValues:function(data, update){
		    this._is_form_dirty = update;
		    //prevent onChange calls from separate controls
		    this.blockEvent();

		    if (!update || !this._values)
			    this._values = {};

		    if (webix.debug_render)
			    webix.log("Render: "+this.name+"@"+this._settings.id);

		    for (var name in data)
			    if (!this.elements[name])
				    this._values[name] = data[name];

		    for (var name in this.elements){
			    var input = this.elements[name];
			    if (input){
				    if (!webix.isUndefined(data[name]))
					    input.setValue(data[name]);
				    else if (!update && input._allowsClear)
					    input.setValue("");
				    this._values[name] = input.getValue();
			    }
		    }

		    this.unblockEvent();
		    this.callEvent("onValues",[]);
	    },
	    isDirty:function(){
		    if (this._is_form_dirty) return true;
		    if (this.getDirtyValues(1) === 1)
			    return true;

		    return false;
	    },
	    setDirty:function(flag){
		    this._is_form_dirty = flag;
		    if (!flag)
			    this._values = this._inner_getValues();
	    },
	    getDirtyValues:function(){
		    var result = {};
		    if (this._values){
			    for (var name in this.elements){
				    var value = this.elements[name].getValue();
				    if (this._values[name] != value){
					    result[name] = value;
					    //FIXME - used by isDirty
					    if (arguments[0])
						    return 1;
				    }
			    }
		    }
		    return result;
	    },
	    getCleanValues:function(){
		    return this._values;
	    },
	    getValues:function(filter){
		    var data = this._inner_getValues(filter);
		    if (this._settings.complexData)
			    data = webix.CodeParser.expandNames(data);

		    return data;
	    },
	    _inner_getValues:function(filter){
		    //get original data		
		    var success,
			    elem = null,
			    data = (this._values?webix.copy(this._values):{});

		    //update properties from linked controls
		    for (var name in this.elements){
			    elem = this.elements[name];
			    success = true;
			    if(filter){
				    if(typeof filter == "object"){
					    if(filter.hidden === false)
						    success = elem.isVisible();
					    if(success && filter.disabled === false)
						    success = elem.isEnabled();
				    }
				    else
					    success = filter.call(this,elem);
			    }
			    if(success)
				    data[name] = elem.getValue();
			    else
				    delete data[name]; //in case of this._values[name]
		    }
		    return data;
	    },
	    clear:function(){
		    this._is_form_dirty = false;
		    var data = {};
		    for (var name in this.elements)
			    if (this.elements[name]._allowsClear)
				    data[name] = this.elements[name]._settings.defaultValue||"";
		    
		    this._inner_setValues(data);
	    },
	    markInvalid: function(name, state){
		    // remove 'invalid' mark
		    if(state === false){
			    this._clear_invalid(name);
		    }
		    // add 'invalid' mark
		    else{
			    // set invalidMessage
			    if(typeof state == "string"){
				    var input = this.elements[name];
				    if(input)
					    input._settings.invalidMessage = state;
			    }
			    this._mark_invalid(name);
		    }
	    },
	    _mark_invalid:function(id){
		    var input = this.elements[id];
		    if (id && input){
			    this._clear_invalid(id,true);
			    webix.html.addCss(input._viewobj, "webix_invalid");
			    input._settings.invalid = true;
			    var message = input._settings.invalidMessage;
			    if(typeof message === "string" && input.setBottomText)
				    input.setBottomText();
		    }
	    },
	    _clear_invalid:function(id,silent){
		    var input = this.elements[id];
            if(id && input && input.$view && input._settings.invalid){
	            webix.html.removeCss(input._viewobj, "webix_invalid");
	            input._settings.invalid = false;
	            var message = input._settings.invalidMessage;
	            if(typeof message === "string" && !silent && input.setBottomText)
	        	    input.setBottomText();
            }
	    }
    };






    webix.OverlayBox = {
	    showOverlay:function(message){
		    if (!this._overlay){
			    this._overlay = webix.html.create("DIV",{ "class":"webix_overlay" },(message||""));
			    webix.html.insertBefore(this._overlay, this._viewobj.firstChild, this._viewobj);
			    this._viewobj.style.position = "relative";
		    } else 
			    this._overlay.innerHTML = message;
	    },
	    hideOverlay:function(){
		    if (this._overlay){
			    webix.html.remove(this._overlay);
			    this._overlay = null;
		    }
	    }
    };


    /*
	  UI:TreeMenu
    */



    

    webix.TreeRenderStack={
	    $init:function(){
		    webix.assert(this.render,"TreeRenderStack :: Object must use RenderStack first");
	    },
	    _toHTMLItem:function(obj){
		    var mark = this.data._marks[obj.id];
		    this.callEvent("onItemRender",[obj]);
		    return this.type.templateStart(obj,this.type,mark)+(obj.$template?this.type["template"+obj.$template](obj,this.type,mark):this.type.template(obj,this.type,mark))+this.type.templateEnd();
	    },
	    _toHTMLItemObject:function(obj){
		    this._html.innerHTML = this._toHTMLItem(obj);
		    return this._html.firstChild;
	    },
	    //convert single item to HTML text (templating)
	    _toHTML:function(obj){
		    //check if related template exist
		    webix.assert((!obj.$template || this.type["template"+obj.$template]),"RenderStack :: Unknown template: "+obj.$template);
		    var html="<div role='presentation' class='webix_tree_branch_"+obj.$level+"'>"+this._toHTMLItem(obj);

		    if (obj.open)
			    html+=this._toHTMLLevel(obj.id);

		    html+="</div>";

		    return html;
	    },
	    _toHTMLLevel:function(id){
		    var html = "";
		    var leaves = this.data.branch[id];
		    if (leaves){
			    html+="<div role='presentation' class='webix_tree_leaves'>";
			    var last = leaves.length-1;
			    for (var i=0; i <= last; i++){
				    var obj = this.getItem(leaves[i]);
				    this.type._tree_branch_render_state[obj.$level] = (i == last);
				    html+=this._toHTML(obj);
			    }
			    html+="</div>";
		    }
		    return html;
	    },
	    //return true when some actual rendering done
	    render:function(id,data,type){
		    webix.TreeRenderStack._obj = this;	//can be used from complex render

		    if (!this.isVisible(this._settings.id) || this.$blockRender)
			    return;

		    if (webix.debug_render)
			    webix.log("Render: "+this.name+"@"+this._settings.id);
			
		    if (id){
			    var cont;
			    var item = this.getItem(id);
			    if (type!="add"){
				    cont = this.getItemNode(id);
				    if (!cont) return;
			    }
			    
			    switch(type){
				case "branch":
					var branch = cont.parentNode;
					var node = this._toHTMLObject(item);
					
					webix.html.insertBefore(node, branch); 
					webix.html.remove(branch);
					this._htmlmap = null;
				    break;
				case "paint":
				case "update":
					var node = this._htmlmap[id] = this._toHTMLItemObject(item);
					webix.html.insertBefore(node, cont); 
					webix.html.remove(cont);
				    break;
				case "delete":
					//deleting not item , but full branch
                    webix.html.remove(cont.parentNode);
				    break;
				case "add":
					var parent;
					//we want process both empty value and 0 as string
					//jshint -W041:true
					if (item.$parent == 0){
						parent = this._dataobj.firstChild;
					} else if(this.getItem(item.$parent).open){
						parent  = this.getItemNode(item.$parent);
						if (parent){
							//when item created by the script, it will miss the container for child notes
							//create it on demand
							if (!parent.nextSibling){
								var leafs = webix.html.create("DIV", { "class" : "webix_tree_leaves" },"");
								parent.parentNode.appendChild(leafs);
							}
							parent = parent.nextSibling;
						}
					}

					if (parent){
						var next = this.data.getNextSiblingId(id);
						next = this.getItemNode(next);
						if (next)
							next = next.parentNode;

						var node = this._toHTMLObject(item);
						this._htmlmap[id] = node.firstChild;
						webix.html.insertBefore(node, next, parent);
					}
				    break;
				default:
					return false;
			    }
			    this.callEvent("onPartialRender", [id,data,type]);
		    } else 
			    //full reset
			    if (this.callEvent("onBeforeRender",[this.data])){
				    //will be used for lines management
				    this.type._tree_branch_render_state = [];
				    //getTopRange - returns all elements on top level
				    this._dataobj.innerHTML = this._toHTMLLevel(0);
				    
				    this._htmlmap = null; //clear map, it will be filled at first getItemNode
				    this.callEvent("onAfterRender",[]);
			    }

		    //clear after usage
		    this.type._tree_branch_render_state = 0;
		    webix.TreeRenderStack._obj = null;
		    return true;
	    },
	    getItemNode:function(search_id){
		    if (this._htmlmap)
			    return this._htmlmap[search_id];
			
		    //fill map if it doesn't created yet
		    this._htmlmap={};
		    
		    var t = this._dataobj.getElementsByTagName("DIV");
		    for (var i=0; i < t.length; i++){
			    var id = t[i].getAttribute(this._id); //get item's
			    if (id) 
				    this._htmlmap[id]=t[i];
		    }
		    //call locator again, when map is filled
		    return this.getItemNode(search_id);
	    },
	    _branch_render_supported:1
    };



    /*
	  Behavior:SelectionModel - manage selection states
	  @export
	  select
	  unselect
	  selectAll
	  unselectAll
	  isSelected
	  getSelectedId
    */
    webix.SelectionModel={
	    $init:function(){
		    //collection of selected IDs
		    this._selected = webix.toArray();
		    webix.assert(this.data, "SelectionModel :: Component doesn't have DataStore");
         	
		    //remove selection from deleted items
		    this.data.attachEvent("onStoreUpdated",webix.bind(this._data_updated,this));
		    this.data.attachEvent("onStoreLoad", webix.bind(this._data_loaded,this));
		    this.data.attachEvent("onAfterFilter", webix.bind(this._data_filtered,this));
		    this.data.attachEvent("onSyncApply", webix.bind(this._select_check,this));
		    this.data.attachEvent("onIdChange", webix.bind(this._id_changed,this));
		    this.$ready.push(this._set_noselect);
	    },
	    _set_noselect: function(){
		    if (this._settings.select=="multiselect" || this._settings.multiselect)
			    webix._event(this.$view,"mousedown", function(e){
				    var shiftKey = (e||event).shiftKey;
				    if(shiftKey){
					    webix._noselect_element = this;
					    webix.html.addCss(this,"webix_noselect",1);
				    }
			    });
	    },
	    _id_changed:function(oldid, newid){
		    for (var i = this._selected.length - 1; i >= 0; i--)
			    if (this._selected[i]==oldid)
				    this._selected[i]=newid;
	    },
	    _data_filtered:function(){
		    for (var i = this._selected.length - 1; i >= 0; i--){
			    if (this.data.getIndexById(this._selected[i]) < 0) {
				    var id = this._selected[i];
				    this.removeCss(id, "webix_selected", true);
				    this._selected.splice(i,1);
				    this.callEvent("onSelectChange",[id]);
			    }
		    }
	    },
	    //helper - linked to onStoreUpdated
	    _data_updated:function(id,obj,type){
		    if (type == "delete"){				//remove selection from deleted items
			    if (this.loadBranch){
				    //hierarchy, need to check all
				    this._select_check();
			    } else
				    this._selected.remove(id);
		    }
		    else if (!id && !this.data.count() && !this.data._filter_order){	//remove selection for clearAll
			    this._selected = webix.toArray();
		    }
	    },
	    _data_loaded:function(){
		    if (this._settings.select)
			    this.data.each(function(obj){
				    if (obj && obj.$selected) this.select(obj.id);
			    }, this);
	    },
	    _select_check:function(){
		    for (var i = this._selected.length - 1; i >= 0; i--)
			    if (!this.exists(this._selected[i]))
				    this._selected.splice(i,1);
	    },
	    //helper - changes state of selection for some item
	    _select_mark:function(id,state,refresh,need_unselect){
		    var name = state ? "onBeforeSelect" : "onBeforeUnSelect";
		    if (!this.callEvent(name,[id,state])) return false;

		    if (need_unselect){
			    this._silent_selection = true;
			    this.unselectAll();
			    this._silent_selection = false;
		    }
		    
		    if (state)
			    this.addCss(id, "webix_selected", true);
		    else
			    this.removeCss(id, "webix_selected", true);

		    if (refresh)
			    refresh.push(id);				//if we in the mass-select mode - collect all changed IDs
		    else{
			    if (state)
				    this._selected.push(id);		//then add to list of selected items
			    else
				    this._selected.remove(id);
			    this._refresh_selection(id);	//othervise trigger repainting
		    }

		    var name = state ? "onAfterSelect" : "onAfterUnSelect";
		    this.callEvent(name,[id]);

		    return true;
	    },
	    //select some item
	    select:function(id,preserve){
		    var ctrlKey = arguments[2];
		    var shiftKey = arguments[3];
		    //if id not provide - works as selectAll
		    if (!id) return this.selectAll();

		    //allow an array of ids as parameter
		    if (webix.isArray(id)){
			    for (var i=0; i < id.length; i++)
				    this.select(id[i], (i?1:preserve), ctrlKey, shiftKey);
			    return;
		    }

		    webix.assert(this.data.exists(id), "Incorrect id in select command: "+id);
		    
		    //block selection mode
		    if (shiftKey && this._selected.length)
			    return this.selectAll(this._selected[this._selected.length-1],id);

		    //single selection mode
		    var need_unselect = false;
		    if (!ctrlKey && !preserve && (this._selected.length!=1 || this._selected[0]!=id))
			    need_unselect = true;

		    if (!need_unselect && this.isSelected(id)){
			    if (ctrlKey) this.unselect(id);	//ctrl-selection of already selected item
			    return;
		    }

		    this._select_mark(id, true, null, need_unselect);
	    },
	    //unselect some item
	    unselect:function(id){
		    //if id is not provided  - unselect all items
		    if (!id) return this.unselectAll();
		    if (!this.isSelected(id)) return;
		    
		    this._select_mark(id,false);
	    },
	    //select all items, or all in defined range
	    selectAll:function(from,to){
		    var range;
		    var refresh=[];
		    
		    if (from||to)
			    range = this.data.getRange(from||null,to||null);	//get limited set if bounds defined
		    else
			    range = this.data.getRange();			//get all items in other case
			//in case of paging - it will be current page only
		    range.each(function(obj){ 
			    if (!this.data.getMark(obj.id, "webix_selected")){
				    this._selected.push(obj.id);	
				    this._select_mark(obj.id,true,refresh);
			    }
		    },this);
		    //repaint self
		    this._refresh_selection(refresh);
	    },
	    //remove selection from all items
	    unselectAll:function(){
		    var refresh=[];
		    
		    this._selected.each(function(id){
			    this._select_mark(id,false,refresh);	//unmark selected only
		    },this);
		    
		    this._selected=webix.toArray();
		    this._refresh_selection(refresh);	//repaint self
	    },
	    //returns true if item is selected
	    isSelected:function(id){
		    return this._selected.find(id)!=-1;
	    },
	    /*
		  returns ID of selected items or array of IDs
		  to make result predictable - as_array can be used, 
		  with such flag command will always return an array 
		  empty array in case when no item was selected
	    */
	    getSelectedId:function(as_array){	
		    switch(this._selected.length){
			case 0: return as_array?[]:"";
			case 1: return as_array?[this._selected[0]]:this._selected[0];
			default: return ([].concat(this._selected)); //isolation
		    }
	    },
	    getSelectedItem:function(as_array){
		    var sel = this.getSelectedId(true);
		    if (sel.length > 1 || as_array){
			    for (var i = sel.length - 1; i >= 0; i--)
				    sel[i] = this.getItem(sel[i]);
			    return sel;
		    } else if (sel.length)
			    return this.getItem(sel[0]);
	    },
	    //detects which repainting mode need to be used
	    _is_mass_selection:function(obj){
		    // crappy heuristic, but will do the job
		    return obj.length>100 || obj.length > this.data.count/2;
	    },
	    _refresh_selection:function(refresh){
		    if (typeof refresh != "object") refresh = [refresh];
		    if (!refresh.length) return;	//nothing to repaint
		    
		    if (this._is_mass_selection(refresh))	
			    this.data.refresh();	//many items was selected - repaint whole view
		    else
			    for (var i=0; i < refresh.length; i++)	//repaint only selected
				    this.render(refresh[i],this.data.getItem(refresh[i]),"update");
			
		    if (!this._silent_selection)	
		        this.callEvent("onSelectChange",[refresh]);
	    }
    };

    webix.ready(function(){
	    webix.event(document.body,"mouseup", function(e){
		    if(webix._noselect_element){
			    webix.html.removeCss(webix._noselect_element,"webix_noselect");
			    webix._noselect_element = null;
		    }
	    });
    });
    /*
	  Behavior:DataMove - allows to move and copy elements, heavily relays on DataStore.move
	  @export
	  copy
	  move
    */
    webix.TreeDataMove={
	    $init:function(){
		    webix.assert(this.data, "DataMove :: Component doesn't have DataStore");
	    },
	    //creates a copy of the item
	    copy:function(sid,tindex,tobj,details){
		    details = details || {};
		    details.copy = true;
		    return this.move(sid, tindex, tobj, details);
	    },
	    _next_move_index:function(nid, next, source){
		    if (next && nid){
			    var new_index = this.getBranchIndex(nid);
			    return new_index+(source == this && source.getBranchIndex(next)<new_index?0:1);
		    }
	    },
	    _check_branch_child:function(parent, child){
		    var t = this.data.branch[parent];
		    if (t && t.length){
			    for (var i=0; i < t.length; i++) {
				    if (t[i] == child) return true;
				    if (this._check_branch_child(t[i], child)) return true;
			    }
		    }
		    return false;
	    },
	    //move item to the new position
	    move:function(sid,tindex,tobj, details){
		    details = details || {};
		    tindex = tindex || 0;
		    var new_id = details.newId || sid;
		    var target_parent = details.parent || 0;
		    
		    tobj = tobj||this;
		    webix.assert(tobj.data, "moving attempt to component without datastore");
		    if (!tobj.data) return;

		    if (webix.isArray(sid)){
			    for (var i=0; i < sid.length; i++) {
				    //increase index for each next item in the set, so order of insertion will be equal to order in the array
				    var nid = this.move(sid[i], tindex, tobj, details);
				    tindex = tobj._next_move_index(nid, sid[i+1], this);
			    }
			    return;
		    }
		    
		    if (this != tobj || details.copy){
			    new_id = tobj.data.add(tobj._externalData(this.getItem(sid),new_id), tindex, (target_parent || 0));
			    if (this.data.branch[sid] && tobj.getBranchIndex){
				    var temp = this.data._scheme_serialize;
				    this.data._scheme_serialize = function(obj){
					    var copy = webix.copy(obj);
					    delete copy.$parent; delete copy.$level; delete copy.$child;
					    if (tobj.data.pull[copy.id])
						    copy.id = webix.uid();
					    return copy;
				    };
				    var copy_data = { data:this.serialize(sid, true), parent:new_id };
				    this.data._scheme_serialize = temp;
				    tobj.parse(copy_data);
			    }
			    if (!details.copy)
				    this.data.remove(sid);
		    } else {
			    //move in self
			    if (sid == target_parent || this._check_branch_child(sid,target_parent)) return;

			    var source = this.getItem(sid);
			    var tbranch = this.data.branch[target_parent];
			    if (!tbranch) 
				    tbranch = this.data.branch[target_parent] = [];
			    var sbranch = this.data.branch[source.$parent];

			    var sindex = webix.PowerArray.find.call(sbranch, sid);
			    if (tindex < 0) tindex = Math.max(tbranch.length - 1, 0);
			    //in the same branch
			    if (sbranch === tbranch && tindex === sindex) return; //same position

			    webix.PowerArray.removeAt.call(sbranch, sindex);
			    webix.PowerArray.insertAt.call(tbranch, sid, Math.min(tbranch.length, tindex));

			    if (!sbranch.length)
				    delete this.data.branch[source.$parent];
			    

			    if(source.$parent && source.$parent != "0")
				    this.getItem(source.$parent).$count--;

			    if (target_parent && target_parent != "0"){
				    var target = tobj.getItem(target_parent);
				    target.$count++;
				    this._set_level_rec(source, target.$level+1);
			    } else 
				    this._set_level_rec(source, 1);

			    source.$parent = target_parent;
			    tobj.data.callEvent("onDataMove", [sid, tindex, target_parent, tbranch[tindex+1]]);
		    }

		    this.refresh();
		    return new_id;	//return ID of item after moving
	    },
	    _set_level_rec:function(item, value){
		    item.$level = value;
		    var branch = this.data.branch[item.id];
		    if (branch)
			    for (var i=0; i<branch.length; i++)
				    this._set_level_rec(this.getItem(branch[i]), value+1);
	    },
	    //reaction on pause during dnd
	    _drag_pause:function(id){
		    if (id && !id.header) //ignore drag other header
			    this.open(id);
	    },
	    $dropAllow:function(context){
		    if (context.from != context.to) return true;
		    for (var i=0; i<context.source.length; i++)
			    if (context.source ==  context.target || this._check_branch_child(context.source, context.target)) return false;

		    return true;
	    },
	    /*
		  this is a stub for future functionality
		  currently it just makes a copy of data object, which is enough for current situation
	    */
	    _externalData:function(data,id){
		    var new_data = webix.DataMove._externalData.call(this, data, id);
		    delete new_data.open;
		    return new_data;
	    }
    };




    webix.TreeDataLoader = {
	    $init:function(){
		    this.data.attachEvent("onStoreUpdated", webix.bind(this._sync_hierarchy, this), null, true);

		    // #FIXME:  constructor call chain
		    //redefine methods
		    this._feed_common = this._feed_commonA;
	    },
	    _feed_commonA:function(id, count, callback, url){
		    // branch loading
		    var details = (count === 0?{parent: encodeURIComponent(id)}:null);

		    webix.DataLoader.prototype._feed_common.call(this,id, count, callback, url, details);
	    },
	    //load next set of data rows
	    loadBranch:function(id, callback, url){
		    id = id ||0;
		    this.data.url = url || this.data.url;
		    if (this.callEvent("onDataRequest", [id,callback,this.data.url]) && this.data.url)
			    this.data.feed.call(this, id, 0, callback, url);
	    },
	    _sync_hierarchy:function(id, data, mode){
		    if (!mode || mode == "add" || mode == "delete" || mode == "branch"){
			    this.data._sync_to_order(this);
		    }
	    }
    };

    webix.TreeStore = {
	    name:"TreeStore",
	    $init:function() {
		    this._filterMode={
			    //level:1,
			    showSubItems:true
		    };
		    this.branch = { 0:[] };
		    this.attachEvent("onParse", function(driver, data){
			    this._set_child_scheme(driver.child);
			    var parent = driver.getInfo(data).parent;
		    });
		    this.attachEvent("onClearAll", webix.bind(function(){
			    this._filter_branch = null;
		    },this));
	    },
	    filterMode_setter:function(mode){
		    return webix.extend(this._filterMode, mode, true);
	    },
	    _filter_reset:function(preserve){
		    //remove previous filtering , if any
		    if (this._filter_branch && !preserve){
			    this.branch = this._filter_branch;
			    this.order = webix.toArray(webix.copy(this.branch[0]));
			    for (var key in this.branch)
				    if (key != "0")	//exclude 0 - virtual root
					    this.getItem(key).$count = this.branch[key].length;
			    delete this._filter_branch;
		    }
	    },
	    _filter_core:function(filter, value, preserve, filterMode){
		    //for tree we have few filtering options
		    //- filter leafs only
		    //- filter data on specific level
		    //- filter data on all levels
		    //- in all cases we can show or hide empty folder
		    //- in all cases we can show or hide childs for matched item
		    
		    //set new order of items, store original
		    if (!preserve ||  !this._filter_branch){
			    this._filter_branch = this.branch;
			    this.branch  = webix.clone(this.branch);
		    }

		    this.branch[0] = this._filter_branch_rec(filter, value, this.branch[0], 1, (filterMode||{}));
	    },
	    _filter_branch_rec:function(filter, value, branch, level, config){
		    //jshint -W041
		    var neworder = [];
		    
		    var allow = (config.level && config.level != level);

		    for (var i=0; i < branch.length; i++){
			    var id = branch[i];
			    var item = this.getItem(id);
			    var child_run = false;
			    var sub = this.branch[id];

			    if (allow){
				    child_run = true;
			    } else if (filter(this.getItem(id),value)){
				    neworder.push(id);
				    // open all parents of the found item
				    if (config.openParents !== false){
					    var parentId = this.getParentId(id);
					    while(parentId && parentId != "0"){
						    this.getItem(parentId).open = 1;
						    parentId = this.getParentId(parentId);
					    }
				    }
				    //in case of of fixed level filtering - do not change child-items
				    if (config.level || config.showSubItems)
					    continue;
			    } else {
				    //filtering level, not match
				    child_run = true;
			    }	

			    //if "filter by all levels" - filter childs
			    if (allow || !config.level){ 
				    if (sub){
					    var newsub = this.branch[id] = this._filter_branch_rec(filter, value, sub, level+1, config);
					    item.$count = newsub.length;
					    if (child_run && newsub.length)
						    neworder.push(id);
				    }
			    }
		    }
		    return neworder;
	    },
	    count:function(){
		    if (this.order.length)
			    return this.order.length;

		    //we must return some non-zero value, or logic of selection will think that we have not data at all
		    var count=0;
		    this.eachOpen(function(){ count++; });
		    return count;
	    },
	    changeId:function(old, newid){
		    if (this.branch[old]){
			    var branch = this.branch[newid] = this.branch[old];
			    for (var i = 0; i < branch.length; i++)
				    this.getItem(branch[i]).$parent = newid;
			    delete this.branch[old];
		    }
		    var parent = this.getItem(old).$parent;
		    if (this.branch[parent]){
			    var index = webix.PowerArray.find.call(this.branch[parent], old);
			    this.branch[parent][index] = newid;
		    }
		    return webix.DataStore.prototype.changeId.call(this, old, newid);
	    },
	    clearAll:function(soft){
		    this.branch = { 0:[] };
		    webix.DataStore.prototype.clearAll.call(this, soft);	
	    },
	    getPrevSiblingId:function(id){
		    var order = this.branch[this.getItem(id).$parent];
		    var pos = webix.PowerArray.find.call(order, id)-1;
		    if (pos>=0)
			    return order[pos];
		    return null;
	    },
	    getNextSiblingId:function(id){
		    var order = this.branch[this.getItem(id).$parent];
		    var pos = webix.PowerArray.find.call(order, id)+1;
		    if (pos<order.length)
			    return order[pos];
		    return null;
	    },
	    getParentId:function(id){
		    return this.getItem(id).$parent;
	    },
	    getFirstChildId:function(id){
		    var order = this.branch[id];
		    if (order && order.length)
			    return order[0];
		    return null;
	    },
	    isBranch:function(parent){
		    return !!this.branch[parent];
	    },
	    getBranchIndex:function(child){
		    var t = this.branch[this.pull[child].$parent];
		    return webix.PowerArray.find.call(t, child);
	    },
	    _set_child_scheme:function(parse_name){

		    if (typeof parse_name == "string")
			    this._datadriver_child = function(obj){
				    var t = obj[parse_name];
				    if (t)
					    delete obj[parse_name];
				    return t;
			    };
		    else 
			    this._datadriver_child = parse_name;
	    },
	    _inner_parse:function(info, recs){ 
		    var parent  = info.parent || 0;
		    
		    for (var i=0; i<recs.length; i++){
			    //get hash of details for each record
			    var temp = this.driver.getDetails(recs[i]);
			    var id = this.id(temp); 	//generate ID for the record
			    var update = !!this.pull[id]; //update mode

			    if (update){
				    temp = webix.extend(this.pull[id], temp, true);
				    if (this._scheme_update)
					    this._scheme_update(temp);
			    } else {
				    if (this._scheme_init)
					    this._scheme_init(temp);
				    this.pull[id]=temp;
			    }

			    this._extraParser(temp, parent, 0, update, info.from ? info.from*1+i : 0);
		    }

		    //fix state of top item after data loading
		    var pItem = this.pull[parent] || {};
		    var pBranch = this.branch[parent] || [];
		    pItem.$count = pBranch.length;
		    delete pItem.webix_kids;

		    if (info.size && info.size != pBranch.length)
			    pBranch[info.size] = null;
	    },
        _extraParser:function(obj, parent, level, update, from){
    	    //processing top item
    	    obj.$count = 0;
	        //using soft check, as parent can be a both 0 and "0" ( second one in case of loading from server side ) 
    	    obj.$parent = parent!="0"?parent:0;
		    obj.$level = level||(parent!="0"?this.pull[parent].$level+1:1);
		    
		    var parent_branch = this.branch[obj.$parent];
		    if (!parent_branch)
			    parent_branch = this.branch[obj.$parent] = [];
			if (this._filter_branch)
				this._filter_branch[obj.$parent] = parent_branch;

		    if (!update){
			    var pos = from || parent_branch.length;
			    parent_branch[pos] = obj.id;
		    }

    	    var child = this._datadriver_child(obj);

    	    if (obj.webix_kids){
    		    return (obj.$count = -1);
    	    }

    	    if (!child) //ignore childless
    		    return (obj.$count = 0);	

    	    //when loading from xml we can have a single item instead of an array
    	    if (!webix.isArray(child))
    		    child = [child];
    	    

		    for (var i=0; i < child.length; i++) {
			    //extra processing to convert strings to objects
			    var item = webix.DataDriver.json.getDetails(child[i]);
			    var itemid = this.id(item);
			    update = !!this.pull[itemid];
			    
			    if (update){
				    item = webix.extend(this.pull[itemid], item, true);
				    if (this._scheme_update)
					    this._scheme_update(item);
			    } else {
				    if (this._scheme_init)
					    this._scheme_init(item);
				    this.pull[itemid]=item;
			    }
			    this._extraParser(item, obj.id, obj.$level+1, update);
		    }

		    //processing childrens
		    var branch = this.branch[obj.id];
		    if (branch)
			    obj.$count = branch.length;
	    }, 
	    _sync_to_order:function(master){
		    this.order = webix.toArray();
		    this._sync_each_child(0, master);
	    },
	    _sync_each_child:function(start, master){
		    var branch = this.branch[start];
		    for (var i=0; i<branch.length; i++){
			    var id = branch[i];
			    this.order.push(id);
			    var item = this.pull[id];
			    if (item){
				    if (item.open){
					    if (item.$count == -1)
						    master.loadBranch(id);
					    else if (item.$count)
						    this._sync_each_child(id, master);
				    }
			    }
		    }
	    },
	    provideApi:function(target,eventable){
		    var list = ["getPrevSiblingId","getNextSiblingId","getParentId","getFirstChildId","isBranch","getBranchIndex","filterMode_setter"];
		    for (var i=0; i < list.length; i++)
			    target[list[i]]=this._methodPush(this,list[i]);

		    if (!target.getIndexById)
			    webix.DataStore.prototype.provideApi.call(this, target, eventable);
	    },
	    getTopRange:function(){
		    return webix.toArray([].concat(this.branch[0])).map(function(id){
			    return this.getItem(id);
		    }, this);
	    },
	    eachChild:function(id, functor, master, all){
		    var branch = this.branch;
		    if (all && this._filter_branch)
			    branch = this._filter_branch;

		    var stack = branch[id];
		    if (stack)
			    for (var i=0; i<stack.length; i++)
				    functor.call((master||this), this.getItem(stack[i]));
	    },
	    each:function(method,master, all, id){
		    this.eachChild((id||0), function(item){
			    var branch = this.branch;

			    method.call((master||this), item);

			    if (all && this._filter_branch)
				    branch = this._filter_branch;

			    if (item && branch[item.id])
				    this.each(method, master, all, item.id);
		    }, this, all);
	    },	
	    eachOpen:function(method,master, id){
		    this.eachChild((id||0), function(item){
			    method.call((master||this), item);
			    if (this.branch[item.id] && item.open)
				    this.eachOpen(method, master, item.id);
		    });
	    },
	    eachSubItem:function(id, functor){
		    var top = this.branch[id||0];
		    if (top)
			    for (var i=0; i<top.length; i++){
				    var key = top[i];
				    if (this.branch[key]){
					    functor.call(this, this.getItem(key),true);
					    this.eachSubItem(key, functor);
				    } else
					    functor.call(this, this.getItem(key), false);
			    }
	    },
	    eachLeaf:function(id, functor){
		    var top = this.branch[id||0];
		    if (top)
			    for (var i=0; i<top.length; i++){
				    var key = top[i];
				    if (this.branch[key]){
					    this.eachLeaf(key, functor);
				    } else
					    functor.call(this, this.getItem(key), false);
			    }
	    },
	    _sort_core:function(sort, order){
		    var sorter = this.sorting.create(sort);
		    for (var key in this.branch){
			    var bset =  this.branch[key];
			    var data = [];

			    for (var i=0; i<bset.length; i++)
				    data.push(this.pull[bset[i]]);

			    data.sort(sorter);

			    for (var i=0; i<bset.length; i++)
				    data[i] = data[i].id;

			    this.branch[key] = data;
		    }
		    return order;
	    },
	    add:function(obj, index, pid){
		    var refresh_parent = false;

		    var parent = this.getItem(pid||0);
		    if(parent){
			    //when adding items to leaf item - it need to be repainted
			    if (!this.branch[parent.id])
				    refresh_parent = true;

			    parent.$count++;
			    //fix for the adding into dynamic loading branch
			    //dynamic branch has $count as -1
			    if (!parent.$count) parent.$count = 1;
		    }

		    this.branch[pid||0] = this.order = webix.toArray(this.branch[pid||0]);

		    obj.$count = 0; 
		    obj.$level= (parent?parent.$level+1:1); 
		    obj.$parent = (parent?parent.id:0);

		    if (this._filter_branch){	//adding during filtering
			    var origin = this._filter_branch[pid||0];
			    //newly created branch
			    if (!origin) origin = this._filter_branch[pid] = this.order;

			    //branch can be shared bettwen collections, ignore such cases
			    if (this.order !== origin){
				    //we can't know the location of new item in full dataset, making suggestion
				    //put at end by default
				    var original_index = origin.length;
				    //put at start only if adding to the start and some data exists
				    if (!index && this.branch[pid||0].length)
					    original_index = 0;

				    origin = webix.toArray(origin);
				    origin.insertAt(obj.id,original_index);
			    }
		    }

		    //call original adding logic
		    var result = webix.DataStore.prototype.add.call(this, obj, index);


		    if (refresh_parent)
			    this.refresh(pid);

		    return result;
	    },
	    _rec_remove:function(id, inner){
		    var obj = this.pull[id];
            if(this.branch[obj.id] && this.branch[obj.id].length > 0){
        	    var branch = this.branch[id];
                for(var i=0;i<branch.length;i++)
                    this._rec_remove(branch[i], true);
            }
            delete this.branch[id];
		    if(this._filter_branch)
			    delete this._filter_branch[id];
            delete this.pull[id];
		    if (this._marks[id])
			    delete this._marks[id];
	    },
	    _filter_removed:function(pull, parentId, id){
		    var branch = pull[parentId];
		    if (branch.length == 1 && branch[0] == id && parentId){
			    delete pull[parentId];
		    } else
			    webix.toArray(branch).remove(id);
	    },
	    remove:function(id){
		    //id can be an array of IDs - result of getSelect, for example
		    if (webix.isArray(id)){
			    for (var i=0; i < id.length; i++)
				    this.remove(id[i]);
			    return;
		    }

		    webix.assert(this.exists(id), "Not existing ID in remove command"+id);
		    var obj = this.pull[id];
		    var parentId = (obj.$parent||0);

		    if (this.callEvent("onBeforeDelete",[id]) === false) return false;
		    this._rec_remove(id);
		    this.callEvent("onAfterDelete",[id]);

		    var parent = this.pull[parentId];
		    this._filter_removed(this.branch, parentId, id);
		    if (this._filter_branch)
			    this._filter_removed(this._filter_branch, parentId, id);

		    var refresh_parent = 0;
		    if (parent){
			    parent.$count--;
			    if (parent.$count<=0){
				    parent.$count=0;
				    parent.open = 0;
				    refresh_parent = 1;
			    }
		    }

		    //repaint signal
		    this.callEvent("onStoreUpdated",[id,obj,"delete"]);
		    if (refresh_parent)
			    this.refresh(parent.id);
	    },
	    /*
		  serializes data to a json object
	    */
	    getBranch:function(id){
		    var out = [];
		    var items = (this._filter_branch || this.branch)[id];
		    if (items)
			    for (var i = 0; i < items.length; i++) out[i] = this.pull[items[i]];

		    return out;
	    },
	    serialize: function(id, all){
		    var coll = this.branch;
		    //use original collection of branches
		    if (all && this._filter_branch) coll = this._filter_branch;

		    var ids = this.branch[id||0];
		    var result = [];
		    for(var i=0; i< ids.length;i++) {
			    var obj = this.pull[ids[i]];
			    var rel;

			    if (this._scheme_serialize){
				    rel = this._scheme_serialize(obj);
				    if (rel===false) continue;
			    } else 
				    rel = webix.copy(obj);
				
			    if (this.branch[obj.id])
				    rel.data = this.serialize(obj.id, all);

			    result.push(rel);
		    }
		    return result;
	    }
    };

    webix.TreeTableClick = {};

    webix.TreeTablePaste = {
	    insert: function(data) {
		    var parent = this.getSelectedId(true, true);
		    for (var i = 0; i < data.length; i++) {
			    var item = {};
			    for (var j = 0; j < this._settings.columns.length; j++) {
				    item[this._settings.columns[j].id] = data[i][j] || "";
			    }
			    if (!webix.isUndefined(item.id) && this.exists(item.id))
				    item.id = webix.uid();
			    this.add(item, null, parent[0]);
		    }
	    }
    };


    webix.TreeType={
	    space:function(obj,common){
		    var html = "";
		    for (var i=1; i<obj.$level; i++)
			    html += "<div class='webix_tree_none'></div>";
		    return html;
	    },
	    icon:function(obj,common){
		    if (obj.$count){
			    if (obj.open)
				    return "<div class='webix_tree_open'></div>";
			    else
				    return "<div class='webix_tree_close'></div>";
		    } else
			    return "<div class='webix_tree_none'></div>";
	    },
	    checkbox:function(obj, common){
		    if(obj.nocheckbox)
		        return "";
            return "<input type='checkbox' class='webix_tree_checkbox' "+(obj.checked?"checked":"")+(obj.disabled?" disabled":"")+">";
	    },	
	    folder:function(obj, common){
		    if (obj.icon)
			    return "<div class='webix_tree_file webix_tree_"+obj.icon+"'></div>";

		    if (obj.$count){
			    if (obj.open)
				    return "<div class='webix_tree_folder_open'></div>";
			    else
				    return "<div class='webix_tree_folder'></div>";
		    }
		    return "<div class='webix_tree_file'></div>";
	    }
    };

    webix.TreeAPI = {
	    open: function(id, show) {
		    if (!id) return;
		    //ignore open for leaf items
		    var item = this.getItem(id);
		    if (!item.$count || item.open) return;

		    if (this.callEvent("onBeforeOpen",[id])){
			    item.open=true;
			    this.data.callEvent("onStoreUpdated",[id, 0, "branch"]);
			    this.callEvent("onAfterOpen",[id]);
		    }

		    if (show && id != "0")
			    this.open(this.getParentId(id), show);
	    },
	    close: function(id) {
		    if (!id) return;
		    var item = this.getItem(id);
		    if (!item.open) return;

		    if (this.callEvent("onBeforeClose",[id])){
			    item.open=false;
			    this.data.callEvent("onStoreUpdated",[id, 0, "branch"]);
			    this.callEvent("onAfterClose",[id]);
		    }
	    },
	    openAll: function(id){
		    this.data.eachSubItem((id||0), function(obj, branch){
			    if (branch)
				    obj.open = true;
		    });
		    this.data.refresh();
	    },
	    closeAll: function(id){
		    this.data.eachSubItem((id||0), function(obj, branch){
			    if (branch)
				    obj.open = false;
		    });
		    this.data.refresh();
	    },
	    _tree_check_uncheck:function(id,mode,e){
		    if(this._settings.threeState)
			    return this._tree_check_uncheck_3(id,(mode !== null?mode:""));

		    var value,
			    item = this.getItem(id),
			    trg = (e? (e.target|| e.srcElement):null);

		    //read actual value from HTML tag when possible
		    //as it can be affected by dbl-clicks
		    if(trg && trg.type == "checkbox")
			    value = trg.checked?true:false;
		    else
			    value = (mode !== null?mode:!item.checked);

		    item.checked = value;
		    this.callEvent("onItemCheck", [id, item.checked, e]);
	    },
	    isBranchOpen:function(search_id){
		    if (search_id == "0") return true;

		    var item = this.getItem(search_id);
		    if (item.open)
			    return this.isBranchOpen(item.$parent);
		    return false;
	    },
	    getOpenItems: function() {
		    var open = [];
		    for (var id in this.data.branch) {
			    if (this.exists(id) && this.getItem(id).open)
				    open.push(id);
		    }
		    return open;
	    },
	    getState: function(){
		    return {
			    open: this.getOpenItems(),
			    select: this.getSelectedId(true)
		    };
	    },
	    _repeat_set_state:function(tree, open){
		    var event = this.data.attachEvent("onStoreLoad", function(){
			    tree.setState.call(tree,open);
			    tree.data.detachEvent(event);
			    tree = null;
		    });
	    },
	    setState: function(state){
		    var repeat = false;
		    var dyn = false;

		    if (state.open){
			    this.closeAll();	
			    var open = state.open;
			    for (var i = 0; i < open.length; i++){
				    var item = this.getItem(open[i]);
				    if (item && item.$count){
					    item.open=true;
					    //dynamic loading
					    if (item.$count == -1){
						    //call the same method after data loading
						    this._repeat_set_state(this, state);
						    this.refresh();
						    return 0;
						    //end processing
					    }
				    }
			    }
			    this.refresh();
		    }


		    if (state.select && this.select){			
			    var select = state.select;
			    this.unselect();
			    for (var i = 0; i < select.length; i++)
				    if (this.exists(select[i]))
					    this.select(select[i], true);
		    }

		    return 1;
	    }
    };

    webix.TreeClick = {
	    webix_tree_open:function(e, id){
		    this.close(id);
		    return false;
	    },
	    webix_tree_close:function(e, id){
		    this.open(id);
		    return false;
	    },
	    webix_tree_checkbox:function(e,id){
		    this._tree_check_uncheck(id, null, e);
		    return false;
	    }
    };

    webix.TreeCollection = webix.proto({
	    name:"TreeCollection",
	    $init:function(){
		    webix.extend(this.data, webix.TreeStore, true);
		    this.data.provideApi(this,true);
		    webix.extend(this, webix.TreeDataMove, true);
	    }
    }, webix.TreeDataLoader, webix.DataCollection);

    /*
	  Behavior:DragItem - adds ability to move items by dnd
	  
	  dnd context can have next properties
	  from - source object
	  to - target object
	  source - id of dragged item(s)
	  target - id of drop target, null for drop on empty space
	  start - id from which DND was started
    */


	

    webix.AutoScroll = {
	    _auto_scroll:function(pos, id){
		    var yscroll = 1;
		    var xscroll = 0;

		    var scroll = this._settings.dragscroll;
		    if (typeof scroll == "string"){
			    xscroll = scroll.indexOf("x") != -1;
			    yscroll = scroll.indexOf("y") != -1;
		    }

		    var data = this._body || this.$view;
		    var box = webix.html.offset(data);

		    var top = box.y;
		    var bottom = top + data.offsetHeight;
		    var left = box.x;
		    var right = left + data.offsetWidth;

		    var scroll = this.getScrollState();
		    var reset = false;
		    var sense = Math.max(this.type&&!isNaN(parseFloat(this.type.height))?this.type.height+5:0,40); //dnd auto-scroll sensivity

		    if (yscroll){
			    var config = this._settings;
			    if(config.topSplit){
				    var topSplitPos = this._cellPosition(this.getIdByIndex(config.topSplit-1), this.columnId(0));
				    top += topSplitPos.top + topSplitPos.height;
			    }

			    if (pos.y < (top + sense)){
				    this._auto_scrollTo(scroll.x, scroll.y-sense*2, pos);
				    reset = true;
			    } else if (pos.y > bottom - sense){
				    this._auto_scrollTo(scroll.x, scroll.y+sense*2, pos);
				    reset = true;
			    }
		    }

		    if (xscroll){
			    if (pos.x < (left + sense)){
				    this._auto_scrollTo(scroll.x-sense*2, scroll.y, pos);
				    reset = true;
			    } else if (pos.x > right - sense){
				    this._auto_scrollTo(scroll.x+sense*2, scroll.y, pos);
				    reset = true;
			    }
		    }

		    if (reset)
			    this._auto_scroll_delay = webix.delay(this._auto_scroll, this, [pos], 100);

	    },
	    _auto_scrollTo: function(x,y,pos){
		    if(this.callEvent("onBeforeAutoScroll",[pos]))
			    this.scrollTo(x,y);
	    }
    };

    webix.DragOrder={
	    _do_not_drag_selection:true,
	    $drag:function(s,e){
		    var html = webix.DragItem.$drag.call(this,s,e);
		    if (html){
			    var context = webix.DragControl.getContext(); 
			    if (this.getBranchIndex)
				    this._drag_order_stored_left = this._drag_order_complex?((this.getItem(context.start).$level) * 16):0;
			    if (!context.fragile)
				    this.addCss(context.start, "webix_transparent");
		    }
		    return html;
	    },
	    _getDragItemPos: function(pos,e){
		    return webix.DragItem._getDragItemPos(pos,e);
	    },
	    $dragPos:function(pos,e, node){
		    var box = webix.html.offset(this.$view);
		    var left = box.x + (this._drag_order_complex?( 1+this._drag_order_stored_left):1);
		    var top = pos.y;
		    var config = this._settings;
		    var xdrag = (config.layout == "x");

		    if (xdrag){
			    top = box.y + (this._drag_order_complex?( + box.height - webix.ui.scrollSize - 1):1);
			    left = pos.x;
		    }

		    node.style.display = 'none';

		    var html = document.elementFromPoint(left, top);

		    if (html != this._last_sort_dnd_node){
			    var view = webix.$$(html);
			    //this type of dnd is limited to the self
			    if (view && view == this){
				    var id = this.locate(html, true);
				    // sometimes 'mousedown' on item is followed by 'mousemove' on empty area and item caanot be located
				    if(!id && webix.DragControl._saved_event)
					    id = this.locate(webix.DragControl._saved_event, true);
				    
				    var start_id = webix.DragControl.getContext().start;
				    this._auto_scroll_force = true;
				    if (id){

					    if (id != this._last_sort_dnd_node){
						    if (id != start_id){
							    var details, index;

							    if (this.getBranchIndex){
								    details = { parent:this.getParentId(id) }; 
								    index = this.getBranchIndex(id);
							    } else {
								    details = {};
								    index = this.getIndexById(id);
							    }

							    if (this.callEvent("onBeforeDropOrder",[start_id, index, e, details])){
								    this.move(start_id, index, this, details);
								    this._last_sort_dnd_node = id;
							    }
						    }
						    webix.DragControl._last = this._contentobj;
					    }
				    }
				    else {
					    id = "$webix-last";
					    if (this._last_sort_dnd_node != id){
						    if (!this.callEvent("onBeforeDropOrder",[start_id, -1, e, { parent: 0} ])) return;
						    this._last_sort_dnd_node  = id;
					    }
				    }
			    }
		    }

		    node.style.display = 'block';

		    
		    if (xdrag){
			    pos.y = box.y;
			    pos.x = pos.x-18;

			    if (pos.x < box.x)
				    pos.x = box.x; 
			    else {
				    var max = box.x + this.$view.offsetWidth - 60;
				    if (pos.x > max)
					    pos.x = max;
			    }
		    } else {
			    box.y += this._header_height;
			    pos.x = this._drag_order_stored_left||box.x;
			    pos.y = pos.y-18;
		        
			    if (pos.y < box.y)
				    pos.y = box.y; 
			    else {
				    var max = box.y + this.$view.offsetHeight - 60;
				    if (pos.y > max)
					    pos.y = max;
			    }
		    }

		    if (this._auto_scroll_delay)
			    this._auto_scroll_delay = window.clearTimeout(this._auto_scroll_delay);

		    this._auto_scroll_delay = webix.delay(this._auto_scroll, this, [webix.html.pos(e), this.locate(e) || null],250);

		    //prevent normal dnd landing checking
		    webix.DragControl._skip = true;
	    },
	    $dragIn:function(){
		    return false;
	    },
	    $drop:function(s,t,e){
		    if (this._auto_scroll_delay){
			    this._auto_scroll_force = null;
			    this._auto_scroll_delay = window.clearTimeout(this._auto_scroll_delay);
		    }

		    var context = webix.DragControl.getContext();
		    var id = context.start;
		    this.removeCss(id, "webix_transparent");

		    var index = this.getIndexById(id);
		    this.callEvent("onAfterDropOrder",[id, index , e]);
		    if (context.fragile)
			    this.refresh();
	    }
    };
    webix.DragItem={
	    //helper - defines component's container as active zone for dragging and for dropping
	    _initHandlers:function(obj, source, target){
		    if (!source) webix.DragControl.addDrop(obj._contentobj,obj,true);
		    if (!target) webix.DragControl.addDrag(obj._contentobj,obj);
		    this.attachEvent("onDragOut",function(a,b){ this.$dragMark(a,b); });
		    this.attachEvent("onBeforeAutoScroll",function(){
			    var context = webix.DragControl.getContext();
			    return !!(webix.DragControl._active && context && (context.to === this || this._auto_scroll_force));
		    });
	    },
	    drag_setter:function(value){
		    if (value){
			    webix.extend(this, webix.AutoScroll, true);
			    if (value == "order")
				    webix.extend(this, webix.DragOrder, true);
			    if (value == "inner")
				    this._inner_drag_only = true;

			    this._initHandlers(this, value == "source", value == "target");
			    delete this.drag_setter;	//prevent double initialization
		    }
		    return value;
	    },
	    /*
		  s - source html element
		  t - target html element
		  d - drop-on html element ( can be not equal to the target )
		  e - native html event 
	    */
	    //called when drag moved over possible target
	    $dragIn:function(s,t,e){
		    var id = this.locate(e) || null;
		    var context = webix.DragControl._drag_context;

		    //in inner drag mode - ignore dnd from other components
		    if ((this._inner_drag_only || context.from._inner_drag_only) && context.from !== this) return false;

		    var to = webix.DragControl.getMaster(t);
		    //previous target
		    var html = (this.getItemNode(id, e)||this._dataobj);
		    //prevent double processing of same target
		    if (html == webix.DragControl._landing) return html;
		    context.target = id;
		    context.to = to;

		    if (this._auto_scroll_delay)
			    this._auto_scroll_delay = window.clearTimeout(this._auto_scroll_delay);

		    this._auto_scroll_delay = webix.delay(function(pos,id){
			    this._drag_pause(id);
			    this._auto_scroll(pos,id);
		    }, this, [webix.html.pos(e), id], 250);

		    if (!this.$dropAllow(context, e)  || !this.callEvent("onBeforeDragIn",[context, e])){
			    context.to = context.target = null;
			    if (this._auto_scroll_delay)
				    this._auto_scroll_delay = window.clearTimeout(this._auto_scroll_delay);
			    return null;
		    }
		    //mark target only when landing confirmed
		    this.$dragMark(context,e);
		    return html;
	    },
	    $dropAllow:function(){
		    return true;
	    },
	    _drag_pause:function(id){
		    //may be reimplemented in some components
		    // tree for example
	    },
	    _target_to_id:function(target){
		    return target && typeof target === "object" ? target.toString() : target;
	    },
	    //called when drag moved out from possible target
	    $dragOut:function(s,t,n,e){ 
		    var id = (this._viewobj.contains(n) ? this.locate(e): null) || null;
		    var context = webix.DragControl._drag_context;

		    //still over previous target
		    if ((context.target||"").toString() == (id||"").toString()) return null;
		    if (this._auto_scroll_delay){
			    this._auto_scroll_force = null;
			    this._auto_scroll_delay = window.clearTimeout(this._auto_scroll_delay);
		    }

		    //unmark previous target
		    context.target = context.to = null;
		    this.callEvent("onDragOut",[context,e]);
		    return null;
	    },
	    //called when drag moved on target and button is released
	    $drop:function(s,t,e){ 
		    if (this._auto_scroll_delay)
			    this._auto_scroll_delay = window.clearTimeout(this._auto_scroll_delay);

		    var context = webix.DragControl._drag_context;
		    //finalize context details
		    context.to = this;
		    var target = this._target_to_id(context.target);

		    if (this.getBranchIndex){
			    if (target){
				    context.parent = this.getParentId(target);
				    context.index = this.getBranchIndex(target);
			    }
		    } else
			    context.index = target?this.getIndexById(target):this.count();

		    //unmark last target
		    this.$dragMark({}, e);

		    if( context.from && context.from != context.to && context.from.callEvent ){
			    context.from.callEvent("onBeforeDropOut", [context,e]);
		    }

		    if (!this.callEvent("onBeforeDrop",[context,e])) return;
		    //moving
		    this._context_to_move(context,e);
		    
		    this.callEvent("onAfterDrop",[context,e]);
	    },
	    _context_to_move:function(context,e){
		    webix.assert(context.from, "Unsopported d-n-d combination");
		    if (context.from){	//from different component
			    var details = { parent: context.parent, mode: context.pos };
			    context.from.move(context.source,context.index,context.to, details);
		    }
	    },
	    _getDragItemPos: function(pos,e){
		    if (this.getItemNode){
			    var id = this.locate(e, true);
			    //in some case, node may be outiside of dom ( spans in datatable for example )
			    //so getItemNode can return null
			    var node = id ? this.getItemNode(id) : null;
			    return node ? webix.html.offset(node) : node;
		    }
	    },
	    //called when drag action started
	    $drag:function(s,e){
		    var id = this.locate(e, true);
		    if (id){
			    var list = [id];

			    if (this.getSelectedId && !this._do_not_drag_selection){ //has selection model
				    //if dragged item is one of selected - drag all selected
				    var selection = this.getSelectedId(true, true);	

				    if (selection && selection.length > 1 && webix.PowerArray.find.call(selection,id)!=-1){
					    var hash = {}; 
					    var list = [];
					    for (var i=0;i<selection.length; i++)
						    hash[selection[i]]=true;
					    for (var i = 0; i<this.data.order.length; i++){
						    var hash_id = this.data.order[i];
						    if (hash[hash_id])
							    list.push(hash_id);
					    }
				    }
			    }
			    //save initial dnd params
			    var context = webix.DragControl._drag_context= { source:list, start:id };
			    context.fragile = (this.addRowCss && webix.env.touch && ( webix.env.isWebKit || webix.env.isFF ));
			    context.from = this;
			    
			    if (this.callEvent("onBeforeDrag",[context,e])){
				    if (webix.Touch)
					    webix.Touch._start_context = null;

				    //set drag representation
				    return context.html||this.$dragHTML(this.getItem(id), e);
			    }
		    }
		    return null;
	    },
	    $dragHTML:function(obj, e){
		    return this._toHTML(obj);
	    },
	    $dragMark:function(context, ev){
		    var target = null;
		    if (context.target)
			    target = this._target_to_id(context.target);

		    //touch webkit will stop touchmove event if source node removed
		    //datatable can't repaint rows without repainting
		    if (this._marked && this._marked != target){
			    if (!context.fragile) this.removeCss(this._marked, "webix_drag_over");
			    this._marked = null;
		    }

		    if (!this._marked && target){
			    this._marked = target;
			    if (!context.fragile) this.addCss(target, "webix_drag_over");
			    return target;
		    }
		    
		    if (context.to){
			    return true;
		    }else
			    return false;
	    }
    };



    webix.Group = {
	    $init:function(){
		    webix.extend(this.data, webix.GroupStore);
		    //in case of plain store we need to remove store original dataset
		    this.data.attachEvent("onClearAll",webix.bind(function(){
			    this.data._not_grouped_order = this.data._not_grouped_pull = null;
			    this._group_level_count = 0;
		    },this));
	    },
	    group:function(config){
		    this.data.ungroup(true);
		    this.data.group(config);
	    },
	    ungroup:function(skipRender){
		    this.data.ungroup(skipRender);
	    }
    };

    webix.GroupMethods = {
	    sum:function(property, data){
		    data = data || this;
		    var summ = 0;
		    for (var i = 0; i < data.length; i++)
			    summ+=property(data[i])*1;

		    return summ;
	    },
	    min:function(property, data){
		    data = data || this;
		    var min = Infinity;

		    for (var i = 0; i < data.length; i++)
			    if (property(data[i])*1 < min) min = property(data[i])*1;

		    return min*1;
	    },
	    max:function(property, data){
		    data = data || this;
		    var max = -Infinity;

		    for (var i = 0; i < data.length; i++)
			    if (property(data[i])*1 > max) max = property(data[i])*1;

		    return max*1;
	    },
	    count:function(property, data){
		    var count = 0;
		    for (var i = 0; i < data.length; i++) {
			    var some = property(data[i]);
			    if (some !== null && typeof some !== "undefined")
				    count++;
		    }
		    return count;
	    },
	    any:function(property, data){
		    return property(data[0]);
	    },
	    string:function(property, data){
		    return property.$name;
	    }
    };

    webix.GroupStore = {
	    $init:function(){
		    this.attachEvent("onClearAll", this._reset_groups);
	    },
	    _reset_groups:function(){
		    this._not_grouped_order = this._not_grouped_pull = null;
		    this._group_level_count = 0;
	    },
	    ungroup:function(skipRender){
		    if (this.getBranchIndex)
			    return this._ungroup_tree.apply(this, arguments);

		    if (this._not_grouped_order){
			    this.order = this._not_grouped_order;
			    this.pull = this._not_grouped_pull;
			    this._not_grouped_pull = this._not_grouped_order = null;
			    if(!skipRender)
				    this.callEvent("onStoreUpdated",[]);
		    }

	    },
	    _group_processing:function(scheme){
		    this.blockEvent();
		    this.group(scheme);
		    this.unblockEvent();
	    },
	    _group_prop_accessor:function(val){
		    if (typeof val == "function")
			    return val;
		    var acc = function(obj){ return obj[val]; };
		    acc.$name = val;
		    return acc;
	    },	
	    group:function(stats){ 
		    if (this.getBranchIndex)
			    return this._group_tree.apply(this, arguments);

		    var key = this._group_prop_accessor(stats.by);
		    if (!stats.map[key])
			    stats.map[key] = [key, this._any];
			
		    var groups = {};
		    var labels = [];
		    this.each(function(data){
			    var current = key(data);
			    if (!groups[current]){
				    labels.push({ id:current, $group:true, $row:stats.row });
				    groups[current] = webix.toArray();
			    }
			    groups[current].push(data);
		    });
		    for (var prop in stats.map){
			    var functor = (stats.map[prop][1]||"any");
			    var property = this._group_prop_accessor(stats.map[prop][0]);
			    if (typeof functor != "function"){
				    webix.assert(webix.GroupMethods[functor], "unknown grouping rule: "+functor);
				    functor = webix.GroupMethods[functor];
			    }

			    for (var i=0; i < labels.length; i++) {
				    labels[i][prop]=functor.call(this, property, groups[labels[i].id]);
			    }
		    }
			
		    this._not_grouped_order = this.order;
		    this._not_grouped_pull = this.pull;
		    
		    this.order = webix.toArray();
		    this.pull = {};
		    for (var i=0; i < labels.length; i++){
			    var id = this.id(labels[i]);
			    this.pull[id] = labels[i];
			    this.order.push(id);
			    if (this._scheme_init)
				    this._scheme_init(labels[i]);
		    }
		    
		    this.callEvent("onStoreUpdated",[]);
	    },
	    _group_tree:function(input, parent){
		    this._group_level_count = (this._group_level_count||0) + 1;

		    //supports simplified group by syntax
		    var stats;
		    if (typeof input == "string"){
			    stats = { by:this._group_prop_accessor(input), map:{} };
			    stats.map[input] = [input];
		    } else if (typeof input == "function"){
			    stats = { by:input, map:{} };
		    } else
			    stats = input;
		    
		    //prepare
		    var level;
		    if (parent)
			    level = this.getItem(parent).$level;
		    else {
			    parent  = 0;
			    level = 0;
		    }
		    
		    var order = this.branch[parent];
		    var key = this._group_prop_accessor(stats.by);
		    
		    //run
		    var topbranch = [];
		    var labels = [];
		    for (var i=0; i<order.length; i++){
			    var data = this.getItem(order[i]);
			    var current = key(data);
			    var current_id = level+"$"+current;
			    var ancestor = this.branch[current_id];

			    if (!ancestor){
				    var newitem = this.pull[current_id] = { id:current_id, value:current, $group:true, $row:stats.row};
				    if (this._scheme_init)
					    this._scheme_init(newitem);
				    labels.push(newitem);
				    ancestor = this.branch[current_id] = [];
				    ancestor._formath = [];
				    topbranch.push(current_id);
			    }
			    ancestor.push(data.id);
			    ancestor._formath.push(data);
		    }

		    this.branch[parent] = topbranch;
		    for (var prop in stats.map){
			    var functor = (stats.map[prop][1]||"any");
			    var property = this._group_prop_accessor(stats.map[prop][0]);
			    if (typeof functor != "function"){
				    webix.assert(webix.GroupMethods[functor], "unknown grouping rule: "+functor);
				    functor = webix.GroupMethods[functor];
			    }
				
			    for (var i=0; i < labels.length; i++)
				    labels[i][prop]=functor.call(this, property, this.branch[labels[i].id]._formath);
		    }

		    for (var i=0; i < labels.length; i++){
			    var group = labels[i];

			    if (this.hasEvent("onGroupCreated"))
				    this.callEvent("onGroupCreated", [group.id, group.value, this.branch[group.id]._formath]);

			    if (stats.footer){
				    var id = "footer$"+group.id;
				    var footer = this.pull[id] = { id:id, $footer:true, value: group.value, $level:level, $count:0, $parent:group.id, $row:stats.footer.row};
				    for (var prop in stats.footer){
					    var functor = (stats.footer[prop][1]||"any");
					    var property = this._group_prop_accessor(stats.footer[prop][0]);
					    if (typeof functor != "function"){
						    webix.assert(webix.GroupMethods[functor], "unknown grouping rule: "+functor);
						    functor = webix.GroupMethods[functor];
					    }

					    footer[prop]=functor.call(this, property, this.branch[labels[i].id]._formath);
				    }
				    
				    this.branch[group.id].push(footer.id);
				    this.callEvent("onGroupFooter", [footer.id, footer.value, this.branch[group.id]._formath]);
			    }

			    delete this.branch[group.id]._formath;
		    }
			

		    this._fix_group_levels(topbranch, parent, level+1);
			
		    this.callEvent("onStoreUpdated",[]);
	    },
	    _ungroup_tree:function(skipRender, parent, force){
		    //not grouped
		    if (!force && !this._group_level_count) return;
		    this._group_level_count = Math.max(0, this._group_level_count -1 );

		    parent = parent || 0;
		    var order = [];
		    var toporder = this.branch[parent];
		    for (var i=0; i<toporder.length; i++){
			    var id = toporder[i];
			    var branch = this.branch[id];
			    if (branch)
				    order = order.concat(branch);

			    delete this.pull[id];
			    delete this.branch[id];
		    }

		    this.branch[parent] = order;
		    for (var i = order.length - 1; i >= 0; i--) {
			    if (this.pull[order[i]].$footer)
				    order.splice(i,1);
		    }
		    this._fix_group_levels(order, 0, 1);

		    if (!skipRender)
			    this.callEvent("onStoreUpdated",[]);
	    },
	    _fix_group_levels:function(branch, parent, level){
		    if (parent)
			    this.getItem(parent).$count = branch.length;

		    for (var i = 0; i < branch.length; i++) {
			    var item = this.pull[branch[i]];
			    item.$level = level;
			    item.$parent = parent;
			    var next = this.branch[item.id];
			    if (next)
				    this._fix_group_levels(next, item.id, level+1);
		    }
	    }
    };
    webix.clipbuffer = {

	    _area: null,
	    _blur_id: null,
	    _ctrl: 0,

	    /*! create textarea or returns existing
	    **/
	    init: function() {
		    // returns existing textarea
		    if (this._area !== null)
			    return this._area;

		    webix.destructors.push({ obj: this });
		    // creates new textarea
		    this._area = document.createElement('textarea');
		    this._area.className = "webix_clipbuffer";
		    this._area.setAttribute("webixignore", 1);
		    this._area.setAttribute("spellcheck", "false");
		    this._area.setAttribute("autocapitalize", "off");
		    this._area.setAttribute("autocorrect", "off");
		    this._area.setAttribute("autocomplete", "off");
		    document.body.appendChild(this._area);

		    webix.event(document.body, 'keydown', webix.bind(function(e){
			    var key = e.keyCode;
			    var ctrl = !!(e.ctrlKey || e.metaKey);
			    if (key === 86 && ctrl)
				    webix.delay(this._paste, this, [e], 100);
		    }, this));

		    return this._area;
	    },
	    destructor: function(){
		    this._area = null;
	    },
	    /*! set text into buffer
	    **/
	    set: function(text) {
		    this.init();
		    this._area.value = text;
		    this.focus();
	    },
	    /*! select text in textarea
	    **/
	    focus: function() {
		    // if there is native browser selection, skip focus
		    if(!this._isSelectRange()){
			    this.init();
			    this._area.focus();
			    this._area.select();
		    }

	    },
	    /*! checks document selection
	    **/
	    _isSelectRange: function() {
		    var text = "";
		    if (typeof window.getSelection != "undefined") {
			    text = window.getSelection().toString();
		    } else if (typeof document.selection != "undefined" && document.selection.type == "Text") {
			    text = document.selection.createRange().text;
		    }
		    return !!text;
	    },
	    /*! process ctrl+V pressing
	    **/
	    _paste: function(e) {
		    var trg = e.target || e.srcElement;
		    if (trg === this._area) {
			    var text = this._area.value;
			    var last_active = webix.UIManager.getFocus();
			    if (last_active && (!last_active.getEditor || !last_active.getEditor())){
				    last_active.callEvent("onPaste", [text]);
				    this._area.select();
			    }
		    }
	    }
    };


    webix.CopyPaste = {
	    clipboard_setter: function(value) {
		    if (value === true || value === 1) value = "modify";
		    this.attachEvent("onAfterSelect", function(id) {
			    if (!this.getEditor || !this.getEditor()){
				    var item = this.getItem(id);
				    var text = this.type.templateCopy(item);
				    webix.clipbuffer.set(text, this);
				    webix.clipbuffer.focus();
				    webix.UIManager.setFocus(this);
			    }
		    });
		    this.attachEvent("onPaste", function(text) {
			    if (!webix.isUndefined(this._paste[this._settings.clipboard]))
				    this._paste[this._settings.clipboard].call(this, text);
		    });
		    this.attachEvent("onFocus", function() {
			    webix.clipbuffer.focus();
		    });
		    // solution for clicks on selected items
		    this.attachEvent("onItemClick",function(id){
			    if(!this._selected || this._selected.find(id)!==-1){
				    webix.clipbuffer.focus();
				    webix.UIManager.setFocus(this);
			    }
		    });
		    return value;
	    },
	    _paste: {
		    // insert new item with pasted value
		    insert: function(text) {
			    this.add({ value: text });
		    },
		    // change value of each selected item
		    modify: function(text) {
			    var sel = this.getSelectedId(true);
			    for (var i = 0; i < sel.length; i++) {
				    this.getItem(sel[i]).value = text;
				    this.refresh(sel[i]);
			    }
		    },
		    // do nothing
		    custom: function(text) {}
	    },
	    templateCopy_setter: function(value) {
		    this.type.templateCopy = webix.template(value);
	    },
	    type:{
		    templateCopy: function(item) {
			    return this.template(item);
		    }
	    }
    };


    webix.KeysNavigation = {
        $init:function(){
            if(this.getSelectedId){
                this.attachEvent("onAfterRender", this._set_focusable_item);
                this.attachEvent("onAfterSelect", webix.once(function(){
                    if(this.count()>1){
                        var node =  this._dataobj.querySelector("["+this._id+"]");
                        if(node) node.setAttribute("tabindex", "-1");
                    }
                }));
            }
        },
        _set_focusable_item:function(){
            var sel = this.getSelectedId(true);
            if(!sel.length || !this.getItemNode(sel[0])){
                var node =  this._dataobj.querySelector("["+this._id+"]");
                if(node) node.setAttribute("tabindex", "0");
            }
        },
        _navigation_helper:function(mode){
            return function(view, e){
                var tag = (e.srcElement || e.target);

                //ignore clipboard listener
                if (!tag.getAttribute("webixignore")){
                    //ignore hotkeys if focus in the common input
                    //to allow normal text edit operations
                    var name = tag.tagName;
                    if (name == "INPUT" || name == "TEXTAREA" || name == "SELECT") return true;
                }

                if (view && view.moveSelection && view.config.navigation && !view._in_edit_mode){
                    webix.html.preventEvent(e);
                    return view.moveSelection(mode, e.shiftKey);
                }
                return true;
            };
        },
        moveSelection:function(mode, shift, focus){
            var config = this._settings;
            if(config.disabled) return;
            //get existing selection
            var selected = this.getSelectedId(true);
            var x_layout = (this.count && (config.layout =="x" || config.xCount > 1));


            if((mode == "right" || mode == "left") && this._parent_menu){
                var parent = webix.$$(this._parent_menu);
                
                parent._hide_sub_menu(true);
                if(parent.config.layout === "x")
                    parent.moveSelection(mode);
                else
                    webix.UIManager.setFocus(parent);
                return;
            }

            if (!selected.length && this.count()){
                if (mode == "down" || (mode == "right" && x_layout)) mode = "top";
                else if (mode == "up" || (mode == "left" && x_layout)) mode = "bottom";
                else return;
                selected = [this.getFirstId()];
            }

            if (selected.length == 1){  //if we have a selection
                selected = selected[0];
                var prev = selected;

                if (mode == "left" && this.close)
                    return this.close(selected);
                if (mode == "right" && this.open)
                    return this.open(selected);

                else if (mode == "top") {
                    selected = this.getFirstId();
                } else if (mode == "bottom") {
                    selected = this.getLastId();
                } else if (mode == "up" || mode == "left" || mode == "pgup") {
                    var index = this.getIndexById(selected);
                    var step = mode == "pgup" ? 10 : 1;
                    selected = this.getIdByIndex(Math.max(0, index-step));
                } else if (mode == "down" || mode == "right" || mode == "pgdown") {
                    var index = this.getIndexById(selected);
                    var step = mode == "pgdown" ? 10 : 1;
                    selected = this.getIdByIndex(Math.min(this.count()-1, index+step));
                } else {
                    webix.assert(false, "Not supported selection moving mode");
                    return;
                }

                if(this._skip_item)
                    selected = this._skip_item(selected, prev, mode);

                this.showItem(selected);
                this.select(selected);

                if(this.getSubMenu && this.getSubMenu(selected))
                    this._mouse_move_activation(selected, this.getItemNode(selected));

                if(!this.config.clipboard && focus !== false){
                    var node = this.getItemNode(selected);
                    if(node) node.focus();
                }
            }
            return false;
        },
        navigation_setter:function(value){
            //using global flag to apply hotkey only once
            if (value && !webix.UIManager._global_nav_grid_hotkeys){
                webix.UIManager._global_nav_grid_hotkeys = true;
                //hotkeys will react on any component but will not work in edit mode
                //you can define moveSelection method to handle navigation keys
                webix.UIManager.addHotKey("up",         this._navigation_helper("up"));
                webix.UIManager.addHotKey("down",       this._navigation_helper("down"));
                webix.UIManager.addHotKey("shift+up",   this._navigation_helper("up"));
                webix.UIManager.addHotKey("shift+down", this._navigation_helper("down"));
                webix.UIManager.addHotKey("shift+right",   this._navigation_helper("right"));
                webix.UIManager.addHotKey("shift+left", this._navigation_helper("left"));
                webix.UIManager.addHotKey("pageup", 	this._navigation_helper("pgup"));
                webix.UIManager.addHotKey("pagedown",   this._navigation_helper("pgdown"));
                webix.UIManager.addHotKey("home", 	    this._navigation_helper("top"));
                webix.UIManager.addHotKey("end", 		this._navigation_helper("bottom"));
                webix.UIManager.addHotKey("right", 	    this._navigation_helper("right"));
                webix.UIManager.addHotKey("left",		this._navigation_helper("left"));

            }

            return value;
        }
    };




    webix.TreeStateCheckbox = {
	    _init_render_tree_state: function(){
		    if (this._branch_render_supported){
			    var old_render = this.render;
			    this.render = function(id,data,mode){
				    var updated = old_render.apply(this,arguments);

				    if(this._settings.threeState && updated && data != "checkbox")
					    this._setThirdState.apply(this,arguments);
			    };
			    this._init_render_tree_state=function(){};
		    }
	    },
	    threeState_setter:function(value){
		    if (value)
			    this._init_render_tree_state();
		    return value;
	    },
	    _setThirdState:function(id){
		    var i,leaves,parents,checkedParents,tree;
		    parents = [];
		    tree = this;

		    /*if item was removed*/
		    if(id&&!tree.data.pull[id]){
			    id = 0;
		    }
		    /*sets checkbox states*/
		    /*if branch or full reloading*/
		    if(!id||tree.data.pull[id].$count){
			    leaves = this._getAllLeaves(id);
			    leaves.sort(function(a,b){
				    return tree.data.pull[b].$level - tree.data.pull[a].$level;
			    });
			    for(i=0;i < leaves.length;i++){
				    if(!i||tree.data.pull[leaves[i]].$parent!=tree.data.pull[leaves[i-1]].$parent)
					    parents = parents.concat(tree._setParentThirdState(leaves[i]));
			    }
		    }
		    else{
			    /*an item is a leaf */
			    parents = parents.concat(tree._setParentThirdState(id));
		    }

		    checkedParents = {};
		    for(i=0;i<parents.length;i++){
			    if(!checkedParents[parents[i]]){
				    checkedParents[parents[i]] = 1;
				    this._setCheckboxIndeterminate(parents[i]);
			    }
		    }

		    tree = null;
	    },
	    _setCheckboxIndeterminate:function(id){
		    var chElem, elem;
		    elem = this.getItemNode(id);
		    if(elem){
			    this.render(id,"checkbox","update");
			    /*needed to get the new input obj and to set indeterminate state*/
			    if(this.getItem(id).indeterminate){
				    elem = this.getItemNode(id);
				    chElem = elem.getElementsByTagName("input")[0];
				    if(chElem)
					    chElem.indeterminate = this.getItem(id).indeterminate;
			    }
		    }
	    },
	    _setParentThirdState:function(itemId){
		    //we need to use dynamic function creating
		    //jshint -W083:true

		    var checked, checkedCount,indeterminate, parentId,result,tree,unsureCount,needrender;
		    parentId = this.getParentId(itemId);
		    tree = this;
		    result = [];
		    while(parentId && parentId != "0"){
			    unsureCount = 0;
			    checkedCount = 0;
			    this.data.eachChild(parentId,function(obj){
				    if(obj.indeterminate){
					    unsureCount++;
				    }
				    else if(obj.checked){
					    checkedCount++;
				    }
			    });

			    checked = indeterminate = needrender = false;
			    
			    var item = this.getItem(parentId);
			    if(checkedCount==item.$count){
				    checked = true;
			    }
			    else if(checkedCount>0||unsureCount>0){
				    indeterminate = true;
			    }
			    
			    //we need to reset indeterminate in any case :(
			    if (indeterminate || indeterminate != item.indeterminate)
				    needrender = true;
			    item.indeterminate = indeterminate;
			    if (checked || item.checked != checked)
				    needrender = true;
			    item.checked = checked;

			    if (needrender){
				    result.push(parentId);
				    parentId = this.getParentId(parentId);
			    } else
				    parentId = 0;
		    }

		    return result;
	    },
	    /*get all checked items in tree*/
	    getChecked:function(){
		    var result=[];
		    var tree = this;
		    this.data.eachSubItem(0,function(obj){
			    if (tree.isChecked(obj.id))
				    result.push(obj.id);
		    });
		    return result;
	    },
	    _tree_check_uncheck_3:function(id, mode){
		    var item = this.getItem(id);
		    if(item){
			    if (mode === "") 
				    mode = !item.checked;
			    if(item.checked != mode || item.indeterminate){
				    item.checked = mode;
				    this._correctThreeState(id);
				    var parents = this._setParentThirdState(id);
				    if (this._branch_render_supported && parents.length < 5){
					    for (var i=0; i<parents.length; i++)
						    this._setCheckboxIndeterminate(parents[i]);
				    } else
					    this.refresh();
				    this.callEvent("onItemCheck", [id, mode]);
			    }
		    }
	    },
	    /*set checked state for item checkbox*/
	    checkItem:function(id){
		    this._tree_check_uncheck(id, true);
		    this.updateItem(id);
	    },
	    /*uncheckes an item checkbox*/
	    uncheckItem:function(id){
		    this._tree_check_uncheck(id, false);
		    this.updateItem(id);
	    },
	    _checkUncheckAll: function(id,mode,all){
		    var method = mode?"checkItem":"uncheckItem";
		    if(!id)
			    id = 0;
		    else
			    this[method](id);
		    if(this._settings.threeState){
			    if(!id)
				    this.data.eachChild(0,function(item){
					    this[method](item.id);
				    },this,all);
		    }
		    else
			    this.data.each(function(item){
				    this[method](item.id);
			    },this,all,id);

	    },
	    /*checkes checkboxes of all items in a branch/tree*/
	    checkAll: function(id, all){
		    this._checkUncheckAll(id,true,all);

	    },
	    /*uncheckes checkboxes of all items in a branch/tree*/
	    uncheckAll: function(id, all){
		    this._checkUncheckAll(id,false,all);
	    },
	    _correctThreeState:function(id){
		    var i,leaves,state;
		    var item = this.getItem(id);

		    item.indeterminate = false;
		    state = item.checked;

		    this.data.eachSubItem(id, function(child){
			    child.indeterminate = false;
			    child.checked = state;
		    });
		    
		    if(this._branch_render_supported && this.isBranchOpen(item.$parent)){ //for tree-render only
			    this.render(id,0,"branch");
		    }
	    },
	    /*returns checked state of item checkbox*/
	    isChecked:function(id){
		    return this.getItem(id).checked;
	    },
	    /*gets all leaves in a certain branch (in the whole tree if id is not set)*/
	    _getAllLeaves:function(parentId){
		    var result = [];
		    this.data.eachSubItem(parentId, function(obj, branch){
			    if (!branch)
				    result.push(obj.id);
		    });
		    return result;
	    }	
    };




 	
    




    /*
      UI: navigation control
    */
    webix.NavigationButtons = {
	    $init:function(){
		    this.$ready.push(function(){
			    this.attachEvent("onKeyPress", this._onKeyPress);
		    });
	    },
	    _moveActive:function(code, e){
		    if(code === 37  || code === 39){
			    webix.html.preventEvent(e);
			    this._showNavItem(code===37?-1:1);

			    var node = this._navPanel.querySelector("[tabindex='0']");
			    if(node) node.focus();
		    }
	    },
	    _renderPanel:function(){
		    webix.html.remove(this._navPanel);


		    this._navPanel = webix.html.create("DIV",{
			    "class":"webix_nav_panel "+"webix_nav_panel_"+this._settings.navigation.type,
			    "role":"tablist"
		    },"");

		    this._viewobj.appendChild(this._navPanel);


		    this._renderNavItems();
		    this._renderNavButtons();
		    this._setLinkEventHandler();
	    },
	    _setLinkEventHandler: function(){
		    var h = [];
		    if(this._navPanel)
			    h[0] = webix.event(this._navPanel,"click", webix.bind(function(e){
				    var elem = (e.srcElement || e.target);
				    var found = false;
				    while(elem != this._navPanel && !found){
					    var bindId = elem.getAttribute(this._linkAttr);
					    if(bindId){
						    found = true;
						    this._showPanelBind(bindId);
					    }
					    elem = elem.parentNode;
				    }
			    },this));
		    if(this._prevNavButton)
			    h[1] = webix.event(this._prevNavButton,"click", webix.bind(function(e){
				    this._showNavItem(-1);
			    },this));
		    if(this._nextNavButton)
			    h[1] = webix.event(this._nextNavButton,"click", webix.bind(function(e){
				    this._showNavItem(1);
			    },this));
		    this.attachEvent("onDestruct", function(){
			    for(var i=0;i< h.length; i++){
				    this.detachEvent(h[i]);
			    }
			    h = null;
		    });
	    },
	    _showNavItem: function(inc){
		    if(this._cells){
			    var index = this._active_cell + inc;
			    if(index >= this._cells.length || index < 0){
				    index = (index < 0?this._cells.length-1:0);
			    }
			    this.setActiveIndex(index);
		    }
	    },
	    _showPanelBind: function(id){
		    if(this._cells)
			    webix.$$(id).show();
	    },
	    _renderNavItems:function(){
		    var item, config;
		    config = this._settings.navigation;
		    if(config.items){
			    this._linkAttr = config.linkAttr || "bind_id";

			    if(!this._navPanel)
				    this._renderPanel();
			    else
				    this._clearPanel();

			    var data = (this._cells?this._cells:this.data.order);
			    if(data.length>1){
				    for (var i=0; i < data.length; i++){

					    item = webix.html.create("DIV",{
						    "class":"webix_nav_item webix_nav_"+(i==this._active_cell?"active":"inactive"),
						    "role":"tab",
						    "tabindex":(i==this._active_cell?"0":"-1")
					    },"<div></div>");
					    var id = this._cells?this._cells[i]._settings.id:data[i];
					    if(id)
						    item.setAttribute(this._linkAttr, id);
					    this._navPanel.appendChild(item);
				    }
			    }
		    }
	    },
	    _clearPanel:function(){
		    if (this._navPanel){
			    var coll = this._navPanel.childNodes;
			    for (var i = coll.length - 1; i >= 0; i--)
				    webix.html.remove(coll[i]);
		    }
	    },
	    _renderNavButtons: function(){
		    var item, config;
		    config = this._settings.navigation;
		    if(config.buttons){

			    if(this._prevNavButton)
				    webix.html.remove(this._prevNavButton);
			    if(this._prevNavButton)
				    webix.html.remove(this._nextNavButton);


			    this._prevNavButton = webix.html.create(
				    "DIV",
				    {
					    "class":"webix_nav_button_"+config.type+" webix_nav_button_prev ",
					    "role":"button",
					    "tabindex":"0",
					    "aria-label":webix.i18n.aria.prevTab
				    },
				    "<div class=\"webix_nav_button_inner\"></div>"
			    );
			    this._viewobj.appendChild(this._prevNavButton);

			    this._nextNavButton = webix.html.create(
				    "DIV",
				    {
					    "class":"webix_nav_button_"+config.type+" webix_nav_button_next ",
					    "role":"button",
					    "tabindex":"0",
					    "aria-label":webix.i18n.aria.nextTab
				    },
				    "<div class=\"webix_nav_button_inner\"></div>"
			    );
			    this._viewobj.appendChild(this._nextNavButton);
		    }
	    }
    };





    webix.CustomPrint = {
	    $customPrint:function(options, htmlOnly){
		    if(this._prePrint(options, htmlOnly))
			    return true;

		    var tableData = this._getTableArray(options);
		    var table = this._getTableHTML(tableData, options);

		    if(htmlOnly)
			    return table;

		    var doc = webix.html.create("div", { "class":"webix_ui_print"});
		    doc.appendChild(table);

		    webix.html.insertBefore(doc, options.docFooter, document.body);
		    window.print();
		    
		    webix.html.remove(doc);
	    },
	    _prePrint:function(options, htmlOnly){
		    if(!htmlOnly && (this.config.layout =="y" || options.scroll || this.config.prerender || this.config.autoheight)) return true;
		    
		    if(this.config.layout =="x")
			    webix.extend(options || {}, {xCount:this.count(), nobreaks:true}, true);
	    },
	    _getPageWidth:function(options){
		    if(options.fit =="page") return Infinity;

		    var size = options.size;
		    var width = size[options.mode == "portrait"?"width":"height"];
		    
		    return Math.min(width*webix.env.printPPI-2*webix.env.printMargin);
	    },
	    _getTableArray:function(options, base, start){
		    var maxWidth = this._getPageWidth(options);
		    var xCount = options.xCount || this._getVisibleRange()._dx;

		    var tableArray = [];
		    var colrow = [];
		    var width = 0;
		    
		    var newTableStart, rownum, colnum;

		    start = start || 0;
		    base = base || [];

		    for(var i = 0; i<this.data.order.length;){
			    var obj = this.data.pull[this.data.order[i]];
			    rownum = parseInt(i/xCount);
			    colnum = i-(rownum*xCount);

			    if(obj && colnum>=start){
				    width += this.type.width;
				    
				    //start a new table, if cells do not fit page width
				    if(width > maxWidth && colnum>start){ // 'colnum>start' ensures that a single long cell will have to fit the page
					    newTableStart = colrow.length+start;
					    tableArray.push(colrow);
					    i = i+(xCount-colrow.length);
					    colrow = [];
					    width = 0;
					    continue;
				    }

				    var cellValue = this.type.template(obj, this.type);
				    var className = this._itemClassName;
				    
				    var style  = {
					    display:"table-cell",
					    height:this.type.height + "px",
					    width:this.type.width + "px"
				    };
				    //push a cell to a row
				    colrow.push({
					    txt: cellValue,
					    className: className+" "+(obj.$css || ""),
					    style: style
				    });
				    //push a row to a table and start a new row
				    if((i+1)%xCount === 0){
					    tableArray.push(colrow);
					    colrow = [];
					    width = 0;
				    }
			    }
			    i++;
		    }

		    base.push(tableArray);

		    if(newTableStart)
			    this._getTableArray(options, base, newTableStart);	

		    return base;
	    },
	    _getTableHTML:function(tableData, options){
		    
		    var container = webix.html.create("div");

		    tableData.forEach(webix.bind(function(table, i){

			    var tableHTML = webix.html.create("table", {
				    "class":"webix_table_print "+this.$view.className,
				    "style":"border-collapse:collapse"
			    });

			    table.forEach(function(row){
				    var tr = webix.html.create("tr");

				    row.forEach(function(column){
					    var td = webix.html.create("td");


					    if (column.txt) td.innerHTML = column.txt;
					    if (column.className) td.className = column.className;
					    if (column.style) {
						    var keys = Object.keys(column.style);
						    keys.forEach(function(key){
							    if (column.style[key])
								    td.style[key] = column.style[key];
						    });
					    }
					    if(column.span){
						    if(column.span.colspan > 1)
							    td.colSpan = column.span.colspan;
						    if(column.span.rowspan > 1)
							    td.rowSpan = column.span.rowspan;
					    }
					    tr.appendChild(td);
				    });
				    tableHTML.appendChild(tr);
			    });
			    container.appendChild(tableHTML);

			    if(!options.nobreaks && i+1 < tableData.length){
				    var br = webix.html.create("DIV", {"class":"webix_print_pagebreak"});
				    container.appendChild(br);
			    }
			    
		    }, this));

		    return container;
	    }
    };








    /*
	  UI:DataView
    */


 	
    /*
	  Behavior:EditAbility - enables item operation for the items
	  
	  @export
	  edit
	  stopEdit
    */



    webix.EditAbility={
	    defaults:{
		    editaction:"click"
	    },
	    $init:function(config){
		    this._editors = {};
		    this._in_edit_mode = 0;
		    this._edit_open_time = 0;
		    this._contentobj.style.position = "relative";
		    if (config)
			    config.onDblClick = config.onDblClick || {};

		    this.attachEvent("onAfterRender", this._refocus_inline_editor);

		    //when we call webix.extend the editable prop can be already set
		    if (this._settings.editable)
			    this._init_edit_events_once();

		    webix.extend(this,webix.Undo);
	    },
	    _refocus_try:function(newnode){
		    try{ //Chrome throws an error if selectionStart is not accessible
			    if (typeof newnode.selectionStart == "number") {
				    newnode.selectionStart = newnode.selectionEnd = newnode.value.length;
			    } else if (typeof newnode.createTextRange != "undefined") {
				    var range = newnode.createTextRange();
				    range.collapse(false);
				    range.select();
			    }
		    } catch(e){}
	    },
	    _refocus_inline_editor:function(){
		    var editor = this.getEditor();
		    if (editor && editor.$inline && !editor.getPopup){
			    var newnode = this._locateInput(editor);
			    if (newnode && newnode != editor.node){
				    var text = editor.node.value;
				    editor.node = newnode;
				    newnode.value = text;
				    newnode.focus();

				    this._refocus_try(newnode);
			    } else 
				    this.editStop();
		    }
	    },
	    editable_setter:function(value){
		    if (value)
			    this._init_edit_events_once();
		    return value;
	    },
	    _init_edit_events_once:function(){
		    //will close editor on any click outside
		    webix.attachEvent("onEditEnd", webix.bind(function(){
			    if (this._in_edit_mode)
				    this.editStop();
		    }, this));
		    webix.attachEvent("onClick", webix.bind(function(e){
			    //but ignore click which opens editor
			    if (this._in_edit_mode && (new Date())-this._edit_open_time > 200){
				    if (!this._last_editor || this._last_editor.popupType || !e || ( !this._last_editor.node || !this._last_editor.node.contains(e.target || e.srcElement)))
					    this.editStop();
			    }
		    }, this));
		    
		    //property sheet has simple data object, without events
		    if (this.data.attachEvent)
			    this.data.attachEvent("onIdChange", webix.bind(function(oldid, newid){
				    this._changeEditorId(oldid, newid);
			    }, this));

		    //when clicking on row - will start editor
		    this.attachEvent("onItemClick", function(id){
			    if (this._settings.editable && this._settings.editaction == "click")
				    this.edit(id);
		    });
		    this.attachEvent("onItemDblClick", function(id){
			    if (this._settings.editable && this._settings.editaction == "dblclick")
				    this.edit(id);
		    });
		    //each time when we clicking on input, reset timer to prevent self-closing
		    this._reset_active_editor = webix.bind(function(){
			    this._edit_open_time = new Date();
		    },this);

		    this._init_edit_events_once = function(){};

		    if (this._component_specific_edit_init)
			    this._component_specific_edit_init();
	    },
	    _handle_live_edits:function(){
		    webix.delay(function(){
			    var editor = this.getEditor();
			    if (editor && editor.config.liveEdit){
				    var state = { value:editor.getValue(), old: editor.value };
				    if (state.value == state.old) return;

				    editor.value = state.value;
				    this._set_new_value(editor, state.value, false);
				    this.callEvent("onLiveEdit", [state, editor]);
			    }
		    }, this);
	    },
	    _show_editor_form:function(id){
		    var form = this._settings.form;
		    if (typeof form != "string")
			    this._settings.form = form = webix.ui(form).config.id;

		    var form = webix.$$(form);
		    var realform = form.setValues?form:form.getChildViews()[0];

		    
		    realform.setValues(this.getItem(id.row || id));
		    form.config.master = this.config.id;
		    form.show( this.getItemNode(id) );

		    var first = realform.getChildViews()[0];
		    if (first.focus)
			    first.focus();
	    },
	    edit:function(id, preserve, show){
		    if (!this.callEvent("onBeforeEditStart", [id])) return;
		    if (this._settings.form)
			    return this._show_editor_form(id);

		    var editor = this._get_editor_type(id);
		    if (editor){
			    if (this.getEditor(id)) return;
			    if (!preserve) this.editStop();

			    //render html input
			    webix.assert(webix.editors[editor], "Invalid editor type: "+editor);
			    var type = webix.extend({}, webix.editors[editor]);
			    
			    var node = this._init_editor(id, type, show);
			    if (type.config.liveEdit)
				    this._live_edits_handler = this.attachEvent("onKeyPress", this._handle_live_edits);

			    var area = type.getPopup?type.getPopup(node)._viewobj:node;

			    if (area)
				    webix._event(area, "click", this._reset_active_editor);
			    if (node)
				    webix._event(node, "change", this._on_editor_change, { bind:{ view:this, id:id }});
			    if (show !== false)
				    type.focus();

			    if (this.$fixEditor)
				    this.$fixEditor(type);

			    //save time of creation to prevent instant closing from the same click
			    this._edit_open_time = webix.edit_open_time = new Date();

			    webix.UIManager.setFocus(this, true);
			    this.callEvent("onAfterEditStart", [id]);
			    return type;
		    }
		    return null;
	    },
	    getEditor:function(id){
		    if (!id)
			    return this._last_editor;

		    return this._editors[id];
	    },
	    _changeEditorId:function(oldid, newid)	{
		    var editor = this._editors[oldid];
		    if (editor){
			    this._editors[newid] = editor;
			    editor.id = newid;
			    delete this._editors[oldid];
		    }
	    },
	    _on_editor_change:function(e){
		    if (this.view.hasEvent("onEditorChange"))
			    this.view.callEvent("onEditorChange", [this.id, this.view.getEditorValue(this.id) ]);
	    },
	    _get_edit_config:function(id){
		    return this._settings;
	    },
	    _init_editor:function(id, type, show){
		    var config = type.config = this._get_edit_config(id);
		    var node = type.render();

		    if (type.$inline)
			    node = this._locateInput(id);
		    type.node = node;

		    var item = this.getItem(id);
		    //value can be configured by editValue option
		    var value = item[this._settings.editValue||"value"];
		    //if property was not defined - use empty value
		    if (webix.isUndefined(value))
			    value = "";

		    type.setValue(value, item);
		    type.value = value;

		    this._addEditor(id, type);

		    //show it over cell
		    if (show !== false)
			    this.showItem(id);
		    if (!type.$inline)
			    this._sizeToCell(id, node, true);

		    if (type.afterRender)
			    type.afterRender();

		    return node;
	    },
	    _locate_cell:function(id){
		    return this.getItemNode(id);
	    },
	    _locateInput:function(id){
		    var cell = this._locate_cell(id);
		    if (cell)
			    cell = cell.getElementsByTagName("input")[0] || cell;

		    return cell;
	    },
	    _get_editor_type:function(id){
		    return this._settings.editor;
	    },
	    _addEditor:function(id, type){
		    type.id = id;
		    this._editors[id]= this._last_editor = type;
		    this._in_edit_mode++;
	    },
	    _removeEditor:function(editor){
		    if (this._last_editor == editor)
			    this._last_editor = 0;
		    
		    if (editor.destroy)
			    editor.destroy();

		    delete editor.popup;
		    delete editor.node;

		    delete this._editors[editor.id];
		    this._in_edit_mode--;
	    },
	    focusEditor:function(id){
		    var editor = this.getEditor.apply(this, arguments);
		    if (editor && editor.focus)
			    editor.focus();
	    },
	    editCancel:function(){
		    this.editStop(null, null, true);
	    },
	    _applyChanges: function(el){
		    if (el){
			    var ed = this.getEditor();
			    if (ed && ed.getPopup && ed.getPopup() == el.getTopParentView()) return;
		    }
		    this.editStop();
	    },
	    editStop:function(id){
		    if (this._edit_stop) return;
		    this._edit_stop = 1;


		    var cancel = arguments[2];
		    var result = 1;
		    if (!id){
			    this._for_each_editor(function(editor){
				    result = result * this._editStop(editor, cancel);
			    });
		    } else 
			    result = this._editStop(this._editors[id], cancel);

		    this._edit_stop = 0;
		    return result;
	    },
	    _cellPosition:function(id){
		    var html = this.getItemNode(id);
		    return {
			    left:html.offsetLeft, 
			    top:html.offsetTop,
			    height:html.offsetHeight,
			    width:html.offsetWidth,
			    parent:this._contentobj
		    };
	    },
	    _sizeToCell:function(id, node, inline){
		    //fake inputs
		    if (!node.style) return;

		    var pos = this._cellPosition(id);

		    node.style.top = pos.top + "px";
		    node.style.left = pos.left + "px";

		    node.style.width = pos.width-1+"px";
		    node.style.height = pos.height-1+"px";

		    node.top = pos.top; //later will be used during y-scrolling

		    if (inline) pos.parent.appendChild(node);
	    },
	    _for_each_editor:function(handler){
		    for (var editor in this._editors)
			    handler.call(this, this._editors[editor]);
	    },
	    _editStop:function(editor, ignore){
		    if (!editor) return;
		    var state = { 
			    value : editor.getValue(), 
			    old : editor.value
		    };
		    if (this.callEvent("onBeforeEditStop", [state, editor, ignore])){
			    if (!ignore){
				    //special case, state.old = 0, state.value = ""
				    //we need to state.old to string, to detect the change
				    var old = state.old;
				    if (typeof state.value == "string") old += "";

				    if (old != state.value || editor.config.liveEdit){
					    var item = this._set_new_value(editor, state.value, true);
					    this.updateItem(editor.row || editor.id, item);
				    }
			    }
			    if (editor.$inline)
				    editor.node = null;
			    else
				    webix.html.remove(editor.node);

			    var popup = editor.config.suggest;
			    if (popup && typeof popup == "string")
				    webix.$$(popup).hide();

			    this._removeEditor(editor);
			    if (this._live_edits_handler)
				    this.detachEvent(this._live_edits_handler);

			    this.callEvent("onAfterEditStop", [state, editor, ignore]);
			    return 1;
		    }
		    return 0;
	    },
	    validateEditor:function(id){
		    var result = true;
		    if (this._settings.rules){
			    var editor = this.getEditor(id);
			    var key = editor.column||this._settings.editValue||"value";
			    var rule = this._settings.rules[key];
			    var all = this._settings.rules.$all;

			    if (rule || all){
				    var obj = this.data.getItem(editor.row||editor.id);
				    var value = editor.getValue();
				    var input = editor.getInputNode();

				    if (rule)
					    result = rule.call(this, value, obj, key);
				    if (all)
					    result = all.call(this, value, obj, key) && result;
			        
				    if (result)
					    webix.html.removeCss(input, "webix_invalid");
				    else
					    webix.html.addCss(input, "webix_invalid");

				    webix.callEvent("onLiveValidation", [editor, result, obj, value]);
			    }
		    }
		    return result;
	    },
	    getEditorValue:function(id){
		    var editor;
		    if (arguments.length === 0)
			    editor = this._last_editor;
		    else
			    editor = this.getEditor(id);

		    if (editor)
			    return editor.getValue();
	    },
	    getEditState:function(){
		    return this._last_editor || false;
	    },
	    editNext:function(next, from){ 
		    next = next !== false; //true by default
		    if (this._in_edit_mode == 1 || from){
			    //only if one editor is active
			    var editor_next = this._find_cell_next((this._last_editor || from), function(id){
				    if (this._get_editor_type(id))
					    return true;
				    return false;
			    }, next);

			    if (this.editStop()){	//if we was able to close previous editor
				    if (editor_next){	//and there is a new target
					    this.edit(editor_next);	//init new editor
					    this._after_edit_next(editor_next);
				    }
				    return false;
			    }
		    }
	    },
	    //stab, used in datatable
	    _after_edit_next:function(){},
	    _find_cell_next:function(start, check, direction){
		    var row = this.getIndexById(start.id);
		    var order = this.data.order;
		    
		    if (direction){
			    for (var i=row+1; i<order.length; i++){
				    if (check.call(this, order[i]))
					    return order[i];
			    }
		    } else {
			    for (var i=row-1; i>=0; i--){
				    if (check.call(this, order[i]))
					    return order[i];
			    }
		    }

		    return null;
	    },
	    _set_new_value:function(editor, new_value, copy){
		    var item = copy ? {} : this.getItem(editor.id);
		    item[this._settings.editValue||"value"] = new_value;
		    return item;
	    }
    };


    (function(){

        function init_suggest(editor, input){
	        var suggest = editor.config.suggest;
	        if (suggest){
		        var box = editor.config.suggest = create_suggest(suggest);
		        var boxobj = webix.$$(box);
		        if (boxobj && input)
			        boxobj.linkInput(input);
	        }
        }

        function create_suggest(config){
	        if (typeof config == "string") return config;
	        if (config.linkInput) return config._settings.id;

	        
	        if (typeof config == "object"){
		        if (webix.isArray(config))
			        config = { data: config };
		        config.view = config.view || "suggest";
	        } else if (config === true)
		        config = { view:"suggest" };

	        var obj = webix.ui(config);
	        return obj.config.id;
        }

        function getLabel(config){
	        var text = config.header && config.header[0]?config.header[0].text:config.editValue || config.label;
	        return (text || "").toString().replace(/<[^>]*>/g, "");
        }

        /*
	      this.node - html node, available after render call
	      this.config - editor config
	      this.value - original value
	      this.popup - id of popup 
        */
        webix.editors = {
	        "text":{
		        focus:function(){
			        this.getInputNode(this.node).focus();
			        this.getInputNode(this.node).select();
		        },
		        getValue:function(){
			        return this.getInputNode(this.node).value;
		        },
		        setValue:function(value){
			        var input = this.getInputNode(this.node);
			        input.value = value;

			        init_suggest(this, input);
		        },
		        getInputNode:function(){
			        return this.node.firstChild;
		        },
		        render:function(){
			        return webix.html.create("div", {
				        "class":"webix_dt_editor"
			        }, "<input type='text' aria-label='"+getLabel(this.config)+"'>");
		        }
	        },
	        "inline-checkbox":{
		        render:function(){ return {}; },
		        getValue:function(){
			        return this.node.checked;
		        },
		        setValue:function(){},
		        focus:function(){
			        this.node.focus();
		        },
		        getInputNode:function(){},
		        $inline:true
	        },
	        "inline-text":{
		        render:function(){ return {}; },
		        getValue:function(){
			        return this.node.value;
		        },
		        setValue:function(){},
		        focus:function(){
			        try{	//IE9
				        this.node.select();
				        this.node.focus();
			        } catch(e){}
		        },
		        getInputNode:function(){},
		        $inline:true
	        },
	        "checkbox":{
		        focus:function(){
			        this.getInputNode().focus();
		        },
		        getValue:function(){
			        return this.getInputNode().checked;
		        },
		        setValue:function(value){
			        this.getInputNode().checked = !!value;
		        },
		        getInputNode:function(){
			        return this.node.firstChild.firstChild;
		        },
		        render:function(){
			        return webix.html.create("div", {
				        "class":"webix_dt_editor"
			        }, "<div><input type='checkbox' aria-label='"+getLabel(this.config)+"'></div>");
		        }
	        },
	        "select":{
		        focus:function(){
			        this.getInputNode().focus();
		        },
		        getValue:function(){
			        return this.getInputNode().value;
		        },
		        setValue:function(value){
			        this.getInputNode().value = value;
		        },
		        getInputNode:function(){
			        return this.node.firstChild;
		        },
		        render:function(){
			        var html = "";
			        var options = this.config.options || this.config.collection;
			        webix.assert(options,"options not defined for select editor");

			        if (options.data && options.data.each)
				        options.data.each(function(obj){
					        html +="<option value='"+obj.id+"'>"+obj.value+"</option>";
				        });
			        else {
				        if (webix.isArray(options)){
					        for (var i=0; i<options.length; i++){
						        var rec = options[i];
						        var isplain = webix.isUndefined(rec.id);
						        var id = isplain ? rec : rec.id;
						        var label = isplain ? rec : rec.value;

						        html +="<option value='"+id+"'>"+label+"</option>";
					        }
				        } else for (var key in options){
					        html +="<option value='"+key+"'>"+options[key]+"</option>";
				        }
			        }

			        return webix.html.create("div", {
				        "class":"webix_dt_editor"
			        }, "<select aria-label='"+getLabel(this.config)+"'>"+html+"</select>");
		        }
	        },
	        popup:{
		        focus:function(){
			        this.getInputNode().focus();
		        },
		        destroy:function(){
			        this.getPopup().hide();
		        },
		        getValue:function(){
			        return this.getInputNode().getValue()||"";
		        },
		        setValue:function(value){
			        this.getPopup().show(this.node);
			        this.getInputNode().setValue(value);
		        },
		        getInputNode:function(){
			        return this.getPopup().getChildViews()[0];
		        },
		        getPopup:function(){
			        if (!this.config.popup)
				        this.config.popup = this.createPopup();

			        return webix.$$(this.config.popup);
		        },
		        createPopup:function(){
			        var popup = this.config.popup || this.config.suggest;

			        if (popup){
				        var pobj;
				        if (typeof popup == "object" && !popup.name){
					        popup.view = popup.view || "suggest";
					        pobj = webix.ui(popup);
				        } else
					        pobj = webix.$$(popup);

				        if (pobj.linkInput)
					        pobj.linkInput(document.body);
				        else if(this.linkInput)
					        this.linkInput(document.body);

				        return pobj;
			        }

			        var type = webix.editors.$popup[this.popupType];
			        if (typeof type != "string"){
				        type = webix.editors.$popup[this.popupType] = webix.ui(type);
				        this.popupInit(type);

				        if(!type.linkInput)
					        this.linkInput(document.body);
				        
			        }
			        return type._settings.id;
		        },
		        linkInput:function(node){
			        webix._event(webix.toNode(node), "keydown", webix.bind(function(e){
				        var code = e.which || e.keyCode, list = this.getInputNode();
				        if(!list.isVisible()) return;

				        if(code === 40){
					        if(list.moveSelection)
						        list.moveSelection("down");
					        webix.UIManager.setFocus(list);
				        } 
				        // shift+enter support for 'popup' editor
				        else if(code === 13 && ( e.target.nodeName !=="TEXTAREA" || !e.shiftKey))
					        webix.callEvent("onEditEnd", []);
				        
			        }, this));
		        },

		        popupInit:function(popup){},
		        popupType:"text",
		        render	:function(){ return {}; },
		        $inline:true
	        }
        };

        webix.editors.color = webix.extend({
	        focus	:function(){},
	        popupType:"color",
	        popupInit:function(popup){
		        popup.getChildViews()[0].attachEvent("onSelect", function(value){
			        webix.callEvent("onEditEnd",[value]);
		        });
	        }
        }, webix.editors.popup);

        webix.editors.date = webix.extend({
	        focus	:function(){},
	        popupType:"date",
	        setValue:function(value){
		        this._is_string = this.config.stringResult || (value && typeof value == "string");
		        webix.editors.popup.setValue.call(this, value);
	        },
	        getValue:function(){
		        return this.getInputNode().getValue(this._is_string?webix.i18n.parseFormatStr:"")||"";
	        },
	        popupInit:function(popup){
		        popup.getChildViews()[0].attachEvent("onDateSelect", function(value){
			        webix.callEvent("onEditEnd",[value]);
		        });
	        }
        }, webix.editors.popup);

        webix.editors.combo = webix.extend({
	        _create_suggest:function(config){
                if(this.config.popup){
                    return this.config.popup.config.id;
                }
		        else if (config){
			        return create_suggest(config);
		        } else
			        return this._shared_suggest(config);
	        },
	        _shared_suggest:function(){
		        var e = webix.editors.combo;
		        return (e._suggest = e._suggest || this._create_suggest(true));
	        },
	        render:function(){
		        var node = webix.html.create("div", {
			        "class":"webix_dt_editor"
		        }, "<input type='text' role='combobox' aria-label='"+getLabel(this.config)+"'>");

		        //save suggest id for future reference		
		        var suggest = this.config.suggest = this._create_suggest(this.config.suggest);

		        if (suggest){
			        webix.$$(suggest).linkInput(node.firstChild, true);
			        webix._event(node.firstChild, "click",webix.bind(this.showPopup, this));
		        }
		        return node;
	        },
	        getPopup:function(){
		        return webix.$$(this.config.suggest);
	        },
	        showPopup:function(){
		        var popup = this.getPopup();
                var list = popup.getList();
		        var input = this.getInputNode();
                var value = this.getValue();

		        popup.show(input);
		        input.setAttribute("aria-expanded", "true");
                if(value ){
                    webix.assert(list.exists(value), "Option with ID "+value+" doesn't exist");
                    if(list.exists(value)){
                        list.select(value);
                        list.showItem(value);
                    }
                }else{
                    list.unselect();
                    list.showItem(list.getFirstId());
                }
		        popup._last_input_target = input;
	        },
	        afterRender:function(){
		        this.showPopup();
	        },
	        setValue:function(value){
		        this._initial_value = value;
		        if (this.config.suggest){
			        var sobj = webix.$$(this.config.suggest);
			        var data =  this.config.collection || this.config.options;
			        if (data)
				        sobj.getList().data.importData(data);

			        this._initial_text = this.getInputNode(this.node).value = sobj.getItemText(value);
		        }
	        },
	        getValue:function(){
		        var value = this.getInputNode().value;
		        
		        if (this.config.suggest){
			        if (value == this._initial_text)
				        return this._initial_value;
			        return webix.$$(this.config.suggest).getSuggestion();
		        } else 
			        return value;
	        }
        }, webix.editors.text);


        webix.editors.richselect = webix.extend({
	        focus:function(){},
	        getValue:function(){
		        return this.getPopup().getValue();
	        },
	        setValue:function(value){
		        var suggest =  this.config.collection || this.config.options;
                var list = this.getInputNode();
		        if (suggest)
			        this.getPopup().getList().data.importData(suggest);

                this.getPopup().show(this.node);
                this.getPopup().setValue(value);
	        },
	        getInputNode:function(){
		        return this.getPopup().getList();
	        },
	        popupInit:function(popup){
		        popup.linkInput(document.body);
	        },
	        popupType:"richselect"
        }, webix.editors.popup);

        webix.editors.password = webix.extend({
	        render:function(){
		        return webix.html.create("div", {
			        "class":"webix_dt_editor"
		        }, "<input type='password' aria-label='"+getLabel(this.config)+"'>");
	        }
        }, webix.editors.text);

        webix.editors.$popup = {
	        text:{
		        view:"popup", width:250, height:150,
		        body:{ view:"textarea" }
	        },
	        color:{
		        view:"popup",
		        body:{ view:"colorboard" }
	        },
	        date:{
		        view:"popup", width:250, height:250, padding:0,
		        body:{ view:"calendar", icons:true, borderless:true }
	        },
	        richselect:{
		        view:"suggest",
		        body:{ view:"list", select:true }
	        }
        };

    })();
    
    



    /*
	  Renders collection of items
	  Always shows y-scroll
	  Can be used with huge datasets
	  
	  @export
	  show
	  render
    */

    

    webix.VirtualRenderStack={
	    $init:function(){
		    webix.assert(this.render,"VirtualRenderStack :: Object must use RenderStack first");
		    
		    this._htmlmap={}; //init map of rendered elements
            
            //we need to repaint area each time when view resized or scrolling state is changed
            webix._event(this._viewobj,"scroll",webix.bind(this._render_visible_rows,this));
		    if(webix.env.touch){
			    this.attachEvent("onAfterScroll", webix.bind(this._render_visible_rows,this));
		    }
		    //here we store IDs of elemenst which doesn't loadede yet, but need to be rendered
		    this._unrendered_area=[];
	    },
	    //return html object by item's ID. Can return null for not-rendering element
	    getItemNode:function(search_id){
		    //collection was filled in _render_visible_rows
		    return this._htmlmap[search_id];
	    },
	    //adjust scrolls to make item visible
	    showItem:function(id){
		    var range = this._getVisibleRange();
		    var ind = this.data.getIndexById(id);
		    //we can't use DOM method for not-rendered-yet items, so fallback to pure math
		    var dy = Math.floor(ind/range._dx)*range._y;
		    var state = this.getScrollState();
		    if (dy<state.y || dy + this._settings.height >= state.y + this._content_height)
			    this.scrollTo(0, dy);
	    },	
	    //repain self after changes in DOM
	    //for add, delete, move operations - render is delayed, to minify performance impact
	    render:function(id,data,type){
		    if (!this.isVisible(this._settings.id) || this.$blockRender)
			    return;
		    
		    if (webix.debug_render)
			    webix.log("Render: "+this.name+"@"+this._settings.id);
			
		    if (id){
			    var cont = this.getItemNode(id);	//old html element
			    switch(type){
				case "update":
					if (!cont) return;
					//replace old with new
					var t = this._htmlmap[id] = this._toHTMLObject(data);
					webix.html.insertBefore(t, cont); 
					webix.html.remove(cont);
					break;
				default: // "move", "add", "delete"
					/*
					  for all above operations, full repainting is necessary
					  but from practical point of view, we need only one repainting per thread
					  code below initiates double-thread-rendering trick
					*/
					this._render_delayed();
					break;
			    }
		    } else {
			    //full repainting
			    if (this.callEvent("onBeforeRender",[this.data])){
				    this._htmlmap = {}; 					//nulify links to already rendered elements
				    this._render_visible_rows(null, true);	
				    // clear delayed-rendering, because we already have repaint view
				    this._wait_for_render = false;			
				    this.callEvent("onAfterRender",[]);
			    }
		    }
	    },
	    //implement double-thread-rendering pattern
	    _render_delayed:function(){
		    //this flag can be reset from outside, to prevent actual rendering 
		    if (this._wait_for_render) return;
		    this._wait_for_render = true;	
		    
		    window.setTimeout(webix.bind(function(){
			    this.render();
		    },this),1);
	    },
	    //create empty placeholders, which will take space before rendering
	    _create_placeholder:function(height){
		    if(webix.env.maxHTMLElementSize)
			    height = Math.min(webix.env.maxHTMLElementSize, height);
		    var node = document.createElement("DIV");
			node.style.cssText = "height:"+height+"px; width:100%; overflow:hidden;";
		    return node;
	    },
	    /*
		  Methods get coordinatest of visible area and checks that all related items are rendered
		  If, during rendering, some not-loaded items was detected - extra data loading is initiated.
		  reset - flag, which forces clearing of previously rendered elements
	    */
	    _render_visible_rows:function(e,reset){
		    this._unrendered_area=[]; //clear results of previous calls
		    
		    var viewport = this._getVisibleRange();	//details of visible view

		    if (!this._dataobj.firstChild || reset){	//create initial placeholder - for all view space
			    this._dataobj.innerHTML="";
			    this._dataobj.appendChild(this._create_placeholder(viewport._max));
			    //register placeholder in collection
			    this._htmlrows = [this._dataobj.firstChild];
		    }
		    
		    /*
			  virtual rendering breaks all view on rows, because we know widht of item
			  we can calculate how much items can be placed on single row, and knowledge 
			  of that, allows to calculate count of such rows
			  
			  each time after scrolling, code iterate through visible rows and render items 
			  in them, if they are not rendered yet
			  
			  both rendered rows and placeholders are registered in _htmlrows collection
		    */

		    //position of first visible row
		    var t = viewport._from;
			
		    while(t<=viewport._height){	//loop for all visible rows
			    //skip already rendered rows
			    while(this._htmlrows[t] && this._htmlrows[t]._filled && t<=viewport._height){
				    t++; 
			    }
			    //go out if all is rendered
			    if (t>viewport._height) break;
			    
			    //locate nearest placeholder
			    var holder = t;
			    while (!this._htmlrows[holder]) holder--;
			    var holder_row = this._htmlrows[holder];
			    
			    //render elements in the row			
			    var base = t*viewport._dx+(this.data.$min||0);	//index of rendered item
			    if (base > (this.data.$max||Infinity)) break;	//check that row is in virtual bounds, defined by paging
			    var nextpoint =  Math.min(base+viewport._dx-1,(this.data.$max?this.data.$max-1:Infinity));
			    var node = this._create_placeholder(viewport._y);
			    //all items in rendered row
			    var range = this.data.getIndexRange(base, nextpoint);
			    if (!range.length) break; 
			    
			    var loading = { $template:"Loading" };
			    for (var i=0; i<range.length; i++){
				    if (!range[i])
	        		    this._unrendered_area.push(base+i);
				    range[i] = this._toHTML(range[i]||loading);
			    }

			    node.innerHTML=range.join(""); 	//actual rendering
			    for (var i=0; i < range.length; i++)					//register all new elements for later usage in getItemNode
				    this._htmlmap[this.data.getIdByIndex(base+i)]=node.childNodes[i];
			    
			    //correct placeholders
			    var h = parseFloat(holder_row.style.height,10);
			    var delta = (t-holder)*viewport._y;
			    var delta2 = (h-delta-viewport._y);
			    
			    //add new row to the DOOM
			    webix.html.insertBefore(node,delta?holder_row.nextSibling:holder_row,this._dataobj);
			    this._htmlrows[t]=node;
			    node._filled = true;
			    
			    /*
				  if new row is at start of placeholder - decrease placeholder's height
				  else if new row takes whole placeholder - remove placeholder from DOM
				  else 
				  we are inserting row in the middle of existing placeholder
				  decrease height of existing one, and add one more, 
				  before the newly added row
			    */
			    if (delta <= 0 && delta2>0){
				    holder_row.style.height = delta2+"px";
				    this._htmlrows[t+1] = holder_row;
			    } else {
				    if (delta<0)
					    webix.html.remove(holder_row);
				    else
					    holder_row.style.height = delta+"px";
				    if (delta2>0){ 
					    var new_space = this._htmlrows[t+1] = this._create_placeholder(delta2);
					    webix.html.insertBefore(new_space,node.nextSibling,this._dataobj);
				    }
			    }
			    
			    
			    t++;
		    }
		    
		    //when all done, check for non-loaded items
		    if (this._unrendered_area.length){
			    //we have some data to load
			    //detect borders
			    var from = this._unrendered_area[0];
			    var to = this._unrendered_area.pop()+1;
			    if (to>from){
				    //initiate data loading
				    var count = to - from;
				    if (this._maybe_loading_already(count, from)) return;

				    count = Math.max(count, (this._settings.datafetch||this._settings.loadahead||0));
				    this.loadNext(count, from);
			    }
		    }
	    },
	    //calculates visible view
	    _getVisibleRange:function(){
		    var state = this.getScrollState();
		    var top = state.y;
		    var width = this._content_width; 
		    var height = this._content_height;

		    //size of single item
		    var t = this.type;

		    var dx = Math.floor(width/t.width)||1; //at least single item per row
		    
		    var min = Math.floor(top/t.height);				//index of first visible row
		    var dy = Math.ceil((height+top)/t.height)-1;		//index of last visible row
		    //total count of items, paging can affect this math
		    var count = this.data.$max?(this.data.$max-this.data.$min):this.data.count();
		    var max = Math.ceil(count/dx)*t.height;			//size of view in rows

		    return { _from:min, _height:dy, _top:top, _max:max, _y:t.height, _dx:dx};
	    },
	    _cellPosition:function(id){
		    var html = this.getItemNode(id);
		    if (!html){
			    this.showItem(id);
			    this._render_visible_rows();
			    html = this.getItemNode(id);
		    }
		    return {
			    left:html.offsetLeft, 
			    top:html.offsetTop,
			    height:html.offsetHeight,
			    width:html.offsetWidth,
			    parent:this._contentobj
		    };
	    }
    };





    webix.DataDriver.htmltable={

	    //convert json string to json object if necessary
	    toObject:function(data){
		    data = webix.toNode(data);
		    webix.assert(data, "table is not found");
		    webix.assert(data.tagName.toLowerCase() === 'table', "Incorrect table object");

		    var tr = data.rows;
		    webix.html.remove(data);
		    return tr;
	    },
	    //get array of records
	    getRecords:function(data){
		    var new_data = [];
		    //skip header rows if necessary
		    var i = (data[0] && data[0]._webix_skip)?1:0;

		    for (; i < data.length; i++)
			    new_data.push(data[i]);
		    return new_data;
	    },
	    //get hash of properties for single record
	    getDetails:function(data){
		    var td = data.getElementsByTagName('td');
		    data = {};
		    //get hash of properties for single record, data named as "data{index}"
		    for (var i=0; i < td.length; i++) {
			    data['data' + i] = td[i].innerHTML;
		    }
		    return data;
	    },
	    //get count of data and position at which new data need to be inserted
	    getInfo:function(data){
		    // dyn loading is not supported for htmltable
		    return { 
			    size:0,
			    from:0
		    };
	    },
	    getOptions:function(){},

	    /*! gets header from first table row
	    **/
	    getConfig: function(data) {
		    var columns = [];
		    var td = data[0].getElementsByTagName('th');
		    if (td.length) data[0]._webix_skip = true;
		    for (var i = 0; i < td.length; i++) {
			    var col = {
				    id: 'data' + i,
				    header: this._de_json(td[i].innerHTML)
			    };
			    var attrs = this._get_attrs(td[i]);
			    col = webix.extend(col, attrs);
			    columns.push(col);
		    }
		    return columns;
	    },

	    _de_json:function(str){
		    var pos = str.indexOf("json://");
		    
		    if (pos != -1)
			    str = JSON.parse(str.substr(pos+7));
		    return str;
	    },
	    
	    /*! gets hash of html-element attributes
	    **/
	    _get_attrs: function(el) {
		    var attr = el.attributes;
		    var hash = {};
		    for (var i = 0; i < attr.length; i++) {
			    hash[attr[i].nodeName] = this._de_json(attr[i].nodeValue);
		    }
		    hash.width = parseInt(hash.width, 10);
		    return hash;
	    }
    };


    webix.Number={
	    format: function(value, config){ 
		    if (value === "" || typeof value === "undefined") return value;
		    
		    config = config||webix.i18n;
		    value = parseFloat(value);

		    var sign = value < 0 ? "-":"";
		    value = Math.abs(value);

		    var str = value.toFixed(config.decimalSize).toString();
		    str = str.split(".");

		    var int_value = "";
		    if (config.groupSize){
			    var step = config.groupSize;
			    var i=str[0].length;
			    do {
				    i-=step;
				    var chunk = (i>0)?str[0].substr(i,step):str[0].substr(0,step+i);
				    int_value = chunk+(int_value?config.groupDelimiter+int_value:"");
			    } while(i>0);
		    } else
			    int_value = str[0];

		    if (config.decimalSize)
			    return sign + int_value + config.decimalDelimiter + str[1];
		    else
			    return sign + int_value;
	    },
	    numToStr:function(config){
		    return function(value){
			    return webix.Number.format(value, config);
		    };
	    }
    };

    webix.Date={
	    startOnMonday:false,

	    toFixed:function(num){
		    if (num<10)	return "0"+num;
		    return num;
	    },
	    weekStart:function(date){
		    date = this.copy(date);

		    var shift=date.getDay();
		    if (this.startOnMonday){
			    if (shift===0) shift=6;
			    else shift--;
		    }
		    return this.datePart(this.add(date,-1*shift,"day"));
	    },
	    monthStart:function(date){
		    date = this.copy(date);

		    date.setDate(1);
		    return this.datePart(date);
	    },
	    yearStart:function(date){
		    date = this.copy(date);

		    date.setMonth(0);
		    return this.monthStart(date);
	    },
	    dayStart:function(date){
		    return this.datePart(date, true);
	    },
	    dateToStr:function(format,utc){
		    if (typeof format == "function") return format;

		    if(webix.env.strict){
			    return function(date){
				    var str = "";
				    var lastPos = 0;
				    format.replace(/%[a-zA-Z]/g,function(s,pos){
					    str += format.slice(lastPos,pos);
					    var fn = function(date){
						    if( s == "%d")  return webix.Date.toFixed(date.getDate());
						    if( s == "%m")  return webix.Date.toFixed((date.getMonth()+1));
						    if( s == "%j")  return date.getDate();
						    if( s == "%n")  return (date.getMonth()+1);
						    if( s == "%y")  return webix.Date.toFixed(date.getFullYear()%100);
						    if( s == "%Y")  return date.getFullYear();
						    if( s == "%D")  return webix.i18n.calendar.dayShort[date.getDay()];
						    if( s == "%l")  return webix.i18n.calendar.dayFull[date.getDay()];
						    if( s == "%M")  return webix.i18n.calendar.monthShort[date.getMonth()];
						    if( s == "%F")  return webix.i18n.calendar.monthFull[date.getMonth()];
						    if( s == "%h")  return webix.Date.toFixed((date.getHours()+11)%12+1);
						    if( s == "%g")  return ((date.getHours()+11)%12+1);
						    if( s == "%G")  return date.getHours();
						    if( s == "%H")  return webix.Date.toFixed(date.getHours());
						    if( s == "%i")  return webix.Date.toFixed(date.getMinutes());
						    if( s == "%a")  return (date.getHours()>11?webix.i18n.pm[0]:webix.i18n.am[0]);
						    if( s == "%A")  return (date.getHours()>11?webix.i18n.pm[1]:webix.i18n.am[1]);
						    if( s == "%s")  return webix.Date.toFixed(date.getSeconds());
						    if( s == "%S")	return webix.Date.toFixed(date.getMilliseconds());
						    if( s == "%W")  return webix.Date.toFixed(webix.Date.getISOWeek(date));
						    if( s == "%c"){
							    var str = date.getFullYear();
							    str += "-"+webix.Date.toFixed((date.getMonth()+1));
							    str += "-"+webix.Date.toFixed(date.getDate());
							    str += "T";
							    str += webix.Date.toFixed(date.getHours());
							    str += ":"+webix.Date.toFixed(date.getMinutes());
							    str += ":"+webix.Date.toFixed(date.getSeconds());
							    return str;
						    }
						    return s;
					    };
					    str += fn(date);
					    lastPos = pos + 2;
				    });
				    str += format.slice(lastPos,format.length);
				    return str;
			    };

		    }

		    format=format.replace(/%[a-zA-Z]/g,function(a){
			    switch(a){
				case "%d": return "\"+webix.Date.toFixed(date.getDate())+\"";
				case "%m": return "\"+webix.Date.toFixed((date.getMonth()+1))+\"";
				case "%j": return "\"+date.getDate()+\"";
				case "%n": return "\"+(date.getMonth()+1)+\"";
				case "%y": return "\"+webix.Date.toFixed(date.getFullYear()%100)+\""; 
				case "%Y": return "\"+date.getFullYear()+\"";
				case "%D": return "\"+webix.i18n.calendar.dayShort[date.getDay()]+\"";
				case "%l": return "\"+webix.i18n.calendar.dayFull[date.getDay()]+\"";
				case "%M": return "\"+webix.i18n.calendar.monthShort[date.getMonth()]+\"";
				case "%F": return "\"+webix.i18n.calendar.monthFull[date.getMonth()]+\"";
				case "%h": return "\"+webix.Date.toFixed((date.getHours()+11)%12+1)+\"";
				case "%g": return "\"+((date.getHours()+11)%12+1)+\"";
				case "%G": return "\"+date.getHours()+\"";
				case "%H": return "\"+webix.Date.toFixed(date.getHours())+\"";
				case "%i": return "\"+webix.Date.toFixed(date.getMinutes())+\"";
				case "%a": return "\"+(date.getHours()>11?webix.i18n.pm[0]:webix.i18n.am[0])+\"";
				case "%A": return "\"+(date.getHours()>11?webix.i18n.pm[1]:webix.i18n.am[1])+\"";
				case "%s": return "\"+webix.Date.toFixed(date.getSeconds())+\"";
				case "%S": return "\"+webix.Date.toFixed(date.getMilliseconds())+\"";
				case "%W": return "\"+webix.Date.toFixed(webix.Date.getISOWeek(date))+\"";
				case "%c":
					var str = "\"+date.getFullYear()+\"";
					str += "-\"+webix.Date.toFixed((date.getMonth()+1))+\"";
					str += "-\"+webix.Date.toFixed(date.getDate())+\"";
					str += "T";
					str += "\"+webix.Date.toFixed(date.getHours())+\"";
					str += ":\"+webix.Date.toFixed(date.getMinutes())+\"";
					str += ":\"+webix.Date.toFixed(date.getSeconds())+\"";
					if(utc === true)
						str += "Z";
					return str;

				default: return a;
			    }
		    });
		    if (utc===true) format=format.replace(/date\.get/g,"date.getUTC");
		    return new Function("date","if (!date) return ''; if (!date.getMonth) date=webix.i18n.parseFormatDate(date);  return \""+format+"\";");
	    },
	    strToDate:function(format,utc){
		    if (typeof format == "function") return format;

		    var mask=format.match(/%[a-zA-Z]/g);
		    var splt="var temp=date.split(/[^0-9a-zA-Z]+/g);";
		    var i,t,s;

		    if(!webix.i18n.calendar.monthShort_hash){
			    s = webix.i18n.calendar.monthShort;
			    t = webix.i18n.calendar.monthShort_hash = {};
			    for (i = 0; i < s.length; i++)
				    t[s[i]]=i;

			    s = webix.i18n.calendar.monthFull;
			    t = webix.i18n.calendar.monthFull_hash = {};
			    for (i = 0; i < s.length; i++)
				    t[s[i]]=i;
		    }

		    if(webix.env.strict){
			    return function(date){
				    if (!date) return '';
				    if (typeof date == 'object') return date;
				    var temp=date.split(/[^0-9a-zA-Z]+/g);
				    var set=[0,0,1,0,0,0,0];
				    for (i=0; i<mask.length; i++){
					    var a = mask[i];
					    if( a ==  "%y")
						    set[0]=temp[i]*1+(temp[i]>30?1900:2000);
					    else if( a ==  "%Y"){
						    set[0]=(temp[i]||0)*1; if (set[0]<30) set[0]+=2000;
					    }
					    else if( a == "%n" || a == "%m")
						    set[1]=(temp[i]||1)-1;
					    else if( a ==  "%M")
						    set[1]=webix.i18n.calendar.monthShort_hash[temp[i]]||0;
					    else if( a ==  "%F")
						    set[1]=webix.i18n.calendar.monthFull_hash[temp[i]]||0;
					    else if( a == "%j" || a == "%d")
						    set[2]=temp[i]||1;
					    else if( a == "%g" || a == "%G" || a == "%h" || a == "%H")
						    set[3]=temp[i]||0;
					    else if( a == "%a")
							set[3]=set[3]%12+((temp[i]||'')==webix.i18n.am[0]?0:12);
					    else if( a == "%A")
						    set[3]=set[3]%12+((temp[i]||'')==webix.i18n.am[1]?0:12);
					    else if( a ==  "%i")
						    set[4]=temp[i]||0;
					    else if( a ==  "%s")
						    set[5]=temp[i]||0;
					    else if( a ==  "%S")
						    set[6]=temp[i]||0;
					    else if( a ==  "%c"){
						    var reg = /(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)(\+.*|)/g;
						    var res = reg.exec(date);
						    set[0]= (res[1]||0)*1; if (set[0]<30) set[0]+=2000;
						    set[1]= (res[2]||1)-1;
						    set[2]= res[3]||1;
						    set[3]= res[4]||0;
						    set[4]= res[5]||0;
						    set[5]= res[6]||0;
					    }
				    }
				    if(utc)
					    return new Date(Date.UTC(set[0],set[1],set[2],set[3],set[4],set[5], set[6]));
				    return new Date(set[0],set[1],set[2],set[3],set[4],set[5], set[6]);
			    };
		    }

		    for (i=0; i<mask.length; i++){
			    switch(mask[i]){
				case "%j":
				case "%d": splt+="set[2]=temp["+i+"]||1;";
					break;
				case "%n":
				case "%m": splt+="set[1]=(temp["+i+"]||1)-1;";
					break;
				case "%y": splt+="set[0]=temp["+i+"]*1+(temp["+i+"]>30?1900:2000);";
					break;
				case "%g":
				case "%G":
				case "%h": 
				case "%H":
					splt+="set[3]=temp["+i+"]||0;";
					break;
				case "%i":
					splt+="set[4]=temp["+i+"]||0;";
					break;
				case "%Y":  splt+="set[0]=(temp["+i+"]||0)*1; if (set[0]<30) set[0]+=2000;";
					break;
				case "%a":
					splt+= "set[3]=set[3]%12+(temp["+i+"]==webix.i18n.am[0]?0:12);";
					break;
				case "%A":
					splt+= "set[3]=set[3]%12+(temp["+i+"]==webix.i18n.am[1]?0:12);";
					break;					
				case "%s":  splt+="set[5]=temp["+i+"]||0;";
					break;
				case "%S":  splt+="set[6]=temp["+i+"]||0;";
					break;
				case "%M":  splt+="set[1]=webix.i18n.calendar.monthShort_hash[temp["+i+"]]||0;";
					break;
				case "%F":  splt+="set[1]=webix.i18n.calendar.monthFull_hash[temp["+i+"]]||0;";
					break;
				case "%c":
					splt+= "var res = date.split('T');";
					splt+= "if(res[0]){ var d = res[0].split('-');";
					splt+= "set[0]= (d[0]||0)*1; if (set[0]<30) set[0]+=2000;";
					splt+= "set[1]= (d[1]||1)-1;";
					splt+= "set[2]= d[2]||1;}";
					splt+= "if(res[1]){ var t = res[1].split(':');";
					splt+= "set[3]= t[0]||0;";
					splt+= "set[4]= t[1]||0;";
					splt+= "set[5]= parseInt(t[2])||0;}";
					break;
				default:
					break;
			    }
		    }
		    var code ="set[0],set[1],set[2],set[3],set[4],set[5], set[6]";
		    if (utc) code =" Date.UTC("+code+")";
		    return new Function("date","if (!date) return ''; if (typeof date == 'object') return date; var set=[0,0,1,0,0,0,0]; "+splt+" return new Date("+code+");");
	    },
		
	    getISOWeek: function(ndate) {
		    if(!ndate) return false;
		    var nday = ndate.getDay();
		    if (nday === 0) {
			    nday = 7;
		    }
		    var first_thursday = new Date(ndate.valueOf());
		    first_thursday.setDate(ndate.getDate() + (4 - nday));
		    var year_number = first_thursday.getFullYear(); // year of the first Thursday
		    var ordinal_date = Math.floor( (first_thursday.getTime() - new Date(year_number, 0, 1).getTime()) / 86400000); //ordinal date of the first Thursday - 1 (so not really ordinal date)
		    var weekNumber = 1 + Math.floor( ordinal_date / 7);	
		    return weekNumber;
	    },
	    
	    getUTCISOWeek: function(ndate){
		    return this.getISOWeek(ndate);
	    },
	    _correctDate: function(d,d0,inc,checkFunc){
		    if(!inc)
			    return;
		    var incorrect = checkFunc(d,d0);
		    if(incorrect){
			    var i = (inc>0?1:-1);

			    while(incorrect){
				    d.setHours(d.getHours()+i);
				    incorrect = checkFunc(d,d0);
				    i += (inc>0?1:-1);
			    }
		    }
	    },
	    add:function(date,inc,mode,copy){
		    if (copy) date = this.copy(date);
		    var d = webix.Date.copy(date);
		    switch(mode){
			case "day":
				date.setDate(date.getDate()+inc);
				this._correctDate(date,d,inc,function(d,d0){
					return 	webix.Date.datePart(d0,true).valueOf()== webix.Date.datePart(d,true).valueOf();
				});
				break;
			case "week":
				date.setDate(date.getDate()+7*inc);
				this._correctDate(date,d,7*inc,function(d,d0){
					return 	webix.Date.datePart(d0,true).valueOf()== webix.Date.datePart(d,true).valueOf();
				});
				break;
			case "month":
				date.setMonth(date.getMonth()+inc);
				this._correctDate(date,d,inc,function(d,d0){
					return 	d0.getMonth() == d.getMonth() && d0.getYear() == d.getYear();
				});
				break;
			case "year":
				date.setYear(date.getFullYear()+inc);
				this._correctDate(date,d,inc,function(d,d0){
					return 	d0.getFullYear() == d.getFullYear();
				});
				break;
			case "hour":
				date.setHours(date.getHours()+inc);
				this._correctDate(date,d,inc,function(d,d0){
					return 	d0.getHours() == d.getHours() && webix.Date.datePart(d0,true)== webix.Date.datePart(d,true);
				});
				break;
			case "minute": 	date.setMinutes(date.getMinutes()+inc); break;
			default:
				webix.Date.add[mode](date, inc, mode);
				break;
		    }
		    return date;
	    },
	    datePart:function(date, copy){
		    if (copy) date = this.copy(date);

		    // workaround for non-existent hours
		    var d = this.copy(date);
		    d.setHours(0);
		    if(d.getDate()!=date.getDate()){
			    date.setHours(1);
		    }
		    else{
			    date.setHours(0);
		    }

		    date.setMinutes(0);
		    date.setSeconds(0);
		    date.setMilliseconds(0);
		    return date;
	    },
	    timePart:function(date, copy){
		    if (copy) date = this.copy(date);
		    return (date.valueOf()/1000 - date.getTimezoneOffset()*60)%86400;
	    },
	    copy:function(date){
		    return new Date(date.valueOf());
	    },
	    equal:function(a,b){
		    if (!a || !b) return false;
		    return a.valueOf() === b.valueOf();
	    },
	    isHoliday:function(day){ 
		    day = day.getDay();
		    if (day === 0 || day==6) return "webix_cal_event"; 
	    }
    };


    webix.i18n = {
	    _dateMethods:["fullDateFormat", "timeFormat", "dateFormat", "longDateFormat", "parseFormat", "parseTimeFormat"],
	    parseFormat:"%Y-%m-%d %H:%i",
	    parseTimeFormat:"%H:%i",
	    numberFormat:webix.Number.format,
	    priceFormat:function(value){ return webix.i18n._price_format(webix.i18n.numberFormat(value, webix.i18n._price_settings)); },

	    setLocale:function(locale){
		    var extend = function(base,source){
			    for (var method in source){
				    if(typeof(source[method]) == "object" && !webix.isArray(source[method])){
					    if(!base[method]){
						    base[method] = {};
					    }
					    extend(base[method],source[method]);
				    }
				    else
					    base[method] = source[method];
			    }
		    };

		    if (typeof locale == "string")
			    locale = this.locales[locale];
		    if (locale){
			    extend(this, locale);
		    }
		    var helpers = webix.i18n._dateMethods;
		    for( var i=0; i<helpers.length; i++){
			    var key = helpers[i];
			    var utc = webix.i18n[key+"UTC"];
			    webix.i18n[key+"Str"] = webix.Date.dateToStr(webix.i18n[key], utc);
			    webix.i18n[key+"Date"] = webix.Date.strToDate(webix.i18n[key], utc);
		    }

		    this._price_format = webix.template(this.price);
		    this._price_settings = this.priceSettings || this;

		    this.intFormat = webix.Number.numToStr({ groupSize:this.groupSize, groupDelimiter:this.groupDelimiter, decimalSize : 0});
	    }
    };


    webix.i18n.locales={};
    webix.i18n.locales["en-US"]={
	    groupDelimiter:",",
	    groupSize:3,
	    decimalDelimiter:".",
	    decimalSize:2,

	    dateFormat:"%m/%d/%Y",
	    timeFormat:"%h:%i %A",
	    longDateFormat:"%d %F %Y",
	    fullDateFormat:"%m/%d/%Y %h:%i %A",
	    am:["am","AM"],
	    pm:["pm","PM"],

	    price:"${obj}",
	    priceSettings:{
            groupDelimiter:",",
            groupSize:3,
            decimalDelimiter:".",
            decimalSize:2
        },
	    fileSize: ["b","Kb","Mb","Gb","Tb","Pb","Eb"],
	    
	    calendar: {
		    monthFull:["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
		    monthShort:["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
		    dayFull:["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    	    dayShort:["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
		    hours: "Hours",
		    minutes: "Minutes",
		    done:"Done",
		    clear: "Clear",
		    today: "Today"
        },

        controls:{
    	    select:"Select",
    	    invalidMessage: "Invalid input value"
        },
        dataExport:{
		    page:"Page",
		    of:"of"
        },
        PDFviewer:{
		    of:"of",
		    automaticZoom:"Automatic Zoom",
		    actualSize:"Actual Size",
		    pageFit:"Page Fit",
		    pageWidth:"Page Width",
		    pageHeight:"Page Height"
        },
        aria:{
		    calendar:"Calendar",
		    increaseValue:"Increase value",
		    decreaseValue:"Decrease value",
		    navMonth:["Previous month", "Next month"],
		    navYear:["Previous year", "Next year"],
		    navDecade:["Previous decade", "Next decade"],
		    dateFormat:"%d %F %Y",
		    monthFormat:"%F %Y",
		    yearFormat:"%Y",
		    hourFormat:"Hours: %h %A",
		    minuteFormat:"Minutes: %i",
		    removeItem:"Remove item",
		    pages:["First page", "Previous page", "Next page", "Last page"],
		    page:"Page",
		    headermenu:"Header menu",
		    openGroup:"Open column group",
		    closeGroup:"Close column group",
		    closeTab:"Close tab",
		    showTabs:"Show more tabs",
		    resetTreeMap:"Reset tree map",
		    navTreeMap:"Level up",
		    nextTab:"Next tab",
		    prevTab:"Previous tab",
		    multitextSection:"Add section",
		    multitextextraSection:"Remove section",
		    showChart:"Show chart",
		    hideChart:"Hide chart",
		    resizeChart:"Resize chart"
        },
        richtext:{
            underline: "Underline",
            bold: "Bold",
            italic: "Italic"
        }
    };
    webix.i18n.setLocale("en-US");






    webix.ui.datafilter = {
	    textWaitDelay:500,
	    "summColumn":{
		    getValue:function(node){ return node.firstChild.innerHTML; },
		    setValue: function(){},
		    refresh:function(master, node, value){ 
			    var result = 0;
			    master.mapCells(null, value.columnId, null, 1, function(value){
				    value = value*1;
				    if (!isNaN(value))
					    result+=value;
			    }, true);

			    if (value.format)
				    result = value.format(result);
			    if (value.template)
				    result = value.template({value:result});

			    node.firstChild.innerHTML = result;
		    },
		    trackCells:true,
		    render:function(master, config){ 
			    if (config.template)
				    config.template = webix.template(config.template);
			    return ""; 
		    }
	    },
	    "masterCheckbox":{
		    getValue:function(){},
		    setValue:function(){},
		    getHelper:function(node, config){
			    return {
				    check:function(){ config.checked = false; node.onclick(); },
				    uncheck:function(){ config.checked = true; node.onclick(); },
				    isChecked:function(){ return config.checked; }
			    };
		    },
		    refresh:function(master, node, config){
			    node.onclick = function(){
				    this.getElementsByTagName("input")[0].checked = config.checked = !config.checked;
				    var column = master.getColumnConfig(config.columnId);
				    var checked = config.checked ? column.checkValue : column.uncheckValue;
				    master.data.each(function(obj){
					    if(obj){ //dyn loading
						    obj[config.columnId] = checked;
						    master.callEvent("onCheck", [obj.id, config.columnId, checked]);
						    this.callEvent("onStoreUpdated", [obj.id, obj, "save"]);
					    }
				    });
				    master.refresh();
			    };
		    },
		    render:function(master, config){ 
			    return "<input type='checkbox' "+(config.checked?"checked='1'":"")+">"; 
		    }
	    },
	    "textFilter":{
		    getInputNode:function(node){ return node.firstChild?node.firstChild.firstChild:{ value: null }; },
		    getValue:function(node){ return this.getInputNode(node).value;  },
		    setValue:function(node, value){ this.getInputNode(node).value = value;  },
		    refresh:function(master, node, value){
			    node.component = master._settings.id;
			    master.registerFilter(node, value, this);
			    node._comp_id = master._settings.id;
			    if (value.value && this.getValue(node) != value.value) this.setValue(node, value.value);
			    node.onclick = webix.html.preventEvent;
			    webix._event(node, "keydown", this._on_key_down);
		    },
		    render:function(master, config){
			    if (this.init) this.init(config);
		  	    config.css = "webix_ss_filter"; 
		  	    return "<input "+(config.placeholder?('placeholder="'+config.placeholder+'" '):"")+"type='text'>"; 
		    },
		    _on_key_down:function(e, node, value){
			    var id = this._comp_id;

			    //tabbing through filters must not trigger filtering
			    //we can improve this functionality by preserving initial filter value
			    //and comparing new one with it
			    if ((e.which || e.keyCode) == 9) return;

			    if (this._filter_timer) window.clearTimeout(this._filter_timer);
			    this._filter_timer=window.setTimeout(function(){
				    var ui = webix.$$(id);
				    //ensure that ui is not destroyed yet
				    if (ui) ui.filterByAll();
			    },webix.ui.datafilter.textWaitDelay);
		    }
	    },
	    "selectFilter":{
		    getInputNode:function(node){ return node.firstChild?node.firstChild.firstChild:{ value: null}; },
		    getValue:function(node){ return this.getInputNode(node).value;  },
		    setValue:function(node, value){ this.getInputNode(node).value = value;  },
		    refresh:function(master, node, value){
			    //value - config from header { contet: }
			    value.compare = value.compare || function(a,b){ return a == b; };

			    node.component = master._settings.id;
			    master.registerFilter(node, value, this);

			    var data;
			    var options = value.options;
			    if (options){
				    if(typeof options =="string"){
					    data = value.options = [];
					    webix.ajax(options).then(webix.bind(function(data){
						    value.options = data.json();
						    this.refresh(master, node, value);
					    }, this));
				    } else
					    data = options;
			    }
			    else{
				    data = master.collectValues(value.columnId);
				    data.unshift({ id:"", value:"" });
			    }

			    var optview = webix.$$(options);
			    if(optview && optview.data && optview.data.getRange){
				    data = optview.data.getRange();
			    }
			    //slow in IE
			    //http://jsperf.com/select-options-vs-innerhtml

			    var select = document.createElement("select");
			    for (var i = 0; i < data.length; i++){
				    var option = document.createElement("option");
				    option.value = data[i].id;
				    option.text = data[i].value;
				    select.add(option);
			    }

			    node.firstChild.innerHTML = "";
			    node.firstChild.appendChild(select);

			    if (value.value) this.setValue(node, value.value);
			    node.onclick = webix.html.preventEvent;

			    select._comp_id = master._settings.id;
			    webix._event(select, "change", this._on_change);
		    },
		    render:function(master, config){  
			    if (this.init) this.init(config);
			    config.css = "webix_ss_filter"; return ""; },
		    _on_change:function(e, node, value){ 
			    webix.$$(this._comp_id).filterByAll();
		    }
	    }
    };

    webix.ui.datafilter.serverFilter = webix.extend({
	    $server: true,
	    _on_key_down:function(e, node, value){
		    var config, name,
			    id = this._comp_id,
			    code = (e.which || e.keyCode);

		    node = e.target || e.srcElement;
		    //ignore tab and navigation keys
		    if (code == 9 || ( code >= 33 &&  code <= 40)) return;
		    if (this._filter_timer) window.clearTimeout(this._filter_timer);
		    this._filter_timer=window.setTimeout(function(){
			    webix.$$(id).filterByAll();
		    },webix.ui.datafilter.textWaitDelay);
	    }
    }, webix.ui.datafilter.textFilter);

    webix.ui.datafilter.serverSelectFilter = webix.extend({
	    $server: true,
	    _on_change:function(e, node, value){
		    var id = this._comp_id;
		    webix.$$(id).filterByAll();
	    }
    }, webix.ui.datafilter.selectFilter);

    webix.ui.datafilter.numberFilter = webix.extend({
	    init:function(config){
		    config.prepare = function(value, filter){
			    var equality = (value.indexOf("=") != -1)?1:0;
			    var intvalue = this.format(value);
			    if (intvalue === "") return "";

			    if (value.indexOf(">") != -1) 
				    config.compare = this._greater;
			    else if (value.indexOf("<") != -1){
				    config.compare = this._lesser;
				    equality *= -1;
			    }
			    else {
				    config.compare = this._equal;
				    equality = 0;
			    }

			    return intvalue - equality;
		    };
	    },
	    format:function(value){
		    return value.replace(/[^\-\.0-9]/g,"");
	    },
	    _greater:function(a,b){ return a*1>b; },
	    _lesser:function(a,b){ return a!=="" && a*1<b; },
	    _equal:function(a,b){ return a*1==b; }	
    }, webix.ui.datafilter.textFilter);

    webix.ui.datafilter.dateFilter = webix.extend({
	    format:function(value){
		    if (value === "") return "";
		    var date = new Date();

		    if (value.indexOf("today") != -1){
			    date = webix.Date.dayStart(date);
		    } else if (value.indexOf("now") == -1){
			    var parts = value.match(/[0-9]+/g);
			    if (!parts||!parts.length) return "";
			    if (parts.length < 3){
				    parts.reverse();
				    date = new Date(parts[0], (parts[1]||1)-1, 1);
			    } else
				    date = webix.i18n.dateFormatDate(value.replace(/^[>< =]+/,""));
		    }
		    return date.valueOf();
	    }
    }, webix.ui.datafilter.numberFilter);



    webix.csv = {
	    escape:true,
	    delimiter:{
		    rows: "\n",
		    cols: "\t"
	    },
	    parse:function(text, sep){
		    sep = sep||this.delimiter;
		    if (!this.escape)
			    return this._split_clip_data(text, sep);

		    var lines = text.replace(/\n$/,"").split(sep.rows);

		    var i = 0;
		    while (i < lines.length - 1) {
			    if (this._substr_count(lines[i], '"') % 2 === 1) {
				    lines[i] += sep.rows + lines[i + 1];
				    delete lines[i + 1];
				    i++;
			    }
			    i++;
		    }
		    var csv = [];
		    for (i = 0; i < lines.length; i++) {
			    if (typeof(lines[i]) !== 'undefined') {
				    var line = lines[i].split(sep.cols);
				    for (var j = 0; j < line.length; j++) {
					    if (line[j].indexOf('"') === 0)
						    line[j] = line[j].substr(1, line[j].length - 2);
					    line[j] = line[j].replace('""', '"');
				    }
				    csv.push(line);
			    }
		    }
		    return csv;
	    },
	    _split_clip_data: function(text, sep) {
		    var lines = text.split(sep.rows);
		    for (var i = 0; i < lines.length; i++) {
			    lines[i] = lines[i].split(sep.cols);
		    }
		    return lines;
	    },
	    /*! counts how many occurances substring in string **/
	    _substr_count: function(string, substring) {
		    var arr = string.split(substring);
		    return arr.length - 1;
	    },
	    stringify:function(data, sep){
		    sep = sep||this.delimiter;

		    if (!this.escape){
			    for (var i = 0; i < data.length; i++)
				    data[i] = data[i].join(sep.cols);
			    return data.join(sep.rows);
		    }

		    var reg = /\n|\"|;|,/;
		    for (var i = 0; i < data.length; i++) {
			    for (var j = 0; j < data[i].length; j++) {
				    if (reg.test(data[i][j])) {
					    data[i][j] = data[i][j].replace(/"/g, '""');
					    data[i][j] = '"' + data[i][j] + '"';
				    }
			    }
			    data[i] = data[i].join(sep.cols);
		    }
		    data = data.join(sep.rows);
		    return data;
	    }
    };

    webix.TablePaste = {
	    clipboard_setter:function(value){
		    if (value === true || value === 1) this._settings.clipboard = 'block';
		    webix.clipbuffer.init();
		    this.attachEvent("onSelectChange",this._sel_to_clip);
		    // solution for clicks on selected items
		    this.attachEvent("onItemClick",function(id,e,node){
			    if(document.activeElement && this.$view.contains(document.activeElement)){
				    webix.clipbuffer.focus();
				    webix.UIManager.setFocus(this);
			    }
		    });
		    this.attachEvent("onPaste", this._clip_to_sel);

		    return value;
	    },
	    templateCopy_setter: webix.template,
	    _sel_to_clip: function() {
		    if (!this.getEditor || !this.getEditor()){
			    var data = this._get_sel_text();
			    webix.clipbuffer.set(data);
			    webix.UIManager.setFocus(this);
		    }
	    },

	    _get_sel_text: function() {
		    var data = [];
		    var filter = this._settings.templateCopy;
		    this.mapSelection(function(value, row, col, row_ind, col_ind) {
			    if (!data[row_ind]) data[row_ind] = [];
			    var newvalue = filter ? filter(value, row, col) : value;
			    data[row_ind].push(newvalue);
			    return value;
		    });

		    return webix.csv.stringify(data, this._settings.delimiter);
	    },

	    _clip_to_sel: function(text) {
		    if (!webix.isUndefined(this._paste[this._settings.clipboard])) {
			    var data = webix.csv.parse(text, this._settings.delimiter);
			    this._paste[this._settings.clipboard].call(this, data);
		    }
	    },

	    _paste: {
		    block: function(data) {
			    var leftTop = this.mapSelection(null);
			    if (!leftTop) return;

			    // filling cells with data
			    this.mapCells(leftTop.row, leftTop.column, data.length, null, function(value, row, col, row_ind, col_ind) {
				    if (data[row_ind] && data[row_ind].length>col_ind) {
					    return data[row_ind][col_ind];
				    }
				    return value;
			    });
			    this.render();
		    },

		    selection: function(data) {
			    this.mapSelection(function(value, row, col, row_ind, col_ind) {
				    if (data[row_ind] && data[row_ind].length>col_ind)
					    return data[row_ind][col_ind];
				    return value;
			    });
			    this.render();
		    },

		    repeat: function(data) {
			    this.mapSelection(function(value, row, col, row_ind, col_ind) {
				    row = data[row_ind%data.length];
				    value = row[col_ind%row.length];
				    return value;
			    });
			    this.render();
		    },

		    custom: function(text) {}
	    }
    };


    if(!webix.storage)
	    webix.storage = {};

    webix.storage.local = {
	    put:function(name, data){
		    if(name && window.JSON && window.localStorage){
			    window.localStorage.setItem(name, webix.stringify(data));
		    }
	    },
	    get:function(name){
		    if(name && window.JSON && window.localStorage){
			    var json = window.localStorage.getItem(name);
			    if(!json)
				    return null;
			    return webix.DataDriver.json.toObject(json);
		    }else
			    return null;
	    },
	    remove:function(name){
		    if(name && window.JSON && window.localStorage){
			    window.localStorage.removeItem(name);
		    }
	    },
	    clear:function(){
		    window.localStorage.clear();
	    }
    };

    webix.storage.session = {
	    put:function(name, data){
		    if(name && window.JSON && window.sessionStorage){
			    window.sessionStorage.setItem(name, webix.stringify(data));
		    }
	    },
	    get:function(name){
		    if(name && window.JSON && window.sessionStorage){
			    var json = window.sessionStorage.getItem(name);
			    if(!json)
				    return null;
			    return webix.DataDriver.json.toObject(json);
		    }else
			    return null;
	    },
	    remove:function(name){
		    if(name && window.JSON && window.sessionStorage){
			    window.sessionStorage.removeItem(name);
		    }
	    },
	    clear:function(){
		    window.sessionStorage.clear();
	    }
    };

    webix.storage.cookie = {
	    put:function(name, data, domain, expires ){
		    if(name && window.JSON){
			    document.cookie = name + "=" + escape(webix.stringify(data)) +
			        (( expires && (expires instanceof Date)) ? ";expires=" + expires.toUTCString() : "" ) +
			        (( domain ) ? ";domain=" + domain : "" ) + 
			        (( webix.env.https ) ? ";secure" : "");
		    }
	    },
	    getRaw:function(check_name){
		    // first we'll split this cookie up into name/value pairs
		    // note: document.cookie only returns name=value, not the other components
		    var a_all_cookies = document.cookie.split( ';' );
		    var a_temp_cookie = '';
		    var cookie_name = '';
		    var cookie_value = '';
		    var b_cookie_found = false; // set boolean t/f default f

		    for (var i = 0; i < a_all_cookies.length; i++ ){
			    // now we'll split apart each name=value pair
			    a_temp_cookie = a_all_cookies[i].split( '=' );

			    // and trim left/right whitespace while we're at it
			    cookie_name = a_temp_cookie[0].replace(/^\s+|\s+$/g, '');

			    // if the extracted name matches passed check_name
			    if (cookie_name == check_name ){
				    b_cookie_found = true;
				    // we need to handle case where cookie has no value but exists (no = sign, that is):
				    if ( a_temp_cookie.length > 1 ){
					    cookie_value = unescape( a_temp_cookie[1].replace(/^\s+|\s+$/g, '') );
				    }
				    // note that in cases where cookie is initialized but no value, null is returned
				    return cookie_value;
			    }
			    a_temp_cookie = null;
			    cookie_name = '';
		    }
		    if ( !b_cookie_found ){
			    return null;
		    }
		    return null;
	    },
	    get:function(name){
		    if(name && window.JSON){
			    var json = this.getRaw(name);
			    if(!json)
				    return null;
			    return webix.DataDriver.json.toObject(unescape(json));
		    }else
			    return null;
	    },
	    remove:function(name, domain){
		    if(name && this.getRaw(name)) 
			    document.cookie = name + "=" + (( domain ) ? ";domain=" + domain : "") + ";expires=Thu, 01-Jan-1970 00:00:01 GMT";
	    },
	    clear:function(domain){
		    var cookies = document.cookie.split(";");
		    for (var i = 0; i < cookies.length; i++)
			    document.cookie = /^[^=]+/.exec(cookies[i])[0] + "=" + (( domain ) ? ";domain=" + domain : "") + ";expires=Thu, 01-Jan-1970 00:00:01 GMT";		
	    }
    };

    webix.DataState = {
	    getState:function(){
		    var cols_n = this.config.columns.length;
		    var columns = this.config.columns;
		    var settings = { 
			    ids:[],
			    size:[],
			    select:this.getSelectedId(true),
			    scroll:this.getScrollState()
		    };
		    for(var i = 0; i < cols_n; i++){
			    var col = columns[i];
			    settings.ids.push(col.id);
			    settings.size.push((col.fillspace || col.adjust) ? -1 : col.width);
		    }

		    settings.order = [].concat(this._hidden_column_order.length ? this._hidden_column_order : settings.ids);

		    if(this._last_sorted){
			    settings.sort={
				    id:this._last_sorted,
				    dir:this._last_order
			    };
		    }

		    //this method will try to access the rendered values
		    //just ignore it if grid is not rendered yet
		    if (this._filter_elements && this._dtable_fully_ready) {
			    var filter = {};
			    var any_filter = 0;
			    for (var key in this._filter_elements) {
				    if (this._hidden_column_hash[key]) continue;

				    var f = this._filter_elements[key];
				    f[1].value = filter[key] = f[2].getValue(f[0]);
				    any_filter = 1;
			    }
			    if (any_filter)
				    settings.filter=filter;
		    }

		    settings.hidden = [];
		    for (var key in this._hidden_column_hash)
			    settings.hidden.push(key);
		    
		    return settings;
	    },
	    setState:function(obj){
		    var columns = this.config.columns;
		    if(!obj) return;

		    this._last_sorted = null; 
		    this.blockEvent();

		    if (obj.hidden){
			    var hihash = {};
			    for (var i=0; i<obj.hidden.length; i++){
				    hihash[obj.hidden[i]] = true;
				    if(!this._hidden_column_order.length)
					    this.hideColumn(obj.hidden[i]);
			    }

			    if(this._hidden_column_order.length){
				    for (var i=0; i<this._hidden_column_order.length; i++){
					    var hikey = this._hidden_column_order[i];
					    if (!!hihash[hikey] == !this._hidden_column_hash[hikey])
						    this.hideColumn(hikey, !!hihash[hikey]);
				    }
			    }
		    }

		    if (obj.ids){
			    var reorder = false;
			    var cols = this.config.columns;
			    for (var i=0; i<cols.length; i++)
				    if (cols[i].id != obj.ids[i])
					    reorder = true;
			    if (reorder){
				    for (var i=0; i<obj.ids.length; i++)
					    cols[i] = this.getColumnConfig(obj.ids[i]) || cols[i];
				    this.refreshColumns();
			    }
		    }

		    if (obj.size){
			    var cols_n = Math.min(obj.size.length, columns.length);
			    for(var i = 0; i < cols_n; i++){
				    var col = columns[i];
				    if(col && obj.size[i] > 0 && col.width != obj.size[i]){
					    delete col.fillspace;
					    delete col.adjust;
					    this._setColumnWidth( i, obj.size[i], true);
				    }
			    }
		    }
		    
		    this.unblockEvent();

		    var silent = !(this._settings.leftSplit || this._settings.rightSplit);
		    this._updateColsSizeSettings(silent);
		    this.callEvent("onStructureUpdate", []);

		    if(obj.sort){
			    var column = columns[this.getColumnIndex(obj.sort.id)];
			    if (column)
				    this._sort(obj.sort.id, obj.sort.dir, column.sort);	
		    }
			
		    if (obj.filter){
			    //temporary disable filtering 
			    var temp = this.filterByAll;
			    this.filterByAll = function(){};

			    //apply defined filters
			    for (var key in obj.filter) {
				    var value = obj.filter[key];
				    if (!value) continue;

				    if (!this._filter_elements[key]) continue;
				    var f = this._filter_elements[key];
				    f[2].setValue(f[0], value);
				    var contentid = f[1].contentId;
				    if (contentid)
					    this._active_headers[contentid].value = value;
			    }

			    //remove old filters
			    for (var key in this._filter_elements){
				    if (!obj.filter[key]){
					    var f = this._filter_elements[key];
					    f[2].setValue(f[0], "");
				    }
			    }
		        
			    //restore and apply filtering
			    this.filterByAll = temp;
			    this.filterByAll();
		    }

		    if (obj.select && this.select){
			    var select = obj.select;
			    this.unselect();
			    for (var i = 0; i < select.length; i++)
				    if (!select[i].row || this.exists(select[i].row))
					    this._select(select[i], true);
		    }

		    if(obj.scroll)
			    this.scrollTo(obj.scroll.x, obj.scroll.y);
	    }
    };




    (function(){
        var t = webix.Touch = {
	        config:{
		        longTouchDelay:1000,
		        scrollDelay:150,
		        gravity:500,
		        deltaStep:30,
		        speed:"0ms",
		        finish:1500,
		        ellastic:true
	        },
	        limit:function(value){
		        t._limited = value !== false;	
	        },
	        disable:function(){
		        t._disabled = true;
	        },
	        enable:function(){
		        t._disabled = false;
	        },
	        $init:function(){
		        t.$init = function(){};

		        webix.event(document.body, mouse.down,	t._touchstart);
		        webix.event(document.body, mouse.move, 	t._touchmove);
		        webix.event(document.body, mouse.up, 	t._touchend);

		        webix.event(document.body,"dragstart",function(e){
			        return webix.html.preventEvent(e);
		        });
		        webix.event(document.body,"touchstart",function(e){
			        if (t._disabled || t._limited) return;
			        //fast click mode for iOS
			        //To have working form elements Android must not block event - so there are no fast clicks for Android
			        //Selects still don't work with fast clicks
			        if (webix.env.isSafari) {
				        var tag = e.srcElement.tagName.toLowerCase();
				        if (tag == "input" || tag == "textarea" || tag == "select" || tag=="label")
					        return true;

				        t._fire_fast_event = true;
				        return webix.html.preventEvent(e);
			        }
		        });

		        t._clear_artefacts();
		        t._scroll = [null, null];
		        t.$active = true;
	        },
	        _clear_artefacts:function(){
		        t._start_context = t._current_context = t._prev_context = t._scroll_context = null;
		        t._scroll_mode = t._scroll_node = t._scroll_stat = this._long_touched = null;
		        //webix.html.remove(t._scroll);
		        //t._scroll = [null, null];
		        t._delta = 	{ _x_moment:0, _y_moment:0, _time:0 };

		        if (t._css_button_remove){
			        webix.html.removeCss(t._css_button_remove,"webix_touch");
			        t._css_button_remove = null;
		        }
		        
		        window.clearTimeout(t._long_touch_timer);
		        t._was_not_moved = true;
		        t._axis_x = true;
		        t._axis_y = true;
		        if (!t._active_transion)
			        t._scroll_end();
	        },
	        _touchend:function(e){
		        if (t._start_context) {
			        if (!t._scroll_mode) {
				        if (!this._long_touched) {
					        if (t._axis_y && !t._axis_x) {
						        t._translate_event("onSwipeX");
					        } else if (t._axis_x && !t._axis_y) {
						        t._translate_event("onSwipeY");
					        } else {
						        if (webix.env.isSafari && t._fire_fast_event) { //need to test for mobile ff and blackbery
							        t._fire_fast_event = false;
							        var target = t._start_context.target;

							        //dark iOS magic, without delay it can skip repainting
							        webix.delay(function () {
								        var click_event = document.createEvent('MouseEvents');
								        click_event.initEvent('click', true, true);
								        target.dispatchEvent(click_event);
							        });

						        }
					        }
				        }
			        } else {


				        var temp = t._get_matrix(t._scroll_node);
				        var x = temp.e;
				        var y = temp.f;
				        var finish = t.config.finish;

				        var delta = t._get_delta(e, true);
				        var view = webix.$$(t._scroll_node);

				        var gravity = (view && view.$scroll ? view.$scroll.gravity : t.config.gravity);
				        if (delta._time) {
					        var nx = x + gravity * delta._x_moment / delta._time;
					        var ny = y + gravity * delta._y_moment / delta._time;

					        var cnx = t._scroll[0] ? t._correct_minmax(nx, false, false, t._scroll_stat.dx, t._scroll_stat.px) : x;
					        var cny = t._scroll[1] ? t._correct_minmax(ny, false, false, t._scroll_stat.dy, t._scroll_stat.py) : y;


					        var size = Math.max(Math.abs(cnx - x), Math.abs(cny - y));
					        if (size < 150)
						        finish = finish * size / 150;

					        if (cnx != x || cny != y)
						        finish = Math.round(finish * Math.max((cnx - x) / (nx - x), (cny - y) / (ny - y)));

					        var result = {e: cnx, f: cny};


					        var view = webix.$$(t._scroll_node);
					        if (view && view.adjustScroll)
						        view.adjustScroll(result);


					        //finish = Math.max(100,(t._fast_correction?100:finish));
					        finish = Math.max(100, finish);


					        if (x != result.e || y != result.f) {
						        t._set_matrix(t._scroll_node, result.e, result.f, finish + "ms");
						        if (t._scroll_master)
							        t._scroll_master._sync_scroll(result.e, result.f, finish + "ms");
						        t._set_scroll(result.e, result.f, finish + "ms");
					        } else {
						        t._scroll_end();
					        }
				        } else
					        t._scroll_end();
			        }
			        t._translate_event("onTouchEnd");
			        t._clear_artefacts();
		        }
	        },
	        _touchmove:function(e){
		        if (!t._scroll_context || !t._start_context) return;

		        var	delta = t._get_delta(e);
		        t._translate_event("onTouchMove");

		        if (t._scroll_mode){
			        t._set_scroll_pos(delta);
		        } else {
			        t._axis_x = t._axis_check(delta._x, "x", t._axis_x);
			        t._axis_y = t._axis_check(delta._y, "y", t._axis_y);
			        if (t._scroll_mode){
				        var view = t._get_event_view("onBeforeScroll", true);
				        if (view){
					        var data = {};
					        view.callEvent("onBeforeScroll",[data]);
					        if (data.update){
						        t.config.speed = data.speed;
						        t.config.scale = data.scale;
					        }
				        }
				        t._init_scroller(delta); //apply scrolling
			        }
		        }

		        return webix.html.preventEvent(e);
	        },
	        _set_scroll_pos:function(){
		        if (!t._scroll_node) return;
		        var temp = t._get_matrix(t._scroll_node);
		        var be = temp.e, bf = temp.f;
		        var prev = t._prev_context || t._start_context;

		        var view = webix.$$(t._scroll_node);
		        var ellastic = (view&&view.$scroll)?view.$scroll.ellastic: t.config.ellastic;
		        if (t._scroll[0])
			        temp.e = t._correct_minmax( temp.e - prev.x + t._current_context.x , ellastic, temp.e, t._scroll_stat.dx, t._scroll_stat.px);
		        if (t._scroll[1])
			        temp.f = t._correct_minmax( temp.f - prev.y + t._current_context.y , ellastic, temp.f, t._scroll_stat.dy, t._scroll_stat.py);

		        t._set_matrix(t._scroll_node, temp.e, temp.f, "0ms");
		        if (t._scroll_master)
			        t._scroll_master._sync_scroll(temp.e, temp.f, "0ms");
		        t._set_scroll(temp.e, temp.f, "0ms");
	        },
	        _set_scroll:function(dx, dy, speed){
		        
		        var edx = t._scroll_stat.px/t._scroll_stat.dx * -dx;
		        var edy = t._scroll_stat.py/t._scroll_stat.dy * -dy;
		        if (t._scroll[0])
			        t._set_matrix(t._scroll[0], edx, 0 ,speed);
		        if (t._scroll[1])
			        t._set_matrix(t._scroll[1], 0, edy ,speed);
	        },
	        scrollTo:function(node, x, y, speed){
		        t._set_matrix(node,x,y,speed);
	        },
	        _set_matrix:function(node, xv, yv, speed){
		        if(!t._in_anim_frame && window.setAnimationFrame){
			        window.setAnimationFrame(function(){
				        t._in_anim_frame = true;
				        return t._set_matrix(node, xv, yv, speed);
			        });
		        }
		        t._in_anim_frame = null;
		        t._active_transion = true;
		        if (node){
			        var trans = t.config.translate || webix.env.translate;
			        node.style[webix.env.transform] = trans+"("+Math.round(xv)+"px, "+Math.round(yv)+"px"+((trans=="translate3d")?", 0":"")+")";
			        node.style[webix.env.transitionDuration] = speed;
		        }
	        },
	        _get_matrix:function(node){
		        var matrix = window.getComputedStyle(node)[webix.env.transform];
		        var tmatrix;

		        if (matrix == "none")
			        tmatrix = {e:0, f:0};
		        else {
                    if(window.WebKitCSSMatrix)
                        tmatrix = new WebKitCSSMatrix(matrix);
                    else if (window.MSCSSMatrix)
            	        tmatrix = new MSCSSMatrix(matrix);
			        else {
	                    // matrix(1, 0, 0, 1, 0, 0) --> 1, 0, 0, 1, 0, 0
	                    var _tmatrix = matrix.replace(/(matrix\()(.*)(\))/gi, "$2");
	                    // 1, 0, 0, 1, 0, 0 --> 1,0,0,1,0,0
	                    _tmatrix = _tmatrix.replace(/\s/gi, "");
	                    _tmatrix = _tmatrix.split(',');

	                    var tmatrix = {};
	                    var tkey = ['a', 'b', 'c', 'd', 'e', 'f'];
	                    for(var i=0; i<tkey.length; i++){
	                        tmatrix[tkey[i]] = parseInt(_tmatrix[i], 10);
	                    }
	                }
                }

                if (t._scroll_master)
        	        t._scroll_master._sync_pos(tmatrix);

                return tmatrix;
	        },	
	        _correct_minmax:function(value, allow, current, dx, px){
		        if (value === current) return value;
		        
		        var delta = Math.abs(value-current);
		        var sign = delta/(value-current);
	            //	t._fast_correction = true;
		        
		        
		        if (value>0) return allow?(current + sign*Math.sqrt(delta)):0;
		        
		        var max = dx - px;
		        if (max + value < 0)	
			        return allow?(current - Math.sqrt(-(value-current))):-max;
			    
	            //	t._fast_correction = false;
		        return value;
	        },	
	        _init_scroll_node:function(node){
		        if (!node.scroll_enabled){ 
			        node.scroll_enabled = true;	
			        node.parentNode.style.position="relative";
			        var prefix = webix.env.cssPrefix;
			        node.style.cssText += prefix+"transition: "+prefix+"transform; "+prefix+"user-select:none; "+prefix+"transform-style:flat;";
			        node.addEventListener(webix.env.transitionEnd,t._scroll_end,false);
		        }
	        },
	        _init_scroller:function(delta){
		        if (t._scroll_mode.indexOf("x") != -1)
			        t._scroll[0] = t._create_scroll("x", t._scroll_stat.dx, t._scroll_stat.px, "width");
		        if (t._scroll_mode.indexOf("y") != -1)
			        t._scroll[1] = t._create_scroll("y", t._scroll_stat.dy, t._scroll_stat.py, "height");
			    
		        t._init_scroll_node(t._scroll_node);
		        window.setTimeout(t._set_scroll_pos,1);
	        },
	        _create_scroll:function(mode, dy, py, dim){
		        if (dy - py <2){
			        var matrix = t._get_matrix(t._scroll_node);
			        var e = (mode=="y"?matrix.e:0);
			        var f = (mode=="y"?0:matrix.f);
			        if (!t._scroll_master)
				        t._set_matrix(t._scroll_node, e, f, "0ms");
			        t._scroll_mode = t._scroll_mode.replace(mode,"");
			        return "";
		        }

		        var scroll = webix.html.create("DIV", {
			        "class":"webix_scroll_"+mode
		        },"");

		        scroll.style[dim] = Math.max((py*py/dy-7),10) +"px";
		        if (t._scroll_stat.left) 
			        if (mode === "x")
				        scroll.style.left = t._scroll_stat.left+"px";
			    else
				    scroll.style.right = (-t._scroll_stat.left)+"px";
		        if (t._scroll_stat.hidden)
			        scroll.style.visibility = "hidden";

		        t._scroll_node.parentNode.appendChild(scroll);
		        
		        return scroll;
	        },
	        _axis_check:function(value, mode, old){
		        if (value > t.config.deltaStep){
				    if (t._was_not_moved){
					    t._long_move(mode);
					    t._locate(mode);
					    if ((t._scroll_mode||"").indexOf(mode) == -1) t._scroll_mode = "";
				    }
				    return false;
		        }
		        return old;
	        },
	        _scroll_end:function(){
                //sending event to the owner of the scroll only
                var result,state,view;
                view = webix.$$(t._scroll_node||this);
                if (view){
        	        if (t._scroll_node)
        		        result = t._get_matrix(t._scroll_node);
        	        else if(view.getScrollState){
                        state = view.getScrollState();
                        result = {e:state.x, f:state.y};
                    }
                    webix.callEvent("onAfterScroll", [result]);
                    if (view.callEvent)
                        view.callEvent("onAfterScroll",[result]);
                }
		        if (!t._scroll_mode){
			        webix.html.remove(t._scroll);
			        t._scroll = [null, null];
		        }
		        t._active_transion = false;
	        },
	        _long_move:function(mode){
		        window.clearTimeout(t._long_touch_timer);
		        t._was_not_moved = false;	
	        },	
	        _stop_old_scroll:function(e){
		        if (t._scroll[0] || t._scroll[1]){
			        t._stop_scroll(e, t._scroll[0]?"x":"y");
		        }else
			        return true;
	        },
	        _touchstart :function(e){
		        var target = e.target || event.srcElement;


		        if (t._disabled || (target.tagName&&target.tagName.toLowerCase() == "textarea" && target.offsetHeight<target.scrollHeight)) return;
		        t._long_touched = null;
		        t._scroll_context = t._start_context = mouse.context(e);

		        // in "limited" mode we should have possibility to use slider
		        var element = webix.$$(e);

		        if (t._limited && !t._is_scroll() && !(element && element.$touchCapture)){
			        t._scroll_context = null;
		        }



		        t._translate_event("onTouchStart");

		        if (t._stop_old_scroll(e))
			        t._long_touch_timer = window.setTimeout(t._long_touch, t.config.longTouchDelay);
		        
		        if (element && element.touchable && (!target.className || target.className.indexOf("webix_view")!==0)){
			        t._css_button_remove = element.getNode(e);
			        webix.html.addCss(t._css_button_remove,"webix_touch");
		        }	
			    
	        },
	        _long_touch:function(e){
                if(t._start_context){
			        t._translate_event("onLongTouch");
			        webix.callEvent("onClick", [t._start_context]);
			        t._long_touched = true;
			        //t._clear_artefacts();
                }
	        },
	        _stop_scroll:function(e, stop_mode){ 
		        t._locate(stop_mode);
		        var scroll = t._scroll[0]||t._scroll[1];
		        if (scroll){
			        var view = t._get_event_view("onBeforeScroll", true);
			        if (view)
				        view.callEvent("onBeforeScroll", [t._start_context,t._current_context]);
		        }
		        if (scroll && (!t._scroll_node || scroll.parentNode != t._scroll_node.parentNode)){
			        t._clear_artefacts();
			        t._scroll_end();
			        t._start_context = mouse.context(e);
		        }
		        t._touchmove(e);
	        },	
	        _get_delta:function(e, ch){
		        t._prev_context = t._current_context;
		        t._current_context = mouse.context(e);
			    
		        t._delta._x = Math.abs(t._start_context.x - t._current_context.x);
		        t._delta._y = Math.abs(t._start_context.y - t._current_context.y);
		        
		        if (t._prev_context){
			        if (t._current_context.time - t._prev_context.time < t.config.scrollDelay){
				        t._delta._x_moment = t._delta._x_moment/1.3+t._current_context.x - t._prev_context.x;
				        t._delta._y_moment = t._delta._y_moment/1.3+t._current_context.y - t._prev_context.y;
			        }
			        else {
				        t._delta._y_moment = t._delta._x_moment = 0;
			        }
			        t._delta._time = t._delta._time/1.3+(t._current_context.time - t._prev_context.time);
		        }
		        
		        return t._delta;
	        },
	        _get_sizes:function(node){
		        t._scroll_stat = {
			        dx:node.offsetWidth,
			        dy:node.offsetHeight,
			        px:node.parentNode.offsetWidth,
			        py:node.parentNode.offsetHeight
		        };
	        },
	        _is_scroll:function(locate_mode){
		        var node = t._start_context.target;
		        if (!webix.env.touch && !webix.env.transition && !webix.env.transform) return null;
		        while(node && node.tagName!="BODY"){
			        if(node.getAttribute){
				        var mode = node.getAttribute("touch_scroll");
				        if (mode && (!locate_mode || mode.indexOf(locate_mode)!=-1))
					        return [node, mode];
			        }
			        node = node.parentNode;
		        }
		        return null;
	        },
	        _locate:function(locate_mode){
		        var state = this._is_scroll(locate_mode);
		        if (state){
			        t._scroll_mode = state[1];
			        t._scroll_node = state[0];
			        t._get_sizes(state[0]);
		        }
		        return state;
	        },
	        _translate_event:function(name){
		        webix.callEvent(name, [t._start_context,t._current_context]);
		        var view = t._get_event_view(name);
		        if (view)
			        view.callEvent(name, [t._start_context,t._current_context]);
	        },
	        _get_event_view:function(name, active){
		        var view = webix.$$(active ? t._scroll_node : t._start_context);
		        if(!view) return null;
		        
		        while (view){
			        if (view.hasEvent&&view.hasEvent(name))	
				        return view;
			        view = view.getParentView();
		        }
		        
		        return null;
	        },	
	        _get_context:function(e){
		        if (!e.touches[0]) {
			        var temp = t._current_context;
			        temp.time = new Date();
			        return temp;
		        }
			    
		        return {
			        target:e.target,
			        x:e.touches[0].pageX,
			        y:e.touches[0].pageY,
			        time:new Date()
		        };
	        },
	        _get_context_m:function(e){
		        return {
			        target:e.target || e.srcElement,
			        x:e.pageX,
			        y:e.pageY,
			        time:new Date()
		        };
	        }
        };


        function touchInit(){
	        if (webix.env.touch){
		        t.$init();
		        //not full screen mode
		        if (document.body.className.indexOf("webix_full_screen") == -1)
			        t.limit(true);

		        if (window.MSCSSMatrix)
			        webix.html.addStyle(".webix_view{ -ms-touch-action: none; }");
	        } else {
		        var id = webix.event(document.body, "touchstart", function(ev){
			        if (ev.touches.length && ev.touches[0].radiusX > 4){
				        webix.env.touch = true;
				        setMouse(mouse);
				        touchInit();
				        for (var key in webix.ui.views){
					        var view = webix.ui.views[key];
					        if (view && view.$touch)
						        view.$touch();
				        }
			        }
			        webix.eventRemove(id);
		        }, { capture: true });
	        }
        }

        function setMouse(mouse){
	        mouse.down = "touchstart";
	        mouse.move = "touchmove";
	        mouse.up   = "touchend";
	        mouse.context = t._get_context;
        }

        webix.ready(touchInit);


        var mouse = webix.env.mouse = { down:"mousedown", up:"mouseup", 
								        move:"mousemove", context:t._get_context_m };

        if (window.navigator.pointerEnabled){
	        mouse.down = "pointerdown";
	        mouse.move = "pointermove";
	        mouse.up   = "pointerup";
        } else if (window.navigator.msPointerEnabled){
	        mouse.down = "MSPointerDown";
	        mouse.move = "MSPointerMove";
	        mouse.up   = "MSPointerUp";
        } else if (webix.env.touch)
	        setMouse(mouse);
	    


    })();



    webix.attachEvent("onDataTable", function(table, config){
	    if (webix.env.touch){
		    webix.Touch.$init();
		    config.scrollSize = 0;

		    // needed to show datatable scroll
		    if(webix.Touch._disabled)
			    webix.Touch.limit();

		    table.$ready.push(table.$touch);
	    }
    });


    webix.ui.datafilter.headerMenu = {
		getValue:function(){},
		setValue:function(){},
		refresh:function(master, node, config){
			if (!master._settings.headermenu){
				master.define("headermenu", true);
				master._generate_menu_columns();
			}

			node.onclick = function(){
				webix.$$(master.config.headermenu).show(node);
			};
		},
		render:function(master, config){
			return "<span class='webix_icon fa-columns' role='button' tabindex='0' aria-label='"+webix.i18n.aria.headermenu+"'>";
		}
    };

    webix.ui.datafilter.richSelectFilter = {
	    getInputNode:function(node){
		    return webix.$$(node.$webix) || null;
	    },
	    getValue:function(node){
		    var ui = this.getInputNode(node);
		    return ui?ui.getValue():"";
	    },
	    setValue:function(node, value){
		    var ui = this.getInputNode(node);
		    return ui?ui.setValue(value):"";
	    },
	    compare:function(a,b){
		    return a == b;
	    },
	    refresh:function(master, node, value){
		    if (master.$destructed) return;

		    var select = webix.$$(value.richselect);

		    //IE8 can destory the content of richselect, so recreating
		    if (!select.$view.parentNode) {
			    var d = webix.html.create("div", { "class" : "webix_richfilter" });
			    d.appendChild(select.$view);
		    }

		    node.$webix = value.richselect;
		    node.style.marginLeft = "-10px";

		    value.compare = value.compare || this.compare;
		    value.prepare = value.prepare || this.prepare;
		    master.registerFilter(node, value, this);

		    var data;
		    var options = value.options;
		    if (options){
			    if(typeof options =="string"){
				    data = value.options = [];
				    webix.ajax(options).then(webix.bind(function(data){
					    value.options = data.json();
					    var node = document.body.contains(node) ? node : document.body.querySelector('[active_id="'+value.contentId+'"]');
					    this.refresh(master, node, value);
				    }, this));
			    } else
				    data = options;
		    } else
			    data = master.collectValues(value.columnId);


		    var list = select.getPopup().getList();

		    var optview = webix.$$(options);
		    if(optview && optview.data && optview.data.getRange){
			    data = optview.data.getRange();
		    }

		    //reattaching node back to master container
		    node.firstChild.appendChild(select.$view.parentNode);

		    //load data in list, must be after reattaching, as callback of parse can try to operate with innerHTML
		    if (list.parse){
			    list.clearAll();
			    list.parse(data);

			    if ((!this.$noEmptyOption && value.emptyOption !== false) || value.emptyOption){
				    var emptyOption = { id:"", value: value.emptyOption||"", $empty: true };
				    list.add(emptyOption,0);
			    }
		    }

		    //set actual value for the filter
		    if (value.value) this.setValue(node, value.value);

		    //repaint the filter control
		    select.render();

		    //adjust sizes after full rendering
		    webix.delay(select.resize, select);
	    },
	    render:function(master, config){
		    if (!config.richselect){
			    var d = webix.html.create("div", { "class" : "webix_richfilter" });

			    var richconfig = {
				    container:d,
				    view:this.inputtype,
				    options:[]
			    };

			    var inputConfig = webix.extend( this.inputConfig||{}, config.inputConfig||{}, true );
			    webix.extend(richconfig, inputConfig);

			    if (config.separator)
				    richconfig.separator = config.separator;
			    if(config.suggest)
				    richconfig.suggest = config.suggest;

			    var richselect = webix.ui(richconfig);
				richselect.attachEvent("onChange", function(){
					master.filterByAll();
				});
			    
			    config.richselect = richselect._settings.id;
			    master._destroy_with_me.push(richselect);
		    }

		    config.css = "webix_div_filter";
		    return " ";
	    },
	    inputtype:"richselect"
    };

    webix.ui.datafilter.multiSelectFilter = webix.extend({
	    $noEmptyOption: true,
	    inputtype:"multiselect",
	    prepare:function(value, filter){
		    if (!value) return value;
		    var hash = {};
		    var parts = value.toString().split(filter.separator || ",");
		    for (var i = 0; i < parts.length; i++)
			    hash[parts[i]] = 1;
		    return hash;
	    },
	    compare:function(a,b){
		    return !b || b[a];
	    }
    }, webix.ui.datafilter.richSelectFilter);

    webix.ui.datafilter.serverMultiSelectFilter = webix.extend({
	    $server:true,
	    _on_change:function(e, node, value){
		    var id = this._comp_id;
		    webix.$$(id).filterByAll();
	    }
    }, webix.ui.datafilter.multiSelectFilter);

    webix.ui.datafilter.multiComboFilter = webix.extend({
	    inputtype:"multicombo",
	    inputConfig:{
		    tagMode: false
	    }
    }, webix.ui.datafilter.multiSelectFilter);

    webix.ui.datafilter.serverMultiComboFilter = webix.extend({
	    inputtype:"multicombo",
	    inputConfig:{
		    tagMode: false
	    }
    }, webix.ui.datafilter.serverMultiSelectFilter);

    webix.ui.datafilter.datepickerFilter = webix.extend({
	    prepare:function(value){ return value||""; },
	    compare:function(a,b){ return a*1 == b*1; },
	    inputtype:"datepicker"
    }, webix.ui.datafilter.richSelectFilter);


    webix.ui.datafilter.columnGroup = {
	    getValue:function(){},
	    setValue:function(){},
	    getHelper:function(node, config){
		    return {
			    open:function(){ config.closed = true; node.onclick(); },
			    close:function(){ config.closed = false; node.onclick(); },
			    isOpened:function(){ return config.closed; }
		    };
	    },
	    refresh:function(master, node, config){
		    node.onclick = function(e){
			    webix.html.stopEvent(e);
			    var mark = this.firstChild.firstChild;
			    if (config.closed){
				    config.closed = false;
				    mark.className = "webix_tree_open";
			    } else {
				    config.closed = true;
				    mark.className = "webix_tree_close";
			    }

			    webix.delay(function(){
				    master.callEvent("onColumnGroupCollapse", [config.columnId, config.batch, !config.closed]);
				    master.showColumnBatch(config.batch, !config.closed);
			    });
		    };

		    if (!config.firstRun){
			    config.firstRun = 1;
			    if (config.closed)
				    master.showColumnBatch(config.batch, false);
		    }
	    },
	    render:function(master, config){
		    return "<div role='button' tabindex='0' aria-label='"+webix.i18n.aria[config.closed?"openGroup":"closeGroup"]+"' class='"+(config.closed?"webix_tree_close":"webix_tree_open")+"'></div>&nbsp;"+(config.groupText||"");
	    }
    };

    webix.ui.datafilter.dateRangeFilter = webix.extend({
	    prepare:function(value){
		    return webix.ui.daterange.prototype._correct_value(value);
	    },
	    compare:function(a, b){
		    return ((!b.start || a>=b.start) && (!b.end || a<=b.end));
	    },
	    inputtype:"daterangepicker"
    }, webix.ui.datafilter.richSelectFilter);

    webix.ui.datafilter.serverDateRangeFilter = webix.extend({
	    $server:true
    }, webix.ui.datafilter.dateRangeFilter);

    webix.editors.$popup.multiselect = {
	    view:"multisuggest",
	    suggest:{
		    button:true
	    }
    };





    webix.Canvas = webix.proto({
	    $init:function(container){
		    this._canvas_labels = [];
		    this._canvas_series =  (!webix.isUndefined(container.series)?container.series:container.name);
		    this._obj = webix.toNode(container.container||container);
		    var width = container.width*(window.devicePixelRatio||1);
		    var height = container.height*(window.devicePixelRatio||1);
		    var style = container.style||"";
		    style += ";width:"+container.width+"px;height:"+container.height+"px;";
		    this._prepareCanvas(container.name, style ,width, height);
	    },
	    _prepareCanvas:function(name,style,x,y){
		    //canvas has the same size as master object
		    this._canvas = webix.html.create("canvas",{ title:name, width:x, height:y, canvas_id:name, style:(style||"")});
		    this._obj.appendChild(this._canvas);
		    //use excanvas in IE
		    if (!this._canvas.getContext){
			    if (webix.env.isIE){
				    webix.require("legacy/excanvas/excanvas.js", true);	//sync loading
				    G_vmlCanvasManager.init_(document);
				    G_vmlCanvasManager.initElement(this._canvas);
			    } else	//some other not supported browser
				    webix.assert(this._canvas.getContext,"Canvas is not supported in the browser");
		    }
		    return this._canvas;
	    }, 
	    getCanvas:function(context){
		    var ctx = (this._canvas||this._prepareCanvas(this._contentobj)).getContext(context||"2d");
		    if(!this._webixDevicePixelRatio){
			    this._webixDevicePixelRatio = true;
			    ctx.scale(window.devicePixelRatio||1, window.devicePixelRatio||1);
		    }
		    return ctx;
	    },
	    _resizeCanvas:function(x, y){
		    if (this._canvas){
			    this._canvas.setAttribute("width", x*(window.devicePixelRatio||1));
			    this._canvas.setAttribute("height", y*(window.devicePixelRatio||1));
			    this._canvas.style.width = x+"px";
			    this._canvas.style.height = y+"px";
			    this._webixDevicePixelRatio = false;
		    }
	    },
	    renderText:function(x,y,text,css,w){
		    if (!text) return; //ignore empty text
		    if (w) w = Math.max(w,0);
		    if (y) y = Math.max(y,0);
		    var t = webix.html.create("DIV",{
			    "class":"webix_canvas_text"+(css?(" "+css):""),
			    "style":"left:"+x+"px; top:"+y+"px;",
			    "aria-hidden":"true"
		    },text);
		    this._obj.appendChild(t);
		    this._canvas_labels.push(t); //destructor?
		    if (w)
			    t.style.width = w+"px";
		    return t;
	    },
	    renderTextAt:function(valign,align, x,y,t,c,w){
		    var text=this.renderText.call(this,x,y,t,c,w);
		    if (text){
			    if (valign){
				    if(valign == "middle")
					    text.style.top = parseInt(y-text.offsetHeight/2,10) + "px";
				    else
					    text.style.top = y-text.offsetHeight + "px";
			    }
			    if (align){
				    if(align == "left")
					    text.style.left = x-text.offsetWidth + "px";
				    else
					    text.style.left = parseInt(x-text.offsetWidth/2,10) + "px";
			    }
		    }
		    return text;
	    },
	    clearCanvas:function(skipMap){
		    var areas=[], i;

		    webix.html.remove(this._canvas_labels);
		    this._canvas_labels = [];

		    if (!skipMap&&this._obj._htmlmap){

			    //areas that correspond this canvas layer
			    areas = this._getMapAreas();
			    //removes areas of this canvas
			    while(areas.length){
				    areas[0].parentNode.removeChild(areas[0]);
				    areas.splice(0,1);
			    }
			    areas = null;

			    //removes _htmlmap object if all its child nodes are removed
			    if(!this._obj._htmlmap.getElementsByTagName("AREA").length){
				    this._obj._htmlmap.parentNode.removeChild(this._obj._htmlmap);
				    this._obj._htmlmap = null;
			    }

		    }
		    //FF breaks, when we are using clear canvas and call clearRect without parameters
		    this.getCanvas().clearRect(0,0,this._canvas.offsetWidth, this._canvas.offsetHeight);
	    },
	    toggleCanvas:function(){
		    this._toggleCanvas(this._canvas.style.display=="none");
	    },
	    showCanvas:function(){
		    this._toggleCanvas(true);
	    },
	    hideCanvas:function(){
		    this._toggleCanvas(false);
	    },
	    _toggleCanvas:function(show){
		    var areas, i;

		    for(i=0; i < this._canvas_labels.length;i++)
			    this._canvas_labels[i].style.display = (show?"":"none");

		    if (this._obj._htmlmap){
			    areas = this._getMapAreas();
			    for( i = 0; i < areas.length; i++){
				    if(show)
					    areas[i].removeAttribute("disabled");
				    else
					    areas[i].setAttribute("disabled","true");
			    }
		    }
		    //FF breaks, when we are using clear canvas and call clearRect without parameters
		    this._canvas.style.display = (show?"":"none");
	    },
	    _getMapAreas:function(){
		    var res = [], areas, i;
		    areas = this._obj._htmlmap.getElementsByTagName("AREA");
		    for(i = 0; i < areas.length; i++){
			    if(areas[i].getAttribute("userdata") == this._canvas_series){
				    res.push(areas[i]);
			    }
		    }

		    return res;
	    }
    });







    webix.color = {
	    _toHex:["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F"],
	    toHex:function(number, length){
		    number=parseInt(number,10);
		    var str = "";
			while (number>0){
				str=this._toHex[number%16]+str;
				number=Math.floor(number/16);
			}
			while (str.length <length)
				str = "0"+str;
		    return str;
	    },
	    hexToDec:function(hex){
		    return parseInt(hex, 16);
	    },
	    toRgb:function(rgb){
		    var r,g,b,rgbArr;
		    if (typeof(rgb) != 'string') {
			    r = rgb[0];
			    g = rgb[1];
			    b = rgb[2];
		    } else if (rgb.indexOf('rgb')!=-1) {
			    rgbArr = rgb.substr(rgb.indexOf("(")+1,rgb.lastIndexOf(")")-rgb.indexOf("(")-1).split(",");
			    r = rgbArr[0];
			    g = rgbArr[1];
			    b = rgbArr[2];
		    } else {
			    if (rgb.substr(0, 1) == '#') {
				    rgb = rgb.substr(1);
			    }
			    r = this.hexToDec(rgb.substr(0, 2));
			    g = this.hexToDec(rgb.substr(2, 2));
			    b = this.hexToDec(rgb.substr(4, 2));
		    }
		    r = (parseInt(r,10)||0);
		    g = (parseInt(g,10)||0);
		    b = (parseInt(b,10)||0);
		    if (r < 0 || r > 255)
			    r = 0;
		    if (g < 0 || g > 255)
			    g = 0;
		    if (b < 0 || b > 255)
			    b = 0;
		    return [r,g,b];
	    },
	    hsvToRgb:function(h, s, v){
		    var hi,f,p,q,t,r,g,b;
		    hi = Math.floor((h/60))%6;
		    f = h/60-hi;
		    p = v*(1-s);
		    q = v*(1-f*s);
		    t = v*(1-(1-f)*s);
		    r = 0;
		    g = 0;
		    b = 0;
		    switch(hi) {
			case 0:
				r = v; g = t; b = p;
				break;
			case 1:
				r = q; g = v; b = p;
				break;
			case 2:
				r = p; g = v; b = t;
				break;
			case 3:
				r = p; g = q; b = v;
				break;
			case 4:
				r = t; g = p; b = v;
				break;
			case 5:
				r = v; g = p; b = q;
				break;
			default:
				break;
		    }
		    r = Math.floor(r*255);
		    g = Math.floor(g*255);
		    b = Math.floor(b*255);
		    return [r, g, b];
	    },
	    rgbToHsv:function(r, g, b){
		    var r0,g0,b0,min0,max0,s,h,v;
		    r0 = r/255;
		    g0 = g/255;
		    b0 = b/255;
		    min0 = Math.min(r0, g0, b0);
		    max0 = Math.max(r0, g0, b0);
		    h = 0;
		    s = max0===0?0:(1-min0/max0);
		    v = max0;
		    if (max0 == min0) {
			    h = 0;
		    } else if (max0 == r0 && g0>=b0) {
			    h = 60*(g0 - b0)/(max0 - min0)+0;
		    } else if (max0 == r0 && g0 < b0) {
			    h = 60*(g0 - b0)/(max0 - min0)+360;
		    } else if (max0 == g0) {
			    h = 60*(b0 - r0)/(max0-min0)+120;
		    } else if (max0 == b0) {
			    h = 60*(r0 - g0)/(max0 - min0)+240;
		    }
		    return [h, s, v];
	    }
    };






    webix.HtmlMap = webix.proto({
	    $init:function(key){
		    this._id = "map_"+webix.uid();
		    this._key = key;
		    this._map = [];
		    this._areas = [];
	    },
	    addRect: function(id,points,userdata) {
		    this._createMapArea(id,"RECT",points,userdata);
	    },
	    addPoly: function(id,points,userdata) {
		    this._createMapArea(id,"POLY",points,userdata);
	    },
	    _createMapArea:function(id,shape,coords,userdata){
		    var extra_data = "";
		    if(arguments.length==4) 
			    extra_data = "userdata='"+userdata+"'";
		    this._map.push("<area "+this._key+"='"+id+"' shape='"+shape+"' coords='"+coords.join()+"' "+extra_data+"></area>");
		    this._areas.push({index: userdata, points:coords});

	    },
	    addSector:function(id,alpha0,alpha1,x,y,R,ky,userdata){
		    var points = [];
		    points.push(x);
		    points.push(Math.floor(y*ky)); 
		    for(var i = alpha0; i < alpha1; i+=Math.PI/18){
			    points.push(Math.floor(x+R*Math.cos(i)));
			    points.push(Math.floor((y+R*Math.sin(i))*ky));
		    }
		    points.push(Math.floor(x+R*Math.cos(alpha1)));
		    points.push(Math.floor((y+R*Math.sin(alpha1))*ky));
		    points.push(x);
		    points.push(Math.floor(y*ky)); 
		    
		    return this.addPoly(id,points,userdata);
	    },
	    hide:function(obj, data, mode){
		    if (obj.querySelectorAll){
			    var nodes = obj.querySelectorAll("area[userdata=\""+data+"\"]");
			    for (var i = 0; i < nodes.length; i++)
				    nodes[i].style.display = mode?"none":"";
		    }
	    },
	    render:function(obj){
		    var d = webix.html.create("DIV");
		    d.style.cssText="position:absolute; width:100%; height:100%; top:0px; left:0px;";
		    obj.appendChild(d);
		    var src = webix.env.isIE?"":"src='data:image/gif;base64,R0lGODlhEgASAIAAAP///////yH5BAUUAAEALAAAAAASABIAAAIPjI+py+0Po5y02ouz3pwXADs='";
		    d.innerHTML="<map id='"+this._id+"' name='"+this._id+"'>"+this._map.join("\n")+"</map><img "+src+" class='webix_map_img' usemap='#"+this._id+"'>";
		    
		    obj._htmlmap = d; //for clearing routine
		    
		    this._map = [];
	    }
    });



















    webix.editors.multiselect = webix.extend({
	    popupType:"multiselect"
    }, webix.editors.richselect);



    webix.ContextHelper = {
	    defaults:{
		    padding:"4",
		    hidden:true
	    },
	    body_setter:function(value){
		    value = webix.ui.window.prototype.body_setter.call(this, value);
		    this._body_cell._viewobj.style.borderWidth = "0px";
		    return value;
	    },
	    attachTo:function(obj){
		    webix.assert(obj, "Invalid target for Context::attach");
		    var id;
		    if (obj.on_context)
			    id = obj.attachEvent("onAfterContextMenu", webix.bind(this._show_at_ui, this));
		    else 
			    id = webix.event(obj, "contextmenu", this._show_at_node, {bind:this});

		    this.attachEvent("onDestruct", function(){
			    if (obj.detachEvent)
				    obj.detachEvent(id);
			    else
				    webix.eventRemove(id);
			    obj = null;			
		    });
	    },
	    getContext:function(){
		    return this._area;
	    },
	    setContext:function(area){
		    this._area = area;
	    },
	    _show_at_node:function(e){
		    this._area = webix.toNode(e||event);
		    return this._show_at(e);
	    },
	    _show_at_ui:function(id, e, trg){
		    this._area = { obj:webix.$$(e), id:id };
		    return this._show_at(e);
	    },
	    _show_at:function(e){
		    var result = this.show(e, null, true);
		    if (result === false) return result;

		    //event forced to close other popups|context menus
		    webix.callEvent("onClick", []);		
		    return webix.html.preventEvent(e);
	    },
	    _show_on_mouse_out:true,
	    master_setter:function(value){
		    this.attachTo(value);
		    return null;
	    }
    };








    webix.i18n.dbllist = {
	    selectAll : "<span class='webix_icon fa-angle-double-right'></span>",
	    selectOne : "<span class='webix_icon fa-angle-right'></span>",
	    deselectAll : "<span class='webix_icon fa-angle-double-left'></span>",
	    deselectOne : "<span class='webix_icon fa-angle-left'></span>",
    };











    webix.dp = function(name,getOnly){
	    if (typeof name == "object" && name._settings)
		    name = name._settings.id;
	    if (webix.dp._pull[name] || getOnly)
		    return webix.dp._pull[name];

	    if (typeof name == "string"||typeof name == "number")
		    name = { master:webix.$$(name) };

	    var dp = new webix.DataProcessor(name);
	    var masterId = dp._settings.master._settings.id;
	    webix.dp._pull[masterId]=dp;

	    webix.$$(masterId).attachEvent("onDestruct",function(){
		    webix.dp._pull[this._settings.id] = null;
		    delete webix.dp._pull[this._settings.id];
	    });

	    return dp;
    };
    webix.dp._pull = {};
    webix.dp.$$ = function(id){
	    return webix.dp._pull[id];
    };


    webix.DataProcessor = webix.proto({
	    defaults: {
		    autoupdate:true,
		    updateFromResponse:false,
		    mode:"post",
		    operationName:"webix_operation",
		    trackMove:false
	    },


	    /*! constructor
	    **/
	    $init: function() {
		    this.reset();
		    this._ignore = false;
		    this.name = "DataProcessor";
		    this.$ready.push(this._after_init_call);
	    },
	    reset:function(){
		    this._updates = [];
	    },
	    url_setter:function(value){
		    /*
			  we can use simple url or mode->url
		    */
		    var mode = "";
		    if (typeof value == "string"){
			    var parts = value.split("->");
			    if (parts.length > 1){
				    value = parts[1];
				    mode = parts[0];
			    }
		    } else if (value && value.mode){
			    mode = value.mode;
			    value = value.url;
		    }

		    if (mode)
			    return webix.proxy(mode, value);

		    return value;
	    },
	    master_setter:function(value){
		    var store = value;
		    if (value.name != "DataStore")
			    store = value.data;

		    this._settings.store = store;
		    return value;
	    },
	    /*! attaching onStoreUpdated event
	    **/
	    _after_init_call: function(){
		    webix.assert(this._settings.store, "store or master need to be defined for the dataprocessor");
		    this._settings.store.attachEvent("onStoreUpdated", webix.bind(this._onStoreUpdated, this));
		    this._settings.store.attachEvent("onDataMove", webix.bind(this._onDataMove, this));
	    },
	    ignore:function(code,master){
		    var temp = this._ignore;
		    this._ignore = true;
		    code.call((master||this));
		    this._ignore = temp;
	    },
	    off:function(){
		    this._ignore = true;
	    },
	    on:function(){
		    this._ignore = false;
	    },

	    _copy_data:function(source){
		    var obj = {};
		    for (var key in source)	
			    if (key.indexOf("$")!==0)
				    obj[key]=source[key];
		    return obj;
	    },
	    save:function(id, operation, obj){
		    operation = operation || "update";
		    this._save_inner(id, (obj || this._settings.store.getItem(id)), operation);
	    },
	    _save_inner:function(id, obj, operation){
		    if (typeof id == "object") id = id.toString();
		    if (!id || this._ignore === true || !operation || operation == "paint") return true;

		    var store = this._settings.store;
		    if (store && store._scheme_serialize)
			    obj = store._scheme_serialize(obj);

		    var update = { id: id, data:this._copy_data(obj), operation:operation };
		    //save parent id
		    if (!webix.isUndefined(obj.$parent)) update.data.parent = obj.$parent;

		    if (update.operation != "delete"){
			    //prevent saving of not-validated records
			    var master = this._settings.master;
			    if (master && master.data && master.data.getMark && master.data.getMark(id, "webix_invalid"))
				    update._invalid = true;

			    if (!this.validate(null, update.data))
				    update._invalid = true;
		    }

		    if (this._check_unique(update))
			    this._updates.push(update);

		    if (this._settings.autoupdate)
			    this.send();
			
		    return true;
	    },
	    _onDataMove:function(sid, tindex, parent, targetid){
		    if (this._settings.trackMove){
			    var obj = webix.copy(this._settings.store.getItem(sid));
			    var order = this._settings.store.order;

			    obj.webix_move_index = tindex;
			    obj.webix_move_id = targetid;
			    obj.webix_move_parent = parent;
			    this._save_inner(sid, obj, "order");
		    }
	    },
	    _onStoreUpdated: function(id, obj, operation){
		    switch (operation) {
			case 'save':
				operation = "update";
				break;
			case 'update':
				operation = "update";
				break;
			case 'add':
				operation = "insert";
				break;
			case 'delete':
				operation = "delete";				
				break;
			default:
				return true;
		    }
		    return this._save_inner(id, obj, operation);
	    },
	    _check_unique:function(check){
		    for (var i = 0; i < this._updates.length; i++){
			    var one = this._updates[i];
			    if (one.id == check.id){
				    if (check.operation == "delete"){
					    if (one.operation == "insert")
						    this._updates.splice(i,1);
					    else 
						    one.operation = "delete";
				    }
				    one.data = check.data;
				    one._invalid = check._invalid;
				    return false;
			    }
		    }
		    return true;
	    },
	    send:function(){
		    this._sendData();
	    },
	    _sendData: function(){
		    if (!this._settings.url)
			    return;

		    var marked = this._updates;
		    var to_send = [];
		    var url = this._settings.url;

		    for (var i = 0; i < marked.length; i++) {
			    var tosave = marked[i];

			    if (tosave._in_progress) continue;
			    if (tosave._invalid) continue;

			    var id = tosave.id;
			    var operation = tosave.operation;
			    var precise_url = (typeof url == "object" && !url.$proxy) ? url[operation] : url;
			    var proxy = precise_url && (precise_url.$proxy || typeof precise_url === "function");

			    if (!precise_url) continue;

			    if (this._settings.store._scheme_save)
				    this._settings.store._scheme_save(tosave.data);

			    if (!this.callEvent("onBefore"+operation, [id, tosave]))
				    continue;
			    tosave._in_progress = true;

			    if (!this.callEvent("onBeforeDataSend", [tosave])) return;

			    tosave.data = this._updatesData(tosave.data);

			    var callback = this._send_callback({ id:tosave.id, status:tosave.operation });
			    if (precise_url.$proxy){
				    if (precise_url.save)
					    precise_url.save(this.config.master, tosave, this, callback);
				    else
					    to_send.push(tosave);
			    } else {
				    if (operation == "insert") delete tosave.data.id;

				    
				    if (proxy){
					    //promise
					    precise_url(tosave.id, tosave.operation, tosave.data).then(
						    function(data){
							    if (data && typeof data.json == "function")
								    data = data.json();
							    callback.success("", data, -1);
						    },
						    function(error){
							    callback.error("", null, error);
						    }
					    );
				    } else {
					    //normal url
					    tosave.data[this._settings.operationName] = operation;

					    this._send(precise_url, tosave.data, this._settings.mode, operation, callback);
				    }
			    }

			    this.callEvent("onAfterDataSend", [tosave]);
		    }

		    if (url.$proxy && url.saveAll && to_send.length)
			    url.saveAll(this.config.master, to_send, this, this._send_callback({}));
	    },


	    /*! process updates list to POST and GET params according dataprocessor protocol
	     *	@param updates
	     *		list of objects { id: "item id", data: "data hash", operation: "type of operation"}
	     *	@return
	     *		object { post: { hash of post params as name: value }, get: { hash of get params as name: value } }
	     **/



	    _updatesData:function(source){
		    var target = {};
		    for (var j in source){
			    if (j.indexOf("$")!==0)
				    target[j] = source[j];
		    }
		    return target;
	    },



	    /*! send dataprocessor query to server
	     *	and attach event to process result
	     *	@param url
	     *		server url
	     *	@param get
	     *		hash of get params
	     *	@param post
	     *		hash of post params
	     *	@mode
	     *		'post' or 'get'
	     **/
	    _send: function(url, post, mode, operation, callback) {
		    webix.assert(url, "url was not set for DataProcessor");

		    if (typeof url == "function")
			    return url(post, operation, callback);

		    webix.ajax()[mode](url, post, callback);
	    },
	    _send_callback:function(id){
		    var self = this;
		    return {
			    success:function(t,d,l){ return self._processResult(id, t,d,l); },
			    error  :function(t,d,l){ return self._processError(id, t,d,l); }
		    };
	    },
	    attachProgress:function(start, end, error){
		    this.attachEvent("onBeforeDataSend", start);
		    this.attachEvent("onAfterSync", end);
		    this.attachEvent("onAfterSaveError", error);
		    this.attachEvent("onLoadError", error);
	    },
	    _processError:function(id, text, data, loader){
		    if (id)
			    this._innerProcessResult(true, id.id, false, id.status, false, {text:text, data:data, loader:loader});
		    else {
			    this.callEvent("onLoadError", arguments);
			    webix.callEvent("onLoadError", [text, data, loader, this]);
		    }
	    },
	    _innerProcessResult:function(error, id, newid, status, obj, details){
		    var master = this._settings.master;
		    var update = this.getItemState(id);
		    update._in_progress = false;

		    if (error){
			    if (this.callEvent("onBeforeSaveError", [id, status, obj, details])){
				    update._invalid = true;
				    if(this._settings.undoOnError && master._settings.undo)
					    master.undo(id);
				    this.callEvent("onAfterSaveError", [id, status, obj, details]);
				    return;
			    }
		    } else
			    this.setItemState(id, false);

		    //update from response
		    if (newid && id != newid)
			    this._settings.store.changeId(id, newid);

 		    if (obj && status != "delete" && this._settings.updateFromResponse)
 			    this.ignore(function(){				
				    this._settings.store.updateItem(newid || id, obj);
 			    });
			

		    //clean undo history, for the saved record
		    if(this._settings.undoOnError && master._settings.undo)
			    master.removeUndo(newid||id);

		    this.callEvent("onAfterSave",[obj, id, details]);
		    this.callEvent("onAfter"+status, [obj, id, details]);
	    },
	    processResult: function(state, hash, details){
		    //compatibility with custom json response
		    var error = (hash && (hash.status == "error" || hash.status == "invalid"));
		    var newid = (hash ? ( hash.newid || hash.id ) : false);

		    this._innerProcessResult(error, state.id, newid, state.status, hash, details);
	    },
	    // process saving from result
	    _processResult: function(state, text, data, loader){
		    this.callEvent("onBeforeSync", [state, text, data, loader]);

		    if (loader === -1){
			    //callback from promise
			    this.processResult(state, data, {});
		    } else {
			    var proxy = this._settings.url;
			    if (proxy.$proxy && proxy.result)
				    proxy.result(state, this._settings.master, this, text,  data, loader);
			    else {
				    var hash;
				    if (text){
					    hash = data.json();
					    //invalid response
					    if (text && typeof hash == "undefined")
						    hash = { status:"error" };
				    }
				    this.processResult(state, hash,  {text:text, data:data, loader:loader});
			    }
		    }

		    this.callEvent("onAfterSync", [state, text, data, loader]);
	    },


	    /*! if it's defined escape function - call it
	     *	@param value
	     *		value to escape
	     *	@return
	     *		escaped value
	     **/
	    escape: function(value) {
		    if (this._settings.escape)
			    return this._settings.escape(value);
		    else
			    return encodeURIComponent(value);
	    },
	    getState:function(){
		    if (!this._updates.length) return false;
		    for (var i = this._updates.length - 1; i >= 0; i--)
			    if (this._updates[i]._in_progress)
				    return "saving";

		    return true;
	    },
	    getItemState:function(id){
		    var index = this._get_stack_index(id);
		    return this._updates[index] || null;
	    },
	    setItemState:function(id, state){
		    if (state)
			    this.save(id, state);
		    else{
			    var index = this._get_stack_index(id);
			    if (index > -1)
				    this._updates.splice(index, 1);
		    }
	    },
	    _get_stack_index: function(id) {
		    var index = -1;
		    var update = null;
		    for (var i=0; i < this._updates.length; i++)
			    if (this._updates[i].id == id) {
				    index = i;
				    break;
			    }

		    return index;
	    }

    }, webix.Settings, webix.EventSystem, webix.ValidateData);



    // webix.markup = {
	//     namespace:"x",
	//     attribute:"data-",
	//     dataTag:"li",
	//     _dash:/-([a-z])/g,
	//     _after_dash:function (match) { return match[1].toUpperCase(); },
	//     _parse_int:{
	// 	    width:true,
	// 	    height:true,
	// 	    gravity:true,
	// 	    margin:true,
	// 	    padding:true,
	// 	    paddingX:true,
	// 	    paddingY:true,
	// 	    minWidth:true,
	// 	    maxWidth:true,
	// 	    minHeight:true,
	// 	    maxHeight:true,
    //         headerRowHeight:true
	//     },
	//     _parse_bool:{
	// 	    disabled:true,
	// 	    hidden:true
	//     },
	//     _view_has_method:function(view, name){
	// 	    return webix.ui.hasMethod(view, name);
	//     },

	//     init: function(node, target, scope){
	// 	    node = node || document.body;

	// 	    var els = [];
	// 	    var temp = this._get_core_els(node);
	// 	    var html = temp.html;
	// 	    var ui = null;

	// 	    //make copy to prevent node removing effects
	// 	    for (var i = temp.length - 1; i >= 0; i--) els[i] = temp[i];
		    
	// 	    for (var i = 0; i < els.length; i++) {
	// 		    var config, temp_config;
	// 		    //collect configuration
	// 		    config = this._sub_markup(els[i], html);
	// 		    config.$scope = scope;
	// 		    ui = this._initComponent(config, els[i], html, target);
	// 	    }
	// 	    return ui;
	//     },

	//     parse:function(source, mode){
	// 	    //convert from string to object
	// 	    if (typeof source == "string")
	// 		    source = webix.DataDriver[mode || "xml"].toObject(source, source);

	// 	    var els = this._get_core_els(source, mode);
	// 	    return this._sub_markup(els[0], els.html);
	//     },

	//     _initComponent:function(config, node, html, target){
	// 	    if (!target){
	// 		    config.container = node.parentNode;
	// 		    webix.html.remove(node);
	// 	    } else 
	// 		    config.container = target;

	// 	    if (this._view_has_method(config.view, "setPosition"))
	// 		    delete config.container;

	// 	    //init ui
	// 	    return webix.ui(config);
	//     },

	//     _get_core_els:function(node){
	// 	    this._full_prefix = this.namespace?(this.namespace+":"):"";
	// 	    this._full_prefix_top = this._full_prefix+"ui";

	// 	    //xhtml mode
	// 	    var els = node.getElementsByTagName(this._full_prefix_top);
	// 	    if (!els.length && node.documentElement && node.documentElement.tagName == this._full_prefix_top)
	// 		    els = [ node.documentElement ];

	// 	    //loading from xml file with valid namespace
	// 	    if (!els.length && this.namespace){
	// 		    els = node.getElementsByTagName("ui");
	// 		    if (!els.length && node.documentElement && node.documentElement.tagName == "ui")
	// 			    els = [ node.documentElement ];
	// 	    }

	// 	    if (!els.length){
	// 		    //html mode
	// 		    els = this._get_html_tops(node);
	// 		    els.html = true;
	// 	    }
	// 	    return els;
	//     },

	//     //html conversion
	//     _get_html_tops: function(node){
	// 	    if (node.getAttribute && node.getAttribute(this.attribute+"view"))
	// 		    return [node];

	// 	    var els = node.querySelectorAll("["+this.attribute+"view]");

	// 	    var tags = []; var marks = [];
	// 	    for (var i = 0; i < els.length; i++)
	// 		    if (!els[i].parentNode.getAttribute(this.attribute+"view"))
	// 			    tags.push(els[i]);

	// 	    return tags;
	//     },



	//     _sub_markup: function(el, html, json){
	// 	    var htmltable = false;
	// 	    //ignore top x:ui for xhtml and xml 
	// 	    if (!json){
	// 		    var name = this._get_name(el, html);
	// 		    if (name == "ui"){
	// 			    var childs = el.childNodes;
	// 			    for (var i = 0; i < childs.length; i++)
	// 				    if (childs[i].nodeType == 1){
	// 					    return this._sub_markup(childs[i], html);
	// 				    }
	// 		    }
	// 		    json = { view: name };
	// 		    if (html && el.tagName.toLowerCase() == "table"){
	// 			    json.data = el;
	// 			    json.datatype = "htmltable";
	// 			    htmltable = true;
	// 		    }
	// 	    }

	// 	    var is_layout = json.view == "cols" || json.view == "rows" || this._view_has_method(json.view, "addView");

	// 	    var subs = [];
	// 	    var has_tags = 0; 
	// 	    var allow_sub_tags = !(html || el.style); //only for xml documents
	// 	    var first = el.firstChild;
	// 	    while (first){
	// 		    //tag node
	// 		    if (first.nodeType == 1){
	// 			    var name = this._get_name(first, html);
	// 			    if (name == "data"){
	// 				    has_tags = 1;
	// 				    var data = first; first = first.nextSibling;
	// 				    json.data = this._handle_data(data, html);
	// 				    continue;
	// 			    } else if (name == "config"){
	// 				    this._get_config_html(first, json, html);
	// 				    var confignode = first;
	// 				    first = first.nextSibling;

	// 				    webix.html.remove(confignode);
	// 				    continue;
	// 			    } else if (name == "column"){
	// 				    has_tags = 1;

	// 				    var column = this._tag_to_json(first, html);
	// 				    column.header = column.header || column.value;
	// 				    column.width = column.width * 1 || "";

	// 				    json.columns = json.columns || [];
	// 				    json.columns.push(column);
	// 			    } else if (name || (is_layout && html)){
	// 				    var obj = this._sub_markup(first , html , { view:name });
	// 				    if (obj.view == "head")
	// 					    json.head = obj.rows ? obj.rows[0] : obj.template;
	// 				    else if (obj.view == "body"){
	// 					    if (this._view_has_method(json.view, "addView")){
	// 						    //multiview, accordion

	// 						    //subtag or plain value
	// 						    //in case of multiple sub tags, only first will be used
	// 						    // #dirty
	// 						    subs.push({
	// 							    body: (obj.rows ? obj.rows[0] : obj.value),
	// 							    header:obj.header || ""
	// 						    });
	// 					    } else {
	// 						    //window, fieldset

	// 						    //one sub tag - use it
	// 						    //multiple sub tags - create sub layout
	// 						    //or use plain text value
	// 						    json.body = obj.rows ? ( obj.rows.length == 1 ? obj.rows[0] : { rows:obj.rows } ) : obj.value;
	// 					    }
	// 				    } else
	// 					    subs.push(obj);
	// 			    } else if (allow_sub_tags) {
	// 				    has_tags = 1;
	// 				    var tagName = first.tagName;
	// 				    if (html) tagName = tagName.toLowerCase().replace(this._dash, this._after_dash);
	// 				    json[tagName] = webix.DataDriver.xml.tagToObject(first);
					    
	// 			    }
	// 		    }

	// 		    first = first.nextSibling;
	// 	    }

	// 	    this._attrs_to_json(el, json, html);

	// 	    if (subs.length){
	// 		    if (json.stack)
	// 			    json[json.stack] = subs;
	// 		    else if (this._view_has_method(json.view, "setValues"))
	// 			    json["elements"] = subs;
	// 		    else if (json.view == "rows"){
	// 			    json.view = "layout";
	// 			    json.rows = subs;
	// 		    } else if (json.view == "cols"){
	// 			    json.view = "layout";
	// 			    json.cols = subs;
	// 		    } else if (this._view_has_method(json.view, "setValue")){
	// 			    json["cells"] = subs;
	// 		    } else if (this._view_has_method(json.view, "getBody")){
	// 			    json.body = subs.length == 1 ? subs[0] : { rows:subs };
	// 		    } else
	// 			    json["rows"] = subs;
	// 	    } else if (!htmltable && !has_tags){
	// 		    if (html && !json.template && (!json.view || json.view == "template")){
	// 			    json.view = "template";
	// 			    json.content = el;
	// 		    } else {
	// 			    var content = this._content(el, html);
	// 			    if (content){
	// 				    var target = "template";
	// 				    if (this._view_has_method(json.view, "setValue"))
	// 					    target = "value";
	// 				    json[target] = json[target] || content;	
	// 			    }
	// 		    }
	// 	    }

	// 	    return json;
	//     },

	//     _empty: function(str) {
	// 	    var clean = str.replace(/\s+/gm, '');
	// 	    return (clean.length > 0) ? false : true;	 
	//     },

	//     _markup_names:{
	// 	    body:1,
	// 	    head:1,
	// 	    data:1,
	// 	    rows:1,
	// 	    cols:1,
	// 	    cells:1,
	// 	    elements:1,
	// 	    ui:1,
	// 	    column:1,
	// 	    config:1
	//     },

	//     _get_config_html:function(tag, json, html){
	// 	    var master = this._attrs_to_json(tag, { });
	// 	    if (master.name){
	// 		    json[master.name] = master;
	// 		    delete master.name;
	// 	    } else 
	// 		    if (master.stack) json[master.stack] = [];
	// 	    else
	// 		    json = master;

	// 	    var childs = tag.childNodes;
	// 	    for (var i = 0; i < childs.length; i++) {
    //             var sub = null;
	// 		    if (childs[i].nodeType == 1 && childs[i].tagName.toLowerCase() == "config" && childs[i].attributes.length)
	// 			    sub = this._get_config_html(childs[i], master, html);
    //             else
    //                 sub = childs[i].innerHTML;
    //             if (master.stack && sub)
    //                 json[master.stack].push(sub);

	// 	    }
	// 	    return json;
	//     },

	//     _get_name:function(tag, html){
	// 	    //value of view attribute or config tag
	// 	    if (html)
	// 		    return tag.getAttribute(this.attribute+"view") || ( tag.tagName.toLowerCase() == "config" ? "config" : null);
	// 	    var name = tag.tagName.toLowerCase();
	// 	    if (this.namespace){
	// 		    if (name.indexOf(this._full_prefix) === 0 || tag.scopeName == this.namespace)
	// 			    return name.replace(this._full_prefix,"");
	// 	    } else {
	// 		    if (webix.ui[name] || this._markup_names[name])
	// 			    return name;
	// 	    }
	// 	    return 0;
	//     },

	//     _handle_data:function(el, html){
	// 	    var data = [];

	// 	    var records = el.getElementsByTagName(webix.markup.dataTag);
	// 	    for (var i=0; i<records.length; i++){
	// 		    var rec = records[i];
	// 		    if (rec.parentNode.parentNode.tagName != webix.markup.dataTag){
	// 			    var json = this._tag_to_json(rec, html);
	// 			    //reuse css class 
	// 			    if (rec.className) json.$css = rec.className;
	// 			    data.push(json);
	// 		    }
	// 	    }

	// 	    webix.html.remove(el);

	// 	    return data;
	//     },
	//     _content:function(el, html){
	// 	    if (el.style) return el.innerHTML;
	// 	    if (el.firstChild)
	// 		    return el.firstChild.wholeText||el.firstChild.data||"";
	// 	    return "";
	//     },


	//     _tag_to_json:function(el, html){
	// 	    if (!html)
	// 		    return webix.DataDriver.xml.tagToObject(el);

	// 	    var json = this._attrs_to_json(el, {}, html);
	// 	    if (!json.value && el.childNodes.length)
	// 		    json.value = this._content(el, html);

	// 	    return json;
	//     },
	//     _attrs_to_json:function(el, json, html){
	// 	    var attrs = el.attributes;
    //         for (var i=0; i<attrs.length; i++){
    //             var name = attrs[i].name;
    //             if (html){
    //                 if (name.indexOf(this.attribute) !== 0)
    //                     continue;
    //                 name = name.replace(this.attribute,"").replace(this._dash, this._after_dash);
    //             }

    //             var value = attrs[i].value;
    //             if (value.indexOf("json://") != -1)
    //                 value = JSON.parse(value.replace("json://",""));

    //             if (this._parse_int[name])
    //                 value = parseInt(value,10);
    //             else if (this._parse_bool[name])
    //         	    value = (value && value !== "false" && value != "0");

    //             json[name] = value;
    //         }
    //         return json;
	//     }
    // };
    (function(){
	    var _webix_msg_cfg = null;
	    function callback(config, result){
			var usercall = config.callback;
			modality(false);
			config.box.parentNode.removeChild(config.box);
			_webix_msg_cfg = config.box = null;
			if (usercall)
				usercall(result,config.details);
	    }
	    function modal_key(e){
		    if (_webix_msg_cfg){
			    e = e||event;
			    var code = e.which||event.keyCode;
			    if (webix.message.keyboard){
				    if (code == 13 || code == 32)
					    callback(_webix_msg_cfg, true);
				    if (code == 27)
					    callback(_webix_msg_cfg, false);
			        
				    if (e.preventDefault)
					    e.preventDefault();
				    return !(e.cancelBubble = true);
			    }
		    }
	    }

	    webix.event(document, "keydown", modal_key, { capture: true });
		
	    function modality(mode){
		    if(!modality.cover || !modality.cover.parentNode){
			    modality.cover = document.createElement("DIV");
			    //necessary for IE only
			    modality.cover.onkeydown = modal_key;
			    modality.cover.className = "webix_modal_cover";
			    document.body.appendChild(modality.cover);
		    }
		    modality.cover.style.display = mode?"inline-block":"none";
	    }

	    function button(text, result, className){
		    return "<div role='button' tabindex='0' aria-label='"+text+"' class='webix_popup_button"+(className?(" "+className):"")+"' result='"+result+"' ><div>"+text+"</div></div>";
	    }

	    function info(text){
		    if (!t.area){
			    t.area = document.createElement("DIV");
			    t.area.className = "webix_message_area";
			    t.area.style[t.position]="5px";
			    
			    document.body.appendChild(t.area);
		    }
		    t.area.setAttribute("role", "alert");
		    t.area.setAttribute("aria-atomic", true);
		    t.hide(text.id);
		    var message = document.createElement("DIV");
		    message.innerHTML = "<div>"+text.text+"</div>";
		    message.className = "webix_info webix_" + text.type;
		    message.onclick = function(){
			    t.hide(text.id);
			    text = null;
		    };

		    if (webix.$testmode)
			    message.className += " webix_no_transition";

		    if (t.position == "bottom" && t.area.firstChild)
			    t.area.insertBefore(message,t.area.firstChild);
		    else
			    t.area.appendChild(message);
		    
		    if (text.expire > 0)
			    t.timers[text.id]=window.setTimeout(function(){
				    t.hide(text.id);
			    }, text.expire);

		    //styling for animation
		    message.style.height = message.offsetHeight-2+"px";

		    t.pull[text.id] = message;
		    message = null;

		    return text.id;
	    }
	    function _boxStructure(config, ok, cancel){
		    var box = document.createElement("DIV");
		    box.className = " webix_modal_box webix_"+config.type;
		    box.setAttribute("webixbox", 1);
		    box.setAttribute("role", "alertdialog");
		    box.setAttribute("aria-label", config.title || "");
		    box.setAttribute("tabindex", "0");
			
		    var inner = '';
		    if (config.width)
			    box.style.width = config.width+(webix.rules.isNumber(config.width)?"px":"");
		    if (config.height)
			    box.style.height = config.height+(webix.rules.isNumber(config.height)?"px":"");
		    if (config.title)
			    inner+='<div class="webix_popup_title">'+config.title+'</div>';
		    inner+='<div class="webix_popup_text"><span>'+(config.content?'':config.text)+'</span></div><div  class="webix_popup_controls">';
		    if (ok || config.ok)
			    inner += button(config.ok || "OK", true,"confirm");
		    if (cancel || config.cancel)
			    inner += button(config.cancel || "Cancel", false);
		    if (config.buttons){
			    for (var i=0; i<config.buttons.length; i++)
				    inner += button(config.buttons[i],i);
		    }
		    inner += '</div>';
		    box.innerHTML = inner;

		    if (config.content){
			    var node = config.content;
			    if (typeof node == "string") 
				    node = document.getElementById(node);
			    if (node.style.display == 'none')
				    node.style.display = "";
			    box.childNodes[config.title?1:0].appendChild(node);
		    }

		    box.onclick = function(e){
			    e = e ||event;
			    var source = e.target || e.srcElement;
			    if (!source.className) source = source.parentNode;
			    if (source.className.indexOf("webix_popup_button")!=-1){
				    var result = source.getAttribute("result");
				    result = (result == "true")||(result == "false"?false:result);
				    callback(config, result);
			    }
			    e.cancelBubble = true;
		    };
		    config.box = box;
		    if (ok||cancel||config.buttons)
			    _webix_msg_cfg = config;

		    return box;
	    }
	    function _createBox(config, ok, cancel){
		    var box = config.tagName ? config : _boxStructure(config, ok, cancel);
		    
		    if (!config.hidden)
			    modality(true);

		    webix.toNode(config.container || document.body).appendChild(box);
			
		    var x = config.left||Math.abs(Math.floor(((window.innerWidth||document.documentElement.offsetWidth) - box.offsetWidth)/2));
		    var y = config.top||Math.abs(Math.floor(((window.innerHeight||document.documentElement.offsetHeight) - box.offsetHeight)/2));
		    if (config.position == "top")
			    box.style.top = "-3px";
		    else
			    box.style.top = y+'px';
		    box.style.left = x+'px';
		    //necessary for IE only
		    box.onkeydown = modal_key;

		    box.focus();
		    if (config.hidden)
			    webix.modalbox.hide(box);

		    return box;
	    }

	    function alertPopup(config){
		    return _createBox(config, true, false);
	    }
	    function confirmPopup(config){
		    return _createBox(config, true, true);
	    }
	    function boxPopup(config){
		    return _createBox(config);
	    }
	    function box_params(text, type, callback){
		    if (typeof text != "object"){
			    if (typeof type == "function"){
				    callback = type;
				    type = "";
			    }
			    text = {text:text, type:type, callback:callback };
		    }
		    return text;
	    }
	    function params(text, type, expire, id){
		    if (typeof text != "object")
			    text = {text:text, type:type, expire:expire, id:id};
		    text.id = text.id||t.uid();
		    text.expire = text.expire||t.expire;
		    return text;
	    }
	    webix.alert = function(){
		    var text = box_params.apply(this, arguments);
		    text.type = text.type || "confirm";
		    return alertPopup(text);
	    };
	    webix.confirm = function(){
		    var text = box_params.apply(this, arguments);
		    text.type = text.type || "alert";
		    return confirmPopup(text);
	    };
	    webix.modalbox = function(){
		    var text = box_params.apply(this, arguments);
		    text.type = text.type || "alert";
		    return boxPopup(text);
	    };
	    webix.modalbox.hide = function(node){
		    if(node){
			    while (node && node.getAttribute && !node.getAttribute("webixbox"))
				    node = node.parentNode;
			    if (node){
				    node.parentNode.removeChild(node);
			    }
		    }

		    modality(false);
		    _webix_msg_cfg = null;
	    };
	    var t = webix.message = function(text, type, expire, id){
		    text = params.apply(this, arguments);
		    text.type = text.type||"info";

		    var subtype = text.type.split("-")[0];
		    switch (subtype){
			case "alert":
				return alertPopup(text);
			case "confirm":
				return confirmPopup(text);
			case "modalbox":
				return boxPopup(text);
			default:
				return info(text);
		    }
	    };

	    t.seed = (new Date()).valueOf();
	    t.uid = function(){return t.seed++;};
	    t.expire = 4000;
	    t.keyboard = true;
	    t.position = "top";
	    t.pull = {};
	    t.timers = {};

	    t.hideAll = function(){
		    for (var key in t.pull)
			    t.hide(key);
	    };
	    t.hide = function(id){
		    var obj = t.pull[id];
		    if (obj && obj.parentNode){
			    window.setTimeout(function(){
				    obj.parentNode.removeChild(obj);
				    obj = null;
			    },2000);
			    //styling for animation
			    obj.style.height = 0;
			    obj.className+=" hidden";
			    t.area.removeAttribute("role");
			    
			    if(t.timers[id])
				    window.clearTimeout(t.timers[id]);
			    delete t.pull[id];
		    }
	    };
    })(); 
    // webix.debug_ready(function(){

    // 	var ignore = {
    // 		"_inner":true, 
    // 		"awidth":true,
    // 		"cheight":true,
    // 		"bheight":true,
    // 		"aheight":true
    // 	};

    // 	function get_inspector_config(view){
    // 		var values={};
    // 		var options=[];
    // 		view = webix.$$(view);

    // 		for (var key in view.config){
    // 			if (ignore[key]) continue;
	
    // 			if (typeof view.config[key] == "object") continue;
    // 			if (typeof view.config[key] == "undefined") continue;
    // 			if (typeof view.config[key] == "function") continue;

    // 			if (key == "view" || key == "id")
    // 				options.push({ label:key, id:key});
    // 			else 
    // 				options.push({ label:key, type:"text", id:key});

    // 			if (view.defaults[key] == view.config[key]) 
    // 				options[options.length - 1].css = { "color" : "#888" };

    // 			values[key] = view.config[key];
    // 		}
    // 		options.sort(function(a,b){
    // 			if (!a.css && b.css) return -1;
    // 			if (a.css && !b.css) return 1;
    // 			return (a.id > b.id) ? 1 : ((a.id == b.id) ? 0 : -1);
    // 		});

    // 		return { elements:options, data:values, head:" ["+view.name+"] <strong>"+view._settings.id+"</strong>" };
    // 	}

    // 	function create_inspector(){
    // 		if (!webix.$$("webix_debug_inspector_win"))
    // 			webix.ui({
    // 				id:"webix_debug_inspector_win",
    // 				view:"window", 
    // 				top:2, left: 0, width:350, height:350,
    // 				head:false, autofit:false,
    // 				body:{cols:[
    // 					{ width:10},
    // 					{type:"clean", rows:[
    // 						{ view:"toolbar", elements:[
    // 							{ view:"label", value:"", id:"webix_debug_inspector_head" },
    // 							{ view:"button", width:100, value:"Hide", type:"custom", click:function(){
    // 								webix.debug_inspect();
    // 							}}
    // 						]},
    // 						{
    // 							id:"webix_debug_inspector", nameWidth:150,
    // 							view:"property", scroll:"y",
    // 							elements:[],
    // 							on:{
    // 								onaftereditstop:function(state, editor){
    // 									if (state.old == state.value) return;

    // 									var value = state.value;
    // 									if (value === "true" || value === "false"){
    // 										value = (value === "true");
    // 									} else {
    // 										var intvalue = parseInt(value,10);
    // 										if (intvalue == value)
    // 											value = intvalue;
    // 									}

    // 									var view = webix.$$(this.config.view);
    // 									view.define(editor.id, value);
    // 									if (view.refreshColumns)
    // 										view.refreshColumns();
    // 									else if (view.refresh)
    // 										view.refresh();

    // 									view.resize();
    // 								}
    // 							}
    // 						}
    // 						]
    // 					}]
    // 				}
    // 			});
    // 	}
    // 	function show_inspector(view, ev){
    // 		create_inspector();
    // 		var win = webix.$$("webix_debug_inspector_win");

    // 		if (view){
    // 			var config = get_inspector_config(view);
    // 			var winx = document.body.offsetWidth;
    // 			var winy = document.body.offsetHeight;
    // 			var pos = ev?webix.html.pos(ev):{x:0,y:0};

    // 			win.define("height", Math.max(350, winy-4));
    // 			win.resize();

    // 			var props = webix.$$("webix_debug_inspector");
    // 			props.define("elements", config.elements);
    // 			props.define("view", view);

    // 			win.show({ x:(pos.x > winx/2 )?0:(winx-370), y:0 });
    // 			webix.$$("webix_debug_inspector").setValues(config.data);
    // 			webix.$$("webix_debug_inspector_head").setValue(config.head);
    // 		} else 
    // 			win.hide();
    // 	}
    // 	webix.debug_inspect = show_inspector;

    // 	function infi(value){
    // 		if (value >= 100000)
    // 			return "Any";
    // 		return value;
    // 	}
    // 	function log_level(data, prefix, now){
    // 		window.console.log((data == now?">>":"  ")+prefix + data.name+" / " +data.config.id);
    // 		prefix+="  ";
    // 		if (data._cells)
    // 			for (var i=0; i<data._cells.length; i++){
    // 				log_level(data._cells[i], prefix, now);
    // 			}
    // 		if (data._head_cell)
    // 			log_level(data._head_cell, prefix, now);

    // 		if (data._body_cell)
    // 			log_level(data._body_cell, prefix, now);
    // 	}

    // 	webix.ui({
    // 		view:"contextmenu",
    // 		id:"webix:debugmenu",
    // 		on:{
    // 			onBeforeShow:function(e){
    // 				if (!e.ctrlKey) return false;

    // 				var view = webix.html.locate(e, "view_id");
    // 				if (!view) return false;
    // 				this.config.lastTarget = view;

    // 				webix.blockEvent();
    // 				webix.delay(function(){ webix.unblockEvent(); });
    // 			},
    // 			onShow:function(){
    // 				var view = webix.$$(this.config.lastTarget);
    // 				var info = "<span style='color:#888'>"+view._settings.id + "<sup style='float:right'>["+view.name+"]</sup></span>";
    // 				document.getElementById("webix_debug_cmx").innerHTML = info;
    // 			}
    // 		},
    // 		data:[
    // 			"<div id='webix_debug_cmx'></div>",
    // 			{ id:"inspect", value:"Inspect"},
    // 			{ id:"docs", value:"Documentation"},
    // 			{
    // 				value:"Log to Console", submenu:[
    // 					{ id:"size", value:"Sizes" },
    // 					{ id:"tree", value:"Tree" },
    // 					{ id:"dump", value:"Dump"}
    // 				]
    // 			}		
    // 		],
    // 		click:function(id, ev){
    // 			//mixing two object result in confusion
    // 			var obj = webix.$$(this.config.lastTarget);

    // 			if  (id == "dump"){
    // 				window.console.info("\n"+obj.name+" / "+obj.config.id);
    // 				window.console.log("\nView: ",obj,", Config: ", obj.config, ", Data: ", obj.data);
    // 				window.console.log(obj.$view);
    // 			}

    // 			if (id == "tree"){
	
    // 				var now = obj;
    // 				while (obj.getParentView())
    // 					obj = obj.getParentView();

    // 				window.console.log("");
    // 				log_level(obj, "", now);
    // 			}

    // 			if (id == "size"){
    // 				window.console.info("");
    // 				window.console.info("\n"+obj.name+" / "+obj.config.id);
    // 				window.console.info("\n[min]   ", obj.config.width, " x ", obj.config.height);
    // 				var sizes = obj.$getSize(0,0);
    // 				window.console.info("[max]    ", infi(sizes[1]), " x ", infi(sizes[3])+(obj.config.autoheight?", auto height":""));
    // 				window.console.info("[gravity]   ", obj.config.gravity);

    // 				window.console.info("\n[content]    ", obj._content_width, " x ", obj._content_height);
    // 				window.console.info("[last set]   ", obj._last_size[0], " x ", obj._last_size[1]);
    // 				if (obj._settings._inner)
    // 					window.console.info("\n[borders]   ", "left:", !obj._settings._inner.left,"\ttop:", !obj._settings._inner.top,  "\tright:", !obj._settings._inner.right,  "\tbottom:", !obj._settings._inner.bottom);
    // 				else
    // 					window.console.info("\n[borders]   none");
    // 			}

    // 			if (id == "docs")
    // 				window.open("http://docs.webix.com/api__refs__ui."+obj.name+".html","__blank");

    // 			if (id == "inspect"){
    // 				show_inspector(this.config.lastTarget, ev);
    // 			}
    // 		},
    // 		master:document.body
    // 	});
    // });






    webix.UploadDriver = {
	    flash: {
		    $render: function(render_config) {

			    if (!window.swfobject)
				    webix.require("legacy/swfobject.js", true); // sync loading

			    var config = this._settings;
			    config.swfId = (config.swfId||"webix_swf_"+webix.uid());

			    this._getBox().innerHTML += "<div class='webix_upload_flash'><div id='"+config.swfId+"'></div></div>";
			    this._upload_area = this._getBox().lastChild;

			    // add swf object
			    swfobject.embedSWF(webix.codebase+"/legacy/uploader.swf", config.swfId, "100%", "100%", "9", null, {
					uploaderId: config.id,
					ID: config.swfId,
					enableLogs:(config.enableLogs?"1":""),
					paramName:(config.inputName),
					multiple:(config.multiple?"Y":"")
			    }, {wmode:"transparent"});

			    var v = swfobject.getFlashPlayerVersion();

			    webix._event(this._viewobj, "click", webix.bind(function() {
				    var now_date = new Date();
				    if (now_date - (this._upload_timer_click||0)  > 250){
					    this.fileDialog();
				    }
			    }, this));

			    this.files.attachEvent("onBeforeDelete", webix.bind(this._stop_file,this));
		    },
		    $applyFlash: function(name,params){
			    return this[name].apply(this,params);
		    },
		    getSwfObject: function(){
			    return swfobject.getObjectById(this._settings.swfId);
		    },
		    fileDialog:function(){
			    if(this.getSwfObject())
				    this.getSwfObject().showDialog();
		    },
		    send: function(id){
			    if (typeof id == "function"){
				    this._last_assigned_upload_callback = id;
				    id = 0;
			    }

			    if (!id){
				    var order = this.files.data.order;
				    var complete = true;
				    if (order.length)
					    for (var i=0; i<order.length; i++){
						    complete = this.send(order[i])&&complete;
					    }

				    if (complete)
					    this._upload_complete();

				    return;
			    }
			    var item = this.files.getItem(id);
			    if (item.status !== 'client')
				    return false;
			    item.status = 'transfer';

			    if(this.getSwfObject()){
				    var url = this._get_active_url(item);
				    var details = webix.extend(item.formData||{},this._settings.formData||{});
				    this.getSwfObject().upload(id, url, details);
			    }
			    return true;

		    },
		    $beforeAddFileToQueue: function( id, name, size ){

			    var type = name.split(".").pop();
			    var format = this._format_size(size);
			    return this.callEvent("onBeforeFileAdd", [{
				    id: id,
				    name:name,
				    size:size,
				    sizetext:format,
				    type:type
			    }]);
		    },
		    $addFileToQueue: function(id, name, size){
			    if(this.files.exists(id))
				    return false;
			    if (!this._settings.multiple)
				    this.files.clearAll();
			    var type = name.split(".").pop();
			    var format = this._format_size(size);
			    var file_struct = {
				    name:name,
				    id: id,
				    size:size,
				    sizetext:format,
				    type:type,
				    status:"client"
			    };
			    this.files.add(file_struct);
			    this.callEvent("onAfterFileAdd", [file_struct]);

			    if (id && this._settings.autosend)
				    this.send(id);
		    },
		    stopUpload: function(id){
			    this._stop_file(id);
		    },
		    _stop_file: function(id) {
			    var item = this.files.getItem(id);
			    if(item.status == "transfer"){
				    this.getSwfObject().uploadStop(id);
				    item.status = "client";
			    }
		    },
		    $onUploadComplete: function(){
			    if(this._settings.autosend){
				    this._upload_complete();
			    }
		    },
		    $onUploadSuccess: function(id,name,response){
			    var item = this.files.getItem(id);
			    if(item){
				    item.status = "server";
				    item.progress = 100;
				    if(response.text && (typeof response.text == "string")){


					    webix.DataDriver.json.toObject(response.text);

					    webix.extend(item,response,true);
				    }
				    this.callEvent("onFileUpload", [item,response]);
				    this.callEvent("onChange", []);
				    this.files.updateItem(id);
			    }
		    },
		    $onUploadFail: function(id){
			    var item = this.files.getItem(id);
			    item.status = "error";
			    delete item.percent;
			    this.files.updateItem(id);
			    this.callEvent("onFileUploadError", [item, ""]);
		    }
	    },
	    html5: {
		    $render: function(config) {
			    if (this._upload_area){
				    //firstChild is webix_el_box container, which have relative position
				    //as result, file control is placed under the button and not in the top corner
				    this._contentobj.firstChild.appendChild(this._upload_area);
				    return;
			    }
			    this.files.attachEvent("onBeforeDelete", this._stop_file);

			    var input_config =  {
				    "type": "file",
				    "class": "webix_hidden_upload",
				    tabindex:-1
			    };

			    if (this._settings.accept)
				    input_config.accept = this._settings.accept;

			    if (this._settings.multiple)
				    input_config.multiple = "true";

			    if (this._settings.directory) {
				    input_config.webkitdirectory = "true";
				    input_config.mozdirectory = "true";
				    input_config.directory = "true";
			    }

			    var f = webix.html.create("input", input_config);
			    this._upload_area = this._contentobj.firstChild.appendChild(f);

			    webix._event(this._viewobj, 'drop', webix.bind(function(e) {
				    this._drop(e);
				    webix.html.preventEvent(e);
			    }, this));
			    webix._event(f, 'change', webix.bind(function() {
				    this._add_files(f.files);

				    if (webix.env.isIE) {
					    var t = document.createElement("form");
					    t.appendChild(this._upload_area);
					    t.reset();
					    this._contentobj.firstChild.appendChild(f);
				    } else
					    f.value = "";
			    }, this));
			    webix._event(this._viewobj, "click", webix.bind(function() {
				    var now_date = new Date();
				    if (now_date - (this._upload_timer_click || 0) > 250) {
					    this.fileDialog();
				    }
			    }, this));

			    webix._event(this._viewobj, 'dragenter', webix.html.preventEvent);
			    webix._event(this._viewobj, 'dragexit', webix.html.preventEvent);
			    webix._event(this._viewobj, 'dragover', webix.html.preventEvent);
		    },
		    _directoryEntry: function(value) {
			    return value.isDirectory;
		    },
		    _directoryDrop: function(item, state, path) {
			    if (item.isFile){
				    item.file(function(file){
					    state.addFile(file, null, null, { name : path+"/"+file.name });
				    });
			    } else if (item.isDirectory) {
				    // Get folder contents
				    var dirReader = item.createReader();
				    dirReader.readEntries(function(entries){
					    for (var i = 0; i < entries.length; i++){
						    state._directoryDrop(entries[i], state, (path ? (path + "/") : "") + item.name);
					    }
				    });
			    }
		    },
		    // adding files by drag-n-drop
		    _drop: function(e) {
			    var files = e.dataTransfer.files;
			    var items = e.dataTransfer.items;

			    if (this.callEvent('onBeforeFileDrop', [files, e])) {
				    for (var i = 0; i < items.length; i++) {
					    //https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/webkitGetAsEntry
					    var item = items[i];
					    if (this._settings.directory && item.webkitGetAsEntry){
						    item = item.webkitGetAsEntry();
						    if (item.isDirectory){
							    this._directoryDrop(item, this, "");
							    continue;
						    }
					    }
					    this.addFile(files[i]);
				    }
			    }
			    this.callEvent("onAfterFileDrop", [files, e]);
		    },
		    fileDialog:function(context){
			    this._upload_timer_click = new Date();
			    this._last_file_context = context;
			    var inputs = this._viewobj.getElementsByTagName("INPUT");
			    inputs[inputs.length-1].click();
		    },
		    send: function(id){
			    //alternative syntx send(callback)
			    if (typeof id == "function"){
				    this._last_assigned_upload_callback = id;
				    id = 0;
			    }

			    if (!id){
				    var order = this.files.data.order;
				    var complete = true;

				    if (order.length)
					    for (var i=0; i<order.length; i++)
						    complete = (!this.send(order[i])) && complete;

				    if (complete)
					    this._upload_complete();

				    return;
			    }

			    var item = this.files.getItem(id);
			    if (item.status !== 'client') return false;

			    webix.assert(this._settings.upload, "You need to define upload url for uploader component");
			    item.status = 'transfer';

			    var formData = new FormData();

			    if (item.folder) {
				    for (var i = 0; i < item.folder.length; i++){
					    formData.append(this.config.inputName + i, item.folder[i], item.folder[i].webkitRelativePath);
				    }
			    } else {
				    formData.append(this.config.inputName, item.file, item.name);
				    if (this._settings.directory)
					    formData.append(this.config.inputName+"_fullpath", item.name);
			    }

			    var headers = {};
			    var details = webix.extend(item.formData||{},this._settings.formData||{});

			    var xhr = new XMLHttpRequest();
			    var url = this._get_active_url(item);
			    if(webix.callEvent("onBeforeAjax",["POST", url, details, xhr, headers, formData])){
				    for (var key in details)
					    formData.append(key, details[key]);

				    item.xhr = xhr;

				    xhr.upload.addEventListener('progress', webix.bind(function(e){ this.$updateProgress(id, e.loaded/e.total*100); }, this), false);
				    xhr.onload = webix.bind(function(e){ if (!xhr.aborted) this._file_complete(id); }, this);
				    xhr.open('POST', url, true);

				    for (var key in headers)
					    xhr.setRequestHeader(key, headers[key]);

				    xhr.send(formData);
			    }

			    this.$updateProgress(id, 0);
			    return true;
		    },

		    
		    _file_complete: function(id) {
			    var item = this.files.getItem(id);
			    if (item){
				    var response = null;
				    if(item.xhr.status < 400){
					    response = webix.DataDriver[this._settings.datatype||"json"].toObject(item.xhr.responseText);
				    }
				    if (!response || response.status == "error"){
					    item.status = "error";
					    delete item.percent;
					    this.files.updateItem(id);
					    this.callEvent("onFileUploadError", [item, response]);
				    } else {
					    this._complete(id, response);
				    }
				    delete item.xhr;
			    }
		    },
		    stopUpload: function(id){
			    webix.bind(this._stop_file,this.files)(id);
		    },
		    _stop_file: function(id) {
			    var item = this.getItem(id);
			    if (typeof(item.xhr) !== 'undefined'){
				    item.xhr.aborted = true;
				    item.xhr.abort();
				    delete item.xhr;
				    item.status = "client";
			    }
		    }
	    }
    };


    webix.html.addMeta = function(name, value){
	    document.getElementsByTagName('head').item(0).appendChild(webix.html.create("meta",{
		    name:name,
		    content:value
	    }));	
	    
    };

    (function(){
	    
        var orientation = function(){
	        var new_orientation = !!(window.orientation%180);
	        if (webix.ui.orientation === new_orientation) return;
	        webix.ui.orientation = new_orientation;	
	        webix.callEvent("onRotate", [new_orientation]);
        };
        if(webix.env.touch){
	        webix.ui.orientation = !!((webix.isUndefined(window.orientation)?90:window.orientation)%180);
	        webix.event(window, ("onorientationchange" in window ?"orientationchange":"resize"), orientation);
        }


        if(webix.env.isFF && window.matchMedia){
	        window.matchMedia("(orientation: portrait)").addListener(function() {webix.ui.orientation = false; });
	        window.matchMedia("(orientation: landscape)").addListener(function() { webix.ui.orientation = true; });
        }
        webix.ui.fullScreen = function(){
	        if (!webix.env.touch) return;

	        webix.html.addMeta("apple-mobile-web-app-capable","yes");
	        webix.html.addMeta("viewport","initial-scale=1, maximum-scale=1, user-scalable=no");

	        //in ios5 we can have empty offsetHeight just after page loading
	        var size = document.body.offsetHeight||document.body.scrollHeight;

	        var iphone = navigator.userAgent.indexOf("iPhone")!=-1;
	        var ipad = navigator.userAgent.indexOf("iPad")!=-1;

	        var version = navigator.userAgent.match(/iPhone OS (\d+)/);
	        var iOS7 = version&&(version[1]>=7);


            var iphone_safari = iphone && (size == 356 || size == 208 || size == 306 || size == 158 || size == 444);
            var iphone5 = (window.screen.height==568);

	        var fix = function(){
		        var x = 0; var y=0;
		        if (iphone && !iOS7){
			        if (!webix.ui.orientation){
				        x = 320;
                        y = iphone5?(iphone_safari?504:548):(iphone_safari?416:460);
			        } else {
                        x = iphone5?568:480;
				        y = iphone_safari?268:300;
			        }
		        } else if (webix.env.isAndroid){

			        if(!webix.env.isFF){
				        //ipad doesn't change orientation and zoom level, so just ignore those lines
				        document.body.style.width = document.body.style.height = "1px";
				        document.body.style.overflow="hidden";

				        var dmod = window.outerWidth/window.innerWidth; //<1
				        x = window.outerWidth/dmod;
				        y = window.outerHeight/dmod;
			        }
		        } else if(!webix.env.isIEMobile){
			        x = window.innerWidth;
			        y = window.innerHeight;
		        }

		        if (y){
			        document.body.style.height = y+"px";
			        document.body.style.width = x+"px";
		        }

		        webix.ui.$freeze = false;
		        webix.ui.resize();
	        };

	        var onrotate = function(){ 
		        webix.ui.$freeze = true;
		        if(webix.env.isSafari) 
			        fix();
		        else
			        webix.delay(fix,null, [], 500);
	        };


	        webix.attachEvent("onRotate", onrotate);
	        orientation();
	        webix.delay(onrotate);

        };


    })();

    








    webix.ActiveContent = {
	    $init:function(config){  
		    if (config.activeContent){
			    this.$ready.push(this._init_active_content_list);
			    
			    this._active_holders = {};
			    this._active_holders_item = {};
			    this._active_holders_values = {};
			    this._active_references = {};
			    
			    for (var key in config.activeContent){
				    this[key] = this._bind_active_content(key);
				    if (config.activeContent[key].earlyInit){
					    var temp = webix._parent_cell; webix._parent_cell = null;
					    this[key].call(this,{},this, config.activeContent);
					    webix._parent_cell=temp;
				    }
			    }
		    }
	    },
	    _destructActiveContent: function(){
		    for(var key in this._active_references){
			    var elem = this._active_references[key];
			    if(elem.destructor)
				    elem.destructor();
		    }
	    },
	    _init_active_content_list:function(){
		    this.attachEvent("onDestruct",webix.bind(this._destructActiveContent,this));

		    webix._event(this.$view, "blur", function(ev){
			    var target = ev.target || ev.srcElement;

			    // for inputs only
			    if(target.tagName != "BUTTON"){
				    var el = webix.$$(ev);
				    if (el && el !== this && el.getValue  && el.setValue){
					    el.getNode(ev);

					    var newvalue = el.getValue();
					    if (newvalue != el._settings.value)
						    el.setValue(newvalue);
				    }
			    }
		    }, {bind:this, capture: true});

		    if (this.filter){
			    for (var key in this._settings.activeContent){
				    this.type[key] = this[key];
				    this[key] = this._locate_active_content_by_id(key);
			    }
			    //really bad!
			    this.attachEvent("onBeforeRender", function(){
				    this.type.masterUI = this;
			    });
			    this.type.masterUI = this;
		    }
	    },
	    _locate_active_content_by_id:function(key){
		    return function(id){
			    var button = this._active_references[key];
			    var button_id = button._settings.id;
			    var html = this.getItemNode(id).getElementsByTagName("DIV");
			    for (var i=0; i < html.length; i++) {
				    if (html[i].getAttribute("view_id") == button_id){
					    button._viewobj = button._dataobj = html[i];
					    break;
				    }
			    }
			    return button;
		    };
	    },
	    _get_active_node:function(el, key, master){
		    return function(e){
			    if (e){
				    var trg=e.target||e.srcElement;
				    while (trg){
					    if (trg.getAttribute && trg.getAttribute("view_id")){
						    master._setActiveContentView(el,trg);
						    if (master.locate){
							    var id = master.locate(trg.parentNode);
							    var value = master._active_holders_values[key][id];
							    el._settings.value = value;
							    el._settings.$masterId = id;
						    }
						    return trg;
					    }
					    trg = trg.parentNode;
				    }				
			    }
			    return el._viewobj;
		    };
	    },
	    _set_new_active_value:function(key, master){
		    return function(value){
			    var data = master.data;
			    if (master.filter){
				    var id = master.locate(this._viewobj.parentNode);
				    data = master.getItem(id);
				    //XMLSerializer - FF "feature"
				    this.refresh();
				    master._active_holders_item[key][id]=this._viewobj.outerHTML||(new XMLSerializer().serializeToString(this._viewobj));
				    master._active_holders_values[key][id] = value;
			    }
			    if(data)
				    data[key] = value;
		    };
	    },
	    _bind_active_content:function(key){ 
		    return function(obj, common, active){
			    var object = common._active_holders?common:common.masterUI;

			    if (!object._active_holders[key]){
				    var d = document.createElement("DIV");
				    
				    active = active || object._settings.activeContent;
				    var el = webix.ui(active[key], d);

				    d.firstChild.setAttribute("onclick", "event.processed = true; if (webix.env.isIE8) event.srcElement.w_view = '"+el._settings.id+"';");

				    el.getNode = object._get_active_node(el, key, object);

				    el.attachEvent("onChange", object._set_new_active_value(key, object));
				    
				    object._active_references[key] = el;
				    object._active_holders[key] = d.innerHTML;
				    object._active_holders_item[key] = {};
				    object._active_holders_values[key] = {};
				    el.$activeEl = el.$view;
			    }
			    if (object.filter && obj[key] != object._active_holders_values[key] && !webix.isUndefined(obj[key])){
				    var el = object._active_references[key];
				    el.blockEvent();
				    object._setActiveContentView(el,el.$activeEl);
				    //in IE we can lost content of active element during parent repainting
				    if (!el.$view.firstChild) el.refresh();
				    el.setValue(obj[key]);
				    el.refresh();
				    el.unblockEvent();
				    
				    object._active_holders_values[key][obj.id] = obj[key];
				    object._active_holders_item[key][obj.id] = el._viewobj.outerHTML||(new XMLSerializer().serializeToString(el._viewobj));
			    }
			    
			    return object._active_holders_item[key][obj.id]||object._active_holders[key];
		    };
	    },
	    _setActiveContentView: function(el,view){
		    el._dataobj = el._viewobj = el.$view = view;
	    }
    };
    webix.ProgressBar = {
	    $init:function(){
		    if (webix.isUndefined(this._progress) && this.attachEvent){
			    this.attachEvent("onBeforeLoad", this.showProgress);
			    this.attachEvent("onAfterLoad", this.hideProgress);
			    this._progress = null;
		    }
	    },
	    showProgress:function(config){
		    // { position: 0 - 1, delay: 2000ms by default, css : name of css class to use }
		    if (!this._progress){

			    config = webix.extend({
				    position:0,
				    delay: 2000,
				    type:"icon",
				    icon:"refresh",
				    hide:false
			    }, (config||{}), true);

			    var incss = (config.type == "icon") ? ("fa-"+config.icon+" fa-spin") : "";



			    this._progress = webix.html.create(
				    "DIV",
				    {
					    "class":"webix_progress_"+config.type,
					    "role":"progressbar",
					    "aria-valuemin":"0",
					    "aria-valuemax":"100",
					    "tabindex":"0"
				    },
				    "<div class='webix_progress_state "+incss+"'></div>"
			    );

			    if(!this.setPosition)
				    this._viewobj.style.position = "relative";

			    webix.html.insertBefore(this._progress, this._viewobj.firstChild, this._viewobj);
			    this._viewobj.setAttribute("aria-busy", "true");

			    if(!webix.Touch.$active){
				    if(this.getScrollState){
					    var scroll = this.getScrollState();
					    if(this._viewobj.scrollWidth != this.$width){
						    this._progress.style.left = scroll.x +"px";
					    }
					    if(this._viewobj.scrollHeight != this.$height){
						    if(config.type != "bottom"){
							    this._progress.style.top = scroll.y +"px";
						    } else {
							    this._progress.style.top =  scroll.y + this.$height - this._progress.offsetHeight +"px";
						    }

					    }
				    }
			    }


			    this._progress_delay = 1;
		    }

		    if (config && config.type != "icon")
			    webix.delay(function(){
				    if (this._progress){
					    var position = config.position || 1;
					    //check for css-transition support
					    if(this._progress.style[webix.env.transitionDuration] !== webix.undefined || !config.delay){
						    this._progress.firstChild.style.width = position*100+"%";
						    if (config.delay)
							    this._progress.firstChild.style[webix.env.transitionDuration] = config.delay+"ms";
					    } else{
					        //if animation is not supported fallback to timeouts [IE9]
						    var count = 0,
							    start = 0,
							    step = position/config.delay*30,
							    view = this;

						    if(this._progressTimer){
							    //reset the existing progress
							    window.clearInterval(this._progressTimer);
							    start = this._progress.firstChild.offsetWidth/this._progress.offsetWidth*100;
						    }
						    this._progressTimer = window.setInterval(function(){
							    if(count*30 == config.delay){
								    window.clearInterval(view._progressTimer);
							    }
							    else{
								    if(view._progress && view._progress.firstChild)
									    view._progress.firstChild.style.width = start+count*step*position*100+"%";
								    count++;
							    }
						    },30);
					    }

					    if (config.hide)
						    webix.delay(this.hideProgress, this, [1], config.delay);

				    }
				    this._progress_delay = 0;
			    }, this);
		    else if(config && config.type == "icon" && config.hide)
			    webix.delay(this.hideProgress, this, [1], config.delay);
	    },
	    hideProgress:function(now){
		    if (this._progress_delay)
			    now = true;

		    if (this._progress){
			    if (now){
				    if(this._progressTimer)
					    window.clearInterval(this._progressTimer);
				    webix.html.remove(this._progress);
				    this._progress = null;
				    this._viewobj.removeAttribute("aria-busy");
			    } else {
				    this.showProgress({ position:1.1, delay:300 , hide:true });
			    }
		    }
	    }
    };








    webix.UIManager.getState = function(node, children) {
	    children = (children||false);
	    node = webix.$$(node);
	    var state = {
		    id: node.config.id,
		    width: node.config.width,
		    height: node.config.height,
		    gravity: node.config.gravity
	    };
	    if (!webix.isUndefined(node.config.collapsed)) state.collapsed = node.config.collapsed;
	    if (node.name === 'tabs' || node.name === 'tabbar') state.activeCell = node.getValue();
	    
	    if (children) {
		    state = [state];
		    if (node._cells) {
			    for (var i = 0; i < node._cells.length; i++)
				    state = state.concat(this.getState(node._cells[i], children));
		    }
	    }
	    return state;
    };

    webix.UIManager.setState = function(states) {
	    if (!webix.isArray(states)) states = [states];

	    for (var i = 0; i < states.length; i++) {
		    var state = states[i];
		    var node = webix.$$(state.id);
		    if (!node) continue;

		    if (!webix.isUndefined(state.collapsed)) node.define('collapsed', state.collapsed);
		    if (!webix.isUndefined(state.activeCell)) node.setValue(state.activeCell);

		    node.define('width', state.width);
		    node.define('height', state.height);
		    node.define('gravity', state.gravity);
	    }
	    var top = webix.$$(states[0].id);
	    if (top) top.resize();
    };


   


    webix.DataDriver.excel = webix.extend({
	    toObject:function(data){
		    if(!data.excel){
			    var opts = data.options || {};
			    if (opts.dataurl) 
				    webix.extend(opts, this._urlToOptions(opts.dataurl));

			    data = data.data || data;
			    var promise = webix.promise.defer();
			    
			    if(data.name){ //file
				    opts.ext = data.name.split(".").pop();
				    var reader = new FileReader();
				    
				    reader.onload = webix.bind(function (e) {
					    promise.resolve(this.parseData(e.target.result, opts));
				    }, this);
				    reader.readAsArrayBuffer(data);
			    }
			    else //arraybuffer
				    promise.resolve(this.parseData(data, opts));
				
			    return promise;
		    }
		    //plain jsarray or hash
		    return data;
	    },
	    parseData:function(data, options){
		    data = new Uint8Array(data);
            var arr = [];
            for(var i = 0; i != data.length; ++i)
			    arr[i] = String.fromCharCode(data[i]);

		    var ext = (options.ext || options).toLowerCase();
		    if (ext != "xls") ext = "xlsx";

		    return webix.require(webix.cdn + "/extras/"+ext+".core.min.js").then(webix.bind(function(){
			    var workbook = (ext == "xls") ?
				    XLS.read(arr.join(""), {type: 'binary'}) :
				    XLSX.read(arr.join(""), {type: 'binary'});

			    var res = {
				    sheets: workbook.Sheets,
				    names: workbook.SheetNames,
				    options:options
			    };
			    return webix.extend(this.getSheet(res, options), res);
		    }, this));
	    },
	    getSheet:function(data, options){
		    var name = options.name || data.names[0];
		    data = this.sheetToArray(data.sheets[name], options);
		    if(options.rows && options.rows.length)
			    data.data = data.data.splice(options.rows[0], Math.min(options.rows[1], data.data.length)-options.rows[0]);
		    return data;
	    },
	    sheetToArray:function(sheet, options){
		    var all = [];
		    var spans = [];

		    if(sheet["!ref"]){
			    var range = XLS.utils.decode_range(sheet["!ref"]), row, col, cellCoord, cell;
			    for (row = range.s.r; row <= range.e.r; row++) {
				    var nrow = [];
				    for (col = range.s.c; col <= range.e.c; col++) {
					    cellCoord = XLS.utils.encode_cell({ r: row, c: col });
					    cell = sheet[cellCoord];
					    if(!cell)
						    nrow.push("");
					    else{
						    var ncell = "";
						    if(options.math&&cell.f) // get formula
							    ncell = cell.f.charAt(0)=="=" ? cell.f : "="+cell.f;
						    else //get formatted numeric value (date)
							    ncell = (cell.t == "n" && cell.w && cell.v != cell.w) ? cell.w:cell.v;
						    nrow.push(ncell);
					    }
				    }
				    all.push(nrow);
			    }
		    }

		    if(sheet["!merges"]){
			    var merges = sheet["!merges"];
			    var full = {data:all, spans:[]};

			    for(var i = 0; i<merges.length; i++){
				    var s = merges[i].s;
				    var e = merges[i].e;
				    var sl  = options.rows?options.rows[0]:0;

				    spans.push([s.r+sl, s.c, e.c-s.c+1, e.r-s.r+1]);
			    }
		    }

            return { data:all, spans: spans, excel: true };
	    },
	    _urlToOptions:function(details){
		    var parts = details.split("[");
		    var options = {};
		    options.name = parts[0];
		    if(parts[1]){
			    var rows = parts[1].split(/[^0-9]+/g);
			    rows[0] = rows[0]*1 || 0;
			    rows[1] = rows[1] || 9999999;
			    options.rows = rows;
		    }
		    return options;
	    },
    }, webix.DataDriver.jsarray);

    return webix;
});
