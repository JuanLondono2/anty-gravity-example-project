// Global state
let rawEntries = []; // Original data fetched from Flask
let flattenedUpdates = []; // Parsed and flattened list of update items
let currentCategoryFilter = 'all';
let currentSearchQuery = '';

// DOM Elements
const refreshBtn = document.getElementById('refreshBtn');
const statusText = document.getElementById('statusText');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const filterCategories = document.getElementById('filterCategories');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const notesTimeline = document.getElementById('notesTimeline');

// Modal Elements
const tweetModal = document.getElementById('tweetModal');
const tweetTextArea = document.getElementById('tweetTextArea');
const tweetPreviewText = document.getElementById('tweetPreviewText');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const postTweetBtn = document.getElementById('postTweetBtn');
const charCount = document.getElementById('charCount');
const charProgress = document.getElementById('charProgress');

// SVG progress circle variables
const CIRCUMFERENCE = 2 * Math.PI * 14; // 14 is the radius (r) of the circle in the HTML

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch of data
    fetchReleaseNotes(false);

    // Event listeners
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', clearSearch);
    
    // Category selection event listeners
    filterCategories.addEventListener('click', handleCategoryClick);

    // Modal event listeners
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelModalBtn.addEventListener('click', closeTweetModal);
    tweetTextArea.addEventListener('input', handleTweetInput);
    postTweetBtn.addEventListener('click', publishTweet);

    // Initialize progress ring
    charProgress.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    charProgress.style.strokeDashoffset = CIRCUMFERENCE;
    
    // Close modal when clicking outside the modal content
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });
});

