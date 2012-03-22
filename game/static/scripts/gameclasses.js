var idGenerator = (function ( ) {
    var counter = Math.floor(Math.random() * 1000000);
    
    return {
        new_id: function ( ) {
            counter += 1;
            return counter;
        }
    }
})();

/*****************************************************************************
 COMPARE FUNCTIONS
*****************************************************************************/

var compareCoords = function (grid1_xy, grid2_xy) {
    return grid1_xy.x === grid2_xy.x && grid1_xy.y === grid2_xy.y;
};

var compareTerrain = function (t1, t2) {
    return t1.getFamily().getName() === t2.getFamily().getName();
};

var isTerrainOfFamily = function (t1, f2) {
	return t1.getFamily().getName() === f2.getName();
};

var compareItemToFamily = function (i1, f2) {
    return compareItemFamily(i1.getFamily(), f2);
};

var compareItemFamily = function (f1, f2) {
    return f1.getName() === f2.getName();
};

var compareMonsterToFamily = function (m1, f2) {
    return compareMonsterFamily(m1.getFamily(), f2);
};

var compareMonsterFamily = function (f1, f2) {
    return f1.getName() === f2.getName();
};

var compareThing = function (th1, th2) {
	return th1.id === th2.id;
};

//var cache_xykey = {};
var xyKey = function (grid_xy) {
	//cached_value = cache_xykey[grid_xy];
	// if (cached_value) {
		// return cached_value;
	// } else {
		// //cache_xykey[grid_xy] = grid_xy.x + "+" + grid_xy.y;
		// return grid_xy.x + "+" + grid_xy.y;
	// }
	return grid_xy.x + "+" + grid_xy.y;
};

var keyXY = function (key) {
    var arr = key.split("+");
    return {"x": arr[0], "y": arr[1]};
};

/*****************************************************************************
 THING - Base Object Prototype
*****************************************************************************/

function Thing() {
	this.id = idGenerator.new_id();
	this.flags = [];
};
Thing.prototype.getName = function ( ) { return this.name; };
Thing.prototype.getObjectType = function ( ) { return this.objtype; };
Thing.prototype.getCode = function ( ) { return this.code; };
Thing.prototype.getColor = function ( ) { return this.color; };
Thing.prototype.setColor = function (new_color) { 
	this.color = new_color;
	return true;
};
Thing.prototype.getBackgroundColor = function ( ) { return this.bg_color; };
Thing.prototype.getFlags = function ( ) { return this.flags; };
Thing.prototype.addFlag = function (flag) {
	this.flags.push(flag);
	return true;
};

Thing.prototype.removeFlag = function (flag) {
	var index = $.inArray(flag, this.flags);
	if (index > -1) {
		this.flags.splice(index, 1);
	}
	return true;
};

Thing.prototype.hasFlag = function (flag) {
	var index = $.inArray(flag, this.flags);
	return index > -1;
};

/*****************************************************************************
 TERRAIN FAMILY
*****************************************************************************/

function TerrainFamily(spec) {
    Thing.call(this);
	this.objtype = 'terrain_family';
    this.name = spec.name;
    this.code = spec.code || 'SPACE';
	// this.color_stdev = spec.color_stdev || [0, 0, 0];
	// this.bg_color_stdev = spec.bg_color_stdev || [0, 0, 0];
	
    if (spec.color === undefined) {
        this.color = colors.normal_fore;
    } else {
        this.color = spec.color;
    }
	
    if (spec.bg_color === undefined) {
        this.bg_color = colors.normal_bg;
    } else {
        this.bg_color = spec.bg_color;
    }
	
	if (spec.is_walkable === undefined) {
        this.is_walkable = true;
    } else {
        this.is_walkable = spec.is_walkable;
    }

    if (spec.is_opaque === undefined) {
        this.is_opaque = false;
    } else {
        this.is_opaque = spec.is_opaque;
    }
};
TerrainFamily.prototype = new Thing();
TerrainFamily.prototype.constructor = TerrainFamily;
TerrainFamily.prototype.isWalkable = function ( ) { return this.is_walkable; };
TerrainFamily.prototype.isOpaque = function ( ) { return this.is_opaque; };

