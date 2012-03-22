//var connected_lst = [];

var level_generator = function ( ) {
    var that = {};
    var FILL_PROB=0.40;
    
    // private 
	var flood_fill_fn = function (xy, max_x, max_y, walkable_key_lst, connected_lst) {
	// Fills a walkable_lst in-params by recursively crawling the tiles
		var new_xy;
		var key = xy.x + "+" + xy.y;
		var offset_lst = [], i, new_x, new_y, new_xy;
		
		// stop condition: out of bounds
		if (xy.x < 0 || xy.y < 0 || xy.x >= max_x || xy.y >= max_y) {
			return;
		}
		 
		// stop condition: we've been here before
		if ($.inArray(key, connected_lst) !== -1) {
		//if (connected_lst.indexOf(xy) !== -1) {
			return;
		}
		
		// stop condition: area is not walkable
		//if (walkable_lst.indexOf(xy) === -1) {
		if ($.inArray(key, walkable_key_lst) === -1) {
			return;
		}
		 
		// we got here so add it to the connected group
		connected_lst.push(key);
		
		// find all valid neighbors
		// removing DIAGONAL
		offset_lst = [
			{"x": 0, "y": 1},
			{"x": -1, "y": 0},
			{"x": 1, "y": 0},
			{"y": 0, "x": -1}
		];
		
		for (i = 0; i < offset_lst.length; i += 1) {
			new_x = xy.x + offset_lst[i].x;
			new_y = xy.y + offset_lst[i].y;
			new_xy = {"x": new_x, "y": new_y};
			flood_fill_fn(new_xy, max_x, max_y, walkable_key_lst, connected_lst);
		}
	};
	
    var doFillLevelRandomly = function (lvl) {
        var x, y, u;
		var top_xy, bottom_xy, right_xy, left_xy;
		
        for (x = -1; x < lvl.width + 1; x+= 1) {
            for (y  = -1; y < lvl.height + 1; y += 1) {
                xy = {"x": x, "y": y};
                u = Math.random();
                if (u <= FILL_PROB) {
                    lvl.setTerrainAt(xy, factory.terrain.generateWall(), true);
                } else {
                    lvl.setTerrainAt(xy, factory.terrain.generateFloor(), true);
                }
            }
        }
        
        for (x = -1; x < lvl.width + 1; x += 1) {
            for (y = -1; y < lvl.height + 1; y += 1) {
                xy = {"x": x, "y": y};
                u = Math.random();
                if (u <= FILL_PROB) {
                    lvl.setTerrainAt(xy, factory.terrain.generateWall(), true);
                } else {
                    lvl.setTerrainAt(xy, factory.terrain.generateFloor(), true);
                }
            }
        }
        
        return true;
    };
	
    var getSurroundingTerrainTypes = function (xy_loc, lvl, match_type) {
    // grab a list of all surrounding coordinates
        var offset_tiles = [
			{"x": -1, "y": -1}, {"x": -1, "y": 0},
			{"x": -1, "y": 1}, {"x": 0, "y": -1},
			{"x": 0, "y": 1}, {"x": 1, "y": -1}, 
			{"x": 1, "y": 0}, {"x": 1, "y": 1}
		];
		
		var i, terrain, xy;
        
        // keep track of all neighbors that match our specified terrain type
        var matching_xy_lst = [];
        
        for (i = 0; i < offset_tiles.length; i += 1) {
			xy = {"x": xy_loc.x + offset_tiles[i].x, "y": xy_loc.y + offset_tiles[i].y};
			
			//skip "out of bounds"
			// if (lvl.isValidCoordinate(xy) === false) {
				// continue;
			// }

			terrain = lvl.getTerrainAt(xy);
			if (terrain === null) {
				;
			}
            if (isTerrainOfFamily(terrain, match_type) === true) {
                matching_xy_lst.push(xy);
			}
		}
        
        return matching_xy_lst;
    };
    
    var doRunCaveAlgorithm = function (lvl) {
    // does 1 pass of the cave gen algorithm
        var terrain, xy_loc, x, y, wall_count, i;
        var match_lst = [];
        // keep track of changes to do AFTER we have a first pass of the algorithm
        var wall_updates_lst = [];
        var floor_updates_lst = [];
        
        for (x = 0; x < lvl.width; x += 1) {
            for (y = 0; y < lvl.height; y += 1) {
                xy_loc = {"x": x, "y": y};
                terrain = lvl.getTerrainAt(xy_loc);
                
                // figure out how many surrounding neighbors are WALLS
                match_lst = getSurroundingTerrainTypes(xy_loc, lvl, lib.terrainFamily.wall);
                wall_count = match_lst.length;
                
                if (isTerrainOfFamily(terrain, lib.terrainFamily.floor) === true) {
                    if (wall_count >= 5) {
                        wall_updates_lst.push(xy_loc)
                    }
                } else if (wall_count < 4) {
                    floor_updates_lst.push(xy_loc)
                }
            }
        }
        
        // go through our updates and apply them after we're done with a complete pass!!
        for (i = 0; i < wall_updates_lst.length; i += 1) {
            lvl.setTerrainAt(wall_updates_lst[i], factory.terrain.generateWall());
        }
        
        for (i = 0; i < floor_updates_lst.length; i += 1) {
            lvl.setTerrainAt(floor_updates_lst[i], factory.terrain.generateFloor());
        }
        
        return true;
    };
    
    var doGenerateCave = function (dungeon, N) {
        var x;
        
        for (x = 0; x < N; x += 1) {
            doRunCaveAlgorithm(dungeon);
        }
    };
    
    var checkForConnectedness = function (lvl) {
		var is_connected = true;
	
		// first get a list of all walkable tiles in this level
		var walkable = lvl.getWalkableLocations();
		var walkable_xy_lst = walkable.locations_xy;
		var walkable_key_lst = walkable.locations_key;
		
		// now start at the first walking square and flood fill
		var connected_lst = [];
		var start_xy = walkable_xy_lst[0];
		flood_fill_fn(start_xy, lvl.width, lvl.height, walkable_key_lst, connected_lst);
		
		// if we didn't flood fill to all walkable points we have some disconnected areas
		if (walkable_xy_lst.length !== connected_lst.length) {
			is_connected = false;
		}
		
		// pick a better start location
		var start_idx = Math.floor(Math.random()*walkable_xy_lst.length);
		start_xy = walkable_xy_lst[start_idx];
		// take it out and..
		walkable_xy_lst.splice(start_idx, 1);
		// pick a random exit location
		var exit_xy = walkable_xy_lst[Math.floor(Math.random()*walkable_xy_lst.length)];
		
		return {
			"is_connected": is_connected, 
			"start_xy": start_xy,
			"exit_xy": exit_xy
		};
	};
	
    // public
    that.createRandomCaveLevel = function (width, height) {
        // return a (mostly) connected random cave level
        var attempt = 1, N;
        var result, dungeon, start_xy, exit_xy;
        
        while (1 === 1) {
            dungeon = new Level({'width': width, 'height': height});
            doFillLevelRandomly(dungeon);
			N = Math.floor(Math.random()*2) + 1;
            doGenerateCave(dungeon, N);
            result = checkForConnectedness(dungeon);
			
            start_xy = result.start_xy;
			exit_xy = result.exit_xy;
			
			// check passing criteria
            if (result.is_connected === true) {
                break;
            }
            
            attempt += 1;
			// if (attempt > 100) {
				// alert("over 100 attemps creating a connected level, watch out");
				// break;
			// }
		}
		//alert("attempts: " + attempt);
		
        return {
			"level": dungeon, 
			"start_xy": start_xy,
			"exit_xy": exit_xy
		};
    };
    
    return that;
};