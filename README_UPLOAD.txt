STOPAZ responsive Jew-Hatred site — phone-first pre-upload repository

UPLOAD
1. Extract the replacement ZIP.
2. Open the folder named stopantizionismexhibition-main.
3. Upload every file inside that folder to the root of the GitHub repository.
4. Replace the existing files and commit the changes.
5. Do not upload the ZIP itself or the outer folder as a nested directory.

PAGES
- index.html: Jew-Hatred homepage with three horizontal flip-and-door entries and a restrained exhibition announcement.
- overview.html: English-language long-form exhibition overview and partnership information.
- antijudaism.html: Antizionism-format gallery with six timeline positions.
- antisemitism.html: Antizionism-format gallery with six timeline positions.
- exhibition.html: Antizionism gallery with six timeline positions.

PHONE FUNCTIONALITY
- Phone remains the priority when layout tradeoffs are necessary.
- The phone door sequence is approximately 12% quicker than desktop while retaining the flip, reverse-side pause, and architectural opening.
- Gallery controls use 44px minimum touch targets and wrap safely at 320px.
- Every gallery has an ERAS control returning to the three-door homepage.
- Gallery artwork uses semantic buttons, keyboard focus, and accessible labels.
- Non-hero timeline images load lazily and all gallery images have intrinsic dimensions.
- The lightbox uses dynamic phone height, safe-area padding, scroll locking, and a 48px close control.
- Gallery text uses a staggered word-wave reveal on entry and while scrolling; no typewriter or caret effect remains.
- Back-navigation restoration clears stale door and page-transition states.

HOMEPAGE
- JEW-HATRED performs one restrained left-to-right oxblood letter sweep after the page settles.
- The three homepage images are served as WebP files to reduce transfer size; the JPEG versions remain for the internal gallery pages.
- Destination gallery pages are prefetched on hover, keyboard focus, or first touch so navigation completes more quickly after the door animation.
- The full exhibition narrative is not placed in the landing area. A museum-style announcement below the doors links to overview.html.

LANGUAGES
- Homepage interface and exhibition-announcement copy support English, Hebrew, and Russian.
- overview.html is English-only because only English long-form copy was supplied. Visiting it does not overwrite the visitor's saved interface language.

AUDIO
- Audio does not autoplay and the 7.1 MB file is not preloaded.
- Playback begins only after the visitor presses AUDIO.
- One active audio controller is used per page.
- Playback position is saved for the browsing session.

CURRENT CONTENT
- Each era page contains six vertically stacked timeline positions: three current entries and three replaceable reserved entries.
- Unknown titles, creators, dates, descriptions, and citations remain marked as pending. No metadata was invented.

VERIFICATION
- HTML structure and local links were parsed successfully.
- site.js passed Node syntax validation.
- Homepage and overview layouts rendered without browser JavaScript errors at 1440x900 and 390x844.
- The shortened phone door route completed and selected antijudaism.html at the expected time.
- The ZIP contains 36 files and should be uploaded as a complete repository replacement.
