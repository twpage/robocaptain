// ---------------------------------
// Todd Page
// 12/16/2011
//
// Draw images on canvas from a giant tiled image
// v 0.1
// ---------------------------------

var eyeofthetiler = function (tiles_image, width_per_tile, height_per_tile) {

	// PRIVATE Closure variables 
	///////////////////////////////////////////////////////////////////////////
	var my_tiles_image = tiles_image;
	var my_tile_width = width_per_tile;
	var my_tile_height = height_per_tile;

	var my_tiles_x = tiles_image.width / width_per_tile;
	var my_tiles_y = tiles_image.height / height_per_tile;
	
	var that = {};

	// Init
	///////////////////////////////////////////////////////////////////////////
	
	that.drawTileImage = function(dest_context, tile_id, dest_x, dest_y, dest_width, dest_height, options) {
		//var ctx = dest_canvas.getContext("2d");
		
		var img_x, img_y;
		img_x = tile_id % my_tiles_x;
		img_y = Math.floor(tile_id / my_tiles_x);

		options = options || {clear_first: false};
		
		// options
		var clear_first = options.clear_first || false;//(options.clear_first) ? true : false;
		
		if (clear_first === true) {
			dest_context.clearRect(dest_x, dest_y, dest_width, dest_height);
		}
		
		// drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
		dest_context.drawImage(
			my_tiles_image, 
			img_x * my_tile_width, 
			img_y * my_tile_height, 
			my_tile_width, 
			my_tile_height, 
			dest_x,
			dest_y,
			dest_width, 
			dest_height
		);
	};
	
	return that;
};
