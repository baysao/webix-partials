webix.protoUI({
	name:"chart",
	$init:function(config){
		this._series = [this._settings];
		this._legend_labels = [];
		this._contentobj.className += " webix_chart";
		this.$ready.push(this._after_init_call);
		/*preset*/
		if(config.preset){
			this._definePreset(config);
		}

		// move series to end of configuration properties hash
		// so it will be parsed after other settings
		if(config.series){
			var series = config.series;
			delete config.series;
			config.series = series;
		}

		this.attachEvent("onMouseMove",this._switchSeries);

		this.data.provideApi(this, true);
	},
	_after_init_call:function(){
		this.data.attachEvent("onStoreUpdated",webix.bind(function(){
			this.render.apply(this,arguments);
		},this));
	},
	defaults:{
		ariaLabel:"chart",
        color:"default",
		alpha:"1",
		label:false,
		value:"{obj.value}",
		padding:{},
		type:"pie",
		lineColor:"#ffffff",
		cant:0.5,
		barWidth: 30,
		line:{
            width:2,
			color:"#1293f8"
        },
		item:{
			radius:3,
			borderColor:"#636363",
            borderWidth:1,
            color: "#ffffff",
            alpha:1,
            type:"r",
            shadow:false
		},
		shadow:true,
		gradient:false,
		border:true,
		labelOffset: 20,
		origin:"auto",
		scale: "linear"
    },
	_id:"webix_area_id",
	on_click:{
		webix_chart_legend_item: function(e,id,obj){
			var series = obj.getAttribute("series_id");
			if(this.callEvent("onLegendClick",[e,series,obj])){
				var config = this._settings;
				var values = config.legend.values;
				var toggle = (values&&values[series].toggle)||config.legend.toggle;
				if((typeof series != "undefined")&&this._series.length>1){
					// hide action
					if(toggle){
						if(obj.className.indexOf("hidden")!=-1){
							this.showSeries(series);
						}
						else{
							this.hideSeries(series);
						}
					}
				}
			}
		}
	},
	on_dblclick:{
	},
	on_mouse_move:{
	},
	locate: function(e){
		return webix.html.locate(e,this._id);
	},
	$setSize:function(x,y){
		var res = webix.ui.view.prototype.$setSize.call(this,x,y);
		if(res){
			for(var c in this.canvases){
				this.canvases[c]._resizeCanvas(this._content_width, this._content_height);
			}
			this.render();
		}
		return res;
	},
	type_setter:function(val){
		webix.assert(this["$render_"+val], "Chart type is not supported, or extension is not loaded: "+val);
		
		if (typeof this._settings.offset == "undefined"){
			this._settings.offset = !(val.toLowerCase().indexOf("area")!=-1);
		}

        if(val=="radar"&&!this._settings.yAxis)
		    this.define("yAxis",{});
        if(val=="scatter"){
            if(!this._settings.yAxis)
                this.define("yAxis",{});
            if(!this._settings.xAxis)
                this.define("xAxis",{});
        }
			
			
		return val;
	},
	destructor: function(){
		this.removeAllSeries();
		webix.Destruction.destructor.apply(this,arguments);
	},
	removeAllSeries: function(){
		this.clearCanvas();
		if(this._legendObj){
			this._legendObj.innerHTML = "";
			this._legendObj.parentNode.removeChild(this._legendObj);
			this._legendObj = null;
		}
		if(this.canvases){
			this.canvases = {};
		}
		this._contentobj.innerHTML="";
		for(var i = 0; i < this._series.length; i++){
			if(this._series[i].tooltip)
				this._series[i].tooltip.destructor();
		}
	//	this.callEvent("onDestruct",[]);
		this._series = [];
	},
	clearCanvas:function(){
		if(this.canvases&&typeof this.canvases == "object")
			for(var c in this.canvases){
				this.canvases[c].clearCanvas();
			}
	},
	render:function(id,data, type){
		var bounds, i, data, map, temp;
		if (!this.isVisible(this._settings.id))
			return;

		data = this._getChartData();

		if (!this.callEvent("onBeforeRender",[data, type]))
			return;
		if(this.canvases&&typeof this.canvases == "object"){
			for(i in this.canvases){
				this.canvases[i].clearCanvas();
			}
		}
		else
			this.canvases = {};
		
		if(this._settings.legend){
			if(!this.canvases["legend"])
				this.canvases["legend"] =  this._createCanvas("legend");
			this._drawLegend(
				this.data.getRange(),
				this._content_width,
				this._content_height
			);
		}

		this._map = map = new webix.HtmlMap(this._id);
		temp = this._settings;

		bounds =this._getChartBounds(this._content_width,this._content_height);

		if(this._series){
			for(i=0; i < this._series.length;i++){
				this._settings = this._series[i];
				if(!this.canvases[i])
					this.canvases[i] = this._createCanvas(this._settings.ariaLabel+" "+i,"z-index:"+(2+i),null,i);
				this["$render_"+this._settings.type](
					this.canvases[i].getCanvas(),
					data,
					bounds.start,
					bounds.end,
					i,
					map
				);
			}
		}
		
		map.render(this._contentobj);
		this._contentobj.lastChild.style.zIndex = 100;
		this._applyBounds(this._contentobj.lastChild,bounds);
		this.callEvent("onAfterRender",[data]);
		this._settings = temp;
	},
	_applyBounds: function(elem,bounds){
		var style = {};
		style.left = bounds.start.x;
		style.top = bounds.start.y;
		style.width = bounds.end.x-bounds.start.x;
		style.height = bounds.end.y - bounds.start.y;
		for(var prop in style){
			elem.style[prop] = style[prop]+"px";
		}
	},
	_getChartData: function(){
		var axis, axisConfig ,config, data, i, newData,
			start, units, value, valuesHash;
		data = this.data.getRange();
		axis = (this._settings.type.toLowerCase().indexOf("barh")!=-1?"yAxis":"xAxis");
		axisConfig = this._settings[axis];
		if(axisConfig&&axisConfig.units&&(typeof axisConfig.units == "object")){
			config = axisConfig.units;
			units = [];
			if(typeof config.start != "undefined"&&typeof config.end != "undefined" && typeof config.next != "undefined"){
				start = config.start;
				while(start<=config.end){
					units.push(start);
					start = config.next.call(this,start);
				}
			}
			else if(Object.prototype.toString.call(config) === '[object Array]'){
				units = config;
			}
			newData = [];
			if(units.length){
				value = axisConfig.value;
				valuesHash = {};
				for(i=0;i < data.length;i++){
					valuesHash[value(data[i])] = i;
				}
				for(i=0;i< units.length;i++){
					if(typeof valuesHash[units[i]]!= "undefined"){
						data[valuesHash[units[i]]].$unit = units[i];
						newData.push(data[valuesHash[units[i]]]);
					}
					else{
						newData.push({$unit:units[i]});
					}
				}
			}
			return newData;
		}
		return data;
	},
	series_setter:function(config){
		if(typeof config!="object"){
			webix.assert(config,"Chart :: Series must be an array or object");	
		}
		else{

			this._parseSettings(!config.length?config:config[0]);
			this._series = [this._settings];


			for(var i=1;i< config.length;i++)
				this.addSeries(config[i]);
		}
		return config;
	},
	value_setter:webix.template,
    xValue_setter:webix.template,
    yValue_setter:function(config){
        this.define("value",config);
    },
	alpha_setter:webix.template,
	label_setter:webix.template,
	lineColor_setter:webix.template,
	borderColor_setter:webix.template,
	pieInnerText_setter:webix.template,
	gradient_setter:function(config){
		if((typeof(config)!="function")&&config&&(config === true))
			config = "light";
		return config;
	},
	colormap:{
		"RAINBOW":function(obj){
            var pos = Math.floor(this.getIndexById(obj.id)/this.count()*1536);
			if (pos==1536) pos-=1;
			return this._rainbow[Math.floor(pos/256)](pos%256);
		},

		"default": function(obj){
			var count = this.count();
			var colorsCount = this._defColors.length;
			var i = this.getIndexById(obj.id);
			if(colorsCount > count){
				if(i){
					if(i < colorsCount - count)
						i = this._defColorsCursor +2;
					else
						i = this._defColorsCursor+1;
				}
				this._defColorsCursor = i;
			}
			else
				i = i%colorsCount;
			return this._defColors[i];
		}
	},
	color_setter:function(value){
		return this.colormap[value]||webix.template( value);
	},
    fill_setter:function(value){
        return ((!value||value=="0")?false:webix.template( value));
    },
    _definePreset:function(obj){
        this.define("preset",obj.preset);
        delete obj.preset;
    },
	preset_setter:function(value){
        var a, b, preset;
        this.defaults = webix.extend({},this.defaults);
        preset =  this.presets[value];

        if(typeof preset == "object"){

            for(a in preset){

                if(typeof preset[a]=="object"){
                    if(!this.defaults[a]||typeof this.defaults[a]!="object"){
                         this.defaults[a] = webix.extend({},preset[a]);
                    }
                    else{
                        this.defaults[a] = webix.extend({},this.defaults[a]);
                        for(b in preset[a]){
                            this.defaults[a][b] = preset[a][b];
                        }
                    }
                }else{
                     this.defaults[a] = preset[a];
                }
            }
            return value;
        }
		return false;
	},
	legend_setter:function( config){
		if(!config){
			if(this._legendObj){
				this._legendObj.innerHTML = "";
				this._legendObj = null;
			}
			return false;
		}
		if(typeof(config)!="object")	//allow to use template string instead of object
			config={template:config};

		this._mergeSettings(config,{
			width:150,
			height:18,
			layout:"y",
			align:"left",
			valign:"bottom",
			template:"",
			toggle:(this._settings.type.toLowerCase().indexOf("stacked")!=-1?"":"hide"),
			marker:{
				type:"square",
				width:15,
				height:15,
                radius:3
			},
            margin: 4,
            padding: 3
		});

		config.template = webix.template(config.template);
		return config;
	},
	item_setter:function( config){
		if(typeof(config)!="object")
			config={color:config, borderColor:config};
        this._mergeSettings(config,webix.extend({},this.defaults.item));
		var settings = ["alpha","borderColor","color","radius"];
		this._converToTemplate(settings,config);
		return config;
	},
	line_setter:function( config){
		if(typeof(config)!="object")
			config={color:config};

        config = webix.extend(config,this.defaults.line);
		config.color = webix.template(config.color);
		return config;
	},
	padding_setter:function( config){
		if(typeof(config)!="object")
			config={left:config, right:config, top:config, bottom:config};
		this._mergeSettings(config,{
			left:50,
			right:20,
			top:35,
			bottom:40
		});
		return config;
	},
	xAxis_setter:function( config){
		if(!config) return false;
		if(typeof(config)!="object")
			config={ template:config };

		this._mergeSettings(config,{
			title:"",
			color:"#000000",
			lineColor:"#cfcfcf",
			template:"{obj}",
			lines:true
		});
		var templates = ["lineColor","template","lines"];
        this._converToTemplate(templates,config);
		this._configXAxis = webix.extend({},config);
		return config;
	},
    yAxis_setter:function( config){
	    this._mergeSettings(config,{
			title:"",
			color:"#000000",
			lineColor:"#cfcfcf",
			template:"{obj}",
			lines:true,
            bg:"#ffffff"
		});
		var templates = ["lineColor","template","lines","bg"];
        this._converToTemplate(templates,config);
		this._configYAxis = webix.extend({},config);
		return config;
	},
    _converToTemplate:function(arr,config){
        for(var i=0;i< arr.length;i++){
            config[arr[i]] = webix.template(config[arr[i]]);
        }
    },
	_createCanvas: function(name,style,container, index){
		var params = {container:(container||this._contentobj),name:name, series: index, style:(style||""), width: this._content_width, height:this._content_height };
		return new webix.Canvas(params);
	},
    _drawScales:function(data,point0,point1,start,end,cellWidth){
	    var ctx, y = 0;
	    if(this._settings.yAxis){
		    if(!this.canvases["y"])
		        this.canvases["y"] =  this._createCanvas("axis_y");

		    y = this._drawYAxis(this.canvases["y"].getCanvas(),data,point0,point1,start,end);
	    }
		if (this._settings.xAxis){
			if (!this.canvases["x"])
				this.canvases["x"] = this._createCanvas("axis_x");
			ctx = this.canvases["x"].getCanvas();
			if(this.callEvent("onBeforeXAxis",[ctx,data,point0,point1,cellWidth,y]))
				this._drawXAxis(ctx, data, point0, point1, cellWidth, y);
		}
	    return y;
	},
	_drawXAxis:function(ctx,data,point0,point1,cellWidth,y){
		var i, unitPos,
			config = this._settings,
			x0 = point0.x-0.5,
			y0 = parseInt((y?y:point1.y),10)+0.5,
			x1 = point1.x,
			center = true,
			labelY = config.type == "stackedBar"?(point1.y+0.5):y0;

		for(i=0; i < data.length;i++){
			if(config.offset === true)
				unitPos = x0+cellWidth/2+i*cellWidth;
			else{
				unitPos = (i==data.length-1 && !config.cellWidth)?point1.x:x0+i*cellWidth;
				center = !!i;
			}
			unitPos = Math.ceil(unitPos)-0.5;
			/*scale labels*/
			var top = ((config.origin!="auto")&&(config.type=="bar")&&(parseFloat(config.value(data[i]))<config.origin));
			this._drawXAxisLabel(unitPos,labelY,data[i],center,top);
			/*draws a vertical line for the horizontal scale*/
			if((config.offset||i||config.cellWidth)&&config.xAxis.lines.call(this,data[i]))
				this._drawXAxisLine(ctx,unitPos,point1.y,point0.y,data[i]);
		}

		this.canvases["x"].renderTextAt(true, false, x0, point1.y + config.padding.bottom-3,
			config.xAxis.title,
			"webix_axis_title_x",
			point1.x - point0.x
		);
		this._drawLine(ctx,x0,y0,x1,y0,config.xAxis.color,1);
		/*the right border in lines in scale are enabled*/
		if (!config.xAxis.lines.call(this,{}) || !config.offset) return;
		this._drawLine(ctx,x1+0.5,point1.y,x1+0.5,point0.y+0.5,config.xAxis.color,0.2);
	},
	_drawYAxis:function(ctx,data,point0,point1,start,end){
		var step;
		var scaleParam= {};
		if (!this._settings.yAxis) return;

		var x0 = point0.x - 0.5;
		var y0 = point1.y;
		var y1 = point0.y;
		var lineX = point1.y+0.5;

		//this._drawLine(ctx,x0,y0,x0,y1,this._settings.yAxis.color,1);

		if(this._settings.yAxis.step)
			step = parseFloat(this._settings.yAxis.step);

		if(typeof this._configYAxis.step =="undefined"||typeof this._configYAxis.start=="undefined"||typeof this._configYAxis.end =="undefined"){
			scaleParam = this._calculateScale(start,end);
			start = scaleParam.start;
			end = scaleParam.end;
			step = scaleParam.step;

			this._settings.yAxis.end = end;
			this._settings.yAxis.start = start;
		}
		else if(this.config.scale == "logarithmic")
			this._logScaleCalc = true;

		this._setYAxisTitle(point0,point1);
		if(step===0) return;
		if(end==start){
			return y0;
		}
		var stepHeight = (y0-y1)*step/(end-start);
		var c = 0;
		for(var i = start; i<=end; i += step){
			var value = this._logScaleCalc?Math.pow(10,i):i;
			if (scaleParam.fixNum)  value = parseFloat(value).toFixed(scaleParam.fixNum);
			var yi = Math.floor(y0-c*stepHeight)+ 0.5;/*canvas line fix*/
			if(!(i==start&&this._settings.origin=="auto") &&this._settings.yAxis.lines.call(this,i))
				this._drawLine(ctx,x0,yi,point1.x,yi,this._settings.yAxis.lineColor.call(this,i),1);
			if(i == this._settings.origin) lineX = yi;
			/*correction for JS float calculation*/
			if(step<1 && !this._logScaleCalc){
				var power = Math.min(Math.floor(this._log10(step)),(start<=0?0:Math.floor(this._log10(start))));
				var corr = Math.pow(10,-power);
				value = Math.round(value*corr)/corr;
				i = value;
			}
			this.canvases["y"].renderText(0,yi-5,
				this._settings.yAxis.template(value.toString()),
				"webix_axis_item_y",
				point0.x-5
			);
			c++;
		}
		this._drawLine(ctx,x0,y0+1,x0,y1,this._settings.yAxis.color,1);
		return lineX;
	},

	_setYAxisTitle:function(point0,point1){
        var className = "webix_axis_title_y"+(webix._isIE&&webix._isIE !=9?" webix_ie_filter":"");
		var text=this.canvases["y"].renderTextAt("middle",false,0,parseInt((point1.y-point0.y)/2+point0.y,10),this._settings.yAxis.title,className);
        if (text)
			text.style.left = (webix.env.transform?(text.offsetHeight-text.offsetWidth)/2:0)+"px";
	},
	_calculateLogScale: function(nmin,nmax){
		var startPower = Math.floor(this._log10(nmin));
		var endPower = Math.ceil(this._log10(nmax));
		return {start: startPower, step: 1, end: endPower};
	},
	_calculateScale:function(nmin,nmax){
		this._logScaleCalc = false;
		if(this._settings.scale == "logarithmic"){
			var logMin = Math.floor(this._log10(nmin));
			var logMax = Math.ceil(this._log10(nmax));
			if(nmin>0 && nmax > 0 && (logMax-logMin>1) ){
				this._logScaleCalc = true;
				return this._calculateLogScale(nmin,nmax);
			}

		}
	    if(this._settings.origin!="auto"&&this._settings.origin<nmin)
			nmin = this._settings.origin;
		var step,start,end;
	   	step = ((nmax-nmin)/8)||1;
		var power = Math.floor(this._log10(step));
		var calculStep = Math.pow(10,power);
		var stepVal = step/calculStep;
		stepVal = (stepVal>5?10:5);
		step = parseInt(stepVal,10)*calculStep;

		if(step>Math.abs(nmin))
			start = (nmin<0?-step:0);
		else{
			var absNmin = Math.abs(nmin);
			var powerStart = Math.floor(this._log10(absNmin));
			var nminVal = absNmin/Math.pow(10,powerStart);
			start = Math.ceil(nminVal*10)/10*Math.pow(10,powerStart)-step;
			if(absNmin>1&&step>0.1){
				start = Math.ceil(start);
			}
			while(nmin<0?start<=nmin:start>=nmin)
				start -= step;
			if(nmin<0) start =-start-2*step;
			
		}
	     end = start;
		while(end<nmax){
			end += step;
			end = parseFloat((end*1.0).toFixed(Math.abs(power)));
		}
		return { start:start,end:end,step:step,fixNum:power<0?Math.abs(power):0 };
	},
	_getLimits:function(orientation,value){
		var data = this.data._obj_array();

		var maxValue, minValue;
		var axis = ((arguments.length && orientation=="h")?this._configXAxis:this._configYAxis);
		value = value||"value";
		if(axis&&(typeof axis.end!="undefined")&&(typeof axis.start!="undefined")&&axis.step){
		    maxValue = parseFloat(axis.end);
			minValue = parseFloat(axis.start);
		}
		else{
			maxValue = webix.GroupMethods.max(this._series[0][value], data);
			minValue = (axis&&(typeof axis.start!="undefined"))?parseFloat(axis.start):webix.GroupMethods.min(this._series[0][value], data);
			if(this._series.length>1)
			for(var i=1; i < this._series.length;i++){
				var maxI = webix.GroupMethods.max(this._series[i][value], data);
				var minI = webix.GroupMethods.min(this._series[i][value], data);
				if (maxI > maxValue) maxValue = maxI;
		    	if (minI < minValue) minValue = minI;
			}
		}
		return {max:maxValue,min:minValue};
	},
	_log10:function(n){
        var method_name="log";
        return Math[method_name](n)/Math.LN10;
    },
	_drawXAxisLabel:function(x,y,obj,center,top){
		if (!this._settings.xAxis) return;
		var elem = this.canvases["x"].renderTextAt(top, center, x,y-(top?2:0),this._settings.xAxis.template(obj));
		if (elem)
			elem.className += " webix_axis_item_x";
	},
	_drawXAxisLine:function(ctx,x,y1,y2,obj){
		if (!this._settings.xAxis||!this._settings.xAxis.lines) return;
		this._drawLine(ctx,x,y1,x,y2,this._settings.xAxis.lineColor.call(this,obj),1);
	},
	_drawLine:function(ctx,x1,y1,x2,y2,color,width){
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.beginPath();
		ctx.moveTo(x1,y1);
		ctx.lineTo(x2,y2);
		ctx.stroke();
        ctx.lineWidth = 1;
	},
	_getRelativeValue:function(minValue,maxValue){
	    var relValue, origRelValue;
		var valueFactor = 1;
		if(maxValue != minValue){
			relValue = maxValue - minValue;
		}
		else relValue = minValue;
		return [relValue,valueFactor];
	},
	_rainbow : [
		function(pos){ return "#FF"+webix.color.toHex(pos/2,2)+"00";},
		function(pos){ return "#FF"+webix.color.toHex(pos/2+128,2)+"00";},
		function(pos){ return "#"+webix.color.toHex(255-pos,2)+"FF00";},
		function(pos){ return "#00FF"+webix.color.toHex(pos,2);},
		function(pos){ return "#00"+webix.color.toHex(255-pos,2)+"FF";},
		function(pos){ return "#"+webix.color.toHex(pos,2)+"00FF";}		
	],
	_defColors : [
		"#f55b50","#ff6d3f","#ffa521","#ffc927","#ffee54","#d3e153","#9acb61","#63b967",
		"#21a497","#21c5da","#3ea4f5","#5868bf","#7b53c0","#a943ba","#ec3b77","#9eb0b8"
	],
	_defColorsCursor: 0,
	/**
	*   adds series to the chart (value and color properties)
	*   @param: obj - obj with configuration properties
	*/
	addSeries:function(obj){
		var temp = webix.extend({},this._settings);
		this._settings = webix.extend({},temp);
		this._parseSettings(obj,{});
	    this._series.push(this._settings);
		this._settings = temp;
    },
    /*switch global settings to serit in question*/
    _switchSeries:function(id, e, tag) {
	    var tip;

	    if(!tag.getAttribute("userdata"))
	        return;

	    this._active_serie = this._series.length==1?tag.getAttribute("userdata"):this._getActiveSeries(e);
	    if (!this._series[this._active_serie]) return;
	    for (var i=0; i < this._series.length; i++) {
		    tip = this._series[i].tooltip;

		    if (tip)
			    tip.disable();
	    }
	    if(!tag.getAttribute("disabled")){
		    tip = this._series[this._active_serie].tooltip;
		    if (tip)
			    tip.enable();
	    }
    },
	_getActiveSeries: function(e){
		var a, areas, i, offset, pos, selection,  x, y;

		areas = this._map._areas;
		offset = webix.html.offset(this._contentobj._htmlmap);
		pos = webix.html.pos(e);
		x = pos.x - offset.x;
		y = pos.y - offset.y;

		for( i = 0; i < areas.length; i++){
			a = areas[i].points;
			if(x <= a[2] && x >= a[0] && y <= a[3] && y >= a[1]){
				if(selection){
					if(areas[i].index > selection.index)
						selection = areas[i];
				}
				else
					selection = areas[i];
			}
		}

		return selection?selection.index:0;
	},
	hideSeries:function(series){
		this.canvases[series].hideCanvas();
		var legend = this._settings.legend;
		if(legend && legend.values && legend.values[series]){
			legend.values[series].$hidden = true;
			this._drawLegend();
		}
		this._map.hide(this._contentobj, series, true);
	},
	showSeries:function(series){
		this.canvases[series].showCanvas();
		var legend = this._settings.legend;
		if(legend && legend.values && legend.values[series]){
			delete legend.values[series].$hidden;
			this._drawLegend();
		}
		this._map.hide(this._contentobj, series, false);
	},
	/**
	*   renders legend block
	*   @param: ctx - canvas object
	*   @param: data - object those need to be displayed
	*   @param: width - the width of the container
	*   @param: height - the height of the container
	*/
	_drawLegend:function(data,width){
		/*position of the legend block*/
		var i, legend, legendContainer, legendHeight, legendItems, legendWidth, style,
			x=0, y= 0, ctx, itemColor, disabled, item;

		data = data||[];
		width = width||this._content_width;
		ctx = this.canvases["legend"].getCanvas();
		/*legend config*/
		legend = this._settings.legend;
		 /*the legend sizes*/

		style = (this._settings.legend.layout!="x"?"width:"+legend.width+"px":"");
		/*creation of legend container*/

		if(this._legendObj){

			this._legendObj.innerHTML = "";
			this._legendObj.parentNode.removeChild(this._legendObj);
		}
		this.canvases["legend"].clearCanvas(true);

		legendContainer = webix.html.create("DIV",{
			"class":"webix_chart_legend",
			"style":"left:"+x+"px; top:"+y+"px;"+style
		},"");
		if(legend.padding){
			legendContainer.style.padding =  legend.padding+"px";
		}
		this._legendObj = legendContainer;
		this._contentobj.appendChild(legendContainer);

		/*rendering legend text items*/
		legendItems = [];
		if(!legend.values)
			for(i = 0; i < data.length; i++){
				legendItems.push(this._drawLegendText(legendContainer,legend.template(data[i])));
			}
		else
			for(i = 0; i < legend.values.length; i++){
				legendItems.push(this._drawLegendText(legendContainer,legend.values[i].text,(typeof legend.values[i].id!="undefined"?typeof legend.values[i].id:i),legend.values[i].$hidden));
			}
		if (legendContainer.offsetWidth === 0)
			legendContainer.style.width = "auto"; 
	   	legendWidth = legendContainer.offsetWidth;
	    legendHeight = legendContainer.offsetHeight;

		/*this._settings.legend.width = legendWidth;
		this._settings.legend.height = legendHeight;*/
		/*setting legend position*/
		if(legendWidth<width){
			if(legend.layout == "x"&&legend.align == "center"){
			    x = (width-legendWidth)/2;
            }
			if(legend.align == "right"){
				x = width-legendWidth;
			}
            if(legend.margin&&legend.align != "center"){
                x += (legend.align == "left"?1:-1)*legend.margin;
            }
        }

		if(legendHeight<this._content_height){
			if(legend.valign == "middle"&&legend.align != "center"&&legend.layout != "x")
				y = (this._content_height-legendHeight)/2;
			else if(legend.valign == "bottom")
				y = this._content_height-legendHeight;
            if(legend.margin&&legend.valign != "middle"){
                y += (legend.valign == "top"?1:-1)*legend.margin;
            }
		}
		legendContainer.style.left = x+"px";
		legendContainer.style.top = y+"px";

		/*drawing colorful markers*/
		ctx.save();
		for(i = 0; i < legendItems.length; i++){
			item = legendItems[i];
			if(legend.values&&legend.values[i].$hidden){
				disabled = true;
				itemColor = (legend.values[i].disableColor?legend.values[i].disableColor:"#d9d9d9");
			}
			else{
				disabled = false;
				itemColor = (legend.values?legend.values[i].color:this._settings.color.call(this,data[i]));
			}
			this._drawLegendMarker(ctx,item.offsetLeft+x,item.offsetTop+y,itemColor,item.offsetHeight,disabled,i);
		}
		ctx.restore();
		legendItems = null;
	},
	/**
	*   appends legend item to legend block
	*   @param: ctx - canvas object
	*   @param: obj - data object that needs being represented
	*/
	_drawLegendText:function(cont,value,series,disabled){
		var style = "";
		if(this._settings.legend.layout=="x")
			style = "float:left;";
		/*the text of the legend item*/
		var text = webix.html.create("DIV",{
			"style":style+"padding-left:"+(10+this._settings.legend.marker.width)+"px",
			"class":"webix_chart_legend_item"+(disabled?" hidden":""),
			"role":"button",
			"tabindex":"0",
			"aria-label":(webix.i18n.aria[(disabled?"show":"hide")+"Chart"])+" "+value
		},value);
		if(arguments.length>2)
			text.setAttribute("series_id",series);
		cont.appendChild(text);
		return text;
	},
	/**
	*   draw legend colorful marder
	*   @param: ctx - canvas object
	*   @param: x - the horizontal position of the marker
	*   @param: y - the vertical position of the marker
	*   @param: obj - data object which color needs being used
	*/
	_drawLegendMarker:function(ctx,x,y,color,height,disabled,i){
		var p = [];
		var marker = this._settings.legend.marker;
		var values = this._settings.legend.values;
		var type = (values&&values[i].markerType?values[i].markerType:marker.type);
		if(color){
			ctx.strokeStyle = ctx.fillStyle = color;
		}

		if(type=="round"||!marker.radius){
			ctx.beginPath();
			ctx.lineWidth = marker.height;
			ctx.lineCap = marker.type;
			/*start of marker*/
			x += ctx.lineWidth/2+5;
			y += height/2;
			ctx.moveTo(x,y);
			var x1 = x + marker.width-marker.height +1;
			ctx.lineTo(x1,y);
			ctx.stroke();
			ctx.fill();

		}
		else if(type=="item"){
			/*copy of line*/
			if(this._settings.line&&this._settings.type != "scatter" && !this._settings.disableLines){
				ctx.beginPath();
				ctx.lineWidth = this._series[i].line.width;
				ctx.strokeStyle = disabled?color:this._series[i].line.color.call(this,{});
				var x0 = x + 5;
				var y0 = y + height/2;
				ctx.moveTo(x0,y0);
				var x1 = x0 + marker.width;
				ctx.lineTo(x1,y0);
				ctx.stroke();
			}
			/*item copy*/
			var config = this._series[i].item;
			var radius = parseInt(config.radius.call(this,{}),10)||0;
			if(radius){
				ctx.beginPath();
				if(disabled){
					ctx.lineWidth = config.borderWidth;
					ctx.strokeStyle = color;
					ctx.fillStyle = color;
				}
				else{
					ctx.lineWidth = config.borderWidth;
					ctx.fillStyle = config.color.call(this,{});
					ctx.strokeStyle = config.borderColor.call(this,{});
					ctx.globalAlpha = config.alpha.call(this,{});
				}
				ctx.beginPath();
				x += marker.width/2+5;
				y += height/2;
				this._strokeChartItem(ctx,x,y,radius+1,config.type);
				ctx.fill();
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
		}else{
			ctx.beginPath();
			ctx.lineWidth = 1;
			x += 5;
			y += height/2-marker.height/2;
			p = [
				[x+marker.radius,y+marker.radius,marker.radius,Math.PI,3*Math.PI/2,false],
				[x+marker.width-marker.radius,y],
				[x+marker.width-marker.radius,y+marker.radius,marker.radius,-Math.PI/2,0,false],
				[x+marker.width,y+marker.height-marker.radius],
				[x+marker.width-marker.radius,y+marker.height-marker.radius,marker.radius,0,Math.PI/2,false],
				[x+marker.radius,y+marker.height],
				[x+marker.radius,y+marker.height-marker.radius,marker.radius,Math.PI/2,Math.PI,false],
				[x,y+marker.radius]
			];
			this._path(ctx,p);
			ctx.stroke();
			ctx.fill();
		}

	},
	/**
	*   gets the points those represent chart left top and right bottom bounds
	*   @param: width - the width of the chart container
	*   @param: height - the height of the chart container
	*/
	_getChartBounds:function(width,height){
		var chartX0, chartY0, chartX1, chartY1;
		
		chartX0 = this._settings.padding.left;
		chartY0 = this._settings.padding.top;
		chartX1 = width - this._settings.padding.right;
		chartY1 = height - this._settings.padding.bottom;	
		
		if(this._settings.legend){
			var legend = this._settings.legend;
			/*legend size*/
			var legendWidth = this._settings.legend.width;
			var legendHeight = this._settings.legend.height;
		
			/*if legend is horizontal*/
			if(legend.layout == "x"){
				if(legend.valign == "center"){
					if(legend.align == "right")
						chartX1 -= legendWidth;
					else if(legend.align == "left")
				 		chartX0 += legendWidth;
			 	}
			 	else if(legend.valign == "bottom"){
			    	chartY1 -= legendHeight;
			 	}
			 	else{
			    	chartY0 += legendHeight;
			 	}
			}
			/*vertical scale*/
			else{
				if(legend.align == "right")
					chartX1 -= legendWidth;
			 	else if(legend.align == "left")
					chartX0 += legendWidth;
			}
		}
		return {start:{x:chartX0,y:chartY0},end:{x:chartX1,y:chartY1}};
	},
	/**
	*   gets the maximum and minimum values for the stacked chart
	*   @param: data - data set
	*/
	_getStackedLimits:function(data){
		var i, j, maxValue, minValue, value;
		if(this._settings.yAxis&&(typeof this._settings.yAxis.end!="undefined")&&(typeof this._settings.yAxis.start!="undefined")&&this._settings.yAxis.step){
			maxValue = parseFloat(this._settings.yAxis.end);
			minValue = parseFloat(this._settings.yAxis.start);
		}
		else{
			for(i=0; i < data.length; i++){
				data[i].$sum = 0 ;
				data[i].$min = Infinity;
				for(j =0; j < this._series.length;j++){
					value = parseFloat(this._series[j].value(data[i])||0);
					if(isNaN(value)) continue;
					if(this._series[j].type.toLowerCase().indexOf("stacked")!=-1)
						data[i].$sum += value;
					if(value < data[i].$min) data[i].$min = value;
				}
			}
			maxValue = -Infinity;
			minValue = Infinity;
			for(i=0; i < data.length; i++){
				if (data[i].$sum > maxValue) maxValue = data[i].$sum ;
				if (data[i].$min < minValue) minValue = data[i].$min ;
			}
			if(minValue>0) minValue =0;
		}
		return {max: maxValue, min: minValue};
	},
	/*adds colors to the gradient object*/
	_setBarGradient:function(ctx,x1,y1,x2,y2,type,color,axis){
		var gradient, offset, rgb, hsv, color0, stops;
		if(type == "light"){
			if(axis == "x")
				gradient = ctx.createLinearGradient(x1,y1,x2,y1);
			else
				gradient = ctx.createLinearGradient(x1,y1,x1,y2);
			stops = [[0,"#FFFFFF"],[0.9,color],[1,color]];
			offset = 2;
		}
		else if(type == "falling"||type == "rising"){
			if(axis == "x")
				gradient = ctx.createLinearGradient(x1,y1,x2,y1);
			else
				gradient = ctx.createLinearGradient(x1,y1,x1,y2);
			rgb = webix.color.toRgb(color);
			hsv = webix.color.rgbToHsv(rgb[0],rgb[1],rgb[2]);
			hsv[1] *= 1/2;
			color0 = "rgb("+webix.color.hsvToRgb(hsv[0],hsv[1],hsv[2])+")";
			if(type == "falling"){
				stops = [[0,color0],[0.7,color],[1,color]];
			}
			else if(type == "rising"){
				stops = [[0,color],[0.3,color],[1,color0]];
			}
			offset = 0;
		}
		else{
			ctx.globalAlpha = 0.37;
			offset = 0;
			if(axis == "x")
				gradient = ctx.createLinearGradient(x1,y2,x1,y1);
			else
				gradient = ctx.createLinearGradient(x1,y1,x2,y1);
			stops = [[0,"#9d9d9d"],[0.3,"#e8e8e8"],[0.45,"#ffffff"],[0.55,"#ffffff"],[0.7,"#e8e8e8"],[1,"#9d9d9d"]];
		}
		this._gradient(gradient,stops);
		return {gradient: gradient,offset: offset};
	},
	/**
	*   returns the x and y position
    *   @param: a - angle
    *   @param: x - start x position
    *   @param: y - start y position
	*   @param: r - destination to the point
	*/
     _getPositionByAngle:function(a,x,y,r){
         a *= (-1);
         x = x+Math.cos(a)*r;
         y = y-Math.sin(a)*r;
         return {x:x,y:y};
    },
	_gradient:function(gradient,stops){
		for(var i=0; i< stops.length; i++){
			gradient.addColorStop(stops[i][0],stops[i][1]);
		}
	},
	_path: function(ctx,points){
		var i, method;
		for(i = 0; i< points.length; i++){
			method = (i?"lineTo":"moveTo");
			if(points[i].length>2)
				method = "arc";
			ctx[method].apply(ctx,points[i]);
		}
	},
	_addMapRect:function(map,id,points,bounds,sIndex){
		map.addRect(id,[points[0].x-bounds.x,points[0].y-bounds.y,points[1].x-bounds.x,points[1].y-bounds.y],sIndex);
	}
}, webix.Group, webix.AutoTooltip, webix.DataLoader, webix.MouseEvents,  webix.EventSystem , webix.ui.view);


webix.extend(webix.ui.chart, {
	$render_pie:function(ctx,data,x,y,sIndex,map){
		this._renderPie(ctx,data,x,y,1,map,sIndex);
		
	},
	/**
	 *   renders a pie chart
	 *   @param: ctx - canvas object
	 *   @param: data - object those need to be displayed
	 *   @param: x - the width of the container
	 *   @param: y - the height of the container
	 *   @param: ky - value from 0 to 1 that defines an angle of inclination (0<ky<1 - 3D chart)
	 */
	_renderPie:function(ctx,data,point0,point1,ky,map,sIndex){
		if(!data.length)
			return;
		var coord = this._getPieParameters(point0,point1);
		/*pie radius*/
		var radius = (this._settings.radius?this._settings.radius:coord.radius);
		if(radius<0)
			return;

		/*real values*/
		var values = this._getValues(data);

		var totalValue = this._getTotalValue(values);

		/*weighed values (the ratio of object value to total value)*/
		var ratios = this._getRatios(values,totalValue);

		/*pie center*/
		var x0 = (this._settings.x?this._settings.x:coord.x);
		var y0 = (this._settings.y?this._settings.y:coord.y);
		/*adds shadow to the 2D pie*/
		if(ky==1&&this._settings.shadow)
			this._addShadow(ctx,x0,y0,radius);

		/*changes vertical position of the center according to 3Dpie cant*/
		y0 = y0/ky;
		/*the angle defines the 1st edge of the sector*/
		var alpha0 = -Math.PI/2;
		var angles = [];
		/*changes Canvas vertical scale*/
		ctx.scale(1,ky);
		/*adds radial gradient to a pie*/
		if (this._settings.gradient){
			var x1 = (ky!=1?x0+radius/3:x0);
			var y1 = (ky!=1?y0+radius/3:y0);
			this._showRadialGradient(ctx,x0,y0,radius,x1,y1);
		}
		for(var i = 0; i < data.length;i++){
			if (!values[i]) continue;
			/*drawing sector*/
			//ctx.lineWidth = 2;
			ctx.strokeStyle = this._settings.lineColor.call(this,data[i]);
			ctx.beginPath();
			ctx.moveTo(x0,y0);
			angles.push(alpha0);
			/*the angle defines the 2nd edge of the sector*/
			var alpha1 = -Math.PI/2+ratios[i]-0.0001;
			ctx.arc(x0,y0,radius,alpha0,alpha1,false);
			ctx.lineTo(x0,y0);

			var color = this._settings.color.call(this,data[i]);
			ctx.fillStyle = color;
			ctx.fill();

			/*text that needs being displayed inside the sector*/
			if(this._settings.pieInnerText)
				this._drawSectorLabel(x0,y0,5*radius/6,alpha0,alpha1,ky,this._settings.pieInnerText(data[i],totalValue),true);
			/*label outside the sector*/
			if(this._settings.label)
				this._drawSectorLabel(x0,y0,radius+this._settings.labelOffset,alpha0,alpha1,ky,this._settings.label(data[i]));
			/*drawing lower part for 3D pie*/
			if(ky!=1){
				this._createLowerSector(ctx,x0,y0,alpha0,alpha1,radius,true);
				ctx.fillStyle = "#000000";
				ctx.globalAlpha = 0.2;
				this._createLowerSector(ctx,x0,y0,alpha0,alpha1,radius,false);
				ctx.globalAlpha = 1;
				ctx.fillStyle = color;
			}
			/*creats map area (needed for events)*/
			map.addSector(data[i].id,alpha0,alpha1,x0-point0.x,y0-point0.y/ky,radius,ky,sIndex);

			alpha0 = alpha1;
		}
		/*renders radius lines and labels*/
		ctx.globalAlpha = 0.8;
		var p;
		for(i=0;i< angles.length;i++){
			p = this._getPositionByAngle(angles[i],x0,y0,radius);
			this._drawLine(ctx,x0,y0,p.x,p.y,this._settings.lineColor.call(this,data[i]),2);
		}
		if(ky==1){
			ctx.lineWidth = 2;
			ctx.strokeStyle = "#ffffff";
			ctx.beginPath();
			ctx.arc(x0,y0,radius+1,0,2*Math.PI,false);
			ctx.stroke();
		}
		ctx.globalAlpha =1;

		ctx.scale(1,1/ky);
	},
	/**
	 *   returns list of values
	 *   @param: data array
	 */
	_getValues:function(data){
		var v = [];
		for(var i = 0; i < data.length;i++)
			v.push(parseFloat(this._settings.value(data[i])||0));
		return v;
	},
	/**
	 *   returns total value
	 *   @param: the array of values
	 */
	_getTotalValue:function(values){
		var t=0;
		for(var i = 0; i < values.length;i++)
			t += values[i];
		return  t;
	},
	/**
	 *   gets angles for all values
	 *   @param: the array of values
	 *   @param: total value (optional)
	 */
	_getRatios:function(values,totalValue){
		var value;
		var ratios = [];
		var prevSum = 0;
		totalValue = totalValue||this._getTotalValue(values);
		for(var i = 0; i < values.length;i++){
			value = values[i];

			ratios[i] = Math.PI*2*(totalValue?((value+prevSum)/totalValue):(1/values.length));
			prevSum += value;
		}
		return ratios;
	},
	/**
	 *   returns calculated pie parameters: center position and radius
	 *   @param: x - the width of a container
	 *   @param: y - the height of a container
	 */
	_getPieParameters:function(point0,point1){
		/*var offsetX = 0;
		 var offsetY = 0;
		 if(this._settings.legend &&this._settings.legend.layout!="x")
		 offsetX = this._settings.legend.width*(this._settings.legend.align=="right"?-1:1);
		 var x0 = (x + offsetX)/2;
		 if(this._settings.legend &&this._settings.legend.layout=="x")
		 offsetY = this._settings.legend.height*(this._settings.legend.valign=="bottom"?-1:1);
		 var y0 = (y+offsetY)/2;*/
		var width = point1.x-point0.x;
		var height = point1.y-point0.y;
		var x0 = point0.x+width/2;
		var y0 = point0.y+height/2;
		var radius = Math.min(width/2,height/2);
		return {"x":x0,"y":y0,"radius":radius};
	},
	/**
	 *   creates lower part of sector in 3Dpie
	 *   @param: ctx - canvas object
	 *   @param: x0 - the horizontal position of the pie center
	 *   @param: y0 - the vertical position of the pie center
	 *   @param: a0 - the angle that defines the first edge of a sector
	 *   @param: a1 - the angle that defines the second edge of a sector
	 *   @param: R - pie radius
	 *   @param: line (boolean) - if the sector needs a border
	 */
	_createLowerSector:function(ctx,x0,y0,a1,a2,R,line){
		ctx.lineWidth = 1;
		/*checks if the lower sector needs being displayed*/
		if(!((a1<=0 && a2>=0)||(a1>=0 && a2<=Math.PI)||(Math.abs(a1-Math.PI)>0.003&&a1<=Math.PI && a2>=Math.PI))) return;

		if(a1<=0 && a2>=0){
			a1 = 0;
			line = false;
			this._drawSectorLine(ctx,x0,y0,R,a1,a2);
		}
		if(a1<=Math.PI && a2>=Math.PI){
			a2 = Math.PI;
			line = false;
			this._drawSectorLine(ctx,x0,y0,R,a1,a2);
		}
		/*the height of 3D pie*/
		var offset = (this._settings.pieHeight||Math.floor(R/4))/this._settings.cant;
		ctx.beginPath();
		ctx.arc(x0,y0,R,a1,a2,false);
		ctx.lineTo(x0+R*Math.cos(a2),y0+R*Math.sin(a2)+offset);
		ctx.arc(x0,y0+offset,R,a2,a1,true);
		ctx.lineTo(x0+R*Math.cos(a1),y0+R*Math.sin(a1));
		ctx.fill();
		if(line)
			ctx.stroke();
	},
	/**
	 *   draws a serctor arc
	 */
	_drawSectorLine:function(ctx,x0,y0,R,a1,a2){
		ctx.beginPath();
		ctx.arc(x0,y0,R,a1,a2,false);
		ctx.stroke();
	},
	/**
	 *   adds a shadow to pie
	 *   @param: ctx - canvas object
	 *   @param: x - the horizontal position of the pie center
	 *   @param: y - the vertical position of the pie center
	 *   @param: R - pie radius
	 */
	_addShadow:function(ctx,x,y,R){
		ctx.globalAlpha = 0.5;
		var shadows = ["#c4c4c4","#c6c6c6","#cacaca","#dcdcdc","#dddddd","#e0e0e0","#eeeeee","#f5f5f5","#f8f8f8"];
		for(var i = shadows.length-1;i>-1;i--){
			ctx.beginPath();
			ctx.fillStyle = shadows[i];
			ctx.arc(x+1,y+1,R+i,0,Math.PI*2,true);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	},
	/**
	 *   returns a gray gradient
	 *   @param: gradient - gradient object
	 */
	_getGrayGradient:function(gradient){
		gradient.addColorStop(0.0,"#ffffff");
		gradient.addColorStop(0.7,"#7a7a7a");
		gradient.addColorStop(1.0,"#000000");
		return gradient;
	},
	/**
	 *   adds gray radial gradient
	 *   @param: ctx - canvas object
	 *   @param: x - the horizontal position of the pie center
	 *   @param: y - the vertical position of the pie center
	 *   @param: radius - pie radius
	 *   @param: x0 - the horizontal position of a gradient center
	 *   @param: y0 - the vertical position of a gradient center
	 */
	_showRadialGradient:function(ctx,x,y,radius,x0,y0){
		//ctx.globalAlpha = 0.3;
		ctx.beginPath();
		var gradient;
		if(typeof this._settings.gradient!= "function"){
			gradient = ctx.createRadialGradient(x0,y0,radius/4,x,y,radius);
			gradient = this._getGrayGradient(gradient);
		}
		else gradient = this._settings.gradient(gradient);
		ctx.fillStyle = gradient;
		ctx.arc(x,y,radius,0,Math.PI*2,true);
		ctx.fill();
		//ctx.globalAlpha = 1;
		ctx.globalAlpha = 0.7;
	},
	/**
	 *   returns the calculates pie parameters: center position and radius
	 *   @param: ctx - canvas object
	 *   @param: x0 - the horizontal position of the pie center
	 *   @param: y0 - the vertical position of the pie center
	 *   @param: R - pie radius
	 *   @param: alpha1 - the angle that defines the 1st edge of a sector
	 *   @param: alpha2 - the angle that defines the 2nd edge of a sector
	 *   @param: ky - the value that defines an angle of inclination
	 *   @param: text - label text
	 *   @param: in_width (boolean) - if label needs being displayed inside a pie
	 */
	_drawSectorLabel:function(x0,y0,R,alpha1,alpha2,ky,text,in_width){
		var t = this.canvases[0].renderText(0,0,text,0,1);
		if (!t) return;

		//get existing width of text
		var labelWidth = t.scrollWidth;
		t.style.width = labelWidth+"px";	//adjust text label to fit all text
		if (labelWidth>x0) labelWidth = x0;	//the text can't be greater than half of view

		//calculate expected correction based on default font metrics
		var width = (alpha2-alpha1<0.2?4:8);
		if (in_width) width = labelWidth/1.8;
		var alpha = alpha1+(alpha2-alpha1)/2;

		//position and its correction
		R = R-(width-8)/2;
		var corr_x = - width;
		var corr_y = -8;
		var align = "right";

		//for items in left upper and lower sector
		if(alpha>=Math.PI/2 && alpha<Math.PI || alpha<=3*Math.PI/2 && alpha>=Math.PI){
			corr_x = -labelWidth-corr_x+1;/*correction for label width*/
			align = "left";
		}

		/*
		   calculate position of text
		   basically get point at center of pie sector
		*/
		var offset = 0;

		if(!in_width&&ky<1&&(alpha>0&&alpha<Math.PI))
			offset = (this._settings.height||Math.floor(R/4))/ky;

		var y = (y0+Math.floor((R+offset)*Math.sin(alpha)))*ky+corr_y;
		var x = x0+Math.floor((R+width/2)*Math.cos(alpha))+corr_x;

		/*
		   if pie sector starts in left of right part pie,
		   related text	must be placed to the left of to the right of pie as well
		*/
		var left_end = (alpha2 < Math.PI/2+0.01);
		var left_start = (alpha1 < Math.PI/2);
		if (left_start && left_end){
			x = Math.max(x,x0+3);	//right part of pie
			/*if(alpha2-alpha1<0.2)
				x = x0;*/
		}
		else if (!left_start && !left_end)
			x = Math.min(x,x0-labelWidth);	//left part of pie
		else if (!in_width&&(alpha>=Math.PI/2 && alpha<Math.PI || alpha<=3*Math.PI/2 && alpha>=Math.PI)){
			x += labelWidth/3;
		}


		//we need to set position of text manually, based on above calculations
		t.style.top  = y+"px";
		t.style.left = x+"px";
		t.style.width = labelWidth+"px";
		t.style.textAlign = align;
		t.style.whiteSpace = "nowrap";
	},
	$render_pie3D:function(ctx,data,x,y,sIndex,map){
		this._renderPie(ctx,data,x,y,this._settings.cant,map);
	},
	$render_donut:function(ctx,data,point0,point1,sIndex,map){
        if(!data.length)
			return;
		this._renderPie(ctx,data,point0,point1,1,map,sIndex);
        var config = this._settings;
		var coord = this._getPieParameters(point0,point1);
		var pieRadius = (config.radius?config.radius:coord.radius);
	    var innerRadius = ((config.innerRadius&&(config.innerRadius<pieRadius))?config.innerRadius:pieRadius/3);
        var x0 = (config.x?config.x:coord.x);
		var y0 = (config.y?config.y:coord.y);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
		ctx.arc(x0,y0,innerRadius,0,Math.PI*2,true);
		ctx.fill();
    }
});
		//+pie3d
webix.extend(webix.ui.chart, {
	/**
	*   renders a bar chart
	*   @param: ctx - canvas object
	*   @param: data - object those need to be displayed
	*   @param: x - the width of the container
	*   @param: y - the height of the container
	*   @param: sIndex - index of drawing chart
	*/
	$render_bar:function(ctx, data, point0, point1, sIndex, map){
		var barWidth, cellWidth,
			i,
			limits, maxValue, minValue,
			relValue, valueFactor, relativeValues,
			startValue, unit,
			xax, yax,
			totalHeight = point1.y-point0.y;

		yax = !!this._settings.yAxis;
		xax = !!this._settings.xAxis;

		limits = this._getLimits();
		maxValue = limits.max;
		minValue = limits.min;

		/*an available width for one bar*/
		cellWidth = (point1.x-point0.x)/data.length;


		/*draws x and y scales*/
		if(!sIndex&&!(this._settings.origin!="auto"&&!yax)){
			this._drawScales(data,point0, point1,minValue,maxValue,cellWidth);
		}

		/*necessary for automatic scale*/
		if(yax){
			maxValue = parseFloat(this._settings.yAxis.end);
			minValue = parseFloat(this._settings.yAxis.start);
		}

		/*unit calculation (bar_height = value*unit)*/
		relativeValues = this._getRelativeValue(minValue,maxValue);
		relValue = relativeValues[0];
		valueFactor = relativeValues[1];

		unit = (relValue?totalHeight/relValue:relValue);

		if(!yax&&!(this._settings.origin!="auto"&&xax)){
			/*defines start value for better representation of small values*/
			startValue = 10;
			unit = (relValue?(totalHeight-startValue)/relValue:startValue);
		}
		/*if yAxis isn't set, but with custom origin */
		if(!sIndex&&(this._settings.origin!="auto"&&!yax)&&this._settings.origin>minValue){
			this._drawXAxis(ctx,data,point0,point1,cellWidth,point1.y-unit*(this._settings.origin-minValue));
		}

		/*a real bar width */
		barWidth = parseInt(this._settings.barWidth,10);
		var seriesNumber = 0;
		var seriesIndex = 0;
		for(i=0; i<this._series.length; i++ ){
			if(i == sIndex){
				seriesIndex  = seriesNumber;
			}
			if(this._series[i].type == "bar")
				seriesNumber++;
		}
		if(this._series&&(barWidth*seriesNumber+4)>cellWidth) barWidth = parseInt(cellWidth/seriesNumber-4,10);

		/*the half of distance between bars*/
		var barOffset = (cellWidth - barWidth*seriesNumber)/2;

		/*the radius of rounding in the top part of each bar*/
		var radius = (typeof this._settings.radius!="undefined"?parseInt(this._settings.radius,10):Math.round(barWidth/5));

		var inner_gradient = false;
		var gradient = this._settings.gradient;

		if(gradient && typeof(gradient) != "function"){
			inner_gradient = gradient;
			gradient = false;
		} else if (gradient){
			gradient = ctx.createLinearGradient(0,point1.y,0,point0.y);
			this._settings.gradient(gradient);
		}
		/*draws a black line if the horizontal scale isn't defined*/
		if(!xax){
			this._drawLine(ctx,point0.x,point1.y+0.5,point1.x,point1.y+0.5,"#000000",1); //hardcoded color!
		}

		for(i=0; i < data.length;i ++){

			var value =  parseFloat(this._settings.value(data[i])||0);
			if(this._logScaleCalc)
				value = this._log10(value);

			if(!value || isNaN(value))
				continue;

			if(value>maxValue) value = maxValue;
			value -= minValue;
			value *= valueFactor;

			/*start point (bottom left)*/
			var x0 = point0.x + barOffset + i*cellWidth+(barWidth+1)*seriesIndex;
			var y0 = point1.y;

			if(value<0||(this._settings.yAxis&&value===0&&!(this._settings.origin!="auto"&&this._settings.origin>minValue))){
				this.canvases[sIndex].renderTextAt(true, true, x0+Math.floor(barWidth/2),y0,this._settings.label(data[i]));
				continue;
			}

			/*takes start value into consideration*/
			if(!yax&&!(this._settings.origin!="auto"&&xax)) value += startValue/unit;

			var color = gradient||this._settings.color.call(this,data[i]);


			/*drawing bar body*/
			ctx.globalAlpha = this._settings.alpha.call(this,data[i]);
			var points = this._drawBar(ctx,point0,x0,y0,barWidth,minValue,radius,unit,value,color,gradient,inner_gradient);
			if (inner_gradient){
				this._drawBarGradient(ctx,x0,y0,barWidth,minValue,radius,unit,value,color,inner_gradient);
			}
			/*drawing the gradient border of a bar*/
			if(this._settings.border)
				this._drawBarBorder(ctx,x0,y0,barWidth,minValue,radius,unit,value,color);

			ctx.globalAlpha = 1;

			/*sets a bar label*/
			if(points[0]!=x0)
				this.canvases[sIndex].renderTextAt(false, true, x0+Math.floor(barWidth/2),points[1],this._settings.label(data[i]));
			else
				this.canvases[sIndex].renderTextAt(true, true, x0+Math.floor(barWidth/2),points[3],this._settings.label(data[i]));
			/*defines a map area for a bar*/
			map.addRect(data[i].id,[x0-point0.x,points[3]-point0.y,points[2]-point0.x,points[1]-point0.y],sIndex);
			//this._addMapRect(map,data[i].id,[{x:x0,y:points[3]},{x:points[2],y:points[1]}],point0,sIndex);
		}
	},
	_correctBarParams:function(ctx,x,y,value,unit,barWidth,minValue){
		var xax = this._settings.xAxis;
		var axisStart = y;
		if(!!xax&&this._settings.origin!="auto" && (this._settings.origin>minValue)){
			y -= (this._settings.origin-minValue)*unit;
			axisStart = y;
			value = value-(this._settings.origin-minValue);
			if(value < 0){
				value *= (-1);
				ctx.translate(x+barWidth,y);
				ctx.rotate(Math.PI);
				x = 0;
				y = 0;
			}
			y -= 0.5;
		}

		return {value:value,x0:x,y0:y,start:axisStart};
	},
	_drawBar:function(ctx,point0,x0,y0,barWidth,minValue,radius,unit,value,color,gradient,inner_gradient){
		ctx.save();
		ctx.fillStyle = color;
		var p = this._correctBarParams(ctx,x0,y0,value,unit,barWidth,minValue);
		var points = this._setBarPoints(ctx,p.x0,p.y0,barWidth,radius,unit,p.value,(this._settings.border?1:0));
		if (gradient&&!inner_gradient) ctx.lineTo(p.x0+(this._settings.border?1:0),point0.y); //fix gradient sphreading
		ctx.fill();
		ctx.restore();
		var x1 = p.x0;
		var x2 = (p.x0!=x0?x0+points[0]:points[0]);
		var y1 = (p.x0!=x0?(p.start-points[1]-p.y0):p.y0);
		var y2 = (p.x0!=x0?p.start-p.y0:points[1]);

		return [x1,y1,x2,y2];
	},
	_setBorderStyles:function(ctx,color){
		var hsv,rgb;
		rgb = webix.color.toRgb(color);
		hsv = webix.color.rgbToHsv(rgb[0],rgb[1],rgb[2]);
		hsv[2] /= 1.4;
		color = "rgb("+webix.color.hsvToRgb(hsv[0],hsv[1],hsv[2])+")";
		ctx.strokeStyle = color;
		if(ctx.globalAlpha==1)
			ctx.globalAlpha = 0.9;
	},
	_drawBarBorder:function(ctx,x0,y0,barWidth,minValue,radius,unit,value,color){
		var p;
		ctx.save();
		p = this._correctBarParams(ctx,x0,y0,value,unit,barWidth,minValue);
		this._setBorderStyles(ctx,color);
		this._setBarPoints(ctx,p.x0,p.y0,barWidth,radius,unit,p.value,ctx.lineWidth/2,1);
		ctx.stroke();
		/*ctx.fillStyle = color;
		 this._setBarPoints(ctx,p.x0,p.y0,barWidth,radius,unit,p.value,0);
		 ctx.lineTo(p.x0,0);
		 ctx.fill()


		 ctx.fillStyle = "#000000";
		 ctx.globalAlpha = 0.37;

		 this._setBarPoints(ctx,p.x0,p.y0,barWidth,radius,unit,p.value,0);
		 ctx.fill()
		 */
		ctx.restore();
	},
	_drawBarGradient:function(ctx,x0,y0,barWidth,minValue,radius,unit,value,color,inner_gradient){
		ctx.save();
		var p = this._correctBarParams(ctx,x0,y0,value,unit,barWidth,minValue);
		var gradParam = this._setBarGradient(ctx,p.x0,p.y0,p.x0+barWidth,p.y0-unit*p.value+2,inner_gradient,color,"y");
		var borderOffset = this._settings.border?1:0;
		ctx.fillStyle = gradParam.gradient;
		this._setBarPoints(ctx,p.x0+gradParam.offset,p.y0,barWidth-gradParam.offset*2,radius,unit,p.value,gradParam.offset+borderOffset);
		ctx.fill();
		ctx.restore();
	},
	/**
	 *   sets points for bar and returns the position of the bottom right point
	 *   @param: ctx - canvas object
	 *   @param: x0 - the x position of start point
	 *   @param: y0 - the y position of start point
	 *   @param: barWidth - bar width
	 *   @param: radius - the rounding radius of the top
	 *   @param: unit - the value defines the correspondence between item value and bar height
	 *   @param: value - item value
	 *   @param: offset - the offset from expected bar edge (necessary for drawing border)
	 */
	_setBarPoints:function(ctx,x0,y0,barWidth,radius,unit,value,offset,skipBottom){
		/*correction for displaing small values (when rounding radius is bigger than bar height)*/
		ctx.beginPath();
		//y0 = 0.5;
		var angle_corr = 0;
		if(radius>unit*value){
			var cosA = (radius-unit*value)/radius;
			if(cosA<=1&&cosA>=-1)
				angle_corr = -Math.acos(cosA)+Math.PI/2;
		}
		/*start*/
		ctx.moveTo(x0+offset,y0);
		/*start of left rounding*/
		var y1 = y0 - Math.floor(unit*value) + radius + (radius?0:offset);
		if(radius<unit*value)
			ctx.lineTo(x0+offset,y1);
		/*left rounding*/
		var x2 = x0 + radius;

		if (radius&&radius>0)
			ctx.arc(x2,y1,Math.max(radius-offset,0),-Math.PI+angle_corr,-Math.PI/2,false);
		/*start of right rounding*/
		var x3 = x0 + barWidth - radius - offset;
		var y3 = y1 - radius + (radius?offset:0);
		ctx.lineTo(x3,y3);
		/*right rounding*/
		if (radius&&radius>0)
			ctx.arc(x3+offset,y1,Math.max(radius-offset,0),-Math.PI/2,0-angle_corr,false);
		/*bottom right point*/
		var x5 = x0 + barWidth-offset;
		ctx.lineTo(x5,y0);
		/*line to the start point*/
		if(!skipBottom){
			ctx.lineTo(x0+offset,y0);
		}
		//	ctx.lineTo(x0,0); //IE fix!
		return [x5,y3];
	}
});	
webix.extend(webix.ui.chart, {
	/**
	*   renders a graphic
	*   @param: ctx - canvas object
	*   @param: data - object those need to be displayed
	*   @param: width - the width of the container
	*   @param: height - the height of the container
	*   @param: sIndex - index of drawing chart
	*/
	$render_line:function(ctx, data, point0, point1, sIndex, map){
		var config,i,items,params,x0,x1,x2,y1,y2,y0,res1,res2;
		params = this._calculateLineParams(ctx,data,point0,point1,sIndex);
		config = this._settings;

		if (data.length) {
			x0 = (config.offset?point0.x+params.cellWidth*0.5:point0.x);
			//finds items with data (excludes scale units)
			items= [];
			for(i=0; i < data.length;i++){
				res2 = this._getPointY(data[i],point0,point1,params);
				if(res2 || res2=="0"){
					x2 = ((!i)?x0:params.cellWidth*i - 0.5 + x0);
					y2 = (typeof res2 == "object"?res2.y0:res2);
					if(i && this._settings.fixOverflow){
						res1 = this._getPointY(data[i-1],point0,point1,params);
						if(res1.out && res1.out == res2.out){
							continue;
						}
						x1 = params.cellWidth*(i-1) - 0.5 + x0;
						y1 = (typeof res1 == "object"?res1.y0:res1);

						if(res1.out){
							y0 = (res1.out == "min"?point1.y:point0.y);
							items.push({x:this._calcOverflowX(x1,x2,y1,y2,y0),y:y0});
						}
						if(res2.out){
							y0 = (res2.out == "min"?point1.y:point0.y);
							items.push({x:this._calcOverflowX(x1,x2,y1,y2,y0),y:y0});
						}

					}

					if(!res2.out)
						items.push({x:x2, y: res2, index: i});
				}
			}
			this._mapStart = point0;
			for(i = 1; i <= items.length; i++){
				//line start position
				x1 = items[i-1].x;
				y1 = items[i-1].y;
				if(i<items.length){
					//line end position
					x2 = items[i].x;
					y2 = items[i].y;
					//line
					this._drawLine(ctx,x1,y1,x2,y2,config.line.color.call(this,data[i-1]),config.line.width);
					//line shadow
					if(config.line&&config.line.shadow){
						ctx.globalAlpha = 0.3;
						this._drawLine(ctx,x1+2,y1+config.line.width+8,x2+2,y2+config.line.width+8,"#eeeeee",config.line.width+3);
						ctx.globalAlpha = 1;
					}
				}
				//item
				if(typeof items[i-1].index != "undefined"){
					this._drawItem(ctx,x1,y1,data[items[i-1].index],config.label(data[items[i-1].index]), sIndex, map, point0);

				}
			}

		}
	},
	_calcOverflowX: function(x1,x2,y1,y2,y){
		return  x1 + ( y - y1 )*( x2 - x1 )/( y2 - y1 );
	},
	/**
	*   draws an item and its label
	*   @param: ctx - canvas object
	*   @param: x0 - the x position of a circle
	*   @param: y0 - the y position of a circle
	*   @param: obj - data object
	*   @param: label - (boolean) defines wherether label needs being drawn
	*/
	_drawItem:function(ctx,x0,y0,obj,label,sIndex,map){
		var config = this._settings.item;

		var R = parseInt(config.radius.call(this,obj),10)||0;
		var mapStart = this._mapStart;
		if(R){
			ctx.save();
			if(config.shadow){
				ctx.lineWidth = 1;
				ctx.strokeStyle = "#bdbdbd";
				ctx.fillStyle = "#bdbdbd";
				var alphas = [0.1,0.2,0.3];
				for(var i=(alphas.length-1);i>=0;i--){
					ctx.globalAlpha = alphas[i];
					ctx.strokeStyle = "#d0d0d0";
					ctx.beginPath();
					this._strokeChartItem(ctx,x0,y0+2*R/3,R+i+1,config.type);
					ctx.stroke();
				}
				ctx.beginPath();
				ctx.globalAlpha = 0.3;
				ctx.fillStyle = "#bdbdbd";
				this._strokeChartItem(ctx,x0,y0+2*R/3,R+1,config.type);
				ctx.fill();
			}
			ctx.restore();
			ctx.lineWidth = config.borderWidth;
			ctx.fillStyle = config.color.call(this,obj);
			ctx.strokeStyle = config.borderColor.call(this,obj);
			ctx.globalAlpha = config.alpha.call(this,obj);
			ctx.beginPath();
			this._strokeChartItem(ctx,x0,y0,R+1,config.type);
			ctx.fill();
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
		/*item label*/
		if(label){
			this.canvases[sIndex].renderTextAt(false, true, x0,y0-R-this._settings.labelOffset,this._settings.label.call(this,obj));
		}
		if(map){
			var areaPos = (this._settings.eventRadius||R+1);
			//this._addMapRect(map,obj.id,[{x:x0-areaPos,y:y0-areaPos},{x0+areaPos,y:y0+areaPos}],point0,sIndex);
			map.addRect(obj.id,[x0-areaPos-mapStart.x,y0-areaPos-mapStart.y,x0+areaPos-mapStart.x,y0+areaPos-mapStart.y],sIndex);
		}

	},
	_strokeChartItem:function(ctx,x0,y0,R,type){
		var p=[];
		if(type && (type=="square" || type=="s")){
			R *= Math.sqrt(2)/2;
			p = [
				[x0-R-ctx.lineWidth/2,y0-R],
				[x0+R,y0-R],
				[x0+R,y0+R],
				[x0-R,y0+R],
				[x0-R,y0-R]
			];
		}
		else if(type && (type=="diamond" || type=="d")){
			var corr = (ctx.lineWidth>1?ctx.lineWidth*Math.sqrt(2)/4:0);
			p = [
				[x0,y0-R],
				[x0+R,y0],
				[x0,y0+R],
				[x0-R,y0],
				[x0+corr,y0-R-corr]
			];
		}
		else if(type && (type=="triangle" || type=="t")){
			p = [
				[x0,y0-R],
				[x0+Math.sqrt(3)*R/2,y0+R/2],
				[x0-Math.sqrt(3)*R/2,y0+R/2],
				[x0,y0-R]
			];
		}
		else
			p = [
				[x0,y0,R,0,Math.PI*2,true]
			];
		this._path(ctx,p);
	},
	/**
	*   gets the vertical position of the item
	*   @param: data - data object
	*   @param: y0 - the y position of chart start
	*   @param: y1 - the y position of chart end
	*   @param: params - the object with elements: minValue, maxValue, unit, valueFactor (the value multiple of 10)
	*/
	_getPointY: function(data,point0,point1,params){
		var minValue = params.minValue;
		var maxValue = params.maxValue;
		var unit = params.unit;
		var valueFactor = params.valueFactor;
		/*the real value of an object*/
		var value = this._settings.value(data);
		if(this._logScaleCalc){
			value = this._log10(value);
		}
		/*a relative value*/
		var v = (parseFloat(value||0) - minValue)*valueFactor;
		if(!this._settings.yAxis)
			v += params.startValue/unit;
		/*a vertical coordinate*/
		var y = point1.y - unit*v;
		/*the limit of the max and min values*/
		if(this._settings.fixOverflow && ( this._settings.type == "line" || this._settings.type == "area")){
			if(value > maxValue)
				y = {y: point0.y, y0:  y, out: "max"};
			else if(v<0 || value < minValue)
				y = {y: point1.y, y0:  y, out: "min"};
		}
		else{
			if(value > maxValue)
				y =  point0.y;
			if(v<0 || value < minValue)
				y =  point1.y;
		}
		return y;
	},
	_calculateLineParams: function(ctx,data,point0,point1,sIndex){
		var params = {};

		/*maxValue - minValue*/
		var relValue;

		/*available height*/
		params.totalHeight = point1.y-point0.y;

		/*a space available for a single item*/
		//params.cellWidth = Math.round((point1.x-point0.x)/((!this._settings.offset&&this._settings.yAxis)?(data.length-1):data.length));
		if(this._settings.cellWidth)
			params.cellWidth = Math.min(point1.x-point0.x, this._settings.cellWidth);
		else
			params.cellWidth = (point1.x-point0.x)/((!this._settings.offset)?(data.length-1):data.length);
		/*scales*/
		var yax = !!this._settings.yAxis;

		var limits = (this._settings.type.indexOf("stacked")!=-1?this._getStackedLimits(data):this._getLimits());
		params.maxValue = limits.max;
		params.minValue = limits.min;

		/*draws x and y scales*/
		if(!sIndex)
			this._drawScales(data, point0, point1,params.minValue,params.maxValue,params.cellWidth);

		/*necessary for automatic scale*/
		if(yax){
		    params.maxValue = parseFloat(this._settings.yAxis.end);
			params.minValue = parseFloat(this._settings.yAxis.start);
		}

		/*unit calculation (y_position = value*unit)*/
		var relativeValues = this._getRelativeValue(params.minValue,params.maxValue);
		relValue = relativeValues[0];
		params.valueFactor = relativeValues[1];
		params.unit = (relValue?params.totalHeight/relValue:10);

		params.startValue = 0;
		if(!yax){
			/*defines start value for better representation of small values*/
			params.startValue = 10;
			if(params.unit!=params.totalHeight)
				params.unit = (relValue?(params.totalHeight - params.startValue)/relValue:10);
		}
		return params;
	}
});


webix.extend(webix.ui.chart, {
	/**
	*   renders a bar chart
	*   @param: ctx - canvas object
	*   @param: data - object those need to be displayed
	*   @param: x - the width of the container
	*   @param: y - the height of the container
	*   @param: sIndex - index of drawing chart
	*/
	$render_barH:function(ctx, data, point0, point1, sIndex, map){
		var barOffset, barWidth, cellWidth, color, gradient, i, limits, maxValue, minValue,
			innerGradient, valueFactor, relValue, radius, relativeValues,
			startValue, totalWidth,value,  unit, x0, y0, xax;

		/*an available width for one bar*/
		cellWidth = (point1.y-point0.y)/data.length;

		limits = this._getLimits("h");

		maxValue = limits.max;
		minValue = limits.min;

		totalWidth = point1.x-point0.x;

		xax = !!this._settings.xAxis;

		/*draws x and y scales*/
		if(!sIndex )
			this._drawHScales(ctx,data,point0, point1,minValue,maxValue,cellWidth);

		/*necessary for automatic scale*/
		if(xax ){
			maxValue = parseFloat(this._settings.xAxis.end);
			minValue = parseFloat(this._settings.xAxis.start);
		}

		/*unit calculation (bar_height = value*unit)*/
		relativeValues = this._getRelativeValue(minValue,maxValue);
		relValue = relativeValues[0];
		valueFactor = relativeValues[1];

		unit = (relValue?totalWidth/relValue:10);
		if(!xax){
			/*defines start value for better representation of small values*/
			startValue = 10;
			unit = (relValue?(totalWidth-startValue)/relValue:10);
		}


		/*a real bar width */
		barWidth = parseInt(this._settings.barWidth,10);
		if((barWidth*this._series.length+4)>cellWidth) barWidth = cellWidth/this._series.length-4;
		/*the half of distance between bars*/
		barOffset = Math.floor((cellWidth - barWidth*this._series.length)/2);
		/*the radius of rounding in the top part of each bar*/
		radius = (typeof this._settings.radius!="undefined"?parseInt(this._settings.radius,10):Math.round(barWidth/5));

		innerGradient = false;
		gradient = this._settings.gradient;

		if (gradient&&typeof(gradient) != "function"){
			innerGradient = gradient;
			gradient = false;
		} else if (gradient){
			gradient = ctx.createLinearGradient(point0.x,point0.y,point1.x,point0.y);
			this._settings.gradient(gradient);
		}
		/*draws a black line if the horizontal scale isn't defined*/
		if(!xax){
			this._drawLine(ctx,point0.x-0.5,point0.y,point0.x-0.5,point1.y,"#000000",1); //hardcoded color!
		}



		for(i=0; i < data.length;i ++){


			value =  parseFloat(this._settings.value(data[i]||0));
			if(this._logScaleCalc)
				value = this._log10(value);
			
			if(!value || isNaN(value))
				continue;

			if(value>maxValue) value = maxValue;
			value -= minValue;
			value *= valueFactor;

			/*start point (bottom left)*/
			x0 = point0.x;
			y0 = point0.y+ barOffset + i*cellWidth+(barWidth+1)*sIndex;

			if((value<0&&this._settings.origin=="auto")||(this._settings.xAxis&&value===0&&!(this._settings.origin!="auto"&&this._settings.origin>minValue))){
				this.canvases[sIndex].renderTextAt("middle", "right", x0+10,y0+barWidth/2+barOffset,this._settings.label(data[i]));
				continue;
			}
			if(value<0&&this._settings.origin!="auto"&&this._settings.origin>minValue){
				value = 0;
			}

			/*takes start value into consideration*/
			if(!xax) value += startValue/unit;
			color = gradient||this._settings.color.call(this,data[i]);

			/*drawing the gradient border of a bar*/
			if(this._settings.border){
				this._drawBarHBorder(ctx,x0,y0,barWidth,minValue,radius,unit,value,color);
			}

			/*drawing bar body*/
			ctx.globalAlpha = this._settings.alpha.call(this,data[i]);
			var points = this._drawBarH(ctx,point1,x0,y0,barWidth,minValue,radius,unit,value,color,gradient,innerGradient);
			if (innerGradient){
				this._drawBarHGradient(ctx,x0,y0,barWidth,minValue,radius,unit,value,color,innerGradient);

			}
			ctx.globalAlpha = 1;


			/*sets a bar label and map area*/

			if(points[3]==y0){
				this.canvases[sIndex].renderTextAt("middle", "left", points[0]-5,points[3]+Math.floor(barWidth/2),this._settings.label(data[i]));
				map.addRect(data[i].id,[points[0]-point0.x,points[3]-point0.y,points[2]-point0.x,points[3]+barWidth-point0.y],sIndex);

			}else{
				this.canvases[sIndex].renderTextAt("middle", false, points[2]+5,points[1]+Math.floor(barWidth/2),this._settings.label(data[i]));
				map.addRect(data[i].id,[points[0]-point0.x,y0-point0.y,points[2]-point0.x,points[3]-point0.y],sIndex);
			}

		}
	},
	/**
	 *   sets points for bar and returns the position of the bottom right point
	 *   @param: ctx - canvas object
	 *   @param: x0 - the x position of start point
	 *   @param: y0 - the y position of start point
	 *   @param: barWidth - bar width
	 *   @param: radius - the rounding radius of the top
	 *   @param: unit - the value defines the correspondence between item value and bar height
	 *   @param: value - item value
	 *   @param: offset - the offset from expected bar edge (necessary for drawing border)
	 */
	_setBarHPoints:function(ctx,x0,y0,barWidth,radius,unit,value,offset,skipLeft){
		/*correction for displaing small values (when rounding radius is bigger than bar height)*/
		var angle_corr = 0;

		if(radius>unit*value){
			var sinA = (radius-unit*value)/radius;
			angle_corr = -Math.asin(sinA)+Math.PI/2;
		}
		/*start*/
		ctx.moveTo(x0,y0+offset);
		/*start of left rounding*/
		var x1 = x0 + unit*value - radius - (radius?0:offset);
		x1 = Math.max(x0,x1);
		if(radius<unit*value)
			ctx.lineTo(x1,y0+offset);
		/*left rounding*/
		var y2 = y0 + radius;
		if (radius&&radius>0)
			ctx.arc(x1,y2,radius-offset,-Math.PI/2+angle_corr,0,false);
		/*start of right rounding*/
		var y3 = y0 + barWidth - radius - (radius?0:offset);
		var x3 = x1 + radius - (radius?offset:0);
		ctx.lineTo(x3,y3);
		/*right rounding*/
		if (radius&&radius>0)
			ctx.arc(x1,y3,radius-offset,0,Math.PI/2-angle_corr,false);
		/*bottom right point*/
		var y5 = y0 + barWidth-offset;
		ctx.lineTo(x0,y5);
		/*line to the start point*/
		if(!skipLeft){
			ctx.lineTo(x0,y0+offset);
		}
		//	ctx.lineTo(x0,0); //IE fix!
		return [x3,y5];
	},
	_drawHScales:function(ctx,data,point0,point1,start,end,cellWidth){
		var x = 0;
		if(this._settings.xAxis){
			if(!this.canvases["x"])
				this.canvases["x"] =  this._createCanvas("axis_x");
			x = this._drawHXAxis(this.canvases["x"].getCanvas(),data,point0,point1,start,end);
		}
		if (this._settings.yAxis){
			if(!this.canvases["y"])
				this.canvases["y"] =  this._createCanvas("axis_y");
			this._drawHYAxis(this.canvases["y"].getCanvas(),data,point0,point1,cellWidth,x);
		}
	},
	_drawHYAxis:function(ctx,data,point0,point1,cellWidth,yAxisX){
		if (!this._settings.yAxis) return;
		var unitPos;
		var x0 = parseInt((yAxisX?yAxisX:point0.x),10)-0.5;
		var y0 = point1.y+0.5;
		var y1 = point0.y;
		this._drawLine(ctx,x0,y0,x0,y1,this._settings.yAxis.color,1);



		for(var i=0; i < data.length;i ++){

			/*scale labels*/
			var right = ((this._settings.origin!="auto")&&(this._settings.type=="barH")&&(parseFloat(this._settings.value(data[i]))<this._settings.origin));
			unitPos = y1+cellWidth/2+i*cellWidth;
			this.canvases["y"].renderTextAt("middle",(right?false:"left"),(right?x0+5:x0-5),unitPos,
				this._settings.yAxis.template(data[i]),
				"webix_axis_item_y",(right?0:x0-10)
			);
			if(this._settings.yAxis.lines.call(this,data[i]))
				this._drawLine(ctx,point0.x,unitPos,point1.x,unitPos,this._settings.yAxis.lineColor.call(this,data[i]),1);
		}

		if(this._settings.yAxis.lines.call(this,{}))
			this._drawLine(ctx,point0.x+0.5,y1+0.5,point1.x,y1+0.5,this._settings.yAxis.lineColor.call(this,{}),1);
		this._setYAxisTitle(point0,point1);
	},
	_drawHXAxis:function(ctx,data,point0,point1,start,end){
		var step;
		var scaleParam= {};
		var axis = this._settings.xAxis;
		if (!axis) return;

		var y0 = point1.y+0.5;
		var x0 = point0.x-0.5;
		var x1 = point1.x-0.5;
		var yAxisStart = point0.x;
		this._drawLine(ctx,x0,y0,x1,y0,axis.color,1);

		if(axis.step)
			step = parseFloat(axis.step);

		if(typeof this._configXAxis.step =="undefined"||typeof this._configXAxis.start=="undefined"||typeof this._configXAxis.end =="undefined"){
			scaleParam = this._calculateScale(start,end);
			start = scaleParam.start;
			end = scaleParam.end;
			step = scaleParam.step;
			this._settings.xAxis.end = end;
			this._settings.xAxis.start = start;
			this._settings.xAxis.step = step;
		}

		if(step===0) return;
		var stepHeight = (x1-x0)*step/(end-start);
		var c = 0;
		for(var i = start; i<=end; i += step){
			var value = this._logScaleCalc?Math.pow(10,i):i;
			if(scaleParam.fixNum)  value = parseFloat(value).toFixed(scaleParam.fixNum);
			var xi = Math.floor(x0+c*stepHeight)+ 0.5;/*canvas line fix*/

			if(!(i==start&&this._settings.origin=="auto") &&axis.lines.call(this,i))
				this._drawLine(ctx,xi,y0,xi,point0.y,this._settings.xAxis.lineColor.call(this,i),1);
			if(i == this._settings.origin) yAxisStart = xi+1;
			/*correction for JS float calculation*/
			if(step<1 && !this._logScaleCalc){
				var power = Math.min(Math.floor(this._log10(step)),(start<=0?0:Math.floor(this._log10(start))));
				var corr = Math.pow(10,-power);
				value = Math.round(value*corr)/corr;
				i = value;
			}
			this.canvases["x"].renderTextAt(false, true,xi,y0+2,axis.template(value.toString()),"webix_axis_item_x");
			c++;
		}
		this.canvases["x"].renderTextAt(true, false, x0,point1.y+this._settings.padding.bottom-3,
			this._settings.xAxis.title,
			"webix_axis_title_x",
			point1.x - point0.x
		);
		/*the right border in lines in scale are enabled*/
		if (!axis.lines.call(this,{})){
			this._drawLine(ctx,x0,point0.y-0.5,x1,point0.y-0.5,this._settings.xAxis.color,0.2);
		}
		return yAxisStart;
	},
	_correctBarHParams:function(ctx,x,y,value,unit,barWidth,minValue){
		var yax = this._settings.yAxis;
		var axisStart = x;
		if(!!yax&&this._settings.origin!="auto" && (this._settings.origin>minValue)){
			x += (this._settings.origin-minValue)*unit;
			axisStart = x;
			value = value-(this._settings.origin-minValue);
			if(value < 0){
				value *= (-1);
				ctx.translate(x,y+barWidth);
				ctx.rotate(Math.PI);
				x = 0.5;
				y = 0;
			}
			x += 0.5;
		}

		return {value:value,x0:x,y0:y,start:axisStart};
	},
	_drawBarH:function(ctx,point1,x0,y0,barWidth,minValue,radius,unit,value,color,gradient,inner_gradient){
		ctx.save();
		var p = this._correctBarHParams(ctx,x0,y0,value,unit,barWidth,minValue);
		ctx.fillStyle = color;
		ctx.beginPath();
		var points = this._setBarHPoints(ctx,p.x0,p.y0,barWidth,radius,unit,p.value,(this._settings.border?1:0));
		if (gradient&&!inner_gradient) ctx.lineTo(point1.x,p.y0+(this._settings.border?1:0)); //fix gradient sphreading
		ctx.fill();
		ctx.restore();
		var y1 = p.y0;
		var y2 = (p.y0!=y0?y0:points[1]);
		var x1 = (p.y0!=y0?(p.start-points[0]):p.start);
		var x2 = (p.y0!=y0?p.start:points[0]);

		return [x1,y1,x2,y2];
	},
	_drawBarHBorder:function(ctx,x0,y0,barWidth,minValue,radius,unit,value,color){
		ctx.save();
		var p = this._correctBarHParams(ctx,x0,y0,value,unit,barWidth,minValue);

		ctx.beginPath();
		this._setBorderStyles(ctx,color);
		ctx.globalAlpha =0.9;
		this._setBarHPoints(ctx,p.x0,p.y0,barWidth,radius,unit,p.value,ctx.lineWidth/2,1);

		ctx.stroke();
		ctx.restore();
	},
	_drawBarHGradient:function(ctx,x0,y0,barWidth,minValue,radius,unit,value,color,inner_gradient){
		ctx.save();
		//y0 -= (webix.env.isIE?0:0.5);
		var p = this._correctBarHParams(ctx,x0,y0,value,unit,barWidth,minValue);
		var gradParam = this._setBarGradient(ctx,p.x0,p.y0+barWidth,p.x0+unit*p.value,p.y0,inner_gradient,color,"x");
		ctx.fillStyle = gradParam.gradient;
		ctx.beginPath();
		this._setBarHPoints(ctx,p.x0,p.y0+gradParam.offset,barWidth-gradParam.offset*2,radius,unit,p.value,gradParam.offset);
		ctx.fill();
		ctx.globalAlpha = 1;
		ctx.restore();
	}
});
		
webix.extend(webix.ui.chart, {
	/**
	*   renders a bar chart
	*   @param: ctx - canvas object
	*   @param: data - object those need to be displayed
	*   @param: x - the width of the container
	*   @param: y - the height of the container
	*   @param: sIndex - index of drawing chart
	*/
	$render_stackedBar:function(ctx, data, point0, point1, sIndex, map){
		var maxValue,minValue, xAxisY, x0, y0;
		/*necessary if maxValue - minValue < 0*/
		var valueFactor;
		/*maxValue - minValue*/
		var relValue;
		var config = this._settings;
		var total_height = point1.y-point0.y;

		var yax = !!config.yAxis;
		var xax = !!config.xAxis;

		var limits = this._getStackedLimits(data);

		var origin = (config.origin === 0);

		maxValue = limits.max;
		minValue = limits.min;

		/*an available width for one bar*/
		var cellWidth = Math.floor((point1.x-point0.x)/data.length);

		/*draws x and y scales*/
		if(!sIndex){
			xAxisY = this._drawScales(data,point0, point1,minValue,maxValue,cellWidth);
		}

		/*necessary for automatic scale*/
		if(yax){
			maxValue = parseFloat(config.yAxis.end);
			minValue = parseFloat(config.yAxis.start);
		}

		/*unit calculation (bar_height = value*unit)*/
		var relativeValues = this._getRelativeValue(minValue,maxValue);
		relValue = relativeValues[0];
		valueFactor = relativeValues[1];

		var unit = (relValue?total_height/relValue:10);

		/*a real bar width */
		var barWidth = parseInt(config.barWidth,10);
		if(barWidth+4 > cellWidth) barWidth = cellWidth-4;
		/*the half of distance between bars*/
		var barOffset = Math.floor((cellWidth - barWidth)/2);


		var inner_gradient = (config.gradient?config.gradient:false);

		/*draws a black line if the horizontal scale isn't defined*/
		if(!xax){
			//scaleY = y-bottomPadding;
			this._drawLine(ctx,point0.x,point1.y+0.5,point1.x,point1.y+0.5,"#000000",1); //hardcoded color!
		}

		for(var i=0; i < data.length;i ++){
			var value =  parseFloat(config.value(data[i]||0));

			if(this._logScaleCalc)
				value = this._log10(value);

			/*start point (bottom left)*/
			x0 = point0.x + barOffset + i*cellWidth;


			var negValue = origin&&value<0;
			if(!sIndex){
				y0 = xAxisY-1;
				data[i].$startY = y0;
				if(origin){
					if(negValue)
						y0 = xAxisY+1;
					data[i].$startYN = xAxisY+1;
				}
			}
			else{
				y0 = negValue?data[i].$startYN:data[i].$startY;
			}

			if(!value || isNaN(value))
				continue;

			/*adjusts the first tab to the scale*/
			if(!sIndex && !origin)
				value -= minValue;

			value *= valueFactor;

			/*the max height limit*/
			if(y0 < (point0.y+1)) continue;

			var color = this._settings.color.call(this,data[i]);

			var firstSector =  Math.abs(y0-(origin?(point1.y+minValue*unit):point1.y))<3;

			/*drawing bar body*/
			ctx.globalAlpha = config.alpha.call(this,data[i]);
			ctx.fillStyle = ctx.strokeStyle = config.color.call(this,data[i]);
			ctx.beginPath();

			var y1 = y0 - unit*value + (firstSector?(negValue?-1:1):0);

			var points = this._setStakedBarPoints(ctx,x0-(config.border?0.5:0),y0,barWidth+(config.border?0.5:0),y1, 0,point0.y);
			ctx.fill();
			ctx.stroke();

			/*gradient*/
			if (inner_gradient){
				ctx.save();
				var gradParam = this._setBarGradient(ctx,x0,y0,x0+barWidth,points[1],inner_gradient,color,"y");
				ctx.fillStyle = gradParam.gradient;
				ctx.beginPath();
				points = this._setStakedBarPoints(ctx,x0+gradParam.offset,y0,barWidth-gradParam.offset*2,y1,(config.border?1:0),point0.y);
				ctx.fill();
				ctx.restore();
			}
			/*drawing the gradient border of a bar*/
			if(config.border){
				ctx.save();
				if(typeof config.border == "string")
					ctx.strokeStyle = config.border;
				else
					this._setBorderStyles(ctx,color);
				ctx.beginPath();

				this._setStakedBarPoints(ctx,x0-0.5,parseInt(y0,10)+0.5,barWidth+1,parseInt(y1,10)+0.5,0,point0.y, firstSector);
				ctx.stroke();
				ctx.restore();
			}
			ctx.globalAlpha = 1;

			/*sets a bar label*/
			this.canvases[sIndex].renderTextAt(false, true, x0+Math.floor(barWidth/2),(points[1]+(y0-points[1])/2)-7,this._settings.label(data[i]));
			/*defines a map area for a bar*/
			map.addRect(data[i].id,[x0-point0.x,points[1]-point0.y,points[0]-point0.x,data[i][negValue?"$startYN":"$startY"]-point0.y],sIndex);

			/*the start position for the next series*/

			data[i][negValue?"$startYN":"$startY"] = points[1];

		}
	},
	/**
	 *   sets points for bar and returns the position of the bottom right point
	 *   @param: ctx - canvas object
	 *   @param: x0 - the x position of start point
	 *   @param: y0 - the y position of start point
	 *   @param: barWidth - bar width
	 *   @param: radius - the rounding radius of the top
	 *   @param: unit - the value defines the correspondence between item value and bar height
	 *   @param: value - item value
	 *   @param: offset - the offset from expected bar edge (necessary for drawing border)
	 *   @param: minY - the minimum y position for the bars ()
	 */
	_setStakedBarPoints:function(ctx,x0,y0,barWidth,y1,offset,minY,skipBottom){
		/*start*/
		ctx.moveTo(x0,y0);
		/*maximum height limit*/

		if(y1<minY)
			y1 = minY;
		ctx.lineTo(x0,y1);
		var x3 = x0 + barWidth;
		var y3 = y1;
		ctx.lineTo(x3,y3);
		/*right rounding*/
		/*bottom right point*/
		var x5 = x0 + barWidth;
		ctx.lineTo(x5,y0);
		/*line to the start point*/
		if(!skipBottom){
			ctx.lineTo(x0,y0);
		}
		//	ctx.lineTo(x0,0); //IE fix!
		return [x5,y3];
	}
});	

webix.extend(webix.ui.chart, {
/**
	*   renders a bar chart
	*   @param: ctx - canvas object
	*   @param: data - object those need to be displayed
	*   @param: x - the width of the container
	*   @param: y - the height of the container
	*   @param: sIndex - index of drawing chart
	*   @param: map - map object
	*/
	$render_stackedBarH:function(ctx, data, point0, point1, sIndex, map){
		var maxValue,minValue;
		/*necessary if maxValue - minValue < 0*/
		var valueFactor;
		/*maxValue - minValue*/
		var relValue;

		var total_width = point1.x-point0.x;

		var yax = !!this._settings.yAxis;

		var limits = this._getStackedLimits(data);
		maxValue = limits.max;
		minValue = limits.min;

		/*an available width for one bar*/
		var cellWidth = Math.floor((point1.y-point0.y)/data.length);

		/*draws x and y scales*/
		if(!sIndex)
			this._drawHScales(ctx,data,point0, point1,minValue,maxValue,cellWidth);

		/*necessary for automatic scale*/
		if(yax){
			maxValue = parseFloat(this._settings.xAxis.end);
			minValue = parseFloat(this._settings.xAxis.start);
		}

		/*unit calculation (bar_height = value*unit)*/
		var relativeValues = this._getRelativeValue(minValue,maxValue);
		relValue = relativeValues[0];
		valueFactor = relativeValues[1];

		var unit = (relValue?total_width/relValue:10);
		var startValue = 0;
		if(!yax){
			/*defines start value for better representation of small values*/
			startValue = 10;
			unit = (relValue?(total_width-startValue)/relValue:10);
		}

		/*a real bar width */
		var barWidth = parseInt(this._settings.barWidth,10);
		if((barWidth+4)>cellWidth) barWidth = cellWidth-4;
		/*the half of distance between bars*/
		var barOffset = (cellWidth - barWidth)/2;
		/*the radius of rounding in the top part of each bar*/
		var radius = 0;

		var inner_gradient = false;
		var gradient = this._settings.gradient;
		if (gradient){
			inner_gradient = true;
		}
		/*draws a black line if the horizontal scale isn't defined*/
		if(!yax){
			this._drawLine(ctx,point0.x-0.5,point0.y,point0.x-0.5,point1.y,"#000000",1); //hardcoded color!
		}

		var seriesNumber = 0;
		var seriesIndex = 0;
		for(i=0; i<this._series.length; i++ ){
			if(i == sIndex){
				seriesIndex  = seriesNumber;
			}
			if(this._series[i].type == "stackedBarH")
				seriesNumber++;
		}

		for(var i=0; i < data.length;i ++){

			if(!seriesIndex)
				data[i].$startX = point0.x;

			var value =  parseFloat(this._settings.value(data[i]||0));
			if(value>maxValue) value = maxValue;
			value -= minValue;
			value *= valueFactor;

			/*start point (bottom left)*/
			var x0 = point0.x;
			var y0 = point0.y+ barOffset + i*cellWidth;

			if(!seriesIndex)
				data[i].$startX = x0;
			else
				x0 = data[i].$startX;

			if(!value || isNaN(value))
				continue;

			/*takes start value into consideration*/
			if(!yax) value += startValue/unit;
			var color = this._settings.color.call(this,data[i]);


			/*drawing bar body*/
			ctx.globalAlpha = this._settings.alpha.call(this,data[i]);
			ctx.fillStyle = this._settings.color.call(this,data[i]);
			ctx.beginPath();
			var points = this._setBarHPoints(ctx,x0,y0,barWidth,radius,unit,value,0);
			if (gradient&&!inner_gradient) ctx.lineTo(point0.x+total_width,y0+(this._settings.border?1:0)); //fix gradient sphreading
			ctx.fill();

			if (inner_gradient){
				var gradParam = this._setBarGradient(ctx,x0,y0+barWidth,x0,y0,inner_gradient,color,"x");
				ctx.fillStyle = gradParam.gradient;
				ctx.beginPath();
				points = this._setBarHPoints(ctx,x0,y0, barWidth,radius,unit,value,0);
				ctx.fill();
			}
			/*drawing the gradient border of a bar*/
			if(this._settings.border){
				this._drawBarHBorder(ctx,x0,y0,barWidth,minValue,radius,unit,value,color);
			}

			ctx.globalAlpha = 1;

			/*sets a bar label*/
			this.canvases[sIndex].renderTextAt("middle",true,data[i].$startX+(points[0]-data[i].$startX)/2-1, y0+(points[1]-y0)/2, this._settings.label(data[i]));
			/*defines a map area for a bar*/
			map.addRect(data[i].id,[data[i].$startX-point0.x,y0-point0.y,points[0]-point0.x,points[1]-point0.y],sIndex);
			/*the start position for the next series*/
			data[i].$startX = points[0];
		}
	}
});
webix.extend(webix.ui.chart, {
	/**
	*   renders a spline chart
	*   @param: ctx - canvas object
	*   @param: data - object those need to be displayed
	*   @param: width - the width of the container
	*   @param: height - the height of the container
	*   @param: sIndex - index of drawing chart
	*/
	$render_spline:function(ctx, data, point0, point1, sIndex, map){
		var config,i,items,j,params,sparam,x,x0,x1,x2,y,y1,y2;
		params = this._calculateLineParams(ctx,data,point0,point1,sIndex);
		config = this._settings;
		this._mapStart = point0;

		/*array of all points*/
		items = [];

		/*drawing all items*/
		if (data.length) {

			/*getting all points*/
			x0 = (config.offset?point0.x+params.cellWidth*0.5:point0.x);
			for(i=0; i < data.length;i ++){
				y = this._getPointY(data[i],point0,point1,params);
				if(y || y=="0"){
					x = ((!i)?x0:params.cellWidth*i - 0.5 + x0);
					items.push({x:x,y:y,v:this._settings.value(data[i]),index:i});
				}
			}
			sparam = this._getSplineParameters(items);

			for(i =0; i< items.length; i++){
				x1 = items[i].x;
				y1 = items[i].y;
				if(i<items.length-1){
					x2 = items[i+1].x;
					y2 = items[i+1].y;
					for(j = x1; j < x2; j++){
						var sY1 = this._getSplineYPoint(j,x1,i,sparam.a,sparam.b,sparam.c,sparam.d);
						if(sY1<point0.y)
							sY1=point0.y;
						if(sY1>point1.y)
							sY1=point1.y;
						var sY2 = this._getSplineYPoint(j+1,x1,i,sparam.a,sparam.b,sparam.c,sparam.d);
						if(sY2<point0.y)
							sY2=point0.y;
						if(sY2>point1.y)
							sY2=point1.y;
						this._drawLine(ctx,j,sY1,j+1,sY2,config.line.color(data[i]),config.line.width);

					}
					this._drawLine(ctx,x2-1,this._getSplineYPoint(j,x1,i,sparam.a,sparam.b,sparam.c,sparam.d),x2,y2,config.line.color(data[i]),config.line.width);
				}
				this._drawItem(ctx,x1,y1,data[items[i].index],config.label(data[items[i].index]), sIndex, map);
			}
		}
	},
	/*gets spline parameter*/
	_getSplineParameters:function(points){
		var a ,b, c, d, i, s, u, v,
			h = [],
			m = [],
			n = points.length;

		for(i =0; i<n-1;i++){
			h[i] = points[i+1].x - points[i].x;
			m[i] = (points[i+1].y - points[i].y)/h[i];
		}
		u = [];	v = [];
		u[0] = 0;
		u[1] = 2*(h[0] + h[1]);
		v[0] = 0;
		v[1] = 6*(m[1] - m[0]);
		for(i =2; i < n-1; i++){
			u[i] = 2*(h[i-1]+h[i]) - h[i-1]*h[i-1]/u[i-1];
			v[i] = 6*(m[i]-m[i-1]) - h[i-1]*v[i-1]/u[i-1];
		}

		s = [];
		s[n-1] = s[0] = 0;
		for(i = n -2; i>=1; i--)
			s[i] = (v[i] - h[i]*s[i+1])/u[i];

		a = []; b = []; c = [];	d = [];

		for(i =0; i<n-1;i++){
			a[i] = points[i].y;
			b[i] = - h[i]*s[i+1]/6 - h[i]*s[i]/3 + (points[i+1].y-points[i].y)/h[i];
			c[i] = s[i]/2;
			d[i] = (s[i+1] - s[i])/(6*h[i]);
		}

		for (i=0; i<points.length-1; i++){
			if (points[i].v === 0 && points[i+1].v === 0){
				a[i] = points[i].y;
				d[i] = c[i] = b[i] = 0;
			}
		}
		
		return {a:a,b:b,c:c,d:d};
	},
	/*returns the y position of the spline point */
	_getSplineYPoint:function(x,xi,i,a,b,c,d){
		return a[i] + (x - xi)*(b[i] + (x-xi)*(c[i]+(x-xi)*d[i]));
	}
});
webix.extend(webix.ui.chart,{
	/**
	*   renders an area chart
	*   @param: ctx - canvas object
	*   @param: data - object those need to be displayed
	*   @param: width - the width of the container
	*   @param: height - the height of the container
	*   @param: sIndex - index of drawing chart
	*/
	$render_area:function(ctx, data, point0, point1, sIndex, map){

		var align, config, i, mapRect, obj, params, path,
			res1, res2, x0, x1, y1, x2, y2, y0;

		params = this._calculateLineParams(ctx,data,point0,point1,sIndex);
		config = this._settings;

		//the size of map area
		mapRect = (config.eventRadius||Math.floor(params.cellWidth/2));

		if (data.length) {

			// area points
			path = [];

			//the x position of the first item
			x0 = (!config.offset?point0.x:point0.x+params.cellWidth*0.5);

			/*
			 iterates over all data items:
			 calculates [x,y] for area path, adds rect to chart map and renders labels
			 */
			for(i=0; i < data.length;i ++){
				obj = data[i];

				res2 = this._getPointY(obj,point0,point1,params);
				x2 = x0 + params.cellWidth*i ;
				if(res2){
					y2 = (typeof res2 == "object"?res2.y0:res2);
					if(i && this._settings.fixOverflow){
						res1 = this._getPointY(data[i-1],point0,point1,params);
						if(res1.out && res1.out == res2.out){
							continue;
						}
						x1 = params.cellWidth*(i-1) - 0.5 + x0;
						y1 = (typeof res1 == "object"?res1.y0:res1);
						if(res1.out){
							y0 = (res1.out == "min"?point1.y:point0.y);
							path.push([this._calcOverflowX(x1,x2,y1,y2,y0),y0]);
						}
						if(res2.out){
							y0 = (res2.out == "min"?point1.y:point0.y);
							path.push([this._calcOverflowX(x1,x2,y1,y2,y0),y0]);
							if(i == (data.length-1) && y0 == point0.y)
								path.push([x2,point0.y]);
						}
					}
					if(!res2.out){
						path.push([x2,y2]);
						//map
						map.addRect(obj.id,[x2-mapRect-point0.x,y2-mapRect-point0.y,x2+mapRect-point0.x,y2+mapRect-point0.y],sIndex);
					}

					//labels
					if(!config.yAxis){
						align = (!config.offset&&(i == data.length-1)?"left":"center");
						this.canvases[sIndex].renderTextAt(false, align, x2, y2-config.labelOffset,config.label(obj));
					}
				}

			}
			if(path.length){
				path.push([x2,point1.y]);
				path.push([path[0][0],point1.y]);
			}



			//filling area
			ctx.globalAlpha = this._settings.alpha.call(this,data[0]);
			ctx.fillStyle = this._settings.color.call(this,data[0]);
			ctx.beginPath();
			this._path(ctx,path);
			ctx.fill();

			ctx.lineWidth = 1;
			ctx.globalAlpha =1;

			//border
			if(config.border){
				ctx.lineWidth = config.borderWidth||1;
				if(config.borderColor)
					ctx.strokeStyle =  config.borderColor.call(this,data[0]);
				else
					this._setBorderStyles(ctx,ctx.fillStyle);

				ctx.beginPath();
				this._path(ctx,path);
				ctx.stroke();

			}


		}
	},
	
	/**
	*   renders an area chart
	*   @param: ctx - canvas object
	*   @param: data - object those need to be displayed
	*   @param: width - the width of the container
	*   @param: height - the height of the container
	*   @param: sIndex - index of drawing chart
	*/
	$render_stackedArea:function(ctx, data, point0, point1, sIndex, map){

		var a0, a1, align, config, i, j, lastItem, mapRect, obj, params, path, x, y, yPos;

		params = this._calculateLineParams(ctx,data,point0,point1,sIndex);

		config = this._settings;

		/*the value that defines the map area position*/
		mapRect = (config.eventRadius||Math.floor(params.cellWidth/2));


		/*drawing all items*/
		if (data.length) {

			// area points
			path = [];

			// y item positions
			yPos = [];

			//the x position of the first item
			x = (!config.offset?point0.x:point0.x+params.cellWidth*0.5);


			var setOffset = function(i,y){
				return sIndex?(data[i].$startY?y-point1.y+data[i].$startY:0):y;
			};

			var solveEquation  = function(x,p0,p1){
				var k = (p1.y - p0.y)/(p1.x - p0.x);
				return  k*x + p0.y - k*p0.x;
			};

			/*
			 iterates over all data items:
			 calculates [x,y] for area path, adds rect to chart map and renders labels
			 */

			for(i=0; i < data.length;i ++){
				obj = data[i];

				if(!i){
					y =  setOffset(i,point1.y);
					path.push([x,y]);
				}
				else{
					x += params.cellWidth ;
				}

				y = setOffset(i,this._getPointY(obj,point0,point1,params));

				yPos.push((isNaN(y)&&!i)?(data[i].$startY||point1.y):y);

				if(y){
					path.push([x,y]);

					//map
					map.addRect(obj.id,[x-mapRect-point0.x,y-mapRect-point0.y,x+mapRect-point0.x,y+mapRect-point0.y],sIndex);

					//labels
					if(!config.yAxis){
						align = (!config.offset&&lastItem?"left":"center");
						this.canvases[sIndex].renderTextAt(false, align, x, y-config.labelOffset,config.label(obj));
					}
				}
			}

			// bottom right point
			path.push([x,setOffset(i-1,point1.y)]);

			// lower border from the end to start
			if(sIndex){
				for(i=data.length-2; i > 0; i --){
					x -= params.cellWidth ;
					y =  data[i].$startY;
					if(y)
						path.push([x,y]);
				}
			}

			// go to start point
			path.push([path[0][0],path[0][1]]);

			// filling path
			ctx.globalAlpha = this._settings.alpha.call(this,data[0]);
			ctx.fillStyle = this._settings.color.call(this,data[0]);
			ctx.beginPath();
			this._path(ctx,path);
			ctx.fill();

			// set y positions of the next series
			for(i=0; i < data.length;i ++){
				y =  yPos[i];

				if(!y){
					if(i == data.length-1){
						y = data[i].$startY;
					}
					for(j =i+1; j< data.length; j++){
						if(yPos[j]){
							a0 =  {x:point0.x,y:yPos[0]};
							a1 =  {x:(point0.x+params.cellWidth*j),y:yPos[j]};
							y = solveEquation(point0.x+params.cellWidth*i,a0,a1);
							break;
						}

					}
				}

				data[i].$startY = y;
			}


		}
	}
});
	 	//+stackedArea
webix.extend(webix.ui.chart, {
	$render_radar:function(ctx,data,x,y,sIndex,map){
		this._renderRadarChart(ctx,data,x,y,sIndex,map);
		
	}, 
	/**
	*   renders a pie chart
	*   @param: ctx - canvas object
	*   @param: data - object those need to be displayed
	*   @param: x - the width of the container
	*   @param: y - the height of the container
	*   @param: ky - value from 0 to 1 that defines an angle of inclination (0<ky<1 - 3D chart)
	*/
	_renderRadarChart:function(ctx,data,point0,point1,sIndex,map){
		if(!data.length)
			return;
		var coord = this._getPieParameters(point0,point1);
		/*scale radius*/
		var radius = (this._settings.radius?this._settings.radius:coord.radius);
		/*scale center*/
		var x0 = (this._settings.x?this._settings.x:coord.x);
		var y0 = (this._settings.y?this._settings.y:coord.y);
		/*angles for each unit*/
		var ratioUnits = [];
		for(var i=0;i<data.length;i++)
			ratioUnits.push(1);
		var ratios = this._getRatios(ratioUnits,data.length);
		this._mapStart = point0;
		if(!sIndex)
			this._drawRadarAxises(ratios,x0,y0,radius,data);
		this._drawRadarData(ctx,ratios,x0,y0,radius,data,sIndex,map);
	},
	_drawRadarData:function(ctx,ratios,x,y,radius,data,sIndex,map){
		var alpha0 ,alpha1, config, i, min, max, pos0, pos1, posArr,
			r0, r1, relValue, startAlpha, value, value0, value1, valueFactor,
			unit, unitArr;
		config = this._settings;
		/*unit calculation (item_radius_pos = value*unit)*/
		min = config.yAxis.start;
		max = config.yAxis.end;
		unitArr = this._getRelativeValue(min,max);
		relValue = unitArr[0];
		unit = (relValue?radius/relValue:radius/2);
		valueFactor = unitArr[1];

		startAlpha = -Math.PI/2;
		alpha0 =  alpha1 = startAlpha;
		posArr = [];
		pos1 = 0;
		for(i=0;i<data.length;i++){
			if(!value1){
				value = config.value(data[i]);
				if(this._logScaleCalc)
					value = this._log10(value);
				/*a relative value*/
				value0 = (parseFloat(value||0) - min)*valueFactor;
			}
			else
				value0 = value1;
			r0 = Math.floor(unit*value0);

			value = config.value((i!=(data.length-1))?data[i+1]:data[0]);
			if(this._logScaleCalc)
				value = this._log10(value);

			value1 = (parseFloat(value||0) - min)*valueFactor;
			r1 = Math.floor(unit*value1);
			alpha0 = alpha1;
			alpha1 = ((i!=(data.length-1))?(startAlpha+ratios[i]-0.0001):startAlpha);
			pos0 = (pos1||this._getPositionByAngle(alpha0,x,y,r0));
			pos1 = this._getPositionByAngle(alpha1,x,y,r1);
			/*creates map area*/
			/*areaWidth  = (config.eventRadius||(parseInt(config.item.radius.call(this,data[i]),10)+config.item.borderWidth));
			 map.addRect(data[i].id,[pos0.x-areaWidth,pos0.y-areaWidth,pos0.x+areaWidth,pos0.y+areaWidth],sIndex);*/
			//this._drawLine(ctx,pos0.x,pos0.y,pos1.x,pos1.y,config.line.color.call(this,data[i]),config.line.width)
			posArr.push(pos0);
		}
		if(config.fill)
			this._fillRadarChart(ctx,posArr,data);
		if(!config.disableLines && data.length>2)
			this._strokeRadarChart(ctx,posArr,data);
		if(!config.disableItems || data.length<3)
			this._drawRadarItemMarkers(ctx,posArr,data,sIndex,map);
		posArr = null;
	},
	_drawRadarItemMarkers:function(ctx,points,data,sIndex,map){
		for(var i=0;i < points.length;i++){
			this._drawItem(ctx,points[i].x,points[i].y,data[i],this._settings.label.call(this,data),sIndex,map);
		}
	},
	_fillRadarChart:function(ctx,points,data){
		var pos0,pos1;
		ctx.globalAlpha= this._settings.alpha.call(this,{});

		ctx.beginPath();
		for(var i=0;i < points.length;i++){
			ctx.fillStyle = this._settings.fill.call(this,data[i]);
			pos0 = points[i];
			pos1 = (points[i+1]|| points[0]);
			if(!i){

				ctx.moveTo(pos0.x,pos0.y);
			}
			ctx.lineTo(pos1.x,pos1.y);
		}
		ctx.fill();
		ctx.globalAlpha=1;
	},
	_strokeRadarChart:function(ctx,points,data){
		var pos0,pos1;
		for(var i=0;i < points.length;i++){
			pos0 = points[i];
			pos1 = (points[i+1]|| points[0]);
			this._drawLine(ctx,pos0.x,pos0.y,pos1.x,pos1.y,this._settings.line.color.call(this,data[i]),this._settings.line.width);
		}
	},
	_drawRadarAxises:function(ratios,x,y,radius,data){
		var configY = this._settings.yAxis;
		var configX = this._settings.xAxis;
		var start = configY.start;
		var end = configY.end;
		var step = configY.step;
		var scaleParam= {};
		var config = this._configYAxis;
		if(typeof config.step =="undefined"||typeof config.start=="undefined"||typeof config.end =="undefined"){
			var limits = this._getLimits();
			scaleParam = this._calculateScale(limits.min,limits.max);
			start = scaleParam.start;
			end = scaleParam.end;
			step = scaleParam.step;
			configY.end = end;
			configY.start = start;
		}
		var units = [];
		var i,j,p;
		var c=0;
		var stepHeight = radius*step/(end-start);
		/*correction for small step*/
		var power,corr;
		if(step<1){
			power = Math.min(this._log10(step),(start<=0?0:this._log10(start)));
			corr = Math.pow(10,-power);
		}
		var angles = [];
		if(!this.canvases["scale"])
			this.canvases["scale"] =  this._createCanvas("radar_scale");
		var ctx = this.canvases["scale"].getCanvas();
		for(i = end; i>=start; i -=step){
			var value = this._logScaleCalc?Math.pow(10,i):i;
			if(scaleParam.fixNum)  value = parseFloat(i).toFixed(scaleParam.fixNum);

			units.push(Math.floor(c*stepHeight)+ 0.5);
			if(corr && !this._logScaleCalc){
				value = Math.round(value*corr)/corr;
				i = value;
			}
			var unitY = y-radius+units[units.length-1];

			this.canvases["scale"].renderTextAt("middle","left",x,unitY,
				configY.template(value.toString()),
				"webix_axis_item_y webix_radar"
			);
			if(ratios.length<2){
				this._drawScaleSector(ctx,"arc",x,y,radius-units[units.length-1],-Math.PI/2,3*Math.PI/2,i);
				return;
			}
			var startAlpha = -Math.PI/2;/*possibly need  to moved in config*/
			var alpha0 = startAlpha;
			var alpha1;

			for(j=0;j< ratios.length;j++){
				if(!c)
					angles.push(alpha0);
				alpha1 = startAlpha+ratios[j]-0.0001;
				this._drawScaleSector(ctx,(ratios.length>2?(config.lineShape||"line"):"arc"),x,y,radius-units[units.length-1],alpha0,alpha1,i,j,data[i]);
				alpha0 = alpha1;
			}
			c++;
		}
		/*renders radius lines and labels*/
		for(i=0;i< angles.length;i++){
			p = this._getPositionByAngle(angles[i],x,y,radius);
			if(configX.lines.call(this,data[i],i))
				this._drawLine(ctx,x,y,p.x,p.y,(configX?configX.lineColor.call(this,data[i]):"#cfcfcf"),1);
			this._drawRadarScaleLabel(ctx,x,y,radius,angles[i],(configX?configX.template.call(this,data[i]):"&nbsp;"));
		}

	},
	_drawScaleSector:function(ctx,shape,x,y,radius,a1,a2,i,j){
		var pos1, pos2;
		if(radius<0)
			return false;
		pos1 = this._getPositionByAngle(a1,x,y,radius);
		pos2 = this._getPositionByAngle(a2,x,y,radius);
		var configY = this._settings.yAxis;
		if(configY.bg){
			ctx.beginPath();
			ctx.moveTo(x,y);
			if(shape=="arc")
				ctx.arc(x,y,radius,a1,a2,false);
			else{
				ctx.lineTo(pos1.x,pos1.y);
				ctx.lineTo(pos2.x,pos2.y);
			}
			ctx.fillStyle =  configY.bg(i,j);
			ctx.moveTo(x,y);
			ctx.fill();
			ctx.closePath();
		}
		if(configY.lines.call(this,i)){
			ctx.lineWidth = 1;
			ctx.beginPath();
			if(shape=="arc")
				ctx.arc(x,y,radius,a1,a2,false);
			else{
				ctx.moveTo(pos1.x,pos1.y);
				ctx.lineTo(pos2.x,pos2.y);
			}
			ctx.strokeStyle = configY.lineColor.call(this,i);
			ctx.stroke();
		}
	},
	_drawRadarScaleLabel:function(ctx,x,y,r,a,text){
		if(!text)
			return false;
		var t = this.canvases["scale"].renderText(0,0,text,"webix_axis_radar_title",1);
		var width = t.scrollWidth;
		var height = t.offsetHeight;
		var delta = 0.001;
		var pos =  this._getPositionByAngle(a,x,y,r+5);
		var corr_x=0,corr_y=0;
		if(a<0||a>Math.PI){
			corr_y = -height;
		}
		if(a>Math.PI/2){
			corr_x = -width;
		}
		if(Math.abs(a+Math.PI/2)<delta||Math.abs(a-Math.PI/2)<delta){
			corr_x = -width/2;
		}
		else if(Math.abs(a)<delta||Math.abs(a-Math.PI)<delta){
			corr_y = -height/2;
		}
		t.style.top  = pos.y+corr_y+"px";
		t.style.left = pos.x+corr_x+"px";
		t.style.width = width+"px";
		t.style.whiteSpace = "nowrap";
	}
});
webix.extend(webix.ui.chart, {

	/**
	*   renders a graphic
	*   @param: ctx - canvas object
	*   @param: data - object those need to be displayed
	*   @param: point0  - top left point of a chart
	*   @param: point1  - right bottom point of a chart
	*   @param: sIndex - index of drawing chart
    *   @param: map - map object
	*/
	$render_scatter:function(ctx, data, point0, point1, sIndex, map){
		if(!this._settings.xValue)
			return webix.log("warning","Undefined propery: xValue");
		/*max in min values*/
		var limitsY = this._getLimits();
		var limitsX = this._getLimits("h","xValue");
		/*render scale*/
		if(!sIndex){
			if(!this.canvases["x"])
				this.canvases["x"] = this._createCanvas("axis_x");
			if(!this.canvases["y"])
				this.canvases["y"] = this._createCanvas("axis_y");
			this._drawYAxis(this.canvases["y"].getCanvas(),data,point0,point1,limitsY.min,limitsY.max);
			this._drawHXAxis(this.canvases["x"].getCanvas(),data,point0,point1,limitsX.min,limitsX.max);
		}
		limitsY = {min:this._settings.yAxis.start,max:this._settings.yAxis.end};
		limitsX = {min:this._settings.xAxis.start,max:this._settings.xAxis.end};
		var params = this._getScatterParams(ctx,data,point0,point1,limitsX,limitsY);
		this._mapStart = point0;
		for(var i=0;i<data.length;i++){
			this._drawScatterItem(ctx,map,point0, point1, params,limitsX,limitsY,data[i],sIndex);
		}
	},
	_getScatterParams:function(ctx, data, point0, point1,limitsX,limitsY){
		var params = {};
		/*available space*/
		params.totalHeight = point1.y-point0.y;
		/*available width*/
		params.totalWidth = point1.x-point0.x;
		/*unit calculation (y_position = value*unit)*/
		this._calcScatterUnit(params,limitsX.min,limitsX.max,params.totalWidth,"X");
		this._calcScatterUnit(params,limitsY.min,limitsY.max,params.totalHeight,"Y");
		return params;
	},
	_drawScatterItem:function(ctx,map,point0, point1,params,limitsX,limitsY,obj,sIndex){
		var x0 = this._calculateScatterItemPosition(params, point1, point0, limitsX, obj, "X");
		var y0 = this._calculateScatterItemPosition(params, point0, point1, limitsY, obj, "Y");
		this. _drawItem(ctx,x0,y0,obj,this._settings.label.call(this,obj),sIndex,map);
	},
	_calculateScatterItemPosition:function(params, point0, point1, limits, obj, axis){
		/*the real value of an object*/
		var value = this._settings[axis=="X"?"xValue":"value"].call(this,obj);
		/*a relative value*/
		var valueFactor = params["valueFactor"+axis];
		var v = (parseFloat(value||0) - limits.min)*valueFactor;
		/*a vertical coordinate*/
		var unit = params["unit"+axis];
		var pos = point1[axis.toLowerCase()] - (axis=="X"?(-1):1)*Math.floor(unit*v);
		/*the limit of the minimum value is  the minimum visible value*/
		if(v<0)
			pos = point1[axis.toLowerCase()];
		/*the limit of the maximum value*/
		if(value > limits.max)
			pos = point0[axis.toLowerCase()];
		/*the limit of the minimum value*/
		if(value < limits.min)
			pos = point1[axis.toLowerCase()];
		return pos;
	},
	_calcScatterUnit:function(p,min,max,size,axis){
		var relativeValues = this._getRelativeValue(min,max);
		axis = (axis||"");
		p["relValue"+axis] = relativeValues[0];
		p["valueFactor"+axis] = relativeValues[1];
		p["unit"+axis] = (p["relValue"+axis]?size/p["relValue"+axis]:10);
	}
});
/*chart presents*/
webix.extend(webix.ui.chart, {
    presets:{
        "simple":{
            item:{
                borderColor: "#ffffff",
                color: "#2b7100",
                shadow: false,
                borderWidth:2
            },
    		line:{
    			color:"#8ecf03",
                width:2
    		}
        },
        "plot":{
            color:"#1293f8",
            item:{
                borderColor:"#636363",
                borderWidth:1,
                color: "#ffffff",
                type:"r",
                shadow: false
            },
    	    line:{
    			color:"#1293f8",
                width:2
    	    }
        },
        "diamond":{
            color:"#b64040",
            item:{
    			borderColor:"#b64040",
    			color: "#b64040",
                type:"d",
                radius:3,
                shadow:true
            },
    		line:{
    			color:"#ff9000",
                width:2
    		}
        },
        "point":{
            color:"#fe5916",
    		disableLines:true,
            fill:false,
            disableItems:false,
            item:{
                color:"#feb916",
                borderColor:"#fe5916",
                radius:2,
                borderWidth:1,
                type:"r"
    	    },
            alpha:1
        },
        "line":{
            line:{
                color:"#3399ff",
                width:2
            },
            item:{
                color:"#ffffff",
                borderColor:"#3399ff",
                radius:2,
                borderWidth:2,
                type:"d"
            },
            fill:false,
            disableItems:false,
            disableLines:false,
            alpha:1
        },
        "area":{
            fill:"#3399ff",
            line:{
                color:"#3399ff",
                width:1
            },
            disableItems:true,
            alpha: 0.2,
            disableLines:false
        },
        "round":{
            item:{
                radius:3,
                borderColor:"#3f83ff",
                borderWidth:1,
                color:"#3f83ff",
                type:"r",
                shadow:false,
                alpha:0.6
            }
        },
        "square":{
             item:{
                radius:3,
                borderColor:"#447900",
                borderWidth:2,
                color:"#69ba00",
                type:"s",
                shadow:false,
                alpha:1
            }
        },
        /*bar*/
        "column":{
            color:"RAINBOW",
            gradient:false,
            barWidth:45,
            radius:0,
            alpha:1,
            border:true
        },
        "stick":{
            barWidth:5,
            gradient:false,
    		color:"#67b5c9",
            radius:2,
            alpha:1,
            border:false
        },
        "alpha":{
            color:"#b9a8f9",
            barWidth:70,
            gradient:"falling",
            radius:0,
            alpha:0.5,
            border:true
        }
    }
});

webix.extend(webix.ui.chart,{
	/**
	 *   renders an splineArea chart
	 *   @param: ctx - canvas object
	 *   @param: data - object those need to be displayed
	 *   @param: width - the width of the container
	 *   @param: height - the height of the container
	 *   @param: sIndex - index of drawing chart
	 */
	$render_splineArea:function(ctx, data, point0, point1, sIndex, map){
		var color, i,items,j,mapRect,params,sParams,
			x,x0,x1,x2,y,y1,y2,
			config = this._settings,
			path = [];

		params = this._calculateLineParams(ctx,data,point0,point1,sIndex);
		mapRect = (config.eventRadius||Math.floor(params.cellWidth/2));
		/*array of all points*/
		items = [];

		if (data.length) {
			/*getting all points*/
			x0 = point0.x;
			for(i=0; i < data.length;i ++){
				y = this._getPointY(data[i],point0,point1,params);
				if(y || y=="0"){
					x = ((!i)?x0:params.cellWidth*i - 0.5 + x0);
					items.push({x:x,y:y,index:i});
					map.addRect(data[i].id,[x-mapRect-point0.x,y-mapRect-point0.y,x+mapRect-point0.x,y+mapRect-point0.y],sIndex);
				}
			}
			
			sParams = this._getSplineParameters(items);

			for(i =0; i< items.length; i++){
				x1 = items[i].x;
				y1 = items[i].y;
				if(i<items.length-1){
					x2 = items[i+1].x;
					y2 = items[i+1].y;
					for(j = x1; j < x2; j++){
						var sY1 = this._getSplineYPoint(j,x1,i,sParams.a,sParams.b,sParams.c,sParams.d);
						if(sY1<point0.y)
							sY1=point0.y;
						if(sY1>point1.y)
							sY1=point1.y;
						var sY2 = this._getSplineYPoint(j+1,x1,i,sParams.a,sParams.b,sParams.c,sParams.d);
						if(sY2<point0.y)
							sY2=point0.y;
						if(sY2>point1.y)
							sY2=point1.y;
						path.push([j,sY1]);
						path.push([j+1,sY2]);
					}
					path.push([x2,y2]);
				}
			}

			color = this._settings.color.call(this,data[0]);

			if(path.length){
				path.push([x2,point1.y]);
				path.push([path[0][0],point1.y]);
			}

			//filling area
			ctx.globalAlpha = this._settings.alpha.call(this,data[0]);
			ctx.fillStyle = color;
			ctx.beginPath();
			this._path(ctx,path);
			ctx.fill();
			ctx.lineWidth = 1;
			ctx.globalAlpha =1;

			// draw line
			if(config.border){
				ctx.lineWidth = config.borderWidth||1;
				if(config.borderColor)
					ctx.strokeStyle =  config.borderColor.call(this,data[0]);
				else
					this._setBorderStyles(ctx,color);
				ctx.beginPath();
				path.splice(path.length-3);
				this._path(ctx,path);
				ctx.stroke();
			}
		}
	}
});

(function(){
	var animateDuration = 400,
		cellWidth = 30;

	webix.extend(webix.ui.chart, {
		dynamic_setter: function(value){
			if(value)
				init(this);
			return value;
		}
	});

	/**
	 * Sets event handlers and properties for a stock chart
	 * @param {object} chart - chart view
	 */
	function init(chart){
		if(chart._stockRenderHandler)
			return;
		var config = chart._settings;

		if(!config.cellWidth)
			config.cellWidth = cellWidth;
		if(!config.animateDuration)
			config.animateDuration = animateDuration;
		config.offset = false;

		chart._stockRenderHandler = chart.attachEvent("onBeforeRender", function(data, type){
			var bounds = chart._getChartBounds(chart._content_width, chart._content_height);
			resizeStockCanvases(chart);
			filterStockData(data, bounds.start, bounds.end, config.cellWidth);
			if(type == "add")
				startAnimation(chart);
		});
		chart._stockXAxisHandler = chart.attachEvent("onBeforeXAxis", function(ctx,data,point0,point1,cellWidth,y){
			drawXAxis(chart,ctx,data,point0,point1,cellWidth,y);
			return false;
		});
	}

	/**
	 * Starts stock animation
	 * @param {object} chart - chart view
	 */
	function startAnimation(chart){
		var cellWidth = chart._settings.cellWidth;
		if(chart._stockAnimationOffset != cellWidth){
			chart._stockAnimationOffset = cellWidth;
			chart.render();
		}

		chart._stockAnimationOffset = 0;
		chart._stockAnimationStart = null;

		if(window.requestAnimationFrame && !document.hidden)
			window.requestAnimationFrame(function(t){
				animate(chart,t);
			});

		if(!chart._stockAnimateHandler)
			chart._stockAnimateHandler = chart.attachEvent("onAfterRender", function(data){
				applyStockOffset(chart, data);
			});
	}

	/**
	 * Animates a chart
	 * @param {object} chart - chart view
	 * @param {number} timestamp - timestamp
	 */
	function animate(chart, timestamp){
		var progress,
			duration = chart._settings.animateDuration,
			cellWidth = chart._settings.cellWidth;

		if(cellWidth && chart.count() > 1){
			if (!chart._stockAnimationStart)
				chart._stockAnimationStart = timestamp;
			progress = timestamp - chart._stockAnimationStart;
			chart._stockAnimationOffset = Math.min(Math.max(progress/duration*cellWidth,1), cellWidth);
			chart.render();
			if (progress < duration)
				window.requestAnimationFrame(function(t){
					animate(chart,t);
				});
		}
	}

	/**
	 * Applies animation offset to "series" and "x-axis" canvases
	 * @param {object} chart - chart view
	 * @param {object} data - data array
	 */
	function applyStockOffset(chart, data){
		var count = chart.count(),
			bounds = chart._getChartBounds(chart._content_width,chart._content_height),
			cellWidth = chart._settings.cellWidth,
			offset = chart._stockAnimationOffset || 0,
			isScroll = (data.length < count || (data.length-1)*cellWidth > bounds.end.x-bounds.start.x);

		function setCanvasOffset(canvas, x0, x1, skipRight){
			var ctx = canvas.getCanvas(),
				elem = canvas._canvas,
				labels = canvas._canvas_labels,
				series = canvas._canvas_series;


			// if we need to display less values than they are
			if(offset && (data.length < count || (data.length-1)*cellWidth > x1-x0)){
				// move canvas to the left
				elem.style.left = - offset + "px";
				if(data.length > 1){
					setLabelsOffset(labels, offset, series);
					// clear out of the scale parts
					ctx.clearRect(0, 0, x0+offset, elem.offsetHeight);
					ctx.clearRect(x1+offset, 0, elem.offsetWidth, elem.offsetHeight);
				}
			}
			// animation for the right part (added item)
			else{
				elem.style.left = "0px";
				if(!skipRight && offset!= cellWidth)
					ctx.clearRect(x0+(data.length-1)*cellWidth-cellWidth+offset, 0, elem.offsetWidth, elem.offsetHeight);
			}

			// show label for the last label after finishing animation
			if(labels.length>1 && offset && offset != cellWidth){
				var last = labels.length-1;
				if(isAxisTitle(series, labels[last]))
					last -= 1;
				labels[last].style.display = "none";
			}
				
		}

		eachStockCanvas(chart,function(name, canvas){
			setCanvasOffset(canvas, bounds.start.x,  bounds.end.x, name == "x");
		});

		setHtmlMapSizes(chart,bounds, isScroll?offset:0);
	}

	function isAxisTitle(series, label){
		return series ==="axis_x" && label.className.indexOf("webix_axis_title_x") !== -1;
	}

	function setLabelsOffset(labels, offset, series){
		if(labels.length){

			webix.html.remove(labels[0]);
			for(var i = 1; i< labels.length; i++){
				//don't move axis title
				if(isAxisTitle(series, labels[i])) continue;
				labels[i].style.left = labels[i].offsetLeft - offset + "px";
			}
				
		}
	}

	/**
	 * Gets visible chart data
	 * @param {object} data - an array with all chart data
	 * @param {object} point0 - a top left point of a plot
	 * @param {object} point1 - a bottom right point of a plot
	 * @param {number} cellWidth - a unit width
	 */
	function filterStockData(data, point0, point1, cellWidth){
		if(cellWidth && data.length){
			var limit = Math.ceil((point1.x - point0.x)/cellWidth);
			if(data.length > limit+1)
				data.splice(0, data.length - limit-1);
		}
	}

	/**
	 * Calls a function for "series" and "x-axis" canvases
	 * @param {object} chart - chart view
	 * @param {function} func - function to call
	 */
	function eachStockCanvas(chart, func){
		if(chart.canvases){
			for(var i=0; i < chart._series.length;i++)
				if (chart.canvases[i])
					func(i,chart.canvases[i]);

			if (chart.canvases["x"])
				func("x",chart.canvases["x"]);
		}
	}

	/**
	 * Set sizes for animated canvases
	 * @param {object} chart - chart view
	 */
	function resizeStockCanvases(chart){
		eachStockCanvas(chart, function(name, canvas){
			canvas._resizeCanvas(chart._content_width+2*chart._settings.cellWidth, chart._content_height);
		});
	}

	/**
	 * Set sizes for an html map of a chart
	 * @param {object} chart - a chart view
	 * @param {object} bounds - start and end points of a plot
	 * @param {number} offset - an offset to apply
	 */
	function setHtmlMapSizes(chart, bounds, offset){
		chart._contentobj._htmlmap.style.left = (bounds.start.x - offset)+"px";
		chart._contentobj._htmlmap.style.width = (bounds.end.x-bounds.start.x+offset)+"px";
	}

	/**
	 * Renders lines and labels of an x-axis
	 * @param {object} chart - a chart view
	 * @param {object} ctx - a canvas Context
	 * @param {object} data - a data array
	 * @param {object} point0 - a top left point of a plot
	 * @param {object} point1 - a bottom right point of a plot
	 * @param {number} cellWidth - a width of a unit
	 * @param {number} y - the vertical position of an "x-axis" line
	 */
	function drawXAxis(chart, ctx, data,point0,point1,cellWidth,y){
		var center, i, isScroll,unitPos,
			config = chart._settings,
			x0 = point0.x-0.5,
			y0 = parseInt((y?y:point1.y),10)+0.5,
			x1 = point1.x;

		if(!config.dynamic)
			return false;

		isScroll = ((data.length-1)*cellWidth > x1-x0 || data.length < chart.count());

		for(i=0; i < data.length;i++){
			unitPos = x0+i*cellWidth ;
			center = isScroll?i>1:!!i;
			unitPos = Math.ceil(unitPos)-0.5;
			//scale labels
			chart._drawXAxisLabel(unitPos,y0,data[i],center);
			//draws a vertical line for the horizontal scale
			if(i && config.xAxis.lines.call(chart, data[i]))
				chart._drawXAxisLine(ctx,unitPos,point1.y,point0.y,data[i]);

		}

		chart.canvases["x"].renderTextAt(true, false, x0, point1.y + config.padding.bottom-3,
			config.xAxis.title,
			"webix_axis_title_x",
			point1.x - point0.x
		);
		chart._drawLine(ctx,x0,y0,x1+ (isScroll?chart._stockAnimationOffset:0),y0,config.xAxis.color,1);
	}
})();


webix.protoUI({
	name:"rangechart",
	$init:function(){
		this.attachEvent("onAfterRender", this._init_frame);
		this._set_full_range();
	},
	_init_frame:function(){
		webix.assert((this._settings.type.indexOf("pie") ===-1 && this._settings.type !=="radar" &&
			this._settings.type !=="donut"), "Not suppored chart type");
		
		if(!this._map._areas.length || this._frame){
			this._setHandle(true);
			return;
		}

		this._setMap();
		this._item_radius = (this._map._areas[0].points[2]-this._map._areas[0].points[0])/2;
		this._rHandle = webix.html.create("div", {"class":"webix_chart_resizer right", "tabindex":"0", "role":"button", "aria-label":webix.i18n.aria.resizeChart });
		this._lHandle = webix.html.create("div", {"class":"webix_chart_resizer left", "tabindex":"0", "role":"button", "aria-label":webix.i18n.aria.resizeChart });
		this._frame = webix.html.create("div",{ "class":"webix_chart_frame"});

		this._viewobj.appendChild(this._lHandle);
		this._viewobj.appendChild(this._frame);
		this._viewobj.appendChild(this._rHandle);

		this._setHandle();

		webix._event(this._rHandle, webix.env.mouse.down, this._frDown, {bind:this});
		webix._event(this._lHandle, webix.env.mouse.down, this._frDown, {bind:this});
		webix._event(this._frame, webix.env.mouse.down, this._frDown, {bind:this});

		webix._event(webix.toNode(this._rHandle), "keydown", this._keyShift, {bind:this});
		webix._event(webix.toNode(this._lHandle), "keydown", this._keyShift, {bind:this});

		if (this._value)
			this._settings.range = this._set_full_range(this._value);

		this._refresh_range();
		this.callEvent("onAfterRangeChange", [this._value]);
		this.data.attachEvent("onStoreUpdated", webix.bind(this._refresh_range, this));
	},
	$setSize:function(x, y){
		if (webix.ui.chart.prototype.$setSize.call(this, x, y))
			this._setMap();
	},
	_setHandle:function(update){
		if(this._rHandle && !this._handle_radius){
			this._handle_radius = this._rHandle.clientWidth/2;
			if(update)
				this._refresh_range();
		}
	},
	_setMap:function(){
		var bounds = this._getChartBounds(this._content_width,this._content_height);
		this._mapStart = bounds.start;
		this._mapEnd = bounds.end;
	},
	removeAllSeries: function(){
		this._frame = this._rHandle = this._lHandle = null;
		webix.ui.chart.prototype.removeAllSeries.apply(this,arguments);
	},
	_keyShift:function(e){
		var code = e.which || e.keyCode;
		if(code === 37 || code ===39){
			webix.html.preventEvent(e);
			
			var index = e.target.className.indexOf("right")!==-1?"eindex":"sindex";
			var id = e.target.className.indexOf("right")!==-1?"end":"start";
			var range = this._value;
			
			range[index] = range[index] + (code === 37?-1:1);
			if(this._map._areas[range[index]]){
				range[id] = this._get_id_by_index(range[index]);
				this.setFrameRange(range);
			}
		}
	},
	_frDown:function(e){
		if(e.target.className.indexOf("webix_chart_resizer") !==-1)
			this._activeHandle = e.target;
		else if(this._map._areas.length){
			var spos = this._map._areas[this._value.sindex].points[2]-this._item_radius;
			var epos = this._map._areas[this._value.eindex].points[2];

			this._activeFrame = {
				ex:webix.html.pos(e).x,
				fx:spos+this._mapStart.x,
				fw:epos-spos
			};
		}

		webix.html.addCss(this._viewobj,"webix_noselect webix_wresize_cursor");

		this._frClear();
		this._resizeHandlerMove = webix.event(document.body, webix.env.mouse.move, this._frMove, {bind:this});
		this._resizeHandlerUp   = webix.event(document.body, webix.env.mouse.up, this._frUp, {bind:this});
	},
	_frClear:function(){
		if(webix._events[this._resizeHandlerMove]){
			webix.eventRemove(this._resizeHandlerMove);
			webix.eventRemove(this._resizeHandlerUp);
		}
	},
	_frMove:function(e){
		if(this._activeHandle){
			var pos_x = webix.html.pos(e).x-webix.html.offset(this.$view).x;
			if(pos_x>=this._mapStart.x && pos_x<=this._mapEnd.x){
				if(this._activeHandle.className.indexOf("left")!==-1){
					if(pos_x<this._rHandle.offsetLeft){
						this._activeHandle.style.left = pos_x-this._handle_radius+"px";
						this._frame.style.left = pos_x+"px";
						this._frame.style.width = this._rHandle.offsetLeft-this._lHandle.offsetLeft-1+"px";
					}
				}
				else if(pos_x>this._lHandle.offsetLeft+this._handle_radius){
					this._activeHandle.style.left = pos_x-this._handle_radius+"px";
					this._frame.style.width = this._rHandle.offsetLeft-this._lHandle.offsetLeft-1+"px";
				}
			}
		}
		else if(this._activeFrame){
			var shift = webix.html.pos(e).x - this._activeFrame.ex;
			var lx = this._activeFrame.fx+shift;
			var rx = lx+this._activeFrame.fw;

			if(this._mapStart.x<=lx && this._mapEnd.x>=rx){
				webix.extend(this._activeFrame, {lx:lx, rx:rx}, true);
				
				this._lHandle.style.left = lx-this._handle_radius+"px";
				this._rHandle.style.left = rx-this._handle_radius+"px";
				this._frame.style.left = lx+"px";
			}
		}
	},
	_frUp:function(e){
		this._frClear();

		webix.html.removeCss(this._viewobj,"webix_noselect");
		webix.html.removeCss(this._viewobj,"webix_wresize_cursor");

		if(!this.count()) return;
		
		if(this._activeHandle){
			var pos_x = webix.env.touch?e.changedTouches[0].pageX:webix.html.pos(e).x;
			pos_x -= webix.html.offset(this.$view).x+this._mapStart.x;

			var ind = this._get_index_by_pos(pos_x);
			var id = this._get_id_by_index(ind);

			if (this._activeHandle === this._lHandle){
				if(ind >= this._value.eindex){
					ind = this._value.eindex;
					id = this._get_id_by_index(ind);
				}
				this._value.start = id;
				this._value.sindex = ind;
			} else{
				if(ind <= this._value.sindex){
					ind = this._value.sindex;
					id = this._get_id_by_index(ind);
				}
				this._value.end = id;
				this._value.eindex = ind;
			}

			this._activeHandle = null;
		}
		else if(this._activeFrame && this._activeFrame.lx){
			var lind = this._value.sindex = this._get_index_by_pos(this._activeFrame.lx-this._mapStart.x);
			var rind = this._value.eindex = this._get_index_by_pos(this._activeFrame.rx-this._mapStart.x);
			this._value.start = this._get_id_by_index(lind);
			this._value.end = this._get_id_by_index(rind);
			
			this._activeFrame = null;
		}

		this._refresh_range();
		this.callEvent("onAfterRangeChange", [this._value.start, this._value.end]);
	},
	_get_id_by_index:function(ind){
		if (ind >= this.data.order.length)
			ind = this.data.order.length-1;
		return this.getItem(this.data.order[ind])[this._settings.frameId || "id"];
	},
	_get_index_by_pos:function(pos){
		var areas = this._map._areas;
		for(var i = 0; i<areas.length; i++)
			if(pos <= areas[i].points[2]-this._item_radius)
				return i;

		return areas.length-1;
	},
	_get_frame_index:function(value){
		var key = this._settings.frameId || "id";
		
		for (var i=0; i<this.data.order.length; i++)
			if (this.getItem(this.data.order[i])[key]==value)
				return i;

		return -1;
	},
	_set_full_range:function(value){
		if(!value)
			value =  { start:0, end:0, sindex:0, eindex: 0 };
		else{
			if(value.start) value.sindex = this._get_frame_index(value.start);
			if(value.end) value.eindex = this._get_frame_index(value.end);
			value.start = value.start || this._get_id_by_index(value.sindex);
			value.end = value.end ||  this._get_id_by_index(value.eindex);
		}
		this._value = value;
	},
	range_setter:function(value){
		this._set_full_range(value);
		return this._value;
	},
	getFrameData:function(){
		var res = [];
		for (var i=this._value.sindex; i<=this._value.eindex; i++){
			var item = this.getItem(this.data.order[i]);
			if(item) res.push(item);
		}
		return res;
	},
	setFrameRange:function(range){
		this._set_full_range(range);
		this._refresh_range();

		this.callEvent("onAfterRangeChange", [range]);
	},
	_refresh_range:function(){
		if(!this._map) return;
		var areas = this._map._areas;
		
		if (areas.length){
			var	sx = areas[this._value.sindex].points[0] + this._mapStart.x+this._item_radius-1;
			var ex = areas[this._value.eindex].points[0] + this._mapStart.x+this._item_radius-1;

			this._lHandle.style.left = sx-this._handle_radius+"px";
			this._rHandle.style.left = ex-this._handle_radius+"px";
			this._frame.style.left = sx+"px";
			this._frame.style.width = (ex-sx)+"px";

			this._settings.range = this._value;
		}
	},
	getFrameRange:function(){
		return this._settings.range;
	}
}, webix.ui.chart);
