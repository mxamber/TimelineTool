// create default timeline
var timeline = {
	padding: { top: 100, right: 0, bottom: 50, left: 50 },
	zoom: 1,
	offset: 2000,
	end: 2020,
	events: []
};

// simple shorthand for getElementById() and querySelector()
function elem(ident) {
	let element = document.getElementById(ident);
	(element == null || element == undefined) ? element = document.querySelector(ident) : element = element;
	return element;
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
		let datestr = date.toLocaleDateString();
		context.fillStyle = color;
		// draw line to mark on timeline: upper left corner x position and top padding + vOffset, width 1, height = canvas height - padding - vOffset
		context.fillRect(x, timeline.padding.top + vOffset, 1, context.canvas.height - timeline.padding.bottom - timeline.padding.top -vOffset);
		context.font = "14px sans-serif";
		context.fillText(title, x-(context.measureText(title).width / 2), timeline.padding.top - 10 + vOffset);
		context.font = "10px sans-serif";
		context.fillText(datestr, x-(context.measureText(datestr).width / 2), timeline.padding.top - 25 + vOffset);
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

// invoked when deleting event from GUI
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
	let returnvalue = 0;
	// 0 = events equal, second < first = 1, first < second = -1
	first.date == second.date ? returnvalue = 0 : first.date > second.date ? returnvalue = 1 : returnvalue = -1;
	return returnvalue;
}

// export timeline events to JSON
function exportEvents() {
	let str = JSON.stringify(timeline, null, 4);
	// create invisible download link, click it, delete it
	let anchor = document.createElement("a");
	anchor.setAttribute("href", "data:application/json;charset=utf-8," + encodeURIComponent(str));
	anchor.setAttribute("download", "events.json");
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
		
		timeline.padding = newTimeline.padding;
		timeline.zoom = newTimeline.zoom;
		timeline.offset = newTimeline.offset;
		timeline.end = newTimeline.end;
		timeline.events = [];
		for(var i = 0; i < newTimeline.events.length; i++) {
			let event = newTimeline.events[i];
			timeline.events.push(new Event(event.id, new Date(event.date), event.title, event.description, event.color));
		}
		elem("startYear").value = timeline.offset;
		elem("endYear").value = timeline.end;
		elem("zoomFactor").value = timeline.zoom;
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
	
	// 4 event long cycle of different y offset to ensure readability and avoid overlap
	// 1st event: y offset 0, 2/3/4th event each 30px more
	// draw events
	for(var i = 0; i < timeline.events.length; i++) {
		let vOffset = -1;
		switch((i+1) % 4) {
			case 1:
				vOffset = 0;
				break;
			case 2:
				vOffset = 30;
				break;
			case 3:
				vOffset = 60;
				break;
			case 4:
				vOffset = 90;
				break;
			default:
				vOffset = -30;
				break;
		}
		
		// legacy
		// (i+1) % 3 == 0 ? vOffset = 0 : (i+1) % 3 == 2 ? vOffset = -30 : vOffset = -60;
		
		timeline.events[i].draw(context, vOffset);
	}
}
