define(["webix/core/webix"], function webix_layout(webix){
    webix.protoUI({
	    name:"baselayout",
	    $init:function(config){
		    this.$ready.push(this._parse_cells);
		    this._dataobj  = this._contentobj;
		    this._layout_sizes = [];
		    this._responsive = [];

		    if (config.$topView){
			    config.borderless = true;
			    config._inner = { top:true, left:true, bottom:true, right:true };
		    }

		    if (config.isolate)
			    webix.extend(this, webix.IdSpace);
	    },
	    rows_setter:function(value){
		    this._vertical_orientation = 1;
		    this._collection = value;
	    },
	    cols_setter:function(value){
		    this._vertical_orientation = 0;
		    this.$view.style.whiteSpace = "nowrap";
		    this._collection = value;
	    },
	    _remove:function(view){
		    webix.PowerArray.removeAt.call(this._cells, webix.PowerArray.find.call(this._cells, view));
		    this.resizeChildren(true);
	    },
	    _replace:function(new_view,target_id){
		    if (webix.isUndefined(target_id)){
			    for (var i=0; i < this._cells.length; i++)
				    this._cells[i].destructor();
			    this._collection = new_view;
			    this._parse_cells();
		    } else {
			    var source;
			    if (typeof target_id == "number"){
				    if (target_id<0 || target_id > this._cells.length)
					    target_id = this._cells.length;
				    var prev_node = (this._cells[target_id]||{})._viewobj;
				    webix.PowerArray.insertAt.call(this._cells, new_view, target_id);
				    if (!new_view._settings.hidden)
					    webix.html.insertBefore(new_view._viewobj, prev_node, this._dataobj);
			    } else {
				    source = webix.$$(target_id);
				    target_id = webix.PowerArray.find.call(this._cells, source);
				    webix.assert(target_id!=-1, "Attempt to replace the non-existing view");
				    var parent = source._viewobj.parentNode;
				    if (parent && !new_view._settings.hidden)
					    parent.insertBefore(new_view._viewobj, source._viewobj);

				    source.destructor();	
				    this._cells[target_id] = new_view;
			    }

			    if (!this._vertical_orientation)
				    this._fix_vertical_layout(new_view);
			    
			    this._cells[target_id]._parent_cell = this;
		    }
		    this.resizeChildren(true);

		    var form = this.elements ? this : this.getFormView();
		    if (form) form._recollect_elements();

		    webix.callEvent("onReconstruct",[this]);
	    },
	    _fix_vertical_layout:function(cell){
		    cell._viewobj.style.display = "inline-block";
		    cell._viewobj.style.verticalAlign = "top";
	    },
	    addView:function(view, index){
		    if (webix.isUndefined(index))
			    index = this._cells.length;
		    var top = this.$$ ? this : this.getTopParentView();
		    top = (top && top.ui) ? top : webix;
		    return top.ui(view, this, index)._settings.id;
	    },
	    removeView:function(id){
		    var view;
		    if (typeof id != "object")
			    view = webix.$$(id) || (this.$$ ? this.$$(id) : null);
		    else
			    view = id;

		    var target = webix.PowerArray.find.call(this._cells, view);
		    if (target >= 0){
			    if (this._beforeRemoveView)
				    this._beforeRemoveView(target, view);

			    var form = this.elements ? this : this.getFormView();

			    this._cells.splice(target, 1);
			    if (form)
				    webix.ui.each(view, function(sub){
					    if (sub.name)
						    delete form.getCleanValues()[sub.config.name];
				    }, form, true);				

			    view.destructor();
			    this.resizeChildren(true);
			    
			    if (form)
				    form._recollect_elements();
		    } else
			    webix.assert(false, "Attemp to remove not existing view: "+id);

		    webix.callEvent("onReconstruct",[this]);
	    },
	    reconstruct:function(){
		    this._hiddencells = 0;
		    this._replace(this._collection);
	    },
	    _hide:function(obj, settings, silent){
		    if (obj._settings.hidden) return;
		    obj._settings.hidden = true;
		    webix.html.remove(obj._viewobj);
            this._hiddencells++;
		    if (!silent && !webix._ui_creation)
			    this.resizeChildren(true);	
	    },
	    _signal_hidden_cells:function(view){
		    if (view.callEvent)
			    view.callEvent("onViewShow",[]);
	    },
	    resizeChildren:function(){
		    if (webix.ui.$freeze) return;

		    if (this._layout_sizes){
			    var parent = this.getParentView();
			    if (parent){
				    if (parent.resizeChildren)
					    return parent.resizeChildren();
				    else
					    return parent.resize();
			    }
				
			    var sizes = this.$getSize(0,0);

			    var x,y,nx,ny;
			    nx = x = this._layout_sizes[0] || 0;
			    ny = y = this._layout_sizes[1] || 0;

			    //for auto-fill content, use adjust strategy
			    if ((sizes[1]>=100000 || sizes[3] >= 100000) && this._viewobj.parentNode){
				    //in hidden container adjust doesn't work, so fallback to last known size
				    //also, ensure that min-size is not violated
				    nx = x = Math.max(sizes[0], (this._settings.width || this._viewobj.parentNode.offsetWidth || x || 0));
				    ny = y = Math.max(sizes[2], (this._settings.height || this._viewobj.parentNode.offsetHeight || y || 0));
			    }
			    
			    if (!parent){
				    //minWidth
				    if (sizes[0]>x) nx = sizes[0];
				    //minHeight
				    if (sizes[2]>y) ny = sizes[2];

				    //maxWidth rule
				    if (x>sizes[1]) nx = sizes[1];
				    //maxHeight rule
				    if (y>sizes[3]) ny = sizes[3];

				    this.$setSize(nx,ny);
			    } else
				    this._set_child_size(x,y);

			    if (webix._responsive_exception){
				    webix._responsive_exception = false;
				    this.resizeChildren();
			    }

			    webix.callEvent("onResize",[]);
		    }
	    },
	    getChildViews:function(){
		    return this._cells;
	    },
	    index:function(obj){
		    if (obj._settings)
			    obj = obj._settings.id;
		    for (var i=0; i < this._cells.length; i++)
			    if (this._cells[i]._settings.id == obj)
				    return i;
		    return -1;
	    },
	    _show:function(obj, settings, silent){

		    if (!obj._settings.hidden) return;
		    obj._settings.hidden = false;

            //index of sibling cell, next to which new item will appear
            var index = this.index(obj)+1;
            //locate nearest visible cell
            while (this._cells[index] && this._cells[index]._settings.hidden) index++;
            var view = this._cells[index] ? this._cells[index]._viewobj : null;

            webix.html.insertBefore(obj._viewobj, view, (this._dataobj||this._viewobj));
            this._hiddencells--;

            if (!silent){
                this.resizeChildren(true);
                if (obj.refresh)
                    obj.refresh();
            }

            if (obj.callEvent){
        	    obj.callEvent("onViewShow", []);
			    webix.ui.each(obj, this._signal_hidden_cells);
		    }
	    },
	    showBatch:function(name, mode){
		    var preserve = typeof mode != "undefined";
		    mode = mode !== false;

		    if (!preserve){
			    if (this._settings.visibleBatch == name ) return;
			    this._settings.visibleBatch = name;
		    } else 
			    this._settings.visibleBatch = "";

		    var show = [];
		    for (var i=0; i < this._cells.length; i++){
			    if (!this._cells[i]._settings.batch) 
				    show.push(this._cells[i]);
			    else if (this._cells[i]._settings.batch == name){
				    if (mode)
					    show.push(this._cells[i]);
				    else
					    this._hide(this._cells[i], null, true);
			    } else if (!preserve)
				    this._hide(this._cells[i], null, true);
		    }

		    for (var i=0; i < show.length; i++){
			    this._show(show[i], null, true);
			    show[i]._render_hidden_views();
		    }
			
		    this.resizeChildren(true);
	    },
	    _parse_cells:function(collection){
		    this._cells=[];

		    webix.assert(collection,this.name+" was incorrectly defined. <br><br> You have missed rows|cols|cells|elements collection"); 
		    for (var i=0; i<collection.length; i++){
			    webix._parent_cell = this;
			    if (!collection[i]._inner)
				    collection[i].borderless = true;

			    this._cells[i]=webix.ui._view(collection[i], this);
			    if (!this._vertical_orientation)
				    this._fix_vertical_layout(this._cells[i]);
			    
			    if (this._settings.visibleBatch && this._settings.visibleBatch != this._cells[i]._settings.batch && this._cells[i]._settings.batch){
				    this._cells[i]._settings.hidden = true;
				    this._hiddencells++;
			    }
			    
			    if (!this._cells[i]._settings.hidden){
				    (this._dataobj||this._contentobj).appendChild(this._cells[i]._viewobj);
				    if (this._cells[i].$nospace)
					    this._hiddencells++;
			    }
		    }

		    if (this._parse_cells_ext_end)
			    this._parse_cells_ext_end(collection);	
	    },
	    _bubble_size:function(prop, size, vertical){
		    if (this._vertical_orientation != vertical)
			    for (var i=0; i<this._cells.length; i++){
				    this._cells[i]._settings[prop] = size;
				    if (this._cells[i]._bubble_size)
					    this._cells[i]._bubble_size(prop, size, vertical);
			    }
	    },
	    $getSize:function(dx, dy){
		    webix.debug_size_box_start(this, true);
		    var minWidth = 0; 
		    var maxWidth = 100000;
		    var maxHeight = 100000;
		    var minHeight = 0;
		    if (this._vertical_orientation) maxHeight=0; else maxWidth = 0;
		    
		    var fixed = 0;
		    var fixed_count = 0;
		    var gravity = 0;
		    this._sizes=[];

		    for (var i=0; i < this._cells.length; i++) {
			    //ignore hidden cells
			    if (this._cells[i]._settings.hidden)
				    continue;
			    
			    var sizes = this._sizes[i] = this._cells[i].$getSize(0,0);

			    if (this._cells[i].$nospace){
 				    fixed_count++;
 				    continue;
 			    }

			    if (this._vertical_orientation){
				    //take max minSize value
				    if (sizes[0]>minWidth) minWidth = sizes[0];
				    //take min maxSize value
				    if (sizes[1]<maxWidth) maxWidth = sizes[1];
				    
				    minHeight += sizes[2];
				    maxHeight += sizes[3];

				    if (sizes[2] == sizes[3] && sizes[2] != -1){ fixed+=sizes[2]; fixed_count++; }
				    else gravity += sizes[4];
			    } else {
				    //take max minSize value
				    if (sizes[2]>minHeight) minHeight = sizes[2];
				    //take min maxSize value
				    if (sizes[3]<maxHeight) maxHeight = sizes[3];
				    
				    minWidth += sizes[0];
				    maxWidth += sizes[1];

				    if (sizes[0] == sizes[1] && sizes[0] != -1){ fixed+=sizes[0]; fixed_count++; }
				    else gravity += sizes[4];
			    }
		    }

		    if (minHeight>maxHeight)
			    maxHeight = minHeight;
		    if (minWidth>maxWidth)
			    maxWidth = minWidth;

		    this._master_size = [fixed, this._cells.length - fixed_count, gravity];
		    this._desired_size = [minWidth+dx, minHeight+dy];

		    //get layout sizes
		    var self_size = webix.ui.baseview.prototype.$getSize.call(this, 0, 0);
		    //use child settings if layout's one was not defined
		    if (self_size[1] >= 100000) self_size[1]=0;
		    if (self_size[3] >= 100000) self_size[3]=0;

		    self_size[0] = (self_size[0] || minWidth ) +dx;
		    self_size[1] = Math.max(self_size[0], (self_size[1] || maxWidth ) +dx);
		    self_size[2] = (self_size[2] || minHeight) +dy;
		    self_size[3] = Math.max(self_size[2], (self_size[3] || maxHeight) +dy);

		    webix.debug_size_box_end(this, self_size);

		    if (!this._vertical_orientation && this._settings.responsive)
			    self_size[0] = 0;

		    return self_size;
	    },
	    $setSize:function(x,y){
		    this._layout_sizes = [x,y];
		    webix.debug_size_box_start(this);

		    webix.ui.baseview.prototype.$setSize.call(this,x,y);
		    this._set_child_size(x,y);

		    webix.debug_size_box_end(this, [x,y]);
	    },
	    _set_child_size_a:function(sizes, min, max){
		    min = sizes[min]; max = sizes[max];
		    var height = min;

		    if (min != max){
			    var ps = this._set_size_delta * sizes[4]/this._set_size_gravity;
			    if (ps < min){
				    height = min;
				    this._set_size_gravity -= sizes[4]; 
				    this._set_size_delta -= height;
			    } else  if (ps > max){
				    height = max;
				    this._set_size_gravity -= sizes[4]; 
				    this._set_size_delta -= height;
			    } else {
				    return -1;
			    }
		    }

		    return height;
	    },
	    _responsive_hide:function(cell, mode){
		    var target =  webix.$$(mode);

		    if (target === "hide" || !target){
			    cell.hide();
			    cell._responsive_marker = "hide";
		    } else{
			    //for SideBar in Webix 1.9
			    if (!target)
				    target = webix.ui({ view:"popup", body:[{}]});

			    cell._responsive_width = cell._settings.width;
			    cell._responsive_height = cell._settings.height;
			    cell._responsive_marker = target._settings.id;
			    cell._settings.width = 0;
			    if (!cell._settings.height)
				    cell._settings.autoheight = true;

			    webix.ui(cell, target, this._responsive.length);
		    }

		    this._responsive.push(cell);
	    },
	    _responsive_show:function(cell){
		    var target = cell._responsive_marker;
		    cell._responsive_marker = 0;

		    if (target === "hide" || !target){
			    cell.show();
		    } else {
			    cell._settings.width = cell._responsive_width;
			    cell._settings.height = cell._responsive_height;
			    delete cell._settings.autoheight;

			    var index = 0;
			    while (this._cells[index] && this._cells[index]._settings.responsiveCell === false) index++;
			    webix.ui(cell, this, index);
		    }
		    this._responsive.pop();
	    },
	    _responsive_cells:function(x,y){
		    webix._responsive_tinkery = true;
		    if (x + this._paddingX*2 + this._margin * (this._cells.length-1)< this._desired_size[0]){
			    var max = this._cells.length - 1;
			    for (var i = 0; i < max; i++){
				    var cell = this._cells[i];
				    if (!cell._responsive_marker){
					    if (cell._settings.responsiveCell !== false){
						    this._responsive_hide(cell, this._settings.responsive);
						    webix.callEvent("onResponsiveHide", [cell._settings.id]);
						    webix._responsive_exception = true;
						    break;
					    } else {
						    max = this._cells.length;
					    }
				    }
			    }
		    } else  if (this._responsive.length){
			    var cell = this._responsive[this._responsive.length-1];
			    var dx = cell._responsive_marker == "hide" ? 0 : cell._responsive_width;
			    var px = cell.$getSize(dx,0);
			    if (px[0] + this._desired_size[0] + this._margin + 20 <= x ){
				    this._responsive_show(cell);
				    webix.callEvent("onResponsiveShow", [cell._settings.id]);
				    webix._responsive_exception = true;
			    }
		    }

		    webix._responsive_tinkery = false;
	    },
	    _set_child_size:function(x,y){ 
		    webix._child_sizing_active = (webix._child_sizing_active||0)+1;

		    if (!this._vertical_orientation && this._settings.responsive)
			    this._responsive_cells(x,y);


		    this._set_size_delta = (this._vertical_orientation?y:x) - this._master_size[0];
		    this._set_size_gravity = this._master_size[2];
		    var width = x; var height = y;

		    var auto = [];
		    for (var i=0; i < this._cells.length; i++){
			    //ignore hidden cells
			    if (this._cells[i]._settings.hidden || !this._sizes[i])
				    continue;

			    var sizes = this._sizes[i];

			    if (this._vertical_orientation){
				    var height = this._set_child_size_a(sizes,2,3);
				    if (height < 0)	{ auto.push(i); continue; }
			    } else {
				    var width = this._set_child_size_a(sizes,0,1);
				    if (width < 0)	{ auto.push(i); continue; }
			    }
			    this._cells[i].$setSize(width,height);
		    }

		    for (var i = 0; i < auto.length; i++){
			    var index = auto[i];
			    var sizes = this._sizes[index];
			    var dx = Math.round(this._set_size_delta * sizes[4]/this._set_size_gravity);
			    this._set_size_delta -= dx; this._set_size_gravity -= sizes[4];
			    if (this._vertical_orientation)
				    height = dx;
			    else {
				    width = dx;
			    }

			    this._cells[index].$setSize(width,height);
		    }

		    webix._child_sizing_active -= 1;
	    },
	    _next:function(obj, mode){
		    var index = this.index(obj);
		    if (index == -1) return null;
		    return this._cells[index+mode];
	    }, 
	    _first:function(){
		    return this._cells[0];
	    }
    }, webix.EventSystem, webix.ui.baseview);




    webix.protoUI({
	    name:"layout",
	    $init:function(config){
		    this._hiddencells = 0;
	    },
	    defaults:{
		    type:"line"
	    },
	    _parse_cells:function(){
		    if (this._parse_cells_ext)
			    collection = this._parse_cells_ext(collection);

		    if (!this._parse_once){
			    this._viewobj.className += " webix_layout_"+(this._settings.type||"");
			    this._parse_once = 1;
		    }

		    if (this._settings.margin !== webix.undefined)
			    this._margin = this._settings.margin;

		    if (this._settings.padding != webix.undefined)
			    this._paddingX = this._paddingY = this._settings.padding;
		    if (this._settings.paddingX !== webix.undefined)
			    this._paddingX = this._settings.paddingX;
		    if (this._settings.paddingY !== webix.undefined)
			    this._paddingY = this._settings.paddingY;

		    if (this._paddingY || this._paddingX)
			    this._padding = true;

		    //if layout has paddings we need to set the visible border 
		    if (this._hasBorders() && !this._settings.borderless){
		 	    this._contentobj.style.borderWidth="1px";
			    //if layout has border - normal bordering rules are applied
			    this._render_borders = true;
		    }
	        
		    
		    var collection = this._collection;
	        
		    if (this._settings.borderless)
			    this._settings._inner = { top:true, left:true, right:true, bottom:true};

		    this._beforeResetBorders(collection);
		    webix.ui.baselayout.prototype._parse_cells.call(this, collection);
		    this._afterResetBorders(collection);
	    },
	    $getSize:function(dx, dy){
		    dx=dx||0; dy=dy||0;

		    var correction = this._margin*(this._cells.length-this._hiddencells-1);
		    if (this._render_borders || this._hasBorders()){
			    var _borders = this._settings._inner;
			    if (_borders){
				    dx += (_borders.left?0:1)+(_borders.right?0:1);
				    dy += (_borders.top?0:1)+(_borders.bottom?0:1);
			    }
		    }

		    if (!this._settings.height)
			    dy += (this._paddingY||0)*2 + (this._vertical_orientation ? correction : 0);

		    if (!this._settings.width)
			    dx += (this._paddingX||0)*2 + (this._vertical_orientation ? 0 : correction);
			
		    return webix.ui.baselayout.prototype.$getSize.call(this, dx, dy);
	    },
	    $setSize:function(x,y){
		    this._layout_sizes = [x,y];
		    webix.debug_size_box_start(this);

		    var result;
		    if (this._hasBorders()||this._render_borders)
			    result = webix.ui.view.prototype.$setSize.call(this,x,y);
		    else	
			    result = webix.ui.baseview.prototype.$setSize.call(this,x,y);

		    //form with scroll
		    y = this._content_height;
		    x = this._content_width;

		    var config = this._settings;
		    if (config.scroll){
			    y = Math.max(y, this._desired_size[1]);
			    x = Math.max(x, this._desired_size[0]);
		    }
		    
		    this._set_child_size(x, y);

		    webix.debug_size_box_end(this, [x,y]);
	    },
	    _set_child_size:function(x,y){
		    var correction = this._margin*(this._cells.length-this._hiddencells-1);

		    if (this._vertical_orientation){
			    y-=correction+this._paddingY*2;
			    x-=this._paddingX*2;
		    }
		    else {
			    x-=correction+this._paddingX*2;
			    y-=this._paddingY*2;
		    }
		    return webix.ui.baselayout.prototype._set_child_size.call(this, x, y);
	    },
	    resizeChildren:function(structure_changed){ 
		    if (structure_changed){
			    this._last_size = null; //forces children resize
			    var config = [];
			    for (var i = 0; i < this._cells.length; i++){
				    var cell = this._cells[i];
				    config[i] = cell._settings;
				    var n = ((cell._layout_sizes && !cell._render_borders) || cell._settings.borderless)?"0px":"1px";

				    cell._viewobj.style.borderTopWidth=cell._viewobj.style.borderBottomWidth=cell._viewobj.style.borderLeftWidth=cell._viewobj.style.borderRightWidth=n;
			    }
			    
			    this._beforeResetBorders(config);
			    for (var i=0; i<config.length; i++)
				    if (config[i].borderless && this._cells[i]._set_inner)
					    this._cells[i]._set_inner(config[i]);
			    this._afterResetBorders(this._cells);
		    }

		    if (webix._responsive_tinkery) return;
		    webix.ui.baselayout.prototype.resizeChildren.call(this);
	    },
	    _hasBorders:function(){
		    return this._padding && this._margin>0 && !this._cleanlayout;
	    },
	    _beforeResetBorders:function(collection){
		    if (this._hasBorders() && (!this._settings.borderless || this._settings.type == "space")){
			    for (var i=0; i < collection.length; i++){
				    if (!collection[i]._inner || !collection[i].borderless)
					    collection[i]._inner={ top:false, left:false, right:false, bottom:false};
			    }
		    } else {
			    for (var i=0; i < collection.length; i++)
				    collection[i]._inner=webix.clone(this._settings._inner);
			    var mode = false;
			    if (this._cleanlayout)
				    mode = true;
				
			    var maxlength = collection.length;				
			    if (this._vertical_orientation){
				    for (var i=1; i < maxlength-1; i++)
					    collection[i]._inner.top = collection[i]._inner.bottom = mode;
				    if (maxlength>1){
					    if (this._settings.type!="head")
						    collection[0]._inner.bottom = mode;

					    while (collection[maxlength-1].hidden && maxlength>1)
						    maxlength--;
					    if (maxlength>0)
						    collection[maxlength-1]._inner.top = mode;
				    }
			    }
			    else {
				    for (var i=1; i < maxlength-1; i++)
					    collection[i]._inner.left = collection[i]._inner.right= mode;
				    if (maxlength>1){
					    if (this._settings.type!="head")
						    collection[0]._inner.right= mode;
					    collection[maxlength-1]._inner.left = mode;

					    while (maxlength>1 && collection[maxlength-1].hidden)
						    maxlength--;
					    if (maxlength>0)
						    collection[maxlength-1]._inner.left = mode;
				    }
			    }

		    }
	    },
	    _fix_container_borders:function(style, inner){
		    if (inner.top) 
			    style.borderTopWidth="0px";
		    if (inner.left) 
			    style.borderLeftWidth="0px";
		    if (inner.right) 
			    style.borderRightWidth="0px";
		    if (inner.bottom) 
			    style.borderBottomWidth="0px";
	    },
	    _afterResetBorders:function(collection){
		    var start = 0; 
		    for (var i=0; i<collection.length; i++){
			    var cell = this._cells[i];

			    var s_inner = cell._settings._inner;
			    if (cell._settings.hidden && this._cells[i+1]){
				    var s_next = this._cells[i+1]._settings._inner;
				    if (!s_inner.top)
					    s_next.top = false;
				    if (!s_inner.left)
					    s_next.left = false;

				    if (i==start) start++;
			    }
			    this._fix_container_borders(cell._viewobj.style, cell._settings._inner);
		    }

		    var style = this._vertical_orientation?"marginLeft":"marginTop";
		    var contrstyle = this._vertical_orientation?"marginTop":"marginLeft";
		    var padding = this._vertical_orientation?this._paddingX:this._paddingY;
		    var contrpadding = this._vertical_orientation?this._paddingY:this._paddingX;

		    //add top offset to all
		    for (var i=0; i<collection.length; i++)
			    this._cells[i]._viewobj.style[style] = (padding||0) + "px";			

		    //add left offset to first cell
		    if (this._cells.length)
			    this._cells[start]._viewobj.style[contrstyle] = (contrpadding||0)+"px";

		    //add offset between cells
		    for (var index=start+1; index<collection.length; index++)
			    this._cells[index]._viewobj.style[contrstyle]=this._margin+"px";
		    
	    },
	    type_setter:function(value){
		    this._margin = (typeof this._margin_set[value] != "undefined"? this._margin_set[value]: this._margin_set["line"]);
		    this._paddingX = this._paddingY = (typeof this._margin_set[value] != "undefined"? this._padding_set[value]: this._padding_set["line"]);
		    this._cleanlayout = (value=="material" || value=="clean");
		    if (value == "material")
			    this._settings.borderless = true;

		    return value;
	    },
	    $skin:function(){
		    var skin = webix.skin.$active;
		    this._margin_set = skin.layoutMargin;
		    this._padding_set = skin.layoutPadding;
	    }
    }, webix.ui.baselayout);

webix.ui.layout.call(webix);
return webix;
});
