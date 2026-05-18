// Opens the business website and extracts email + social media links
// Called separately after getting the website URL from Google Maps detail page

() => {
    var result = {
        email: '',
        facebook: '',
        instagram: '',
        tiktok: '',
        twitter: '',
        youtube: ''
    };

    var bodyHTML = document.documentElement.innerHTML || '';
    var bodyText = document.body ? (document.body.innerText || '') : '';

    // ── Email ──
    // 1. mailto links
    var mailEls = document.querySelectorAll('a[href^="mailto:"]');
    for (var i = 0; i < mailEls.length; i++) {
        var m = (mailEls[i].getAttribute('href') || '').replace('mailto:', '').split('?')[0].trim();
        if (m && m.indexOf('@') !== -1) { result.email = m; break; }
    }

    // 2. regex scan visible text (catches obfuscated emails rendered as text)
    if (!result.email) {
        var em = bodyText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
        if (em) result.email = em[0];
    }

    // 3. regex scan raw HTML (catches emails in data attributes, comments, scripts)
    if (!result.email) {
        var em2 = bodyHTML.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
        if (em2 && em2[0].indexOf('wix') === -1 && em2[0].indexOf('sentry') === -1) {
            result.email = em2[0];
        }
    }

    // ── Social media: scan all <a href> tags ──
    var allLinks = document.querySelectorAll('a[href]');
    for (var j = 0; j < allLinks.length; j++) {
        var href = (allLinks[j].getAttribute('href') || '').toLowerCase().trim();

        if (!result.facebook && (href.indexOf('facebook.com/') !== -1 || href.indexOf('fb.com/') !== -1)) {
            if (href.indexOf('sharer') === -1 && href.indexOf('share') === -1) {
                result.facebook = allLinks[j].getAttribute('href');
            }
        }
        if (!result.instagram && href.indexOf('instagram.com/') !== -1) {
            result.instagram = allLinks[j].getAttribute('href');
        }
        if (!result.tiktok && href.indexOf('tiktok.com/') !== -1) {
            result.tiktok = allLinks[j].getAttribute('href');
        }
        if (!result.twitter && (href.indexOf('twitter.com/') !== -1 || href.indexOf('x.com/') !== -1)) {
            if (href.indexOf('share') === -1 && href.indexOf('intent') === -1) {
                result.twitter = allLinks[j].getAttribute('href');
            }
        }
        if (!result.youtube && href.indexOf('youtube.com/') !== -1) {
            if (href.indexOf('watch') === -1) {
                result.youtube = allLinks[j].getAttribute('href');
            }
        }
    }

    // ── Fallback: scan raw HTML for social URLs not in <a> tags ──
    if (!result.facebook) {
        var fb = bodyHTML.match(/https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9._\-\/]+/);
        if (fb && fb[0].indexOf('sharer') === -1) result.facebook = fb[0];
    }
    if (!result.instagram) {
        var ig = bodyHTML.match(/https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._\-\/]+/);
        if (ig) result.instagram = ig[0];
    }
    if (!result.tiktok) {
        var tt = bodyHTML.match(/https?:\/\/(www\.)?tiktok\.com\/[a-zA-Z0-9._@\-\/]+/);
        if (tt) result.tiktok = tt[0];
    }
    if (!result.twitter) {
        var tw = bodyHTML.match(/https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9._\-\/]+/);
        if (tw && tw[0].indexOf('intent') === -1) result.twitter = tw[0];
    }
    if (!result.youtube) {
        var yt = bodyHTML.match(/https?:\/\/(www\.)?youtube\.com\/(channel|c|user|@)[a-zA-Z0-9._\-\/]+/);
        if (yt) result.youtube = yt[0];
    }

    return result;
}
