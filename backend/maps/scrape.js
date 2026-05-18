// ── Step 1: collect all listing cards from the search results feed ──
(maxResults) => {
    const links = Array.from(
        document.querySelectorAll('a[href^="https://www.google.com/maps/place"]')
    ).slice(0, maxResults);

    return links.map(link => {
        const container = link.closest('[jsaction*="mouseover:pane"]');
        let title = '', rating = '', reviewCount = '', industry = '';

        if (!container) return { title, rating, reviewCount, industry, href: link.href };

        // Title
        const titleEl = container.querySelector('.fontHeadlineSmall');
        title = titleEl ? titleEl.textContent.trim() : '';

        // Rating & reviews
        const roleImg = container.querySelector('[role="img"]');
        if (roleImg) {
            const ariaLabel = roleImg.getAttribute('aria-label') || '';
            if (ariaLabel.includes('stars')) {
                const parts = ariaLabel.split(' ');
                rating = parts[0] || '';
                reviewCount = parts[2] ? parts[2].replace(/[()]/g, '') : '';
            } else {
                rating = '0';
                reviewCount = '0';
            }
        }

        // Industry — first span-like text after rating block
        const spans = Array.from(container.querySelectorAll('.W4Efsd span, .W4Efsd > span'));
        for (const s of spans) {
            const t = s.textContent.replace(/[·•\-]/g, '').trim();
            if (t && t !== title && !t.match(/^\d/) && t.length > 2 && t.length < 60) {
                industry = t;
                break;
            }
        }

        return { title, rating, reviewCount, industry, href: link.href };
    });
}
