# Mandarin pronunciation assets

These WAV files were generated locally for the miniapp with Piper 1.8.0 and the `zh_CN-huayan-medium` voice. There are 350 recordings: 310 distinct vocabulary recordings covering 314 entries, plus 40 short listening passages. Repeated words share a recording. Total WAV size is approximately 16.1 MB.

- Engine: https://github.com/OHF-Voice/piper1-gpl
- Voice: https://huggingface.co/rhasspy/piper-voices/tree/main/zh/zh_CN/huayan/medium
- Model card: https://huggingface.co/rhasspy/piper-voices/blob/main/zh/zh_CN/huayan/medium/MODEL_CARD
- Format: 22,050 Hz, mono, signed 16-bit PCM WAV.
- Synthesis settings: length_scale 1.12, volume 0.9; a Chinese full stop is appended to each vocabulary item for synthesis.
- The voice repository labels its model license MIT. The individual voice model card lists its training dataset license as Unknown. The synthesis engine is a build-time tool and is not bundled with the web app.

Build script: `../../tools/generate-audio.py`. Install `piper-tts==1.8.0` in a separate build environment, download the voice model and its matching `.onnx.json`, then run:

```text
python tools/generate-audio.py --model PATH_TO_MODEL.onnx --words PATH_TO_WORDS.json
```

The input JSON is an array of objects containing a `text` field. Include every vocabulary word and every listening transcript: the script replaces the complete `assets/js/audio-map.js` manifest, reusing existing WAV files. It checks each output for valid PCM format, plausible duration, and non-silent samples. Speech is synthetic; pronunciation has not been audited word by word by a native speaker.