/*****************************************************************************
 TERRAIN 
*****************************************************************************/

function Terrain(spec) {
	Thing.call(this);
	this.objtype = 'terrain';
    this.name = spec.name;
	this.family = spec.family;
    this.code = spec.code || this.family.code;
    this.color = spec.color || this.family.color;
    this.bg_color = spec.bg_color || this.family.bg_color;
};
Terrain.prototype = new Thing();
Terrain.prototype.constructor = Terrain;
Terrain.prototype.isWalkable = function ( ) { return this.family.is_walkable; };
Terrain.prototype.isOpaque = function ( ) { return this.family.is_opaque; };
Terrain.prototype.getFamily = function ( ) { return this.family; };

/*****************************************************************************
 FEATURE 
*****************************************************************************/

function Feature(spec) {
    Thing.call(this);
	this.objtype = 'features';
    this.name = spec.name;
    this.code = spec.code || 'NONE';
    this.color = spec.color || colors.transparent;
    this.bg_color = spec.bg_color || colors.transparent;
    
    //if (spec.is_walkable === undefined) {
        //this.is_walkable = true;
    //} else {
        //this.is_walkable = spec.is_walkable;
    //}

    //if (spec.is_opaque === undefined) {
        //this.is_opaque = false;
    //} else {
        //this.is_opaque = spec.is_opaque;
    //}
};
Feature.prototype = new Thing();
Feature.prototype.constructor = Feature;
//Feature.prototype.isWalkable = function ( ) { return this.is_walkable; };
//Feature.prototype.isOpaque = function ( ) { return this.is_opaque; };

/*****************************************************************************
 ITEM FAMILY
*****************************************************************************/

function ItemFamily(spec) {
    Thing.call(this);
	this.objtype = 'item_family';
    this.name = spec.name;
    this.code = spec.code || 'SPACE';
    if (spec.color === undefined) {
        this.color = colors.normal_fore;
    } else {
        this.color = spec.color;
    }
	
	this.is_container = spec.is_container || false;
	this.ranged_damage = spec.ranged_damage || 0;
	this.attack_radius = spec.attack_radius || 0;
	this.melee_damage = spec.melee_damage || 0;
};
ItemFamily.prototype = new Thing();
ItemFamily.prototype.constructor = ItemFamily;

/*****************************************************************************
 ITEM 
*****************************************************************************/

function Item(spec) {
    Thing.call(this);
	this.objtype = 'item';
    this.name = spec.name;
    this.family = spec.family;
    
    if (spec.color === undefined) {
        this.color = this.family.getColor();
    } else {
        this.color = spec.color;
    }
    
    if (spec.bg_color === undefined) {
        this.bg_color = this.family.getBackgroundColor();
    } else {
        this.bg_color = spec.bg_color;
    }

    if (spec.code === undefined) {
        this.code = this.family.getCode();
    } else {
        this.code = spec.code;
    }
	
	this.ranged_damage = spec.ranged_damage || this.family.ranged_damage;
	this.attack_radius = spec.attack_radius || this.family.attack_radius;
	this.melee_damage = spec.melee_damage || this.family.melee;
	// this.speed = spec.speed || speed.normal;
	
};
Item.prototype = new Thing();
Item.prototype.constructor = Item;
Item.prototype.getFamily = function ( ) { return this.family; };
Item.prototype.isContainer = function ( ) { return this.family.is_container; };

/*****************************************************************************
 MONSTER FAMILY
*****************************************************************************/

function MonsterFamily(spec) {
    Thing.call(this);
	this.objtype = 'monster_family';
    this.name = spec.name;
	this.description = spec.description || '';
    this.code = spec.code;
	
    if (spec.color === undefined) {
        this.color = colors.normal_fore;
    } else {
        this.color = spec.color;
    }
	
	if (spec.bg_color === undefined) {
        this.bg_color = colors.normal_bg;
    } else {
        this.bg_color = spec.bg_color;
    }
	
	this.flags = spec.flags || [];
	
	this.ranged_damage = spec.ranged_damage || 0;
	this.attack_radius = spec.attack_radius || 0;
	this.melee_damage = spec.melee_damage || 0;
};
MonsterFamily.prototype = new Thing();
MonsterFamily.prototype.constructor = MonsterFamily;

