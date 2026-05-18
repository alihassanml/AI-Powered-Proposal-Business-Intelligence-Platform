() => {
    var address = '';
    var phone = '';
    var website = '';
    var email = '';

    // Scan all data-item-id elements for address, phone, website
    var infoItems = document.querySelectorAll('[data-item-id]');
    for (var i = 0; i < infoItems.length; i++) {
        var el = infoItems[i];
        var id   = (el.getAttribute('data-item-id') || '').toLowerCase();
        var aria = (el.getAttribute('aria-label')   || '');
        var ariaL = aria.toLowerCase();
        var text = (el.textContent || '').trim();
        var href = el.getAttribute('href') || '';

        if (id.includes('address') || ariaL.includes('address')) {
            if (!address) address = aria.replace(/^address:\s*/i, '').trim() || text;
        }

        if (id.startsWith('phone:') || ariaL.startsWith('phone')) {
            if (!phone) phone = aria.replace(/^phone:\s*/i, '').trim() || text;
        }

        if (id === 'authority' || ariaL.includes('website') || ariaL.includes('web site')) {
            if (!website) website = href || text;
        }
    }

    // Fallback phone: regex scan visible text
    if (!phone) {
        var bodyText = document.body ? (document.body.innerText || '') : '';
        var pm = bodyText.match(/(\+\d{1,3}[\s\-]?)?(\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,5})/);
        if (pm) phone = pm[0].trim();
    }

    // Email: mailto links first
    var mailLinks = document.querySelectorAll('a[href^="mailto:"]');
    if (mailLinks.length > 0) {
        email = (mailLinks[0].getAttribute('href') || '').replace('mailto:', '').trim();
    }

    // Fallback email: regex scan
    if (!email) {
        var bodyText2 = document.body ? (document.body.innerText || '') : '';
        var em = bodyText2.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
        if (em) email = em[0];
    }

    return { address: address, phone: phone, website: website, email: email };
}
