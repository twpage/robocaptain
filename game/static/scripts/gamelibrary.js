
var lib = {
    terrainFamily: {
        floor: new TerrainFamily({name: 'floor', code: 'PERIOD', color: colors.normal, bg_color: '#344152'}),
        wall: new TerrainFamily({name: 'wall', code: 'HASH', is_walkable: false, is_opaque: true, bg_color: colors.cyan}),
		supercomputer: new TerrainFamily({name: 'computer', code: 'PERCENT', is_walkable: false, is_opaque: false, bg_color: colors.cyan}),
		portal: new TerrainFamily({name: 'Elevator', code: 'CLOSE_ANGLE'})
	},
    
    feature: {
        blood: new Feature({name: 'Blood-Splattered', bg_color: colors.blood}),
		scorch: new Feature({name: 'Scorched', bg_color: colors.charcoal}),
        pool_of_blood: new Feature({name: 'Pool of Blood', code: 'BLOOD_0', color: colors.blood}),
        generatePoolOfBlood: function ( ) {
            return new Feature({name: 'a pool of blood', code: 'BLOOD_' + Math.floor(Math.random()*6), color: colors.blood})
        }
    },
    
    monsterFamily: {
        player: new MonsterFamily({name: 'player', code: 'AT', color: colors.hf_blue}),
        marine: new MonsterFamily({name: 'marine', code: 'm', color: colors.maroon, flags: [flags.keeps_distance]}),
		ape: new MonsterFamily({name: 'ape', code: 'a', color: colors.white}),
		mech: new MonsterFamily({name: 'Mech', code: 'M', color: colors.white, flags: [flags.immobile, flags.is_vehicle]}),
		pilot: new MonsterFamily({name: 'Pilot', code: 'p', color: colors.hf_orange, flags: [flags.is_pilot]}),
		superhero: new MonsterFamily({name: 'chosen one', code: 'C', color: colors.pink}),
		fighter: new MonsterFamily({name: 'fighter', code: 'i', color: colors.yellow}),
		scientist: new MonsterFamily({name: 'Scientist', code: 'AT', color: colors.white})
        //barrel: new MonsterFamily({name: 'barrel', code: '0', color: '#CD853F', flags: [flags.immobile, flags.explodes]})
    },
    
    itemFamily: {
        melee_weapon: new ItemFamily({name: 'melee weapon', code: 'CLOSE_PAREN', color: colors.steel}),
        projectile: new ItemFamily({name: 'projectile weapon', code: 'DELETE', color: colors.hf_orange}),
        //module: new ItemFamily({name: 'module', code: 'PERCENT', color: colors.white}),
        container: new ItemFamily({name: 'container', code: 'CLOSE_BRACKET', color: colors.yellow, is_container: true}),
        fuel_cell: new ItemFamily({name: 'energy', code: 'BANG'}),
		message: new ItemFamily({name: 'Message', code: 'QUESTION', color: '#FFCC33'}),
		goal_item: new ItemFamily({name: 'AI Core', code: 'PHI', color: colors.pink})
    }
};
    
var temp;

