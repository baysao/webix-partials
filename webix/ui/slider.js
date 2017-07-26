webix.protoUI({
	name:"slider",
    $touchCapture:true,
    defaults:{
        min:0,
        max:100,
        value:50,
        step:1,
        title:false,
		template:function(obj, common){
            var id = common._handle_id = "x" +webix.uid();
            var html = "<div class='webix_slider_title'></div><div class='webix_slider_box'><div class='webix_slider_left'>&nbsp;</div><div class='webix_slider_right'></div><div class='webix_slider_handle' role='slider' aria-label='"+obj.label+(obj.title?(" "+obj.title(obj)):"")+"' aria-valuemax='"+obj.max+"' aria-valuemin='"+obj.min+"' aria-valuenow='"+obj.value+"' tabindex='0' id='"+id+"'>&nbsp;</div></div>";
            return common.$renderInput(obj, html, id);
		}
	},
	type_setter:function(type){
		this._viewobj.className += " webix_slider_"+type;
	},
    title_setter:function(value){
        if (typeof value == 'string')
            return webix.template(value);
        return value;
    },
    _get_slider_handle:function(){
		return this.$view.querySelector(".webix_slider_handle");
    },
    _set_inner_size:function(){
        var handle = this._get_slider_handle();
        var config = this._settings;

        //10 - padding of webix_slider_box ( 20 = 10*2 )
        //8 - width of handle / 2

	    if(handle){    //view is rendered for sure
            var width = this._get_input_width(config);

	        var value = config.value%config.step?(Math.round(config.value/config.step)*config.step):config.value;
	        value =  Math.max(Math.min(value,config.max),config.min);
            var max = config.max - config.min;
            var left = Math.ceil((width - 2 * this._sliderPadding) * (value-config.min) / max);
            var right = width - 2 * this._sliderPadding - left;

            handle.style.left = this._sliderPadding + left - this._sliderHandleWidth / 2 + "px";
            handle.parentNode.style.width = width+"px";
	        //1px border
	        right = Math.min(Math.max(right, 2 * this._sliderBorder),width - this._sliderPadding * 2 - 2 * this._sliderBorder);
	        left = Math.min(Math.max(left, 2 * this._sliderBorder),width - this._sliderPadding * 2 - 2 * this._sliderBorder);
	        //width for left and right bars
            var part = handle.previousSibling;
            part.style.width = right + "px";
            var last = part.previousSibling;
            last.style.width = left + "px";

            if (this._settings.title){
                handle.parentNode.previousSibling.innerHTML = this._settings.title(this._settings, this);
            }
        }
    },
    _set_value_now:function(){
        this._get_slider_handle().setAttribute("aria-valuenow", this._settings.value);
    },
    refresh:function(){
		var handle =  this._get_slider_handle();
		if(handle){
			this._set_value_now();
			if(this._settings.title)
				handle.setAttribute("aria-label", this._settings.label+" "+this._settings.title(this._settings, this));

			this._set_inner_size();
		}
    },
    $setValue:function(){
        this.refresh();
    },
    $getValue:function(){
        return this._settings.value;
    },
    $init:function(){
        if(webix.env.touch)
            this.attachEvent("onTouchStart" , webix.bind(this._on_mouse_down_start, this));
        else
            webix._event(this._viewobj, "mousedown", webix.bind(this._on_mouse_down_start, this));

        webix._event( this.$view, "keydown", webix.bind(this._handle_move_keyboard, this));
    },
    $skin: function(){
		this._sliderHandleWidth = webix.skin.$active.sliderHandleWidth; //8 - width of handle / 2
		this._sliderPadding = webix.skin.$active.sliderPadding;//10 - padding of webix_slider_box ( 20 = 10*2 )
		this._sliderBorder = webix.skin.$active.sliderBorder;//1px border
    },
    _handle_move_keyboard:function(e){
        var code = e.keyCode, c = this._settings, value = c.value;

        if(code>32 && code <41){

            webix.html.preventEvent(e);
           
            var trg = e.target || e.srcElement;
            var match =  /webix_slider_handle_(\d)/.exec(trg.className);
            this._activeIndex = match?parseInt(match[1],10):-1;
            if(match)
                value = c.value[this._activeIndex];
            value = value<c.min ? c.min:(value>c.max ? c.max : value);
            
            if(code === 35) value = c.min;
            else if(code === 36) value = c.max;
            else{
                var inc = (code === 37 || code ===40 || code === 34)?-1:1;
                if(code === 33 || code === 34 || c.step>1)
                    inc = inc*c.step;
                value = value*1+inc;
            }


            if(value>=c.min && value <=c.max){
                if(match){
                    var temp =[];
                    for(var i=0; i<c.value.length; i++)
                        temp[i] = i === this._activeIndex ? value : c.value[i];
                    value = temp;
                }
                this.setValue(value);
                this._activeIndex = -1;
            }
        }
    },
    _on_mouse_down_start:function(e){
        var trg = e.target || e.srcElement;
	    if(this._mouse_down_process){
		    this._mouse_down_process(e);
	    }

	    var value = this._settings.value;
	    if(webix.isArray(value))
		    value = webix.copy(value);

        if (trg.className.indexOf("webix_slider_handle")!=-1){
            this._start_value = value;
            return this._start_handle_dnd.apply(this,arguments);
        } else if (trg.className.indexOf("webix_slider") != -1){
            this._start_value = value;

            this._settings.value = this._get_value_from_event.apply(this,arguments);

            this._start_handle_dnd(e);
        }
    },
    _start_handle_dnd:function(e){
	    if(webix.env.touch){
		    this._handle_drag_events = [
			    this.attachEvent("onTouchMove" , webix.bind(this._handle_move_process, this)),
		        this.attachEvent("onTouchEnd"  , webix.bind(this._handle_move_stop, this))
		    ];
	    }
		else
	        this._handle_drag_events = [
	            webix.event(document.body, "mousemove", webix.bind(this._handle_move_process, this)),
	            webix.event(window, "mouseup", webix.bind(this._handle_move_stop, this))
	        ];
        webix.html.addCss(document.body,"webix_noselect");
    },
    _handle_move_stop:function(e){
        //detach event handlers
	    if(this._handle_drag_events){
		    if(webix.env.touch){
			    webix.detachEvent(this._handle_drag_events[0]);
			    webix.detachEvent(this._handle_drag_events[1]);
		    }
		    else{
			    webix.eventRemove(this._handle_drag_events[0]);
			    webix.eventRemove(this._handle_drag_events[1]);
		    }
		    this._handle_drag_events = [];
	    }

        webix.html.removeCss(document.body,"webix_noselect");

        var value = this._settings.value;

	    if(webix.isArray(value))
		    value = webix.copy(value);

	    this._settings.value = this._start_value;
        this.setValue(value);

        this._get_slider_handle(this._activeIndex).focus();
        this._activeIndex = -1;
    },
    _handle_move_process:function(e){
        this._settings.value = this._get_value_from_event.apply(this,arguments);
        this.refresh();
        this.callEvent("onSliderDrag", []);
    },
	_get_value_from_event:function(event,touchContext){
		// this method takes 2 arguments in case of touch env
		var pos = 0;
		if(webix.env.touch){
			pos = touchContext?touchContext.x: event.x;
		}
		else
			pos = webix.html.pos(event).x;
		return this._get_value_from_pos(pos);
	},
    _get_value_from_pos:function(pos){
        var config = this._settings;
        //10 - padding of slider box
        var max = config.max - config.min;
        var left = webix.html.offset(this._get_slider_handle().parentNode).x + this._sliderPadding;
	    var width = this._get_input_width(config) - 2 * this._sliderPadding;
	    var newvalue = (width?(pos-left) * max / width:0);
        newvalue = Math.round((newvalue+config.min)/config.step) * config.step;
        return Math.max(Math.min(newvalue, config.max), config.min);
    },
    _init_onchange:function(){} //need not ui.text logic
}, webix.ui.text);
