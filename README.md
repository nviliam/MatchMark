# MatchMark

Simple football video tagging for youth coaches. React, TypeScript and Vite;
no extra libraries, backend or database.

<img width="1907" height="942" alt="7b2dc268-0c55-4660-8848-5b829af6d5c5" src="https://github.com/user-attachments/assets/fb189ffc-1566-4117-939a-3a4765951b1d" />

<img width="1905" height="932" alt="00934fd6-aeed-48ac-877f-215ef38cff05" src="https://github.com/user-attachments/assets/c3740f75-d1d0-46a0-8ec7-de2c4f742f8d" />


## Run

Use Node.js 22.12+ or 24 LTS.

```sh
npm install
npm run dev
```

If PowerShell blocks `npm.ps1`, use `npm.cmd` instead of `npm`.

## Checks

```sh
npm run lint
npm run build
npm run preview
```

## Tagging workflow

1. Choose a local video. It stays on your device and plays with native controls.
2. Click an event button to capture the current video time.
3. Select a player and the fields required by that event.
4. Save to add it to the list, or Cancel to discard it.
5. Click a recorded event to seek to its original timestamp.

The timestamp is captured when the event button is pressed, even if playback
continues while the form is open. Times are stored in seconds with fractional
precision and displayed as MM:SS (total minutes).

| Group | Event | Required fields besides player |
| --- | --- | --- |
| Attacking | Shot | Outcome: Goal / On Target / Off Target / Blocked; Body Part: Foot / Head / Other |
| Attacking | Pass | Outcome: Completed / Incomplete |
| Attacking | Key Pass | None |
| Attacking | Dribble | Outcome: Successful / Unsuccessful |
| Attacking | Progressive Carry | None |
| Defending | Tackle | Outcome: Won / Lost |
| Defending | Interception | None |
| Defending | Ball Recovery | None |
| Defending | Duel | Outcome: Won / Lost |
| Other | Ball Loss | None |

All selections start empty. Events are held in React state only: refreshing the
page or choosing another video clears them. Changing videos also discards the
open form. The three sample players live in `src/data/players.ts`.

## Structure and model

- `src/components/VideoPlayer.tsx`: local video URL lifecycle, video ref, pending
  timestamp, saved events and seeking.
- `src/components/EventButtons.tsx`: Attacking / Defending / Other button groups.
- `src/components/EventForm.tsx`: player selection and type-specific required fields.
- `src/components/EventList.tsx`: event descriptions and seek buttons.
- `src/types/event.ts`: shared `BaseEvent` (`id`, `playerId`, `timestamp`) and ten
  concrete types combined into the `MatchEvent` discriminated union. The `type`
  field determines which fields exist; only Shot has `bodyPart`, and events
  without outcomes have no `outcome` property.
- `src/types/shot.ts`: re-exports the shot types for compatibility.
- `src/types/player.ts`: player ID, name and shirt number.
- `src/utils/events.ts`: English labels, outcome options, validated event details
  and timestamp formatting.
- `src/App.tsx`, `src/App.css`, `src/index.css`: application shell and styles.

No persistence, statistics, shot maps, authentication or video upload is included.
The long-term project plan is in `utanpotlas_foci_video_tagging_app_terv.docx`.
