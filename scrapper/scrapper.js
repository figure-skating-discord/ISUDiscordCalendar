const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const axios = require('axios');
let sharp;
try {
    sharp = require('sharp');
} catch (error) {
    sharp = null;
}

const ISU_SKATING_BASE = 'https://isu-skating.com';
const DEFAULT_LOCATION = 'Location TBD';
const MAX_SEASON_LOOKAHEAD = 3;
const IMAGE_TARGET_ASPECT_RATIO = 3;

const DISCIPLINE_PATHS = {
    'figure-skating': 'FIGURE SKATING',
    'synchronized-skating': 'SYNCHRONIZED SKATING',
    'speed-skating': 'SPEED SKATING',
    'short-track': 'SHORT TRACK'
};

const DISCIPLINE_LABELS = {
    'FIGURE SKATING': 'Figure Skating',
    'SYNCHRONIZED SKATING': 'Synchronized Skating',
    'SPEED SKATING': 'Speed Skating',
    'SHORT TRACK': 'Short Track'
};

const DEFAULT_EVENT_BANNERS = {
    'FIGURE SKATING': 'https://isu-skating.com/_next/static/media/figure-skating-ioc.f68dbba2.svg',
    'SYNCHRONIZED SKATING': 'https://isu-skating.com/_next/static/media/synch-skating-ioc.9f043fad.svg',
    'SPEED SKATING': 'https://isu-skating.com/_next/static/media/speed-skating-ioc.a4b8e08b.svg',
    'SHORT TRACK': 'https://isu-skating.com/_next/static/media/short-skating-ioc.6c0a5e55.svg'
};

class Scrapper {
    constructor(calendarLimit = 0, calendarURL, calendarLimitStart = 0) {
        this.calendarURL = this.#normalizeCalendarUrl(calendarURL);
        this.calendarLimit = calendarLimit;
        this.calendarLimitStart = calendarLimitStart;
        this.defaultImageCache = {};
    }

    async scrapCalendar(options = {}) {
        const events = [];
        const canceledEvents = [];
        const seen = new Set();
        const limit = this.calendarLimit && this.calendarLimit > 0 ? this.calendarLimit : undefined;
        const { upcomingOnly = false } = options;
        const now = new Date();
        const { startUrl, seasonUrls } = this.#buildCalendarUrlPlan();

        if (startUrl) {
            const pageHtml = await this.#getCalendarHTML(startUrl);
            if (pageHtml !== 'invalid link') {
                let pageEvents = this.#parseCalendarEvents(pageHtml, startUrl);
                if (upcomingOnly) {
                    pageEvents = pageEvents.filter((eventInfo) => {
                        if (!eventInfo?.scheduledStartTime) {
                            return false;
                        }
                        return eventInfo.scheduledStartTime.getTime() >= now.getTime();
                    });
                }
                this.#appendEvents(events, pageEvents, seen, limit);
            }
        }

        if (limit && events.length < limit) {
            for (const seasonUrl of seasonUrls) {
                const pageHtml = await this.#getCalendarHTML(seasonUrl);
                if (pageHtml === 'invalid link') {
                    continue;
                }

                let pageEvents = this.#parseCalendarEvents(pageHtml, seasonUrl);
                if (upcomingOnly) {
                    pageEvents = pageEvents.filter((eventInfo) => {
                        if (!eventInfo?.scheduledStartTime) {
                            return false;
                        }
                        return eventInfo.scheduledStartTime.getTime() >= now.getTime();
                    });
                }
                this.#appendEvents(events, pageEvents, seen, limit);

                if (events.length >= limit) {
                    break;
                }
            }
        }

        return [limit ? events.slice(0, limit) : events, canceledEvents];
    }

    async scrapeSingleEvent(url, fallbackInfo = undefined) {
        const baseInfo = fallbackInfo ? { ...fallbackInfo } : {};
        if (url) {
            baseInfo.link = url;
            baseInfo.detailUrl = url;
        }

        if (!url) {
            return await this.#finalizeEventInfo(baseInfo);
        }

        const pageHtml = await this.#getHTML(url);
        if (pageHtml !== 'invalid link') {
            return await this.#parseEventPage(pageHtml, url, baseInfo);
        }

        return await this.#finalizeEventInfo(baseInfo);
    }

