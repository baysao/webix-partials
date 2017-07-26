
webix.protoUI({
    name: "gage",
    defaults: {
        value: 0,
        minRange: 0,
        maxRange: 100,
        minWidth:250,
        minHeight:200,
        smoothFlow: true,
        scale:3,
        stroke:7
    },
    $init: function() {
        this.$ready.push(webix.bind(this._setDefaultView, this));
        this.attachEvent("onDestruct", function(){
            this._circleGradient = this._gageGradientPoint = this._gage = null;
        });
    },
    $setSize: function(x, y) {
        if (webix.ui.view.prototype.$setSize.call(this, x, y)){
            this._refresh(this.config.value);
            this._animate(this.config.value);
        }
    },
    _refresh: function() {
        var curves = this.$view.querySelector('.webix_gage_curves'),
            gageInfo = this.$view.querySelector('.webix_gage_info'),
            kx = this.config.scale,
            x = this.$width;

        curves.setAttribute("r", (x / kx));
        curves.setAttribute("strokeDasharray", Math.round(Math.PI * x / kx));
        curves.style.r = x / kx;
        curves.style.strokeDasharray = Math.round(Math.PI * x / kx);

        gageInfo.setAttribute('style', "width: "+Math.round((x / kx) * 2)+"px;");
        this._gage.setAttribute('style', "height: "+(x / kx + 20)+"px;");
        this._circleGradient.setAttribute("r", (x / kx));
        this._circleGradient.setAttribute('style', "stroke-dasharray: " + Math.round(this.gradientLength * Math.PI * x / kx) + ", 1900;");
        this._draw_line(curves.style.r);
    },
    _safeValue: function(value){
        return Math.min(Math.max(value, this._settings.minRange), this._settings.maxRange);
    },
    _draw_line: function(radius) {
        var svgCoord = this.$width,
            arrowSpace = 0.05,
            value = this.config.value;

        value = this._safeValue(value);

        var currentChartValue = value - this.config.minRange;
        var degrees = Math.round(currentChartValue * 180 / (this.config.maxRange - this.config.minRange));

        if(degrees === 0 || degrees === 180) {
            this._gage.style.paddingTop = "3px";
        }
        this._gageGradientPoint.style.transformOrigin = (svgCoord / 2 - (0.5 + arrowSpace)) + 'px 0 0';
        this._gageGradientPoint.setAttribute('y1', '0');
        this._gageGradientPoint.setAttribute('x1', Math.round(svgCoord * (0.5 + arrowSpace)));

        this._gageGradientPoint.setAttribute('y2', 0);
        this._gageGradientPoint.setAttribute('x2', Math.round(svgCoord * (0.5 + arrowSpace / 2) + parseInt(radius)));
    },
    _animate: function(value) {
        var webixGageValue = this.$view.querySelector('.webix_gage-value');
        var currentChartValue = this._safeValue(value) - this.config.minRange;
        var degrees = Math.round(currentChartValue * 180 / (this.config.maxRange - this.config.minRange));
        var viewSize = this.$width;
        
        viewSize = Math.floor(viewSize/10);
        this.$view.style.fontSize = viewSize+'px';
        webixGageValue.innerHTML = value;
        
        this._circleGradient.style.stroke = this.color;
        this._circleGradient.setAttribute("stroke", this.color);
        this._gageGradientPoint.setAttribute("transform", "rotate(" + degrees + " "+ this.$width/2 +" 0)");
        this._gageGradientPoint.style.transform = "rotate(" + degrees + "deg)";
    },
    _setDash: function() {
        webix.assert(this.config.minRange < this.config.maxRange, "Invalid Range Values");
        this.gradientLength = (this._safeValue(this.config.value) - this.config.minRange) / (this.config.maxRange - this.config.minRange);
        
        var template = this.config.color;
        if (template){
            if (typeof template === "function")
                this.color = template.call(this, this.config.value);
            else
                this.color = template;
        } else
            this.color = "hsl(" + (120 - Math.round(this.gradientLength * 120)) + ", 100%, 50%)";

        if (this.config.animation === true) {
            this.defaultColor = "hsl(125, 100%, 50%)";
        } else {
            this.defaultColor = "hsl(" + (120 - Math.round(this.gradientLength * 120)) + ", 100%, 50%)";
        }
    },
    _setDefaultView: function() {
        this.gradientLength = 0;
        this._setDash();
        this.$view.innerHTML = '<div class="webix_gage_label"><span>'+(this.config.label||"")+'</span></div><svg class="webix_gage" style="height:300px; position: relative;"><circle class="webix_gage_curves" r="0" cx="50%" cy="0" stroke="#EEEEEE" stroke-width="'+this.config.stroke+'%" fill="none"></circle><circle class="webix_gage_gradient" r="0" stroke="'+this.defaultColor+'" cx="50%" cy="0" stroke-width="'+this.config.stroke+'%" fill="none" style="stroke-dasharray: 0, 1900;"></circle><line class="webix_gage_gradient_point" x1="0" x2="0" y1="0" y2="0" style="stroke:#B0B0B0; stroke-width:4;"></line></svg><div class="webix_gage_info"><div class="webix_gage_min_range">'+this.config.minRange+'</div><div class="webix_gage_max_range">'+this.config.maxRange+'</div><div class="webix_gage_placeholder"><div class="webix_gage-value">'+this.config.value+'</div><div class="webix_gage_range_info">'+(this.config.placeholder||"")+'</div></div></div>';
        this._circleGradient = this.$view.querySelector('.webix_gage_gradient');
        this._gageGradientPoint = this.$view.querySelector('.webix_gage_gradient_point');
        this._gage = this.$view.querySelector('.webix_gage');
        if (this.isVisible() === true && this.config.smoothFlow === true && (webix.env.svganimation && !webix.env.isEdge)) {
            this._circleGradient.setAttribute('class', 'webix_gage_gradient webix_gage_animated');
            this._gageGradientPoint.setAttribute('class', 'webix_gage_gradient_point webix_gage_gradient_point_animated');
        }
    },
    setValue: function(value) {
        this.config.value = value;
        this._setDash();
        this._refresh();
        this._animate(value);
    },
    getValue: function() {
        return this.config.value;
    }
}, webix.EventSystem, webix.ui.view);
