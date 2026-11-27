const fuel = [
  { value: "petrol", ka: "ბენზინი", en: "Petrol" },
  { value: "diesel", ka: "დიზელი", en: "Diesel" },
  { value: "hybrid", ka: "ჰიბრიდი", en: "Hybrid" },
  { value: "electric", ka: "ელექტრო", en: "Electric" },
  { value: "lpg", ka: "გაზი", en: "LPG" },
  { value: "petrol-lpg", ka: "ბენზინი/გაზი", en: "Petrol/LPG" },
];

const category = [
  { value: "suv", ka: "SUV", en: "SUV" },
  { value: "pickup", ka: "პიკაპი", en: "Pickup" },
  { value: "minivan", ka: "მინივენი", en: "Minivan" },
  { value: "crossover", ka: "კროსოვერი", en: "Crossover" },
];

const gearbox = [
  { value: "manual", ka: "მექანიკა", en: "Manual" },
  { value: "automatic", ka: "ავტომატიკა", en: "Automatic" },
  { value: "tiptronic", ka: "ტიპტრონიკი", en: "Tiptronic" },
  { value: "cvt", ka: "ვარიატორი", en: "CVT" },
];

const drive = [
  { value: "fwd", ka: "წინა", en: "Front" },
  { value: "rwd", ka: "უკანა", en: "Rear" },
  { value: "4wd", ka: "4x4", en: "4x4" },
  { value: "awd", ka: "სრული", en: "All-wheel" },
];

const yesno = [
  { value: "yes", ka: "დიახ", en: "Yes" },
  { value: "no", ka: "არა", en: "No" },
];

const axle = [
  { value: "none", ka: "არა", en: "None" },
  { value: "front", ka: "წინა", en: "Front" },
  { value: "rear", ka: "უკანა", en: "Rear" },
  { value: "both", ka: "წინა და უკანა", en: "Front and rear" },
];

const tireType = [
  { value: "ht", ka: "HT (გზატკეცილი)", en: "HT (Highway)" },
  { value: "at", ka: "AT (ყველგანმავალი)", en: "AT (All-terrain)" },
  { value: "mt", ka: "MT (ტალახის)", en: "MT (Mud-terrain)" },
  { value: "rt", ka: "RT (რთული რელიეფი)", en: "RT (Rugged)" },
];

function tireSizes() {
  const list = [];
  for (let size = 29; size <= 50; size++) {
    const label = size + "\"";
    list.push({ value: label, ka: label, en: label });
  }
  return list;
}

function engines() {
  const list = [];
  for (let size = 6; size <= 70; size++) {
    const label = (size / 10).toFixed(1);
    list.push({ value: label, ka: label, en: label });
  }
  return list;
}

function doors() {
  return ["2", "3", "4", "5"].map(function (count) {
    return { value: count, ka: count, en: count };
  });
}

const groups = {
  fuel: fuel,
  category: category,
  gearbox: gearbox,
  drive: drive,
  yesno: yesno,
  axle: axle,
  tireType: tireType,
  tireSize: tireSizes(),
  engine: engines(),
  doors: doors(),
};

function optionLabel(group, value, lang) {
  if (!value) return "";
  const list = groups[group] || [];
  for (let i = 0; i < list.length; i++) {
    if (list[i].value === String(value)) return list[i][lang] || list[i].en;
  }
  return String(value);
}

function formOptions(lang) {
  const language = lang === "en" ? "en" : "ka";
  const out = {};
  Object.keys(groups).forEach(function (name) {
    out[name] = groups[name].map(function (item) {
      return { value: item.value, label: item[language] || item.en };
    });
  });
  const years = [];
  for (let year = 2027; year >= 1960; year--) {
    years.push({ value: String(year), label: String(year) });
  }
  out.year = years;
  return out;
}

module.exports = { optionLabel, formOptions };
