const GLOBAL_OFFSET_STEP = 50;

// create default timeline
var timeline = {
	padding: { top: 100, right: 0, bottom: 50, left: 50 },
	zoom: 1,
	offset: 2000,
	end: 2020,
	events: [],
	timespans: []
};

// simple shorthand for getElementById() and querySelector()
function elem(ident) {
	let element = document.getElementById(ident);
	(element == null || element == undefined) ? element = document.querySelector(ident) : element = element;
	return element;
}

// calculate average color intensity for an RGB color (because I'm too lazy to do proper HSV conversion)
function colorStrength(color) {

	// if the color is hexadecimal, convert to RGB before proceeding
	if(typeof color == "string" && color.startsWith("#")) {
		
		// if the string is too short to be proper hex RGB, return false
		if(color.length < 7) { return false; }
		
		// cut the # sign and extract 16-bit R, G, and B components
		color = color.substr(1);
		let r = color.substr(0,2);
		let g = color.substr(2,2);
		let b = color.substr(4,2);
		
		// convert to integers and assemble RGB array
		r = Number("0x" + r);
		g = Number("0x" + g);
		b = Number("0x" + b);
		
		color = [r,g,b];
	} else if(typeof color != "object" || !color.length || color.length < 3) {
		// if color is an object but not an array with at least 3 entries, also return false
		return false;
	}
	
	// compute average of three components and return
	return (color[0] + color[1] + color[2]) / 3;
}

// convert date to pixels considering start date and zoom factor
function getPx(date) {
	// convert given date to 'days since beginning of timeline'
	// milliseconds to seconds (*1000) to hours (*3600) to days (*24)
	let days = (date - new Date(timeline.offset.toString()))/(1000*3600*24);
	// multiply by timeline zoom factor: zoom 1.0 = 1 pixel per day
	let pxLeft = Math.floor(days * timeline.zoom);
	return pxLeft;
}

// shorthand for (date)timeline.end + x
function endPlus(add=0) {
	return new Date((timeline.end + add).toString());
}

// class Event (constructor)
function Event(id, date, title, description = "", color = "#990000") {
	this.id = id;
	this.date = date;
	this.title = title;
	this.description = description;
	this.color = color;
	
	// draw to given canvas context. positive vOffset = lower
	this.draw = function(context, vOffset = 0) {
		// x position = date offset in px + left canvas padding
		let x = getPx(date) + timeline.padding.left;
		let datestr = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric'});
		context.fillStyle = color;
		// draw line to mark on timeline: upper left corner x position and top padding + vOffset, width 1, height = canvas height - padding - vOffset
		// context.fillRect(x, timeline.padding.top + vOffset, 1, context.canvas.height - timeline.padding.bottom - timeline.padding.top -vOffset);
		context.font = "14px sans-serif";
		context.fillText(title, x-(context.measureText(title).width / 2), timeline.padding.top - 10 + vOffset);
		context.font = "10px sans-serif";
		context.fillText(datestr, x-(context.measureText(datestr).width / 2), timeline.padding.top - 25 + vOffset);
		
		// add description
		context.font = "10px sans-serif";
		context.fillText(description, x-(context.measureText(description).width / 2), timeline.padding.top + 5 + vOffset);
		
		// line has to be drawn different due to description
		context.fillRect(x, timeline.padding.top + vOffset + 10, 1, context.canvas.height - timeline.padding.bottom - timeline.padding.top -vOffset -10);
	};
}

// invoked when creating event from GUI
function newEvent() {
	let id = prompt("Please enter an ID");
	if(id.trim().length < 1) {
		// failsafe, ID-less events cannot be deleted
		alert("Could not create event! No ID given.");
		return;
	}
	let title = prompt("Please enter a title");
	let description = prompt("Please enter a description");
	let date = prompt("Please enter a date (YYYY-MM-DD)");
	if(date.trim().length < 1) {
		// failsafe, empty date defaults to 1970-01-01 otherwise
		alert("Could not create event! No date given.");
		return;
	}
	let color = prompt("Please pick a color", "#990000");
	let event = new Event(id, new Date(date), title, description, color);
	timeline.events.push(event);
	draw();
}