/*****************************************************************************
 STAT - (system) 
*****************************************************************************/
function Stat(spec) {
	this.name = spec.name;
	this.current = spec.value;
	this.max = spec.value;
	
	this.getCurrent = function ( ) { return this.current; };
	this.getMax = function ( ) { return this.max; };
	this.addTo = function (amount) {
		this.current = Math.min(this.max, this.current + amount);
	};
	
	this.deduct = function (amount) {
		this.current = Math.max(0, this.current - amount);
	};
	
	this.setTo = function (amount) {
		this.current = amount;
	};
	
	this.isZero = function ( ) { return this.current <= 0; };
	this.isMax = function ( ) { return this.current === this.max; };
};

/*****************************************************************************
 MONSTER 
*****************************************************************************/

function Monster(spec) {
	Thing.call(this);
	this.objtype = 'mob';
	this.name = spec.name;
	this.family = spec.family;
	this.description = spec.description || '';
	
    if (spec.color === undefined) {
        this.color = this.family.getColor();
    } else {
        this.color = spec.color;
    }
	
	if (spec.bg_color === undefined) {
        this.bg_color = this.family.getBackgroundColor();
    } else {
        this.bg_color = spec.bg_color;
    }
	
	this.flags = spec.flags || [];
	this.flags = this.flags.concat(this.family.getFlags());
	
	// monster-specific stuff
	this.location = {};
	this.equip = new Equip();
	this.inventory = new Inventory();
	this.fov = {};
	this.aware = [];
	this.memory = {};
	this.discovery = {};
	this.sight_radius = spec.sight_radius || 10;
	this.attack_radius = spec.attack_radius || 6;
	this.dijkstra_map = {};
	// this.speed = spec.speed || this.family.speed;
	
	// stats
	this.stats = {};
	this.current_system = null;
	
	this.last_hit = 0;
	this.last_target = 0;

	this.ranged_damage = spec.ranged_damage || this.family.ranged_damage;
	this.attack_radius = spec.attack_radius || this.family.attack_radius;
	this.melee_damage = spec.melee_damage || this.family.melee_damage;
};
Monster.prototype = new Thing();
Monster.prototype.constructor = Monster;
Monster.prototype.getCode = function ( ) { return this.family.getCode(); };
Monster.prototype.getFamily = function ( ) { return this.family; };
Monster.prototype.getLocation = function ( ) { return this.location; };
Monster.prototype.getCurrentSystem = function ( ) { return this.current_system; };
Monster.prototype.setCurrentSystem = function (new_system) { 
	this.current_system = new_system;
	return true;
};

Monster.prototype.setLocation = function (grid_xy) {
	this.location = grid_xy;
	return true;
};

Monster.prototype.setName = function (new_name) {
	this.name = new_name;
	return true;
};

Monster.prototype.createStat = function (stat_name, init_value) {
	this.stats[stat_name] = new Stat({name: stat_name, value: init_value});
};

Monster.prototype.getStat = function (stat_name) {
	return this.stats[stat_name];
};


// Monster.prototype.addToSystem = function (system, amount) {
	// if (system === constants.system.power) {
		
// };

// F. O. V.
//////////////////////////////////////////////////
Monster.prototype.getFovAt = function (grid_xy) {
	var key = xyKey(grid_xy);
	var fov = this.fov[key];
	
	if (fov === undefined) {
		return null;
	} else {
		return fov;
	}
};

Monster.prototype.setFovAt = function (grid_xy) {
	var key = xyKey(grid_xy);
	this.fov[key] = true;
	
	return true;
};

Monster.prototype.clearFov = function ( ) {
	this.fov = {};
	this.aware = [];
};

Monster.prototype.getFov = function ( ) { return this.fov; };

Monster.prototype.addAware = function (thing) {
	this.aware.push(thing.id);
};

Monster.prototype.isAware = function (thing) {
	return $.inArray(thing.id, this.aware) > -1;
};

