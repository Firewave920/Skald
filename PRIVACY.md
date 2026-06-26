# Skald — Privacy Policy

**Effective date:** June 30, 2026
**Last updated:** June 30, 2026

Skald is a native desktop client for [Audiobookshelf](https://www.audiobookshelf.org/), developed by **Javier Acosta** ("the developer", "we", "us"). This policy explains what data Skald handles and where it goes.

## Summary (the short version)

- **Skald has no servers of its own and collects no personal data.** There is no Skald account, no developer-operated backend, and no analytics or tracking sent to the developer.
- **Your data stays on your device and on the servers *you* choose to connect to.** Skald talks to your own Audiobookshelf server, to optional third-party metadata services when you use them, and to podcast hosts you subscribe to — nothing else.
- **No advertising. No sale of data. No behavioral tracking.**

Skald is free and open-source software (GPL v3); its full source is publicly available, so these claims are independently verifiable.

## Data stored locally on your device

Skald stores the following **only on your computer**. None of it is transmitted to the developer:

- **Audiobookshelf credentials.** When you sign in, the authentication token issued by *your* server is stored securely in the **Windows Credential Manager**. Your password is sent only to your own server during sign-in and is not retained by Skald.
- **App settings and preferences** (theme, playback options, library display, keyboard shortcuts, etc.), stored in the application's local settings.
- **Local library catalog.** If you use Skald's local-library feature (audiobooks stored on your own disk, with no server), Skald builds a local database (SQLite) describing those files. This never leaves your device.
- **Downloaded content and playback progress** for offline use, stored locally.
- **Diagnostic logs** (`skald.log`), written locally so you can troubleshoot and, if you choose, share them when reporting an issue. These remain on your device unless you deliberately send them.

You can remove all of this by signing out (which clears the stored token) and uninstalling the app.

## Data you send to your own Audiobookshelf server

Skald is a client for a server **you** run or have access to. When you use it, Skald exchanges data with that server — your library contents, listening progress, bookmarks, and similar — exactly as needed to function. The address of that server, and any data on it, are under **your** control and governed by that server's own administrator and policies, not by the developer.

## Third-party services Skald may contact

Skald contacts the following third parties **only when you use a feature that requires them**, and sends only what that feature needs (typically a search term such as a book title, author, or identifier — not personal information):

| Service | When it's contacted | What is sent |
|---|---|---|
| **Google Books API** (`googleapis.com`) | Searching online metadata/covers for a local book | Your search terms (e.g. title/author) |
| **Apple iTunes Search API** (`itunes.apple.com`) | Searching online metadata/covers for a local book | Your search terms |
| **Open Library / Internet Archive** (`openlibrary.org`, `covers.openlibrary.org`) | Online metadata/cover search and book review/rating enrichment | Your search terms or a book identifier |
| **Audible catalog API** (`api.audible.*`) | Searching online audiobook metadata/covers for a local book | Your search terms, and the marketplace region you select |
| **Podcast hosts** | Subscribing to / refreshing a podcast you add | A request to the RSS feed URL **you** provide |

Each of these is an independent service with its own privacy policy (for example, [Google](https://policies.google.com/privacy), [Apple](https://www.apple.com/legal/privacy/), and the [Internet Archive](https://archive.org/about/terms.php)). Skald does not control how they handle requests. If you never use online metadata matching, review enrichment, or podcasts, none of these services are contacted.

## Microsoft Store and the WebView2 runtime

- Skald's user interface runs inside Microsoft's **WebView2** runtime, a standard Windows component.
- When installed from the **Microsoft Store**, Microsoft provides the developer with **aggregate, anonymized** statistics (install counts, ratings, and crash/hang signals collected by Windows Error Reporting). This data is gathered and controlled by **Microsoft**, not by Skald, and the developer receives only aggregate reports — never personal data. See the [Microsoft Privacy Statement](https://privacy.microsoft.com/privacystatement).

The developer does **not** add any separate crash reporting, analytics SDK, or telemetry of its own.

## What Skald does *not* do

- It does not create a Skald account or profile.
- It does not send your library, listening habits, credentials, or files to the developer.
- It does not display advertising.
- It does not sell, rent, or share personal data with anyone.
- It does not use cookies or trackers for advertising.

## Security

Connections to your Audiobookshelf server and to third-party services use encryption (HTTPS/TLS) where the endpoint supports it. Your authentication token is stored using the operating system's protected credential store (Windows Credential Manager) rather than in plain text.

No method of storage or transmission is perfectly secure, but because Skald keeps your data on your own device and your own server, the data exposed to the developer is none.

## Children's privacy

Skald is a general-audience utility and is not directed at children under 13 (or the equivalent age in your jurisdiction). It does not knowingly collect data from children.

## Your rights (GDPR, CCPA/CPRA, and similar)

Because the developer holds **no personal data about you**, there is nothing for the developer to access, export, correct, or delete on your behalf. Your data lives:

- **on your device** — which you control directly (and can erase by uninstalling), and
- **on your Audiobookshelf server** — which is governed by that server's administrator.

For data held by the third-party services listed above, contact those services directly. If you have questions about how Skald handles data, contact us (below).

## International users

Skald can be downloaded and used worldwide. Any data transfer that occurs is either between you and your own server, or between you and a third-party service you have chosen to use; the developer is not an intermediary in those transfers.

## Changes to this policy

We may update this policy as Skald changes. Material changes will be reflected by updating the "Last updated" date above and publishing the revised policy at its hosted location. Continued use after an update constitutes acceptance of the revised policy.

## Contact

Questions about this policy or Skald's privacy practices:

- **Email:** skald.audiobooks@gmail.com
- **Source code & issues:** https://github.com/Firewave920/Skald

---

*Skald is free, open-source software released under the GNU General Public License v3. This policy describes the official build distributed by the developer; modified or third-party builds are outside its scope.*