// Fetch Release Notes from API
async function fetchReleaseNotes(forceRefresh = false) {
    try {
        setLoading(true);
        updateStatus('Connecting...', false);

        if (forceRefresh) {
            const spinner = refreshBtn.querySelector('.spinner-icon');
            spinner.classList.add('spinning');
            refreshBtn.disabled = true;
        }

        const url = `/api/notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            rawEntries = data.notes;
            processEntries();
            renderTimeline();
            updateStatus('Connected', true);
        } else {
            throw new Error(data.message || 'Failed to fetch release notes.');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        updateStatus('Connection Error', false, true);
        showErrorState(error.message);
    } finally {
        setLoading(false);
        const spinner = refreshBtn.querySelector('.spinner-icon');
        spinner.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

// Process entries by breaking them down into individual updates
function processEntries() {
    flattenedUpdates = [];
    
    rawEntries.forEach(entry => {
        const parsedUpdates = parseEntryContent(entry.content);
        
        parsedUpdates.forEach(update => {
            // Clean content to extract raw text (useful for search and tweet default content)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = update.html;
            const plainText = tempDiv.textContent || tempDiv.innerText || "";
            
            flattenedUpdates.push({
                id: entry.id + '_' + update.category.toLowerCase().replace(/\s+/g, '_'),
                date: entry.title,
                originalDate: entry.updated,
                link: entry.link,
                category: update.category, // e.g. "Feature", "Announcement", "Issue", "Deprecation"
                categoryKey: update.category.toLowerCase(), // normalized for classes/filtering
                html: update.html,
                plainText: plainText.trim()
            });
        });
    });
}

// Helper to parse HTML in entries and segment items based on <h3> tags
function parseEntryContent(contentHtml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(contentHtml, 'text/html');
    const body = doc.body;
    
    const updates = [];
    let currentCategory = 'Other';
    let currentHtml = '';
    
    // Iterate through all child elements of body
    for (let i = 0; i < body.children.length; i++) {
        const child = body.children[i];
        
        if (child.tagName === 'H3') {
            // Save previous category content if there's any
            if (currentHtml.trim()) {
                updates.push({
                    category: currentCategory,
                    html: currentHtml.trim()
                });
            }
            
            // Set new category
            currentCategory = child.innerText.trim();
            currentHtml = '';
        } else {
            currentHtml += child.outerHTML;
        }
    }
    
    // Add the final category group
    if (currentHtml.trim()) {
        updates.push({
            category: currentCategory,
            html: currentHtml.trim()
        });
    }
    
    // Fallback: If no <h3> categories were found, grab the entire content as 'Other'
    if (updates.length === 0 && body.innerHTML.trim()) {
        updates.push({
            category: 'Other',
            html: body.innerHTML.trim()
        });
    }
    
    return updates;
}

// Render the updates in the timeline
function renderTimeline() {
    // 1. Filter updates based on current filters
    const filtered = flattenedUpdates.filter(update => {
        // Category filtering
        const matchesCategory = currentCategoryFilter === 'all' || update.categoryKey === currentCategoryFilter;
        
        // Search filtering
        const searchTerms = currentSearchQuery.toLowerCase();
        const matchesSearch = !currentSearchQuery || 
            update.plainText.toLowerCase().includes(searchTerms) ||
            update.category.toLowerCase().includes(searchTerms) ||
            update.date.toLowerCase().includes(searchTerms);
            
        return matchesCategory && matchesSearch;
    });

    // 2. Clear previous content
    notesTimeline.innerHTML = '';

    if (filtered.length === 0) {
        notesTimeline.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';
    notesTimeline.style.display = 'block';

    // 3. Group filtered updates by date
    const grouped = {};
    filtered.forEach(update => {
        if (!grouped[update.date]) {
            grouped[update.date] = [];
        }
        grouped[update.date].push(update);
    });

    // 4. Create DOM elements for each group
    Object.keys(grouped).forEach((date, index) => {
        const updatesInDate = grouped[date];
        
        const groupEl = document.createElement('div');
        groupEl.className = 'timeline-group';
        groupEl.style.animationDelay = `${index * 0.05}s`;
        
        // Timeline connector node
        const nodeEl = document.createElement('div');
        nodeEl.className = 'timeline-node';
        groupEl.appendChild(nodeEl);
        
        // Date heading
        const dateEl = document.createElement('h2');
        dateEl.className = 'timeline-date';
        
        // Find anchor URL from first entry in group
        const linkUrl = updatesInDate[0].link;
        dateEl.innerHTML = `
            <span>${date}</span>
            <a href="${linkUrl}" class="timeline-date-link" target="_blank" rel="noopener noreferrer" title="View release notes for this day on Google Cloud website">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
            </a>
        `;
        groupEl.appendChild(dateEl);
        
        // List of update cards for this date
        const listEl = document.createElement('div');
        listEl.className = 'updates-list';
        
        updatesInDate.forEach(update => {
            const cardEl = document.createElement('article');
            cardEl.className = `update-card glass-panel ${update.categoryKey}`;
            
            cardEl.innerHTML = `
                <div class="update-header">
                    <div class="badge-wrapper">
                        <span class="update-badge">${update.category}</span>
                    </div>
                </div>
                <div class="update-body">
                    ${update.html}
                </div>
                <div class="share-action">
                    <button class="btn-share" data-id="${update.id}">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        Share on X
                    </button>
                </div>
            `;
            
            // Add tweet click listener to share button
            const shareBtn = cardEl.querySelector('.btn-share');
            shareBtn.addEventListener('click', () => openTweetModal(update));
            
            listEl.appendChild(cardEl);
        });
        
        groupEl.appendChild(listEl);
        notesTimeline.appendChild(groupEl);
    });
}

// Handle Category Chip Clicks
function handleCategoryClick(e) {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;

    // Update active class
    const activeChip = filterCategories.querySelector('.filter-chip.active');
    if (activeChip) {
        activeChip.classList.remove('active');
    }
    chip.classList.add('active');

    // Update state and re-render
    currentCategoryFilter = chip.dataset.category;
    renderTimeline();
}

// Handle Search Input
function handleSearch(e) {
    currentSearchQuery = e.target.value;
    
    // Show/hide clear search button
    if (currentSearchQuery.length > 0) {
        clearSearchBtn.style.display = 'flex';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    
    renderTimeline();
}

// Clear Search Query
function clearSearch() {
    searchInput.value = '';
    currentSearchQuery = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    renderTimeline();
}

// Update Status Indicator
function updateStatus(text, isOnline, isError = false) {
    statusText.textContent = text;
    if (isOnline) {
        statusText.parentElement.classList.remove('offline');
    } else {
        statusText.parentElement.classList.add('offline');
    }
    
    if (isError) {
        statusText.style.color = 'var(--color-issue)';
    } else {
        statusText.style.color = '';
    }
}

// Toggle Loading Overlay
function setLoading(isLoading) {
    if (isLoading) {
        loadingState.style.display = 'flex';
        notesTimeline.style.display = 'none';
        emptyState.style.display = 'none';
    } else {
        loadingState.style.display = 'none';
    }
}

// Display Error Message
function showErrorState(message) {
    notesTimeline.innerHTML = '';
    notesTimeline.style.display = 'none';
    emptyState.style.display = 'flex';
    emptyState.querySelector('h3').textContent = 'Oops! Something went wrong';
    emptyState.querySelector('p').textContent = message || 'We had issues fetching the release notes. Please check your network and try again.';
}

// MODAL & TWITTER (X) DRAFT SYSTEM

// Opens Tweet Composition Modal populated with selected update info
function openTweetModal(update) {
    // Generate standard professional message format
    // e.g.: Google BigQuery Feature (June 15, 2026): Use Gemini Cloud Assist to optimize query performance in BigQuery... Read more: [Link]
    const headerPrefix = `BigQuery ${update.category} [${update.date}]: `;
    const suffix = `\n\nRead more: ${update.link}`;
    
    // Compute available space for the core content text
    const maxCoreLen = 280 - headerPrefix.length - suffix.length;
    let coreText = update.plainText;
    
    if (coreText.length > maxCoreLen) {
        coreText = coreText.substring(0, maxCoreLen - 3) + '...';
    }
    
    const draftText = `${headerPrefix}"${coreText}"${suffix}`;
    
    // Populate form elements
    tweetTextArea.value = draftText;
    updateTweetPreview(draftText);
    
    // Show Modal
    tweetModal.classList.add('active');
    tweetTextArea.focus();
    
    // Trigger input handler to render char limits correctly
    handleTweetInput();
}

// Closes Tweet Modal
function closeTweetModal() {
    tweetModal.classList.remove('active');
    tweetTextArea.value = '';
}

// Handle Typing events inside compose text area
function handleTweetInput() {
    const text = tweetTextArea.value;
    updateTweetPreview(text);
    
    const remainingChars = 280 - text.length;
    charCount.textContent = remainingChars;
    
    // Update progress ring offset
    setProgressRing(text.length);
    
    // Button and text styling based on remaining character threshold
    if (remainingChars < 0) {
        charCount.className = 'count-number danger';
        postTweetBtn.disabled = true;
        postTweetBtn.style.opacity = '0.5';
    } else if (remainingChars <= 20) {
        charCount.className = 'count-number warning';
        postTweetBtn.disabled = false;
        postTweetBtn.style.opacity = '1';
    } else {
        charCount.className = 'count-number';
        postTweetBtn.disabled = false;
        postTweetBtn.style.opacity = '1';
    }
}

// Sync text input with Simulated X Card UI Preview
function updateTweetPreview(text) {
    // Basic rich display formatting: highlight links/handles in blue in the simulator preview
    if (!text.trim()) {
        tweetPreviewText.innerHTML = '<span style="color:var(--text-muted)">Preview container. Start typing to compose your tweet...</span>';
        return;
    }
    
    let formattedText = escapeHtml(text)
        .replace(/(https?:\/\/[^\s]+)/g, '<span style="color:var(--color-twitter); cursor:pointer">$1</span>')
        .replace(/(@[a-zA-Z0-9_]+)/g, '<span style="color:var(--color-twitter); cursor:pointer">$1</span>')
        .replace(/(#[a-zA-Z0-9_]+)/g, '<span style="color:var(--color-twitter); cursor:pointer">$1</span>');
        
    tweetPreviewText.innerHTML = formattedText;
}

// Sets SVG circle indicator offsets
function setProgressRing(charLen) {
    const percentage = Math.min(charLen, 280) / 280;
    const offset = CIRCUMFERENCE - (percentage * CIRCUMFERENCE);
    charProgress.style.strokeDashoffset = offset;
    
    // Circle colors based on length
    if (charLen > 280) {
        charProgress.style.stroke = 'var(--color-issue)'; // red
    } else if (charLen >= 260) {
        charProgress.style.stroke = 'var(--color-deprecation)'; // orange/yellow
    } else {
        charProgress.style.stroke = 'var(--color-twitter)'; // blue
    }
}

// Open official Twitter (X) intent page to complete post
function publishTweet() {
    const text = tweetTextArea.value;
    if (text.length > 280) return;
    
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'width=550,height=420');
    closeTweetModal();
}

// Utility: HTML Escaper to avoid script injections inside simulation preview
function escapeHtml(string) {
    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };
    return string.replace(/[&<>"'\/]/g, (match) => htmlEscapes[match]);
}
