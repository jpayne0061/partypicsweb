let serverUrl = "https://partypics.azurewebsites.net";

let passcode = "";

const width = window.screen.width - 50;
const powerUpvoterLimit = 5;
let showPowerUpvoteMessage = true;
let height = 0;
let streaming = false;
let video = null;
let canvas = null;
let photo = null;
let startbutton = null;
let nav = null;
let photos = [];
let facingMode = "user";
let cameraFlip = null;

let userInfo = window.localStorage.getItem("dumprInfo")
  ? JSON.parse(window.localStorage.getItem("dumprInfo"))
  : {
      lifetimeUpvotes: 0,
      downVotesRemaining: 0,
      currentUpvoteStreak: 0,
      lifetimeDownvotes: 0,
    };
let lifetimeUpvotes = userInfo.lifetimeUpvotes;
let currentUpvoteStreak = userInfo.currentUpvoteStreak;
let downVotesRemaining = userInfo.downVotesRemaining;
let lifetimeDownvotes = userInfo.lifetimeDownvotes;

function joinParty() {
  passcode = document.getElementById("passcodeInput").value;

  document.getElementById("createpartypasscode").style.display = "none";
  document.getElementById("passcodeinput").style.display = "none";
  showLoader(true);
  renderNav(true);

  hideLogo();

  fetch(serverUrl + "/Pics?passcode=" + passcode, {
    method: "GET",
    headers: {
      accept: "text/plain",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      photos = data;
      renderPhotos();
      showLoader(false);
    })
    .catch((error) => {
      alert("Whoopsy! failed to get them pitchers");
      showLoader(false);
      document.getElementById("createpartypasscode").style.display = "flex";
      document.getElementById("passcodeinput").style.display = "flex";
      console.error("Error fetching images:", error);
    });
}

function showStream() {
  document.getElementById("streamdiv").style.display = "flex";

  document.getElementById("addphoto").style.display = "none";

  document.getElementById("imagesContainer").style.display = "none";
}

function renderPhotos() {
  addphoto.style.display = "block";

  document.getElementById("imagesContainer").style.display = "flex";
  document.getElementById("passcodeinput").style.display = "none";
  document.getElementById("streamdiv").style.display = "none";

  const container = document.getElementById("imagesContainer");

  container.replaceChildren();

  const placeholder = document.createElement("div");
  placeholder.classList.add("placeholder");

  container.appendChild(placeholder);

  photos.forEach((image) => {
    const picId = image.picInfo?.picId;
    const picGuid = image.picInfo?.picGuid;
    const party = image.picInfo?.party;
    const numOfPoints = image.picInfo?.numberOfPoints || 0;

    const imageCard = document.createElement("div");
    imageCard.classList.add("image-card");

    const img = document.createElement("img");
    img.src = `${image.file}`;
    img.classList.add("photo");

    const upVoteButton = document.createElement("button");
    upVoteButton.innerText = "UPVOTE";
    upVoteButton.classList.add("upvote-button");
    upVoteButton.addEventListener("click", () =>
      handleUpVote(picId, picGuid, party)
    );

    const downVoteButton = document.createElement("button");
    downVoteButton.innerText = "DOWNVOTE";
    downVoteButton.classList.add("downvote-button");
    downVoteButton.addEventListener("click", () => {
      handleDownVote(picId, picGuid, party);
    });

    if (downVotesRemaining > 0) {
      downVoteButton.style.display = "block";
    }

    const voteDisplayContainer = document.createElement("div");
    voteDisplayContainer.classList.add("vote-container");

    const voteDisplay = document.createElement("div");
    voteDisplay.classList.add("vote-display");
    voteDisplay.id = picGuid;
    voteDisplay.textContent = numOfPoints;

    const voteText = document.createElement("div");
    voteText.textContent = "UPVOTES: ";

    voteDisplayContainer.appendChild(voteText);
    voteDisplayContainer.appendChild(voteDisplay);

    const imageFooter = document.createElement("div");
    imageFooter.classList.add("image-footer");

    imageCard.appendChild(img);
    imageFooter.appendChild(voteDisplayContainer);
    imageFooter.appendChild(downVoteButton);
    imageFooter.appendChild(upVoteButton);
    imageCard.appendChild(imageFooter);

    container.appendChild(imageCard);
  });
}

const handleUpVote = async (picId, picGuid, party) => {
  const voteDisplayForPic = document.getElementById(picGuid);
  const lifetime = document.getElementById("lifetime-upvotes");
  const downVotesLeftDisplay = document.getElementById("downvotes-left");

  lifetimeUpvotes = lifetimeUpvotes + 1;
  currentUpvoteStreak = currentUpvoteStreak + 1;
  voteDisplayForPic.textContent = +voteDisplayForPic.textContent + 1;

  lifetime.textContent = `Upvotes: ${lifetimeUpvotes}`;

  if (currentUpvoteStreak >= powerUpvoterLimit) {
    currentUpvoteStreak = 0;
    downVotesRemaining = downVotesRemaining + 1;
    downVotesLeftDisplay.textContent = `Downvotes left: ${downVotesRemaining}`;

    showDownVoteButtons(true);
  }

  syncLocalStorage();

  await fetch(`${serverUrl}/Vote`, {
    method: "PUT",
    headers: {
      accept: "*/*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      picId,
      partyName: party,
    }),
  });
};

