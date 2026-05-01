const SITE_CONFIG = {
  birthday: {
    month: 4,
    day: 2,
  },
  slideshowIntervalMs: 2400,
  scan: {
    directory: "images",
    maxIndex: 40,
    extensions: ["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"],
  },
};

const answer = document.querySelector("#answer");
const subtitle = document.querySelector("#subtitle");
const photo = document.querySelector("#photo-base");
const photoOverlay = document.querySelector("#photo-overlay");
const hero = document.querySelector(".hero");
const canvas = document.querySelector("#confetti-canvas");
const favicon = document.querySelector("#dynamic-favicon");
const testToggle = document.querySelector(".test-toggle");
const toggleButtons = document.querySelectorAll("[data-test-mode]");

const today = new Date();
const isBirthday =
  today.getMonth() === SITE_CONFIG.birthday.month &&
  today.getDate() === SITE_CONFIG.birthday.day;

let slideshowTimer = null;
let confettiFrame = null;
let confettiCleanup = null;
let photoTransitionToken = 0;

initializeSite();

async function initializeSite() {
  setupTestModeUi();

  const [partyPhotos, nopePhotos] = await Promise.all([
    discoverImages("ja"),
    discoverImages("nee"),
  ]);

  const nopePhoto = nopePhotos[0] || "images/nee-1.jpg";
  const selectedMode = getSelectedMode();

  bindTestToggle(() => applyMode({ partyPhotos, nopePhoto }));
  applyMode({ partyPhotos, nopePhoto, selectedMode });
}

function applyMode({ partyPhotos, nopePhoto, selectedMode = getSelectedMode() }) {
  stopEffects();
  updateToggleState(selectedMode);

  const showParty = selectedMode === "ja" || (selectedMode === "auto" && isBirthday);

  if (showParty) {
    enablePartyMode(partyPhotos, nopePhoto);
    return;
  }

  enableNopeMode(nopePhoto);
}

function enablePartyMode(partyPhotos, fallbackNopePhoto) {
  hero.dataset.mode = "party";
  answer.textContent = "JA";
  subtitle.textContent =
    "Het is 2 mei, de belangrijkste dag van het jaar! Trek de slingers scheef, ga in de lampen hangen en laat Dorrit schitteren.";
  setFavicon("images/favicon-ja.svg");
  transitionPhoto(partyPhotos[0] || fallbackNopePhoto, "Feestelijke Dorrit-foto");
  startSlideshow(partyPhotos);
  startConfetti();
}

function enableNopeMode(nopePhoto) {
  hero.dataset.mode = "nope";
  answer.textContent = "NEE";
  subtitle.textContent =
    "Vandaag nog niet. Blijf gerust hier wachten tot het zover is.";
  setFavicon("images/favicon-nee.svg");
  transitionPhoto(nopePhoto, "Dorrit wacht nog even op haar verjaardag");
}

function startSlideshow(partyPhotos) {
  if (partyPhotos.length < 2) {
    return;
  }

  let currentIndex = 0;
  slideshowTimer = window.setInterval(() => {
    currentIndex = (currentIndex + 1) % partyPhotos.length;
    transitionPhoto(partyPhotos[currentIndex], "Feestelijke Dorrit-foto");
  }, SITE_CONFIG.slideshowIntervalMs);
}

async function discoverImages(prefix) {
  const candidates = [];

  for (let index = 1; index <= SITE_CONFIG.scan.maxIndex; index += 1) {
    for (const extension of SITE_CONFIG.scan.extensions) {
      candidates.push(
        `${SITE_CONFIG.scan.directory}/${prefix}-${index}.${extension}`
      );
    }
  }

  const results = await Promise.all(candidates.map(checkImageExists));
  return candidates.filter((candidate, index) => results[index]);
}

