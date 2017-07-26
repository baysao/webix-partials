define(["webix/core/webix"], function webix_customscroll(webix){
    (function(){

	    var webixCustomScroll = webix.CustomScroll = {
		    scrollStep:40,
		    init:function(){
			    this._init_once();
			    webix.env.$customScroll = true;
			    webix.ui.scrollSize = 0;
			    webix.destructors.push({
				    obj:{
					    destructor:function(){
						    this._last_active_node = null;
					    }
				    }
			    });
			    webix.attachEvent("onReconstruct", webixCustomScroll._on_reconstruct);
			    webix.attachEvent("onResize", webixCustomScroll._on_reconstruct);

			    //adjusts scroll after view repainting
			    //for example, opening a branch in the tree
			    //it will be better to handle onAfterRender of the related view
			    webix.attachEvent("onClick", webixCustomScroll._on_reconstruct);
		    },
		    resize:function(){
			    this._on_reconstruct();
		    },
		    _enable_datatable:function(view){
			    view._body._custom_scroll_view = view._settings.id;
			    view.attachEvent("onAfterRender", function(){
				    var scroll = webixCustomScroll._get_datatable_sizes(this);
				    var y = Math.max(scroll.dy - scroll.py, 0);
				    var x = Math.max(scroll.dx - scroll.px, 0);

				    if (this._y_scroll && this._scrollTop > y){
					    this._y_scroll.scrollTo(y);
				    }
				    else if (this._x_scroll && this._scrollLeft > x){
					    this._x_scroll.scrollTo(x);
				    }

				    if ( webixCustomScroll._last_active_node == this._body)
				 	    webixCustomScroll._on_reconstruct();
			    });
			    webix._event(view._body, "mouseover", 	webixCustomScroll._mouse_in 		);
			    webix._event(view._body, "mouseout", 	webixCustomScroll._mouse_out		);
		    },
		    enable:function(view, mode){ 
			    webixCustomScroll._init_once();
			    if (view.mapCells)
				    return this._enable_datatable(view);

			    var node = view;
			    if (view._dataobj)
				    node = view._dataobj.parentNode;
			    
			    node._custom_scroll_mode = mode||"xy";
			    webix._event(node, "mouseover", 	webixCustomScroll._mouse_in 		);
			    webix._event(node, "mouseout", 	webixCustomScroll._mouse_out		);
			    webix._event(node, "mousewheel", 	webixCustomScroll._mouse_wheel	);
			    webix._event(node, "DOMMouseScroll", 	webixCustomScroll._mouse_wheel	);

			    // update scroll on data change
			    this._setDataHandler(view);
		    },
		    _on_reconstruct:function(){
			    var last = webixCustomScroll._last_active_node;
			    if (last && last._custom_scroll_size){
				    webixCustomScroll._mouse_out_timed.call(last);
				    webixCustomScroll._mouse_in.call(last);
			    }			
		    },
		    _init_once:function(e){
			    webix.event(document.body, "mousemove", 	function(e){
				    if (webixCustomScroll._active_drag_area)
					    webixCustomScroll._adjust_scroll(webixCustomScroll._active_drag_area, webixCustomScroll._active_drag_area._scroll_drag_pos, webix.html.pos(e));
			    });
			    webixCustomScroll._init_once = function(){};
		    },
		    _mouse_in:function(e){
			    webixCustomScroll._last_active_node  = this;

			    clearTimeout(this._mouse_out_timer);
			    if (this._custom_scroll_size || webixCustomScroll._active_drag_area) return;
			    
			    var sizes;
			    if (this._custom_scroll_view){
				    //ger related view
				    var view = webix.$$(this._custom_scroll_view);
				    //if view was removed, we need not scroll anymore
				    if (!view) return;
				    sizes = webixCustomScroll._get_datatable_sizes(view);
			    } else{
				    sizes = {
					    dx:this.scrollWidth,
					    dy:this.scrollHeight,
					    px:this.clientWidth,
					    py:this.clientHeight
				    };
				    sizes._scroll_x = sizes.dx > sizes.px && this._custom_scroll_mode.indexOf("x") != -1;
				    sizes._scroll_y = sizes.dy > sizes.py && this._custom_scroll_mode.indexOf("y") != -1;
			    }

			    this._custom_scroll_size = sizes;
			    if (sizes._scroll_x){
				    sizes._scroll_x_node = webixCustomScroll._create_scroll(this, "x", sizes.dx, sizes.px, "width", "height");
				    sizes._sx = (sizes.px - sizes._scroll_x_node.offsetWidth - 4);
				    sizes._vx = sizes.dx - sizes.px;
				    if(webixCustomScroll.trackBar)
					    sizes._bar_x = webixCustomScroll._create_bar(this,"x");
			    }
			    if (sizes._scroll_y){
				    sizes._scroll_y_node = webixCustomScroll._create_scroll(this, "y", sizes.dy, sizes.py, "height", "width");
				    sizes._sy = (sizes.py - sizes._scroll_y_node.offsetHeight - 4);
				    sizes._vy = sizes.dy - sizes.py;

				    if(webixCustomScroll.trackBar)
					    sizes._bar_y = webixCustomScroll._create_bar(this,"y");
			    }

			    webixCustomScroll._update_scroll(this);
		    },
		    _create_bar: function(node, mode){
			    var bar = webix.html.create("DIV", {
				    "webixignore":"1",
				    "class":"webix_c_scroll_bar_"+mode
			    },"");

			    node.appendChild(bar);
			    return bar;
		    },
		    _adjust_scroll:function(node, old, pos){
			    var config = node._custom_scroll_size;
			    var view = node._custom_scroll_view;
			    if (view) view = webix.$$(view);

			    if (config._scroll_x_node == node._scroll_drag_enabled){
				    var next = (pos.x - old.x)*config._vx/config._sx;
				    if (view)
					    view._x_scroll.scrollTo(view._scrollLeft+next);
				    else
					    webixCustomScroll._set_scroll_value(node, "scrollLeft", next);
			    }
			    if (config._scroll_y_node == node._scroll_drag_enabled){
				    var next = (pos.y - old.y)*config._vy/config._sy;
				    if (view)
					    view._y_scroll.scrollTo(view._scrollTop+next);
				    else
					    webixCustomScroll._set_scroll_value(node, "scrollTop", next);
			    }

			    node._scroll_drag_pos = pos;
			    webixCustomScroll._update_scroll(node);
		    },
		    _get_datatable_sizes:function(view){
			    var sizes = {};
			    if (view._x_scroll && view._settings.scrollX){
				    sizes.dx = view._x_scroll._settings.scrollWidth;
				    sizes.px = view._x_scroll._last_set_size || 1;
				    sizes._scroll_x = sizes.dx - sizes.px > 1;
			    }
			    if (view._y_scroll && view._settings.scrollY){
				    sizes.dy = view._y_scroll._settings.scrollHeight;
				    sizes.py = view._y_scroll._last_set_size || 1;
				    sizes._scroll_y = sizes.dy - sizes.py > 1;
			    }
			    return sizes;
		    },
		    _mouse_out:function(){
			    clearTimeout(this._mouse_out_timer);
			    this._mouse_out_timer = webix.delay(webixCustomScroll._mouse_out_timed, this, [], 200);
		    },
		    _removeScroll:function(scroll){
			    if (scroll){
				    webix.html.remove(scroll);
				    if (scroll._webix_event_sc1){
					    webix.eventRemove(scroll._webix_event_sc1);
					    webix.eventRemove(scroll._webix_event_sc2);
				    }
			    }
		    },
		    _mouse_out_timed:function(){
			    if (this._custom_scroll_size){
				    if (this._scroll_drag_enabled){
					    this._scroll_drag_released = true;
					    return;
				    }
				    var sizes = this._custom_scroll_size;
				    webixCustomScroll._removeScroll(sizes._scroll_x_node);
				    webixCustomScroll._removeScroll(sizes._scroll_y_node);
				    webix.html.removeCss(document.body,"webix_noselect");
				    if(sizes._bar_x){
					    webix.html.remove(sizes._bar_x);
				    }
				    if(sizes._bar_y){
					    webix.html.remove(sizes._bar_y);
				    }
				    this._custom_scroll_size = null;
			    }
		    },
		    _mouse_wheel:function(e){
			    var sizes = this._custom_scroll_size;
			    var delta = e.wheelDelta/-40;
			    var toblock = true;
			    if (!delta && e.detail && webix.isUndefined(e.wheelDelta))
				    delta = e.detail;
			    if (sizes){
				    if (sizes._scroll_x_node && (e.wheelDeltaX || ( delta && !sizes._scroll_y_node ))){
					    var x_dir  = (e.wheelDeltaX/-40)||delta;
					    //see below
					    toblock = webixCustomScroll._set_scroll_value(this, "scrollLeft", x_dir*webixCustomScroll.scrollStep);
				    } else if (delta && sizes._scroll_y_node){
					    
					    //lesser flickering of scroll in IE
					    //also prevent scrolling outside of borders because of scroll-html-elements
					    toblock = webixCustomScroll._set_scroll_value(this, "scrollTop", delta*webixCustomScroll.scrollStep);
				    }
			    }

			    
			    webixCustomScroll._update_scroll(this);
			    if (toblock !== false)
				    return webix.html.preventEvent(e);
		    },
		    _set_scroll_value:function(node, pose, value){
			    var sizes = node._custom_scroll_size;
			    var max_scroll = (pose == "scrollLeft") ? (sizes.dx - sizes.px) : (sizes.dy - sizes.py);
			    var now = node[pose];

			    if (now+value > max_scroll)
				    value = max_scroll - now;
			    if (!value || (now+value < 0 && now === 0))
				    return false;
			    
			    
			    if (webix.env.isIE){
				    webixCustomScroll._update_scroll(node, pose, value + now);
				    node[pose] += value;
			    } else
				    node[pose] += value;

			    return true;
		    },
		    _create_scroll:function(node, mode, dy, py, dim, pos){
			    var scroll = webix.html.create("DIV", {
				    "webixignore":"1",
				    "class":"webix_c_scroll_"+mode
			    },"<div></div>");

			    scroll.style[dim] = Math.max((py*py/dy-7),40)+"px";
			    node.style.position = "relative";
			    node.appendChild(scroll);
			    node._webix_event_sc1 = webix.event(scroll, "mousedown", webixCustomScroll._scroll_drag(node));
			    node._webix_event_sc2 = webix.event(document.body, "mouseup", webix.bind(webixCustomScroll._scroll_drop, node));
			    return scroll;
		    },
		    _scroll_drag:function(node){
			    return function(e){
				    webix.html.addCss(document.body,"webix_noselect",1);
				    this.className += " webix_scroll_active";
				    webixCustomScroll._active_drag_area = node;
				    node._scroll_drag_enabled = this;
				    node._scroll_drag_pos = webix.html.pos(e);
			    };
		    },
		    _scroll_drop:function(node){
			    if (this._scroll_drag_enabled){
				    webix.html.removeCss(document.body,"webix_noselect");
				    this._scroll_drag_enabled.className = this._scroll_drag_enabled.className.toString().replace(" webix_scroll_active","");
				    this._scroll_drag_enabled = false;
				    webixCustomScroll._active_drag_area = 0;
				    if (this._scroll_drag_released){
					    webixCustomScroll._mouse_out_timed.call(this);
					    this._scroll_drag_released = false;
				    }
			    }
		    },
		    _update_scroll:function(node, pose, value){
			    var sizes = node._custom_scroll_size;
			    if (sizes && (sizes._scroll_x_node||sizes._scroll_y_node)){
				    var view = node._custom_scroll_view;

				    var left_scroll = pose == "scrollLeft" ? value : node.scrollLeft;
				    var left = view?webix.$$(view)._scrollLeft:left_scroll;
				    var shift_left = view?0:left;

				    var top_scroll = pose == "scrollTop" ? value : node.scrollTop;
				    var top = view?(webix.$$(view)._scrollTop):top_scroll;
				    var shift_top = view?0:top;

				    if (sizes._scroll_x_node){
					    sizes._scroll_x_node.style.bottom = 1 - shift_top + "px";
					    sizes._scroll_x_node.style.left = Math.round(sizes._sx*left/(sizes.dx-sizes.px)) + shift_left + 1 +"px";
					    if(sizes._bar_x){
						    sizes._bar_x.style.bottom = 1 - shift_top + "px";
						    sizes._bar_x.style.left = shift_left + "px";
					    }
				    }
				    if (sizes._scroll_y_node){
					    sizes._scroll_y_node.style.right = 0 - shift_left + "px";
					    sizes._scroll_y_node.style.top = Math.round(sizes._sy*top/(sizes.dy-sizes.py)) + shift_top + 1 + "px";
					    if(sizes._bar_y){
						    sizes._bar_y.style.right = 0 - shift_left + "px";
						    sizes._bar_y.style.top = shift_top + "px";
					    }

				    }
					
			    }
		    },
		    _setDataHandler: function(view){
			    if(view.data && view.data.attachEvent)
				    view.data.attachEvent("onStoreUpdated", function(){
					    var node = webixCustomScroll._last_active_node;
					    if(node && view.$view.contains(node))
						    webixCustomScroll.resize();
				    });
		    }
	    };

    })();
return webix;
});
