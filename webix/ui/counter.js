
    webix.protoUI({
	    name:"counter",
	    defaults:{
		    template:function(config, common){
			    var value = (config.value||0);

			    var id = "x"+webix.uid();
			    var html = "<div role='spinbutton' aria-label='"+webix.template.escape(config.label)+"' aria-valuemin='"+config.min+"' aria-valuemax='"+config.max+"' aria-valuenow='"+config.value+"' class='webix_el_group' style='width:"+common._get_input_width(config)+"px'>";
				html +=  "<button type='button' class='webix_inp_counter_prev' tabindex='-1' aria-label='"+webix.i18n.aria.decreaseValue+"'>-</button>";
				html += common._baseInputHTML("input")+" id='"+id+"' type='text' class='webix_inp_counter_value' aria-live='assertive'"+" value='"+value+"'></input>";
				html += "<button type='button' class='webix_inp_counter_next' tabindex='-1' aria-label='"+webix.i18n.aria.increaseValue+"'>+</button></div>";
			    return common.$renderInput(config, html, id);
		    },
		    min:0,
		    max:Infinity,
		    step:1
	    },
	    $init:function(){
		    webix._event(this.$view, "keydown", this._keyshift, {bind:this});
	    },
	    _keyshift:function(e){
		    var code = e.which || e.keyCode, c = this._settings, value = c.value || c.min;

		    if(code>32 && code <41){
			    if(code === 35) value = c.min;
			    else if(code === 36) value = c.max === Infinity? 1000000 :c.max;
			    else if(code === 33) this.next();
			    else if(code === 34) this.prev();
			    else value = value+(code === 37 || code ===40?-1:1);
			    
			    if(code>34 && value>=c.min && value <=c.max)
				    this.setValue(value);
		    }
	    },
	    $setValue:function(value){
		    this.getInputNode().value = value;
	    },
	    getInputNode:function(){
		    return this._dataobj.getElementsByTagName("input")[0];
	    },
	    getValue:function(obj){
		    return  webix.ui.button.prototype.getValue.apply(this,arguments)*1;
	    },
	    next:function(step){
		    step = this._settings.step;
		    this.shift(step);
	    },
	    prev:function(step){
		    step = (-1)*this._settings.step;
		    this.shift(step);
	    },
	    shift:function(step){
		    var min = this._settings.min;
		    var max = this._settings.max;

		    var new_value = this.getValue() + step;
		    if (new_value >= min && new_value <= max)
			    this.setValue(new_value);
	    }
    }, webix.ui.text);
