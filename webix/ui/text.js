define(["webix/core/webix"], function webix_text(webix){
    webix.protoUI({
	    name:"text",
	    _allowsClear:true,
	    _init_onchange:function(){
		    if (this._allowsClear){
			    //define event id to prevent memory leak
			    webix._event(this.getInputNode(),"change",this._applyChanges,{bind:this});
			    if (this._settings.suggest)
		   		    webix.$$(this._settings.suggest).linkInput(this);
		    }
	    },
	    _applyChanges: function(){
		    var newvalue = this.getValue();

		    if (newvalue != this._settings.value)
			    this.setValue(newvalue, true);
	    },
	    $skin:function(){
		    this.defaults.height = webix.skin.$active.inputHeight;
		    this.defaults.inputPadding = webix.skin.$active.inputPadding;
		    this._inputSpacing = webix.skin.$active.inputSpacing;
	    },
	    $init:function(config){
		    if (config.labelPosition == "top")
			    if (webix.isUndefined(config.height) && this.defaults.height)  // textarea
				    config.height = this.defaults.height + this._labelTopHeight;

		    //suggest reference for destructor
		    this._destroy_with_me = [];

		    this.attachEvent("onAfterRender", this._init_onchange);
		    this.attachEvent("onBlur", function(){
			    if(this._onBlur) this._onBlur();
		    });
	    },
	    $renderIcon:function(){
		    var config = this._settings;
		    if (config.icon){
			    var height = config.aheight - 2*config.inputPadding,
				    padding = (height - 18)/2 -1,
				    aria = this.addSection ? "role='button' tabindex='0' aria-label='"+(webix.i18n.aria["multitext"+(config.mode || "")+"Section"])+"'": "";
				return "<span style='height:"+(height-padding)+"px;padding-top:"+padding+"px;' class='webix_input_icon fa-"+config.icon+"' "+aria+"></span>";
			}
			return "";
	    },
	    relatedView_setter:function(value){
		    this.attachEvent("onChange", function(){
			    var value = this.getValue();
			    var mode = this._settings.relatedAction;
			    var viewid = this._settings.relatedView;
			    var view = webix.$$(viewid);
			    if (!view){
				    var top = this.getTopParentView();
				    if (top && top.$$)
					    view = top.$$(viewid);
			    }

			    webix.assert(view, "Invalid relatedView: "+viewid);

			    if (mode == "enable"){
				    if (value) view.enable(); else view.disable();
			    } else {
				    if (value) view.show(); else view.hide();
			    }
		    });
		    return value;
	    },
	    validateEvent_setter:function(value){
		    if (value == "blur")
			    this.attachEvent("onBlur", this.validate);

		    if (value == "key")
			    this.attachEvent("onTimedKeyPress", this.validate);

		    return value;
	    },
	    validate:function(){
		    var rule = this._settings.validate;
		    if (!rule && this._settings.required)
			    rule = webix.rules.isNotEmpty;

		    var form =this.getFormView();
		    var name = this._settings.name;
		    var value = this.getValue();
		    var data = {}; data[name] = value;

		    webix.assert(form, "Validation works only for fields in the form");
		    webix.assert(name, "Validation works only for fields with name");

		    if (rule && !form._validate(rule, value, data, name))
			    return false;
		    return true;
	    },
	    bottomLabel_setter: function(value){
		    if(!this._settings.bottomPadding)
			    this._settings.bottomPadding = 18;
		    return value;
	    },
	    _getInvalidText: function(){
		    var text = this._settings.invalidMessage;
		    if(typeof text == "function"){
			    text.call(this);
		    }
		    return text;
	    },
	    setBottomText: function(text, height){
		    var config = this._settings;
		    if (typeof text != "undefined"){
			    if (config.bottomLabel == text) return;
			    config.bottomLabel = text;
		    }

		    var message = (config.invalid ? config.invalidMessage : "" ) || config.bottomLabel;
		    if (!message && !config.bottomPadding)
			    config.inputHeight = 0;
		    if (message && !config.bottomPadding){
			    this._restorePadding = 1;
			    config.bottomPadding = config.bottomPadding || height || 18;	
			    this.render();
			    this.resize();
		    } else if (!message && this._restorePadding){
			    config.bottomPadding = this._restorePadding = 0;
			    //textarea
			    if (!config.height)
				    this.render();
			    this.resize();
		    } else
			    this.render();
	    },
	    $getSize: function(){
		    var sizes = webix.ui.view.prototype.$getSize.apply(this,arguments);
		    var heightInc = this.config.bottomPadding;
		    if(heightInc){
			    sizes[2] += heightInc;
			    sizes[3] += heightInc;
		    }
		    return sizes;
	    },
	    $setSize:function(x,y){
		    var config = this._settings;

		    if(webix.ui.view.prototype.$setSize.call(this,x,y)){
			    if (!x || !y) return;

			    if (config.labelPosition == "top"){
				    // textarea
				    if (!config.inputHeight)
					    this._inputHeight = this._content_height - this._labelTopHeight - (this.config.bottomPadding||0);
				    config.labelWidth = 0;
			    } else if (config.bottomPadding){
				    config.inputHeight = this._content_height - this.config.bottomPadding;
			    }
			    this.render();
		    }
	    },
	    _get_input_width: function(config){
		    var width = (this._input_width||0)-(config.label?this._settings.labelWidth:0) - this._inputSpacing - (config.iconWidth || 0);

		    //prevent js error in IE
		    return (width < 0)?0:width;
	    },
	    _render_div_block:function(obj, common){
		    var id = "x"+webix.uid();
		    var width = common._get_input_width(obj);
		    var inputAlign = obj.inputAlign || "left";
		    var icon = this.$renderIcon?this.$renderIcon(obj):"";
		    var height = this._settings.aheight - 2*webix.skin.$active.inputPadding -2*this._borderWidth;
		    var text = (obj.text||obj.value||this._get_div_placeholder(obj));
		    var html = "<div class='webix_inp_static' role='combobox' aria-label='"+webix.template.escape(obj.label)+"' tabindex='0'"+(obj.readonly?" aria-readonly='true'":"")+(obj.invalid?"aria-invalid='true'":"")+" onclick='' style='line-height:"+height+"px;width: " + width + "px; text-align: " + inputAlign + ";' >"+ text +"</div>";
		    return common.$renderInput(obj, html, id);
	    },
	    _baseInputHTML:function(tag){
		    var html = "<"+tag+(this._settings.placeholder?" placeholder='"+this._settings.placeholder+"' ":" ");
		    if (this._settings.readonly)
			    html += "readonly='true' aria-readonly=''";
		    if(this._settings.required)
			    html += "aria-required='true'";
		    if(this._settings.invalid)
			    html += "aria-invalid='true'";

		    var attrs = this._settings.attributes;
		    if (attrs)
			    for(var prop in attrs)
				    html += prop+"='"+attrs[prop]+"' ";
		    return html;
	    },
	    $renderLabel: function(config, id){
		    var labelAlign = (config.labelAlign||"left");
		    var top = this._settings.labelPosition == "top";
		    var labelTop =  top?"display:block;":("width: " + this._settings.labelWidth + "px;");
		    var label = "";
		    var labelHeight = top?this._labelTopHeight-2*this._borderWidth:( this._settings.aheight - 2*this._settings.inputPadding);
		    if (config.label)
			    label = "<label style='"+labelTop+"text-align: " + labelAlign + ";line-height:"+labelHeight+"px;' onclick='' for='"+id+"' class='webix_inp_"+(top?"top_":"")+"label "+(config.required?"webix_required":"")+"'>" + (config.label||"") + "</label>";
		    return label;
	    },
	    $renderInput: function(config, div_start, id) {
		    var inputAlign = (config.inputAlign||"left");
		    var top = (config.labelPosition == "top");
		    var inputWidth = this._get_input_width(config);

		    id = id||webix.uid();

		    var label = this.$renderLabel(config,id);

		    var html = "";
		    if(div_start){
			    html += div_start;
		    } else {
			    var value =  webix.template.escape(config.text || this._pattern(config.value)|| ( config.value ===0 ?"0":"") );
			    html += this._baseInputHTML("input")+"id='" + id + "' type='"+(config.type||this.name)+"'"+(config.editable?" role='combobox'":"")+" value='" + value + "' style='width: " + inputWidth + "px; text-align: " + inputAlign + ";'";
			    var attrs = config.attributes;
			    if (attrs)
				    for(var prop in attrs)
					    html += " "+prop+"='"+attrs[prop]+"'";
			    html += " />";
		    }
		    var icon = this.$renderIcon?this.$renderIcon(config):"";
		    html += icon;

		    var result = "";
		    //label position, top or left
		    if (top)
			    result = label+"<div class='webix_el_box' style='width:"+config.awidth+"px; height:"+config.aheight+"px'>"+html+"</div>";
		    else
			    result = "<div class='webix_el_box' style='width:"+config.awidth+"px; height:"+config.aheight+"px'>"+label+html+"</div>";


		    //bottom message width
		    var padding = config.awidth-inputWidth-webix.skin.$active.inputPadding*2;
		    //bottom message text
		    var message = (config.invalid ? config.invalidMessage : "") || config.bottomLabel;
		    if (message)
			    result +=  "<div class='webix_inp_bottom_label'"+(config.invalid?"role='alert' aria-relevant='all'":"")+" style='width:"+(inputWidth||config.awidth)+"px;margin-left:"+Math.max(padding,webix.skin.$active.inputPadding)+"px;'>"+message+"</div>";

		    return result;
	    },
	    defaults:{
		    template:function(obj, common){
			    return common.$renderInput(obj);
		    },
		    label:"",
		    labelWidth:80
	    },
	    type_setter:function(value){ return value; },
	    _set_inner_size:false,
	    $setValue:function(value){
		    this.getInputNode().value = this._pattern(value);
	    },
	    $getValue:function(){
		    return this._pattern(this.getInputNode().value, false);
	    },
	    suggest_setter:function(value){
		    if (value){
			    webix.assert(value !== true, "suggest options can't be set as true, data need to be provided instead");

			    if (typeof value == "string"){
				    var attempt = webix.$$(value);
				    if (attempt) 
					    return webix.$$(value)._settings.id;

				    value = { body: { url:value , dataFeed :value } };
			    } else if (webix.isArray(value))
				    value = { body: { data: this._check_options(value) } };
			    else if (!value.body)
				    value.body = {};

			    webix.extend(value, { view:"suggest" });

			    var view = webix.ui(value);
			    this._destroy_with_me.push(view);
			    return view._settings.id;
		    }
		    return false;
	    }
    }, webix.ui.button);
        (function(){

	    var controls = {};
	    for(var i in webix.UIManager._controls){
		    controls[webix.UIManager._controls[i]] = i;
	    }
	    var nav_controls = {
		    9:'tab',
		    38:'up',
		    40:'down',
		    37:'left',
		    39:'right'
	    };

	    webix.patterns = {
		    phone:{ mask:"+# (###) ###-####", allow:/[0-9]/g },
		    card: { mask:"#### #### #### ####", allow:/[0-9]/g },
		    date: { mask:"####-##-## ##:##", allow:/[0-9]/g }
	    };

	    webix.extend(webix.ui.text, {
		    $init:function(config){
			    if(config.pattern){
				    this.attachEvent("onKeyPress", function(code, e){
					    if(e.ctrlKey || e.altKey)
						    return;

					    if(code>105 && code<112) //numpad operators
						    code -=64;

					    if(controls[code] && code !== 8 && code !==46){  //del && bsp
						    if(!nav_controls[code])
							    webix.html.preventEvent(e);
						    return;
					    }

					    webix.html.preventEvent(e);
					    this._on_key_pressed(e, code);
				    });

				    this.attachEvent("onAfterRender", this._after_render);
				    this.getText = function(){ return this.getInputNode().value; };
				    this._pattern = function(value, mode){
					    if (mode === false)
						    return this._getRawValue(value);
					    else
						    return this._matchPattern(value);
				    };
				    config.invalidMessage = config.invalidMessage || webix.i18n.controls.invalidMessage;
			    }
		    },
		    pattern_setter:function(value){
			    var pattern = webix.patterns[value] || value;
			    
			    if(typeof pattern =="string") pattern = { mask: pattern };
			    pattern.allow =  pattern.allow || /[A-Za-z0-9]/g;
			    
			    this._patternScheme(pattern);
			    return pattern;
		    },
		    _init_validation:function(){
			    this.config.validate = this.config.validate || webix.bind(function(){
				    var value = this.getText();
				    var raw = value.replace(this._pattern_chars, "");
				    var matches = (value.toString().match(this._pattern_allows) || []).join("");
				    return (matches.length == raw.length && value.length == this._settings.pattern.mask.length);
			    }, this);
		    },
		    _after_render:function(){
			    var ev =  webix.env.isIE8?"propertychange":"input";
			    
			    webix._event(this.getInputNode(), ev, function(e){
				    var stamp =  (new Date()).valueOf();
				    var width = this.$view.offsetWidth; //dark ie8 magic
				    if(!this._property_stamp || stamp-this._property_stamp>100){
					    this._property_stamp = stamp;
					    this.$setValue(this.getText());
				    }
			    }, {bind:this});

			    webix._event(this.getInputNode(), "blur", function(e){
				    this._applyChanges();
			    }, {bind:this});
		    },
		    _patternScheme:function(pattern){
			    var mask = pattern.mask, scheme = {}, chars = "", count = 0;
			    
			    for(var i = 0; i<mask.length; i++){
				    if(mask[i] === "#"){
					    scheme[i] = count; count++;
				    }
				    else{
					    scheme[i] = false;
					    if(chars.indexOf(mask[i]) === -1) chars+="\\"+mask[i];
				    }
			    }
			    this._pattern_allows = pattern.allow;
			    this._pattern_chars = new RegExp("["+chars+"]", "g");
			    this._pattern_scheme = scheme;

			    this._init_validation();
		    },
		    _on_key_pressed:function(e, code){
			    var node = this.getInputNode();
			    var value = node.value;
			    var pos = webix.html.getSelectionRange(node);
			    var chr = "";

			    if(code == 8 || code == 46){
				    if(pos.start == pos.end){
					    if(code == 8) pos.start--;
					    else pos.end++;
				    }
			    }
			    else{
				    chr = String.fromCharCode(code);
				    if(!e.shiftKey) chr = chr.toLowerCase();
			    }

			    value = value.substr(0, pos.start) + chr +value.substr(pos.end);
			    pos = this._getCaretPos(chr, value.length, pos.start, code);

			    this._input_code = code;
			    this.$setValue(value);

			    webix.html.setSelectionRange(node, pos);
		    },
		    _getCaretPos:function(chr, len, pos, code){
			    if((chr && chr.match(this._pattern_allows)) || (code ==8 || code ==46)){
				    pos = chr ? pos+1 : pos;
				    pos = this._fixCaretPos(pos, code);
			    }
			    else if(len-1 == pos && code !==8 && code !==46){
				    var rest = this._settings.pattern.mask.indexOf("#", pos);
				    if(rest>0) pos += rest;
			    }
			    return pos;
		    },
		    _fixCaretPos:function(pos, code){
			    var prev = pos-(code !== 46)*1;

			    if(this._pattern_scheme[prev] === false){
				    pos = pos+(code ==8 ? -1: 1);
				    return this._fixCaretPos(pos, code);
			    }
			    if(this._pattern_scheme[pos] === false && code !==8)
				    return this._fixCaretPos(pos+1, code)-1;
			    return pos;
		    },
		    _getRawValue:function(value){
			    value = value || "";
			    var matches = value.toString().match(this._pattern_allows) || [];
			    return matches.join("").replace(this._pattern_chars, "");
		    },
		    _matchPattern:function(value){
			    var raw = this._getRawValue(value),
				    pattern = this._settings.pattern.mask,
				    mask = this._settings.pattern.mask,
				    scheme = this._pattern_scheme,
				    end = false,
				    index = 0,
				    rawIndex = 0,
				    rawLength = 0;

			    for(var i in scheme){
				    if(scheme[i]!==false){
					    if(!end){
						    index = i*1;
						    rawIndex = scheme[i];
						    var rchar = raw[rawIndex]||"";
						    var next = raw[rawIndex+1];

						    pattern = (rchar?pattern.substr(0, index):"") + rchar +(rchar && next?pattern.substr(index + 1):"");
						    if(!next) end = true;
					    }
					    rawLength++;
				    }
			    }

			    //finalize value with subsequent mask chars 
			    var icode = this._input_code;
			    if((icode && icode !== 8) || (!icode && rawLength-1 === rawIndex && pattern.length < mask.length)){
				    if(raw){
					    var nind = index+1;
					    if(mask.charAt(nind)!=="#" && pattern.length < mask.length){
						    var lind = mask.indexOf("#", nind);
						    if(lind<0) lind = mask.length;
						    pattern += mask.substr(nind, lind-nind);
					    }
				    }
				    else if(icode !==46){
					    pattern += mask.substr(0, mask.indexOf("#"));
				    }
			    }
			    this._input_code = null;
			    return pattern;
		    }
	    });

    })();

return webix;
});
