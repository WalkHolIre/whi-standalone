/**
 * WHI Newsletter Subscribe — inserts email into Supabase subscribers table
 * Works on homepage (.newsletter-form) and blog page (newsletter CTA)
 */
(function() {
    'use strict';

    var SUPABASE_URL = 'https://dfguqecbcbbgrttfkwfr.supabase.co';
    var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZ3VxZWNiY2JiZ3J0dGZrd2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODY1OTEsImV4cCI6MjA4ODM2MjU5MX0.ckTn_XP0wKdxTK_KELaEq-02gcmSyaBGdA2iAfBuVIk';

    // Detect language from <html lang="..."> attribute (works on all domains)
    var lang = (document.documentElement.lang || 'en').substring(0, 2);

    // Messages per language
    var MSG = {
        en: { success: 'Thank you! You\'re subscribed.', exists: 'You\'re already subscribed!', error: 'Something went wrong. Please try again.', sending: 'Subscribing...' },
        de: { success: 'Danke! Sie sind angemeldet.', exists: 'Sie sind bereits angemeldet!', error: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.', sending: 'Anmelden...' },
        nl: { success: 'Bedankt! U bent ingeschreven.', exists: 'U bent al ingeschreven!', error: 'Er ging iets mis. Probeer het opnieuw.', sending: 'Inschrijven...' }
    };
    var msg = MSG[lang] || MSG.en;

    function subscribe(email, btn, originalText) {
        btn.disabled = true;
        btn.textContent = msg.sending;

        fetch(SUPABASE_URL + '/rest/v1/subscribers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON,
                'Authorization': 'Bearer ' + SUPABASE_ANON,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                email: email.trim().toLowerCase(),
                language: lang,
                source: 'website',
                status: 'active'
            })
        }).then(function(res) {
            if (res.ok) {
                btn.textContent = msg.success;
                btn.style.backgroundColor = '#22c55e';
                btn.style.cursor = 'default';
            } else if (res.status === 409) {
                btn.textContent = msg.exists;
                btn.style.backgroundColor = '#6366f1';
                setTimeout(function() { btn.textContent = originalText; btn.disabled = false; btn.style.backgroundColor = ''; }, 3000);
            } else {
                return res.text().then(function(t) {
                    // Check for unique constraint violation in body
                    if (t.indexOf('duplicate') > -1 || t.indexOf('unique') > -1 || t.indexOf('23505') > -1) {
                        btn.textContent = msg.exists;
                        btn.style.backgroundColor = '#6366f1';
                    } else {
                        btn.textContent = msg.error;
                        btn.style.backgroundColor = '#ef4444';
                    }
                    setTimeout(function() { btn.textContent = originalText; btn.disabled = false; btn.style.backgroundColor = ''; }, 3000);
                });
            }
        }).catch(function() {
            btn.textContent = msg.error;
            btn.style.backgroundColor = '#ef4444';
            setTimeout(function() { btn.textContent = originalText; btn.disabled = false; btn.style.backgroundColor = ''; }, 3000);
        });
    }

    // ── Homepage: .newsletter-form ──
    var homeForms = document.querySelectorAll('.newsletter-form');
    for (var i = 0; i < homeForms.length; i++) {
        (function(form) {
            form.onsubmit = function(e) {
                e.preventDefault();
                var input = form.querySelector('input[type="email"]');
                var btn = form.querySelector('button');
                if (!input || !input.value) return;
                subscribe(input.value, btn, btn.textContent);
            };
        })(homeForms[i]);
    }

    // ── Blog / other pages: newsletter CTA without a <form> ──
    // Finds subscribe buttons near email inputs that aren't inside a .newsletter-form
    var allBtns = document.querySelectorAll('button');
    for (var j = 0; j < allBtns.length; j++) {
        var btn = allBtns[j];
        if (btn.textContent.trim().toLowerCase() === 'subscribe' && !btn.closest('.newsletter-form')) {
            (function(b) {
                var parent = b.parentElement;
                var input = parent ? parent.querySelector('input[type="email"]') : null;
                if (!input) {
                    // Try grandparent
                    parent = parent ? parent.parentElement : null;
                    input = parent ? parent.querySelector('input[type="email"]') : null;
                }
                if (input) {
                    b.addEventListener('click', function(e) {
                        e.preventDefault();
                        if (!input.value) { input.focus(); return; }
                        subscribe(input.value, b, b.textContent);
                    });
                }
            })(btn);
        }
    }
})();
