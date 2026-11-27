(function () {
  var make = document.querySelector("[data-makes]");
  var model = document.querySelector("[data-models]");
  if (!make || !model) return;

  var chosenMake = make.getAttribute("data-selected") || "";
  var chosenModel = model.getAttribute("data-selected") || "";
  var placeholder = make.getAttribute("data-placeholder") || "";

  function option(value, label, selected) {
    var el = document.createElement("option");
    el.value = value;
    el.textContent = label;
    if (selected) el.selected = true;
    return el;
  }

  function fillModels(catalog) {
    var models = catalog[make.value] || [];
    var keep = chosenModel;
    model.innerHTML = "";
    model.appendChild(option("", placeholder, !keep));
    var found = false;
    models.forEach(function (name) {
      var on = name === keep;
      if (on) found = true;
      model.appendChild(option(name, name, on));
    });
    if (keep && !found) model.appendChild(option(keep, keep, true));
    model.disabled = !make.value;
    chosenModel = "";
  }

  var request = new XMLHttpRequest();
  request.open("GET", "/js/car-catalog.json", true);
  request.onload = function () {
    if (request.status < 200 || request.status >= 300) return;
    var catalog = JSON.parse(request.responseText);
    var makes = Object.keys(catalog).sort();
    make.innerHTML = "";
    make.appendChild(option("", placeholder, !chosenMake));
    var foundMake = false;
    makes.forEach(function (name) {
      var on = name === chosenMake;
      if (on) foundMake = true;
      make.appendChild(option(name, name, on));
    });
    if (chosenMake && !foundMake) make.appendChild(option(chosenMake, chosenMake, true));
    if (chosenMake) make.value = chosenMake;
    fillModels(catalog);
    make.addEventListener("change", function () {
      chosenModel = "";
      fillModels(catalog);
    });
  };
  request.send();
})();
