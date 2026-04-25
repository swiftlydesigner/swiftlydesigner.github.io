// script.js
// Full script: countdowns, manual link normalization, and day handling.
// Usage notes:
// - Each .event should have data-time ("HH:MM" or "HH:MM:SS" or ISO datetime "YYYY-MM-DDTHH:MM[:SS]")
// - Optional data-day can be a weekday name ("Mon", "Monday") or an ISO date "YYYY-MM-DD".
// - If you manually include .links content in HTML, the script will normalize anchors.

(function () {
    // --- Helpers ---
    function pad(n) { return String(n).padStart(2, '0'); }

    function formatDuration(ms) {
        if (ms <= 0) return null;
        const total = Math.floor(ms / 1000);
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    function weekdayIndexFromName(name) {
        if (!name) return null;
        const map = {
            sun: 0, sunday: 0,
            mon: 1, monday: 1,
            tue: 2, tuesday: 2,
            wed: 3, wednesday: 3,
            thu: 4, thursday: 4,
            fri: 5, friday: 5,
            sat: 6, saturday: 6
        };
        const key = String(name).trim().toLowerCase();
        // allow short forms like "Mon" or "mon"
        if (map[key] !== undefined) return map[key];
        const short = key.slice(0, 3);
        return map[short] ?? null;
    }

    // Parse time/date attributes into a Date object representing the next occurrence.
    function parseEventTimeFromAttributes(timeRaw, dayAttr) {
        // If timeRaw is full ISO datetime -> use directly
        if (timeRaw && /^\d{4}-\d{2}-\d{2}T/.test(timeRaw)) {
            const d = new Date(timeRaw);
            if (!isNaN(d)) return d;
        }

        // If dayAttr is ISO date (YYYY-MM-DD) and timeRaw present -> combine
        if (dayAttr && /^\d{4}-\d{2}-\d{2}$/.test(dayAttr) && timeRaw) {
            const iso = `${dayAttr}T${timeRaw}`;
            const d = new Date(iso);
            if (!isNaN(d)) return d;
        }

        // If dayAttr is weekday name (Mon/Tue/Wednesday) and timeRaw present -> next occurrence
        const wk = weekdayIndexFromName(dayAttr);
        if (wk !== null && timeRaw) {
            const now = new Date();
            const todayIdx = now.getDay(); // 0=Sun..6=Sat
                                           // parse time parts
            const tparts = timeRaw.split(':').map(p => parseInt(p, 10) || 0);
            // candidate on the nearest weekday (may be today)
            let daysUntil = (wk - todayIdx + 7) % 7;
            let candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntil,
                                     tparts[0] || 0, tparts[1] || 0, tparts[2] || 0);
            // If candidate is in the past or exactly now (and we want next), for same-day passed -> add 7
            if (candidate <= now) {
                // If it's the same day but time later, candidate > now so fine.
                daysUntil = daysUntil === 0 ? 7 : daysUntil;
                candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntil,
                                     tparts[0] || 0, tparts[1] || 0, tparts[2] || 0);
            }
            return candidate;
        }

        // If only timeRaw ("HH:MM" or "HH:MM:SS"), assume today (may be past)
        if (timeRaw && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeRaw)) {
            const parts = timeRaw.split(':').map(p => parseInt(p, 10) || 0);
            const now = new Date();
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                            parts[0] || 0, parts[1] || 0, parts[2] || 0);
        }

        // Fallback: null
        return null;
    }

    // Normalize manual .links content: ensure anchors open safely and shorten display text when appropriate.
    function normalizeManualLinks() {
        document.querySelectorAll('.event .links').forEach(container => {
            // If user used plain text addresses inside <div class="address"> keep as-is
            container.querySelectorAll('a').forEach(a => {
                if (!a.target) a.target = '_blank';
                if (!a.rel) a.rel = 'noopener noreferrer';

                // If the anchor's text equals the full href, shorten to hostname when concise
                try {
                    const href = a.href;
                    const url = new URL(href);
                    const host = url.hostname;
                    const text = (a.textContent || '').trim();
                    if (text === href && host && host.length < 30) {
                        a.textContent = host;
                    }
                } catch (e) {
                    // not a full URL (maybe mailto or relative) — leave text as provided
                }
            });
        });
    }

    // Update countdowns for all events
