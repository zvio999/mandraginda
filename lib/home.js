const homeDefaults = {
  phone: "(+995) 558181018",
  phoneHref: "+995558181018",
  email: "info@mandraginda.ge",
  saleEmail: "sale@mandraginda.ge",
  heroTitle: "Join us and feel the power of nature",
  heroText: "A place where adrenaline, beauty and wilderness meet.",
  heroButton: "Let's start",
  heroLink: "https://www.youtube.com/@Mandraginda",
  heroImage: "/media/main2.jpg",
  video: "https://mandraginda.ge/wp-content/uploads/2024/10/trailler.mp4",
  stats: [
    { value: 15, suffix: "+", label: "Video" },
    { value: 3490, suffix: "", label: "Subscriber" },
    { value: 4, suffix: "+", label: "Team member" },
    { value: 5, suffix: "+", label: "Years of experience" },
  ],
  eventsEyebrow: "Planned Events",
  eventsTitle: "2025 Offroad Festival",
  eventsText: "There will be various outings and competitions, as well as gifts and awards.",
  events: [
    {
      kicker: "5000 Subscriber",
      title: "Common",
      text: "A joint outing with subscribers will be planned for 5,000 subscribers.",
      image: "/media/eventmain1.jpg",
    },
    {
      kicker: "Special meeting",
      title: "Wait for details.",
      text: "Here you will find the details of the next departure.",
      image: "/media/eventmain2.jpg",
    },
    {
      kicker: "Special meeting",
      title: "Wait for details.",
      text: "Here you will find the details of the next departure.",
      image: "/media/eventmain3.jpg",
    },
  ],
  whyEyebrow: "Why us?",
  whyTitle: "We took off-roading to the next level.",
  whyText: "We try to offer you a variety of content. Overcoming difficult roads, beautiful views, historical places and hiking.",
  why: [
    {
      title: "High quality shooting",
      text: "We strive to bring the beauty of nature to you with maximum accuracy, so that you experience the same thing we experience at that moment.",
    },
    {
      title: "Latest model cars",
      text: "The cars in the video are the latest models, and interest in new models is much higher given their capabilities.",
    },
    {
      title: "Team professionalism",
      text: "High-quality equipment and new cars would be useless without an experienced team. We try to choose the location well, record it, film it, and deliver it to you.",
    },
  ],
  experienceEyebrow: "Experience and capabilities",
  experienceTitle: "Where the road ends, adventures begin",
  experienceText: "In this section you will see the percentage of places we have photographed across Georgia, we will try to maintain maximum accuracy.",
  experienceImage: "/media/wranglermain1.jpg",
  tripsLabel: "გასვლა",
  trips: 10,
  regions: [
    { name: "Mtskheta Mtianeti", value: 2 },
    { name: "Upper Svaneti", value: 1 },
    { name: "Samegrelo", value: 2 },
    { name: "Samtskhe-Javakheti", value: 2 },
    { name: "Shida Kartli", value: 2 },
    { name: "Imereti", value: 2 },
    { name: "Kvemo Kartli", value: 0 },
    { name: "Kakheti", value: 1 },
    { name: "Lower Svaneti", value: 1 },
    { name: "Adjara", value: 1 },
    { name: "Abkhazia", value: 0 },
    { name: "Guria", value: 1 },
    { name: "Racha-Lechkhumi", value: 1 },
  ],
  partners: [
    { src: "/media/amboli.jpg", alt: "ამბოლი" },
    { src: "/media/waitingpartners-2.jpg", alt: "" },
    { src: "/media/waitingpartners-1.jpg", alt: "" },
  ],
  ctaTitle: "We create unforgettable memories in your off-road adventures.",
  ctaText: "Our team is ready to organize an off-road tour for you upon private request, where you will enjoy the beauty and feel the adrenaline.",
  ctaImage: "/media/paralaxmain1.jpg",
  comments: [
    {
      name: "davidmachavariani2415",
      text: "ძალიან საინტერესო და კარგი საყურებელია ქართული ოვერლენდ პროექტები, მადლობა ამ კადრებისთვის, არ გაჩერდეთ",
      image: "/media/channels4_profile.jpg",
      url: "https://www.youtube.com/watch?v=NwpZAuhRMbM&t=430s",
    },
    {
      name: "tamar_uguzashvili",
      text: "ძალიან მომწონს თქვენი არხი, წარმატებები",
      image: "/media/ycoment2.jpg",
      url: "https://www.youtube.com/@Mandraginda",
    },
    {
      name: "giorgikaxadze8580",
      text: "დიდი სიამოვნებით წამოგყვბოდით, ჩემი მანქანით, შედარებით მსუბუქ ოფროუდ გზაზე. რა თქმა უნდა თქვენი ბუქსირის და მანქანების იმედზე",
      image: "/media/ycoment3.jpg",
      url: "https://www.youtube.com/@Mandraginda",
    },
  ],
  gallery: [
    "/media/maingalerea1.jpg",
    "/media/maingalerea2.jpg",
    "/media/maingalerea3.jpg",
    "/media/maingalerea4.jpg",
    "/media/maingalerea5.jpg",
    "/media/maingalerea6.jpg",
  ],
  newsEyebrow: "News and articles",
  newsTitle: "Learn more about off-roading",
  newsText: "We will try to provide you with news about off-road as soon as possible.",
  socials: {
    youtube: "https://www.youtube.com/@Mandraginda",
    tiktok: "https://www.tiktok.com/@mandraginda1",
    instagram: "https://www.instagram.com/mand_raginda",
    facebook: "https://www.facebook.com/profile.php?id=61564094200903",
    map: "https://mudmap.ge/",
  },
};

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function getHome(db) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'home'").get();
  if (!row) return copy(homeDefaults);
  try {
    return Object.assign(copy(homeDefaults), JSON.parse(row.value));
  } catch (error) {
    return copy(homeDefaults);
  }
}

function saveHome(db, home) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('home', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(
    JSON.stringify(home)
  );
}

module.exports = { homeDefaults, getHome, saveHome };