async function handleDownVote(picId, picGuid, party) {
  const votesForPic = document.getElementById(picGuid);
  const downVotesLeft = document.getElementById("downvotes-left");
  const lifeTimeDownvoteDisplay = document.getElementById("lifetime-downvotes");

  downVotesRemaining = downVotesRemaining === 0 ? 0 : downVotesRemaining - 1;
  lifetimeDownvotes = lifetimeDownvotes + 1;

  votesForPic.textContent = +votesForPic.textContent - 1;
  downVotesLeft.textContent = `Downvotes left: ${downVotesRemaining}`;
  lifeTimeDownvoteDisplay.textContent = `Lifetime downvotes: ${lifetimeDownvotes}`;

  if (downVotesRemaining === 0) {
    showDownVoteButtons(false);
  }

  syncLocalStorage();

  await fetch(`${serverUrl}/Vote`, {
    method: "DELETE",
    headers: {
      accept: "*/*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      picId,
      partyName: party,
    }),
  });
}

function createParty() {
  passcode = document.getElementById("createpartypasscodeinput").value;

  hideLogo();
  renderNav(true);

  document.getElementById("createpartypasscode").style.display = "none";

  document.getElementById("passcodeinput").style.display = "none";

  showLoader(true);

  fetch(serverUrl + "/CreateParty", {
    method: "POST",
    headers: {
      accept: "*/*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      passcode: passcode,
    }),
  })
    .then((data) => {
      showLoader(false);
      document.getElementById("createpartypasscode").style.display = "none";

      document.getElementById("passcodeinput").style.display = "none";

      document.getElementById("addphoto").style.display = "block";
    })
    .catch((error) => {
      alert("Whoopsy, failed to create party!");
      showLoader(false);
      document.getElementById("createpartypasscode").style.display = "flex";
      document.getElementById("passcodeinput").style.display = "flex";
      console.error("Error:", error);
    });
}

const hideLogo = () => (document.getElementById("logo").style.display = "none");

function showViewLiveResultButton() {
  if (window.self !== window.top) {
    document.querySelector(".contentarea").remove();
    const button = document.createElement("button");
    button.textContent = "View live result of the example code above";
    document.body.append(button);
    button.addEventListener("click", () => window.open(location.href));
    return true;
  }
  return false;
}

function startCamera(facingMode) {
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: facingMode }, audio: false })
    .then((stream) => {
      video.srcObject = stream;
      video.play();
    })
    .catch((err) => {
      console.error(`An error occurred: ${err}`);
    });
}

function toggleCameraDirection() {
  if (facingMode === "user") {
    facingMode = "environment";
    startCamera(facingMode);
  } else {
    facingMode = "user";
    startCamera(facingMode);
  }
}

