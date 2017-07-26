define(["webix/core/webix"], function webix_animate(webix){
webix.animate = function(html_element, config){
	    var animation = config;
	    if (webix.isArray(html_element)){
		    for (var i=0; i < html_element.length; i++) {
			    if(webix.isArray(config))
				    animation = config[i];

			    if(animation.type == 'slide'){
				    if(animation.subtype == 'out' && i===0) { // next
				        continue;
				    }
				    if(animation.subtype == 'in' && i==1) { // current
				        continue;
				    }
			    }
			    if(animation.type == 'flip'){
				    var animation_copy = webix.clone(animation);
				    if(i===0) { // next
				        animation_copy.type = 'flipback';
				    }
				    if(i==1) { // current
				        animation_copy.callback = null;
				    }
				    webix.animate(html_element[i], animation_copy);
				    continue;
			    }
			    webix.animate(html_element[i], animation);
		    }
		    return;
	    }
	    var node = webix.toNode(html_element);
	    if (node._has_animation)
		    webix.animate.end(node, animation);
	    else
		    webix.animate.start(node, animation);
    };
    webix.animate.end = function(node, animation){
	    //stop animation
	    node.style[webix.env.transitionDuration] = "1ms";
	    node._has_animation = null;
	    //clear animation wait order, if any
	    if (webix._wait_animate)
		    window.clearTimeout(webix._wait_animate);

	    //plan next animation, if any
	    webix._wait_animate = webix.delay(webix.animate, webix, [node,animation],10);
    };
    webix.animate.isSupported=function(){
	    return !webix.$testmode && !webix.noanimate && webix.env.transform && webix.env.transition && !webix.env.isOpera;
    };
    webix.animate.formLine=function(next, current, animation){
        var direction = animation.direction;

        //sometimes user can initiate animation multiple times ( fast clicking )
        //as result animation may be called against already removed from the dom node
        if(current.parentNode)
            current.parentNode.style.position = "relative";
        
        current.style.position = "absolute";
	    next.style.position = "absolute";

	    //this is initial shift of second view in animation
	    //normally we need to have this value as 0
	    //but FF has bug with animation initially invisible elements
	    //so we are adjusting this value, to make 1px of second view visible
	    var defAniPos = webix.env.isFF ? ( direction == "top" || direction == "left" ? -1 : 1) : 0;

	    if(direction=="top"||direction=="bottom"){
		    next.style.left="0px";
		    next.style.top = (animation.top || defAniPos) + (direction=="top"?1:-1)*current.offsetHeight+"px";
	    }
	    else{
		    next.style.top = (animation.top || 0) + "px";
		    next.style.left = defAniPos + (direction=="left"?1:-1)*current.offsetWidth+"px";
	    }

	    // apply 'keepViews' mode, iframe, datatable with x scroll solution
	    //( keepViews won't work in case of "in" and "out" subtypes )
	    if(current.parentNode == next.parentNode && animation.keepViews)
		    next.style.display = "";
	    else
		    webix.html.insertBefore(next, current.nextSibling, current.parentNode);

	    if(animation.type == 'slide' && animation.subtype == 'out') {
		    next.style.left = "0px";
		    next.style.top = (animation.top || 0)+"px";
		    current.parentNode.removeChild(current);
		    webix.html.insertBefore(current, next.nextSibling, next.parentNode);
	    }
	    return [next, current];
    };
    webix.animate.breakLine=function(line){
	    if(arguments[1])
		    line[1].style.display = "none"; // 'keepViews' multiview mode
	    else
		    webix.html.remove(line[1]); // 1 = current
	    webix.animate.clear(line[0]);
	    webix.animate.clear(line[1]);
	    line[0].style.position="";
    };
    webix.animate.clear=function(node){
	    node.style[webix.env.transform] = "none";
	    node.style[webix.env.transition] = "none";
	    node.style.top = node.style.left = "";
    };
    webix.animate.defaults = {
		type: 'slide',
		delay: '0',
		duration: '500',
		timing: 'ease-in-out',
		x: 0,
		y: 0
    };
    webix.animate.start = function(node, animation){
	    //getting config object by merging specified and default options
 	    if (typeof animation == 'string')
		    animation = {type: animation};

        animation = webix.Settings._mergeSettings(animation,webix.animate.defaults);

	    var prefix = webix.env.cssPrefix;
        var settings = node._has_animation = animation;
        var skew_options, scale_type;

        //jshint -W086:true
	    switch(settings.type == 'slide' && settings.direction) { // getting new x, y in case it is slide with direction
		case 'right':
			settings.x = node.offsetWidth;
			break;
		case 'left':
			settings.x = -node.offsetWidth;
			break;
		case 'top':
			settings.y = -node.offsetHeight;
			break;
		case 'bottom':
		default:
			settings.y = settings.y||node.offsetHeight;
			break;
	    }

        if(settings.type == 'flip' || settings.type == 'flipback') {
    		skew_options = [0, 0];
            scale_type = 'scaleX';
            if(settings.subtype == 'vertical') {
                skew_options[0] = 20;
                scale_type = 'scaleY';
            }
            else
                skew_options[1] = 20;
            if(settings.direction == 'right' || settings.direction == 'bottom') {
                skew_options[0] *= -1; skew_options[1] *= -1;
            }
        }

	    var duration = settings.duration + "ms " + settings.timing + " " + settings.delay+"ms";
	    var css_general = prefix+"TransformStyle: preserve-3d;"; // general css rules
	    var css_transition = '';
	    var css_transform = '';

	    switch(settings.type) {
		case 'fade': // changes opacity to 0
			css_transition = "opacity " + duration;
			css_general = "opacity: 0;";
			break;
		case 'show': // changes opacity to 1
			css_transition = "opacity " + duration;
			css_general = "opacity: 1;";
			break;
        case 'flip':
            duration = (settings.duration/2) + "ms " + settings.timing + " " + settings.delay+"ms";
            css_transform = "skew("+skew_options[0]+"deg, "+skew_options[1]+"deg) "+scale_type+"(0.00001)";
            css_transition = "all "+(duration);
            break;
        case 'flipback':
            settings.delay += settings.duration/2;
            duration = (settings.duration/2) + "ms " + settings.timing + " " + settings.delay+"ms";
            node.style[webix.env.transform] = "skew("+(-1*skew_options[0])+"deg, "+(-1*skew_options[1])+"deg) "+scale_type+"(0.00001)";
            node.style.left = "0";

            css_transform = "skew(0deg, 0deg) "+scale_type+"(1)";
            css_transition = "all "+(duration);
            break;
		case 'slide': // moves object to specified location
			var x = settings.x +"px";
			var y = settings.y +"px";
            // translate(x, y) OR translate3d(x, y, 0)
			css_transform = webix.env.translate+"("+x+", "+y+((webix.env.translate=="translate3d")?", 0":"")+")";
			css_transition = prefix+"transform " + duration;
			break;
		default:
			break;
	    }

	    //set styles only after applying transition settings
        webix.delay(function(){
            node.style[webix.env.transition] = css_transition;
            webix.delay(function(){
                if (css_general)
                    node.style.cssText += css_general;
                if (css_transform)
                    node.style[webix.env.transform] = css_transform;
                var transitionEnded = false;
                var tid = webix.event(node, webix.env.transitionEnd, function(ev){
                    node._has_animation = null;
                    if (settings.callback) settings.callback.call((settings.master||window), node,settings,ev);
                    transitionEnded = true;
                    webix.eventRemove(tid);
                });
                window.setTimeout(function(){
                    if(!transitionEnded){
                        node._has_animation = null;
                        if (settings.callback) settings.callback.call((settings.master||window), node,settings);
                        transitionEnded = true;
                        webix.eventRemove(tid);
                    }
                }, (settings.duration*1+settings.delay*1)*1.3);
            });
        });
    };
return webix;
});