// MEMORY
//////////////////////////////////////////////////
Monster.prototype.getMemoryAt = function (level_id, grid_xy) {
	var key = level_id + '+' + xyKey(grid_xy);
	var memory = this.memory[key];
	
	if (memory === undefined) {
		return null;
	} else {
		return memory;
	}
};

Monster.prototype.setMemoryAt = function (level_id, grid_xy, mem_obj) {
	var key = level_id + '+' + xyKey(grid_xy);
	this.memory[key] = mem_obj;
	
	return true;
};

Monster.prototype.setDiscoveryAt = function (level_id, grid_xy) {
	if (this.discovery[level_id] === undefined) {
		this.discovery[level_id] = {};
	}
	var key = xyKey(grid_xy);
	this.discovery[level_id][key] = true;
	
	return true;
};

Monster.prototype.getDiscoveryLevel = function (level_id) {
	var count = 0;
	for (var prop in this.discovery[level_id]) {
		if (this.discovery[level_id].hasOwnProperty(prop))
			count++;
	}
	return count;
};

Monster.prototype.clearMemory = function ( ) {
	this.memory = {};
};

Thing.prototype.getAttackRadius = function ( ) {
	if (this.equip.hasItem(constants.equip.projectile)) {
		return this.equip.getItem(constants.equip.projectile).attack_radius;
	} else {
		return this.attack_radius;
	}
};

Thing.prototype.getMeleeDamage = function ( ) {
	if (this.equip.hasItem(constants.equip.melee)) {
		return this.equip.getItem(constants.equip.melee).melee_damage;
	} else {
		return this.melee_damage;
	}
};

Thing.prototype.getRangedDamage = function ( ) {
	return this.ranged_damage;
};

/*****************************************************************************
 INVENTORY 
*****************************************************************************/

function Inventory() {
	this.inventory = [];
};

Inventory.prototype.addItem = function (item) {
	if (this.inventory.length === constants.inventory_max_items) {
		return false;
	}
	this.inventory.push(item);
	return true;
};

Inventory.prototype.removeItem = function (index) {
	this.inventory.splice(index, 1);
};

Inventory.prototype.getItem = function (index) {
	return this.inventory[index];
};

Inventory.prototype.getNumItems = function ( ) {
	return this.inventory.length;
};

Inventory.prototype.removeItemByObject = function (item) {
	var idx = this.inventory.indexOf(item);
	if (idx !== -1) {
		this.removeItem(idx);
		return true;
	} else {
		return false;
	}
};

Inventory.prototype.hasItemOfFamily = function (itemFamily) {
	for (var i = 0; i < this.inventory.length; i += 1) {
		if (compareItemToFamily(this.inventory[i], itemFamily)) {
			return true;
		}
	}
	return false;
};

/*****************************************************************************
 EQUIPMENT
*****************************************************************************/

function Equip() {
	this.equip = {};
};

Equip.prototype.getItem = function (equip_slot) {
	var e = this.equip[equip_slot];
	
	if (e === undefined) {
		return null;
	} else {
		return e;
	}
};

Equip.prototype.hasItem = function (equip_slot) {
	return this.equip[equip_slot] !== null && this.equip[equip_slot] !== undefined;
};

Equip.prototype.setItem = function (equip_slot, item) {
	// see what's already there
	var current = this.getItem(equip_slot);
	
	this.equip[equip_slot] = item;
};

Equip.prototype.removeItem = function (equip_slot) {
	delete this.equip[equip_slot];
	return true;
};