function checkImageExists(src) {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

function transitionPhoto(nextSrc, nextAlt) {
  const transitionToken = photoTransitionToken + 1;
  photoTransitionToken = transitionToken;

  if (photo.src.endsWith(nextSrc)) {
    photo.alt = nextAlt;
    return;
  }

  const preloadImage = new Image();
  preloadImage.onload = () => {
    if (transitionToken !== photoTransitionToken) {
      return;
    }

    photoOverlay.src = nextSrc;
    photoOverlay.classList.add("is-transitioning");
    window.requestAnimationFrame(() => {
      if (transitionToken !== photoTransitionToken) {
        return;
      }
      photoOverlay.style.opacity = "1";
    });
    window.setTimeout(() => {
      if (transitionToken !== photoTransitionToken) {
        return;
      }
      photo.src = nextSrc;
      photo.alt = nextAlt;
      photoOverlay.style.opacity = "0";
      window.setTimeout(() => {
        if (transitionToken !== photoTransitionToken) {
          return;
        }
        photoOverlay.classList.remove("is-transitioning");
      }, 920);
    }, 560);
  };
  preloadImage.onerror = () => {
    photo.src = nextSrc;
    photo.alt = nextAlt;
  };
  preloadImage.src = nextSrc;
}

function startConfetti() {
  if (!canvas || !canvas.getContext) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    return;
  }

  const context = canvas.getContext("2d");
  const particles = [];
  const colors = ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#ff7b54"];
  const burstColors = ["#ffffff", "#ef476f", "#ffd166", "#06d6a0", "#118ab2"];
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const createPiece = () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    size: Math.random() * 12 + 5,
    color: colors[Math.floor(Math.random() * colors.length)],
    tilt: Math.random() * 10 - 5,
    velocityX: Math.random() * 3.2 - 1.6,
    velocityY: Math.random() * 3.2 + 2.4,
    rotate: Math.random() * Math.PI,
    spin: Math.random() * 0.08 + 0.02,
  });

  const createBurstPiece = () => ({
    x: Math.random() * canvas.width,
    y: -20,
    size: Math.random() * 8 + 4,
    color: burstColors[Math.floor(Math.random() * burstColors.length)],
    velocityX: Math.random() * 7 - 3.5,
    velocityY: Math.random() * 2.8 + 2.8,
    rotate: Math.random() * Math.PI,
    spin: Math.random() * 0.16 + 0.04,
    gravity: 0.05,
    burst: true,
  });

  const drawPiece = (piece) => {
    context.save();
    context.translate(piece.x, piece.y);
    context.rotate(piece.rotate);
    context.fillStyle = piece.color;
    context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6);
    context.restore();
  };

  const tick = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((piece) => {
      piece.x += piece.velocityX;
      piece.y += piece.velocityY;
      piece.rotate += piece.spin;
      piece.tilt += Math.sin(piece.rotate) * 0.12;

      if (piece.burst) {
        piece.velocityY += piece.gravity;
      }

      if (piece.y > canvas.height + 24) {
        if (piece.burst) {
          Object.assign(piece, createBurstPiece(), { y: -20 });
        } else {
          piece.y = -20;
          piece.x = Math.random() * canvas.width;
        }
      }

      drawPiece(piece);
    });

    if (Math.random() < 0.18 && particles.length < 260) {
      particles.push(createBurstPiece());
    }

    confettiFrame = window.requestAnimationFrame(tick);
  };

  resizeCanvas();
  for (let index = 0; index < 190; index += 1) {
    particles.push(createPiece());
  }
  for (let index = 0; index < 28; index += 1) {
    particles.push(createBurstPiece());
  }

  window.addEventListener("resize", resizeCanvas);
  confettiCleanup = () => {
    window.removeEventListener("resize", resizeCanvas);
    if (confettiFrame) {
      window.cancelAnimationFrame(confettiFrame);
      confettiFrame = null;
    }
  };
  tick();

  window.addEventListener(
    "beforeunload",
    () => {
      if (slideshowTimer) {
        window.clearInterval(slideshowTimer);
      }
      if (confettiCleanup) {
        confettiCleanup();
        confettiCleanup = null;
      }
    },
    { once: true }
  );
}

function stopEffects() {
  photoTransitionToken += 1;

  if (slideshowTimer) {
    window.clearInterval(slideshowTimer);
    slideshowTimer = null;
  }

  if (confettiCleanup) {
    confettiCleanup();
    confettiCleanup = null;
  }

  if (canvas && canvas.getContext) {
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  photoOverlay.style.opacity = "0";
  photoOverlay.classList.remove("is-transitioning");
}

function getSelectedMode() {
  if (!isLocalEnvironment()) {
    return "auto";
  }

  const params = new URLSearchParams(window.location.search);
  const queryMode = params.get("test");

  if (queryMode === "ja" || queryMode === "nee" || queryMode === "auto") {
    return queryMode;
  }

  const storedMode = window.localStorage.getItem("dorrit-test-mode");
  if (storedMode === "ja" || storedMode === "nee" || storedMode === "auto") {
    return storedMode;
  }

  return "auto";
}

function bindTestToggle(onChange) {
  if (!testToggle) {
    return;
  }

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.testMode;
      window.localStorage.setItem("dorrit-test-mode", nextMode);
      onChange();
    });
  });
}

function updateToggleState(selectedMode) {
  toggleButtons.forEach((button) => {
    const isActive = button.dataset.testMode === selectedMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setFavicon(href) {
  if (!favicon) {
    return;
  }

  favicon.href = href;
}

function setupTestModeUi() {
  if (!testToggle) {
    return;
  }

  testToggle.hidden = !isLocalEnvironment();
}

function isLocalEnvironment() {
  const { hostname, protocol } = window.location;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "" ||
    protocol === "file:"
  );
}
