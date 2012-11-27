
define(function(require) {

	require('css!../../css/expose.less');

	var Window = require('wm/window');
	var dom = require('dom');

	var WindowManager = function () {
		this.el = dom("<div class='wm-space'/>")();
		this.el.css({
			position: 'absolute',
			width: '100%',
			height: '100%',
			overflow: 'hidden'
		});

		this.el.listen(this.events, this);
		$(document.body).append(this.el);

		this._windows = [];
		this._moving = null;
		this._active = null;
		this._resizing = null;
	};

	WindowManager.behavior = {
	};

	WindowManager.prototype = {
		_baseZ: 10000,

		events: {
			'mousemove': function(e) {
				var local, 
					move = this._moving, 
					resize = this._resizing;

				if(move && move.window) {
					move.window.move(
						e.clientX - move.offset.x,
						e.clientY - move.offset.y
					);
				}

				if (resize && resize.window) {
					resize.window.resize(
						resize.current.width + e.clientX - resize.origin.x,
						resize.current.height + e.clientY - resize.origin.y
					);
				}
			},

			'mouseup': function(e) {
				if (this._moving) {
					this._moving.window.el.removeClass('move'); // Change this, no direct access to the view, STATE wrapper to css add,remove,has class
					this._moving = null;
				}

				if (this._resizing) {
					this._resizing = null;
				}
			}
		},

		slots: {
			maximize: function(win) {
				win.move(0,0);
				win.resize(this.el.width(), this.el.height());
			},

			minimize: function(win) {
				win.resize(0,0);
			},

			move: function(e, win) {
				this._moving = {
					window: win,
					offset: win.toLocal({
						x: e.clientX,
						y: e.clientY
					})
				};
			},

			resize: function(e, win) {
				this._resizing = {
					window: win,
					origin: {
						x: e.clientX,
						y: e.clientY
					},
					current: {
						width: win.width,
						height: win.height
					}
				};
			},

			focus: function(win) {
				var currentZ, maxZ = this._baseZ + 1000;

				if (this._active && this._active === win)
					return;

				if(this._active) {
					currentZ = this._active.z;
					this._active.blur();
				}
				else {
					currentZ = this._baseZ;
				}

				// Reorder windows stack (@todo optimize this)
				this._windows = _.without(this._windows, win);
				this._windows.push(win);
				
				win.z = currentZ + 1;

				// Refresh z-indexes just every 'maxZ' activations
				if (currentZ > maxZ + this._windows.length) {
					for(var z, i=this._windows.length; i--;) {
						z = this._windows[i].z;
						this._windows[i].z = this._baseZ + (z - maxZ);
					}
				}

				this._active = win;
			},

			blur: function(win) {
				if(this._active === win)
					this.active = null;
			},

			close: function(win) {
				// Remove window from manager
				var id = _.indexOf(this._windows, win), len;
				if(id === -1) { 
					console.log('Trying to close a window that doesn\'t exist in this window manager');
					return;
				}

				this._windows = _.without(this._windows, win);	
				len = this._windows.length;
				if(this._active && this._active === win) {
					this._active = (len !== 0) ? this._windows[len-1] : null;
					if (this._active)
						this._active.focus();
				}		
			}
		},

		createWindow: function(options) {
			var win = new Window(options||{});

			// Listen to window signals
			win.signals.on('move', this.slots.move, this);
			win.signals.on('resize', this.slots.resize, this);
			win.signals.on('focus', this.slots.focus, this);
			win.signals.on('blur', this.slots.focus, this);
			win.signals.on('close', this.slots.close, this);
			win.signals.on('maximize', this.slots.maximize, this);
			win.signals.on('minimize', this.slots.minimize, this);

			this._windows.push(win);

			this.el.append(win.el);

			win.focus();
			return win;
		},

		expose: function() {
			var grid = Math.ceil(this._windows.length / 2);
			var maxWidth = Math.floor(this.el.width() / grid);
			var maxHeight = Math.floor(this.el.height() / 2);

			var scale;

			for(var z, win, i=0, len=this._windows.length; i<len; i++) {
				win = this._windows[i];

				if(win.view.height > win.view.width) {
					scale = (win.view.height > maxHeight) ? maxHeight / win.view.height : 1;
				} 
				else {
					scale = (win.view.width > maxWidth) ? maxWidth / win.view.width : 1;
				}

				win.view.el.addClass('expose');
				
				win.view.el.css('-webkit-transition', 'all .5s linear');
				win.view.el.css('-webkit-transform', 'scale('+(scale)+')');

				var left = Math.floor((maxWidth - scale*win.view.width) / 2) + (i%grid)*maxWidth;
				var top = Math.floor((maxHeight - scale*win.view.height) / 2) + ((i<grid-1)? maxHeight : 0);

				win.view.el.css('top', top);
				win.view.el.css('left', left);
			}
		},

		reset: function() {
			for(var z, win, i=this._windows.length; i--;) {
				win = this._windows[i];

				win.view.el.removeClass('expose');
				
			}
		}
	};

	return WindowManager;
});
