(function(){

	webix.env.printPPI = 96;
	webix.env.printMargin = 0.75*webix.env.printPPI;

	var ppi = webix.env.printPPI;
	var margin = webix.env.printMargin;
	var papers = { "a4":"A4", "a3":"A3", "letter":"letter"};
	var fits = { page:true, data:true};
	var modes = { portrait:true, landscape:true};

	var sizes = {//inches, real size is value*ppi
		"A3": { width: 11.7, height: 16.5 },
		"A4": { width: 8.27, height:11.7 },
		"letter": { width: 8.5, height:11 }
	};

	webix.print = function(id, options){

        var view = webix.$$(id);
		if (view && view.$printView)
			view = view.$printView();

		webix.assert(view, "non-existing view for printing");
		if(!view) return;

		if(view.callEvent)
			view.callEvent("onBeforePrint", [options]);

		options = _checkOptions(options);
		_beforePrint(options);

		//try widget's custom logic first, sometimes it may deny 
		if(!view.$customPrint || view.$customPrint(options) === true) 
			_print(view, options);
 
		_afterPrint(options);
	};

	/*processing print options*/
	function _checkOptions(options){
		
		options = options || {};
        options.paper = papers[(options.paper || "").toLowerCase()] || "A4";
        options.mode = modes[options.mode] ? options.mode : "portrait";
        options.fit = fits[options.fit] ? options.fit: "page";
		options.scroll = options.scroll || false;
        options.size = sizes[options.paper];

		options.margin = (options.margin || options.margin === 0) ? options.margin : {};
        margin = isNaN(options.margin*1) ? margin : options.margin;
        options.margin = {
        	top:(options.margin.top || options.margin.top === 0) ? options.margin.top: margin, 
        	bottom:(options.margin.bottom || options.margin.bottom === 0) ? options.margin.bottom: margin, 
        	right:(options.margin.right || options.margin.right === 0) ? options.margin.right: margin, 
        	left:(options.margin.left || options.margin.left === 0) ? options.margin.left: margin
        };

        return options;
	}

	/*preparing printing environment*/
	function _beforePrint(options){
		webix.html.addCss(document.body,"webix_print");

		if(options.docHeader) _getHeaderFooter("Header", options);
		if(options.docFooter) _getHeaderFooter("Footer", options);

		/* static print styles are located at 'css/print.less'*/
		var cssString = "@media print { "+
			"@page{ size:"+options.paper+" "+options.mode+";"+
				"margin-top:"+options.margin.top+"px;margin-bottom:"+options.margin.bottom+
				"px;margin-right:"+options.margin.right+"px;margin-left:"+options.margin.left+
			"px;}"+
		"}";
		webix.html.addStyle(cssString, "print");
	}

	/*cleaning environment*/
	function _afterPrint(options){
		webix.html.removeCss(document.body, "webix_print");
		webix.html.removeStyle("print");

		if(options.docHeader) webix.html.remove(options.docHeader);
		if(options.docFooter) webix.html.remove(options.docFooter);
	}

	/*common print actions */
	function _print(view, options){
		var doc = view.$view.cloneNode(true);

		//copy data from all canvases
		var canvases = view.$view.getElementsByTagName("canvas");
		if(canvases.length)
			for(var i = canvases.length-1; i >=0; i--){
				var destCtx = doc.getElementsByTagName("canvas")[i].getContext('2d');
				destCtx.drawImage(canvases[i], 0, 0);
			}

		webix.html.insertBefore(doc, options.docFooter, document.body);

		webix.html.addCss(doc,"webix_ui_print");
		if(!options.scroll && ((view._dataobj && view.data && view.data.pull) || view.getBody))
			webix.html.addCss(doc, "webix_print_noscroll");

		window.print();

		webix.html.remove(doc);
	}
	/*custom header nad footer*/
	function _getHeaderFooter(group, options){
		var header =  webix.html.create("div", { 
			"class":"webix_view webix_print_"+group.toLowerCase(),
			"style":"height:0px;visibility:hidden;"
		}, options["doc"+group]);

		if(group ==="Header")
			webix.html.insertBefore(header, document.body.firstChild);
		else
			document.body.appendChild(header);

		options["doc"+group] = header;
	}

})();
