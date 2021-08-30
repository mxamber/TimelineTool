var timeline = {
	padding: { top: 100, right: 0, bottom: 50, left: 50 },
	zoom: 1,
	offset: 2000,
	end: 2020,
	events: []
};

function elem(ident) {
	let element = document.getElementById(ident);
	(element == null || element == undefined) ? element = document.querySelector(ident) : element = element;
	return element;
}

function getPx(date) {
	let days = (date - new Date(timeline.offset.toString()))/(1000*3600*24); // milliseconds to seconds (*1000) to hours (*3600) to days (*24)
	let pxLeft = Math.floor(days * timeline.zoom);
	return pxLeft;
}

function endPlus(add=0) {
	return new Date((timeline.end + add).toString());
}

function Event(id, date, title, description = "", color = "#990000") {
	this.id = id;
	this.date = date;
	this.title = title;
	this.description = description;
	this.color = color;
	this.draw = function(context, vOffset = 0) {
		let x = getPx(date) + timeline.padding.left;
		let datestr = date.toLocaleDateString();
		context.fillStyle = color;
		context.fillRect(x, timeline.padding.top + vOffset, 1, context.canvas.height - timeline.padding.bottom - timeline.padding.top -vOffset);
		context.font = "14px sans-serif";
		context.fillText(title, x-(context.measureText(title).width / 2), timeline.padding.top - 10 + vOffset);
		context.font = "10px sans-serif";
		context.fillText(datestr, x-(context.measureText(datestr).width / 2), timeline.padding.top - 25 + vOffset);
	};
}

function newEvent() {
	let id = prompt("Please enter an ID");
	let title = prompt("Please enter a title");
	let description = prompt("Please enter a description");
	let date = prompt("Please enter a date (YYYY-MM-DD)");
	let color = prompt("Please pick a color", "#990000");
	let event = new Event(id, new Date(date), title, description, color);
	timeline.events.push(event);
	draw();
}

function deleteEvent() {
	let id = prompt("Please enter the ID you wish to delete");
	let count = 0;
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

function compareEvents(first, second) {
	let returnvalue = 0;
	first.date == second.date ? returnvalue = 0 : first.date > second.date ? returnvalue = 1 : returnvalue = -1;
	return returnvalue;
}

function exportEvents() {
	let str = JSON.stringify(timeline, null, 4);
	let anchor = document.createElement("a");
	anchor.setAttribute("href", "data:application/json;charset=utf-8," + encodeURIComponent(str));
	anchor.setAttribute("download", "events.json");
	anchor.style.display = "none";
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
}

function importEvents() {
	let input = elem("fileInput");
	if(input.files.length === 0) {
		alert("No files selected!");
		return;
	}
	let url = URL.createObjectURL(input.files[0]);
	
	let reader = new FileReader();
	reader.onload = event => {
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

function init() {
	elem("timeline").width = window.innerWidth - 20;
	elem("fileInput").addEventListener("change", importEvents);
	window.addEventListener("resize", draw);
	draw();
}

function draw() {
	timeline.events = timeline.events.sort(compareEvents);
	timeline.zoom = elem("zoomFactor").valueAsNumber;
	timeline.offset = elem("startYear").valueAsNumber;
	timeline.end = elem("endYear").valueAsNumber;
	elem("zoomLabel").innerHTML = timeline.zoom + "x";
	
	var canvas = elem("timeline");
	var context = canvas.getContext("2d");
	
	let newHeight = window.innerHeight - elem("viewControls").scrollHeight * 1.5;
	canvas.setAttribute("height", newHeight);
	canvas.setAttribute("width", getPx(endPlus(2)));
	context.clearRect(-1000, -1000, 6000, 6000);
	var fromBottom = canvas.height - timeline.padding.bottom;

	context.fillStyle = "rgb(0,0,0)";
	context.fillRect(timeline.padding.left, fromBottom, getPx(endPlus(1)) + 2, 5);
	
	for(var i = timeline.offset; i < (endPlus(2).getFullYear()); i++) {
		context.fillStyle = "rgb(0,0,0)";
		let x = getPx(new Date(i.toString())) + timeline.padding.left;
		if(i <= endPlus(0).getFullYear()) {
			console.log("Found year!");
			context.font = "14px sans-serif";
			context.fillText(i.toString(), x, fromBottom + 20);
			for(var k = 2; k < 13; k++) {
				let date = new Date(i.toString() + "-" + k.toString() + "-01");
				context.fillStyle = "rgb(60,60,60)";
				context.fillRect(getPx(date) + timeline.padding.left, fromBottom - 50, 1, 50);
			}
		}
		context.fillRect(x, timeline.padding.top, 2, fromBottom - timeline.padding.top);
	}
	
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
//		(i+1) % 3 == 0 ? vOffset = 0 : (i+1) % 3 == 2 ? vOffset = -30 : vOffset = -60;
		timeline.events[i].draw(context, vOffset);
	}
}
