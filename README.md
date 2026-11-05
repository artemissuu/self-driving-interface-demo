# Passenger interface — November 5, 2026

Eight-condition, desktop research prototype. Two steps within each `?condition=1`–`8` link: a silent car interior introduction, then the passenger display with fixed recorded narration and timed captions.

## Preview

Online review: https://artemissuu.github.io/self-driving-interface-demo/review.html

Voice auditions: https://artemissuu.github.io/self-driving-interface-demo/voice-review.html

For a local preview of the public repository, run `python3 -m http.server 8000 --bind 127.0.0.1` in this directory and keep the server running. Open http://127.0.0.1:8000/review.html for all eight conditions and four current recordings. Below 700×560 CSS pixels the desktop canvas scrolls; the study is not validated for phones.

All participant pages, researcher review pages, and public repository documentation use English.

The voice audition page contains six short candidates: Lauren, Jessica, and Sarah, each with Warm and Competence delivery. It also includes two full recordings of the current Kokoro af_heart voice for reference. The short candidates use a shared neutral script; the current recordings use the experiment scripts. Voice selection remains pending, and the participant recordings have not been replaced.

## Conditions and content

`stimuli.json` is the source of truth. Conditions 1–4: rainy night / 7:30 PM / dark map. Conditions 5–8: sunny day / 11:30 AM / light map. Pull Over in 1,2,5,6 only. Odd conditions use warmth framing; even conditions competence. Four audio files are shared across environment pairs.

The four original no-color-control scripts are retained verbatim. `assets/audio/manifest.json` contains sample-based sentence cues and asset hashes. Narration is synthesized locally with one Kokoro voice identity, not browser speech. Human listening approval remains outstanding.

## Behavior

Continue is enabled after the images and entire selected audio file load. Its user gesture switches pages and starts audio. Captions accumulate, with the current sentence darkened. The whole visible group is vertically centered until it overflows, then follows the newest sentence. Previous captions remain scrollable. The Pull Over modal and hidden browser tab pause audio; resume preserves time. Completion depends on the actual audio `ended` event. There are no playback controls in the car UI.

Photorealistic static scenes plus subtle procedural rain / daylight effects are used. No driving animation. The intro remains static. Reduced-motion settings disable weather motion and smooth caption scrolling. Maps use local geographic paths, shared across day/night. No map interaction or location names.

## Study return integration — pending address

The planned flow is: participants follow a link in the survey to this independently hosted website, complete the experience, then click the completion bar to return to the survey.

A full-width clickable completion bar appears outside the car after playback, with white spacing and a small `Study navigation` label. Set `SURVEY_RETURN_URL` in `config.js` to the study team's reviewed HTTPS return destination when available. **No URL is currently configured:** clicking the bar tells the participant to switch back to the original survey tab. There is no working Qualtrics return redirect yet. Before participant use, test the supplied destination with the actual survey to confirm that it resumes the existing response at the intended point.

November 5 UI refinement: the parked-vehicle dialog uses centered text and a single full-width OK action. The study completion bar retains its original wording and full-area click target, with completion status on the left and the survey action on the right. It remains outside the simulated vehicle screen. Narration, condition assignments, and completion timing are unchanged.

## Deployment

Public files: index.html, review.html, voice-review.html, app.js, config.js, playback-core.js, scene-motion.js, styles.css, stimuli.json, favicon.svg, NOTICE.txt, README.md, and only referenced assets, including the six normalized audition samples. No emails, transcripts, meeting notes, QA artifacts, model files or build tools. The eight existing public URLs remain unchanged.

Build scripts live in the parent `tools/` directory. Do not publish those scripts or `.build-tools/`. Read `NOTICE.txt` for asset sources. This prototype sends no analytics or participant interaction logs.
