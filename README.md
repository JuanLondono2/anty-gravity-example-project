# BigQuery Release Notes Explorer

A high-fidelity, premium web dashboard built using **Python Flask** and **plain vanilla HTML, CSS, and JavaScript** that fetches, parses, and segments the Google Cloud BigQuery release notes RSS feed.

This application splits daily releases into individual categorized updates and provides a customized Tweet composer simulator for sharing updates directly on X (formerly Twitter).

---

## Features

* **📰 Dynamic Release Timeline:** Groups updates chronologically with visual status nodes.
* **🏷️ Categorization & Tags:** Parses underlying HTML and segregates updates into color-coded categories (**Feature** (Green), **Announcement** (Violet), **Issue** (Red), **Deprecation** (Orange), and **Other** (Gray)).
* **🔍 Search and Filters:** Real-time client-side keyword search and filtering by update category.
* **🔄 Live Sync Refresh:** A refresh action that bypasses the server's cache to pull the latest updates directly from the XML feed.
* **🐦 Custom Tweet Composer Simulator:**
  * Displays a pixel-perfect mockup of X's Dark Mode UI.
  * Real-time sync of text inputs.
  * Smart auto-truncation to fit X's 280-character limit (with automatic suffix attribution).
  * SVG progress circle character counter that changes color dynamically based on remaining character counts.
  * Launches the official X web intent modal to publish the tweet.
* **⚡ 5-Minute Memory Caching:** Server-side caching to guarantee rapid load speeds and prevent rate limits.

---

## Technology Stack

* **Backend:** Python 3.10+, Flask
* **Frontend:** Vanilla HTML5, Vanilla CSS (Glassmorphism design system), Vanilla JavaScript (DOMParser feed segmenter)
* **Fonts:** Outfit (headings), Inter (body)
* **Icons:** Raw inline SVGs (no external icon font-pack dependencies)

---

## Installation & Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/JuanLondono2/anty-gravity-example-project.git
   cd anty-gravity-example-project
   ```

2. **Set Up Python Virtual Environment:**
   ```powershell
   # Create environment
   python -m venv venv
   
   # Activate environment (Windows)
   .\venv\Scripts\activate
   
   # Install dependencies
   pip install flask
   ```

3. **Run the Development Server:**
   ```bash
   python app.py
   ```
   Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.

---

## Project Structure

* `app.py` — Flask application server (caching, routing, XML fetch, and parsing).
* `templates/index.html` — Main UI structure.
* `static/css/style.css` — Glassmorphism layouts, CSS variables, and keyframe animations.
* `static/js/app.js` — Client-side AJAX controller, HTML processor, and Tweet Modal controller.
* `.gitignore` — standard exclusion configurations.
