import time
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache for release notes
CACHE_DURATION = 300  # 5 minutes
cache = {
    "data": None,
    "last_fetched": 0
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_notes(force=False):
    current_time = time.time()
    if not force and cache["data"] and (current_time - cache["last_fetched"] < CACHE_DURATION):
        return cache["data"]

    try:
        req = urllib.request.Request(
            FEED_URL,
            headers={
                # Provide a user agent to resemble a browser and prevent potential blocking
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()

        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}

        entries = []
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns)
            title_text = title.text if title is not None else ""

            updated = entry.find('atom:updated', ns)
            updated_text = updated.text if updated is not None else ""

            id_el = entry.find('atom:id', ns)
            id_text = id_el.text if id_el is not None else ""

            # Check for link with alternate rel
            link_href = ""
            for link in entry.findall('atom:link', ns):
                rel = link.attrib.get('rel', 'alternate')
                if rel == 'alternate':
                    link_href = link.attrib.get('href', '')
                    break
            if not link_href:
                # Fallback to the first link's href
                link = entry.find('atom:link', ns)
                link_href = link.attrib.get('href', '') if link is not None else ""

            content = entry.find('atom:content', ns)
            content_text = content.text if content is not None else ""

            entries.append({
                'title': title_text,
                'updated': updated_text,
                'id': id_text,
                'link': link_href,
                'content': content_text
            })

        cache["data"] = entries
        cache["last_fetched"] = current_time
        return entries
    except Exception as e:
        print(f"Error fetching/parsing feed: {e}")
        # If fetch fails but we have cached data, return cached data as fallback
        if cache["data"]:
            return cache["data"]
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        notes = fetch_and_parse_notes(force=force_refresh)
        return jsonify({
            "status": "success",
            "notes": notes,
            "cached_at": cache["last_fetched"]
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
