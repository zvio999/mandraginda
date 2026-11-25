function runCount(el) {
  if (el.dataset.counted) return;
  el.dataset.counted = "1";
  var target = Number(el.getAttribute("data-count")) || 0;
  var start = performance.now();
  var duration = 1200;
  function tick(now) {
    var t = Math.min(1, (now - start) / duration);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))).toLocaleString("en-US");
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function growBar(el) {
  if (el.dataset.grown) return;
  el.dataset.grown = "1";
  el.style.width = (Number(el.getAttribute("data-bar")) || 0) + "%";
}

function playInside(el) {
  el.querySelectorAll("[data-count]").forEach(runCount);
  el.querySelectorAll("[data-bar]").forEach(growBar);
}

function armScrollReveal(nodes) {
  if (!nodes.length) return;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    nodes.forEach(function (el) {
      el.classList.add("in", "ready");
      playInside(el);
    });
    return;
  }
  nodes.forEach(function (el) {
    el.addEventListener("transitionend", function (event) {
      if (event.target !== el) return;
      if (event.propertyName !== "transform" && event.propertyName !== "opacity") return;
      el.classList.add("ready");
    });
  });
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in");
      playInside(entry.target);
      observer.unobserve(entry.target);
      setTimeout(function () { entry.target.classList.add("ready"); }, 2400);
    });
  }, { threshold: 0.2 });
  nodes.forEach(function (el) { observer.observe(el); });
}
armScrollReveal(document.querySelectorAll(".event.rise, .reveal"));

var toggle = document.querySelector(".menu-toggle");
var nav = document.querySelector(".nav");
if (toggle && nav) {
  toggle.addEventListener("click", function () {
    nav.classList.toggle("open");
  });
}
