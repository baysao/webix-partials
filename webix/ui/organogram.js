/*
	UI:Organogram
*/




webix.protoUI({
	name:"organogram",
	defaults:{
		scroll: "auto",
		ariaLabel:"lines"
	},
	$init:function(){
		this._viewobj.className += " webix_organogram";
		//map API of DataStore on self
		this._html = document.createElement("DIV");

		this.$ready.push(this._afterInit);
		webix.extend(this.data, webix.TreeStore, true);
		this.data.provideApi(this,true);
	},
	//attribute , which will be used for ID storing
	_id:"webix_dg_id",
	//supports custom context menu
	on_click:{
		webix_organogram_item:function(e,id){
			if (this._settings.select){
				if (this._settings.select=="multiselect"  || this._settings.multiselect)
					this.select(id, false, (e.ctrlKey || e.metaKey || (this._settings.multiselect == "touch")), e.shiftKey); 	//multiselection
				else
					this.select(id);
				this._no_animation = false;
			}
		}
	},
	on_context:{},
	on_dblclick:{},
	_afterInit:function(){
		this._dataobj.style.position = "relative";
		this.data.attachEvent("onStoreUpdated",webix.bind(this.render,this));
	},
	_toHTMLItem:function(obj){
		var mark = this.data._marks[obj.id];

		this.callEvent("onItemRender",[obj]);
		return this.type.templateStart.call(this,obj,this.type,mark)+(obj.$template?this.type["template"+obj.$template].call(this,obj,this.type,mark):this.type.template.call(this,obj,this.type,mark))+this.type.templateEnd.call(this);
	},
	_toHTML:function(obj){
		//check if related template exist
		var html=this._toHTMLItem(obj);

		if (this.data.branch[obj.id])
			html += this._renderBranch(obj.id);

		return html;
	},
	_isListBlocks: function(){
		return 	this.type.listMarginX || this.type.listMarginY;
	},
	_renderBranch: function(pId){
		var elem, i, id,
			html = "",
			leaves = this.data.branch[pId],
			marks = this.data._marks[pId],
			pItem = this.getItem(pId),
			sizes, totalWidth,
			type = (pItem?pItem.$type:false);



		if(!pId){
			this._colHeight = [];
			this.$xy = {};
			totalWidth = this.$width - this.type.padding*2;

			this.$xy[0] = {
				totalWidth: totalWidth,
				start: this.type.padding,
				width: 0,
				height: 0,
				left: totalWidth/2,
				top: this.type.padding||0
			};
		}

		if(leaves){
			sizes = this.$xy[pId];

			// draw items inside list container
			if(type == "list" && !this._isListBlocks()){
				html += this.type.templateListStart.call(this,pItem, this.type, marks);
			}
			// render items and calculate heights
			var sumTotalWidth = 0;


			for( i=0; i < leaves.length; i++){
				id = leaves[i];
				totalWidth = this._tw[id];
				var obj = this.getItem(id);

				if(obj.open == webix.undefined)
					obj.open = true;

				if(type == "list")
					this.data.addMark(id, "list_item","", 1, true);

				var height = this._getItemHeight(id);
				if(type == "list"){
					var leftOffset = (type == "list"&&this._isListBlocks()?this.type.listMarginX:0);
					var itemMargin = 0;
					if(this._isListBlocks())
						itemMargin = this.type.listMarginY;
					else if(!i)
						itemMargin = this.type.marginY;

					this.$xy[id] = {
						totalWidth: totalWidth,
						start: sizes.start,
						width: this.type.width,
						height: height,
						left: sizes.start + totalWidth/2 -  this.type.width/2+ leftOffset,
						top: i?(this.$xy[leaves[i-1]].top+this.$xy[leaves[i-1]].height+itemMargin):(sizes.top+sizes.height+itemMargin)
					};
				}
				else{
					this.$xy[id] = {
						totalWidth: totalWidth,
						start: sizes.start + sumTotalWidth,
						width: this.type.width,
						height: height,
						left: sizes.start + sumTotalWidth  + totalWidth/2 -  this.type.width/2 ,
						top: sizes.top + sizes.height + (pId?this.type.marginY:0)
					};

				}
				html += this._toHTMLItem(obj);
				sumTotalWidth += totalWidth;

			}
			if(!pId && sumTotalWidth){
				this._dataobj.style.width = sumTotalWidth+this.type.padding*2+"px";
			}
			// draw child branches
			for( i=0; i < leaves.length; i++){
				id = leaves[i];

				if (this.data.branch[id] && this.getItem(id).open)
					html += this._renderBranch(id);
				else if(pItem){
					if(pItem.$type != "list")
						this._colHeight.push(this.$xy[id].top+this.$xy[id].height);
					else if(i == (leaves.length-1)){
						this._colHeight.push(this.$xy[id].top+this.$xy[id].height);
					}
				}
			}

			if(type == "list" && !this._isListBlocks())
				html += this.type.templateListEnd(pItem, this.type, marks);
		}

		return html;
	},


	_getItemHeight: function(id){
		var item = this.getItem(id);
		var height = this.type.height;
		if( typeof height == "function"){
			height = height.call(item, this.type, this.data._marks[id]);
		}


		if(!this._hDiv){
			this._hDiv = webix.html.create("div");
			this._dataobj.appendChild(this._hDiv);

		}

		this._hDiv.className = this.type.classname(item,this.type,this.data._marks[id]);
		this._hDiv.style.cssText="width:"+this.type.width+"px;height:"+height+(height=="auto"?"":"px")+";";
		this._hDiv.innerHTML = this.type.template.call(this,item,this.type,this.data._marks[id]);
		return this._hDiv.scrollHeight;
	},
	_calcTotalWidth: function(){
		var tw = {};
		var width = this.type.width;
		var margin = this.type.marginX;
		this.data.each(function(obj){
			tw[obj.id] = width + margin;

			var parentId = this.getParentId(obj.id);
			if(parentId && this.getItem(parentId).$type != "list")
				while(parentId){
					var leaves = this.branch[parentId];
					tw[parentId] = 0;

					for( var i =0; i < leaves.length; i++){
						tw[parentId] += tw[leaves[i]]||0;
					}
					parentId = this.getParentId(parentId);
				}
		});
		this._tw = tw;
		return tw;

	},
	getItemNode:function(searchId){
		if (this._htmlmap)
			return this._htmlmap[searchId];

		//fill map if it doesn't created yet
		this._htmlmap={};

		var t = this._dataobj.childNodes;
		for (var i=0; i < t.length; i++){
			var id = t[i].getAttribute(this._id); //get item's
			if (id)
				this._htmlmap[id]=t[i];
			if(t[i].className.indexOf("webix_organogram_list")!=-1 && !this._isListBlocks()){
				var listNodes = t[i].childNodes;
				for (var j=0; j < listNodes.length; j++){
					id = listNodes[j].getAttribute(this._id); //get item's
					if (id)
						this._htmlmap[id]=listNodes[j];
				}
			}

		}

		//call locator again, when map is filled
		return this.getItemNode(searchId);
	},
	_toHTMLObject:function(obj){
		this._html.innerHTML = this._toHTMLItem(obj);
		return this._html.firstChild;
	},
	render:function(id,data,type){
		if (!this.isVisible(this._settings.id) || this.$blockRender)
			return;
		if (webix.debug_render)
			webix.log("Render: "+this.name+"@"+this._settings.id);

		if(type == "update"){
			var cont = this.getItemNode(id); //get html element of updated item

			var t = this._htmlmap[id] = this._toHTMLObject(data);
			webix.html.insertBefore(t, cont);
			webix.html.remove(cont);
			return true;
		}
		else{
			//full reset
			if (this.callEvent("onBeforeRender",[this.data])){
				this._calcTotalWidth();
				this._htmlmap = null;
				this._dataobj.innerHTML = this._renderBranch(0);
				this._hDiv = null;

				this._dataobj.style.height = Math.max.apply(Math, this._colHeight)+this.type.padding+"px";
				this._renderCanvas();
				this.resize();
				this.callEvent("onAfterRender",[]);
			}
		}
		return true;
	},
	_renderCanvas: function(){
		if(this.canvas)
			this.canvas.clearCanvas(true);

		this.canvas = new webix.Canvas({
			container:this._dataobj,
			name:this._settings.ariaLabel,
			width: this._dataobj.offsetWidth,
			height:this._dataobj.offsetHeight
		});

		this._drawLines(0);
	},
	_drawLine:function(ctx,x1,y1,x2,y2,color,width){
		ctx.strokeStyle = color;
		ctx.lineCap='square';
		ctx.lineWidth = width;
		ctx.beginPath();
		ctx.moveTo(x1,y1);
		ctx.lineTo(x2,y2);
		ctx.stroke();
		ctx.lineWidth = 1;
	},
	_drawLines: function(id,ctx){
		var i, item, leaves, p, s,
			x12,y1,y2,
			start, end;

		var layout = this.config.layout;
		if(!ctx)
			ctx = this.canvas.getCanvas();
		if(!this.$xy){
			return;
		}
		id = id||0;
		leaves = this.data.branch[id];
		item = this.getItem(id);
		if(leaves && leaves.length){
			p = this.$xy[id];
			// draw a vertical line between parent and nodes
			if(id){

				x12 = parseInt(p.left+ p.width/2,10) +0.5;
				y1 = parseInt(p.top + p.height,10);
				y2 = parseInt(p.top + p.height+ this.type.marginY/2,10);

				if(item.$type == "list"){
					if(!this._isListBlocks()){
						y2 = parseInt(p.top + p.height+ this.type.marginY,10);
						this._drawLine(ctx,x12, y1, x12, y2, this.type.lineColor);
						return;
					}

				}
				else
					this._drawLine(ctx,x12, y1, x12, y2, this.type.lineColor);
			}


			y1 =  parseInt(p.top + p.height+ this.type.marginY/2,10)+0.5;
			for(i = 0; i < leaves.length; i++){
				if(id){
					s = this.$xy[leaves[i]];
					if(item.$type == "list" && this._isListBlocks()){
						x12 = parseInt(p.left + this.type.listMarginX/2,10) + 0.5;
						if(!i)
							start = x12;
						else if(i == (leaves.length - 1))
							end = x12;
						y2 = parseInt(s.top + s.height/2,10);
						this._drawLine(ctx,x12, y1 - this.type.marginY/2, x12, y2, this.type.lineColor);
						this._drawLine(ctx,x12, y2, x12+this.type.listMarginX/2, y2, this.type.lineColor);
					}
					else{
						x12 = parseInt(s.left+ s.width/2,10) + 0.5;
						if(!i)
							start = x12;
						else if(i == (leaves.length - 1))
							end = x12;
						y2 = parseInt(s.top ,10);
						this._drawLine(ctx,x12, y1, x12, y2, this.type.lineColor);
					}

				}
				if(this.getItem(leaves[i]).open)
					this._drawLines(leaves[i],ctx);
			}
			if(id)
				this._drawLine(ctx,start, y1, end, y1,this.type.lineColor);
		}
	},
	//autowidth, autoheight - no inner scroll
	//scrollable - width, height, auto, with scroll
	$getSize:function(dx,dy){
		var aW = this._settings.autowidth;
		var aH = this._settings.autoheight;
		if(aW){
			dx = this._dataobj.offsetWidth+(this._dataobj.offsetHeight>dy && !aH?webix.ui.scrollSize:0);
		}
		if(aH){
			dy = this._dataobj.offsetHeight + (this._dataobj.offsetWidth>dx && !aW?webix.ui.scrollSize:0);
		}

		return webix.ui.view.prototype.$getSize.call(this, dx, dy);
	},
	$setSize:function(x,y){
		if(webix.ui.view.prototype.$setSize.call(this,x,y)){
			this._dataobj.style.width = this.$width+"px";
			this._dataobj.style.height = this.$height+"px";
			this.render();
		}
	},
	//css class to action map, for dblclick event
	type:{
		width: 120,
		height: "auto",
		padding: 20,
		marginX: 20,
		marginY: 20,
		listMarginX: 0,
		listMarginY: 0,
		lineColor: "#90caf9",
		classname:function(obj, common, marks){
			var css = "webix_organogram_item ";
			if (obj.$css){
				if (typeof obj.$css == "object")
					obj.$css = webix.html.createCss(obj.$css);
				css += " "+obj.$css;
			}

			if(marks && marks.list_item)
				css += " webix_organogram_list_item ";
			if(marks && marks.$css)
				css += marks.$css;
			css += " webix_organogram_level_"+obj.$level;
			return css;
		},
		listClassName: function(obj){
			var css =  "webix_organogram_list webix_organogram_list_"+obj.$level;
			if (obj.$listCss){
				if (typeof obj.$listCss == "object")
					obj.$listCss = webix.html.createCss(obj.$listCss);
				css += " "+obj.$listCss;
			}
			return css;
		},
		template:webix.template("#value#"),
		templateStart:function(obj,type,marks){
			var style="";
			if((!(marks && marks.list_item) || type.listMarginX || type.listMarginY) && this.$xy){
				var xy = this.$xy[obj.id];
				style += "width: "+ xy.width+"px; height: " + xy.height+"px;";
				style += "top: "+ xy.top+"px; left: " + xy.left+"px;";
			}
			return '<div webix_dg_id="'+obj.id+'" class="'+type.classname.call(this,obj,type,marks)+'"'+(style?'style="'+style+'"':'')+'">';
		},
		templateEnd:webix.template("</div>"),
		templateListStart:function(obj,type,marks){
			var style="";
			if(this.$xy){
				var xy = this.$xy[obj.id];
				style += "width: "+ xy.width+"px;";
				style += "top: "+ (xy.top+xy.height+type.marginY)+"px; left: " + xy.left+"px;";
			}
			return '<div class="'+type.listClassName.call(this,obj,type,marks)+'"'+(style?'style="'+style+'"':'')+'">';
		},
		templateListEnd:webix.template("</div>")
	}
}, webix.AutoTooltip, webix.Group, webix.TreeAPI, webix.DataMarks, webix.SelectionModel, webix.MouseEvents, webix.Scrollable, webix.RenderStack, webix.TreeDataLoader, webix.DataLoader, webix.ui.view, webix.EventSystem);
