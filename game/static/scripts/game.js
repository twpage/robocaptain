var robocaptain_game = function ($, tilecodes, level_gen) {
	var my_version = 'version 0.2 (7DRL+)';
	var my_play_sounds = true;
	
	var that = {};
	
	// canvas + contexts
	var cnv_copy;
	var ctx_game, ctx_copy, ctx_inventory, ctx_playerinfo, ctx_hoverinfo, ctx_container, ctx_messages, ctx_text_message;
	
	// dijkstra maps for pathfinding
	var dijkstra_maps = {};
	var dijkstra_map_list = ['to_player', 'from_player', 'to_mech'];
	var my_debug_map = 0;
		
	// gridmanglers
	var my_grid, my_inv_grid, my_container_grid;

	// tiles
	var my_tiles, my_tile_codes = tilecodes;

	// global game consts
	var my_game_over = false;
	var my_levels = {}, my_level_discovery = 0;
	var my_level_generator = level_gen;
	var my_dungeon, my_player, my_open_container, my_dialog_is_open = false, my_target_list = [], my_fire_index = null, my_open_dialog = '';
	// var my_time_pulse = 0;
	// var my_pulse_list = [speed.slow, speed.normal, speed.slow, speed.fast];

	// sounds
	var my_audio = document.createElement('audio');
	var my_sounds = {}, my_sound_category = {};

	var my_screen = {"x": 0, "y": 0, "width": constants.game_tiles_width, "height": constants.game_tiles_height};

	var my_turn = 0;
	var my_msg_queue = [];

	////////////////////////////////////////////////////////////////////////////////
	// PRIVATE FUNCTIONS
	////////////////////////////////////////////////////////////////////////////////

	var updateScreenOffset = function ( ) {
		var orig_screen = {"x": my_screen.x, "y": my_screen.y};
		var x, y, w2, h2;

		// center on player coords
		var player_xy = my_player.getLocation();
		w2 = Math.floor(my_screen.width / 2);
		h2 = Math.floor(my_screen.height / 2);

		x = Math.min(my_dungeon.width - my_screen.width, Math.max(0, player_xy.x - w2));
		y = Math.min(my_dungeon.height - my_screen.height, Math.max(0, player_xy.y - h2));

		my_screen.x = x;
		my_screen.y = y;

		return ((my_screen.x !== orig_screen.x) || (my_screen.y !== orig_screen.y));
	};

	var updateFov = function (mob) {
	// return an array of squares that had their FOV/light value change

		var blocked, visit, start_xy, new_map, previous_map, a, changed = [], now_lit = [], now_unlit = [];

		previous_map = mob.getFov();
		mob.clearFov();

		blocked = function (x, y) {
			var t = my_dungeon.getTerrainAt({"x": x, "y": y});
			if (t !== null) {
				return (t.isOpaque());
			} else {
				return true;
			}
		};

		visit = function (x, y) {
			var xy = {"x": x, "y": y};
			if (my_dungeon.isValidCoordinate(xy) === true) {
				mob.setFovAt(xy);
				var other_mob = my_dungeon.getMonsterAt(xy);
				if (other_mob !== null && !other_mob.hasFlag(flags.is_invisible)) {
					mob.addAware(other_mob);
				} //else {
					//var item = my_dungeon.getItemAt(xy);
			}
		};

		// run fov caster
		start_xy = mob.getLocation();
		fieldOfView(start_xy.x, start_xy.y, mob.sight_radius, visit, blocked);
		new_map = mob.getFov();

		// see what squares are new appearances
		for (a in new_map) {
			if (new_map.hasOwnProperty(a)) {
				if ((new_map[a] === true) && (previous_map[a] === undefined)) {
					now_lit.push(a);
				} 
			}
		}

		// see what squares have disappeared
		for (a in previous_map) {
			if (previous_map.hasOwnProperty(a)) {
				if ((new_map[a] === undefined) && (previous_map[a] === true)) {
					now_unlit.push(a);
				}
			}
		}

		changed = now_lit.concat(now_unlit);
		return changed;
	};

	////////////////////////////////////////////////////////////////////////////////  
	// DRAWING + GRAPHICS
	////////////////////////////////////////////////////////////////////////////////

	var drawGame = function ( ) {
	// redraw every tile on the game screen

		var x, y;

		for (x = 0; x < constants.game_tiles_width; x += 1) {
			for (y = 0; y < constants.game_tiles_height; y += 1) {
				drawGridAt({"x": x, "y": y});
			}
		}
	};

	var drawInventory = function ( ) {
		// update the inventory box on screen

		var i, x, y, gx, gy, item, fore_color, bg_color;
		var inventory = my_player.inventory;

		for (i = 0; i < constants.inventory_max_items; i += 1) {
			x = i % constants.inventory_tiles_width;
			y = Math.floor(i / constants.inventory_tiles_width);
			gx = x * constants.inventory_tile_dst_width;
			gy = y * constants.inventory_tile_dst_height;

			if (i < inventory.getNumItems()) {
				item = inventory.getItem(i);
				fore_color = item.getColor();
				if ((item === my_player.equip.getItem(constants.equip.projectile)) || (item === my_player.equip.getItem(constants.equip.melee))) {
					bg_color = colors.equipped_inventory_bg;
				} else {
					bg_color = colors.normal_bg;
				}
				drawTileOn(ctx_inventory, my_tile_codes[item.getCode()], gx, gy, constants.inventory_tile_dst_width, constants.inventory_tile_dst_height, fore_color, bg_color);
			} else {
				drawTileOn(ctx_inventory, my_tile_codes['SPACE'], gx, gy, constants.inventory_tile_dst_width, constants.inventory_tile_dst_height, colors.normal_fore, colors.normal_bg);
			}
		}
	};

	var drawHoverInfo = function (hover_thing, equipped, map_xy) {
	// updates whenever player hovers over something.. inventory items, monster, equipment, etc
		
		var text;

		// clear it first
		ctx_hoverinfo.fillStyle = colors.normal_bg;
		ctx_hoverinfo.fillRect(0, 0, $('#id_cnv_hoverinfo').attr('width'), $('#id_cnv_hoverinfo').attr('height'));

		// just clear and exit if we were intentially passed a NULL item
		if (hover_thing === null) {
			return;
		}

		x_col = 2;
		y_row = 0;
		drawTileOn(ctx_hoverinfo, my_tile_codes[hover_thing.getCode()], x_col, y_row, constants.tile_dst_width, constants.tile_dst_height, hover_thing.getColor(), hover_thing.getBackgroundColor());
		
		x_col += constants.tile_dst_width * 2;
		drawTextWithTiles(ctx_hoverinfo, hover_thing.getName(), x_col, y_row, constants.tile_dst_width, constants.tile_dst_height, colors.white, colors.normal_bg);
		
		// is this item equipped??
		if ((my_player.equip.getItem(constants.equip.projectile) === hover_thing) ||
			(my_player.equip.getItem(constants.equip.melee) === hover_thing)) {
			
			y_row += constants.tile_dst_height;
			drawTextWithTiles(ctx_hoverinfo, "Equipped", 0, y_row, constants.tile_dst_width, constants.tile_dst_height, colors.white, colors.normal_bg);
		}
		
		if (hover_thing.objtype === 'item') {
			if (compareItemToFamily(hover_thing, lib.itemFamily.fuel_cell)) {
				y_row += constants.tile_dst_height;
				drawTextWithTiles(ctx_hoverinfo, "Charges " + hover_thing.system, 0, y_row, constants.tile_dst_width, constants.tile_dst_height, colors.white, colors.normal_bg);
			}
		} else if (hover_thing.objtype === 'mob') {
			if (hover_thing.description) {
				y_row += constants.tile_dst_height;
				drawTextWithTiles(ctx_hoverinfo, hover_thing.description, 0, y_row, constants.tile_dst_width, constants.tile_dst_height, colors.white, colors.normal_bg);
			}
			y_row += constants.tile_dst_height;
			if (!compareThing(hover_thing, my_player)) {
				drawSystemBar(ctx_hoverinfo, 2, y_row, 15, constants.tile_dst_width, constants.tile_dst_height, colors.blood, colors.white, 
					hover_thing.getStat("health").getCurrent(),
					hover_thing.getStat("health").getMax()
				);
			}
		} else if (hover_thing.objtype === 'terrain' && map_xy !== undefined) {
			var feature = my_dungeon.getFeatureAt(map_xy);
			if (feature !== null) {
				y_row += constants.tile_dst_height;
				drawTextWithTiles(ctx_hoverinfo, feature.getName(), 0, y_row, constants.tile_dst_width, constants.tile_dst_height, colors.white, colors.normal_bg);
			}
		}
	};

	var drawContainer = function ( ) {
	// shows up when you open a container

		// clear it first
		ctx_container.fillStyle = colors.normal_bg;
		ctx_container.fillRect(0, 0, $('#id_cnv_container').attr('width'), $('#id_cnv_container').attr('height'));

		var i, x, y, gx, gy, item, fore_color;
		var inventory = my_open_container.inventory;

		for (i = 0; i < constants.container_max_items; i += 1) {
			x = i % constants.container_tiles_width;
			y = Math.floor(i / constants.container_tiles_width);
			gx = x * constants.inventory_tile_dst_width;
			gy = y * constants.inventory_tile_dst_height;

			if (i < inventory.getNumItems()) {
				item = inventory.getItem(i);
				fore_color = item.getColor();
				drawTileOn(ctx_container, my_tile_codes[item.getCode()], gx, gy, constants.inventory_tile_dst_width, constants.inventory_tile_dst_height, fore_color, colors.normal_bg);
			} else {
				drawTileOn(ctx_container, my_tile_codes['SPACE'], gx, gy, constants.inventory_tile_dst_width, constants.inventory_tile_dst_height, colors.normal_fore, colors.normal_bg);
			}
		}

	};

	var drawTextMessage = function(msg_name, msg_text_list) {
	// shows up when you open an item message
	
		// clear it first
		ctx_text_message.fillStyle = colors.normal_bg;
		ctx_text_message.fillRect(0, 0, $('#id_cnv_text_message').attr('width'), $('#id_cnv_text_message').attr('height'));
		
		for (var i = 0; i < msg_text_list.length; i += 1) {
			drawTextWithTiles(ctx_text_message, msg_text_list[i], 0, i * constants.tile_dst_height, constants.tile_dst_width, constants.tile_dst_height, colors.white, colors.normal_bg);
		}
	};
	
	var drawPlayerInfo = function ( ) {
	// player name, power, systems, etc!
	
		var y_row;
		var x_col = 2 * constants.tile_dst_width + 2;
		var row_laser, row_shield, row_engine, row_power;
		var cur_sys = my_player.getCurrentSystem();

		y_row = 2
		drawTextWithTiles(ctx_playerinfo, my_player.getName() + ' ' + my_dungeon.depth, 2, y_row, constants.tile_dst_width, constants.tile_dst_height, colors.white, colors.normal_bg);

		// Power Core
		y_row = y_row + constants.tile_dst_height + 2;
		row_power = y_row;
		drawSystemBar(ctx_playerinfo, 2, y_row, 15, constants.tile_dst_width, constants.tile_dst_height, colors.power, colors.white, 
			my_player.getStat(constants.system.power).getCurrent(), 
			my_player.getStat(constants.system.power).getMax());
		drawTextWithTiles(ctx_playerinfo, "Power", x_col, y_row, constants.tile_dst_width, constants.tile_dst_height, colors.white);

		// Shields
		y_row = y_row + constants.tile_dst_height + 2;
		row_shield = y_row;
		drawSystemBar(ctx_playerinfo, 2, y_row, 15, constants.tile_dst_width, constants.tile_dst_height, colors.shield, colors.white, 
			my_player.getStat(constants.system.shield).getCurrent(), 
			my_player.getStat(constants.system.shield).getMax());
		drawTextWithTiles(ctx_playerinfo, "Shield", x_col, y_row, constants.tile_dst_width, constants.tile_dst_height, colors.white);

		// Engine
		y_row = y_row + constants.tile_dst_height + 2;
		row_engine = y_row;
		drawSystemBar(ctx_playerinfo, 2, y_row, 15, constants.tile_dst_width, constants.tile_dst_height, colors.cloak, colors.white, 
			my_player.getStat(constants.system.cloak).getCurrent(), 
			my_player.getStat(constants.system.cloak).getMax());
		drawTextWithTiles(ctx_playerinfo, "Cloak", x_col, y_row, constants.tile_dst_width, constants.tile_dst_height, colors.white);

		// Laser
		y_row = y_row + constants.tile_dst_height + 2;
		row_laser = y_row;
		drawSystemBar(ctx_playerinfo, 2, y_row, 15, constants.tile_dst_width, constants.tile_dst_height, colors.laser, colors.white, 
			my_player.getStat(constants.system.laser).getCurrent(), 
			my_player.getStat(constants.system.laser).getMax());
		drawTextWithTiles(ctx_playerinfo, "Lasers", x_col, y_row, constants.tile_dst_width, constants.tile_dst_height, colors.white);

		// Draw current charging system
		if (cur_sys === constants.system.cloak) {
			y_row = row_engine;
		} else if (cur_sys === constants.system.shield) {
			y_row = row_shield;
		} else if (cur_sys === constants.system.laser) {
			y_row = row_laser;
		} else if (cur_sys === constants.system.power) {
			y_row = row_power;
		} else {
			alert("invalid system??" + cur_sys);
		}
		drawTileOn(ctx_playerinfo, my_tile_codes["DASH"], 2, y_row, constants.tile_dst_width, constants.tile_dst_height, colors.white, colors.normal_bg, false);
		drawTileOn(ctx_playerinfo, my_tile_codes["CLOSE_ANGLE"], constants.tile_dst_width, y_row, constants.tile_dst_width, constants.tile_dst_height, colors.white, colors.normal_bg, false);
	};

	var drawMessages = function ( ) {
	// re-draw the  message log at the top of the game UI
	
		var idx, msg, disp_msgs = 3, num_msgs = my_msg_queue.length, fg_color;
		
		ctx_messages.fillStyle = colors.normal_bg;
		ctx_messages.fillRect(0, 0, $('#id_cnv_messages').attr('width'), $('#id_cnv_messages').attr('height'));
		
		for (var i = 0; i < disp_msgs; i += 1) {
			idx = num_msgs - (disp_msgs - i);
			if (idx < 0) { continue; }
			msg = my_msg_queue[idx].message;
			fg_color = (my_msg_queue[idx].color !== null) ? my_msg_queue[idx].color : colors.msg_row[i];
			drawTextWithTiles(ctx_messages, msg, 0, i * constants.tile_dst_height, constants.tile_dst_width, constants.tile_dst_height, fg_color, colors.normal_bg);
		}
	};
	
	var drawTextWithTiles = function (context, text, x, y, width_per_tile, tile_height, color, bg_color) {
	// Draws a string using image tiles on a canvas context (careful - does not work with -/./etc
	
		if (bg_color === undefined) {
			bg_color = colors.normal_bg;
			clear_first = false;
		} else {
			clear_first = true;
		}

		for (var i = 0; i < text.length; i += 1) {
			// todo: need to convert text like period, comma, colon, etc
			drawTileOn(context, text.charCodeAt(i)-32, x + (width_per_tile * i), y, width_per_tile, tile_height, color, bg_color, clear_first);
		}
	};

	var drawSystemBar = function (context, x, y, max_tiles, width_per_tile, tile_height,  color_full, color_empty, current_amount, max_amount) {
	// draws a percentage-based bar out of tile images on a canvas context
		
		// figure out percentage to show
		var raw_num_bars = Math.min(1.0, current_amount / max_amount) * max_tiles;
		var num_bars = Math.ceil(raw_num_bars);
		var remainder = num_bars - raw_num_bars;
		var tile;
		
		// todo: more shading on last bar if rounding up/down

		for (var i = 0; i < max_tiles; i += 1) {
			if (i === num_bars - 1) {
				if (remainder < 0.25) {
					tile = 'BLOCK_FULL';
				} else if (remainder < 0.5) {
					tile = 'BLOCK_FADE3';
				} else if (remainder < 0.75) {
					tile = 'BLOCK_FADE2';
				} else {
					tile = 'BLOCK_FADE1';
				}
				drawTileOn(context, my_tile_codes[tile], x + ((width_per_tile + 0) * i) , y, width_per_tile, tile_height, color_full, colors.normal_bg);
			} else if (i < num_bars) {
				drawTileOn(context, my_tile_codes['BLOCK_FULL'], x + ((width_per_tile + 0) * i) , y, width_per_tile, tile_height, color_full, colors.normal_bg);
			} else {
				drawTileOn(context, my_tile_codes['BLOCK_FADE1'], x + ((width_per_tile + 0) * i) , y, width_per_tile, tile_height, color_empty, colors.normal_bg);
			}
		}  
	};

	var drawTileOn = function (context, tile_code, x, y, width, height, fore_color, bg_color, clear_first) {
	// helper-function to draw a single image tile spsomewhere on a tile
		
		// prep copy canvas
		ctx_copy.clearRect(0, 0, constants.tile_dst_width, constants.tile_dst_height);
		ctx_copy.globalCompositeOperation = "source-over";
		// todo: which part of this does not work in Firefox??

		// draw onto copy
		my_tiles.drawTileImage(ctx_copy, tile_code, 0, 0, constants.tile_dst_width, constants.tile_dst_height);

		// recolor copy canvas using transparent overlay
		// twp 3/13 : was source-in 
		ctx_copy.globalCompositeOperation = "source-atop";
		ctx_copy.fillStyle = fore_color;
		ctx_copy.fillRect(0, 0, constants.tile_dst_width, constants.tile_dst_height);
		ctx_copy.fill();

		// prep destination canvas
		if (clear_first === undefined || clear_first === true) {
			context.clearRect(x, y, width, height);

			// fill destination canvas with BG color
			context.fillStyle = bg_color;
			context.fillRect(x, y, width, height);
		}

		// draw resulting image from copy to destination
		context.drawImage(cnv_copy, x, y, width, height);
	};
	
	var drawHighlightedLine = function (points_xy_lst) {
	// draw a line of semi-transparent highlighted squares to a certain point
	
		var grid_x, grid_y;
		for (var i = 0; i < points_xy_lst.length; i += 1) {
			grid_x = points_xy_lst[i].x * constants.tile_dst_width;
			grid_y = points_xy_lst[i].y * constants.tile_dst_height;
			drawTileOn(ctx_game, my_tile_codes['BLOCK_FADE1'], grid_x, grid_y, constants.tile_dst_width, constants.tile_dst_height, colors.yellow, colors.normal_bg, false);
		}
	};
	
	var drawMapAtPoints = function (points_xy_lst) {
	// drawMapAt a list of {x, y} coordinates
	
		for (var i = 0; i < points_xy_lst.length; i += 1) {
			drawMapAt(points_xy_lst[i]);
		}
	};

	var drawMapAt = function (map_xy) {
	// main drawing function -- figures out what is at a point and draws it
	
		var terrain, item, feature, mob, fore_color, bg_color, tile_code, grid_x, grid_y, can_see, memory;
		var feature_bg_color, feature_fore_color, feature_code;

		grid_xy = {"x": map_xy.x - my_screen.x, "y": map_xy.y - my_screen.y};

		grid_x = grid_xy.x * constants.tile_dst_width;
		grid_y = grid_xy.y * constants.tile_dst_height;

		can_see = my_player.getFovAt(map_xy);

		is_player = compareCoords(map_xy, my_player.getLocation());
		mob = my_dungeon.getMonsterAt(map_xy);
		terrain = my_dungeon.getTerrainAt(map_xy);
		item = my_dungeon.getItemAt(map_xy);
		feature = my_dungeon.getFeatureAt(map_xy);

		if (can_see === true) {
			// by default, use the terrain background color
			my_player.setDiscoveryAt(my_dungeon.id, map_xy);
			if (terrain === null) {
				console.log("tried to draw null terrain");
			}
			bg_color = terrain.getBackgroundColor();
			// by default, remember the terrain was here
			my_player.setMemoryAt(my_dungeon.id, map_xy, terrain);	  

			// replace terrain background with feature background color if one exists
			if (feature !== null) {
				feature_bg_color = feature.getBackgroundColor();
				if (feature_bg_color !== colors.transparent) {
					bg_color = feature_bg_color;
				}
			}

			if (mob !== null) {
				fore_color = mob.getColor();
				//bg_color = mob.getBackgroundColor();
				tile_code = my_tile_codes[mob.getCode()];

			}	else  if (item !== null) {
				fore_color = item.getColor();
				tile_code = my_tile_codes[item.getCode()];
				my_player.setMemoryAt(my_dungeon.id, map_xy, item); // remember items

			} else {
				// by default, use the color + code of the terrain
				fore_color = terrain.getColor();
				tile_code = my_tile_codes[terrain.getCode()];

				if (feature !== null) {
					feature_fore_color = feature.getColor();
					feature_code = feature.getCode();

					if (feature_fore_color !== colors.transparent) {
						fore_color = feature_fore_color;
					}

					if (feature_code !== 'NONE') {
						tile_code = my_tile_codes[feature_code];
					}
				}
			}

			drawTileOn(ctx_game, tile_code, grid_x, grid_y, constants.tile_dst_width, constants.tile_dst_height, fore_color, bg_color, true);	

		} else {
			// can't see anything there, maybe we remember seeing something?
			memory = my_player.getMemoryAt(my_dungeon.id, map_xy);

			if (memory === null) {
				drawTileOn(ctx_game, 'SPACE', grid_x, grid_y, constants.tile_dst_width, constants.tile_dst_height, colors.normal_bg, colors.normal_bg, true);	
			} else {
				drawTileOn(ctx_game, my_tile_codes[memory.getCode()], grid_x, grid_y, constants.tile_dst_width, constants.tile_dst_height, colors.memory, colors.normal_bg, true);	
			}
		}
	};

	var drawGridAt = function (grid_xy) {
	// converts a screen grid to a game map grid and draws it
		
		var map_xy;

		map_xy = {"x": grid_xy.x + my_screen.x, "y": grid_xy.y + my_screen.y};
		drawMapAt(map_xy);
	};
	
	var animateProjectile = function (start_xy, target_xy, spec, callback) {
	// in theory -- animates a projectile from one location to another on screen
	
		var intermed_point_lst, len, i, speed = 45;
		
		intermed_point_lst = getLineBetweenPoints(start_xy, target_xy);
		
		// draw the projectile's movement
		for (i = 1; i < intermed_point_lst.length; i += 1) {
			setTimeout(
				animateProjectileHelper(intermed_point_lst, i, spec),
				speed * i
			);
		}
		
		// redraw the last square
		setTimeout(
			function () { 
				drawMapAt(target_xy); 
				callback();
			},
			speed * i
		);
	};
	
	var animateProjectileHelper = function (point_lst, i, spec) {
		return function () {
			var grid_x = point_lst[i].x * constants.tile_dst_width;
			var grid_y = point_lst[i].y * constants.tile_dst_height;
			drawMapAt(point_lst[i-1])
			drawTileOn(ctx_game, my_tile_codes[spec.code], grid_x, grid_y, constants.tile_dst_width, constants.tile_dst_height, spec.color, spec.bg_color, spec.bg_color !== colors.transparent);
		};
	};
	
	var animateAreaEffect = function (start_xy, radius, spec, callback) {
	// in theory -- animates an 'explosion' starting at the center and moving out
	
		var len, i, speed = 60;
		
		// draw the projectile's movement
		for (i = 1; i <= radius + 1; i += 1) {
			setTimeout(
				animateAreaEffectHelper(start_xy, i, radius, spec),
				speed * i
			);
		}
	};
	
	var animateAreaEffectHelper2 = function (center_xy, i, spec) {
		return function () {
			var explode = getPointsInArea(center_xy, i - 1);
			for (var p = 0; p < explode.length; p += 1) {
				var grid_x = explode[p].x * constants.tile_dst_width;
				var grid_y = explode[p].y * constants.tile_dst_height;
				drawMapAt(explode[p])
			}
		};
	};
	
	var animateAreaEffectHelper = function (center_xy, r, max_r, spec) {
		return function () {
			if (r <= max_r) {
				var explode = getPointsInArea(center_xy, r);
				for (var p = 0; p < explode.length; p += 1) {
					var grid_x = explode[p].x * constants.tile_dst_width;
					var grid_y = explode[p].y * constants.tile_dst_height;
					drawTileOn(ctx_game, my_tile_codes[spec.code], grid_x, grid_y, constants.tile_dst_width, constants.tile_dst_height, spec.color, spec.bg_color, spec.bg_color !== colors.transparent);
				}
			}
			
			explode = getPointsInArea(center_xy, r - 1);
			for (var p = 0; p < explode.length; p += 1) {
				var grid_x = explode[p].x * constants.tile_dst_width;
				var grid_y = explode[p].y * constants.tile_dst_height;
				drawMapAt(explode[p])
			}
		};
	};
	
	////////////////////////////////////////////////////////////////////////////////  
	// player interactions
	////////////////////////////////////////////////////////////////////////////////

	var endPlayerTurn = function (just_attacked) {
		my_turn += 1;
		my_player.removeFlag(flags.was_hit);
		// todo: can shields regen during battle??
		// if ((my_turn - my_player.last_hit) >= 10) {
			// doSystemCharge();
		// }
		
		// send power to whatever system is currently selected
		doSystemCharge();
		
		// deduct cloak energy while cloaked
		if (my_player.hasFlag(flags.is_invisible)) {
			my_player.getStat(constants.system.cloak).deduct(constants.cost.cloak_per_turn);

			//  cloak disabled due to power loss
			if (my_player.getStat(constants.system.cloak).isZero()) {
				addMessage("Our cloak has lost power!", colors.red);
				doCloakDeactivate();
			}
			
			//  disable cloak after an attack
			if (just_attacked === true) {
				addMessage("We have been revealed");
				// tut: attacking disables cloak
				doCloakDeactivate()
			}
		}
		
		var item = my_dungeon.getItemAt(my_player.getLocation());
		if (item) {
			$('#id_div_info_footer').html('There is a <b>' + item.getName() + '</b> here. Press Space, Middle-Click, or Self Click to pick up');
		}
		// update discoveries
		my_level_discovery = my_player.getDiscoveryLevel(my_dungeon.id);
		drawPlayerInfo();
		doMonsterTurns();
	};

	var doSystemCharge = function ( ) {
	// called at the end of each turn, diverts some power to the active system

		var cur_sys = my_player.getCurrentSystem();
		var current_discovery = my_player.getDiscoveryLevel(my_dungeon.id);
		var new_discovery = current_discovery - my_level_discovery;
				
		// no power to distribute
		if (my_player.getStat(constants.system.power).isZero()) {
			return;
		}

		// discovering terrain gains power
		if (!my_player.hasFlag(flags.is_invisible)) {
			my_player.getStat(constants.system.power).addTo(Math.floor(new_discovery / constants.discovery_benefit));
		}
		
		// transfer power
		if (!my_player.getStat(cur_sys).isMax()) {
			// no power transfer while cloaked
			if (my_player.hasFlag(flags.is_invisible)) {
				// tut: no recharging during cloaked
				return;
			}

			my_player.getStat(cur_sys).addTo(5);
			my_player.getStat(constants.system.power).addTo(-5);
		}
	};

	var doPlayerToggleCloak = function ( ) {
	// switches the cloaking device on and off
	
		if (my_player.hasFlag(flags.is_invisible)) {
			// already cloaked, turn it off
			addMessage("Cloak deactivated");
			doCloakDeactivate();
		} else {
			if (my_player.getStat(constants.system.cloak).getCurrent() >= constants.cost.activate_cloak) {
				// activating cloak
				addMessage("Cloaking device activated");
				my_player.getStat(constants.system.cloak).addTo(-1 * constants.cost.activate_cloak);
				drawPlayerInfo();
				doCloakActivate();
			} else {
				// msg: not enough power to coak
				addMessage("Not enough power to activate cloak");
				return;
			}
		}
		
		endPlayerTurn();
	};

	var doCloakActivate = function ( ) {
	// turns player's cloak on -- already assumes power has been deducted
		
		playRandomSound("cloak_on");
		my_player.addFlag(flags.is_invisible);
		my_player.setColor(colors.cloak);
		drawMapAt(my_player.getLocation());
	};
	
	var doCloakDeactivate = function ( ) {
	// turns player's cloak off
		
		playRandomSound("cloak_off");
		my_player.removeFlag(flags.is_invisible);
		my_player.setColor(lib.monsterFamily.player.color);
		drawMapAt(my_player.getLocation());
	};
	
	var doPlayerMove = function (offset_xy) {
	// basic player movement
	
		var player_xy, new_xy, terrain, mob, update_scroll, fov_updates, i;

		player_xy = my_player.getLocation();
		new_xy = {x: player_xy.x + offset_xy.x, y: player_xy.y + offset_xy.y};

		if (my_dungeon.isValidCoordinate(new_xy) !== true) {
			//alert("bad coord");
			return;
		} 

		// check terrain
		terrain = my_dungeon.getTerrainAt(new_xy);
		if (terrain.isWalkable() === false) {
			// todo: check for doors, bump to open?
			// todo: remove this
			drawPlayerInfo();
			return;
		}

		// check other monsters
		mob = my_dungeon.getMonsterAt(new_xy);
		if (mob !== null) {
			// bumpattack
			doPlayerBump(mob);
			return;
		} 

		my_dungeon.removeMonsterAt(player_xy);
		my_dungeon.setMonsterAt(new_xy, my_player);

		update_scroll = updateScreenOffset();
		fov_updates = updateFov(my_player);

		if (update_scroll === true) {
			// scrolled the screen, so we need to redraw everything anyways
			drawGame();
		} else {
			// we can be picky about what to draw
			drawMapAt(player_xy);
			drawMapAt(new_xy);

			for (i = 0; i < fov_updates.length; i += 1) {
				drawMapAt(keyXY(fov_updates[i]));
			}
		}

		endPlayerTurn();
	};

	var doPlayerBump = function (mob) {
	// melee attack a monster

		var attack_msg, melee_weapon, damage, cloak_mod = 1;

		if (my_player.hasFlag(flags.is_invisible)) {
			// tut: attacking while cloak does treble damage
			cloak_mod = 3;
		}
		melee_weapon = my_player.equip.getItem(constants.equip.melee);
		if (melee_weapon) {
			attack_msg = "We maul the " + mob.getName() + " with our " + melee_weapon.getName();
		} else {
			attack_msg = "We slam into the " + mob.getName();
		}
		addMessage(attack_msg);
		
		playRandomSound("melee");
		doMobDamage(mob, my_player.getMeleeDamage() * cloak_mod);
		endPlayerTurn(true);
	};
	
	var getLaserProjectileCode = function (from_xy, to_xy) {
	// utility function to draw lasers as | or - depending on direction
		var xdiff = Math.abs(from_xy.x - to_xy.x);
		var ydiff = Math.abs(from_xy.y - to_xy.y);
		return (ydiff > xdiff) ? 'PIPE' : 'DASH';
	};
	
	var inRange = function (location_xy, target_xy, range) {
		var dist = Math.round(dist2d(location_xy.x, location_xy.y, target_xy.x, target_xy.y));
		return range >= dist;
	};
	
	var doPlayerShoot = function (mob) {

		var player_xy, mob_xy, projectile, damage, projectile_spec = {}, splatter;
		
		// set up distances
		player_xy = my_player.getLocation();
		mob_xy = mob.getLocation();
		
		if (inRange(player_xy, mob_xy, my_player.getAttackRadius())) {
			// see if we are shootings LASERS or ANOTHER PROJECTILE
			if (my_player.equip.hasItem(constants.equip.projectile)) {
				// todo: better rocket sound?
				// todo: do rockets take up power or not?
				projectile = my_player.equip.getItem(constants.equip.projectile);
				playRandomSound("explosion");
				splatter = constants.splatter.blood;
				damage = projectile.getRangedDamage();
				checkProjectileAfterUse(projectile);
				projectile_spec = {
					code: projectile.getCode(), 
					color: projectile.getColor(), 
					bg_color: colors.transparent
				};
				
			} else {
				// use LAZERS
				if (my_player.getStat(constants.system.laser).getCurrent() <= 0) {
					// no laser power!
					return;
				}
				
				playRandomSound("laser");
				my_player.getStat(constants.system.laser).addTo(-4);
				splatter = constants.splatter.scorch;
				damage = my_player.getRangedDamage();
				projectile_spec = {
					code: getLaserProjectileCode(player_xy, mob_xy), 
					color: colors.laser, 
					bg_color: colors.transparent
				};
			}
			
			my_fire_index = null; // also an identifier that we are cycling targets
			my_player.last_target = mob;
			
			animateProjectile(player_xy, mob_xy, projectile_spec,
				function () {
					doMobDamage(mob, damage);
					checkTerrainSplatter(mob, splatter);
					endPlayerTurn(true);
				}
			);

		} else {
			playSound("error_0");
			return;
		}
	};

	var doMobRangedAttack = function (mob_shooter, mob_target) {

		var shooter_xy, target_xy, projectile_spec;
		shooter_xy = mob_shooter.getLocation();
		target_xy = mob_target.getLocation();
		
		// use LAZERS
		// todo: enemy attack sound?
		//playRandomSound("laser");

		projectile_spec = {
			code: getLaserProjectileCode(shooter_xy, target_xy), 
			color: colors.red, 
			bg_color: colors.transparent
		};
			
		animateProjectile(shooter_xy, target_xy, projectile_spec,
			function () {
				doMobDamage(mob_target, mob_shooter.getRangedDamage());
			}
		);
	};
	
	var checkProjectileAfterUse = function (projectile) {
		
		projectile.amount -= 1;
		
		if (projectile.amount <= 0) {
			// done with this
			my_player.equip.removeItem(constants.equip.projectile);
			my_player.inventory.removeItemByObject(projectile);
			drawInventory();
		}
	};
	
	var checkTerrainSplatter = function (mob, splatter_type) {
	// trigonometries!
	
		var opp, adj, hyp, theta, player_xy, mob_xy, i, new_x, new_y, new_xy, points, impact_xy, terrain;
		
		player_xy = my_player.getLocation();
		mob_xy = mob.getLocation(0);
		opp = mob_xy.y - player_xy.y;
		adj = mob_xy.x - player_xy.x;
		hyp = Math.sqrt(opp*opp + adj*adj);
		theta = Math.asin(opp/hyp);

		// check terrain behind
		hyp = Math.ceil(hyp) + 2;
		opp = Math.ceil(Math.sin(theta) * hyp);
		adj = Math.ceil(Math.cos(theta) * hyp);

		if (player_xy.x > mob_xy.x) { 
			adj = adj * -1; 
		}

		if (player_xy.x === mob_xy.x) {
			new_x = player_xy.x;
		} else {
			new_x = player_xy.x + adj;
		}

		if (player_xy.y === mob_xy.y) {
			new_y = player_xy.y;
		} else {
			new_y = player_xy.y + opp;
		}

		new_xy = {"x": new_x, "y": new_y};
		points = getLineBetweenPoints(mob_xy, new_xy);

		for (i = 0; i < points.length; i += 1) {
			impact_xy = points[i];
			terrain = my_dungeon.getTerrainAt(impact_xy);
			if (terrain !== null && terrain.isWalkable() === false) {
				if (splatter_type === constants.splatter.blood) {
					my_dungeon.setFeatureAt(impact_xy, lib.feature.blood);
				} else if (splatter_type === constants.splatter.scorch) {
					my_dungeon.setFeatureAt(impact_xy, lib.feature.scorch);
				}
				
				drawMapAt(impact_xy);
				break;
			}
		}
	};
	
	var getPointsInArea = function (center_xy, radius) {
	// return a list of Coordinates near a given location
	
		var coord_lst = [], d = (radius * 2) + 1, potential_xy;
		var corner_x = center_xy.x - radius;
		var corner_y = center_xy.y - radius;
		
		// build a list of affected squares
		for (var x = 0; x < d; x += 1) {
			for (var y = 0; y < d; y += 1) {
				potential_xy = {"x": corner_x + x, "y": corner_y + y};
				if (dist2d(center_xy.x, center_xy.y, potential_xy.x, potential_xy.y) <= radius) {
					coord_lst.push(potential_xy);
				}
			}
		}
		
		return coord_lst;
	};
	
	var getMonstersInArea = function (center_xy, radius, include_center) {
	// return all monster objects near a given location
	
		if (!include_center) {
			include_center = false;
		}
		
		var monster_lst = [], potential_xy, mob;
		
		var coord_lst = getPointsInArea(center_xy, radius);		

		// build a list of affected monsters
		for (var i = 0; i < coord_lst.length; i += 1) {
			potential_xy = coord_lst[i];
			if (compareCoords(potential_xy, center_xy) && !include_center) { continue; }
			mob = my_dungeon.getMonsterAt(potential_xy);
			if (mob) { monster_lst.push(mob); }
		}

		return monster_lst;
	};
	
	var doAreaDamage = function (target_xy, radius, damage) {
		
		var monster_lst = getMonstersInArea(target_xy, radius);
		
		for (var i = 0; i < monster_lst.length; i += 1) {
			addMessage("Hit " + monster_lst[i].getName());
			doMobDamage(monster_lst[i], damage);
		}
		
		animateAreaEffect(target_xy, 3, {code: 'ASTERISK', color: colors.hf_orange, bg_color: colors.transparent}, function () {});
		
		return true;
	};
	
	var doMobDamage = function (mob, damage) {
	
		var shields, leftover, percent;
		mob.last_hit = my_turn;
		mob.addFlag(flags.was_hit);

		if (mob.hasFlag(flags.is_invulnerable)) {
			return;
		}
		
		if (compareMonsterToFamily(mob, lib.monsterFamily.player)) {
			playRandomSound("hurt");

			shields = mob.getStat(constants.system.shield).getCurrent();
			if (shields > 0) {
				if (damage > shields) {
					leftover = damage - shields;
					mob.getStat(constants.system.shield).setTo(0);
					mob.getStat("health").deduct(leftover);
				} else {
					mob.getStat(constants.system.shield).deduct(damage);
				}
				
				percent = mob.getStat(constants.system.shield).getCurrent() / mob.getStat(constants.system.shield).getMax();
				if (percent < 0.1) {
					addMessage("WARNING: Our shields at less than 10%!", colors.red);
				} else if (percent < 0.4) {
					addMessage("WARNING: Our shields at less than 40%!");
				}
			} else {
				mob.getStat("health").deduct(damage);
			}
			
			drawPlayerInfo();
			
		} else {
			mob.getStat("health").addTo(-1 * damage);
			drawHoverInfo(mob);
		}

		// check if they are dead
		if (mob.getStat("health").getCurrent() <= 0) {
			doMobDeath(mob);
		}
	};

	var doMobDeath = function (mob) {
	// remove a mob from ye dungeon

		if (compareMonsterToFamily(mob, lib.monsterFamily.player)) {
			// player died!
			gameOver();

		} else {
			var death_xy = mob.getLocation();

			my_dungeon.removeMonsterAt(death_xy);
			my_dungeon.setFeatureAt(death_xy, lib.feature.generatePoolOfBlood());
			drawMapAt(death_xy);
		}
	};

	var doPlayerFire = function ( ) {
	// keyboard-based fire
		
		// if we already have a target, shoot at it
		if (my_fire_index !== null) {
			drawMapAtPoints(getLineBetweenPoints(my_player.getLocation(), my_target_list[my_fire_index].getLocation()).slice(1));
			doPlayerShoot(my_target_list[my_fire_index]);
		
		// otherwise find an initial target and enter targetting mode
		} else {
		
			updateTargetList();
			var target_mob = getFireTarget();
			
			if (!target_mob) {
				addMessage("No targets in range.");
				return;
			}
			
			drawHighlightedLine(getLineBetweenPoints(my_player.getLocation(), target_mob.getLocation()).slice(1));
		}
		
		$('#id_div_info_footer').html('Press <b>f</b> to fire, <b>g</b> to switch targets, <b>SPACE</b> to cancel');
	};
	
	var doPlayerCycleFireTarget = function ( ) {
		
		if (my_fire_index === null) { return; }
		var next_idx, next_target;
		
		// clear previous line
		drawMapAtPoints(getLineBetweenPoints(my_player.getLocation(), my_target_list[my_fire_index].getLocation()).slice(1));
		
		if (my_fire_index !== null) {
			next_idx = (my_fire_index + 1) % my_target_list.length;
		} else {
			next_idx = 0;
		}
		
		my_fire_index = next_idx;
		next_target = my_target_list[next_idx];
		// draw new line
		drawHighlightedLine(getLineBetweenPoints(my_player.getLocation(), next_target.getLocation()).slice(1));
	};
	
	var doPlayerCancelFire = function ( ) {
	// cancel keyboard fire
	
		drawMapAtPoints(getLineBetweenPoints(my_player.getLocation(), my_target_list[my_fire_index].getLocation()));
		my_target_list = [];
		my_fire_index = null;
	};
	
	var updateTargetList = function ( ) {
	// update an internal target list to allow for easy keyboard cycling between enemies
		
		my_target_list = [];
		var min_d, d, mob, monster_lst = my_dungeon.getMonsters(); 
		var player_xy = my_player.getLocation();
		
		// todo: sort by closest dude
		for (var m = 0; m < monster_lst.length; m += 1) {
			mob = monster_lst[m];
			if (inRange(player_xy, mob.getLocation(), my_player.getAttackRadius()) && my_player.isAware(mob)) {
				if (compareThing(my_player, mob)) { continue; }
				my_target_list.push(mob);
			}
		}
		
		if (my_target_list.length > 0) {
			my_fire_index = 0;
			return true;
		} else {
			my_fire_index = null;
			return false;
		}
	};
	
	var getFireTarget = function ( ) {
	// target nearest enemy for keyboard-based fire
	// default to last-shot enemy if one is still alive
		
		var player_xy, target_xy, target_mob = null;
		player_xy = my_player.getLocation();
		
		// figure out who we should shoot at
		if (my_player.last_target && 
			my_player.isAware(my_player.last_target) && 
			!my_player.last_target.getStat("health").isZero() && 
			inRange(player_xy, my_player.last_target.getLocation(), my_player.getAttackRadius())) {
			
			// use this guy
			target_mob = my_player.last_target;
		} else {
			my_target_index = 0;
			target_mob = my_target_list[0];
		}
		
		return target_mob;
	};
	
	var doPlayerApply = function ( ) {
	// activate inventory items via keyboard
	
		var item, text_list = ["Activate Which Item?", ""];
		var grid_x = 4 * constants.tile_dst_width;
		
		// easier to just draw text with the text message pop up control
		for (var i = 0; i < my_player.inventory.getNumItems(); i += 1) {
			item = my_player.inventory.getItem(i);
			text_list.push("(" + (i + 1) + ") ` " + item.getName());
		}
		my_open_dialog = 'apply';
		showTextMessage(null, text_list);

		// now overlay item codes w/ colors
		for (var i = 0; i < my_player.inventory.getNumItems(); i += 1) {
			item = my_player.inventory.getItem(i);
			drawTileOn(ctx_text_message, my_tile_codes[item.getCode()], grid_x, (i + 2) * constants.tile_dst_height, constants.tile_dst_width, constants.tile_dst_height, item.getColor(), colors.bg_normal);
		}
	};
	
	var doPlayerApplyItem = function (keycode) {
	// player pressed a # to activate an item via keyboard
	
		var item, item_num = keycode - 49; // convert from ASCII to 0-based inventory list index
		
		item = my_player.inventory.getItem(item_num);
		
		if (item) {
			closeTextMessage();
			doPlayerActivateItem(item, item_num);
			my_open_dialog = '';
			
		} else {
			addMessage("Invalid item number.");
		}
	};
	
	var doPlayerKeyboardDrop = function ( ) {
	// activate inventory items via keyboard
	
		var item, text_list = ["Drop Which Item?", ""];
		var grid_x = 4 * constants.tile_dst_width;
		
		// easier to just draw text with the text message pop up control
		for (var i = 0; i < my_player.inventory.getNumItems(); i += 1) {
			item = my_player.inventory.getItem(i);
			text_list.push("(" + (i + 1) + ") ` " + item.getName());
		}
		my_open_dialog = 'drop';
		showTextMessage(null, text_list);

		// now overlay item codes w/ colors
		for (var i = 0; i < my_player.inventory.getNumItems(); i += 1) {
			item = my_player.inventory.getItem(i);
			drawTileOn(ctx_text_message, my_tile_codes[item.getCode()], grid_x, (i + 2) * constants.tile_dst_height, constants.tile_dst_width, constants.tile_dst_height, item.getColor(), colors.bg_normal);
		}
	};
	
	var doPlayerKeyboardDropItem = function (keycode) {
	// player pressed a # to activate an item via keyboard
	
		var item, item_num = keycode - 49; // convert from ASCII to 0-based inventory list index
		
		item = my_player.inventory.getItem(item_num);
		
		if (item) {
			closeTextMessage();
			doPlayerDropItem({"item": item, "index": item_num});
			my_open_dialog = '';
			
		} else {
			addMessage("Invalid item number.");
		}
	};
	
	var doPlayerAction = function ( ) {
		var player_xy, item, i;

		player_xy = my_player.getLocation();
		item = my_dungeon.getItemAt(player_xy);
		portal_lvl_id = my_dungeon.getPortalAt(player_xy);
		
		// if some kind of dialog is open, close it
		if (my_dialog_is_open) {
			doPlayerCloseContainer();
			closeTextMessage();
		
		// cycle targets if targetting
		} else if (my_fire_index !== null) {
			doPlayerCancelFire();//doPlayerCycleFireTarget();
			return;
			
		// assume picking up item if one is on the floor
		} else if (item !== null) {

			// if item is a container, open it
			if (item.isContainer()) {
				doPlayerOpenContainer(item);
			
			// if item is a message, read it
			} else if (compareItemToFamily(item, lib.itemFamily.message)) {
				showTextMessage(item.name, item.message);
				
			// otherwise attempt to pick it up
			} else {
				doPlayerPickupItem(item);
			}

		// if player is on stairs, use them
		} else if (portal_lvl_id !== null) {
			doPlayerActivatePortal();
			
		// otherwise, rest
		} else {
			$('#id_div_info_footer').html('');
			endPlayerTurn();
		}
	};

	var doPlayerInvulnerableDebug = function ( ) {
		if (my_player.hasFlag(flags.is_invulnerable)) {
			my_player.removeFlag(flags.is_invulnerable);
			my_player.setColor(lib.monsterFamily.player.color);
		} else {
			my_player.addFlag(flags.is_invulnerable);
			my_player.setColor(colors.white);
		}
		drawMapAt(my_player.getLocation());
	};

	var doPlayerPickupItem = function (item) {
	// move item from level to inventory if able

		var player_xy, success;

		success = my_player.inventory.addItem(item);

		if (success === true) {
			player_xy = my_player.getLocation();
			my_dungeon.removeItemAt(player_xy);
			addMessage("We picked up " + item.getName());
			endPlayerTurn();
			drawMapAt(player_xy);
			drawInventory();

		} else {
			addMessage("We cannot support any more robo-attachments.", colors.red);
		}
	};

	var showTextMessage = function (msg_name, msg_text_list) {
		//my_audio.src = my_sounds['chest_open'];
		//my_audio.play();

		my_dialog_is_open = true;
		$('#id_cnv_text_message').attr('height', msg_text_list.length * constants.tile_dst_height);
		var my_div = $('#id_div_text_message').get()[0];
		$('#id_div_text_message').show();
		my_div.style.position = 'absolute';
		// todo: need better positioning for pop ups
		my_div.style.top = $('#id_cnv_game').position().top + constants.tile_dst_height;
		my_div.style.left = $('#id_cnv_game').position().left + constants.tile_dst_width;
		drawTextMessage(msg_name, msg_text_list);
		$('#id_div_info_footer').html('Press SPACE again to close');
	};
	
	var closeTextMessage = function ( ) {
		// my_audio.src = my_sounds['chest_close'];
		// my_audio.play();

		my_dialog_is_open = false;
		$('#id_div_text_message').hide();
		$('#id_div_info_footer').html('');
	};
	
	var doPlayerOpenContainer = function (container_item) {
		//my_audio.src = my_sounds['chest_open'];
		//my_audio.play();

		my_open_container = container_item;
		my_dialog_is_open = true;
		var my_div = $('#id_div_open_container').get()[0];

		$('#id_div_open_container').show();
		my_div.style.position = 'absolute';
		my_div.style.top = $('#id_cnv_game').position().top + constants.tile_dst_height;
		my_div.style.left = $('#id_cnv_game').position().left + constants.tile_dst_width;
		drawContainer();
		$('#id_div_info_footer').html('Press SPACE again to close');
	};

	var doPlayerCloseContainer = function (container_item) {
		// my_audio.src = my_sounds['chest_close'];
		// my_audio.play();

		my_open_container = {};
		my_dialog_is_open = false;
		$('#id_div_open_container').hide();
		$('#id_div_info_footer').html('');
	};
	
	var doPlayerCycleSystem = function (dir) {
	// cycle between which system is getting POWER
	
		var cur_sys, idx, new_sys, new_idx;
		
		cur_sys = my_player.getCurrentSystem();
		
		idx = constants.system_list.indexOf(cur_sys);
		new_sys = constants.system_list[(idx + dir).mod(constants.system_list.length)];
		my_player.setCurrentSystem(new_sys);

		if (new_sys === constants.system.power) {
			addMessage("We are conserving power");	
		} else {
			addMessage("We are diverting our power core to " + new_sys.toLowerCase());
		}
		
		drawPlayerInfo();
	};

	var doPlayerActivateItem = function (item, inv_index) {
	// item is activated (usually  from the inventory)
	
		var used_up = false;
		
		// ENERGY POD / FUEL CELL
		if (compareItemToFamily(item, lib.itemFamily.fuel_cell)) {
			if (my_player.getStat(item.system).isMax()) {
				var w = (item.system === constants.system.laser) ? "are" : "is";
				addMessage(item.system + " " + w + " already fully charged.");
			} else {
				playRandomSound("recharge");
				my_player.getStat(item.system).addTo(item.amount);
				drawPlayerInfo();
				used_up = true;
			}
		// PROJECTILE WEAPON
		} else if (compareItemToFamily(item, lib.itemFamily.projectile)) {
			if (item === my_player.equip.getItem(constants.equip.projectile)) {
				// already equipped, remove it
				addMessage(item.getName() + " unarmed");
				my_player.equip.removeItem(constants.equip.projectile);
			} else {
				addMessage(item.getName() + " armed. \(Will fire with next shot\)");
				my_player.equip.setItem(constants.equip.projectile, item);
			}
			drawInventory();
			drawHoverInfo(item);
		// MELEE  WEAPON
		} else if (compareItemToFamily(item, lib.itemFamily.melee_weapon)) {
			if (item === my_player.equip.getItem(constants.equip.melee)) {
				// already equipped, remove it
				addMessage(item.getName() + " unattached.");
				my_player.equip.removeItem(constants.equip.melee);
			} else {
				addMessage("We are now equipped with a " + item.getName().toLowerCase());
				my_player.equip.setItem(constants.equip.melee, item);
			}
			drawInventory();
			drawHoverInfo(item);
		} else {
			addMessage("That doesn't look robo-compatible..");
		}
		
		if (used_up) {
			my_player.inventory.removeItem(inv_index);
			drawInventory();
			drawHoverInfo(null);
		}
	};

	////////////////////////////////////////////////////////////////////////////////  
	// INVENTORY
	////////////////////////////////////////////////////////////////////////////////
	var getInventoryItemFromCoords = function (grid_xy) {
	// returns the inventory item and array index

		var inventory = my_player.inventory;
		var i, item;

		i = (grid_xy.y * constants.inventory_tiles_width) + grid_xy.x;
		if (i >= inventory.getNumItems()) {
			item = null;
		} else {
			item = inventory.getItem(i);
		}

		return {"item": item, "index": i};
	};

	var doInventoryClick = function (inv_result) {
	// click: equip or ready an item

		item = inv_result.item;
		doPlayerActivateItem(item, inv_result.index);
	};

	var doInventoryShiftClick = function (inv_result) {
		// shift-click an item from inventory: drop
		doPlayerDropItem(inv_result);
	};

	var doInventoryRightClick = function (inv_result) {
	// right/mid-click an item from inventory: --
		doPlayerDropItem(inv_result);
	};

	var doPlayerEquipItem = function (equip_slot, inv_result) {
	// move an item from inventory to equip-status

		my_player.equip.set(equip_slot, inv_result);
		drawInventory();
		drawEquipment();  
	};

	var doPlayerDropItem = function (inv_result) {
	// drop item onto the player's current location

		var item, player_xy, portal_level_id;

		// see where the player is
		player_xy = my_player.getLocation();

		// is something there already?
		item = my_dungeon.getItemAt(player_xy);
		portal_level_id = my_dungeon.getPortalAt(player_xy);

		if (portal_level_id) {
			addMessage("We can't drop that in an elevator.");
			return false;
			
		} else if (item === null) {
			my_dungeon.setItemAt(player_xy, inv_result.item);
			my_player.inventory.removeItem(inv_result.index);
			// check if it was equipped
			if (my_player.equip.getItem(constants.equip.projectile) === inv_result.item) {
				my_player.equip.removeItem(constants.equip.projectile);
			}
			if (my_player.equip.getItem(constants.equip.melee) === inv_result.item) {
				my_player.equip.removeItem(constants.equip.melee);
			}

			addMessage("We dropped " + item.getName());
			drawMapAt(player_xy);
			drawInventory();
			return true;

		} else {
			addMessage("We can't drop that, something is in the way.");
			return false;
		}
	};

	////////////////////////////////////////////////////////////////////////////////  
	// GAME CLICK EVENTS
	////////////////////////////////////////////////////////////////////////////////
	var doMouseWalk = function (grid_xy) {
	// right-click on the game screen: -- walk via mouse
		
		var points_lst, walk_xy, offset_xy;
		var player_xy = my_player.getLocation();
		
		// figure out where we want to walk
		points_lst = getLineBetweenPoints(player_xy, grid_xy);
		
		// take the first point as our direction
		walk_xy = points_lst[1];
		
		// rest on no-walk
		if (!walk_xy) {
			doPlayerAction();
		} else {
			offset_xy = {"x": walk_xy.x - player_xy.x, "y": walk_xy.y - player_xy.y};
			doPlayerMove(offset_xy);
		}
	};
	
	var doGameClick = function (grid_xy) {
	// click on the game: walk towards mouse OR shoot something!!

		var map_xy = {"x": grid_xy.x + my_screen.x, "y": grid_xy.y + my_screen.y};  
		var is_player = compareCoords(map_xy, my_player.getLocation());
		var mob = my_dungeon.getMonsterAt(map_xy);
		var can_see = my_player.getFovAt(map_xy) === true;

		if (can_see && (mob !== null) && (!is_player)) {
			doPlayerShoot(mob);
		} else {
			doMouseWalk(map_xy);
		}
	};

	var doGameShiftClick = function (grid_xy) {
	// shift-click on the game screen: --
	
		// var map_xy = {"x": grid_xy.x + my_screen.x, "y": grid_xy.y + my_screen.y}; 
		// var can_see = my_player.getFovAt(map_xy) === true;	
		// return doPlayerThrow(map_xy);
		return;
	};

	var doGameMiddleClick = function (grid_xy) {
	// middle-click on the game screen: -- 'Spacebar' to activate
		
		doPlayerAction();
	};

	var doGameRightClick = function (grid_xy) {
	// right-click on game screen: walk towards (no shooting) or activate cloak (on self)
		
		var map_xy = {"x": grid_xy.x + my_screen.x, "y": grid_xy.y + my_screen.y};  
		var is_player = compareCoords(map_xy, my_player.getLocation());
		
		if (is_player) {
			doPlayerToggleCloak();
		} else {
			doMouseWalk(map_xy);
		}
		
	};
	
	////////////////////////////////////////////////////////////////////////////////  
	// CONTAINERS
	////////////////////////////////////////////////////////////////////////////////

	var getContainerItemFromCoords = function (grid_xy) {
	// returns the container item and array index

		var inventory = my_open_container.inventory;
		var i, item;

		i = (grid_xy.y * constants.container_tiles_width) + grid_xy.x;
		if (i >= inventory.getNumItems()) {
			item = null;
		} else {
			item = inventory.getItem(i);
		}

		return {"item": item, "index": i};
	}; 

	////////////////////////////////////////////////////////////////////////////////  
	// MOUSE EVENTS
	////////////////////////////////////////////////////////////////////////////////
	var doContainerEventMousedown = function (grid_xy, button, shiftKey) {
	// add to player's inventory if possible

		var inv_result, success;

		inv_result = getContainerItemFromCoords(grid_xy);

		if (inv_result.item !== null) {
			success = my_player.inventory.addItem(inv_result.item);

			if (success) {
				my_open_container.inventory.removeItem(inv_result.index);
				drawInventory();
				drawContainer();
			} else {
				addMessage("We cannot support any additional robo-attachments.", colors.red);
			}
		}
	};

	var doContainerEventGainFocus = function (grid_xy) {
		my_container_grid.drawBorderAt(grid_xy, colors.white);
		var inv_result = getContainerItemFromCoords(grid_xy);

		if (inv_result.item !== null) {
			drawHoverInfo(inv_result.item, true);
		}
	};

	var doContainerEventLeaveFocus = function (grid_xy) {
		drawContainer();
	};

	var doEventMousedown = function (grid_xy, button, shiftKey) {

		if (shiftKey === true) {
			doGameShiftClick(grid_xy);
		// } else if (button !== 0) {
			// doGameRightClick(grid_xy);
		} else if (button === 1) {
			doGameMiddleClick(grid_xy);
		} else if (button === 2) {
			doGameRightClick(grid_xy);

		} else {
			doGameClick(grid_xy);
		}
	};

	var doEventGainFocus = function (grid_xy) {
		var html, mob, terrain, item, memory, is_player, player_xy, monster_xy, border_color, map_xy;

		border_color = colors.white;
		map_xy = {"x": grid_xy.x + my_screen.x, "y": grid_xy.y + my_screen.y};

		player_xy = my_player.getLocation();
		mob = my_dungeon.getMonsterAt(map_xy);
		can_see = my_player.getFovAt(map_xy) === true;

		is_player = compareCoords(map_xy, player_xy);
		terrain = my_dungeon.getTerrainAt(map_xy);
		item = my_dungeon.getItemAt(map_xy);

		if (!can_see) {
			memory = my_player.getMemoryAt(my_dungeon.id, map_xy);
			if (memory !== null) {// && memory.objtype !== 'terrain') {
				drawHoverInfo(memory);
			}
		} else {
			if (mob !== null && !is_player) {
				monster_xy = mob.getLocation();
				if (inRange(player_xy, monster_xy, my_player.getAttackRadius())) {
					border_color = colors.red;
				}
				drawHoverInfo(mob, null, map_xy);
			} else if (mob !== null && is_player) {
				drawHoverInfo(mob, null, map_xy);
			} else if (item != null) {
				drawHoverInfo(item, false, map_xy);
			} else {
				drawHoverInfo(terrain, null, map_xy);
			}
		}

		$('#id_div_info_coords').html('(' + map_xy.x + ', ' + map_xy.y + ') [' + dijkstra_maps['to_player'][xyKey(map_xy)] + '] [' + Math.round(dijkstra_maps['from_player'][xyKey(map_xy)],1) + ']');
		my_grid.drawBorderAt(grid_xy, border_color);
	};

	var doEventLeaveFocus = function (grid_xy) {
		drawGridAt(grid_xy);
	};

	var doInventoryEventMousedown = function (grid_xy, button, shiftKey) {

		// figure out what inventory item we just clicked on
		var inv_result = getInventoryItemFromCoords(grid_xy);

		if (inv_result.item !== null) {
			if (my_dialog_is_open && my_open_container != null) {
				// put in container
				success = my_open_container.inventory.addItem(inv_result.item);
				if (success) {
					my_player.inventory.removeItem(inv_result.index);
					drawInventory();
					drawContainer();
				} else {
					addMessage("We can't fit anything else.");
				}

		} else  if (shiftKey === true) {
			// drop
			return doInventoryShiftClick(inv_result);

		} else if (button !== 0) {
			return doInventoryRightClick(inv_result);

		} else {
			// equip
			return doInventoryClick(inv_result);
		}
	}

		return false;
	};

	var doInventoryEventGainFocus = function (grid_xy) {
		my_inv_grid.drawBorderAt(grid_xy, colors.white);
		var inv_result = getInventoryItemFromCoords(grid_xy);

		if (inv_result.item !== null) {
			drawHoverInfo(inv_result.item, true);
		}

	};

	var doInventoryEventLeaveFocus = function (grid_xy) {
		drawInventory();
	};

	////////////////////////////////////////////////////////////////////////////////  
	// GAME AI
	////////////////////////////////////////////////////////////////////////////////

	var doMonsterTurns = function ( ) {
		var i, monsters = my_dungeon.getMonsters();
		dijkstra_maps['to_player'] = createDijkstraMapToPlayer(my_dungeon, my_player);
		dijkstra_maps['from_player'] = createDijkstraMapFromPlayer(dijkstra_maps['to_player']);
		dijkstra_maps['to_mech'] = createDijkstraMapToMechs(my_dungeon);
		
		for (i = 0; i < monsters.length; i += 1) {
			// if the player is dead, stop
			if (my_game_over) {
				return;
			}
			
			if (compareMonsterToFamily(monsters[i], lib.monsterFamily.player)) {
				continue;
			} else if (monsters[i].hasFlag(flags.immobile)) {
				continue;
			} else {
				doMonsterTurn(monsters[i], dijkstra_maps['to_player'], dijkstra_maps['from_player']);
			}
		}
		
		// upate player fov
		updateFov(my_player);
	};

	var doMonsterTurn = function (mob, global_map_to_player, map_from_player) {
		var x, y, success, can_attack, potential_xy;
		var	mob_xy = mob.getLocation(), player_xy = my_player.getLocation();
		var ai_result = '';

		// update my FOV
		updateFov(mob);
		
		// assume we are going to move (monsters not moving are path-finded around by dijkstra maps)
		mob.removeFlag(flags.stand_still);
		
		// if we don't see the player, dont do anything
		// todo: add wandering / patroling?
		if ((mob.isAware(my_player) !== true) && (!mob.hasFlag(flags.was_hit))) {
			map_to_player = mob.dijkstra_map['to_player'];
			// never seen the player even once
			if (!map_to_player) { 
				return;
			}
		
		} else {
			map_to_player = global_map_to_player;
			mob.dijkstra_map['to_player'] = global_map_to_player;
		}

		// this is how far we are from the player
		var dist = Math.round(dist2d(player_xy.x, player_xy.y, mob_xy.x, mob_xy.y), 0);
		
		// special case: pilots run to mechs
		if (mob.hasFlag(flags.is_pilot)) {
			potential_xy = getDownhillNeighbor(dijkstra_maps['to_mech'], mob.getLocation());
			var mech_at = my_dungeon.getMonsterAt(potential_xy);
			if (mech_at && mech_at.hasFlag(flags.is_vehicle) && mech_at.hasFlag(flags.immobile)) {
				doMobPilotVehicle(mob, mech_at);
				return;
				
			} else {
				ai_result = 'move';
			}
		
		} else if ((mob.getAttackRadius() > 0) && (dist <= mob.getAttackRadius()) && mob.isAware(my_player)) {
			// has a ranged attack + in range
			
			if (dist < mob.getAttackRadius()) {
				// too close, move away if we can
				potential_xy = getDownhillNeighbor(map_from_player, mob.getLocation());
				if ((compareCoords(mob_xy, potential_xy)) || (mob.hasFlag(flags.was_hit))) {
					// cornered! shoot anyways
					// todo: melee at close range?? 
					ai_result = 'shoot';
				} else {
					ai_result = 'move';
				}
				
			} else if (dist === mob.getAttackRadius()) {
				ai_result = 'shoot';
			} else {
				alert("shouldnt get here");
			}
				
		} else {
			potential_xy = getDownhillNeighbor(map_to_player, mob.getLocation());
			if (compareCoords(player_xy, potential_xy)) {
				ai_result = 'melee';
			} else {
				ai_result = 'move';
			}
		}
		
		if (ai_result === 'move') {
			if (canMonsterMove(mob, potential_xy)) {
				my_dungeon.removeMonsterAt(mob_xy);
				my_dungeon.setMonsterAt(potential_xy, mob);
				drawMapAt(mob_xy);
				drawMapAt(potential_xy);
			} else {
				// monster can't do anything
			}
		} else if (ai_result === 'melee') {
			var attackmsg = (mob.description === '') ? "The " : "";
			attackmsg += mob.getName() + " bludgeons us.";
			
			addMessage(attackmsg);
			doMobDamage(my_player, mob.getMeleeDamage());
		} else if (ai_result === 'shoot') {
			doMobRangedAttack(mob, my_player);
		} else {
			alert("invalid AI result");
		}
		
		if (potential_xy && (compareCoords(mob_xy, potential_xy))) {
			mob.addFlag(flags.stand_still);
		}
		mob.removeFlag(flags.was_hit);
	};

	var doMobPilotVehicle = function (pilot_mob, vehicle_mob) {
	// pilot mobs can jump into immobile vehicles and bring them online
	
		var pilot_xy = pilot_mob.getLocation();
		var vehicle_xy = vehicle_mob.getLocation();
		
		vehicle_mob.setColor(pilot_mob.getColor());
		vehicle_mob.removeFlag(flags.immobile);
		vehicle_mob.removeFlag(flags.invulnerable);
		vehicle_mob.description = '';
		my_dungeon.removeMonsterAt(pilot_xy);
		drawMapAt(pilot_xy);
		drawMapAt(vehicle_xy);
		playRandomSound("mech_online");
		addMessage("An Assault Mech has been brought online!", colors.red);
	};
	
	var canMonsterMove = function (mob, potential_xy) {
		var terrain, other_mob;

		if (my_dungeon.isValidCoordinate(potential_xy) === false) {
			return false;
		}

		terrain = my_dungeon.getTerrainAt(potential_xy);
		if (terrain.isWalkable() === false) {
			return false;
		}

		other_mob = my_dungeon.getMonsterAt(potential_xy);
		if (other_mob !== null) {
			return false;
		}

		return true;
	};

	var createLevel = function (depth, parent_level) {
		var level_result, dungeon, i, j, idx, random_item_list = [];
		
		level_result = my_level_generator.createRandomCaveLevel(constants.level_width, constants.level_height);
		my_levels[level_result.level.id] = level_result;
		
		level_result.level.depth = depth;
		locations = level_result.level.getWalkableLocations().locations_xy;
		// remove some locations from random-placement
		idx = locations.indexOf(level_result.start_xy);
		if (idx !== -1) { locations.splice(idx, 1); }
		
		idx = locations.indexOf(level_result.end_xy);
		if (idx !== -1) { locations.splice(idx, 1); }
		
		// scramble locations
		fisherYates(locations);
		
		// create some random items
		var M = 5 + Math.floor(Math.random()*5);
		for (i = 1; i < M; i += 1) {
			u = Math.random();
			if (u < 0.025) {
				item = factory.item.generateMeleeWeapon();
			} else if (u < 0.40) {
				item = factory.item.generateRocket();
			} else {
				var random_system = constants.system_list[Math.floor(Math.random()*constants.system_list.length)];
				item = factory.item.generateEnergyPod(random_system);
			}
			random_item_list.push(item);
		}
		
		// add enemies
		var monster_list = [];
		var guaranteed_item_list = [];
		if (depth === 1) {
			// tutorial level
			monster_list = [
				factory.monster.generateResistanceFighter(),
				factory.monster.generateResistanceFighter(),
				factory.monster.generateResistanceFighter(),
				factory.monster.generateResistanceFighter(true),
				factory.monster.generateResistanceFighter(true),
			]
			
			guaranteed_item_list = getTutorialMessages();
			random_item_list = [];
			
		} else if (depth === MAX_DEPTH) {
			// last level
			monster_list = [
				factory.monster.generateChosenOne(),
				factory.monster.generatePilot(),
				factory.monster.generatePilot(),
				factory.monster.generateMech(),
				factory.monster.generateMech(),
				factory.monster.generateMech(),
				factory.monster.generateMech(),
				factory.monster.generateMarine(constants.rank.medium),
				factory.monster.generateMarine(constants.rank.medium)
			]
			
			guaranteed_item_list = [factory.item.generateGoalItem()];
			
		} else { 
			var u = Math.random();
			var content;
			if (u < 0.5) {
				content = getLevelContentMarines();
			} else if (u < 0.75) {
				content = getLevelContentMechs();
			} else {
				content = getLevelContentAssorted();
			}
			guaranteed_item_list = content['guaranteed_items'];
			monster_list = content['monsters'];
		}
		
		monster_list.push(factory.monster.generateResistanceFighter());
		monster_list.push(factory.monster.generateResistanceFighter());
		monster_list.push(factory.monster.generateResistanceFighter(true));
		guaranteed_item_list.push(factory.item.generateEnergyPod(constants.system.power));
		
		// place  guaranteed items
		for (j = 0; j < guaranteed_item_list.length; j += 1) {
			i += 1;
			level_result.level.setItemAt(locations[i], guaranteed_item_list[j]);
		}
		
		// place monsters
		for (j = 0; j < monster_list.length; j += 1) {
			i += 1;
			level_result.level.setMonsterAt(locations[i], monster_list[j]);
		}

		// place random items
		for (j = 0; j < random_item_list.length; j += 1) {
			i += 1;
			level_result.level.setItemAt(locations[i], random_item_list[j]);
		}

		// exit portal
		if (depth < MAX_DEPTH) {
			var portal = new Terrain({family: lib.terrainFamily.portal, name: 'Elevator', code: 'CLOSE_ANGLE'});
			level_result.level.setTerrainAt(level_result.exit_xy, portal);
			level_result.level.setPortalAt(level_result.exit_xy, -1);
		} 
		
		// start portal
		if (parent_level !== undefined) {
			var portal = new Terrain({family: lib.terrainFamily.portal, name: 'Elevator', code: 'OPEN_ANGLE'});
			level_result.level.setTerrainAt(level_result.start_xy, portal);
			level_result.level.setPortalAt(level_result.start_xy, parent_level.id);
		} else {
			// first level
			var portal = new Terrain({family: lib.terrainFamily.portal, name: 'Fortress Exit', code: 'OPEN_ANGLE', color: colors.pink});
			level_result.level.setTerrainAt(level_result.start_xy, portal);
			level_result.level.setPortalAt(level_result.start_xy, -2);
		}
		
		return level_result;
	};
	
	var getLevelContentMarines = function ( ) {
	// returns content for a marine-themed level
	
		var guaranteed_item_list = [], monster_list = [];
		
		var M = 4 + Math.floor(Math.random()*1);
		for (var i = 0; i < M; i += 1) {
			monster_list.push(factory.monster.generateMarine(constants.rank.low));
		}
		monster_list.push(factory.monster.generateMarine(constants.rank.high));
		
		if (Math.random() < 0.5) { 
			monster_list.push(factory.monster.generateMarine(constants.rank.medium));
		}
		
		guaranteed_item_list.push(factory.item.generateMeleeWeapon());
		
		return {
			"guaranteed_items": guaranteed_item_list,
			"monsters": monster_list
		};
	};
	
	var getLevelContentMechs = function ( ) {
	// returns content for a mech-themed level
	
		var guaranteed_item_list = [], monster_list = [];
		
		var M = 4 + Math.floor(Math.random()*3);
		for (var i = 0; i < M; i += 1) {
			monster_list.push(factory.monster.generatePilot());
		}
		
		M = 1 + Math.floor(Math.random()*3);
		for (var i = 0; i < M; i += 1) {
			monster_list.push(factory.monster.generateMech());
		}
		
		M = 5 + Math.floor(Math.random()*3);
		for (var i = 0; i < M; i += 1) {
			guaranteed_item_list.push(factory.item.generateRocket());
		}
		
		return {
			"guaranteed_items": guaranteed_item_list,
			"monsters": monster_list
		};
	};
	
	var getLevelContentAssorted = function ( ) {
		var guaranteed_item_list = [], monster_list = [];
		
		monster_list.push(factory.monster.generateApe());
		monster_list.push(factory.monster.generateApe());
		monster_list.push(factory.monster.generateApe());
		monster_list.push(factory.monster.generateMarine(constants.rank.high));
		monster_list.push(factory.monster.generateMarine(constants.rank.high));
		monster_list.push(factory.monster.generateResistanceFighter());
		monster_list.push(factory.monster.generateResistanceFighter());
		
		M = 1 + Math.floor(Math.random()*3);
		for (var i = 0; i < M; i += 1) {
			var random_system = constants.system_list[Math.floor(Math.random()*constants.system_list.length)];
			guaranteed_item_list.push(factory.item.generateEnergyPod(random_system));
		}
		
		return {
			"guaranteed_items": guaranteed_item_list,
			"monsters": monster_list
		};
	};
	
	var createSecretLevel = function () {
		
		var x, y;
		var dungeon = new Level({'width': constants.game_tiles_width, 'height': constants.game_tiles_height});
		dungeon.depth = -1;
		
		for (x = 0; x < dungeon.width; x += 1) {
			for (y = 0; y < dungeon.height; y += 1) {
				if (Math.random() < 0.1) {
					dungeon.setTerrainAt({"x": x, "y": y}, factory.terrain.generateSupercomputer());
				} else {
					dungeon.setTerrainAt({"x": x, "y": y}, factory.terrain.generateScienceFloor());
				}
			}
		}
		
		locations = dungeon.getWalkableLocations().locations_xy;
		fisherYates(locations);
		i = 0;
		
		var messages = generateScience();
		for (var j = 0; j < messages.length; j += 1) {
			i += 1;
			dungeon.setItemAt(locations[i], messages[j]);
			dungeon.setMonsterAt({"x": locations[i].x, "y": locations[i].y - 1}, factory.monster.generateScientist());
		}
		
		my_player.description = 'Researcher';
		my_player.attack_radius = 0;
		my_player.laser_damage = 0;
		my_player.melee_damage = 0;
		my_player.sight_radius = 32;
		
		return {
			"level": dungeon,
			"start_xy": locations[i+1],
			"exit_xy": locations[i+2]
		};
	};
	
	var setCurrentLevel = function (dungeon, start_xy) {
		my_dungeon = dungeon;
		$('#id_iframe_gametracker').attr('src', 'gametracker.html?level='+dungeon.depth);

		my_dungeon.setMonsterAt(start_xy, my_player);
		my_level_discovery = my_player.getDiscoveryLevel(my_dungeon.id);
		
		// update pathfinding maps
		dijkstra_maps['to_player'] = createDijkstraMapToPlayer(my_dungeon, my_player);
		dijkstra_maps['from_player'] = createDijkstraMapFromPlayer(dijkstra_maps['to_player']);

		updateScreenOffset();
		updateFov(my_player);
		drawPlayerInfo();
		drawGame();
	};
	
	var doPlayerActivatePortal = function ( ) {
	
		var portal, existing_level, levelgen_result, player_xy = my_player.getLocation();
		level_id = my_dungeon.getPortalAt(player_xy);
		if (level_id === null) {
			addMessage("We do not see a lift here.");
			return;
			
		} else if (level_id === -1) {
			// make a new level
			levelgen_result = createLevel(my_dungeon.depth + 1, my_dungeon);
			my_dungeon.setPortalAt(player_xy, levelgen_result.level.id);
			setCurrentLevel(levelgen_result.level, levelgen_result.start_xy);
			
		} else if (level_id === -2) {
			if (my_player.inventory.hasItemOfFamily(lib.itemFamily.goal_item)) {
				youWinTheGame();
				return;
			} else {
			
				addMessage("We must return to this exit once we have", colors.red);
				addMessage("recovered the Y.E.N.D.O.R. AI Core.", colors.red);
			}
			
		} else if (level_id > -1) {
			// travel to a previously created level
			existing_level = my_levels[level_id];
			if (existing_level.level.depth < my_dungeon.depth) {
				// moving up
				setCurrentLevel(existing_level.level, existing_level.exit_xy);
			} else if (existing_level.level.depth > my_dungeon.depth) {
				// moving down
				setCurrentLevel(existing_level.level, existing_level.start_xy);
			} else {
				alert("error -- dungeons with equal depth");
			}
		}
	};
	
	////////////////////////////////////////////////////////////////////////////////  
	// GAME INIT
	////////////////////////////////////////////////////////////////////////////////

	var initGame = function (player_name) {
		var result, i, u, locations, item, mob, levelgen_result;

		my_player = factory.monster.generatePlayer({name: player_name, family: lib.monsterFamily.player, sight_radius: 15});
		levelgen_result = createLevel(1);
		//levelgen_result = createSecretLevel();

		// my_dungeon = levelgen_result.level;
		// my_dungeon.setMonsterAt(levelgen_result.start_xy, my_player);

		// updateScreenOffset();
		
		initSounds();
		
		addMessage("Welcome to RoboCaptain - Doomsday", colors.hf_blue);
		addMessage(my_version, colors.hf_blue);
		addMessage("http://heroicfisticuffs.blogspot.com/", colors.hf_blue);

		setCurrentLevel(levelgen_result.level, levelgen_result.start_xy);
		drawInventory();
	};

	var initSounds = function ( ) {
	// initialize our HTML5 sound thingo
	
		var category, i;
		
		my_sound_category = {
			"laser": 4,
			"melee": 4,
			"error": 2,
			"hurt": 3,
			"recharge": 4,
			"explosion": 1,
			"cloak_on": 3,
			"cloak_off": 1,
			"mech_online": 1
		};
		
		for (category in my_sound_category) {
			if (my_sound_category.hasOwnProperty(category)) {
				for (i = 0; i < my_sound_category[category]; i += 1) {
					my_sounds[category + '_' + i] = 'static/audio/' + category + '_' + i + '.wav';
				}
			}
		}

	};
	
	var addMessage = function (msg_text, color) {
		msg = new Message(msg_text, my_turn, color);
		my_msg_queue.push(msg);
		drawMessages();
	};
	
	var playRandomSound = function (sound_category) {
		var sound_name, num_sounds = my_sound_category[sound_category];
		// todo: figure out number of sounds for a category
		sound_name = sound_category + '_' + Math.floor(Math.random()*num_sounds);
		playSound(sound_name);
	};
	
	var playSound = function (sound_name) {
		if (my_play_sounds) {
			my_audio.src = my_sounds[sound_name];
			my_audio.play();
		}
	};

	var gameOver = function (cause) {
		$('#id_iframe_gametracker').attr('src', 'gametracker.html?event=death&level='+my_dungeon.depth);
		var x, y, grid_x, grid_y, max_y;
		var death_level = new Level({'width': constants.game_tiles_width, 'height': constants.game_tiles_height});
		var fore_color = colors.normal_fore, bg_color = colors.normal_bg;

		// prevents further keyboard input
		my_game_over = true;

		// prevents mouseovers messing up the pretty RIP tombstone
		my_grid.removeEventListeners();
		my_inv_grid.removeEventListeners();

		ctx_game.font = '20px Verdana';
		ctx_game.textBaseline = 'top';
		ctx_game.fillStyle = colors.grey_border;
		ctx_game.fillStyle = colors.white;
		ctx_game.fillText("Congratulations! You have died.", 0, constants.tile_dst_height);
		ctx_game.fillText("Press SPACE to start a new game.", 0, constants.tile_dst_height * 2);
	};
	
	var youWinTheGame = function (cause) {
		var secret_level = createSecretLevel();
		setCurrentLevel(secret_level.level, secret_level.start_xy);
		// var x, y, grid_x, grid_y, max_y;
		// var death_level = new Level({'width': constants.game_tiles_width, 'height': constants.game_tiles_height});
		// var fore_color = colors.normal_fore, bg_color = colors.normal_bg;

		// // prevents further keyboard input
		// my_game_over = true;

		// // prevents mouseovers messing up the pretty RIP tombstone
		// my_grid.removeEventListeners();
		// my_inv_grid.removeEventListeners();

		// ctx_game.font = '20px Verdana';
		// ctx_game.textBaseline = 'top';
		// ctx_game.fillStyle = colors.grey_border;
		// ctx_game.fillStyle = colors.white;
		// ctx_game.fillText("Congratulations! You won!", 0, constants.tile_dst_height);
		// ctx_game.fillText("Now we can destroy the remainder of the human race.", 0, constants.tile_dst_height * 2);
		// ctx_game.fillText("Press SPACE to start a new game.", 0, constants.tile_dst_height * 3);
	};

	var debugDijkstraMaps = function ( ) {
		if (my_debug_map === dijkstra_map_list.length) {
			my_debug_map = 0;
			drawGame();
		} else {
			var dm = dijkstra_maps[dijkstra_map_list[my_debug_map]];
			var max_dm_val = 0, min_dm_val = MAX_INT, map_val;
			
			// figure out the highest non-blocked value on this map
			for (var e in dm) {
				if (dm.hasOwnProperty(e)) {
					map_val = dm[e];
					if (map_val === MAX_INT) { continue; }
					max_dm_val = Math.max(max_dm_val, map_val);
					min_dm_val = Math.min(min_dm_val, map_val);
				}
			}
			
			// draw a representation of the map up in here
			for (var x = 0; x < my_dungeon.width; x += 1) {
				for (var y = 0; y < my_dungeon.height; y += 1) {
					map_val = dm[x+'+'+y];
					if (map_val === MAX_INT) { continue; }
					if (map_val < 0) {
						c = Math.round(255 * (map_val / min_dm_val), 0);
					} else {
						c = Math.round(255 * (1 - (map_val / max_dm_val)), 0);
					}
					
					ctx_game.clearRect(x * constants.tile_dst_width, y * constants.tile_dst_height, constants.tile_dst_width, constants.tile_dst_height);

					// fill destination canvas with BG color
					ctx_game.fillStyle = 'rgb(' + c + ', 0, 0)'
					ctx_game.fillRect(x * constants.tile_dst_width, y * constants.tile_dst_height, constants.tile_dst_width, constants.tile_dst_height);
				}
			}
			
			my_debug_map += 1;		
		}
	};
	
	////////////////////////////////////////////////////////////////////////////////  
	// PUBLIC FUNCTIONS
	////////////////////////////////////////////////////////////////////////////////

	that.init = function (player_name) {
	// initalize canvas elements and load game elements
		
		player_name = player_name || 'RoboCaptain';
		my_game_over = false;

		// main canvas display -- game grid
		var canvas = $('#id_cnv_game').get()[0];
		my_grid = gridmangler(canvas, constants.tile_dst_width, constants.tile_dst_height);
		ctx_game = canvas.getContext("2d");

		// backup/copy canvas for transparent PNG color conversion
		cnv_copy = document.createElement('canvas');
		cnv_copy.width = constants.tile_dst_width;
		cnv_copy.height = constants.tile_dst_height;
		ctx_copy = cnv_copy.getContext("2d");

		// tiles image
		var tiles_img = $("img[src$='"+constants.tiles_image+"']").get()[0];
		my_tiles = eyeofthetiler(tiles_img, constants.tile_src_width, constants.tile_src_height);

		// game grid -- events triggered by gridmangler
		my_grid.addGridEvent("mousedown", doEventMousedown);
		my_grid.addGridEvent("gainfocus", doEventGainFocus);
		my_grid.addGridEvent("leavefocus", doEventLeaveFocus);

		// inventory grid box
		var cnv_inventory = $('#id_cnv_inventory').get()[0];
		ctx_inventory = cnv_inventory.getContext("2d");
		my_inv_grid = gridmangler(cnv_inventory, constants.inventory_tile_dst_width, constants.inventory_tile_dst_height);
		my_inv_grid.addGridEvent("mousedown", doInventoryEventMousedown);
		my_inv_grid.addGridEvent("gainfocus", doInventoryEventGainFocus);
		my_inv_grid.addGridEvent("leavefocus", doInventoryEventLeaveFocus);

		// player info
		var cnv_playerinfo = $('#id_cnv_playerinfo').get()[0];
		ctx_playerinfo = cnv_playerinfo.getContext("2d");
		//ctx_playerinfo.fillStyle = colors.normal_bg;
		//ctx_playerinfo.fillRect(0, 0, constants.playerinfo_width, constants.playerinfo_height);

		// hover info
		var cnv_hoverinfo = $('#id_cnv_hoverinfo').get()[0];
		ctx_hoverinfo = cnv_hoverinfo.getContext("2d");
		//ctx_hoverinfo.fillStyle = colors.normal_bg;
		//ctx_hoverinfo.fillRect(0, 0, constants.hoverinfo_width, constants.hoverinfo_height);

		// container floater
		var cnv_container = $('#id_cnv_container').get()[0];
		ctx_container = cnv_container.getContext("2d");
		my_container_grid = gridmangler(cnv_container, constants.inventory_tile_dst_width , constants.inventory_tile_dst_height);
		my_container_grid.addGridEvent("mousedown", doContainerEventMousedown);
		my_container_grid.addGridEvent("gainfocus", doContainerEventGainFocus);
		my_container_grid.addGridEvent("leavefocus", doContainerEventLeaveFocus);
		
		// message queue
		var cnv_messages = $('#id_cnv_messages').get()[0];
		ctx_messages = cnv_messages.getContext("2d");

		// pop-up message floater
		var cnv_text_message = $('#id_cnv_text_message').get()[0];
		ctx_text_message = cnv_text_message.getContext("2d");
		
		initGame(player_name);
	};

	// keyboard
	////////////////////////////////////////////////////////////////////////////////
	that.keypress = function (e) {
		var offset_xy;

		if (my_game_over) {
			if (e.keyCode === 32) {
				// immediately restart a new game!
				var old_name = my_player.getName();
				this.init(old_name);
			}
			return;
		};

		if (my_debug_map !== 0) {
			if (e.keyCode === 81) {
				debugDijkstraMaps();
			}
			return;
		};
		
		if (!my_dialog_is_open) {
			
			if (e.keyCode === 65) { // APPLY: a
				doPlayerApply();
				
			// LEFT: left arrow + h + NUMPAD 4
			} else if ($.inArray(e.keyCode, [37, 72, 100]) !== -1) {
				offset_xy = {x: -1, y: 0};
				doPlayerMove(offset_xy);

			// RIGHT: right arrow + l + NUMPAD 6
			} else if ($.inArray(e.keyCode, [39, 76, 102]) !== -1) {
				offset_xy = {x: 1, y: 0};
				doPlayerMove(offset_xy);

			// UP: up arrow + k + NUMPAD 8
			} else if ($.inArray(e.keyCode, [38, 75, 104]) !== -1) {
				offset_xy = {x: 0, y: -1};
				doPlayerMove(offset_xy);

			// DOWN: down arrow + j + NUMPAD 2
			} else if ($.inArray(e.keyCode, [40, 74, 98]) !== -1) {
				offset_xy = {x: 0, y: 1};
				doPlayerMove(offset_xy);

			// UP-LEFT: home + y + NUMPAD 4
			} else if ($.inArray(e.keyCode, [36, 89, 103]) !== -1) {
				offset_xy = {x: -1, y: -1};
				doPlayerMove(offset_xy);

			// DOWN-LEFT: end + b + NUMPAD 1
			} else if ($.inArray(e.keyCode, [35, 66, 97]) !== -1) {
				offset_xy = {x: -1, y: 1};
				doPlayerMove(offset_xy);

			// UP-RIGHT: pgup + u + NUMPAD 9
			} else if ($.inArray(e.keyCode, [33, 85, 105]) !== -1) {
				offset_xy = {x: 1, y: -1};
				doPlayerMove(offset_xy);
				
			// DOWN-RIGHT: pgdn + n + NUMPAD 3
			} else if ($.inArray(e.keyCode, [34, 78, 99]) !== -1) {
				offset_xy = {x: 1, y: 1};
				doPlayerMove(offset_xy);

			// DO ACTION: space, PERIOD, NUMPAD 0, INSERT
			} else if ($.inArray(e.keyCode, [32, 190, 101, 96, 45]) !== -1) {
				doPlayerAction();

			} else if (e.shiftKey && e.keyCode === 71) { // G
				doPlayerInvulnerableDebug();
			} else if (e.keyCode === 71) { // g
				doPlayerCycleFireTarget();

			} else if (e.keyCode === 68) { // d
				doPlayerKeyboardDrop();

			} else if (e.keyCode === 70) { // f
				doPlayerFire();

			} else if (e.keyCode === 81) { // q
				debugDijkstraMaps();

			} else if (e.keyCode === 67) { // c
				doPlayerToggleCloak();
				
			} else if ((e.keyCode === 190) || (e.keyCode === 188)) { // >
				doPlayerActivatePortal();
			} else if (e.keyCode === 88) { // x
				doPlayerCycleSystem(1);				
			} else if (e.keyCode === 90) { // z
				doPlayerCycleSystem(-1);				
			}


		} else {
			if ($.inArray(e.keyCode, [32, 190, 101]) !== -1) {
				// space
				doPlayerAction();
			} else if (e.keyCode >= 49 && e.keyCode <=56) {
				if (my_open_dialog === 'drop') {
					doPlayerKeyboardDropItem(e.keyCode);
				} else if (my_open_dialog === 'apply') {
					doPlayerApplyItem(e.keyCode);
				}
			}
		}
	};

	that.handleMousewheelEvent = function (event, delta) {
	// handle the mousewheel ONLY over the game window
		
		//delta = event.originalEvent.wheelDelta;
		var dir = (delta < 0) ? 1 : -1;
		doPlayerCycleSystem(dir);
	};
	
	that.playerChangeName = function (new_name) {
	// can be called from the top of the game window

		my_player.setName(new_name);
		drawPlayerInfo();
	};

	that.toggleSound = function ( ) {
	// user can turn all sound on or off
	
		if (my_play_sounds) {
			my_play_sounds = false;
			$('#id_cmd_sound').html('Enable Sound');
		} else {
			my_play_sounds = true;
			$('#id_cmd_sound').html('Disable Sound');
		}
		
	};
	
	that.getVersion = function ( ) {
		return my_version;
	};

	return that;
};
