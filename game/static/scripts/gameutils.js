Number.prototype.mod = function(n) {
	// http://javascript.about.com/od/problemsolving/a/modulobug.htm
	return ((this%n)+n)%n;
};

var dist2d = function (x1, y1, x2, y2) {
	var xdiff, ydiff;
	xdiff = (x1 - x2);
	ydiff = (y1 - y2);
	return Math.sqrt(xdiff*xdiff + ydiff*ydiff);
};

var fisherYates = function ( myArray ) {
	var i = myArray.length;
	if ( i == 0 ) return false;
	while ( --i ) {
		var j = Math.floor( Math.random() * ( i + 1 ) );
		var tempi = myArray[i];
		var tempj = myArray[j];
		myArray[i] = tempj;
		myArray[j] = tempi;
	}
};

var getLineBetweenPoints = function (start_xy, end_xy) {
    // Digital Differential Analyzer
    // http://www.cs.unc.edu/~mcmillan/comp136/Lecture6/Lines.html
    var x0, y0, x1, y1, dx, dy, t, m, points_lst = [];
    
    x0 = start_xy.x;
    y0 = start_xy.y;
    x1 = end_xy.x;
    y1 = end_xy.y;
        
    dy = y1 - y0;
    dx = x1 - x0;
    t = 0.5;
    
    points_lst.push({x: x0, y: y0});
    
    if (x0 === x1 && y0 === y1) {
        return points_lst;
    }
    
    if (Math.abs(dx) > Math.abs(dy)) {
        m = dy / (1.0 * dx);
        t += y0;
        dx = (dx < 0) ? -1 : 1;//-1 if dx < 0 else 1
        m *= dx;
        
        while (x0 !== x1) {
            x0 += dx;
            t += m;
            points_lst.push({x: x0, y: Math.floor(t)}); //Coordinates(x0, int(t)))
        }
		
    } else {
        m = dx / (1.0 * dy);
        t += x0;
        dy = (dy < 0) ? -1 : 1;//-1 if dy < 0 else 1
        m *= dy;
        
        while (y0 !== y1) {
            y0 += dy;
            t += m;
            points_lst.push({x: Math.floor(t), y: y0});//Coordinates(int(t), y0))
        }
    }
    
    return points_lst;
};
    
var constants = {
	tile_src_width: 12,
	tile_src_height: 16,
	tiles_image: 'static/images/terminalf_transparent_2.png',

	tile_dst_width: 18,
	tile_dst_height: 24,

	game_tiles_width: 32,
	game_tiles_height: 16,

	level_width: 32,
	level_height: 16,

	inventory_tiles_width: 8,
	inventory_tiles_height: 1,
	inventory_max_items: 8,
	inventory_tile_dst_width: 0,
	inventory_tile_dst_height: 0,

	equip: {
		projectile: 'projectile0',
		melee: 'melee1'
	},

	system: {
		power: 'Power',
		shield: 'Shield',
		laser: 'Lasers',
		engine: 'Engines',
		cloak: 'Cloak'
	},
	
	splatter: {
		blood: 'blood',
		scorch: 'scorch'
	},
	
	playerinfo_width: 192,
	playerinfo_height: 192,

	container_tiles_width: 8,
	container_tiles_height: 1,
	container_max_items: 8,
	
	rank: {
		low: "low_rank",
		medium: "medium_rank",
		high: "high_rank",
		hero: "hero_rank"
	},
	
	cost: {
		activate_cloak: 5,
		cloak_per_turn: 2,
		shoot_laser: 2
	},
	
	discovery_benefit: 3
};

constants.system_list = [constants.system.power, constants.system.shield, constants.system.cloak, constants.system.laser];

var getSystemColor = function (system) {
	if (system === constants.system.power) { return colors.power; }
	else if (system === constants.system.laser) { return colors.laser; }
	else if (system === constants.system.shield) { return colors.shield; }
	else if (system === constants.system.engine) { return colors.engine; }
	else if (system === constants.system.cloak) { return colors.cloak; }
	else {
		alert("invalid system");
	}
};

