var socketio = io();
const messages = document.getElementById("messages");

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

const createMessage = (name, msg) => {
  const content = `
      <div class="text">
        <span>
          <strong>${name}</strong>{% if name %}:{%endif%} ${msg}
        </span>
      </div>
    `;
  messages.innerHTML += content;
};

socketio.on("message", (data) => {
  createMessage(data.name, data.message);
  scrollToBottom();
});

const sendMessage = () => {
  const message = document.getElementById("message");
  if (message.value == "") return;
  socketio.emit("message", { data: message.value });
  message.value = "";
};

// Handle the leave button click
const leaveRoomBtn = document.getElementById("leave-room-btn");
leaveRoomBtn.addEventListener("click", function () {
  // Emit the "leave_room" event to the server with the room code
  socketio.emit("leave_room", { room: roomCode });

  // Redirect to the lobby page
  window.location.href = "/";
});

const canvas = document.getElementById("drawing-board");
const context = canvas.getContext("2d");
let isDrawing = false;
let isErasing = false;
let lineWidth = 3;
let lineColor = "#000000"; // Default color
let localLastX, localLastY;

const roomHeader = document.getElementById("room-header");
// Extract the room code by splitting the text
const roomCode = roomHeader.textContent.split(": ")[1];
console.log(`The room code is: ${roomCode}`);

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseleave", stopDrawing);
var inputField = document.getElementById("message");

inputField.addEventListener("keypress", function (event) {
  if (event.keyCode === 13) {
    sendMessage();
  }
});

function setCanvasWhiteBackground() {
  // Set the fill style to white
  context.fillStyle = "#FFFFFF";
  // Draw a filled rectangle covering the entire canvas
  context.fillRect(0, 0, canvas.width, canvas.height);
}
// Call this function when the canvas is first loaded to initialize the background
setCanvasWhiteBackground();

// Change line color
$("#color-picker").on("change", function () {
  const color = $(this).val();
  socketio.emit("change_color", { color: color, socket_id: socketio.id }); // Send color change event with socket ID
});

// Change line width
$("#line-width").on("change", function () {
  const width = $(this).val();
  socketio.emit("change_width", { width: width, socket_id: socketio.id }); // Send width change event with socket ID
});

socketio.on("change_color", function (data) {
  // Handle line color change event
  const color = data.color;
  const socketId = data.socket_id;
  if (socketId === socketio.id) {
    // Update line color
    lineColor = color;
  }
});

socketio.on("change_width", function (data) {
  // Handle line width change event
  const width = data.width;
  const socketId = data.socket_id;
  if (socketId === socketio.id) {
    // Update line width
    lineWidth = width;
  }
});

// Toggle eraser
$("#eraser-toggle").on("change", function () {
  isErasing = $(this).is(":checked");
  socketio.emit("toggle_eraser", { isErasing: isErasing });
});

function startDrawing(event) {
  isDrawing = true;
  localLastX = undefined; // Reset last point tracking
  localLastY = undefined; // Reset last point tracking
  socketio.emit("start_line", { room: roomCode });
  context.beginPath(); // Start a new path
  draw(event);
}

socketio.on("start_line", function () {
  // Reset the last drawing points to undefined for received data
  lastX = undefined;
  lastY = undefined;
});

function draw(event) {
  if (!isDrawing) return;

  const x = event.clientX - canvas.offsetLeft;
  const y = event.clientY - canvas.offsetTop;

  if (localLastX === undefined || localLastY === undefined) {
    context.moveTo(x, y); // Start a new path from this point
  }

  context.strokeStyle = isErasing ? "#FFFFFF" : lineColor;
  context.lineWidth = isErasing ? lineWidth * 5 : lineWidth;
  context.lineCap = "round";

  context.lineTo(x, y);
  context.stroke();

  localLastX = x;
  localLastY = y;

  // Emit draw data to the server
  socketio.emit("draw", {
    x,
    y,
    isErasing,
    lineColor,
    lineWidth,
    room: roomCode,
  });
}

function stopDrawing() {
  isDrawing = false;
  //context.beginPath();
  localLastX = undefined; // Reset last point tracking
  localLastY = undefined; // Reset last point tracking
}

socketio.on("draw", function (data) {
  drawOnCanvas(data);
});

let lastX, lastY; // Track the previous point coordinates
function drawOnCanvas(data) {
  if (lastX === undefined || lastY === undefined) {
    lastX = data.x;
    lastY = data.y;
    context.beginPath(); // Start a new path for each draw action
    context.moveTo(lastX, lastY); // Move to the initial point
  }

  context.strokeStyle = data.isErasing ? "#FFFFFF" : data.lineColor;
  context.lineWidth = data.isErasing ? data.lineWidth * 5 : data.lineWidth;
  context.lineCap = "round";

  context.lineTo(data.x, data.y); // Draw a single point to prevent connecting lines
  context.stroke();

  lastX = data.x;
  lastY = data.y;
}

// Handle line color change event
$("#color-picker").on("change", function () {
  lineColor = $(this).val();
});

//Handle line color change event for color boxes
$(".color-box").on("click", function () {
  lineColor = $(this).attr("data-color");
});

// Handle line width change event
$("#line-width").on("change", function () {
  lineWidth = $(this).val();
});

const downloadBtn = document.getElementById("download-btn");

function uploadCanvasDataUrl() {
  // Convert the canvas to a Base64-encoded image URL
  const dataUrl = canvas.toDataURL("image/png");

  // Send the data URL to the server via JSON data
  fetch("/upload_canvas_url", {
    method: "POST",
    body: JSON.stringify({ data_url: dataUrl }),
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Send session cookies
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        alert("Data URL stored successfully.");
      } else {
        alert("Error: " + data.error);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

downloadBtn.addEventListener("click", function () {
  uploadCanvasDataUrl();
});