// invoked when creating timespan from GUI
function newTimespan() {
	let id = prompt("Please enter an ID");
	if(id.trim().length < 1) {
		// failsafe, ID-less events cannot be deleted
		alert("Could not create event! No ID given.");
		return;
	}
	let title = prompt("Please enter a title");
	let description = prompt("Please enter a description");
	let start_date = prompt("Please enter a start date (YYYY-MM-DD)");
	if(start_date.trim().length < 1) {
		// failsafe, empty date defaults to 1970-01-01 otherwise
		alert("Could not create event! No date given.");
		return;
	}
	let end_date = prompt("Please enter an end date (YYYY-MM-DD)");
	if(end_date.trim().length < 1) {
		// failsafe, empty date defaults to 1970-01-01 otherwise
		alert("Could not create event! No date given.");
		return;
	}
	let color = prompt("Please pick a color", "#990000");
	let layer = prompt("Please designate a layer", 0);
	if(Number(layer) == NaN || Number(layer) == undefined || Number(layer) == null) {
		layer = 0;
	} else {
		layer = Number(layer);
	}
	let timespan = new Timespan(id, new Date(start_date), new Date(end_date), title, description, color, layer);
	timeline.timespans.push(timespan);
	draw();
}

// invoked when deleting event from GUI (also works for timespans)
function deleteEvent() {
	let id = prompt("Please enter the ID you wish to delete");
	let count = 0;
	// iterate all events and delete matching
	for(var i = 0; i < timeline.events.length; i++) {
		if(timeline.events[i].id == id) {
			timeline.events.splice(i, 1);
			count++;
		}
	}
	draw();
	if(count == 0) {
		alert("No matching events found!");
	} else {
		alert("Successfully deleted " + count + " matching events!");
	}
}

// comparator function for sorting purposes, sort Event instances by date
function compareEvents(first, second) {
	
	// sort timespans to the end
	if(first.start_date || second.start_date) {
		return 1;
	}
	
	//console.log(`Comparing ${first.title} (${first.date.toLocaleString()}) and ${second.title} (${second.date.toLocaleString()})`);

	if(first.date.getTime() == second.date.getTime()) {
		//console.log("Both are identical.");
		return 0;
	}
	if(first.date.getTime() > second.date.getTime()) {
		//console.log(`${first.title} comes later!`);
		return 1;
	}
	if(first.date.getTime() < second.date.getTime()) {
		//console.log(`${second.title} comes later!`);
		return -1;
	}
	
	return 0;
	
	/*
	let returnvalue = 0;
	// 0 = events equal, second < first = 1, first < second = -1
	first.date == second.date ? returnvalue = 0 : first.date > second.date ? returnvalue = 1 : returnvalue = -1;
	return returnvalue;
	*/
}