var colors = {
  normal_fore: 'rgb(255, 255, 255)',
  normal_bg: 'rgb(50, 50, 50)',
  hf_blue: '#0082FF',
  hf_orange: '#FF7E00',
  hf_grey: '#d8d6c9',
  red: 'rgb(255, 0, 0)',
  white: 'rgb(255, 255, 255)',
  pink: '#FF1493',
  steel: '#B0C4DE',
  maroon: '#800000',
  yellow: 'rgb(255, 255, 0)',
  memory: 'rgb(88, 88, 88)',
  transparent: 'transparency',
  blood: 'rgb(165, 0, 0)',
  grey: 'rgb(125, 125, 125)',
  grey_border: '#cbcbcb',
  green: 'rgb(0, 255, 0)',
  black: 'rgb(0, 0, 0)',
  cyan: '#00CDCD',
  equipped_inventory_bg: '#677485',
  charcoal: '#222222',
  purple: '#7D26CD',
  msg_row: ['rgb(110, 110, 110)', 'rgb(150, 150, 150)', 'rgb(255, 255, 255)']
};

colors.power = colors.cyan;
colors.laser = colors.green;
colors.shield = colors.hf_blue;
colors.engine = colors.yellow;
colors.cloak = colors.yellow;

var flags = {
  immobile: 'immobile',
  explodes: 'explodes',
  keeps_distance: 'keeps distance',
  was_hit: 'hit last round',
  is_invisible: 'invisible',
  is_invulnerable: 'invulnerable to damage',
  stand_still: 'no move last turn',
  is_pilot: 'is a pilot',
  is_vehicle: 'is a vehicle'
};

var surrounding_cache = {};

var getSurroundingTiles = function (grid_xy, b_include_center) {

	var cached_result = surrounding_cache[xyKey(grid_xy)];
	if (cached_result) {
		return cached_result;
	}
	
	var offset_tiles = [
		{"x": -1, "y": -1}, {"x": -1, "y": 0},
		{"x": -1, "y": 1}, {"x": 0, "y": -1},
		{"x": 0, "y": 1}, {"x": 1, "y": -1}, 
		{"x": 1, "y": 0}, {"x": 1, "y": 1}
	];
			
	if (b_include_center === true) {
		offset_tiles.push({"x": 0, "y": 0});
	}
		
	var new_grids = [];
	var new_xy;
	for (var i = 0; i < offset_tiles.length; i += 1) {
	    new_xy = {"x": parseInt(grid_xy.x) + offset_tiles[i].x, "y": parseInt(grid_xy.y) + offset_tiles[i].y};
		//if (new_xy.x < 0 || new_xy.y < 0) { continue; }
	    new_grids.push(new_xy);
	}
	
	surrounding_cache[xyKey(grid_xy)] = new_grids;
	return new_grids;
};

MAX_INT = Math.pow(2, 53);

var BoxMullerTransform = function () {
// return a standard-normal variable based on 2 uniformly distributed variables
	
	var u1, u2, z1, z2, p;
	
	u1 = Math.random();
	u2 = Math.random();
	
	p = Math.sqrt(-2 * Math.log(u1));
	
	z1 = p * Math.cos(2 * Math.PI * u2);
	z2 = p * Math.sin(2 * Math.PI * u2);
	
	return (Math.random() < 0.5) ? z1 : z2;
};

var getRandomNormal = function (mu, sigma) {
	return mu + (BoxMullerTransform() * sigma);
};

var convertToColorCode = function (decimal) {
	return Math.max(0, Math.min(255, Math.floor(decimal)));
};

var getVariantColor = function (r, g, b, stdev_r, stdev_g, stdev_b) {
	return [
		convertToColorCode(getRandomNormal(r, stdev_r)),
		convertToColorCode(getRandomNormal(g, stdev_g)),
		convertToColorCode(getRandomNormal(b, stdev_b))
	];
};

var getSingleVariantColor = function (color_value, stdev) {
	var x = convertToColorCode(getRandomNormal(color_value, stdev));
	return [x, x, x];
};

var createColorFromArray = function (new_rgb) {
	return 'rgb(' + new_rgb[0] + ',' + new_rgb[1] + ',' + new_rgb[2] + ')';
};

MAX_DEPTH = 7;