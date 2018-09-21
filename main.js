let listContainer = document.getElementById('listContainer');
let currentPage = 1;
let perDay = 12;
let loadingProducts = true;
let aboutSteemHunt = document.getElementById('aboutSteemHunt');
let head = document.getElementsByTagName('head')[0];

function get(url) {
  return new Promise(function(resolve, reject) {
    var req = new XMLHttpRequest();
    req.open('GET', url);

    req.onload = function() {
      if (req.status == 200) {
        resolve(req.response);
      }
      else {
        reject(Error(req.statusText));
      }
    };

    req.onerror = function() {
      reject(Error("Network Error"));
    };

    req.send();
  });
}

function getDistFromBottom () {
  var scrollPosition = window.pageYOffset;
  var windowSize     = window.innerHeight;
  var bodyHeight     = document.body.offsetHeight;

  return Math.max(bodyHeight - (scrollPosition + windowSize), 0);
}

function formatFloat(num) {
  return num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')
}

function formatInt(num) {
  return num.toFixed(0).replace(/\d(?=(\d{3})+\.)/g, '$&,')
}

function daysAgoToString(daysAgo) {
  if (daysAgo === -1) {
    return 'Most Recent';
  }
  if (daysAgo === 0) {
    return 'Today';
  }
  if (daysAgo === 1) {
    return 'Yesterday'
  }
  const date = new Date(new Date() - 86400000 * daysAgo);
  // Return weekday if less than a week
  if (daysAgo < 7) {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return weekdays[date.getDay()];
  }
  return moment(date).format('MMMM Do');
}

function loadDefault() {
  aboutSteemHunt.insertAdjacentHTML('beforeend', `
    <img src=${chrome.extension.getURL('images/logo.png')}>
    <div>
      <h1 class="primary-text">Steemhunt</h1>
      <p class="normal-text">Daily Ranking for Effortlessly Cool Products<br>That Rewards Hunters</p>
    </div>
  `);
  chrome.storage.sync.get('darkMode', function(data) {
    toggleDarkCss(data.darkMode);
  });
}

function productTemplate(product) {
  const upvoteIcon = '<svg viewBox="64 64 896 896" class="" data-icon="up" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M890.5 755.3L537.9 269.2c-12.8-17.6-39-17.6-51.7 0L133.5 755.3A8 8 0 0 0 140 768h75c5.1 0 9.9-2.5 12.9-6.6L512 369.8l284.1 391.6c3 4.1 7.8 6.6 12.9 6.6h75c6.5 0 10.3-7.4 6.5-12.7z"></path></svg>';
  const talkIcon = '<svg viewBox="64 64 896 896" class="" data-icon="message" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M464 512a48 48 0 1 0 96 0 48 48 0 1 0-96 0zm200 0a48 48 0 1 0 96 0 48 48 0 1 0-96 0zm-400 0a48 48 0 1 0 96 0 48 48 0 1 0-96 0zm661.2-173.6c-22.6-53.7-55-101.9-96.3-143.3a444.35 444.35 0 0 0-143.3-96.3C630.6 75.7 572.2 64 512 64h-2c-60.6.3-119.3 12.3-174.5 35.9a445.35 445.35 0 0 0-142 96.5c-40.9 41.3-73 89.3-95.2 142.8-23 55.4-34.6 114.3-34.3 174.9A449.4 449.4 0 0 0 112 714v152a46 46 0 0 0 46 46h152.1A449.4 449.4 0 0 0 510 960h2.1c59.9 0 118-11.6 172.7-34.3a444.48 444.48 0 0 0 142.8-95.2c41.3-40.9 73.8-88.7 96.5-142 23.6-55.2 35.6-113.9 35.9-174.5.3-60.9-11.5-120-34.8-175.6zm-151.1 438C704 845.8 611 884 512 884h-1.7c-60.3-.3-120.2-15.3-173.1-43.5l-8.4-4.5H188V695.2l-4.5-8.4C155.3 633.9 140.3 574 140 513.7c-.4-99.7 37.7-193.3 107.6-263.8 69.8-70.5 163.1-109.5 262.8-109.9h1.7c50 0 98.5 9.7 144.2 28.9 44.6 18.7 84.6 45.6 119 80 34.3 34.3 61.3 74.4 80 119 19.4 46.2 29.1 95.2 28.9 145.8-.6 99.6-39.7 192.9-110.1 262.7z"></path></svg>';
  return template = `
    <div class="product-container">
      <a href=${'https://steemhunt.com/@' + product.author + '/' + product.permlink}>
        <div class="image-overlay"></div>
        <img src=${product.images[0].link} />
        <h3 class="primary-text">${product.title}</h3>
        <p class="normal-text">${product.tagline}</p>
        <div class="huntinfo-container">
          <span class="primary-text">${"$" + formatFloat(Math.round(product.payout_value*100)/100)}</span>
          <span class="normal-text svg-icon">${upvoteIcon}</span>
          <span class="normal-text">${formatInt(product.children)}</span>
          <span class="normal-text svg-icon">${talkIcon}</span>
          <span class="normal-text">${formatInt(product.valid_votes.length)}</span>
        </div>
      </a>
    </div>
  `;
}

function productListTemplate(products, day) {
  let productsTemplate = '';
  let totalPayout = 0;
  for (let product of products) {
    productsTemplate += productTemplate(product)
  }
  products.forEach(function(pp) { totalPayout = totalPayout + pp.payout_value })
  listContainer.insertAdjacentHTML('beforeend', `
    <div class="products-title-container">
      <h2 class="primary-text">${daysAgoToString(day)}</h2>
      <p class="normal-text"><span class="bold-text">${formatInt(products.length)}</span> products. <span class="bold-text">$${formatFloat(totalPayout)}</span> SBD hunter's rewards were generated.</p>
    </div>
    <div class="products-container" id=${'productsContainer' + day}>
      ${productsTemplate}
    </div>
  `)
}

function getPosts(day) {
  loadingProducts = true;
  get("https://api.steemhunt.com/posts.json?days_ago=" + day + "&top=12").then(function(res) {
    console.log(res);
    const response = JSON.parse(res);
    productListTemplate(response.posts, day);
    loadingProducts = false;
  })
}

function nextPage() {
  currentPage += 1;
  getPosts(currentPage);
}

function toggleDarkCss(darkMode) {
  const darkStyle = document.querySelector("link[href='dark.css']");
  if (darkMode) { // to dark mode
    head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="dark.css">');
  } else if (darkStyle !== null) { // to light mode
    darkStyle.remove();
  }
}

document.getElementById('darkModeToggler').addEventListener('click', function() {
  chrome.storage.sync.get('darkMode', function(data) {
    chrome.storage.sync.set({darkMode: !data.darkMode}, function() {
      toggleDarkCss(!data.darkMode);
    })
  });
});

document.addEventListener('scroll', function() {
  distToBottom = getDistFromBottom();
  if (!loadingProducts && distToBottom > 0 && distToBottom <= 5000) {
    nextPage();
  }
});

loadDefault();
getPosts(currentPage);
