// Prototype configuration. Replace the browser voice with approved recordings
// and reviewed sentence timings before using this page in a study.
const USE_RECORDED_AUDIO = false;
const ENABLE_COLOR_CONTROL = false;

const CONDITIONS = Object.freeze({
  "1": { risk: "high", control: true, tone: "warm" },
  "2": { risk: "high", control: true, tone: "competence" },
  "3": { risk: "high", control: false, tone: "warm" },
  "4": { risk: "high", control: false, tone: "competence" },
  "5": { risk: "low", control: true, tone: "warm" },
  "6": { risk: "low", control: true, tone: "competence" },
  "7": { risk: "low", control: false, tone: "warm" },
  "8": { risk: "low", control: false, tone: "competence" },
});

const warmOpening = [
  "Welcome aboard!",
  "So glad you're riding with me today.",
  "I'll be keeping a close eye on the road the whole way.",
  "I've worked out how to get you there.",
  "I'll keep checking in on it throughout the ride, so you can relax and feel comfortable.",
];

const competenceOpening = [
  "Welcome.",
  "All systems have been checked and are operating normally.",
  "This car uses a 360-degree sensor suite to monitor the road, processing over 1,000 environmental data points per second.",
  "Your route has been calculated, verified, and is being continuously re-optimized in real time.",
];

const SCRIPTS = Object.freeze({
  "present-warm": {
    audio: "./assets/audio/present-warm.mp3",
    cues: [],
    sentences: [
      ...warmOpening,
      "You'll also see a Pull Over button on the screen.",
      "If anything unexpected comes up and you'd like to stop, you may use it to pull over the car immediately.",
      ...(ENABLE_COLOR_CONTROL ? ["You can also change how the screen looks."] : []),
      "Alright, let's buckle up and get started!",
    ],
  },
  "present-competence": {
    audio: "./assets/audio/present-competence.mp3",
    cues: [],
    sentences: [
      ...competenceOpening,
      "The interface also includes a Pull Over button.",
      "In the event of an unexpected situation, it may be used to bring the vehicle to an immediate stop.",
      ...(ENABLE_COLOR_CONTROL ? ["The interface style may also be adjusted."] : []),
      "Please secure your seatbelt; the ride will now begin.",
    ],
  },
  "absent-warm": {
    audio: "./assets/audio/absent-warm.mp3",
    cues: [],
    sentences: [
      ...warmOpening,
      "This ride is fully automated from start to finish, so there's nothing for you to do or adjust, just sit back and enjoy the ride.",
      "Alright, let's buckle up and get started!",
    ],
  },
  "absent-competence": {
    audio: "./assets/audio/absent-competence.mp3",
    cues: [],
    sentences: [
      ...competenceOpening,
      "This ride is fully automated, with no manual controls or adjustments involved.",
      "Please secure your seatbelt; the ride will now begin.",
    ],
  },
});

const conditionId = new URLSearchParams(window.location.search).get("condition");
const condition = Object.hasOwn(CONDITIONS, conditionId) ? CONDITIONS[conditionId] : null;
const app = document.querySelector("#app");
if (!condition) {
  document.querySelector("#invalid-link").hidden = false;
} else {
  app.hidden = false;
  initialize(condition);
}