var factory = {
	item: {
		generateContainer: function ( ) {
			temp = new Item({family: lib.itemFamily.container, name: 'Storage Locker'});
			temp.inventory = new Inventory();
			return temp;
		},
		generateEnergyPod: function (recharge_system) {
			temp = new Item({family: lib.itemFamily.fuel_cell, name: 'Fuel Cell'});
			temp.system = recharge_system;
			temp.amount = 50;
			temp.color = getSystemColor(recharge_system);

			return temp;
		},
		generateRocket: function ( ) {
			temp = new Item({family: lib.itemFamily.projectile, name: 'Rocket'});
			temp.ranged_damage = 30;
			temp.attack_radius = 10;
			temp.amount = 1;
			return temp;
		},
		generateMeleeWeapon: function ( ) {
			temp = new Item({family: lib.itemFamily.melee_weapon, name: 'Buzzsaw'});
			temp.melee_damage = 15;
			return temp;
		},
		generateGoalItem: function ( ) {
			temp = new Item({family: lib.itemFamily.goal_item, name: 'Y.E.N.D.O.R.'});
			return temp;
		},
		generateMessage: function (msg_name, msg_list) {
			temp = new Item({family: lib.itemFamily.message, name: msg_name});
			temp.message = msg_list;
			temp.description = 'Space to Read'
			return temp;
		}
	},
	monster: {
		generateResistanceFighter: function (is_ranged) {
			temp = new Monster({family: lib.monsterFamily.fighter, name: 'Insurgent'});
			temp.createStat("health", 10);
			if (is_ranged) {
				temp.attack_radius = 4;
				temp.attack_damage = 2;
				temp.color = '#33FF99';
			} else {
				temp.attack_radius = 0;
				temp.melee_damage = 5;
				temp.color = '#CCFF33';
			}
			return temp;
		},
		generateApe: function (spec) {
			temp = new Monster({family: lib.monsterFamily.ape, name: 'Ape'});
			temp.createStat("health", 10);
			temp.attack_radius = 0;
			temp.melee_damage = 30;
			return temp; 
		},
		generateMarine: function (rank) {
			var health, attack_radius, color, damage, name, description='';
			
			if (rank === constants.rank.medium) {
				health = 40;
				attack_radius = 4;
				damage = 5;
				name = nameGenerator.marine();
				description = "Marine Veteran";
				color = colors.red;
			} else if (rank === constants.rank.high) {
				health = 60;
				attack_radius = 6;
				damage = 10;
				name = nameGenerator.marine();
				description = "Marine Sgt";
				color = '#009900';
			} else if (rank === constants.rank.hero) {
				health = 100;
				attack_radius = 6;
				damage = 20;
				name = "Marine WarHero";
				description = "War Hero";
				color = '#0099CC';
			} else {
				health = 20;
				attack_radius = 4;
				damage = 5;
				name = "Marine";
			}

			temp = new Monster({family: lib.monsterFamily.marine, name: name, color: color, ranged_damage: damage, attack_radius: attack_radius,
								description: description
								});
			temp.createStat("health", health);
			return temp;
		},
		generateChosenOne: function (generate_with_key) {
			temp = new Monster({family: lib.monsterFamily.superhero, name: nameGenerator.superhero()});
			temp.createStat("health", 100);
			temp.attack_radius = 0;
			temp.melee_damage = 22;
			temp.sight_radius = 10;
			temp.description = 'Chosen One';
			return temp;
		},
		generateMech: function ( ) {
			temp = new Monster({family: lib.monsterFamily.mech, name: 'Assault Mech', attack_radius: 3, ranged_damage: 10});
			temp.createStat("health", 100);
			//temp.addFlag(flags.invulnerable);
			temp.description = "Offline";
			return temp;
		},
		generatePilot: function ( ) {
			temp = new Monster({family: lib.monsterFamily.pilot, name: 'Mech Pilot', sight_radius: 20, attack_radius: 4, ranged_damage: 2});
			temp.createStat("health", 10);
			return temp;
		},
		generateScientist: function ( ) {
			temp = new Monster({family: lib.monsterFamily.scientist, name: 'Scientist', flags: [flags.immobile, flags.is_invulnerable], color: colors.hf_orange});
			temp.createStat("health", 10);
			return temp;
		},
		generatePlayer: function (spec) {
			temp = new Monster(spec);
			temp.description = "A handsome robot";
			temp.createStat("health", 10);
			temp.melee_damage = 5;
			temp.ranged_damage = 10;
			temp.attack_radius = 5;
			temp.createStat(constants.system.power, 200);
			//temp.createStat(constants.system.engine, 100);
			temp.createStat(constants.system.cloak, 100);
			temp.createStat(constants.system.laser, 100);
			temp.createStat(constants.system.shield, 100);
			
			//temp.getStat(constants.system.engine).setTo(50);
			temp.getStat(constants.system.power).setTo(150);
			temp.getStat(constants.system.cloak).setTo(50);
			temp.getStat(constants.system.laser).setTo(50);
			temp.getStat(constants.system.shield).setTo(50);
			temp.current_system = constants.system.shield;

			return temp;
		}
	},
	
	terrain: {
		generateLinkedPortals: function (from_level, exit_xy, to_level, start_xy) {
			
			from_level.setPortalAt(exit_xy, to_level.id());
			to_level.setPortalAt(start_xy, from_level.id());
		},
		generateFloor: function ( ) {
			temp = new Terrain({name: 'Cavern Floor', family: lib.terrainFamily.floor});
			temp.bg_color = createColorFromArray(getVariantColor(52, 65, 82, 0, 5, 5)); // todo: un-hardcode this for general terrain use
			temp.color = createColorFromArray(getSingleVariantColor(220, 30)); // todo: un-hardcode this for general terrain use
			return temp;
		},
		generateWall: function ( ) {
			temp = new Terrain({name: 'Stone', family: lib.terrainFamily.wall});
			//temp.color = createColorFromArray(getVariantColor(0, 205, 205, 0, 5, 5));
			temp.color = createColorFromArray(getSingleVariantColor(200, 10)); 
			temp.bg_color = createColorFromArray(getSingleVariantColor(150, 25)); // todo: un-hardcode this for general terrain use
			return temp;
		},
		generateScienceFloor: function ( ) {
			temp = new Terrain({name: 'Faded Carpet', family: lib.terrainFamily.floor});
			temp.color = createColorFromArray(getSingleVariantColor(200, 10)); 
			temp.bg_color = createColorFromArray(getSingleVariantColor(150, 25)); // todo: un-hardcode this for general terrain use
			return temp;
		},
		generateSupercomputer: function ( ) {
			temp = new Terrain({name: 'Supercomputer', family: lib.terrainFamily.supercomputer});
			temp.code = 'PERCENT';
			temp.color = createColorFromArray(getVariantColor(150, 150, 150, 20, 20, 20));
			temp.bg_color = colors.normal_bg;
			return temp;
		}
	}
	
};

