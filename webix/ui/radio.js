
    webix.protoUI({
	    name:"radio",
	    defaults:{
		    template: function(config,common) {
			    var options = common._check_options(config.options);
			    var html = [];
			    var id;

			    for (var i=0; i < options.length; i++) {
				    var eachid = "x"+webix.uid();
				    id = id || eachid;

				    if  (i && (options[i].newline || config.vertical))
					    html.push("<div class='webix_line_break'></div>");
				    var isChecked = (options[i].id == config.value);
				    var label = options[i].value || "";
				    
				    var customRadio = config.customRadio|| "";
				    if(customRadio){
					    var optlabel = (i === 0 ? config.label+" " : "")+label;
					    customRadio = customRadio.replace(/(aria-label=')\w*(?=')/, "$1"+webix.template.escape(optlabel));
					    customRadio = customRadio.replace(/(aria-checked=')\w*(?=')/, "$1"+(isChecked?"true":"false"));
					    customRadio = customRadio.replace(/(tabindex=')\w*(?=')/, "$1"+(isChecked || (i === 0 && !config.value)?"0":"-1"));
					    customRadio = customRadio.replace(/(aria-invalid=')\w*(?=')/, "$1"+(config.invalid?"true":"false"));
				    }
				    var rd = common._baseInputHTML("input")+" name='"+(config.name || config.id)+"' type='radio' "+(isChecked?"checked='1'":"")+"tabindex="+(isChecked || (i === 0 && !config.value)?"0":"-1")+" value='"+options[i].id+"' id='"+eachid+"' style='"+(customRadio?"display:none":"")+"' />";
				    var input = "<div radio_id='"+options[i].id+"' class='webix_inp_radio_border webix_radio_"+(isChecked?"1":"0")+"' role='presentation'>"+rd+customRadio+"</div>";
				    if (label)
					    label = "<label for='"+eachid+"' class='webix_label_right'>" + label + "</label>";

				    html.push("<div class='webix_radio_option' role='presentation'>"+input + label+"</div>");
				    
			    }
			    html = "<div class='webix_el_group' role='radiogroup' style='margin-left:"+(config.label?config.labelWidth:0)+"px;'>"+html.join("")+"</div>";
			    
			    return common.$renderInput(config, html, id);
		    }
	    },
	    refresh:function(){
		    this.render();
		    if (this._last_size && this.$getSize(0,0)[2] != this._last_size[1])
			    this.resize();
	    },
	    $getSize:function(dx, dy){
		    var size = webix.ui.button.prototype.$getSize.call(this, dx, dy);
		    if (this._settings.options){
			    var count = this._settings.vertical?0:1;
			    for (var i=0; i < this._settings.options.length; i++)
				    if (this._settings.vertical || this._settings.options[i].newline)
					    count++;
			    size[3] = size[2] = Math.max(size[2], (this._settings.optionHeight||25) * count+this._settings.inputPadding*2+ (this._settings.labelPosition == "top"?this._labelTopHeight:0));
		    }
		    var heightInc = this.config.bottomPadding;
		    if(heightInc){
			    size[2] += heightInc;
			    size[3] += heightInc;
		    }
		    return size;
	    },
	    _getInputNode: function(){
		    return this._dataobj.getElementsByTagName('input');
	    },
	    $setValue:function(value){
		    var inp = this._getInputNode();

		    for (var i=0; i < inp.length; i++){
			    if (inp[i].parentNode.getAttribute("radio_id")==value){
				    inp[i].className = "webix_inp_radio_on";	
				    inp[i].checked = true;
				    inp[i].setAttribute("tabindex","0");
			    } else{
				    inp[i].className = "webix_inp_radio_on webix_hidden";
				    inp[i].checked = false;
				    inp[i].setAttribute("tabindex","-1");
			    }
			    var parentNode = inp[i]?inp[i].parentNode:null;

			    if(parentNode){
				    parentNode.className = parentNode.className.replace(/(webix_radio_)\d/,"$1"+(inp[i].checked?1:0));
				    if(this._settings.customRadio){
					    var button = parentNode.getElementsByTagName("BUTTON");
					    if(button[0]){
						    button[0].setAttribute("aria-checked", inp[i].checked?"true":"false");
						    button[0].setAttribute("tabindex", inp[i].checked?"0":"-1");
					    }
				    }
			    }
		    }
	    },
	    getValue:function(obj){
		    return this._settings.value;
	    },
	    focus: function(){ this._focus(); },
	    blur: function(){ this._blur(); },
	    customRadio_setter: function(value){
		    if(value === true && webix.skin.$active.customRadio)
			    value = "<a role='presentation' onclick='javascript:void(0)'><button type='button' class='webix_custom_radio' role='radio' aria-checked='false' aria-label='' aria-invalid='' tabindex=''></button></a>";
		    return value;
	    },
	    $skin:function(){
		    if(webix.skin.$active.customRadio)
			    this.defaults.customRadio = true;
		    if(webix.skin.$active.optionHeight)
			    this.defaults.optionHeight = webix.skin.$active.optionHeight;
	    }
    }, webix.HTMLOptions, webix.ui.text);
