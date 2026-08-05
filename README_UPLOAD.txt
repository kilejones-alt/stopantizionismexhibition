STOPAZ responsive Jew-Hatred site — audited phone-first repository

UPLOAD
1. Extract the replacement ZIP.
2. Open the folder named stopantizionismexhibition-main.
3. Upload every file inside that folder to the root of the GitHub repository.
4. Replace the existing files and commit the changes.
5. Do not upload the ZIP itself or the outer folder as a nested directory.

PAGES
- index.html: Jew-Hatred homepage with three slow horizontal flip-and-door entries
- antijudaism.html: Antizionism-format gallery with six timeline positions
- antisemitism.html: Antizionism-format gallery with six timeline positions
- exhibition.html: Antizionism gallery with six timeline positions

PHONE FUNCTIONALITY
- Phone remains the priority when layout tradeoffs are necessary.
- Gallery controls use 44px minimum touch targets and wrap safely at 320px.
- Every gallery has an ERAS control returning to the three-door homepage.
- Gallery artwork uses semantic buttons, keyboard focus, and accessible labels.
- Non-hero timeline images load lazily and all gallery images have intrinsic dimensions.
- The lightbox uses dynamic phone height, safe-area padding, scroll locking, and a 48px close control.
- Tapping a paragraph while it is animating reveals its complete text immediately.
- Back-navigation restoration clears stale door and page-transition states.

AUDIO
- Audio does not autoplay and the 7.1 MB file is not preloaded.
- Playback begins only after the visitor presses AUDIO.
- One active audio controller is used per page.
- Playback position is saved for the browsing session.

CURRENT CONTENT
- Each era page contains six vertically stacked timeline positions: three current entries and three replaceable reserved entries.
- Unknown titles, creators, dates, descriptions, and citations remain marked as pending. No metadata was invented.
- The Antisemitism homepage image is a sharpened 4x enlargement of the existing archival image; its source content was not changed.

FINAL AUDIT
- Obsolete continuity.js was removed; it was unused and contained superseded autoplay logic.
- HTML structure, JavaScript syntax, CSS parsing, local links, assets, image dimensions, translations, touch targets, lightbox behavior, and all three door routes were rechecked.
