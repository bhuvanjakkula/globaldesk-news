# Current News TV update � v0.17

Every eligible headline in the selected channel is included. The headline strip
shows each for ten seconds while idle and follows the story during playback.
The rundown includes all entries in a scrollable list. Illustrated mode is the
default, so missing generated video does not prevent caption playback.

Realistic mode uses the implemented OpenAI speech / D-ID video integration.
Set OPENAI_API_KEY and DID_API_KEY privately in the backend environment, plus
any required presenter settings in .env.example. Generate an approved item with:

```
cd backend
.venv/Scripts/python.exe -m app.avatar_video --channel demo --identifier DEMO_SLUG
```

This invokes paid provider APIs. Select Realistic human video after generation;
the player checks availability every five seconds. Missing videos display an
explicit unavailable state. Source speech and AI processing permission checks
remain enforced. Provider rendering and audible playback are not verified until
credentials are configured and a real generation succeeds.

The notes below describe historical v0.16 behavior; the 12-headline cap and
statements that no provider integration exists are superseded by this update.

---

# News TV — v0.16

The flagship channel redesign adds a dedicated network identity, dark cinema
layout, panoramic studio architecture, anchor desk, headline ticker and programme
rundown. Large screens place the rundown beside the studio; mobile screens stack
it underneath. The original presenter remains clearly artificial and stylized.
The ticker supports reduced-motion preferences. Pausing the bulletin pauses playback;
hovering over the ticker pauses its scrolling. Existing controls remain available.

Open `/tv` and choose Finance & markets, Innovation & research, or Fictional demo.
Press Play for the animated headline bulletin. Enable Synthetic narration to use
an available on-device browser voice. There is no automatic audio on page load.
All demo speech starts by identifying the content as a fictional demonstration.

## Implemented

- Original stylized canvas presenter Nova; no real person's likeness or voice.
- 1280×720 animated studio, headline graphics, speaking animation and reduced-motion
  accommodation. This is procedural animation, not phoneme-aligned lip sync.
- Accessible text captions, source links, publication dates and a selectable playlist.
- Source-linked finance/research channels with separately labelled fictional demos.
- One-second checks for new collected-data revisions; refreshed bulletin playlists.
- Browser speech with a local-voice selector, play/pause and headline skip.
- Optional 10-second silent demo video export via Canvas captureStream and MediaRecorder,
  using a supported WebM/MP4 format. This button is unavailable for real-source channels.
  Browser speech is not part of the recorded video/audio; no microphone is accessed.

## Spoken reuse

Source metadata display permission does not automatically grant narration permission.
Migration 0011 adds `narration_allowed`, default false. The original fictional demo
stories may be narrated with their demo disclosure. Other sources stay caption-only
until a trusted operator records a real spoken-reuse basis. The operator command is:

```
python -m app.narration_permission --domain SOURCE_DOMAIN --actor REVIEWER --basis "DOCUMENTED SPOKEN REUSE BASIS" --allow
```

Use `--revoke` to disable it. This command records an attestation, not a licence.
It does not grant broader AI processing permissions. Publication status, metadata
display approval and permission expiry are enforced independently. Every headline
is checked again before speech begins; an utterance already playing cannot be
retroactively recalled. Only the latest 12 available headlines per channel are used.

The public bulletin API is `/api/v1/broadcast`; `/api/v1/broadcast/check` rechecks
an individual headline. The browser uses the website's `/api/broadcast` proxy.
No voice provider, API key, paid avatar account or external news-video feed is connected.

## Limits

This is an animated headline player, not an actual live TV broadcast, licensed
channel rebroadcast, photorealistic generated avatar or generated video with narration
embedded. Those need a suitable provider, source rights and streaming infrastructure.
On-device voices and recording formats depend on the browser; captions remain usable
when speech is unavailable. Recording/download behaviour has not yet been verified
end to end on every browser. Keep the local launcher running for collection/API access.

## Validation — 18 October 2026

91 backend tests passed, including narration grants/revocation, expired permissions,
withdrawn stories, demo disclosure and channel validation. Production build and
TypeScript passed. Browser inspected the studio, selected the demo channel, enabled
synthetic narration and verified playing state and automatic caption advancement.
Audio audibility and exported-file playback have not been independently verified.
See `TV_HTTP_VERIFICATION.json` and `news-tv-preview.png` for local evidence.