/*****************************************************************************
 LEVEL / DUNGEON
*****************************************************************************/
function Level(spec) {
	this.id = idGenerator.new_id();
	this.name = spec.name;
    this.width = spec.width;
    this.height = spec.height;
    this.depth = spec.depth || 0;
    this.terrain = {};
    this.items = {};
    this.monsters = {};
    this.features = {};
    this.portals = {};
	
	this.setPortalAt = function (grid_xy, level_id) {
		if (this.isValidCoordinate(grid_xy) === false) {
            return false;
        }
        
        var key = xyKey(grid_xy);
        this.portals[key] = level_id;
        
        return true;
	};
	
	this.getPortalAt = function (grid_xy) {
		var key = xyKey(grid_xy);
		var level_id = this.portals[key];
		if (level_id === undefined) {
			return null;
		} else {
			return level_id;
		}
	};
	
    this.getTerrainAt = function (grid_xy) {
        var key = xyKey(grid_xy);
        var terr = this.terrain[key];
        
        if (terr === undefined) {
            return null;
        } else {
            return terr;
        }
    };
    
    this.setTerrainAt = function (grid_xy, terrain, override) {
        if ((this.isValidCoordinate(grid_xy) === false) && !override) {
            return false;
        }
        
        var key = xyKey(grid_xy);
        this.terrain[key] = terrain;
        
        return true;
    };
    
    this.getFeatureAt = function (grid_xy) {
        var key = xyKey(grid_xy);
        var feat = this.features[key];
        
        if (feat === undefined) {
            return null;
        } else {
            return feat;
        }
    };
    
    this.setFeatureAt = function (grid_xy, feat) {
        if (this.isValidCoordinate(grid_xy) === false) {
            return false;
        }
        
        var key = xyKey(grid_xy);
        this.features[key] = feat;
        
        return true;
    };
    
    this.getItemAt = function (grid_xy) {
        var key = xyKey(grid_xy);
        var item = this.items[key];
        
        if (item === undefined) {
            return null;
        } else {
            return item;
        }
    };
    
    this.setItemAt = function (grid_xy, item) {
        if (this.isValidCoordinate(grid_xy) === false) {
            return false;
        }
        
        var key = xyKey(grid_xy);
        this.items[key] = item;
        
        return true;
    };
    
    this.removeItemAt = function (grid_xy) {
        if (this.isValidCoordinate(grid_xy) === false) {
            return false;
        }
        
        var key = xyKey(grid_xy);
        
        delete this.items[key];
        return true;
    };
   
    this.getMonsterAt = function (grid_xy) {
        var key = xyKey(grid_xy);
        var mob = this.monsters[key];
        
        if (mob === undefined) {
            return null;
        } else {
            return mob;
        }
    };
    
    this.setMonsterAt = function (grid_xy, mob) {
        if (this.isValidCoordinate(grid_xy) === false) {
            return false;
        }
        
        var key = xyKey(grid_xy);
        this.monsters[key] = mob;
        mob.setLocation(grid_xy);
        return true;
    };
    
    this.removeMonsterAt = function (grid_xy) {
        if (this.isValidCoordinate(grid_xy) === false) {
            return false;
        }
        
        var key = xyKey(grid_xy);
        
        delete this.monsters[key];
        return true;
    };
    
    this.getMonsters = function ( ) {
        var m, monsters = [];
        for (m in this.monsters) {
            if (this.monsters.hasOwnProperty(m)) {
                monsters.push(this.monsters[m]);
            }
        }
        
        return monsters;
    };
    
    this.isValidCoordinate = function (grid_xy) {
        // if (grid_xy === undefined) {
            // alert("invalid coord " + grid_xy);
            // return false;
        // }
        
        if (grid_xy.x < 0 || grid_xy.y < 0) {
            return false;
        } else if (grid_xy.x >= this.width || grid_xy.y >= this.height) {
            return false;
        } else {
            return true;
        }
    };
    
    this.getWalkableLocations = function ( ) {
    // return an array of walkable coordinates for this level
        var walkable = [], walkable_str = [];
        var terrain, x, y, xy, key;
        
        for (x = 0; x < this.width; x += 1) {
            for (y = 0; y < this.height; y += 1) {
                xy = {"x": x, "y": y};
                key = x + "+" + y;
                terrain = this.getTerrainAt(xy);
				if (terrain === null) {
					alert("Found null terrain in walkable locations");
				}
                if (terrain.isWalkable() === true) {
                    walkable.push(xy);
                    walkable_str.push(key);
                }
            }
        }
        
        return {"locations_xy": walkable, "locations_key": walkable_str};
    };
    
    return this;
};

/*****************************************************************************
 GAME MESSAGE
*****************************************************************************/
function Message (msg, turn, color) {
	this.message = msg;
	this.turn = turn;
	if (color === undefined) {
		this.color = null;
	} else {
		this.color = color;
	}
};
Message.prototype.toString = function ( ) {
	return this.message;
};