# Phase 8: Human Review Workflow

SIF predictions require Human-in-the-Loop review to validate or correct the model.

## Backend API Context
- `GET /api/v1/reviews?status=PENDING`: Returns list of `ReviewQueueItem` `{ id, report_id, report_text, explanation, ... }`.
- `POST /api/v1/reviews/{id}/decision`: Accepts `{ decision: "APPROVE" | "REJECT" | "MODIFY", reviewer_comment: str, corrected_sif_level?: str, corrected_activity?: str, etc. }`

## Instructions
1. Create `app/(app)/reviews/page.tsx` for the "Review Queue".
2. Fetch pending reviews and display them in a data table.
3. Create a Review Modal/Slide-over when a row is clicked:
   - Show the `report_text`, model's `explanation`, and `overall_confidence`.
   - Provide three main actions: "Approve (Agree with ML)", "Reject (Disagree with ML)", and "Modify (Change fields)".
   - If "Modify" is selected, expand a form to provide `corrected_sif_level`, `corrected_barrier_status`, etc.
   - Require a `reviewer_comment` for Rejections and Modifications.
4. Execute POST to the decision endpoint and remove the item from the pending queue upon success.

## Acceptance Criteria
- Review queue accurately lists PENDING items.
- A user can Approve, Reject, or Modify the ML classification with appropriate payloads sent to the backend.