// class Timespan (constructor)
function Timespan(id, start_date, end_date, title, description = "", color = "#990000", layer=0) {
	this.id = id;
	this.start_date = start_date;
	this.end_date = end_date;
	this.title = title;
	this.description = description;
	this.color = color;
	this.layer = layer;
	
	// draw to given canvas context. positive vOffset = lower
	this.draw = function(context, vOffset = 0) {
		
		// get canvas, required to draw at the bottom
		let canvas = context.canvas;
		
		// x position = date offset in px + left canvas padding
		let x1 = getPx(start_date) + timeline.padding.left;
		let x2 = getPx(end_date) + timeline.padding.left;
		
				
		let datestr1 = start_date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric'});
		let datestr2 = end_date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric'});
		
		// set color and make rectangle half transparent
		context.fillStyle = color;
		context.globalAlpha = 0.5;
		
		// draw rectangle
		context.fillRect(x1, canvas.height - timeline.padding.bottom - 100 - 30 - layer*GLOBAL_OFFSET_STEP, x2-x1, 30);
		
		// reset alpha to 1 again afterwards
		context.globalAlpha = 1;
		
		
		// set font and text color (black or white depending on rectangle background)
		context.font = "14px sans-serif";
		context.fillStyle = colorStrength(color) > 32 ? "black" : "white";
		
		// text position: half the width of the span, adjust for half text width to center. text is 14px tall, 30 - 14 = 16, divided by 2 = 8 px from the top edge
		let titleX = x1+((x2-x1)/2) - (context.measureText(title).width / 2);
		
		// measure text height, subtract from rectangle. divide by two and add back text height (text is drawn upwards from lower left corner, canvas Y coordinates start at 0=top edge)
		let titleY = (30 - context.measureText(title).emHeightAscent) / 2 + context.measureText(title).emHeightAscent;
		
		// draw the fucking shit
		context.fillText(title, titleX, canvas.height - timeline.padding.bottom - 100 - 30 - layer*GLOBAL_OFFSET_STEP + titleY);
		
		/* drawing description and dates later because i can't be fucking arsed right now */
		
		/*
		context.font = "10px sans-serif";
		context.fillText(datestr, x-(context.measureText(datestr).width / 2), timeline.padding.top - 25 + vOffset);
		
		// add description
		context.font = "10px sans-serif";
		context.fillText(description, x-(context.measureText(description).width / 2), timeline.padding.top + 5 + vOffset);
		
		// line has to be drawn different due to description
		context.fillRect(x, timeline.padding.top + vOffset + 10, 1, context.canvas.height - timeline.padding.bottom - timeline.padding.top -vOffset -10);
		*/
	};
}

// update files from old versions to facilitate loading
function compatibility(loadedTimeline) {

	// no title field? no problem
	if(loadedTimeline.title == null || loadedTimeline.title == undefined) {
		loadedTimeline.title = "";
	}
	
	if(loadedTimeline.timespans == null || loadedTimeline.timespans == undefined) {
		loadedTimeline.timespans = [];
	}
	
	return loadedTimeline;
}


// export timeline events to JSON
function exportEvents() {
	timeline.events = timeline.events.sort(compareEvents);
	let str = JSON.stringify(timeline, null, 4);
	// create invisible download link, click it, delete it
	let anchor = document.createElement("a");
	anchor.setAttribute("href", "data:application/json;charset=utf-8," + encodeURIComponent(str));
	anchor.setAttribute("download", elem("timelineTitle").value == "" ? "events.json" : elem("timelineTitle").value + ".json");
	anchor.style.display = "none";
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
}

// deserialise JSON and replace(!) existing timeline with import (NOT append)
function importEvents() {
	let input = elem("fileInput");
	if(input.files.length === 0) {
		alert("No files selected!");
		return;
	}
		
	let reader = new FileReader();
	reader.onload = event => {
		// store import in temporary newTimeline, copy over
		// for whatever reason, timeline=JSON.parse(imported) fails to create new Event instances, just copies date string
		let imported = event.target.result;
		newTimeline = JSON.parse(imported);
		
		newTimeline = compatibility(newTimeline);
		
		timeline.title = newTimeline.title;
		timeline.padding = newTimeline.padding;
		timeline.zoom = newTimeline.zoom;
		timeline.offset = newTimeline.offset;
		timeline.end = newTimeline.end;
		timeline.events = [];
		timeline.timespans = [];
		for(let i = 0; i < newTimeline.events.length; i++) {
			let event = newTimeline.events[i];
			
			if(event.date) {
				timeline.events.push(new Event(event.id, new Date(event.date), event.title, event.description, event.color));
			} else if(event.start_date) {
				timeline.timespans.push(new Timespan(event.id, new Date(event.start_date), new Date(event.end_date), event.title, event.description, event.color, event.layer));
			}
		}
		for(let i = 0; i < newTimeline.timespans.length; i++) {
			let event = newTimeline.timespans[i];
			
			if(event.date) {
				timeline.events.push(new Event(event.id, new Date(event.date), event.title, event.description, event.color));
			} else if(event.start_date) {
				timeline.timespans.push(new Timespan(event.id, new Date(event.start_date), new Date(event.end_date), event.title, event.description, event.color, event.layer));
			}
		}
		elem("startYear").value = timeline.offset;
		elem("endYear").value = timeline.end;
		elem("zoomFactor").value = timeline.zoom;
		elem("timelineTitle").value = timeline.title;
		draw();
	};
	reader.onerror = error => reject(error);
	reader.readAsText(input.files[0]);
}

