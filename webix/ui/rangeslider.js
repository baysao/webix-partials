

webix.protoUI({
	name:"rangeslider",
	$cssName:"slider webix_rangeslider",
	defaults:{
		separator: ",",
		value: "20,80",
		template:function(obj, common){
			var id = "x" + webix.uid();
			common._handle_id = [id+"_0",id+"_1"];

			var aria = "role='slider' aria-label='"+obj.label+(obj.title?(" "+obj.title(obj)):"")+"' aria-valuemax='"+obj.max+"' aria-valuemin='"+obj.min+"' tabindex='0'";
			var handles = "<div class='webix_slider_handle webix_slider_handle_0' id='"+common._handle_id[0]+"' "+aria+" aria-valuenow='"+obj.value[0]+"'>&nbsp;</div>";
			handles += "<div class='webix_slider_handle webix_slider_handle_1' id='"+common._handle_id[1]+"' "+aria+" aria-valuenow='"+obj.value[1]+"'>&nbsp;</div>";
			var html = "<div class='webix_slider_title'></div><div class='webix_slider_box'><div class='webix_slider_right'>&nbsp;</div><div class='webix_slider_left'></div>"+handles+"</div>";
			return common.$renderInput(obj, html, id);
		}
	},
	value_setter: function(value){

		if(!webix.isArray(value)){
			value = value.toString().split(this._settings.separator);
		}
		if(value.length <2)
			value[1] = value[0];
		value[0] = parseFloat(value[0]);
		value[1] = parseFloat(value[1]);
		return value;
	},
	_get_slider_handle:function(index){
		index = index && index>=0?index:0;
		return this.$view.querySelector(".webix_slider_handle_"+(index||0));
	},
	_get_left_pos: function(width,index){
		var config, max, value;

		config = this._settings;
		max = config.max - config.min;
		value = config.value[index]%config.step?(Math.round(config.value[index]/config.step)*config.step):config.value[index];
		value =  Math.max(Math.min(value,config.max),config.min);
		return Math.ceil((width - 20) * (value-config.min) / max);
	},
	_set_inner_size:function(){
		var config, handle0,  handle1,
			left0, left1, parentBox, width;

		handle0 =this._get_slider_handle(0);
		handle1 = this._get_slider_handle(1);
		config = this._settings;

		if(!webix.isArray(config.value)){
			this.define("value",config.value);
		}
		//10 - padding of webix_slider_box ( 20 = 10*2 )
		//8 - width of handle / 2

		if (handle0){

			width = this._get_input_width(config);

			parentBox = handle0.parentNode;
			parentBox.style.width =  width+"px";

			left0 = this._get_left_pos(width, 0);
			left1 = this._get_left_pos(width, 1);

			handle0.style.left = 10 + left0 - 8 + "px";
			handle1.style.left = 10 + left1 - 8 + "px";

			parentBox.firstChild.style.width = width - 22+ "px";

			parentBox.childNodes[1].style.width = left1 - left0 + "px";
			parentBox.childNodes[1].style.left = left0+12 + "px";


			if (this._settings.title){
				handle0.parentNode.previousSibling.innerHTML = this._settings.title(this._settings, this);
			}
		}
	},
	_set_value_now:function(){
		for(var i=0; i<2; i++){
			this._get_slider_handle(i).setAttribute("aria-valuenow", this._settings.value[i]);
		}
    },
	_mouse_down_process: function(e){
		var trg = e.target || e.srcElement;
		var match =  /webix_slider_handle_(\d)/.exec(trg.className);
		this._activeIndex = match?parseInt(match[1],10):-1;

		if(match)
			this._set_handle_active(this._activeIndex);
	},
	setValue:function(value){
		var oldvalue = this._settings.value;

		var temp = (typeof value == "object"?value.join(this._settings.separator):value);

		if (oldvalue.join(this._settings.separator) == temp) return false;

		this._settings.value = value;
		if (this._rendered_input)
			this.$setValue(value);

		this.callEvent("onChange", [value, oldvalue]);
	},
	$getValue:function(){
		var value = this._settings.value;
		return this._settings.stringResult?value.join(this._settings.separator):value;
	},
	_set_handle_active: function(index){
		var hActive = this._get_slider_handle(index);
		var h = this._get_slider_handle(1-index);
		if(hActive.className.indexOf("webix_slider_active") == -1)
			hActive.className += " webix_slider_active";
		h.className = h.className.replace(" webix_slider_active","");
	},
	_get_value_from_pos:function(pos){
		var config = this._settings;
		var value = config.value;
		//10 - padding of slider box
		var max = config.max - config.min;

		var left = webix.html.offset(this._get_slider_handle().parentNode).x;
		var newvalue = Math.ceil((pos-left) * max / this._get_input_width(config));
		newvalue = Math.round((newvalue+config.min)/config.step) * config.step;

		var index = null;

		var pos0 = webix.html.offset(this._get_slider_handle(0)).x;
		var pos1 = webix.html.offset(this._get_slider_handle(1)).x;

		if(pos0==pos1 && (config.value[0] == config.min || config.value[0] == config.max) ){
			index = (config.value[0] == config.min?1:0);
			this._set_handle_active(index);
		}
		else{
			if(this._activeIndex >=0){
				index = this._activeIndex;
			}else{
				if(pos0==pos1){
					index = (pos < pos0?0:1);
				}
				else{
					var dist0 = Math.abs(pos0-pos);
					var dist1 = Math.abs(pos1-pos);
					index = dist0<dist1?0:1;
					this._activeIndex = index;
				}
			}
		}


		if(index){
			value[index] = Math.max(Math.min(newvalue, config.max), value[0]);
		}
		else{
			value[index] = Math.max(Math.min(newvalue, value[1]), config.min);
		}

		return value;
	}
}, webix.ui.slider);
