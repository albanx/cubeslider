/**
 * jQuery Plugin CubeSlider 2.1
 * http://www.albanx.com/cubeslider
 *
 * Copyright 2013, www.albanx.com/cubeslider
 *
 * Date: 14-10-2013
 */

(function($, undefined ){

	'use strict';

	/****************
	 * From jquery site, test css3 proprety support
	 */
	function styleSupport( prop )
	{
	    var vendorProp, supportedProp,
	        // capitalize first character of the prop to test vendor prefix
	        capProp = prop.charAt(0).toUpperCase() + prop.slice(1),
	        prefixes = [ "Moz", "Webkit", "O", "ms" ],
	        div = document.createElement( "div" );

	    if ( prop in div.style ) {
	      // browser supports standard CSS property name
	      supportedProp = prop;
	    } else {
	      // otherwise test support for vendor-prefixed property names
	      for ( var i = 0; i < prefixes.length; i++ ) {
	        vendorProp = prefixes[i] + capProp;
	        if ( vendorProp in div.style ) {
	          supportedProp = vendorProp;
	          break;
	        }
	      }
	    }

	    // avoid memory leak in IE
	    div = null;

	    // add property to $.support so it can be accessed elsewhere
	    $.support[ prop ] = supportedProp;

	    return supportedProp;
	}

	function detectIE() {
	    var ua = window.navigator.userAgent;
	    var msie = ua.indexOf('MSIE ');
	    var trident = ua.indexOf('Trident/');

	    if (msie > 0) {
	        // IE 10 or older => return version number
	        return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
	    }

	    if (trident > 0) {
	        // IE 11 (or newer) => return version number
	        var rv = ua.indexOf('rv:');
	        return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
	    }

	    // other browser
	    return false;
	}

	/**
	 * Cube Slider class
	 */
	var CubeSlider = function($this, settings)
	{
		this.width 		= 0;
		this.height 	= 0;
		this.slider 	= $this;
		this.items		= $this.children();//mix maybe <a>
		this.images		= $this.find('img');//images to load
		this.wrapper 	= this.slider.wrap('<div class="cs-container"></div>').parent();
		this.settings 	= settings;
		this.currItem 	= 0; //current display image
		this.cubes 		= [];
		this.animBox 	= null;
		this.cssProps 	= null;
		this.mode3d		= (styleSupport('Perspective')!==undefined &&  (settings.mode3d==='auto' || settings.mode3d) );

		//runtime vars
		this.animating 	= false;
		this.currItem 	= 0;
		this.prevItem 	= 0;
		this.numItems 	= this.items.length;
		this.numCubes 	= 0;

		//IE10 3d is bugged
		if(this.mode3d){
//			this.mode3d	= !detectIE();
		}
		//this.mode3d	= false;
		this.items.hide().eq(this.currItem).show();

		//display a loader div during image load
		$this.append('<div class="cs-loader" />').addClass('cs-slider').css({overflow:'hidden', width:'100%'});

		//wait image loads then exec create
		this.imageLoad();
	};

	CubeSlider.prototype =
	{
		imageLoad: function()
		{
			var CS 			= this;
			var imgs 		= CS.images;
			for(var i=0; i<imgs.length; i++)
			{
				var img = imgs[i];
				if(img.width === undefined || ( img.complete !== undefined && !img.complete ) )
				{
					setTimeout(function(){ CS.imageLoad(); }, 50);
					return false;
				}
			}
			CS.init();
		},
		init:function()
		{
			//remove loader div
			this.slider.css({'overflow':'visible'}).children('.cs-loader').remove();
			this.wrapper.css({'overflow':'visible', position:'relative'});
			//get browser css prop
			this.cssDetect();

			//set the size vars
			this.setSize();

			//add shadow
			if(this.settings.addShadow) $('<div class="cs-shadow"/>').appendTo(this.wrapper);

			//add navigation
			this.addNagivation();

			//add nav arrows
			this.addArrows();

			//add the play button
			this.addPlayButton();

			//se events
			this.addEvents();

			//creates titles
			this.createTitles();

			//responsive actions
			this.images.css({ 'max-width':'100%' });
			this.slider.css({ 'max-width':this.width });//adapt stage to image size
			this.wrapper.css({'max-width':this.width+this.prevNav.width()*2  });

			if(!this.mode3d){
				this.items.hide();
				this.items.eq(this.currItem).show();
				this.slider.css({overflow:'hidden'});
			}
			//start slide
			this.startSlide(true);

		},
		cssDetect: function(){
			var css = {};
			css.BF	= styleSupport('backfaceVisibility');
			css.TS	= styleSupport('transformStyle');
			css.PE	= styleSupport('perspective');
			css.TR	= styleSupport('transform');

			this.cssProps = css;
		},
		filter: function(){//filter settings and set the correct values
			this.rows = this.rows % 2 === 0?this.rows++:this.rows;
			this.cols = this.cols % 2 === 0?this.cols++:this.cols;
		},
		setSize: function()
		{
			this.width 	= this.images.eq(this.currItem).width();//get the size of one of images for the size of the stage
			this.height = this.images.eq(this.currItem).height();
		},
		addEvents: function()
		{
			var CS = this;
			//for responsive
			$(window).on( 'resize', function( event ) {
				CS.setSize();
				CS.setArrowPos();
			});

			//nagivation click
			this.navContainer.on('click', 'span', this, function(e){
				var cb = e.data;
				if (cb.animating && !cb.mode3d)	return false;
				var nextItem 	= cb.navContainer.children('span').index(this);
				var navdir 		= (nextItem-cb.currItem)>0?1:-1;
				cb.slideTo(navdir, nextItem);
			});

			this.prevNav.on('click', this, function(e){
				clearTimeout( e.data.slideTimer );
				e.data.slideTo(-1);
			});
			this.nextNav.on('click', this, function(e){
				clearTimeout( e.data.slideTimer );
				e.data.slideTo(1);
			});
			this.playButton.on('click', this, function(e){
				var cs = e.data;
				if ( cs.settings.autoplay )
				{
					cs.stopPlay();
				}
				else
				{
					cs.startPlay();
				}
			});
		},
		startPlay: function(){
			this.settings.autoplay = true;
			this.startSlide();
			this.playButton.addClass('cs-nav-stop');
		},
		stopPlay: function(){
			clearTimeout( this.slideTimer );
			this.settings.autoplay = false;
			this.playButton.removeClass('cs-nav-stop');
		},
		addNagivation: function()
		{
			var navs = '';
			this.navContainer = $('<div class="cs-nav-cont" />').appendTo(this.wrapper).css({position:'absolute'});
			for(var i=0; i<this.numItems; i++){
				navs+='<span></span>';
			}
			this.navContainer.append(navs).children(':first').addClass('cs-current');
			if(this.settings.navigation!==true) this.navContainer.hide();
		},
		addArrows: function()
		{
			this.prevNav = $('<span class="cs-nav-prev"></span>').appendTo(this.wrapper);
			this.nextNav = $('<span class="cs-nav-next"></span>').appendTo(this.wrapper);
			this.setArrowPos();

			if(!this.settings.arrows){
				this.prevNav.hide();
				this.nextNav.hide();
			}
		},
		setArrowPos: function(){
			var top = (-this.prevNav.height()+this.slider.height())/2;
			this.prevNav.css('top', top);
			this.nextNav.css('top', top);
		},
		addPlayButton: function(){
			//play button
			this.playButton = $('<span class="cs-nav-play"></span>').appendTo(this.wrapper);
			if(!this.settings.play) this.playButton.hide();
			if ( this.settings.autoplay ) this.playButton.addClass('cs-nav-stop');
		},
		createTitles: function()
		{
			this.items.each(function(){
				var el = $(this);
				if( el.find('.cs-title').length==0 )
				{

					if( el.attr('title') !==undefined && el.attr('title')!='' )
					{
						var title = $('<span />').addClass('cs-title').html(el.attr('title'));
						title.insertAfter( el );
						el.data('title', title);
					}
					else
					{
						el.data('title', false);
					}
				}
				else
				{
					el.data('title', el.find('.cs-title') );
				}
			})
		},
		startSlide: function(first)
		{
			var cs = this;

			if(first)
			{
				this.showTitle(this.items.eq(this.currItem));
			}
			if ( this.settings.autoplay )
			{
				this.slideTimer = setTimeout( function() {
					cs.slideTo(1);
				}, this.settings.autoplayInterval);
			}

		},
		slideTo: function(dir, itemIndex)
		{
			if(this.animating && this.mode3d) return;
			this.animating = true;
			// current item's index
			this.prevItem = this.currItem;
			// if position is passed
			this.currItem = this.currItem + dir;
			if(this.currItem>this.numItems-1) 	this.currItem = 0;//limits ovios
			if(this.currItem<0) 				this.currItem = this.numItems-1;

			if( itemIndex !== undefined )
				this.currItem = itemIndex;

			this.slider.find('.cs-title').hide();

			if( !this.mode3d)
			{
				this.slideNormal( dir );
			}
			else
			{
				this.createCubes( dir);
				this.rotateCubes();
			}

			this.navContainer.children('span').removeClass('cs-current').eq(this.currItem).addClass('cs-current');
		},
		slideNormal: function(dir)
		{
			this.slider.css({height:this.height});
			var cs = this;
			var current = this.items.eq(this.prevItem).show();
			var next 	= this.items.eq(this.currItem).hide();
			current.css( {'position':'absolute', top:0, left:0});
			next.css({'position':'absolute', top:0, left:0});
			var animParamOut = {};

			if (this.settings.orientation === 'v')
			{
				animParamOut.top = dir*this.height+ 'px';
				next.css('top', -dir*this.height + 'px');
			}
			else if (this.settings.orientation === 'h')
			{
				animParamOut.left = -dir*this.width	+ 'px';
				next.css('left', dir*this.width + 'px');
			}

			current.stop().animate(animParamOut, this.settings.animationSpeed, this.settings.fallbackEasing);
			next.show().stop().animate({top:0, left:0}, this.settings.animationSpeed, this.settings.fallbackEasing, function() {
				$(this).css( {'position':'relative', display:'block'});
				cs.slider.css({height:'auto'});
				current.hide();
				cs.showTitle(next);
				cs.onFinish();
			});
		},
		showTitle: function(el)
		{
			if(el.data('title'))
				el.data('title').slideDown(this.settings.titleSpeed, this.settings.titleEasing);
		},
		rotateCubes: function()
		{
			// hide current item
			this.items.eq( this.prevItem ).hide();
			this.items.find('.cs-title').hide();
			var me = this;
			for( var i = 0; i < this.numCubes; ++i )
			{
				var cube = this.cubes[ i ];
				cube.rotate(i, me.currItem, function( pos ) {
					if( pos === me.numCubes - 1 )
					{
						me.slider.css( 'overflow', 'hidden' );
						me.animBox.remove();
						me.showTitle( me.items.eq(me.currItem).css( 'display', 'block' ) );
						me.onFinish();
					}
				});
			}
		},
		createCubes: function(dir)
		{
			this.numCubes = 0;
			this.cubes = [];
			//set orientation, if not set the is random
			var orientation = this.settings.orientation;
			if( !orientation )	orientation = Math.floor( Math.random() * 2 ) === 0 ? 'v' : 'h';

			//set the number of cubes
			if( typeof(this.settings.cubesNum)=='object' )
			{
				this.rows = this.settings.cubesNum['rows'];
				this.cols = this.settings.cubesNum['cols'];
			}
			else
			{
				if(this.orientation=='h')
				{
					this.rows = this.settings.cubesNum;
					this.cols = 1;
				}
				else
				{
					this.rows = 1;
					this.cols = this.settings.cubesNum;
				}
			}

			//if random change values
			if( this.settings.random )
			{
				this.rows = Math.floor( Math.random() * this.rows + 1 );
				this.cols = Math.floor( Math.random() * this.cols + 1 );
				orientation = Math.random() < 0.5 ? 'v' : 'h';
			}

			this.filter();

			var style = {};
			style['width'] 		= this.width;
			style['height'] 	= this.height;
			style['position'] 	= 'relative';
			style[this.cssProps.PE] 	= this.settings.perspective + 'px';
			this.animBox 		= $('<div />').css(style).appendTo(this.slider);

			this.slider.css( 'overflow', 'visible' );

			var options = {
				width: 		this.width,
				height: 	this.height,
				orientation: orientation,
				css: 		this.cssProps,
				images: 	this.images,
				rows: 		this.rows,
				cols: 		this.cols,
				dir: 		dir,
				settings: 	this.settings
			}

			for(var i=0; i<this.rows;i++)
			{
				for(var j=0;j<this.cols;j++)
				{
					var cube 	= new Cube( options, i, j);
					var faces 	= cube.createCube( this.prevItem );
					this.cubes.push(cube);
					this.animBox.append(faces);
					this.numCubes++;
				}
			}
		},
		onFinish: function(){
			this.animating = false;
			if ( this.settings.autoplay ) this.startSlide(false);
			if(typeof(this.settings.onFinish)=='function') this.settings.onFinish.call(this);
		}
	};


	//single Cube and his faces
	var Cube = function(options, r, c)
	{
		this.settings 		= options.settings;
		this.css3Props 		= options.css;
		this.orientation 	= options.orientation;
		this.rows 			= options.rows;
		this.cols 			= options.cols;
		this.stageWidth 	= options.width;
		this.stageHeight 	= options.height;
		this.dir 			= options.dir;
		this.images 		= options.images;
		this.face 			= 1;
		this.row = r;
		this.col = c;
		this.setSize(r, c);
		this.setCubeStyle();
	};

	Cube.prototype = {
		setSize: function(r, c)
		{
			this.width 	= Math.floor( this.stageWidth / this.cols );
			this.height = Math.floor( this.stageHeight / this.rows );
			this.gapw 	= this.stageWidth - ( this.width * this.cols );
			this.gaph 	= this.stageHeight - ( this.height * this.rows );

			this.y = this.height * r;
			this.x = this.width * c;
		},
		setCubeStyle: function()
		{
			// style for the slice
			var settings 	= this.settings;
			var halfw 		= this.width/2;
			var halfh 		= this.height/2;
			var rotate_axis = 'X';
			var hw 			= halfh;
			var rotZ 		= 'rotateZ( 180deg )', topx=0, leftx=0, facedim=this.width;
			if (this.orientation === 'v')
			{
				hw 			= halfh;
				leftx 		= (halfw-halfh);
				rotate_axis = 'X';
				facedim 	= this.height;
			}
			else
			{
				hw 			= halfw;
				rotZ 		= '';
				topx 		= (halfh - halfw);
				rotate_axis = 'Y';
				facedim 	= this.width;
			}

			var front 	= {};
			var back 	= {};
			var right 	= {};
			var left 	= {};
			var top 	= {};
			var bottom 	= {};

			front['width'] 				= this.width+this.gapw;
			front['height'] 			= this.height+this.gaph;
			front['background-color'] 	= settings.backfacesColor;
			front[this.css3Props.TR] 	= 'rotate3d( 0, 1, 0, 0deg ) translate3d( 0, 0, '+hw+'px )';

			back['width'] 				= this.width;
			back['height'] 				= this.height;
			back['background-color'] 	= settings.backfacesColor;
			back[this.css3Props.TR] 	= 'rotate3d( 0, 1, 0, 180deg ) translate3d( 0, 0, '+hw+'px ) '+rotZ;

			right['width'] 				= facedim;
			right['height'] 			= this.height+this.gaph;
			right['background-color'] 	= settings.backfacesColor;
			right[this.css3Props.TR] 	= 'rotate3d( 0, 1, 0, 90deg ) translate3d( 0, 0, '+halfw+ 'px )'
			right['left'] 				= leftx;

			left['width'] 				= facedim;
			left['height'] 				= this.height+this.gaph;
			left['background-color'] 	= settings.backfacesColor;
			left[this.css3Props.TR] 	= 'rotate3d( 0, 1, 0, -90deg ) translate3d( 0, 0, '+halfw+ 'px )'
			left['left'] 				= leftx;

			top['width'] 				= this.width+this.gapw;
			top['height'] 				= facedim;
			top['background-color'] 	= settings.backfacesColor;
			top[this.css3Props.TR] 		= 'rotate3d( 1, 0, 0, 90deg ) translate3d( 0, 0, '+halfh+ 'px )';
			top['top']					= topx;

			bottom['width'] 			= this.width+this.gapw;
			bottom['height'] 			= facedim;
			bottom['background-color'] 	= settings.backfacesColor;
			bottom[this.css3Props.TR] 	= 'rotate3d( 1, 0, 0, -90deg ) translate3d( 0, 0, '+halfh+'px )';
			bottom['top']				= topx;

			this.faceStyles = {front:front, back:back, left:left, right:right, top:top, bottom:bottom};

			//face of cube to show, we show always 4 of 6 faces of the cube
			this.showFace = [
				'translateZ(-'+hw+'px )',
				'translateZ(-'+hw+'px ) rotate'+rotate_axis+'(-90deg )',
				'translateZ(-'+hw+'px ) rotate'+rotate_axis+'(-180deg )',
				'translateZ(-'+hw+'px ) rotate'+rotate_axis+'(-270deg )'
			];
		},
		createCube: function(item_index)
		{
			var half_r = Math.ceil(this.rows / 2);
			var half_c = Math.ceil(this.cols / 2);

			//animation
			var animSpeed 	= this.settings.animationSpeed;
			var easing 		= this.settings.easing;

			//cube position
			var r_z = (this.row < half_r)? (this.row + 1) : (this.rows - this.row);
			var c_z = (this.col < half_c)? (this.col + 1) : (this.cols - this.col);

			//create cube faces
			var faceStyles 	= this.faceStyles;
			var cubeStyle = {
				'-webkit-transition' : 	'-webkit-transform ' + animSpeed + 'ms ' + easing,
				'-moz-transition' : 	'-moz-transform ' + animSpeed + 'ms ' + easing,
				'-o-transition' : 		'-o-transform ' + animSpeed + 'ms ' + easing,
				'-ms-transition' : 		'-ms-transform ' + animSpeed + 'ms ' + easing,
				'transition' : 			'transform ' + animSpeed + 'ms ' + easing,
				'width': 		this.width,
				'height':	 	this.height,
				'position':		'absolute',
				'z-index': 		(r_z+c_z)*100,
				'left': 		this.x,
				'top': 			this.y
			};
			cubeStyle[this.css3Props.TS] = 'preserve-3d';
			cubeStyle[this.css3Props.BF] = 'hidden';
			cubeStyle[this.css3Props.TR] = this.showFace[0];

			var cube = $('<div />').css(cubeStyle)
									.append( $('<div/>').addClass('cube-face').css(faceStyles.front) )
									.append( $('<div/>').addClass('cube-face').css(faceStyles.back) )
									.append( $('<div/>').addClass('cube-face').css(faceStyles.right) )
									.append( $('<div/>').addClass('cube-face').css(faceStyles.left) )
									.append( $('<div/>').addClass('cube-face').css(faceStyles.top) )
									.append( $('<div/>').addClass('cube-face').css(faceStyles.bottom) );

			cube.children('div').css('background-size', this.stageWidth+'px, '+this.stageHeight+'px');
			this.cube = cube;

			this.changeImage(item_index);

			this.spreadPixel = this.settings.spreadPixel*((this.col+this.row + 2) - half_c-half_r);

			return cube;
		},
		changeImage: function(imgPos)
		{
			var face;
			switch (this.face)
			{
				case 1: face = 0; break;//never goes
				case 2:	face = (this.orientation === 'v')? 4 : 2; break;
				case 3:	face = 1; break;//never goes
				case 4:	face = (this.orientation === 'v')? 5 : 3; break;
			}

			//set the image to the face to show
			this.cube.children().eq(face).css({'background-image': 'url('+ this.images.eq(imgPos).attr('src') + ')', 'background-position':'-'+this.x + 'px -' + this.y + 'px'});
		},
		rotate : function(i, imgCurrent, callback )
		{
			var settings 	= this.settings;
			var currCube 	= this;
			var seq 		= settings.cubeSync*i;
			var css3Props 	= this.css3Props;

			setTimeout(function(){
				//calculate the face to show on rotate
				//var face2show =  Math.max(Math.min(4, currCube.face + currCube.dir), 2);
				var face2show =  currCube.dir > 0 ? 2:4;
				currCube.face 	= face2show;//store current face shown
				//get the css style animation of the face
				var transformCss 	= currCube.showFace[face2show-1];

				//switch the image
				currCube.changeImage(imgCurrent);

				var startMove = {}, endMove = {};

				if (currCube.orientation === 'v')
				{
					startMove.left 	= '+=' + currCube.spreadPixel + 'px';
					endMove.left 	= '-=' + currCube.spreadPixel + 'px';
				}
				else if (currCube.orientation === 'h')
				{
					startMove.top 	= '+=' + currCube.spreadPixel + 'px';
					endMove.top 	= '-=' + currCube.spreadPixel + 'px';
				}

				//run animation
				currCube.cube.css(css3Props.TR, transformCss).animate(startMove, settings.animationSpeed / 2 ).animate(endMove, settings.animationSpeed / 2 , function() {
					if (callback)
						callback.call(this, i);
				});

			}, seq);
		}
	};




	/**
	 * Method to set/get options live
	 * @param opt the option to change or get
	 * @param val if is setted then change option to this val, if it is not given than get option value
	 * @returns option value or null
	 */
//	CubeSlider.prototype.options = function(opt, val){
//		if(val!==undefined && val!==null)
//		{
//			this.settings[opt] = val;
//			if(opt == 'enable')
//			{
//				this.enable(val);
//			}
//		}
//		else
//		{
//			return this.settings[opt];
//		}
//	};
//
//	CubeSlider.prototype.enable = function(bool){
//		this.settings.enable= bool;
//		if(bool)
//		{
//		}
//		else
//		{
//		}
//	};
//
    var globalSettings =
    {
		orientation: 		'v', 				// set cubes animation orentation v vertical, h horizontal
		perspective: 		1200, 				// 3d perspective value for supported browsers.
		cubesNum: 			{rows:1, cols:1}, 	// set the number of cubes to divide the image
		random:				false,				// if true then the cubes number is going to be random at any slide, and max random values will be the cubesNum settings
		spreadPixel: 		0, 					// each cube will move x pixels left and top when rotating
		backfacesColor: 	'#222', 			// set the color of backfaces of the cube
		cubeSync: 			100,				// set the cube syncronization in animation, if 0 all will move at same time
		animationSpeed: 	800,	 			// set the animation speed of the single cubes
		easing: 			'ease', 			// easing for  css3 browsers
		fallbackEasing: 	'easeOutExpo', 		// fallback easing for non css3 browsers
		autoplay : 			false, 				// if true the box will be rotating automatically.
		autoplayInterval : 	2000,				// switch image interval in autoplay
		mode3d:				'auto',				// if auto then 3d mode will be used if supported, if false then fallback will be used
		arrows:				true,				// if true shows the left, right arrows
		navigation:			true,				// if true show the navigation bullets
		addShadow:			true,
		play:				true,				// if true show the play/pause button
		titleSpeed:			300,				// the animate show speed of the title in ms
		titleEasing:		'easeOutExpo'		// the title easing animation
    };

	var methods =
	{
		init : function(options)
		{
    	    return this.each(function()
    	    {
				var settings = $.extend({}, globalSettings, options);
				//for avoiding two times call errors
				var $this = $(this);
				if( $this.data('CS')!==undefined )
				{
					return;
				}

				$this.data('author','http://www.albanx.com/');

				//create the plugin object ad keep reference to it in the data CS variable
				$this.data('CS', new CubeSlider($this, settings));
    	    });
		},
		enable:function()
		{
			return this.each(function()
			{
				var $this = $(this);
				var CS = $this.data('CS');
				CS.enable(true);
			});
		},
		disable:function()
		{
			return this.each(function()
			{
				var $this = $(this);
				var CS = $this.data('CS');
				CS.enable(false);
			});
		},
		destroy : function()
		{
			return this.each(function()
			{
				var $this = $(this);
				var CS = $this.data('CS');//get ajax uploader object
				$this.removeData('CS');//remove object and empty element
			});
		},
		option : function(option, value)
		{
			return this.each(function(){
				var $this=$(this);
				var CS = $this.data('CS');
				return CS.options(option, value);
			});
		}
	};

	$.fn.cubeslider = function(method, options)
	{
		if(methods[method])
		{
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		}
		else if(typeof method === 'object' || !method)
		{
			return methods.init.apply(this, arguments);
		}
		else
		{
			$.error('Method ' + method + ' does not exist on jQuery.CubeSlider');
		}
	};


	/*
	 * jQuery Easing v1.3 - http://gsgd.co.uk/sandbox/jquery/easing/
	 *
	 * Uses the built in easing capabilities added In jQuery 1.1
	 * to offer multiple easing options
	 *
	 * TERMS OF USE - jQuery Easing
	 *
	 * Open source under the BSD License.
	 *
	 * Copyright © 2008 George McGinley Smith
	 * All rights reserved.
	 *
	 * Redistribution and use in source and binary forms, with or without modification,
	 * are permitted provided that the following conditions are met:
	 *
	 * Redistributions of source code must retain the above copyright notice, this list of
	 * conditions and the following disclaimer.
	 * Redistributions in binary form must reproduce the above copyright notice, this list
	 * of conditions and the following disclaimer in the documentation and/or other materials
	 * provided with the distribution.
	 *
	 * Neither the name of the author nor the names of contributors may be used to endorse
	 * or promote products derived from this software without specific prior written permission.
	 *
	 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
	 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
	 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
	 *  COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
	 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
	 *  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
	 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
	 * OF THE POSSIBILITY OF SUCH DAMAGE.
	 *
	*/

	// t: current time, b: begInnIng value, c: change In value, d: duration
	$.easing['jswing'] = $.easing['swing'];

	$.extend( $.easing,
	{
		def: 'easeOutQuad',
		swing: function (x, t, b, c, d) {
			//alert($.easing.default);
			return $.easing[$.easing.def](x, t, b, c, d);
		},
		easeInQuad: function (x, t, b, c, d) {
			return c*(t/=d)*t + b;
		},
		easeOutQuad: function (x, t, b, c, d) {
			return -c *(t/=d)*(t-2) + b;
		},
		easeInOutQuad: function (x, t, b, c, d) {
			if ((t/=d/2) < 1) return c/2*t*t + b;
			return -c/2 * ((--t)*(t-2) - 1) + b;
		},
		easeInCubic: function (x, t, b, c, d) {
			return c*(t/=d)*t*t + b;
		},
		easeOutCubic: function (x, t, b, c, d) {
			return c*((t=t/d-1)*t*t + 1) + b;
		},
		easeInOutCubic: function (x, t, b, c, d) {
			if ((t/=d/2) < 1) return c/2*t*t*t + b;
			return c/2*((t-=2)*t*t + 2) + b;
		},
		easeInQuart: function (x, t, b, c, d) {
			return c*(t/=d)*t*t*t + b;
		},
		easeOutQuart: function (x, t, b, c, d) {
			return -c * ((t=t/d-1)*t*t*t - 1) + b;
		},
		easeInOutQuart: function (x, t, b, c, d) {
			if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
			return -c/2 * ((t-=2)*t*t*t - 2) + b;
		},
		easeInQuint: function (x, t, b, c, d) {
			return c*(t/=d)*t*t*t*t + b;
		},
		easeOutQuint: function (x, t, b, c, d) {
			return c*((t=t/d-1)*t*t*t*t + 1) + b;
		},
		easeInOutQuint: function (x, t, b, c, d) {
			if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
			return c/2*((t-=2)*t*t*t*t + 2) + b;
		},
		easeInSine: function (x, t, b, c, d) {
			return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
		},
		easeOutSine: function (x, t, b, c, d) {
			return c * Math.sin(t/d * (Math.PI/2)) + b;
		},
		easeInOutSine: function (x, t, b, c, d) {
			return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
		},
		easeInExpo: function (x, t, b, c, d) {
			return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
		},
		easeOutExpo: function (x, t, b, c, d) {
			return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
		},
		easeInOutExpo: function (x, t, b, c, d) {
			if (t==0) return b;
			if (t==d) return b+c;
			if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
			return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
		},
		easeInCirc: function (x, t, b, c, d) {
			return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
		},
		easeOutCirc: function (x, t, b, c, d) {
			return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
		},
		easeInOutCirc: function (x, t, b, c, d) {
			if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
			return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
		},
		easeInElastic: function (x, t, b, c, d) {
			var s=1.70158;var p=0;var a=c;
			if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
			if (a < Math.abs(c)) { a=c; var s=p/4; }
			else var s = p/(2*Math.PI) * Math.asin (c/a);
			return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
		},
		easeOutElastic: function (x, t, b, c, d) {
			var s=1.70158;var p=0;var a=c;
			if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
			if (a < Math.abs(c)) { a=c; var s=p/4; }
			else var s = p/(2*Math.PI) * Math.asin (c/a);
			return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
		},
		easeInOutElastic: function (x, t, b, c, d) {
			var s=1.70158;var p=0;var a=c;
			if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
			if (a < Math.abs(c)) { a=c; var s=p/4; }
			else var s = p/(2*Math.PI) * Math.asin (c/a);
			if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
			return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
		},
		easeInBack: function (x, t, b, c, d, s) {
			if (s == undefined) s = 1.70158;
			return c*(t/=d)*t*((s+1)*t - s) + b;
		},
		easeOutBack: function (x, t, b, c, d, s) {
			if (s == undefined) s = 1.70158;
			return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
		},
		easeInOutBack: function (x, t, b, c, d, s) {
			if (s == undefined) s = 1.70158;
			if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
			return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
		},
		easeInBounce: function (x, t, b, c, d) {
			return c - $.easing.easeOutBounce (x, d-t, 0, c, d) + b;
		},
		easeOutBounce: function (x, t, b, c, d) {
			if ((t/=d) < (1/2.75)) {
				return c*(7.5625*t*t) + b;
			} else if (t < (2/2.75)) {
				return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
			} else if (t < (2.5/2.75)) {
				return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
			} else {
				return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
			}
		},
		easeInOutBounce: function (x, t, b, c, d) {
			if (t < d/2) return $.easing.easeInBounce (x, t*2, 0, c, d) * .5 + b;
			return $.easing.easeOutBounce (x, t*2-d, 0, c, d) * .5 + c*.5 + b;
		}
	});

})(jQuery);




