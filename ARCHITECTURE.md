# MatchMark Architecture

## Overview

MatchMark is a local-first React + TypeScript SPA for tagging and reviewing football video. It has no backend: local files are played through browser Object URLs without uploading video. `VideoPlayer` coordinates analysis workflows; hooks own domain data, video resources and global analysis shortcuts.

This document expands the [README architecture summary](README.md#architecture) with current implementation boundaries.

## Design Goals

- Keep state near its owner, using React hooks and explicit callbacks. The current component tree does not require a global state library.
- Represent event variants explicitly and validate external data at runtime.
- Use browser-native file selection, media playback and dialogs.
- Support portable JSON backups without embedding video or transient UI state.
- Give each Object URL one cleanup owner and prepare risky operations before replacing existing work.

## High-Level Structure

```text
App (analysis visibility, persisted shortcut configuration)
└── VideoPlayer (workflow coordination)
    ├── useMatchSession
    ├── useVideoSource (active source)
    ├── useAnalysisShortcuts
    ├── VideoPicker
    │   ├── HowToUse → HowToUsePanel
    │   ├── SessionImport
    │   └── VideoReattachment → useVideoSource (candidate/probe)
    ├── EventButtons
    ├── EventForm / SavedEventSummary / DeleteEventConfirmation
    ├── EventsPanel → EventList
    ├── PlayersPanel
    ├── ShortcutSettings → SessionImport
    └── ReviewControls
```

These are conditional UI branches, not simultaneously visible screens. `ShortcutSettings` is the Settings panel; there is no separate `Settings` component. Pure modules in `src/utils/` handle event construction, filtering, roster validation, session serialization/import and video comparison. Configuration lives in `src/config/`.

## Core Domain Model

[MatchEvent](src/types/event.ts) is a discriminated union keyed by `type`. Saved events have an ID and timestamp plus variant-specific fields: Pass has subtype/outcome, Shot has outcome/body part, and Custom has a description. All variants require a numeric player reference except Custom, where it is optional.

The 15 types are Pass, Shot, Cross, Dribble, Ball Control, Ball Loss, Goal, Chance, Goalkeeper, Custom, Tackle, Interception, Clearance, Ball Recovery and Aerial Duel. Key Pass is a Pass subtype.

[EVENT_DEFINITIONS](src/config/eventDefinitions.ts) supplies stable type IDs, display labels, ordering, rail placement, player requirements and field options. Forms, event helpers and import validation use these definitions. `EventDetails` preserves the union's required fields while excluding saved-event identity.

## State Ownership

| Owner | Responsibility |
| --- | --- |
| [App](src/App.tsx) | Analysis visibility and shortcut configuration; loads/persists shortcuts through validated localStorage helpers. |
| [useMatchSession](src/hooks/useMatchSession.ts) | Players and saved events in state; allocator counters, creation timestamp and match metadata in refs. Exposes validated CRUD, imported-session application, resets and snapshot inputs. |
| [useVideoSource](src/hooks/useVideoSource.ts) | Active/candidate files, URLs, metadata, readiness and expected imported video metadata. Owns allocation, detach, retry and resource cleanup. |
| [useAnalysisShortcuts](src/hooks/useAnalysisShortcuts.ts) | Event-tagging and Quick Seek listener lifecycle with independent enablement rules and input/modifier guards. |
| [VideoPlayer](src/components/VideoPlayer.tsx) | Video element ref, event draft/edit identity, filters, Review index, overlay/delete state, Exit/Resume position, errors, focus and import/export/reattach coordination. |
| Child components | Local form fields, shortcut capture, import confirmation and candidate-probe presentation state. |

`useMatchSession` accepts already validated imported sessions; it does not read files or validate arbitrary JSON. `VideoPicker` forwards callbacks and displays workflow data without owning session or video lifecycle logic.

## Video Lifecycle

Normal selection follows:

```text
File → format validation → createObjectURL → session/workflow reset
     → active source → <video> metadata ready → analysis
```

URL creation happens before the reset callback. A successful normal replacement clears event history, resets the event allocator and session metadata, and retains the roster and player allocator.

Reattachment has a separate path:

```text
candidate File → probe URL → hidden <video> metadata
              → comparison → explicit acceptance → new active URL
```

`VideoReattachment` uses its own `useVideoSource` instance. Acceptance asks the workspace instance to create an independent active URL for the same file; the probe URL is not transferred. The probe unmounts after successful activation and its hook releases its resources. Cancel, Choose another video and candidate replacement discard the probe. Stale probe callbacks are guarded by candidate URL identity.

Each hook instance tracks its allocations in an owned URL set. A post-render effect revokes URLs no longer referenced by its active or candidate state, including superseded batched allocations. Unmount revokes the remaining set. Import detaches the active source and retains expected metadata for reattachment. `VideoPlayer` does not revoke hook-owned URLs.

`compareVideoMetadata` remains a pure utility: filename/size equality, a 0.5-second duration tolerance and an event-timestamp sanity check produce match/mismatch/unknown results. A warning requires explicit acceptance; the comparison cannot prove file identity.

## Session Persistence

```text
runtime domain data → createSessionSnapshot → JSON download
later: file read → parse/validate → confirmation → apply domain data
     → detach current video → manual reattachment → continue analysis
```

The confirmed import handler detaches video and applies domain data in one synchronous workflow, then clears transient UI state.

[Session schema v1](src/types/session.ts) contains creation/export timestamps, match metadata, video filename/size/duration, players, saved events and both next-ID counters. It excludes video bytes, Object URLs, drafts, playback position, filters and shortcut settings.

[createSessionSnapshot](src/utils/session.ts) is a pure helper. Downloading uses a separate temporary JSON Blob URL owned by `downloadSession`, released after a delay to allow download consumption. There is no analysis autosave; only shortcut preferences persist automatically in localStorage.

## Import Validation Boundary

TypeScript types cannot establish the shape of external JSON. [readSessionFile / parseSession / validateSession](src/utils/sessionImport.ts) handle file errors, parsing and runtime validation before data reaches the domain hook.

The validator rejects unsupported `schemaVersion`, invalid metadata/dates, malformed player/event records, duplicate or invalid IDs, missing required player fields, invalid event details and allocator conflicts. It reconstructs known fields into a fresh session object: unknown extra properties are ignored rather than merged into runtime state.

Historical numeric `playerId` values may reference deleted players outside the current roster. They remain unchanged and display as `Unknown player`. This does not permit invalid IDs or omission of a required player reference.

## Event and Player ID Strategy

Allocator refs advance on successful creation, independently of array length. Deletion does not recycle IDs; event editing preserves ID/timestamp without consuming another ID. Imported sessions restore `nextPlayerId` and `nextEventId`.

Validation requires `nextEventId` to exceed every saved event ID. `nextPlayerId` must exceed both roster IDs and historical event player references. For roster IDs 1/2 and historical player ID 4, next player ID 3 is invalid and 5 is valid. This prevents a new player inheriting a deleted player's events.

The scope is the current analysis: a new normal video explicitly resets event IDs to 1. The roster and its allocator survive that reset.

## Keyboard Interaction

Event shortcuts use configurable key mappings. Quick Seek uses physical `Digit2`/`Digit3`/`Digit4` codes for 1.2/1.5/2-second forward jumps, Shift for backward jumps, clamped to media bounds. Both listeners ignore typing/contenteditable targets, repeat, composition, consumed events and Ctrl/Alt/Meta combinations.

Event tagging is disabled during drafts, overlays and Review. Quick Seek remains available while an active video is ready, including those states, subject to the guards. Settings captures assignment keys in the capture phase before analysis listeners; Escape cancels capture first and Tab remains navigation.

Escape workflow handling stays in `VideoPlayer`: draft/delete cancellation, then Review exit, then the open panel. Import/help dialogs isolate their own keyboard handling. `EventForm` owns Ctrl+Enter / Cmd+Enter save handling.

## Review Flow

`getFilteredEvents` derives a timestamp-sorted list from event-type/player filters without mutating saved data. Review owns an index into that same list, not a separate event model:

```text
filtered events → Review index 0 → seek with lead-in → Previous / Next
```

Seeking uses a three-second lead-in clamped at zero; ordinary Events-panel clicks seek to the exact timestamp. Navigation stops at list boundaries. Invalid indices or unavailable workflows exit Review safely. Review disables mutations and panels; exiting returns focus to the video.

## Error Handling and Atomicity

- Invalid imports and cancelled confirmations leave the existing analysis untouched. Request tokens ignore obsolete reads and completions after import UI unmount.
- Failed normal URL allocation returns an error before any reset or active-source replacement; the old URL remains owned and usable.
- Failed reattachment allocation preserves imported domain data. Preparing another probe discards the old candidate first; probe failure preserves the session and active source, but not the previous candidate.
- Cancelling a file picker without a selected file does not activate or reset anything. Choose another explicitly discards the candidate before opening its picker.
- Export failures report an error without mutating analysis data.

These protections cover preparation failures, not a general transaction system. A later normal-video playback error clears event history under the existing policy. A restored-video playback error instead preserves imported data and restores reattachment metadata for retry.

## Accessibility

Import confirmation and help use named native modal dialogs. Import initially focuses Cancel and returns focus to its launcher on cancellation; panels and analysis workflows have explicit focus-return targets. Player/text validation uses field-linked ARIA descriptions, and status/live regions announce saving, reading and shortcut feedback. These implementation measures do not establish full WCAG compliance.

## Testing Strategy

The Node.js test runner covers pure utilities and domain/hook operations, session roundtrips and invalid inputs, sparse/historical IDs, video lifecycle/error paths, shortcut guards/capture priority, Review and accessibility markup/handlers. Examples include [session import](tests/sessionImport.test.mjs), [video source](tests/videoSource.test.mjs), [analysis shortcuts](tests/analysisShortcuts.test.mjs) and [accessibility](tests/accessibility.test.mjs) tests.

The [custom harness](tests/helpers/componentHarness.mjs) simulates hooks, effects, handlers and media; it does not render a browser DOM. It cannot establish native dialog focus containment, real Tab order, screen-reader announcements, codec playback or responsive appearance. Those need browser verification. Standard checks are `npm test`, `npm run lint` and `npm run build`; the build includes TypeScript checking.

## Current Architectural Limitations

- No analysis autosave/IndexedDB recovery, backend, accounts or cloud sync.
- Imported sessions require manual video reattachment; metadata matching is heuristic, not cryptographic identity.
- No true browser E2E suite; focus, media and visual integration need manual checks.
- `VideoPlayer` still coordinates playback, Review, drafts, overlays and focus. The extracted hooks narrow ownership without removing that remaining UI coupling.
