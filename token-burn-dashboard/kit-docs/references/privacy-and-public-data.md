# Privacy And Public Data

The private dashboard can contain useful detail. The public dashboard should not.

## Keep private

- Raw logs and raw chat exports
- Client names
- Private project names
- Repo paths, ticket IDs, email addresses, and account IDs
- Prompt text that reveals proprietary work
- Any API key, token, cookie, service-role key, or `.env` value

## Safe public fields

- Date
- Normalized token totals
- Source-level totals
- Exact or estimated fidelity label
- Generic driver labels
- Scrubbed evidence notes

## Scrubbing pattern

Before deploying, replace specific evidence with normalized work-family language:

```text
Bad: "named customer onboarding deck, private ticket ID, team export"
Good: "shipping dashboard polish and review"
```

If a detail is the reason the day matters, keep it in the private local file and remove it from the public one.

## Never claim

The dashboard should never do any of these.

- Sum exact plus estimate into one number and present it as a uniform total.
- Render an estimate as a point value, like "266K", without a band or an estimate label.
- Call chat usage measured unless exact provider logs exist.
- Convert tokens into "novel equivalents" or other fermi math on mixed or estimated data.
- Hide the fidelity label in a footnote, or drop it entirely.

Keep the fidelity label visible in every view. The point is not only the number. It is the
trust label attached to each source.