    async #getCalendarHTML(calendarUrl) {
        try {
            const response = await fetch(calendarUrl, {
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9"
                }
            });
            if (!response.ok) {
                throw new Error('invalid request URL');
            }
            return await response.text();
        } catch (error) {
            console.log("catch err:", error);
            console.log('url:', calendarUrl);
            return 'invalid link';
        }
    }

    async #getHTML(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('invalid request URL');
            }
            return await response.text();
        } catch (error) {
            console.log("catch err:", error);
            console.log('url:', url);
            return 'invalid link';
        }
    }

    #parseCalendarEvents(pageHtml, calendarUrl) {
        const dom = new JSDOM(pageHtml);
        const document = dom.window.document;
        const cards = Array.from(document.querySelectorAll('.events-box'));
        const events = [];
        const disciplineFromUrl = this.#getDisciplineFromUrl(calendarUrl);

        cards.forEach((card) => {
            const dateText = this.#normalizeText(card.querySelector('h5')?.textContent);
            const name = this.#normalizeText(card.querySelector('h3')?.textContent);
            const location = this.#normalizeText(card.querySelector('.flag-text span:last-child')?.textContent);
            const disciplineText = this.#normalizeText(card.querySelector('.event-card-content p')?.textContent);
            const dateRange = this.#parseDateRange(dateText);
            const detailLinkNode = card.querySelector('.event-card-btn a[title="Discover more"], .event-card-btn a[href*="/eventdetail/"]');
            const detailHref = detailLinkNode?.getAttribute('href');
            const detailUrl = detailHref ? new URL(detailHref, calendarUrl).toString() : undefined;
            const canceled = /cancelled|canceled/i.test(card.textContent || '');

            if (!name || !dateRange) {
                return;
            }

            const eventInfo = {
                name,
                location,
                discipline: disciplineText || disciplineFromUrl,
                scheduledStartTime: dateRange.start,
                scheduledEndTime: dateRange.end,
                detailUrl,
                link: detailUrl,
                listingUrl: calendarUrl,
                canceled
            };

            if (!eventInfo.link) {
                eventInfo.link = this.#buildFallbackLink(calendarUrl, name);
            }

            events.push(eventInfo);
        });

        return events;
    }

    async #parseEventPage(pageHtml, pageUrl, fallbackInfo = {}) {
        const dom = new JSDOM(pageHtml, { url: pageUrl });
        const document = dom.window.document;
        const info = { ...fallbackInfo };

        const name = this.#normalizeText(document.querySelector('.event-single-banner-detail h1')?.textContent);
        if (name) {
            info.name = name;
        }

        const detailItems = Array.from(document.querySelectorAll('.event-single-banner-detail ul li'));
        const location = this.#normalizeText(detailItems[0]?.textContent);
        const dateText = this.#normalizeText(detailItems[1]?.textContent);
        const discipline = this.#normalizeText(detailItems[2]?.textContent);

        if (location) {
            info.location = location;
        }
        if (discipline) {
            info.discipline = discipline;
        }

        const canceled = /cancelled|canceled/i.test(detailItems[1]?.textContent || '');
        info.canceled = canceled || info.canceled === true;

        const dateRange = this.#parseDateRange(dateText);
        if (dateRange) {
            info.scheduledStartTime = dateRange.start;
            info.scheduledEndTime = dateRange.end;
        }

        const imageUrl = this.#extractEventImageUrl(document, pageUrl);
        if (imageUrl) {
            info.coverImgB64 = await this.#convertImageLinkToDataURL(imageUrl);
        }

        info.link = pageUrl;
        info.detailUrl = pageUrl;

        return await this.#finalizeEventInfo(info);
    }

    #appendEvents(target, source, seen, limit) {
        for (const eventInfo of source) {
            const key = this.#buildEventKey(eventInfo);
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            target.push(eventInfo);

            if (limit && target.length >= limit) {
                break;
            }
        }
    }

    #buildEventKey(eventInfo) {
        if (eventInfo?.link) {
            return eventInfo.link;
        }
        const name = eventInfo?.name || '';
        const start = eventInfo?.scheduledStartTime instanceof Date
            ? eventInfo.scheduledStartTime.toISOString()
            : '';
        return `${name}|${start}`;
    }

    #buildFallbackLink(calendarUrl, name) {
        if (!calendarUrl) {
            return undefined;
        }
        if (!name) {
            return calendarUrl;
        }
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return `${calendarUrl.replace(/#.*$/, '')}#${slug}`;
    }

    #buildCalendarUrlPlan() {
        const startUrl = this.calendarURL;
        if (!startUrl) {
            return { startUrl: undefined, seasonUrls: [] };
        }

        let baseUrl = startUrl;
        let baseParams = new URLSearchParams();
        let seasonParam;

        try {
            const parsed = new URL(startUrl);
            baseUrl = `${parsed.origin}${parsed.pathname}`;
            baseParams = new URLSearchParams(parsed.search);
            seasonParam = baseParams.get('season');
        } catch (error) {
            baseUrl = startUrl;
        }

        baseParams.delete('season');
        const seasonStartYear = this.#getSeasonStartYear(seasonParam) ?? this.#getCurrentSeasonStartYear();
        const seasonUrls = [];
        const startOffset = seasonParam ? 1 : 0;

        for (let i = 0; i < MAX_SEASON_LOOKAHEAD; i++) {
            const season = `${seasonStartYear + i + startOffset}/${seasonStartYear + i + startOffset + 1}`;
            const url = this.#buildSeasonUrl(baseUrl, season, baseParams);
            if (url && url !== startUrl) {
                seasonUrls.push(url);
            }
        }

        return { startUrl, seasonUrls };
    }

    #buildSeasonUrl(baseUrl, season, baseParams) {
        if (!baseUrl) {
            return undefined;
        }
        let parsed;
        try {
            parsed = new URL(baseUrl);
        } catch (error) {
            return undefined;
        }

        const params = new URLSearchParams(baseParams.toString());
        if (!params.get('month')) {
            params.set('month', 'All');
        }
        if (!params.get('type')) {
            params.set('type', 'All ISU Events');
        }
        if (!params.get('eventLevel')) {
            params.set('eventLevel', 'ISU');
        }
        params.set('season', season);
        parsed.search = params.toString();
        return parsed.toString();
    }

    #getSeasonStartYear(seasonText) {
        if (!seasonText) {
            return undefined;
        }
        const match = seasonText.match(/^(\d{4})/);
        if (!match) {
            return undefined;
        }
        return Number(match[1]);
    }

    #getCurrentSeasonStartYear() {
        const now = new Date();
        const year = now.getFullYear();
        // Seasons typically roll over mid-year (around July).
        return now.getMonth() >= 6 ? year : year - 1;
    }

    #normalizeCalendarUrl(calendarUrl) {
        if (!calendarUrl) {
            return calendarUrl;
        }
        const trimmed = calendarUrl.trim();
        if (/isu\.org/i.test(trimmed)) {
            if (/figure-skating/i.test(trimmed)) {
                return `${ISU_SKATING_BASE}/figure-skating/events/`;
            }
            if (/synchronized-skating/i.test(trimmed)) {
                return `${ISU_SKATING_BASE}/synchronized-skating/events/`;
            }
            if (/speed-skating/i.test(trimmed)) {
                return `${ISU_SKATING_BASE}/speed-skating/events/`;
            }
            if (/short-track/i.test(trimmed)) {
                return `${ISU_SKATING_BASE}/short-track/events/`;
            }
        }

        try {
            const parsed = new URL(trimmed);
            if (parsed.hostname.endsWith('isu-skating.com') && !parsed.pathname.endsWith('/')) {
                parsed.pathname = `${parsed.pathname}/`;
            }
            return parsed.toString();
        } catch (error) {
            return trimmed;
        }
    }

    #getDisciplineFromUrl(url) {
        if (!url) {
            return undefined;
        }
        try {
            const parsed = new URL(url);
            const match = parsed.pathname.match(/\/(figure-skating|synchronized-skating|speed-skating|short-track)\//i);
            if (match && DISCIPLINE_PATHS[match[1].toLowerCase()]) {
                return DISCIPLINE_PATHS[match[1].toLowerCase()];
            }
        } catch (error) {
            return undefined;
        }
        return undefined;
    }

    #normalizeText(text) {
        if (!text) {
            return undefined;
        }
        return text.replace(/\s+/g, ' ').trim();
    }

    #toDisciplineKey(value) {
        if (!value) {
            return undefined;
        }
        const trimmed = value.trim();
        const upper = trimmed.toUpperCase();
        if (DISCIPLINE_LABELS[upper]) {
            return upper;
        }
        const pathKey = DISCIPLINE_PATHS[trimmed.toLowerCase()];
        if (pathKey) {
            return pathKey;
        }
        return upper;
    }

    #formatDiscipline(value) {
        const key = this.#toDisciplineKey(value);
        if (!key) {
            return undefined;
        }
        return DISCIPLINE_LABELS[key] || value;
    }

    #parseDateRange(dateText) {
        if (!dateText) {
            return undefined;
        }
        const cleaned = this.#normalizeText(dateText)
            .replace(/cancelled|canceled/ig, '')
            .trim();

        if (!cleaned) {
            return undefined;
        }

        let match = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)\s*-\s*(\d{1,2})\s+([A-Za-z]+),\s*(\d{4})$/);
        if (match) {
            const startDay = Number(match[1]);
            const startMonth = match[2];
            const endDay = Number(match[3]);
            const endMonth = match[4];
            const year = Number(match[5]);

            let startYear = year;
            let endYear = year;
            const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
            const endDate = new Date(`${endMonth} ${endDay}, ${year}`);
            if (startDate.getTime() > endDate.getTime()) {
                startYear = year - 1;
            }

            return this.#normalizeDateRange(
                new Date(`${startMonth} ${startDay}, ${startYear}`),
                new Date(`${endMonth} ${endDay}, ${endYear}`)
            );
        }

        match = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)\s*-\s*(\d{1,2}),\s*(\d{4})$/);
        if (match) {
            const startDay = Number(match[1]);
            const month = match[2];
            const endDay = Number(match[3]);
            const year = Number(match[4]);
            return this.#normalizeDateRange(
                new Date(`${month} ${startDay}, ${year}`),
                new Date(`${month} ${endDay}, ${year}`)
            );
        }

        match = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+),\s*(\d{4})$/);
        if (match) {
            const day = Number(match[1]);
            const month = match[2];
            const year = Number(match[3]);
            const date = new Date(`${month} ${day}, ${year}`);
            return this.#normalizeDateRange(date, date);
        }

        return undefined;
    }

    #normalizeDateRange(startLocal, endLocal) {
        if (!(startLocal instanceof Date) || isNaN(startLocal)) {
            return undefined;
        }
        if (!(endLocal instanceof Date) || isNaN(endLocal)) {
            return undefined;
        }
        let startUTC = this.#toUtcDate(startLocal);
        let endUTC = this.#toUtcDate(endLocal);

        if (startUTC.getTime() === endUTC.getTime()) {
            endUTC = new Date(endUTC.getTime() + 1000 * 60 * 60 * 24);
        }

        if (startUTC.getTime() > endUTC.getTime()) {
            endUTC = new Date(startUTC.getTime() + 1000 * 60 * 60 * 24);
        }

        return { start: startUTC, end: endUTC };
    }

    #toUtcDate(localDate) {
        return new Date(localDate.getTime() + localDate.getTimezoneOffset() * 60_000);
    }

    #extractEventImageUrl(document, baseUrl) {
        const bannerImg = document.querySelector('.event-single-banner-top img')
            || document.querySelector('img[alt="event"]');
        let src = bannerImg?.getAttribute('src') || '';

        if (!src) {
            const srcSet = bannerImg?.getAttribute('srcset') || '';
            const firstSrc = srcSet.split(',')[0]?.trim().split(' ')[0];
            src = firstSrc || '';
        }

        if (!src) {
            const ogImage = document.querySelector('meta[property="og:image"], meta[name="og:image"]');
            src = ogImage?.getAttribute('content') || '';
        }

        if (!src) {
            return undefined;
        }

        return this.#normalizeImageUrl(src, baseUrl);
    }

    #normalizeImageUrl(imageUrl, baseUrl) {
        if (!imageUrl) {
            return undefined;
        }

        let absolute;
        try {
            absolute = new URL(imageUrl, baseUrl).toString();
        } catch (error) {
            return imageUrl;
        }

        try {
            const parsed = new URL(absolute);
            if (parsed.pathname.includes('/_next/image') && parsed.searchParams.has('url')) {
                const decoded = decodeURIComponent(parsed.searchParams.get('url'));
                return decoded || absolute;
            }
        } catch (error) {
            return absolute;
        }

        return absolute;
    }

    async #getDefaultImageDataUrl(disciplineValue) {
        const key = this.#toDisciplineKey(disciplineValue);
        if (!key) {
            return undefined;
        }
        const bannerUrl = DEFAULT_EVENT_BANNERS[key];
        if (!bannerUrl) {
            return undefined;
        }

        if (!this.defaultImageCache[bannerUrl]) {
            this.defaultImageCache[bannerUrl] = await this.#convertImageLinkToDataURL(bannerUrl);
        }
        return this.defaultImageCache[bannerUrl];
    }

    async #finalizeEventInfo(info) {
        const normalized = { ...info };
        normalized.discipline = this.#formatDiscipline(normalized.discipline) || normalized.discipline;
        normalized.location = normalized.location || DEFAULT_LOCATION;

        if (!normalized.link && normalized.listingUrl) {
            normalized.link = this.#buildFallbackLink(normalized.listingUrl, normalized.name);
        }

        if (!normalized.coverImgB64) {
            normalized.coverImgB64 = await this.#getDefaultImageDataUrl(normalized.discipline);
        }

        return normalized;
    }

    async #convertImageLinkToDataURL(imageUrl) {
        if (!imageUrl) {
            return undefined;
        }
        try {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const contentType = response.headers['content-type'];
            if (!contentType || !contentType.startsWith('image/')) {
                throw new Error('The URL does not point to an image.');
            }

            let buffer = Buffer.from(response.data, 'binary');
            let outputType = contentType;

            if (sharp) {
                buffer = await this.#padImageBuffer(buffer);
                outputType = 'image/png';
            }

            const base64 = buffer.toString('base64');
            return `data:${outputType};base64,${base64}`;
        } catch (error) {
            console.error(error);
        }
    }

    async #padImageBuffer(buffer) {
        if (!sharp) {
            return buffer;
        }
        const image = sharp(buffer, { failOnError: false });
        const metadata = await image.metadata();
        if (!metadata?.height || !metadata?.width) {
            return buffer;
        }
        const width = metadata.width;
        const height = metadata.height;
        const currentRatio = width / height;
        let top = 0;
        let bottom = 0;
        let left = 0;
        let right = 0;

        if (currentRatio < IMAGE_TARGET_ASPECT_RATIO) {
            const targetWidth = Math.round(height * IMAGE_TARGET_ASPECT_RATIO);
            const padTotal = Math.max(targetWidth - width, 0);
            left = Math.floor(padTotal / 2);
            right = padTotal - left;
        } else if (currentRatio > IMAGE_TARGET_ASPECT_RATIO) {
            const targetHeight = Math.round(width / IMAGE_TARGET_ASPECT_RATIO);
            const padTotal = Math.max(targetHeight - height, 0);
            top = Math.floor(padTotal / 2);
            bottom = padTotal - top;
        }

        if (top === 0 && bottom === 0 && left === 0 && right === 0) {
            return buffer;
        }

        return await image
            .extend({
                top,
                bottom,
                left,
                right,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toBuffer();
    }

    checkValidURL(url) {
        if (!url) {
            return false;
        }
        try {
            const parsed = new URL(url);
            const hostname = parsed.hostname.replace(/^www\./i, '');
            if (hostname === 'isu-skating.com') {
                return /\/(figure-skating|synchronized-skating|speed-skating|short-track)\/events(\/|$)/i.test(parsed.pathname);
            }
            if (/isu\.org$/i.test(hostname)) {
                return /\/events\//i.test(parsed.pathname);
            }
        } catch (error) {
            return false;
        }
        return false;
    }
}

module.exports = { Scrapper };