function startup() {
  if (showViewLiveResultButton()) {
    return;
  }

  video = document.getElementById("video");
  canvas = document.getElementById("canvas");
  photo = document.getElementById("photo");
  startbutton = document.getElementById("startbutton");
  upvoteDisplay = document.getElementById("lifetime-upvotes");
  nav = document.getElementById("nav-bar");
  cameraFlip = document.getElementById("flip-camera");

  cameraFlip.addEventListener("click", toggleCameraDirection);

  startCamera(facingMode);

  video.addEventListener(
    "canplay",
    (ev) => {
      if (!streaming) {
        height = video.videoHeight / (video.videoWidth / width);
        if (isNaN(height)) {
          height = width / (4 / 3);
        }
        video.setAttribute("width", width);
        video.setAttribute("height", height);
        canvas.setAttribute("width", width);
        canvas.setAttribute("height", height);
        streaming = true;
      }
    },
    false
  );

  startbutton.addEventListener(
    "click",
    (ev) => {
      takepicture();
      ev.preventDefault();
    },
    false
  );

  clearphoto();
}

function clearphoto() {
  const context = canvas.getContext("2d");
  context.fillStyle = "#AAA";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const data = canvas.toDataURL("image/png");
  photo.setAttribute("src", data);
}

function takepicture() {
  const context = canvas.getContext("2d");
  if (width && height) {
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    const data = canvas.toDataURL("image/png");

    document.getElementById("streamdiv").style.display = "none";
    showLoader(true);

    fetch(serverUrl + "/Pics", {
      method: "POST",
      headers: {
        accept: "*/*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        passcode: passcode,
        image: data,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        showLoader(false);

        photos = data;
        renderPhotos();
      })
      .catch((error) => {
        alert("FAILED TO POST PIC :(. Try again?");
        document.getElementById("streamdiv").style.display = "flex";
        console.error("Error:", error);
      });

    photo.setAttribute("src", data);
  } else {
    clearphoto();
  }
}

function showLoader(show) {
  const loader = document.getElementById("loader");

  if (show) {
    return (loader.style.display = "inline-block");
  }

  loader.style.display = "none";
}

function renderNav(show) {
  nav.replaceChildren();

  if (show) {
    const lifeTimeUpvoteDisplay = document.createElement("div");
    lifeTimeUpvoteDisplay.id = "lifetime-upvotes";
    lifeTimeUpvoteDisplay.textContent = `Upvotes: ${lifetimeUpvotes}`;

    const downVoteContainer = document.createElement("div");
    downVoteContainer.classList.add("downvote-container");

    const downVotesLeft = document.createElement("div");
    downVotesLeft.id = "downvotes-left";
    downVotesLeft.textContent = `Downvotes left: ${downVotesRemaining}`;

    const lifeTimeDownvoteDisplay = document.createElement("div");
    lifeTimeDownvoteDisplay.id = "lifetime-downvotes";
    lifeTimeDownvoteDisplay.textContent = `Lifetime Downvotes: ${lifetimeDownvotes}`;

    downVoteContainer.appendChild(downVotesLeft);
    downVoteContainer.appendChild(lifeTimeDownvoteDisplay);

    nav.appendChild(lifeTimeUpvoteDisplay);

    nav.appendChild(downVoteContainer);

    nav.style.display = "flex";
    return;
  }

  nav.style.display = "none";
}

function syncLocalStorage() {
  window.localStorage.setItem(
    "dumprInfo",
    JSON.stringify({
      downVotesRemaining,
      lifetimeUpvotes,
      currentUpvoteStreak,
      lifetimeDownvotes,
    })
  );
}

function showDownVoteButtons(show) {
  const btns = document.querySelectorAll(".downvote-button");

  if (show) {
    btns.forEach((button) => {
      button.style.display = "block";
    });
    return;
  }

  btns.forEach((button) => {
    button.style.display = "none";
  });
}

window.addEventListener("load", startup, false);
