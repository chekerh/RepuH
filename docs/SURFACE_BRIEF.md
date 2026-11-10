# Surface brief — RepuH landing page (sell)

## Direction contract

**THESIS:** RepuH's mechanism is *evidence-derived estimates with attached confidence and limits*, and the landing page refuses the category's default hero — a big number with a small label. Instead the first viewport shows the mechanism itself: a 3D lattice of capabilities you can rotate, where every node's size encodes confidence and nothing reads as a grade.

**OWN-WORLD:** Editorial fintech. Hairlines, not cards. Instrument Serif display, Inter sans, small radii (3/5/8/12px). One primary blue (#285bdb), one teal accent (#16a085) for integrity states. Status colour only as status. Dark canvas for the lattice, light ground for copy.

**STORY:** A visitor arrives skeptical of "identity platforms" (they have seen quizzes and scores). Within one viewport they see a lattice they can drag, learn that node size is confidence not proficiency, and read that RepuH does not run tests. They believe the product is honest before they believe it is useful. Primary action: create identity. Secondary: explore the network.

**FIRST VIEWPORT:** Full-bleed 3D lattice (threeui ConstellationField, framed as the product's own capability lattice) filling the viewport, overlaid with a pinned nav and a two-column bottom band: left = display headline "Every number, traceable.", right = capability count, lede, two buttons, three proof chips (signed certificates, Merkle commitments, Hedera timestamps). The lattice rotates slowly; drag to spin; hover a node to lift it. Under `prefers-reduced-motion` the lattice is static and the 2D fallback list is keyboard reachable.

**FORM:** Persuade. Chosen structure: the lattice-as-hero, with copy pinned to the bottom band rather than centred over the canvas (the canvas owns the frame; copy sits beside it). Signature interaction: drag the lattice; a hovered node lifts outward and brightens so the visitor can feel that a node is a capability with a confidence, not a decoration.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.