# Design QA — Court and Time Matrix

- Source visual truth: two user-attached mobile reference screenshots in the current conversation (no local filesystem path available).
- Implementation target: `src/components/booking-widget/ScheduleStep.tsx` rendered within the DinkLab booking overlay.
- Implementation screenshot: not captured; the required in-app browser is unavailable in this workspace session.
- Target viewport: mobile, approximately 393–430 CSS px wide.
- Source pixels: approximately 921 × 2048 px per supplied screenshot.
- Implementation pixels: unavailable.
- Density normalization: blocked because no browser-rendered implementation capture is available.
- State: day-and-time selection, no selected slots, calendar collapsed.

## Full-view comparison evidence

Blocked. The source screenshots are visible in the conversation, but the implementation could not be rendered and captured through the required browser surface. Source-code inspection and build output are not substitutes for visual evidence.

## Focused region comparison evidence

Blocked. The time-by-court matrix, pinned time column, horizontal court scrolling, selected cell state, and sticky total bar require browser-rendered evidence at a phone viewport.

## Findings

- No visual mismatch is asserted without rendered evidence.
- Verification blocker: the in-app browser reports no available browser instances, so responsive layout, clipping, scrolling, and interaction states cannot be compared against the reference.

## Comparison history

- Initial implementation: replaced vertically stacked court sections with a shared time-row/court-column matrix; added a compact date rail, expandable calendar, pinned time column, horizontal court scrolling, selectable price cells, and a sticky total/continue panel.
- Post-implementation evidence: `npm run lint` and `npm run build` pass, but these checks do not qualify as visual QA.

## Implementation checklist

- Capture the booking overlay at a mobile viewport once the in-app browser is available.
- Test selecting multiple hours in one court and the same hour in two courts.
- Verify the time column remains pinned during horizontal scrolling.
- Compare the date rail, matrix density, and sticky summary against the supplied screenshots.
- Fix any P0/P1/P2 visual findings, then recapture.

## Final result

final result: blocked