//    function updateCountdowns() {
//        const events = document.querySelectorAll('.event');
//        const now = new Date();
//        events.forEach(ev => {
//            const timeRaw = ev.getAttribute('data-time'); // e.g., "08:30" or "2026-05-01T09:00"
//            const dayAttr = ev.getAttribute('data-day');  // e.g., "Mon" or "2026-05-01"
//            const target = parseEventTimeFromAttributes(timeRaw, dayAttr);
//            const display = ev.querySelector('.countdown');
//            if (!display) return;
//
//            if (!target || isNaN(target)) {
//                display.textContent = '--:--:--';
//                ev.classList.remove('past');
//                continue;
//            }
//
//            const diff = target - now;
//            if (diff > 0) {
//                display.textContent = formatDuration(diff);
//                ev.classList.remove('past');
//            } else {
//                const agoSec = Math.floor(-diff / 1000);
//                if (agoSec < 60) {
//                    display.textContent = 'Started just now';
//                } else if (agoSec < 3600) {
//                    display.textContent = `Started ${Math.floor(agoSec/60)}m ago`;
//                } else if (agoSec < 86400) {
//                    display.textContent = `Started ${Math.floor(agoSec/3600)}h ago`;
//                } else {
//                    display.textContent = 'Started';
//                }
//                ev.classList.add('past');
//            }
//
//            // Optional: update a .scheduled node if present with human-readable scheduled time
//            const scheduledNode = ev.querySelector('.scheduled');
//            if (scheduledNode) {
//                try {
//                    scheduledNode.textContent = target.toLocaleString([], {
//                        weekday: 'short', month: 'short', day: 'numeric',
//                        hour: '2-digit', minute: '2-digit'
//                    });
//                } catch (e) {
//                    scheduledNode.textContent = target.toString();
//                }
//            }
//        });
//    }

    function updateCountdowns() {
        const events = document.querySelectorAll('.event');
        const now = new Date();

        // helper to format durations with days when >= 1 day
        function formatDuration(ms) {
            if (ms <= 0) return null;
            let total = Math.floor(ms / 1000);
            const days = Math.floor(total / 86400);
            total = total % 86400;
            const hours = Math.floor(total / 3600);
            const minutes = Math.floor((total % 3600) / 60);
            const seconds = total % 60;
            if (days > 0) {
                return `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        // Use parseEventTimeFromAttributes if provided by the main script, otherwise a small fallback
        const parseFn = (window._scheduleHelpers && window._scheduleHelpers.parseEventTimeFromAttributes)
        ? window._scheduleHelpers.parseEventTimeFromAttributes
        : function (timeRaw, dayAttr) {
            if (!timeRaw && !dayAttr) return null;
            // ISO datetime
            if (timeRaw && /^\d{4}-\d{2}-\d{2}T/.test(timeRaw)) {
                const d = new Date(timeRaw);
                return isNaN(d) ? null : d;
            }
            // ISO date + time
            if (dayAttr && /^\d{4}-\d{2}-\d{2}$/.test(dayAttr) && timeRaw) {
                const d = new Date(`${dayAttr}T${timeRaw}`);
                return isNaN(d) ? null : d;
            }
            // weekday name -> next occurrence
            const weekdayIndexFromName = (name) => {
                if (!name) return null;
                const map = {sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};
                const k = String(name).trim().toLowerCase().slice(0,3);
                return map[k] ?? null;
            };
            const wk = weekdayIndexFromName(dayAttr);
            if (wk !== null && timeRaw) {
                const nowLoc = new Date();
                const todayIdx = nowLoc.getDay();
                const parts = timeRaw.split(':').map(p => parseInt(p, 10) || 0);
                let daysUntil = (wk - todayIdx + 7) % 7;
                let candidate = new Date(nowLoc.getFullYear(), nowLoc.getMonth(), nowLoc.getDate() + daysUntil,
                                         parts[0] || 0, parts[1] || 0, parts[2] || 0);
                if (candidate <= nowLoc) {
                    daysUntil = daysUntil === 0 ? 7 : daysUntil;
                    candidate = new Date(nowLoc.getFullYear(), nowLoc.getMonth(), nowLoc.getDate() + daysUntil,
                                         parts[0] || 0, parts[1] || 0, parts[2] || 0);
                }
                return candidate;
            }
            // time-only -> today
            if (timeRaw && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeRaw)) {
                const parts = timeRaw.split(':').map(p => parseInt(p, 10) || 0);
                const n = new Date();
                return new Date(n.getFullYear(), n.getMonth(), n.getDate(), parts[0] || 0, parts[1] || 0, parts[2] || 0);
            }
            return null;
        };

        events.forEach(ev => {
            const timeRaw = ev.getAttribute('data-time');
            const dayAttr = ev.getAttribute('data-day');
            const target = parseFn(timeRaw, dayAttr);
            const display = ev.querySelector('.countdown');
            if (!display) return;

            if (!target || isNaN(target)) {
                display.textContent = '--:--:--';
                ev.classList.remove('past');
                return;
            }

            const diff = target - now;
            if (diff > 0) {
                display.textContent = formatDuration(diff);
                ev.classList.remove('past');
            } else {
                const agoSec = Math.floor(-diff / 1000);
                if (agoSec < 60) {
                    display.textContent = 'Started just now';
                } else if (agoSec < 3600) {
                    display.textContent = `Started ${Math.floor(agoSec / 60)}m ago`;
                } else if (agoSec < 86400) {
                    display.textContent = `Started ${Math.floor(agoSec / 3600)}h ago`;
                } else {
                    const daysAgo = Math.floor(agoSec / 86400);
                    display.textContent = daysAgo <= 7 ? `Started ${daysAgo}d ago` : 'Started';
                }
                ev.classList.add('past');
            }

            const scheduledNode = ev.querySelector('.scheduled');
            if (scheduledNode && target instanceof Date && !isNaN(target)) {
                try {
                    scheduledNode.textContent = target.toLocaleString([], {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });
                } catch (e) {
                    scheduledNode.textContent = target.toString();
                }
            }
        });
    }


    // Initialization
    document.addEventListener('DOMContentLoaded', () => {
        normalizeManualLinks();
        updateCountdowns();
        // keep countdowns live
        setInterval(updateCountdowns, 1000);
    });

    // Expose helpers optionally (useful for debugging)
    window._scheduleHelpers = {
        parseEventTimeFromAttributes,
        weekdayIndexFromName,
        formatDuration
    };
})();

// download-all-ics: generate single .ics with all .event items on click
(function(){
    function pad(n){ return String(n).padStart(2,'0'); }

    // Produce YYYYMMDDTHHMMSSZ from a UTC instant (simple)
    function toUTCStringForICS(date){
        return date.getUTCFullYear()
        + pad(date.getUTCMonth()+1)
        + pad(date.getUTCDate())
        + 'T' + pad(date.getUTCHours())
        + pad(date.getUTCMinutes())
        + pad(date.getUTCSeconds()) + 'Z';
    }

    // Compute the UTC instant (epoch ms) that corresponds to the given wall-time
    // components in the given IANA time zone using a binary search over a +/-36h window.
    function epochForZoneWallTime(year, month0, day, hour, minute, second, timeZone) {
        const target = `${String(year).padStart(4,'0')}-${String(month0+1).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}`;
        // Initial guess: interpret as UTC epoch for that YMDHMS
        const guess = Date.UTC(year, month0, day, hour, minute, second);
        let low = guess - 1000*60*60*36;
        let high = guess + 1000*60*60*36;
        const fmt = (ms) => {
            const parts = {};
            new Intl.DateTimeFormat('en-US', {
                timeZone,
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            }).formatToParts(new Date(ms)).forEach(p => { if (p.type !== 'literal') parts[p.type] = p.value; });
            return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
        };
        // Binary search
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const midStr = fmt(mid);
            if (midStr === target) return mid;
            if (midStr < target) low = mid + 1;
            else high = mid - 1;
        }
        return NaN;
    }

    // Convert a Date (or wall-time interpreted in host timezone) into the UTC ICS string
    // for the instant that matches the same wall-clock in the requested timeZone.
    // Example: a Date representing "2026-04-25T09:00" (host local) and timeZone 'America/Denver'
    // will produce the UTC instant for 2026-04-25 09:00 America/Denver.
    function toUTCStringForICSFromTZ(date, timeZone = 'America/Denver'){
        // get the wall-time components we want to represent in the zone
        const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        const parts = {};
        fmt.formatToParts(date).forEach(p => { if (p.type !== 'literal') parts[p.type] = p.value; });

        const year = Number(parts.year);
        const month0 = Number(parts.month) - 1;
        const day = Number(parts.day);
        const hour = Number(parts.hour);
        const minute = Number(parts.minute);
        const second = Number(parts.second);

        const epoch = epochForZoneWallTime(year, month0, day, hour, minute, second, timeZone);
        if (!isFinite(epoch)) return toUTCStringForICS(date); // fallback to instant's UTC
        const d = new Date(epoch);
        return d.getUTCFullYear()
        + pad(d.getUTCMonth()+1)
        + pad(d.getUTCDate())
        + 'T' + pad(d.getUTCHours())
        + pad(d.getUTCMinutes())
        + pad(d.getUTCSeconds()) + 'Z';
    }

    function defaultEndDate(start){ return new Date(start.getTime() + 60*60*1000); }

    const parseFn = window._scheduleHelpers?.parseEventTimeFromAttributes || function(timeRaw, dayAttr){
        if (!timeRaw && !dayAttr) return null;
        if (timeRaw && /^\d{4}-\d{2}-\d{2}T/.test(timeRaw)) return new Date(timeRaw);
        if (dayAttr && /^\d{4}-\d{2}-\d{2}$/.test(dayAttr) && timeRaw) return new Date(`${dayAttr}T${timeRaw}`);
        const weekdayIndexFromName = window._scheduleHelpers?.weekdayIndexFromName || function(name){
            if (!name) return null;
            const map = {sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};
            const k = String(name).trim().toLowerCase().slice(0,3);
            return map[k] ?? null;
        };
        const wk = weekdayIndexFromName(dayAttr);
        if (wk !== null && timeRaw) {
            const now = new Date();
            const todayIdx = now.getDay();
            const parts = timeRaw.split(':').map(p=>parseInt(p,10)||0);
            let daysUntil = (wk - todayIdx + 7) % 7;
            let cand = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntil,
                                parts[0]||0, parts[1]||0, parts[2]||0);
            if (cand <= now) { daysUntil = daysUntil === 0 ? 7 : daysUntil;
                cand = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntil,
                                parts[0]||0, parts[1]||0, parts[2]||0);
            }
            return cand;
        }
        if (timeRaw && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeRaw)) {
            const p = timeRaw.split(':').map(x=>parseInt(x,10)||0);
            const n = new Date();
            return new Date(n.getFullYear(), n.getMonth(), n.getDate(), p[0]||0, p[1]||0, p[2]||0);
        }
        return null;
    };

    function buildICSForEvents(events){
        const now = new Date();
        const dtstamp = toUTCStringForICS(now); // DTSTAMP is the current instant's UTC
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//YourApp//Schedule//EN',
            'CALSCALE:GREGORIAN'
        ];
        events.forEach((ev, idx) => {
            const title = ev.getAttribute('data-title') || ev.querySelector('.title')?.textContent || `Event ${idx+1}`;
            const timeRaw = ev.getAttribute('data-time');
            const dayAttr = ev.getAttribute('data-day');
            const address = (ev.querySelector('.address')?.textContent || ev.getAttribute('data-address') || '').replace(/[\r\n]/g,' ');
            const start = parseFn(timeRaw, dayAttr);
            if (!start || isNaN(start)) return; // skip invalid
            let end = null;
            const endAttr = ev.getAttribute('data-end');
            if (endAttr){
                if (/^\d{4}-\d{2}-\d{2}T/.test(endAttr)) end = new Date(endAttr);
                else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(endAttr)){
                    const parts = endAttr.split(':').map(x=>parseInt(x,10)||0);
                    end = new Date(start.getFullYear(), start.getMonth(), start.getDate(),
                                   parts[0]||0, parts[1]||0, parts[2]||0);
                }
            }
            if (!end || isNaN(end)) end = defaultEndDate(start);
            const uid = `evt-${Date.now()}-${idx}-${Math.random().toString(36).slice(2,8)}`;
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${uid}`);
            lines.push(`DTSTAMP:${dtstamp}`);
            // Force Mountain Time (America/Denver) for DTSTART/DTEND by interpreting the event wall-time
            // in that zone and emitting the corresponding UTC instant.
            lines.push(`DTSTART:${toUTCStringForICSFromTZ(start, 'America/Denver')}`);
            lines.push(`DTEND:${toUTCStringForICSFromTZ(end, 'America/Denver')}`);
            lines.push(`SUMMARY:${title.replace(/[\r\n]/g,' ')}`);
            if (address) lines.push(`LOCATION:${address}`);
            lines.push('END:VEVENT');
        });
        lines.push('END:VCALENDAR');
        return lines.join('\r\n');
    }

    document.addEventListener('click', (e) => {
        const btn = e.target.closest && e.target.closest('#download-all-ics');
        if (!btn) return;
        const events = Array.from(document.querySelectorAll('.event'));
        if (!events.length) { alert('No events found'); return; }
        const ics = buildICSForEvents(events);
        const blob = new Blob([ics], {type: 'text/calendar;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'events.ics';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    });
})();
