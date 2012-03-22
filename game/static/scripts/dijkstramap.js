// Thanks to Brian Walker aka Pender 
// http://roguebasin.roguelikedevelopment.org/index.php/The_Incredible_Power_of_Dijkstra_Maps

var initDijkstraMap = function (dungeon) {
// returns an [x+y] map using the current level's width x height, filled with MAX_INT
	var dijkstra_map = {};

	// set all points on the map to HIGH_INT
	for (var x = -1; x < dungeon.width; x += 1) {
		for (var y = -1; y < dungeon.height; y += 1) {
			dijkstra_map[x+'+'+y] = MAX_INT;
		}
	}
	
	return dijkstra_map;
};

var solveDijkstraMap = function (dijkstra_map, passable_lst) {
	
	var neighbor_lst, neighbor_val, i, n, len, len2, made_changes;
	
	len = passable_lst.length;
	made_changes = true;
	
	while (made_changes) {
		made_changes = false;
		
		for (i = 0; i < len; i += 1) {
			neighbor_lst = getSurroundingTiles(keyXY(passable_lst[i]));
			neighbor_val = MAX_INT;
			
			len2 = neighbor_lst.length;
			for (n = 0; n < len2; n += 1) {
				// if (!dungeon.isValidCoordinate(neighbor_lst[n])) { 
					// continue; 
				// }
				neighbor_val = Math.min(neighbor_val, dijkstra_map[xyKey(neighbor_lst[n])]);
				
				if ((dijkstra_map[passable_lst[i]] - neighbor_val) >= 2) {
					dijkstra_map[passable_lst[i]] = neighbor_val + 1;
					made_changes = true;
				}
			}
		}
	}
	
	return dijkstra_map;
};

var createDijkstraMapToPlayer = function (dungeon, target) {
// returns an [x+y] keyed object with (int) values representing a dijkstra map

	var dijkstra_map = initDijkstraMap(dungeon);
	var passable_lst, monster_lst, idx, i;

	// the target is our goal point (0)
	dijkstra_map[xyKey(target.getLocation())] = 0;
	
	// iterate through our passable locations
	passable_lst = dungeon.getWalkableLocations().locations_key;
	
	// remove unmoving monsters from this list of passable terrain (treat them as obstacles)
	monster_lst = dungeon.getMonsters();
	for (i = 0; i < monster_lst.length; i += 1) {
		if ((monster_lst[i].hasFlag(flags.stand_still)) || monster_lst[i].hasFlag(flags.immobile)) {
			idx = passable_lst.indexOf(xyKey(monster_lst[i].getLocation()));
			if (idx !== -1) {
				passable_lst.splice(idx, 1);
			}
		}
	}
	
	return solveDijkstraMap(dijkstra_map, passable_lst);
};

var createDijkstraMapFromPlayer = function (to_map) {
// returns an [x+y] keyed object with (int) values representing a dijkstra map

	//var to_map = createDijkstraMapToPlayer(dungeon, target);
	var from_map = {}, map_val;
	
	// multiply every value in this map by a negative coefficient
	for (var e in to_map) {
		if (to_map.hasOwnProperty(e)) {
			map_val = to_map[e];
			if (map_val === MAX_INT) { 
				from_map[e] = map_val;
			} else {
				from_map[e] = map_val * -1.2;
			}
		}
	}
	
	return from_map;
};

var createDijkstraMapToMechs = function (dungeon) {
// returns an [x+y] keyed object with (int) values representing a dijkstra map

	var dijkstra_map = initDijkstraMap(dungeon);
	var passable_lst, monster_lst, idx, i;

	// iterate through our passable locations
	passable_lst = dungeon.getWalkableLocations().locations_key;
	
	monster_lst = dungeon.getMonsters();
	for (i = 0; i < monster_lst.length; i += 1) {
	
		if ((monster_lst[i].hasFlag(flags.is_vehicle)) && (monster_lst[i].hasFlag(flags.immobile))) {
			// the target is our goal point (0)
			dijkstra_map[xyKey(monster_lst[i].getLocation())] = 0;
			
		} else if ((monster_lst[i].hasFlag(flags.stand_still)) || monster_lst[i].hasFlag(flags.immobile)) {
			// remove unmoving monsters from this list of passable terrain (treat them as obstacles)
			idx = passable_lst.indexOf(xyKey(monster_lst[i].getLocation()));
			if (idx !== -1) {
				passable_lst.splice(idx, 1);
			}
		}
	}
	
	return solveDijkstraMap(dijkstra_map, passable_lst);
};

var getDownhillNeighbor = function (dijkstra_map, location_xy) {
	var neighbor_lst = getSurroundingTiles(location_xy);
	var lowest_value = MAX_INT;
	var lowest_xy = location_xy;
	var temp_value;
	var lowest_value = dijkstra_map[xyKey(location_xy)];
	
	for (var n = 0; n < neighbor_lst.length; n += 1) {
		temp_value = dijkstra_map[xyKey(neighbor_lst[n])];
		if (temp_value < lowest_value) {
			lowest_value = temp_value;
			lowest_xy = neighbor_lst[n];
		}
	}
	
	// if (compareCoords(lowest_xy, location_xy)) {
		// alert("alert! no lower value neighbors");
	// }
	return lowest_xy;
};