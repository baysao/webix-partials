    webix.protoUI({
	    name:"vscroll",
	    defaults:{
		    scroll:"x",
		    scrollStep:40,
		    scrollPos:0,
		    scrollSize:18,
		    scrollVisible:1,
		    zoom:1
	    },
	    $init:function(config){
		    var dir = config.scroll||"x";
		    var node = this._viewobj = webix.toNode(config.container);
		    node.className += " webix_vscroll_"+dir;
		    node.innerHTML="<div class='webix_vscroll_body'></div>";
		    webix._event(node,"scroll", this._onscroll,{bind:this});

		    this._last_set_size = 0;
		    this._last_scroll_pos = 0;
	    },
	    reset:function(){
		    this._last_scroll_pos = this.config.scrollPos = 0;
		    this._viewobj[this.config.scroll == "x"?"scrollLeft":"scrollTop"] = 0;
	    },
	    _check_quantum:function(value){
		    if (value>1500000){
			    this._settings.zoom = Math.floor(value/1500000)+1;
			    this._zoom_limit = value-this._last_set_size;
			    value = Math.floor(value/this._settings.zoom)+this._last_set_size;
		    } else {
			    this._settings.zoom = 1;
			    this._zoom_limit = Infinity;
		    }
		    return value;
	    },	
	    scrollWidth_setter:function(value){
		    value = this._check_quantum(value);
		    this._viewobj.firstChild.style.width = value+"px";
		    return value;		
	    },
	    scrollHeight_setter:function(value){
		    value = this._check_quantum(value);
		    this._viewobj.firstChild.style.height = value+"px";
		    return value;
	    },
	    sizeTo:function(value, top, bottom){
		    value = value-(top||0)-(bottom||0);

		    var width = this._settings.scrollSize;
		    //IEFix
		    //IE doesn't react on scroll-click if it has not at least 1 px of visible content
		    if (webix.env.isIE && width)
			    width += 1;
		    if (!width && this._settings.scrollVisible && !webix.env.$customScroll){
			    this._viewobj.style.pointerEvents="none";
			    width = 14;
		    }

		    if (!width){
			    this._viewobj.style.display = 'none';
		    } else {
			    this._viewobj.style.display = 'block';
			    if (top)
				    this._viewobj.style.marginTop = top+ "px";
			    this._viewobj.style[this._settings.scroll == "x"?"width":"height"] =  Math.max(0,value)+"px";
			    this._viewobj.style[this._settings.scroll == "x"?"height":"width"] = width+"px";
		    }

		    this._last_set_size = value;
	    },
	    getScroll:function(){
		    return this._settings.scrollPos*this._settings.zoom;
	    },
	    getSize:function(){
		    return (this._settings.scrollWidth||this._settings.scrollHeight)*this._settings.zoom;
	    },
	    scrollTo:function(value){
		    if (value<0)
			    value = 0;
		    var config = this._settings;

		    value = Math.min(((config.scrollWidth||config.scrollHeight)-this._last_set_size)*config.zoom, value);

		    if (value < 0) value = 0;
		    var svalue = value/config.zoom;

		    if (this._last_scroll_pos != svalue){
			    this._viewobj[config.scroll == "x"?"scrollLeft":"scrollTop"] = svalue;
			    this._onscroll_inner(svalue);
			    return true;
		    }
	    },
	    _onscroll:function(){	
		    var x = this._viewobj[this._settings.scroll == "x"?"scrollLeft":"scrollTop"];
		    if (x != this._last_scroll_pos)
			    this._onscroll_inner(x);
	    },
	    _onscroll_inner:function(value){
		    this._last_scroll_pos = value;
		    this._settings.scrollPos = (Math.min(this._zoom_limit, value*this._settings.zoom) || 0);

		    this.callEvent("onScroll",[this._settings.scrollPos]);
	    },
	    activeArea:function(area, x_mode){
		    this._x_scroll_mode = x_mode;
		    webix._event(area,(webix.env.isIE8 ? "mousewheel" : "wheel"),this._on_wheel,{bind:this});
		    this._add_touch_events(area);
	    },

	    _add_touch_events: function(area){
		    if(!webix.env.touch && window.navigator.pointerEnabled){
			    webix.html.addCss(area,"webix_scroll_touch_ie",true);
			    webix._event(area, "pointerdown", function(e){
				    if(e.pointerType == "touch" || e.pointerType == "pen"){
					    this._start_context = webix.Touch._get_context_m(e);
					    this._start_scroll_pos = this._settings.scrollPos;
				    }
			    },{bind:this});

			    webix.event(document.body, "pointermove", function(e){
				    var scroll;
				    if(this._start_context){
					    this._current_context = webix.Touch._get_context_m(e);
					    if(this._settings.scroll == "x" ){
						    scroll = this._current_context.x - this._start_context.x;
					    }
					    else if(this._settings.scroll == "y"){
						    scroll = this._current_context.y - this._start_context.y;
					    }
					    if(scroll && Math.abs(scroll) > 5){
						    this.scrollTo(this._start_scroll_pos - scroll);
					    }
				    }
			    },{bind:this});
			    webix.event(window, "pointerup", function(e){
				    if(this._start_context){
					    this._start_context = this._current_context = null;
				    }
			    },{bind:this});
		    }

	    },
	    _on_wheel:function(e){
		    var dir = 0;
		    var step = e.deltaMode === 0 ? 30 : 1;

		    if (webix.env.isIE8)
			    dir = e.detail = -e.wheelDelta / 30;

		    if (e.deltaX && Math.abs(e.deltaX) > Math.abs(e.deltaY)){
			    //x-scroll
			    if (this._x_scroll_mode && this._settings.scrollVisible)
				    dir = e.deltaX / step;
		    } else {
			    //y-scroll
			    if (!this._x_scroll_mode && this._settings.scrollVisible){
				    if (webix.isUndefined(e.deltaY))
					    dir = e.detail;
				    else
					    dir = e.deltaY / step;
			    }
		    }

		    // Safari requires target preserving
		    // (used in _check_rendered_cols of DataTable)
		    if(webix.env.isSafari)
			    this._scroll_trg = e.target|| e.srcElement;

		    if (dir)
			    if (this.scrollTo(this._settings.scrollPos + dir*this._settings.scrollStep))
				    return webix.html.preventEvent(e);

	    }
    }, webix.EventSystem, webix.Settings);
