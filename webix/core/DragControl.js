define(["webix/core/webix"], function webix_dragcontrol(webix){



    /*
	  Behavior:DND - low-level dnd handling
	  @export
	  getContext
	  addDrop
	  addDrag
	  
	  DND master can define next handlers
	  onCreateDrag
	  onDragIng
	  onDragOut
	  onDrag
	  onDrop
	  all are optional
    */



    webix.DragControl={
	    //has of known dnd masters
	    _drag_masters : webix.toArray(["dummy"]),
	    /*
		  register drop area
		  @param node 			html node or ID
		  @param ctrl 			options dnd master
		  @param master_mode 		true if you have complex drag-area rules
	    */
	    addDrop:function(node,ctrl,master_mode){
		    node = webix.toNode(node);
		    node.webix_drop=this._getCtrl(ctrl);
		    if (master_mode) node.webix_master=true;
	    },
	    //return index of master in collection
	    //it done in such way to prevent dnd master duplication
	    //probably useless, used only by addDrop and addDrag methods
	    _getCtrl:function(ctrl){
		    ctrl = ctrl||webix.DragControl;
		    var index = this._drag_masters.find(ctrl);
		    if (index<0){
			    index = this._drag_masters.length;
			    this._drag_masters.push(ctrl);
		    }
		    return index;
	    },
	    _createTouchDrag: function(e){
		    var dragCtrl = webix.DragControl;
		    var master = this._getActiveDragMaster();
		    // for data items only
		    if(master && master._getDragItemPos){

			    if(!dragCtrl._html)
				    dragCtrl.createDrag(e);
			    var ctx = dragCtrl._drag_context;
			    dragCtrl._html.style.left= e.x+dragCtrl.left+ (ctx.x_offset||0)+"px";
			    dragCtrl._html.style.top= e.y+dragCtrl.top+ (ctx.y_offset||0) +"px";
		    }
	    },
	    /*
		  register drag area
		  @param node 	html node or ID
		  @param ctrl 	options dnd master
	    */
	    addDrag:function(node,ctrl){
	        node = webix.toNode(node);
	        node.webix_drag=this._getCtrl(ctrl);
		    webix._event(node,webix.env.mouse.down,this._preStart,{ bind:node });
		    webix._event(node,"dragstart",webix.html.preventEvent);
	    },
	    //logic of drag - start, we are not creating drag immediately, instead of that we hears mouse moving
	    _preStart:function(e){
		    if (webix.DragControl._active){
			    //if we have nested drag areas, use the top one and ignore the inner one
			    if (webix.DragControl._saved_event == e) return;
			    webix.DragControl._preStartFalse();
			    webix.DragControl.destroyDrag(e);
		    }
		    webix.DragControl._active=this;

		    var evobj = webix.env.mouse.context(e);
		    webix.DragControl._start_pos=evobj;
		    webix.DragControl._saved_event = e;

		    webix.DragControl._webix_drag_mm = webix.event(document.body,webix.env.mouse.move,webix.DragControl._startDrag);
		    webix.DragControl._webix_drag_mu = webix.event(document,webix.env.mouse.up,webix.DragControl._preStartFalse);

		    //need to run here, or will not work in IE
		    webix.html.addCss(document.body,"webix_noselect", 1);
	    },
	    //if mouse was released before moving - this is not a dnd, remove event handlers
	    _preStartFalse:function(){
		    webix.DragControl._clean_dom_after_drag();
	    },
	    //mouse was moved without button released - dnd started, update event handlers
	    _startDrag:function(e){
		    //prevent unwanted dnd
		    var pos = webix.env.mouse.context(e);
		    var master = webix.DragControl._getActiveDragMaster();
		    // only long-touched elements can be dragged

		    var longTouchLimit = (master && webix.env.touch && master._getDragItemPos && !webix.Touch._long_touched);
		    if (longTouchLimit || Math.abs(pos.x-webix.DragControl._start_pos.x)<5 && Math.abs(pos.y-webix.DragControl._start_pos.y)<5)
			    return;

		    webix.DragControl._clean_dom_after_drag(true);
		    if(!webix.DragControl._html)
			    if (!webix.DragControl.createDrag(webix.DragControl._saved_event)) return;
		    
		    webix.DragControl.sendSignal("start"); //useless for now
		    webix.DragControl._webix_drag_mm = webix.event(document.body,webix.env.mouse.move,webix.DragControl._moveDrag);
		    webix.DragControl._webix_drag_mu = webix.event(document,webix.env.mouse.up,webix.DragControl._stopDrag);
		    webix.DragControl._moveDrag(e);

		    if (webix.env.touch)
			    return webix.html.preventEvent(e);
	    },
	    //mouse was released while dnd is active - process target
	    _stopDrag:function(e){
		    webix.DragControl._clean_dom_after_drag();
		    webix.DragControl._saved_event = null;

		    if (webix.DragControl._last){	//if some drop target was confirmed
			    webix.DragControl.$drop(webix.DragControl._active, webix.DragControl._last, e);
			    webix.DragControl.$dragOut(webix.DragControl._active,webix.DragControl._last,null,e);
		    }
		    webix.DragControl.destroyDrag(e);
		    webix.DragControl.sendSignal("stop");	//useless for now
	    },
	    _clean_dom_after_drag:function(still_drag){
		    this._webix_drag_mm = webix.eventRemove(this._webix_drag_mm);
		    this._webix_drag_mu = webix.eventRemove(this._webix_drag_mu);
		    if (!still_drag)
			    webix.html.removeCss(document.body,"webix_noselect");
	    },
	    //dnd is active and mouse position was changed
	    _moveDrag:function(e){
		    var dragCtrl = webix.DragControl;
		    var pos = webix.html.pos(e);
		    var evobj = webix.env.mouse.context(e);

		    //give possibility to customize drag position
		    var customPos = dragCtrl.$dragPos(pos, e);
		    //adjust drag marker position
		    var ctx = dragCtrl._drag_context;
		    dragCtrl._html.style.top=pos.y+dragCtrl.top+(customPos||!ctx.y_offset?0:ctx.y_offset) +"px";
		    dragCtrl._html.style.left=pos.x+dragCtrl.left+(customPos||!ctx.x_offset?0:ctx.x_offset)+"px";

		    if (dragCtrl._skip)
			    dragCtrl._skip=false;
		    else {
			    var target = evobj.target = webix.env.touch ? document.elementFromPoint(evobj.x, evobj.y) : evobj.target;
			    var touch_event = webix.env.touch ? evobj : e;
			    dragCtrl._checkLand(target, touch_event);
		    }
		    
		    return webix.html.preventEvent(e);
	    },
	    //check if item under mouse can be used as drop landing
	    _checkLand:function(node,e){
		    while (node && node.tagName!="BODY"){
			    if (node.webix_drop){	//if drop area registered
				    if (this._last && (this._last!=node || node.webix_master))	//if this area with complex dnd master
					    this.$dragOut(this._active,this._last,node,e);			//inform master about possible mouse-out
				    if (!this._last || this._last!=node || node.webix_master){	//if this is new are or area with complex dnd master
					    this._last=null;										//inform master about possible mouse-in
					    this._landing=this.$dragIn(webix.DragControl._active,node,e);
					    if (this._landing)	//landing was rejected
						    this._last=node;
					    return;				
				    } 
				    return;
			    }
			    node=node.parentNode;
		    }
		    if (this._last)	//mouse was moved out of previous landing, and without finding new one 
			    this._last = this._landing = this.$dragOut(this._active,this._last,null,e);
	    },
	    //mostly useless for now, can be used to add cross-frame dnd
	    sendSignal:function(signal){
		    webix.DragControl.active=(signal=="start");
	    },
	    
	    //return master for html area
	    getMaster:function(t){
		    return this._drag_masters[t.webix_drag||t.webix_drop];
	    },
	    //return dhd-context object
	    getContext:function(){
		    return this._drag_context;
	    },
	    getNode:function(){
		    return this._html;
	    },
	    //called when dnd is initiated, must create drag representation
	    createDrag:function(e){ 
		    var dragCtl = webix.DragControl;
		    var a=dragCtl._active;

		    dragCtl._drag_context = {};
		    var master = this._drag_masters[a.webix_drag];
            var drag_container;

		    //if custom method is defined - use it
		    if (master.$dragCreate){
			    drag_container=master.$dragCreate(a,e);
			    if (!drag_container) return false;
			    this._setDragOffset(e);
			    drag_container.style.position = 'absolute';
		    } else {
		        //overvise use default one
			    var text = dragCtl.$drag(a,e);
			    dragCtl._setDragOffset(e);

			    if (!text) return false;
			    drag_container = document.createElement("DIV");
			    drag_container.innerHTML=text;
			    drag_container.className="webix_drag_zone";
			    document.body.appendChild(drag_container);

			    var context = dragCtl._drag_context;
			    if (context.html && webix.env.pointerevents){
				    context.x_offset = -Math.round(drag_container.offsetWidth  * 0.5);
				    context.y_offset = -Math.round(drag_container.offsetHeight * 0.75);
			    }
		    }
		    /*
			  dragged item must have topmost z-index
			  in some cases item already have z-index
			  so we will preserve it if possible
		    */
		    drag_container.style.zIndex = Math.max(drag_container.style.zIndex,webix.ui.zIndex());

		    webix.DragControl._skipDropH = webix.event(drag_container,webix.env.mouse.move,webix.DragControl._skip_mark);

		    if (!webix.DragControl._drag_context.from)
			    webix.DragControl._drag_context = {source:a, from:a};
		    
		    webix.DragControl._html=drag_container;
		    return true;
	    },
	    //helper, prevents unwanted mouse-out events
	    _skip_mark:function(){
		    webix.DragControl._skip=true;
	    },
	    //after dnd end, remove all traces and used html elements
	    destroyDrag:function(e){
		    var a=webix.DragControl._active;
		    var master = this._drag_masters[a.webix_drag];

		    if (master && master.$dragDestroy){
			    webix.DragControl._skipDropH = webix.eventRemove(webix.DragControl._skipDropH);
			    if(webix.DragControl._html)
				    master.$dragDestroy(a,webix.DragControl._html,e);
		    }
		    else{
			    webix.html.remove(webix.DragControl._html);
		    }
		    webix.DragControl._landing=webix.DragControl._active=webix.DragControl._last=webix.DragControl._html=null;
		    //webix.DragControl._x_offset = webix.DragControl._y_offset = null;
	    },
	    _getActiveDragMaster: function(){
		    return webix.DragControl._drag_masters[webix.DragControl._active.webix_drag];
	    },
	    top:5,	 //relative position of drag marker to mouse cursor
	    left:5,
	    _setDragOffset:function(e){
		    var dragCtl = webix.DragControl;
		    var pos = dragCtl._start_pos;
		    var ctx = dragCtl._drag_context;

		    if(typeof ctx.x_offset != "undefined" && typeof ctx.y_offset != "undefined")
			    return null;

		    ctx.x_offset = ctx.y_offset = 0;
		    if(webix.env.pointerevents){
			    var m=webix.DragControl._getActiveDragMaster();

			    if (m._getDragItemPos && m!==this){
				    var itemPos = m._getDragItemPos(pos,e);

				    if(itemPos){
					    ctx.x_offset = itemPos.x - pos.x;
					    ctx.y_offset = itemPos.y - pos.y;
				    }

			    }

		    }
	    },
	    $dragPos:function(pos, e){
		    var m=this._drag_masters[webix.DragControl._active.webix_drag];
		    if (m.$dragPos && m!=this){
			    m.$dragPos(pos, e, webix.DragControl._html);
			    return true;
		    }
	    },
	    //called when mouse was moved in drop area
	    $dragIn:function(s,t,e){
		    var m=this._drag_masters[t.webix_drop];
		    if (m.$dragIn && m!=this) return m.$dragIn(s,t,e);
		    t.className=t.className+" webix_drop_zone";
		    return t;
	    },
	    //called when mouse was moved out drop area
	    $dragOut:function(s,t,n,e){
		    var m=this._drag_masters[t.webix_drop];
		    if (m.$dragOut && m!=this) return m.$dragOut(s,t,n,e);
		    t.className=t.className.replace("webix_drop_zone","");
		    return null;
	    },
	    //called when mouse was released over drop area
	    $drop:function(s,t,e){
		    var m=this._drag_masters[t.webix_drop];
		    webix.DragControl._drag_context.from = webix.DragControl.getMaster(s);
		    if (m.$drop && m!=this) return m.$drop(s,t,e);
		    t.appendChild(s);
	    },
	    //called when dnd just started
	    $drag:function(s,e){
		    var m=this._drag_masters[s.webix_drag];
		    if (m.$drag && m!=this) return m.$drag(s,e);
		    return "<div style='"+s.style.cssText+"'>"+s.innerHTML+"</div>";
	    }	
    };

    //global touch-drag handler
    webix.attachEvent("onLongTouch", function(ev){
	    if(webix.DragControl._active)
		    webix.DragControl._createTouchDrag(ev);
    });

return webix;
});