function initialize(selected) {
  const script = SCRIPTS[`${selected.control ? "present" : "absent"}-${selected.tone}`];
  const get = (id) => document.getElementById(id);
  const caption = get("caption");
  const startButton = get("start-button");
  const dialog = get("pull-over-dialog");
  const recordedAudio = get("recorded-audio");
  const scene = get("scene-image");
  let state = "loading";
  let stateBeforeDialog = "ready";
  let sentenceIndex = 0;
  let speechGeneration = 0;
  let advanceAfterDialog = false;
  let resourcesReady = false;
  let failedResource = false;

  document.body.dataset.risk = selected.risk;
  document.body.dataset.audioMode = USE_RECORDED_AUDIO ? "recorded" : "browser-preview";
  get("control-area").hidden = !selected.control;
  scene.alt = selected.risk === "high"
    ? "Rain on the passenger window of a parked car, overlooking a wet street at night."
    : "View through the passenger window of a parked car onto a clear, dry street at midday.";

  function setState(next) {
    state = next;
    app.dataset.state = next;
    const labels = {
      loading: ["Preparing introduction…", "Loading…"],
      ready: ["Ready to play", "Start introduction"],
      playing: ["Playing introduction", "Playing introduction"],
      "paused-for-dialog": ["Introduction paused", "Introduction paused"],
      finished: ["Complete", "Introduction complete"],
      "audio-error": ["Unable to play", "Retry introduction"],
    };
    get("message-state").textContent = labels[next][0];
    get("start-label").textContent = labels[next][1];
    startButton.disabled = !["ready", "audio-error"].includes(next);
    startButton.hidden = ["playing", "paused-for-dialog", "finished"].includes(next);
    get("finish-notice").hidden = next !== "finished";
  }

  function progress(value) {
    const percent = Math.max(0, Math.min(100, value));
    get("audio-progress").value = percent;
    get("progress-label").textContent = percent > 0 ? `${Math.round(percent)}%` : "";
  }

  function cancelSpeech() {
    speechGeneration += 1;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function showError(message, resource = false) {
    cancelSpeech();
    recordedAudio.pause();
    failedResource = resource;
    get("voice-error").textContent = message;
    get("voice-error").hidden = false;
    caption.textContent = "The introduction could not load. Please try again.";
    if (dialog.open) dialog.close();
    setState("audio-error");
  }

  function finish() {
    if (state !== "playing") return;
    caption.textContent = script.sentences.at(-1);
    progress(100);
    setState("finished");
  }

  function updateRecordedCaption() {
    if (!USE_RECORDED_AUDIO || state !== "playing") return;
    let index = 0;
    for (let i = 0; i < script.cues.length; i += 1) {
      if (recordedAudio.currentTime >= script.cues[i]) index = i;
    }
    caption.textContent = script.sentences[index];
    if (Number.isFinite(recordedAudio.duration) && recordedAudio.duration > 0) {
      progress(recordedAudio.currentTime / recordedAudio.duration * 100);
    }
  }

  function speakNextSentence() {
    if (state !== "playing") return;
    if (sentenceIndex >= script.sentences.length) { finish(); return; }
    caption.textContent = script.sentences[sentenceIndex];
    progress(sentenceIndex / script.sentences.length * 100);
    const generation = speechGeneration;
    const utterance = new SpeechSynthesisUtterance(script.sentences[sentenceIndex]);
    utterance.lang = "en-US";
    utterance.rate = selected.tone === "warm" ? 0.94 : 0.98;
    utterance.pitch = selected.tone === "warm" ? 1.08 : 0.94;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang === "en-US") ?? voices.find((v) => v.lang.startsWith("en"));
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (generation !== speechGeneration) return;
      sentenceIndex += 1;
      if (state === "paused-for-dialog") advanceAfterDialog = true;
      else speakNextSentence();
    };
    utterance.onerror = (event) => {
      if (generation === speechGeneration && !["interrupted", "canceled"].includes(event.error)) {
        showError("Your browser could not play the audio. Please try again.");
      }
    };
    window.speechSynthesis.speak(utterance);
  }

  async function prepare() {
    resourcesReady = false;
    failedResource = false;
    get("voice-error").hidden = true;
    setState("loading");
    try {
      await new Promise((resolve, reject) => {
        scene.onload = resolve;
        scene.onerror = () => reject(new Error("The scene could not load. Check your connection and retry."));
        scene.src = `./assets/scenes/${selected.risk === "high" ? "rainy-night" : "sunny-day"}.png`;
      });
      if (USE_RECORDED_AUDIO) {
        if (script.cues.length !== script.sentences.length || script.cues[0] !== 0 ||
            script.cues.some((cue, i) => !Number.isFinite(cue) || cue < 0 || (i > 0 && cue <= script.cues[i - 1]))) {
          throw new Error("The introduction recording has not been configured correctly.");
        }
        await new Promise((resolve, reject) => {
          const clean = () => { recordedAudio.removeEventListener("canplay", ready); recordedAudio.removeEventListener("error", error); };
          const ready = () => { clean(); resolve(); };
          const error = () => { clean(); reject(new Error("The audio could not load. Check your connection and retry.")); };
          recordedAudio.addEventListener("canplay", ready);
          recordedAudio.addEventListener("error", error);
          recordedAudio.src = script.audio;
          recordedAudio.load();
        });
      }
      resourcesReady = true;
      caption.textContent = "Select “Start introduction” to begin.";
      if (dialog.open) stateBeforeDialog = "ready";
      else setState("ready");
    } catch (error) { showError(error.message, true); }
  }

  async function start() {
    if (!["ready", "audio-error"].includes(state)) return;
    if (failedResource || !resourcesReady) { await prepare(); return; }
    get("voice-error").hidden = true;
    sentenceIndex = 0;
    advanceAfterDialog = false;
    progress(0);
    if (USE_RECORDED_AUDIO) {
      recordedAudio.currentTime = 0;
      caption.textContent = script.sentences[0];
      setState("playing");
      try { await recordedAudio.play(); }
      catch { showError("The audio could not start. Please try again."); }
    } else {
      if (!("speechSynthesis" in window)) {
        showError("This browser cannot play the preview audio. Please use a supported desktop browser.");
        return;
      }
      cancelSpeech();
      window.speechSynthesis.resume();
      setState("playing");
      speakNextSentence();
    }
  }

  startButton.addEventListener("click", start);
  recordedAudio.addEventListener("timeupdate", updateRecordedCaption);
  recordedAudio.addEventListener("ended", () => {
    if (state === "paused-for-dialog") advanceAfterDialog = true;
    else finish();
  });
  recordedAudio.addEventListener("error", () => {
    if (USE_RECORDED_AUDIO && ["playing", "paused-for-dialog"].includes(state)) {
      showError("The audio could not continue. Please try again.");
    }
  });
  get("pull-over-button").addEventListener("click", () => {
    stateBeforeDialog = state;
    advanceAfterDialog = false;
    if (state === "playing") {
      if (USE_RECORDED_AUDIO) recordedAudio.pause();
      else window.speechSynthesis.pause();
    }
    setState("paused-for-dialog");
    dialog.showModal();
  });
  get("close-dialog-button").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    if (state !== "paused-for-dialog") return;
    setState(stateBeforeDialog);
    if (state !== "playing") return;
    if (USE_RECORDED_AUDIO) {
      if (advanceAfterDialog || recordedAudio.ended) finish();
      else recordedAudio.play().catch(() => showError("The audio could not resume. Please try again."));
    } else {
      window.speechSynthesis.resume();
      if (advanceAfterDialog) speakNextSentence();
    }
    advanceAfterDialog = false;
  });
  window.addEventListener("pagehide", () => { recordedAudio.pause(); cancelSpeech(); });
  prepare();
}