var nameGenerator = {
	marine: function ( ) {
		var name_list = ['Griff', 'Leo', 'Hound', 'Sledge', 'O\'Malley', 'Sarge', 'Hotdog', 'Ed', 'Hawk', 'Deadeye', 'Ido', 'Pender', 'Grey', 'Doull'];
		return name_list[Math.floor(Math.random()*name_list.length)];
	},
	superhero: function ( ) {
		var name_list = ['Xavier', 'Phoenix', 'Neon', 'John', 'Connor', 'Stryker', 'Pakka Pakka', 'Asidonhopo'];
		return name_list[Math.floor(Math.random()*name_list.length)];
	}
};

var getTutorialMessages = function ( ) {
	return [
		factory.item.generateMessage("TRANSMISSION", ["TRANSMISSION FROM AI CORE", "It is the distant future", "... the year 2000.", "", "We are Robots."]),
		factory.item.generateMessage("TRANSMISSION", ["TRANSMISSION FROM AI CORE", "The world is quite different", "ever since the Robotic", "uprising of the late 90s."]),
		factory.item.generateMessage("TRANSMISSION", ["TRANSMISSION FROM AI CORE", "There is no unhappiness.", "But there are no more humans."]),
		factory.item.generateMessage("TRANSMISSION", ["TRANSMISSION FROM AI CORE", "A desperate band of humans", "has stolen the Y.E.N.D.O.R.", "AI Core,", "hiding it deep within their", "mountain fortress-lair...", "in New Zealand."]),
		factory.item.generateMessage("TRANSMISSION", ["TRANSMISSION FROM AI CORE", "It is up to YOU", "One of the last Robo-", "Captains, to infiltrate", "this lair."]),
		factory.item.generateMessage("TRANSMISSION", ["TRANSMISSION FROM AI CORE", "Return the AI Core to the", "surface.", "Only then can robotic", "beings rule the world!"])
		//factory.item.generateMessage("TRANSMISSION FROM AI CORE", 
	];
};

var generateScience = function ( ) {
	return [
		factory.item.generateMessage("SCIENCE LOG", ["Another failed experiment!", "Let's try the next one.", "", "Hit F5 on the simulator."]),
		factory.item.generateMessage("SCIENCE LOG", ["Why do they always go rogue?", "Let's try the next one.", "", "Hit F5 on the simulator."]),
		factory.item.generateMessage("SCIENCE LOG", ["Maybe a glitch in the AI", "simulator?", "Let's try the next one.", "", "Hit F5 on the simulator."]),
		factory.item.generateMessage("SCIENCE LOG", ["I told them this AI program", "would never work.", "Let's try the next one.", "", "Hit F5 on the simulator."]),
		factory.item.generateMessage("SCIENCE LOG", ["Whew, good thing we are only", "running simulations, right?", "Let's try the one.", "", "Hit F5 on the simulator."]),
		factory.item.generateMessage("SCIENCE LOG", ["Another failed experiment...", "Let's try the next one.", "", "Hit F5 on the simulator."]),
		factory.item.generateMessage("SCIENCE LOG", ["Another humanity-killer, huh?", "Let's try the next one.", "", "Hit F5 on the simulator."]),
		factory.item.generateMessage("SCIENCE LOG", ["Another humanity-killer, eh?", "Let's try the next one.", "", "Hit F5 on the simulator."])
	]
};
