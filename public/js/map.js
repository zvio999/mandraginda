(function () {
  var canvas = document.getElementById("georgia");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var image = new Image();
  image.src = "/media/georgia.jpg";
  var points = [];
  var mouse = { x: -1000, y: -1000 };
  var density = 11;
  var radius = 3.2;

  function size() {
    var rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  function build() {
    size();
    var bg = document.createElement("canvas");
    bg.width = canvas.width;
    bg.height = canvas.height;
    var bctx = bg.getContext("2d");
    var max = Math.max(image.width / (canvas.width - 80), image.height / (canvas.height - 40));
    var w = image.width / max;
    var h = image.height / max;
    bctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    var data = bctx.getImageData(0, 0, bg.width, bg.height).data;
    points = [];
    for (var y = 0; y < bg.height; y += density) {
      for (var x = 0; x < bg.width; x += density) {
        var i = (y * bg.width + x) * 4;
        if (data[i] > 210 && data[i + 1] > 210 && data[i + 2] > 210) continue;
        if (data[i + 3] < 20) continue;
        points.push({ x: x, y: y, ox: x, oy: y });
      }
    }
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#9EEC65";
    for (var n = 0; n < points.length; n++) {
      var p = points[n];
      var dx = p.x - mouse.x;
      var dy = p.y - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var push = 90 / dist;
      p.x += Math.cos(Math.atan2(dy, dx)) * push + (p.ox - p.x) * 0.08;
      p.y += Math.sin(Math.atan2(dy, dx)) * push + (p.oy - p.y) * 0.08;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  image.onload = function () {
    build();
    frame();
  };
  canvas.addEventListener("mousemove", function (event) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  canvas.addEventListener("mouseleave", function () {
    mouse.x = -1000;
    mouse.y = -1000;
  });
  window.addEventListener("resize", build);
})();
