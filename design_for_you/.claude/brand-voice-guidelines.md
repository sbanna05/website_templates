# Design For You: brand voice guidelines

Generated 12 November 2026 from the project README, the product brief and the interface copy in the app. No brand documents, sales calls or customer research were available, so treat this as a first draft. Confidence is marked per section, and open questions are listed at the end.

## Who we are talking to

People planning a room or an outfit who are not designers: someone renovating a kitchen, rearranging a living room, or working out which colours go together. They want to try an idea quickly and see whether it looks right. They do not want to learn a 3D tool.

Confidence: medium. Inferred from the brief ("IKEA build-your-own-kitchen style", interior and clothes); not validated with users.

## Voice in one line

A knowledgeable friend at the next workbench: shows you how, tells you the truth, then gets out of the way.

## We are / we are not

| We are | We are not |
| --- | --- |
| Plain. Everyday words, short sentences. | Technical. No "mesh", "PBR", "raycast" or "render pipeline" in the interface. |
| Specific. "Move the block 5 cm." | Vague. "Adjust your object." |
| Honest about cost and data. "Free, with nothing to buy." | Coy. No "free to start", asterisks or fine print. |
| Calm. We state what happened. | Excitable. No exclamation marks, no "Awesome!", no "Oops!". |
| Encouraging through usefulness. We say what to do next. | Cheerleading. We do not praise the user for clicking a button. |
| Confident about colour. "Opposite: strong contrast, use as an accent." | Preachy. We suggest; the user decides. |

Confidence: high for honesty and plainness (explicit in the brief: no hidden fees, data deletion, clear UI). Medium for the rest.

## Tone by situation

| Situation | Tone | Example |
| --- | --- | --- |
| Empty state | Inviting, says the next step | "Pick a block to shape it" |
| Routine action | Brief, factual | "Sofa added" |
| Guidance | One sentence, benefit first | "A block's colour tints its material, so pale materials take colour best." |
| Destructive action | Serious, exact about what is lost | "Deleting here cannot be undone." / "Delete for good" |
| Error | What happened, then what to do. Never blame. | "Velour velvet could not be loaded. Check your connection and try again." |
| Money, privacy, licences | Flat statements of fact, no selling | "Nothing is uploaded, and there are no cookies, analytics or trackers." |
| Success | Confirm and stop | "Palette Harbour saved" |

## Writing rules

1. Sentence case everywhere, including buttons and headings.
2. Buttons name the action and its object: "Export image", "Save palette", "Delete everything". Never "OK", "Submit" or "Continue".
3. Headlines say something specific. "Goes well with #2f5d62", not "Colour harmony".
4. Use the user's words for things: block, room, outfit, colour, material, palette. One word per thing, used the same way every time.
5. Numbers carry units: "5 cm", "15°", "100%".
6. British spelling: colour, licence (noun), centimetre.
7. No exclamation marks. No emoji. No italics for decoration.
8. If a label repeats what the control already shows, remove the label.
9. Error messages have two parts: what went wrong, and what to do about it.
10. Never promise what the product does not do. If something is stored, say where. If something is free, say that it is free with no conditions, and only if that is true.

## Word list

| Use | Instead of |
| --- | --- |
| block | object, mesh, model, asset |
| material | texture, map, shader |
| working colour | base colour, primary colour |
| tint / shade / tone | lighter variant / darker variant |
| scene | project, file, canvas |
| delete | remove, clear, purge (for stored data) |
| free | no-cost, complimentary |
| this browser / this device | locally, client-side, localStorage |

## Open questions

These need Anna's decision before the guidelines are final.

1. **Name.** Is the product "Design For You", "Design for you" or "design_for_you"? The app uses "Design For You". Recommendation: keep it.
2. **Outfit or Clothing.** The earlier version said "Clothing"; the app now says "Outfit" because the mode builds one look. Recommendation: keep "Outfit".
3. **Spelling.** British spelling is assumed. Switch to American if the audience is mainly in the US.
4. **Languages.** Earlier code comments were in Hungarian. Should the interface ship in Hungarian as well as English?
5. **Audience.** Hobbyists at home, or also professionals preparing something to show a client? That changes how much precision and export detail the copy should promise.
6. **Will it stay free?** The copy says "no payment step anywhere in this app". If a paid tier is ever planned, that sentence and the "Free, with nothing to buy" heading must change first.
