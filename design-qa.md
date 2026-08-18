# Design QA — Inline Payment and Court Schedule

- Source visual truth: `booking-desktop-reference.png` (1672 × 941 px).
- Implementation target: the large-screen booking experience in `src/components/booking-widget/`.
- Implementation screenshot: unavailable because the connected browser became unavailable before capture.
- Intended viewport: 1672 × 941 CSS px at 1× density to match the source proportions.
- State: schedule visible, payment panel visible, calendar popup open, live Court 1 and Court 2 availability.

## Full-view comparison evidence

Blocked. The reference image was opened and retained locally, but a current browser-rendered implementation screenshot could not be captured. Build output and source inspection are not substitutes for the required visual comparison.

## Focused region comparison evidence

Blocked. The left payment spacing, right-side calendar containment, popup overlap boundaries, timetable density, and alignment of the two main columns require browser-rendered evidence.

## Findings

- [P0] Browser-rendered evidence is unavailable.
  - Location: local desktop preview.
  - Evidence: the browser connection disappeared before the implementation could be opened and captured; diagnostics report a missing native-host registration for the Browser plugin.
  - Impact: exact visual fidelity and responsive clipping cannot be verified.
  - Fix: reinstall the Browser plugin from the ChatGPT plugin UI, then recapture at 1672 × 941 and compare against `booking-desktop-reference.png`.

## Implemented structure awaiting visual confirmation

- Large screens use payment on the left and Court & Time on the right.
- Payment is visible immediately and retains real selected-slot totals, GoTyme QR, customer fields, proof upload, and submission.
- The left panel uses explicit group spacing and internal padding.
- Change Day and its calendar popup live inside the Court & Time component.
- The popup closes after a date is selected and never renders over the payment column by structure.
- The desktop `Book a Court` heading is removed.
- The Reserved legend is placed first on the left side of the schedule controls.
- The desktop timetable has no internal vertical scroll container; the page handles normal scrolling.
- The GoTyme QR is rendered at the full payment-column width with a direct image download action.
- Mobile retains the existing modal schedule-to-payment flow.

## Verification completed

- Targeted ESLint passed.
- Production build passed, including TypeScript and route generation.
- HTTP smoke check returned 200 from the local app.

## Comparison history

1. The prior large-screen implementation used a permanent left calendar and a separate payment step.
2. The selected reference changed the desktop composition to immediate payment plus schedule, with an in-panel Change Day popup.
3. Code changes were applied and passed static/runtime build checks; the required post-change browser capture remains blocked.

final result: blocked
