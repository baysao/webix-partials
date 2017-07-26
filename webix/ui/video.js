
/*
	UI:Video
*/

webix.protoUI({
	name:"video",
	$init:function(config){
		if (!config.id) config.id = webix.uid();
		this.$ready.push(this._init_video);
	},
	_init_video:function(){
		var c = this._settings;
		this._contentobj  = webix.html.create("video",{
			"class":"webix_view_video",
			"style":"width:100%;height:100%;",
			"autobuffer":"autobuffer"
		},"");
		if(c.poster)
			this._contentobj.poster=c.poster;

		if(c.src){
			if(typeof c.src!= "object")
				c.src = [c.src];
			for(var i = 0; i < c.src.length;i++)
				this._contentobj.innerHTML += ' <source src="'+ c.src[i]+'">';
		}
	
		if(c.controls)
			this._contentobj.controls=true;
		if(c.autoplay)
			this._contentobj.autoplay=true;
		this._viewobj.appendChild(this._contentobj);
	},
	getVideo:function(){
		return this._contentobj;
	},
	defaults:{
		src:"",
		controls: true
	}
}, webix.ui.view);