// set up event listeners, adapt width to window size, draw
function init() {
	elem("timeline").width = window.innerWidth - 20;
	elem("fileInput").addEventListener("change", importEvents);
	window.addEventListener("resize", draw);
	draw();
}

// draw the timeline as represented in 'timeline' var
function draw() {
	// sort events by date
	timeline.events = timeline.events.sort(compareEvents);
	
	// set zoom, start year, end year, to values selected in slider / inputs
	timeline.title = elem("timelineTitle").value;
	timeline.zoom = elem("zoomFactor").valueAsNumber;
	timeline.offset = elem("startYear").valueAsNumber;
	timeline.end = elem("endYear").valueAsNumber;
	// update slider label to represent value
	elem("zoomLabel").innerHTML = timeline.zoom + "x";
	
	// variables for canvas and its 2d context
	var canvas = elem("timeline");
	var context = canvas.getContext("2d");
	
	// set canvas height according to browser window, minus control panel height (has position:fixed)
	let newHeight = window.innerHeight - elem("viewControls").scrollHeight * 1.5;
	canvas.setAttribute("height", newHeight);
	// set canvas width to fit entire timeline
	// (ensure whole timeline can be scrolled horizontally no matter the zoom level)
	canvas.setAttribute("width", getPx(endPlus(2)));
	context.clearRect(-1000, -1000, 6000, 6000);
	var fromBottom = canvas.height - timeline.padding.bottom;

	// draw bottom of timeline, 5px high, until just before Jan 1 of following year
	// plus 2px for next vertical line on the timeline (line width of year separators)
	context.fillStyle = "rgb(0,0,0)";
	context.fillRect(timeline.padding.left, fromBottom, getPx(endPlus(1)) + 2, 5);
	
	// for every year, until jan 1 of following year
	for(var i = timeline.offset; i < (endPlus(2).getFullYear()); i++) {
		context.fillStyle = "rgb(0,0,0)";
		let x = getPx(new Date(i.toString())) + timeline.padding.left;
		if(i <= endPlus(0).getFullYear()) {
			// for all years except last (which is jan 1 of end + 1 year)
			// write year underneath year separator
			context.font = "14px sans-serif";
			context.fillText(i.toString(), x, fromBottom + 20);
			
			// from february 1 till december 1, draw smaller month separator
			for(var k = 2; k < 13; k++) {
				let date = new Date(i.toString() + "-" + k.toString() + "-01");
				context.fillStyle = "rgb(60,60,60)";
				context.fillRect(getPx(date) + timeline.padding.left, fromBottom - 50, 1, 50);
			}
		}
		// draw 2px full height separator
		context.fillRect(x, timeline.padding.top, 2, fromBottom - timeline.padding.top);
	}
	
	// 5 event long cycle of different y offset to ensure readability and avoid overlap
	// 1st event: y offset 0, 2/3/4/5th event each 50px (or whatever GLOBAL_OFFSET_STEP says) more
	// draw events
	for(let i = 0; i < timeline.events.length; i++) {
		let vOffset = -1;
		switch((i+1) % 5) {
			case 1:
				vOffset = GLOBAL_OFFSET_STEP * 0;
				break;
			case 2:
				vOffset = GLOBAL_OFFSET_STEP * 1;
				break;
			case 3:
				vOffset = GLOBAL_OFFSET_STEP * 2;
				break;
			case 4:
				vOffset = GLOBAL_OFFSET_STEP * 3;
				break;
			case 5:
			case 0:
				vOffset = GLOBAL_OFFSET_STEP * 4;
				break;
			default:
				vOffset = GLOBAL_OFFSET_STEP * (-1);
				break;
		}
		
		// legacy
		// (i+1) % 3 == 0 ? vOffset = 0 : (i+1) % 3 == 2 ? vOffset = -30 : vOffset = -60;
		
		timeline.events[i].draw(context, vOffset);
	}
	
	timeline.timespans.forEach(timespan => { timespan.draw(context); });
}
