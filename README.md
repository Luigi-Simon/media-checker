# media-checker

**media-checker** is a high-performance media inspection dashboard designed for bulk quality assurance. It allows teams to upload large datasets of media links (CSV/XLSX), view live previews of those media files (Images, YouTube, TikTok), annotate them, and export the results.

It is built to handle thousands of rows of data seamlessly using virtualized rendering, ensuring the dashboard never lags, even with large datasets.

## Core Features

* **Bulk Media Inspection:** Upload CSV, TXT, or XLSX files via drag-and-drop.
* **Live Media Previews:**
    * **Images:** Auto-detects and renders images.
    * **Standard Video:** Renders native .mp4, .webm, and .ogg files.
    * **YouTube:** Direct iframe embedding.
    * **TikTok:** Integrated player using an API proxy to bypass embed restrictions, falling back to official embeds if necessary.
* **Data Management:**
    * **In-Table Editing:** Update "Remark" fields and "isFaulty" checkboxes directly.
    * **Live Filtering:** Isolate "Faulty" or "Non-Faulty" rows in real-time.
    * **Jump-to-Row:** Instant navigation to specific row numbers.
* **Performance:** Uses `react-virtuoso` for windowed rendering, keeping the app fast with thousands of rows.
* **UI/UX:** Responsive design with a Dark Mode toggle.
* **Export:** One-click CSV export to save marked data.

## Tech Stack

* **Framework:** Next.js (React)
* **Styling:** Tailwind CSS
* **Performance:** react-virtuoso
* **File Parsing:** papaparse & xlsx
* **File Upload:** react-dropzone
* **Iconography:** lucide-react