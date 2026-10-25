// ==UserScript==
// @name         AREDL CZ/SK Komunitní Mapa Hráčů
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Interaktivní Leaflet komunitní mapa vložená přímo do AREDL pro české a slovenské Geometry Dash hráče.
// @author       Drowex
// @match        https://aredl.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      mapagd.vercel.app
// @connect      nominatim.openstreetmap.org
// @require      https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
// @resource     LEAFLET_CSS https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @run-at       document-idle
// ==/UserScript==

/* global L */

(function () {
    'use strict';

    const BACKEND_URL = 'https://mapagd.vercel.app/api/players';

    let cachedPlayers = [];
    let isFetchingPlayers = false;
    let activeMetric = 'rank_packs';
    let isTheoreticalMode = false;
    let activeNatFilter = 'ALL';
    let mapMarkers = {};

    function normalizeUrl(url) {
        if (!url) return '';
        let clean = url.trim().replace(/\/+$/, '');
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
            clean = 'https://' + clean;
        }
        return clean.toLowerCase();
    }

    const leafletCss = GM_getResourceText('LEAFLET_CSS');
    if (leafletCss) {
        GM_addStyle(leafletCss);
    } else {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
    }

    GM_addStyle(`
        @keyframes czskFadeIn {
            from { opacity: 0; backdrop-filter: blur(0px); }
            to { opacity: 1; backdrop-filter: blur(6px); }
        }
        @keyframes czskPopIn {
            from { transform: scale(0.96); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }

        .czsk-nav-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: #ff9800 !important;
            font-size: 0.875rem;
            font-weight: 500;
            text-transform: uppercase;
            background: transparent;
            border: none;
            cursor: pointer;
            transition: color 0.15s ease;
            margin-left: 12px;
        }
        .czsk-nav-btn:hover {
            color: #ffa726 !important;
        }
        .czsk-floating-btn {
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 999998;
            background: #151821;
            padding: 8px 14px;
            border: 1px solid #ff9800;
            border-radius: 6px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.6);
        }
        .czsk-map-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.85);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(6px);
            animation: czskFadeIn 0.2s ease-out forwards;
        }
        .czsk-map-modal {
            background: #151821;
            border: 1.5px solid #ff9800;
            border-radius: 12px;
            width: 98vw;
            max-width: 1800px;
            height: 95vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 16px 50px rgba(0,0,0,0.9);
            font-family: inherit;
            animation: czskPopIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .czsk-map-header {
            padding: 14px 20px;
            background: #1c202c;
            border-bottom: 1px solid #2a2e3d;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .czsk-map-body {
            display: flex;
            flex-direction: row;
            flex: 1;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        .czsk-left-sidebar {
            width: 320px;
            min-width: 320px;
            background: #181b24;
            border-right: 1px solid #2a2e3d;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .czsk-lb-header {
            padding: 16px 20px 10px;
            background: #11141c;
            color: #ff9800;
            font-weight: 800;
            font-size: 14px;
            text-transform: uppercase;
        }
        .czsk-lb-tabs {
            display: flex;
            background: #11141c;
            border-bottom: 1px solid #2a2e3d;
        }
        .czsk-lb-tab {
            flex: 1;
            padding: 10px 0;
            text-align: center;
            font-size: 12px;
            font-weight: bold;
            color: #8e95a5;
            background: transparent;
            border: none;
            border-bottom: 2px solid transparent;
            cursor: pointer;
            transition: 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .czsk-lb-tab:hover {
            color: #ccc;
            background: rgba(255,152,0,0.05);
        }
        .czsk-lb-tab.active {
            color: #ff9800;
            border-bottom: 2px solid #ff9800;
            background: rgba(255,152,0,0.1);
        }
        .czsk-lb-list {
            flex: 1;
            overflow-y: auto;
            padding: 10px 0;
        }
        .czsk-lb-list::-webkit-scrollbar { width: 6px; }
        .czsk-lb-list::-webkit-scrollbar-track { background: #11141c; }
        .czsk-lb-list::-webkit-scrollbar-thumb { background: #444a5e; border-radius: 4px; }
        .czsk-lb-item {
            display: flex;
            align-items: center;
            padding: 10px 20px;
            cursor: pointer;
            transition: 0.15s;
            border-bottom: 1px solid #202430;
        }
        .czsk-lb-item:hover {
            background: #202430;
        }
        .czsk-lb-rank {
            font-weight: 900;
            width: 40px;
        }
        .czsk-lb-name {
            flex: 1;
            color: #fff;
            font-weight: bold;
            font-size: 13px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .czsk-flag-img {
            width: 16px;
            height: auto;
            border-radius: 2px;
            box-shadow: 0 0 2px rgba(0,0,0,0.5);
            margin-left: 8px;
            display: inline-block;
        }

        #czsk-leaflet-map {
            flex: 1;
            height: 100%;
            background: #0f1117;
        }

        .czsk-sidebar {
            width: 340px;
            min-width: 340px;
            background: #181b24;
            border-left: 1px solid #2a2e3d;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            overflow-y: auto;
            box-sizing: border-box;
        }
        .czsk-sidebar input[type="text"] {
            background: #252a38;
            border: 1px solid #444a5e;
            color: #fff;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            width: 100%;
            box-sizing: border-box;
            transition: border-color 0.2s;
        }
        .czsk-sidebar input[type="text"]:focus {
            outline: none;
            border-color: #ff9800;
        }
        .czsk-radio-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: #11141c;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #2a2e3d;
        }
        .czsk-radio-group label {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #fff;
            font-size: 13px;
            cursor: pointer;
            transition: color 0.1s;
        }
        .czsk-radio-group label:hover {
            color: #ff9800;
        }
        .czsk-radio-group input[type="radio"] {
            accent-color: #ff9800;
            width: 16px;
            height: 16px;
            margin: 0;
            cursor: pointer;
        }
        .czsk-sidebar button.czsk-submit {
            background: #ff9800;
            color: #121316;
            font-weight: 800;
            padding: 10px 14px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: 0.15s;
            font-size: 14px;
            width: 100%;
            box-shadow: 0 4px 10px rgba(255,152,0,0.2);
        }
        .czsk-sidebar button.czsk-submit:hover {
            background: #ffa726;
            transform: translateY(-1px);
        }
        .czsk-sidebar button.czsk-submit:active {
            transform: translateY(1px);
        }
        .czsk-theme-toggle {
            background: transparent !important;
            border: 1px solid #ff9800 !important;
            color: #ff9800 !important;
            font-size: 12px !important;
            padding: 4px 8px !important;
            border-radius: 4px;
            cursor: pointer;
            transition: 0.2s;
        }
        .czsk-theme-toggle:hover {
            background: rgba(255, 152, 0, 0.15) !important;
            color: #ffa726 !important;
        }
        .czsk-switch-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #11141c;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid #2a2e3d;
        }
        .czsk-switch {
            position: relative;
            display: inline-block;
            width: 36px;
            height: 20px;
        }
        .czsk-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .czsk-slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #252a38;
            transition: .2s;
            border-radius: 20px;
            border: 1px solid #444a5e;
        }
        .czsk-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 2px;
            bottom: 2px;
            background-color: #8e95a5;
            transition: .2s;
            border-radius: 50%;
        }
        .czsk-switch input:checked + .czsk-slider {
            background-color: #ff9800;
            border-color: #ff9800;
        }
        .czsk-switch input:checked + .czsk-slider:before {
            transform: translateX(16px);
            background-color: #121316;
        }
        .czsk-star-marker-container {
            background: transparent;
            border: none;
        }
        .czsk-star-inner {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            transition: transform 0.15s ease;
            cursor: pointer;
            will-change: transform;
            -webkit-font-smoothing: antialiased;
        }
        .czsk-star-inner:hover {
            transform: scale(1.35);
        }
        .czsk-star-name {
            font-size: 11px;
            font-weight: 900;
            margin-top: 4px;
            white-space: nowrap;
            background: rgba(15, 17, 23, 0.85);
            padding: 3px 7px;
            border-radius: 6px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
            text-rendering: optimizeLegibility;
            letter-spacing: 0.2px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .leaflet-popup-content-wrapper {
            background: #1a1e29 !important;
            color: #fff !important;
            border: 1px solid #ff9800 !important;
            border-radius: 10px !important;
            padding: 0 !important;
        }
        .leaflet-popup-content {
            margin: 14px !important;
            width: auto !important;
        }
        .leaflet-popup-tip {
            background: #1a1e29 !important;
        }
        .czsk-autocomplete-container {
            position: relative;
            width: 100%;
        }
        .czsk-autocomplete-list {
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            right: 0;
            background: #1f222b;
            border: 1px solid #ff9800;
            border-radius: 6px;
            max-height: 160px;
            overflow-y: auto;
            z-index: 2000;
            display: none;
            box-shadow: 0 4px 15px rgba(0,0,0,0.8);
        }
        .czsk-autocomplete-item {
            padding: 10px 12px;
            font-size: 12px;
            cursor: pointer;
            border-bottom: 1px solid #2a2d37;
            color: #ccc;
        }
        .czsk-autocomplete-item:hover {
            background: #ff9800;
            color: #121316;
            font-weight: bold;
        }
        .czsk-autocomplete-loading {
            padding: 10px 12px;
            font-size: 11px;
            color: #8e95a5;
            font-style: italic;
            text-align: center;
        }
        .czsk-nat-btn:hover {
            background: rgba(255,255,255,0.05);
        }
    `);

    function getMarkerConfig(rank) {
        if (rank > 0 && rank <= 10) return { color: '#00ffff', tier: 'Top 10' };
        if (rank > 10 && rank <= 25) return { color: '#ffcc00', tier: 'Top 25' };
        if (rank > 25 && rank <= 100) return { color: '#d4d4d4', tier: 'Top 100' };
        return { color: '#c07a50', tier: 'Unranked/Bronze' };
    }

    function autoDetectProfileInfo() {
        let detectedName = GM_getValue('czsk_saved_name', '');
        let detectedLink = GM_getValue('czsk_saved_link', '');
        let nationality = GM_getValue('czsk_saved_nat', 'CZ');

        let oPacks = GM_getValue('czsk_saved_r_packs', 99999);
        let oNoPacks = GM_getValue('czsk_saved_r_nopacks', 99999);
        let oHardest = GM_getValue('czsk_saved_r_hardest', 99999);
        let oExtremes = GM_getValue('czsk_saved_r_extremes', 99999);

        let tPacks = GM_getValue('czsk_saved_t_packs', 99999);
        let tNoPacks = GM_getValue('czsk_saved_t_nopacks', 99999);
        let tHardest = GM_getValue('czsk_saved_t_hardest', 99999);
        let tExtremes = GM_getValue('czsk_saved_t_extremes', 99999);

        let hasTheoExt = false;

        const nameElement = document.querySelector('p.clamp-\\[text-2xl-4xl-clamp\\], p.font-medium.text-secondary-foreground');

        if (nameElement && window.location.href.includes('/profile/user/')) {
            detectedName = nameElement.textContent.trim();
            detectedLink = normalizeUrl(window.location.href);

            const flags = document.querySelectorAll('img');
            for(let img of flags) {
                if(img.src.includes('cz.svg') || img.src.includes('cz.png') || img.alt.toLowerCase().includes('czech')) nationality = 'CZ';
                if(img.src.includes('sk.svg') || img.src.includes('sk.png') || img.alt.toLowerCase().includes('slovak')) nationality = 'SK';
            }

            const bodyText = document.body.innerText.toUpperCase().replace(/\s+/g, ' ');
            const countryIdx = bodyText.indexOf('COUNTRY RANKINGS');

            if (countryIdx !== -1) {
                let countryText = bodyText.substring(countryIdx);

                // V18.5 FIX: Hledá výhradně číslo za znakem "#", ignoruje samotné body
                const extractRank = (keyword) => {
                    const regex = new RegExp(keyword + '[^#]{0,100}#\\s*(\\d+)');
                    const m = countryText.match(regex);
                    return m ? parseInt(m[1]) : 99999;
                };

                oPacks = extractRank('POINTS RANK \\(WITH PACKS\\)');
                oNoPacks = extractRank('POINTS RANK(?! \\(WITH)');
                oHardest = extractRank('HARDEST LEVEL RANK');
                oExtremes = extractRank('EXTREMES COUNT RANK');

                tPacks = extractRank('THEORETICAL POINTS RANK \\(WITH PACKS\\)');
                tNoPacks = extractRank('THEORETICAL POINTS RANK(?! \\(WITH)');
                tHardest = extractRank('THEORETICAL HARDEST LEVEL RANK');
                tExtremes = extractRank('THEORETICAL EXTREMES COUNT RANK');

                if (tPacks !== 99999 || tNoPacks !== 99999 || tHardest !== 99999 || tExtremes !== 99999) {
                    hasTheoExt = true;
                }
            }
        }

        return {
            name: detectedName,
            link: detectedLink,
            nationality: nationality,
            oPacks, oNoPacks, oHardest, oExtremes,
            tPacks, tNoPacks, tHardest, tExtremes,
            hasTheoreticalExtension: hasTheoExt
        };
    }

    function checkAndAutoSyncStats() {
        const savedName = GM_getValue('czsk_saved_name');
        const savedCity = GM_getValue('czsk_saved_city');
        const savedLat = GM_getValue('czsk_saved_lat');
        const savedLng = GM_getValue('czsk_saved_lng');
        const savedLink = GM_getValue('czsk_saved_link');
        const savedNat = GM_getValue('czsk_saved_nat', 'CZ');

        if (!savedName || !savedCity || !savedLat || !savedLng || !savedLink) return;
        if (!window.location.href.includes('/profile/user/')) return;

        const info = autoDetectProfileInfo();
        if (!info.name || info.name.toLowerCase() !== savedName.toLowerCase()) return;
        if (info.oPacks === 99999 && info.oNoPacks === 99999) return;

        const lastSync = GM_getValue('czsk_last_auto_sync', 0);
        const now = Date.now();

        const hasChanged = (
            info.oPacks !== GM_getValue('czsk_saved_r_packs') ||
            info.oNoPacks !== GM_getValue('czsk_saved_r_nopacks') ||
            info.oHardest !== GM_getValue('czsk_saved_r_hardest') ||
            info.oExtremes !== GM_getValue('czsk_saved_r_extremes') ||
            info.tPacks !== GM_getValue('czsk_saved_t_packs') ||
            info.tNoPacks !== GM_getValue('czsk_saved_t_nopacks') ||
            info.tHardest !== GM_getValue('czsk_saved_t_hardest') ||
            info.tExtremes !== GM_getValue('czsk_saved_t_extremes') ||
            info.nationality !== savedNat
        );

        if (!hasChanged && (now - lastSync < 600000)) return;

        GM_xmlhttpRequest({
            method: 'POST',
            url: BACKEND_URL,
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({
                name: savedName,
                profile_link: savedLink,
                city: savedCity,
                lat: savedLat,
                lng: savedLng,
                nationality: info.nationality,
                rank_packs: info.oPacks,
                rank_nopacks: info.oNoPacks,
                rank_hardest: info.oHardest,
                rank_extremes: info.oExtremes,
                t_rank_packs: info.tPacks,
                t_rank_nopacks: info.tNoPacks,
                t_rank_hardest: info.tHardest,
                t_rank_extremes: info.tExtremes
            }),
            onload: function (res) {
                try {
                    const j = JSON.parse(res.responseText);
                    if (j.status === 'success') {
                        GM_setValue('czsk_last_auto_sync', now);
                        GM_setValue('czsk_saved_nat', info.nationality);
                        GM_setValue('czsk_saved_r_packs', info.oPacks);
                        GM_setValue('czsk_saved_r_nopacks', info.oNoPacks);
                        GM_setValue('czsk_saved_r_hardest', info.oHardest);
                        GM_setValue('czsk_saved_r_extremes', info.oExtremes);
                        GM_setValue('czsk_saved_t_packs', info.tPacks);
                        GM_setValue('czsk_saved_t_nopacks', info.tNoPacks);
                        GM_setValue('czsk_saved_t_hardest', info.tHardest);
                        GM_setValue('czsk_saved_t_extremes', info.tExtremes);
                    }
                } catch (e) {}
            }
        });
    }

    setInterval(checkAndAutoSyncStats, 5000);

    function prefetchPlayers(callback) {
        if (isFetchingPlayers) return;

        const now = Date.now();
        const cachedStr = GM_getValue('czsk_players_cache', null);
        const cacheTime = GM_getValue('czsk_players_cache_time', 0);

        if (cachedStr && (now - cacheTime < 300000)) {
            try {
                cachedPlayers = JSON.parse(cachedStr);
                if (typeof callback === 'function') callback(cachedPlayers);
            } catch (e) {}
        }

        isFetchingPlayers = true;
        GM_xmlhttpRequest({
            method: 'GET',
            url: BACKEND_URL,
            onload: function (response) {
                isFetchingPlayers = false;
                try {
                    const json = JSON.parse(response.responseText);
                    if (json.status === 'success' && Array.isArray(json.data)) {
                        cachedPlayers = json.data;
                        GM_setValue('czsk_players_cache', JSON.stringify(cachedPlayers));
                        GM_setValue('czsk_players_cache_time', now);
                        if (typeof callback === 'function') callback(cachedPlayers);
                    }
                } catch (e) {}
            },
            onerror: function () {
                isFetchingPlayers = false;
            }
        });
    }

    prefetchPlayers();

    let mapInstance = null;
    let darkTileLayer = null;
    let lightTileLayer = null;
    let isDarkMode = GM_getValue('czsk_dark_mode', true);

    function openMapModal() {
        if (document.getElementById('czsk-map-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'czsk-map-overlay';
        overlay.className = 'czsk-map-overlay';

        const info = autoDetectProfileInfo();
        const savedCity = GM_getValue('czsk_saved_city', '');

        overlay.innerHTML = `
            <div class="czsk-map-modal">
                <div class="czsk-map-header">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:20px;">🗺️</span>
                        <div>
                            <h2 style="margin:0; font-size:16px; font-weight:800; color:#ff9800;">CZ/SK AREDL KOMUNITNÍ MAPA</h2>
                            <span style="font-size:11px; color:#8e95a5;">Interaktivní mapa hráčů napříč Českem a Slovenskem</span>
                        </div>
                    </div>
                    <button id="czsk-close-modal" style="background:transparent; border:none; color:#aaa; font-size:20px; font-weight:bold; cursor:pointer; transition:0.15s;">✕</button>
                </div>
                <div class="czsk-map-body">

                    <div class="czsk-left-sidebar">
                        <div class="czsk-lb-header">Leaderboard</div>
                        <div class="czsk-lb-tabs">
                            <button class="czsk-lb-tab active" data-nat="ALL">Vše</button>
                            <button class="czsk-lb-tab" data-nat="CZ"><img src="https://flagcdn.com/w20/cz.png" class="czsk-flag-img" style="margin:0; width:14px;"> CZ</button>
                            <button class="czsk-lb-tab" data-nat="SK"><img src="https://flagcdn.com/w20/sk.png" class="czsk-flag-img" style="margin:0; width:14px;"> SK</button>
                        </div>
                        <div id="czsk-leaderboard-list" class="czsk-lb-list"></div>
                    </div>

                    <div id="czsk-leaflet-map"></div>

                    <div class="czsk-sidebar">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:14px; font-weight:bold; color:#ff9800;">Filtr</span>
                            <button id="czsk-theme-btn" class="czsk-theme-toggle">${isDarkMode ? '☀️ Světlý' : '🌙 Tmavý'}</button>
                        </div>

                        <div class="czsk-radio-group">
                            <label><input type="radio" name="czsk-metric" value="rank_packs" ${activeMetric === 'rank_packs' ? 'checked' : ''}> 📦 Body (s packy)</label>
                            <label><input type="radio" name="czsk-metric" value="rank_nopacks" ${activeMetric === 'rank_nopacks' ? 'checked' : ''}> 📄 Body (bez packů)</label>
                            <label><input type="radio" name="czsk-metric" value="rank_hardest" ${activeMetric === 'rank_hardest' ? 'checked' : ''}> 💀 Nejtěžší Demon</label>
                            <label><input type="radio" name="czsk-metric" value="rank_extremes" ${activeMetric === 'rank_extremes' ? 'checked' : ''}> 🏆 Počet Extreme Demonu</label>
                        </div>

                        <div id="czsk-theo-switch-box" class="czsk-switch-container" style="${info.hasTheoreticalExtension ? '' : 'display:none;'}">
                            <span style="font-size:13px; color:#fff; font-weight:bold;">Zobrazit teoretické staty</span>
                            <label class="czsk-switch">
                                <input type="checkbox" id="czsk-theo-checkbox" ${isTheoreticalMode ? 'checked' : ''}>
                                <span class="czsk-slider"></span>
                            </label>
                        </div>

                        <hr style="border:0; border-top:1px solid #2a2e3d; margin:4px 0;" />

                        <span style="font-size:14px; font-weight:bold; color:#fff;">Tvůj Profil</span>

                        <!-- V18.5 FIX: Inputy jsou uzamčené. Uživatel si je nemůže manuálně přepsat -->
                        <input type="text" id="czsk-input-name" placeholder="Jméno (otevři si svůj profil)" value="${info.name}" readonly style="cursor: not-allowed; background: #1c202c; color: #8e95a5;" />
                        <input type="text" id="czsk-input-link" placeholder="Odkaz (otevři si svůj profil)" value="${info.link}" readonly style="cursor: not-allowed; background: #1c202c; color: #8e95a5;" />

                        <div style="display:flex; gap:8px;">
                            <div style="display:flex; flex:1; background:#252a38; border:1px solid #444a5e; border-radius:6px; overflow:hidden;">
                                <button type="button" class="czsk-nat-btn" data-nat="CZ" style="flex:1; border:none; background:${info.nationality === 'CZ' ? 'rgba(255,152,0,0.15)' : 'transparent'}; color:${info.nationality === 'CZ' ? '#ff9800' : '#fff'}; font-size:12px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; transition:0.2s;"><img src="https://flagcdn.com/w20/cz.png" style="width:14px; border-radius:1px;"> CZ</button>
                                <button type="button" class="czsk-nat-btn" data-nat="SK" style="flex:1; border:none; border-left:1px solid #444a5e; background:${info.nationality === 'SK' ? 'rgba(255,152,0,0.15)' : 'transparent'}; color:${info.nationality === 'SK' ? '#ff9800' : '#fff'}; font-size:12px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; transition:0.2s;"><img src="https://flagcdn.com/w20/sk.png" style="width:14px; border-radius:1px;"> SK</button>
                            </div>
                            <input type="hidden" id="czsk-input-nat" value="${info.nationality}">

                            <div class="czsk-autocomplete-container" style="flex: 2;">
                                <input type="text" id="czsk-input-city" placeholder="Město / Okres" autocomplete="off" value="${savedCity}" />
                                <div id="czsk-autocomplete-list" class="czsk-autocomplete-list"></div>
                            </div>
                        </div>

                        <button id="czsk-submit-location" class="czsk-submit">Přidat / Aktualizovat na mapě</button>
                        <span id="czsk-status-msg" style="font-size:12px; color:#aaa; min-height:14px; text-align:center; display:block;"></span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const closeMap = () => {
            if (mapInstance) {
                mapInstance.remove();
                mapInstance = null;
            }
            overlay.remove();
        };

        document.getElementById('czsk-close-modal').onclick = closeMap;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeMap();
        });

        document.getElementById('czsk-theme-btn').onclick = (e) => {
            isDarkMode = !isDarkMode;
            GM_setValue('czsk_dark_mode', isDarkMode);
            e.target.textContent = isDarkMode ? '☀️ Světlý' : '🌙 Tmavý';

            if (isDarkMode) {
                mapInstance.removeLayer(lightTileLayer);
                mapInstance.addLayer(darkTileLayer);
            } else {
                mapInstance.removeLayer(darkTileLayer);
                mapInstance.addLayer(lightTileLayer);
            }
        };

        const natBtns = document.querySelectorAll('.czsk-nat-btn');
        const natInput = document.getElementById('czsk-input-nat');
        natBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.czsk-nat-btn');
                natBtns.forEach(b => {
                    b.style.background = 'transparent';
                    b.style.color = '#fff';
                });
                target.style.background = 'rgba(255,152,0,0.15)';
                target.style.color = '#ff9800';
                natInput.value = target.dataset.nat;
            });
        });

        const tabs = document.querySelectorAll('.czsk-lb-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                const target = e.target.closest('.czsk-lb-tab');
                target.classList.add('active');
                activeNatFilter = target.dataset.nat;
                renderPins(cachedPlayers);
            });
        });

        if (info.hasTheoreticalExtension) {
            document.getElementById('czsk-theo-checkbox').addEventListener('change', (e) => {
                isTheoreticalMode = e.target.checked;
                renderPins(cachedPlayers);
            });
        }

        document.querySelectorAll('input[name="czsk-metric"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                activeMetric = e.target.value;
                renderPins(cachedPlayers);
            });
        });

        initLeaflet(info);
    }

    function renderLeaderboard(filteredPlayers) {
        const lbContainer = document.getElementById('czsk-leaderboard-list');
        if (!lbContainer) return;

        let sorted = [...filteredPlayers].sort((a, b) => {
            const valA = (isTheoreticalMode && a['t_' + activeMetric] !== 99999) ? a['t_' + activeMetric] : a[activeMetric];
            const valB = (isTheoreticalMode && b['t_' + activeMetric] !== 99999) ? b['t_' + activeMetric] : b[activeMetric];
            const parsedA = parseInt(valA) || 99999;
            const parsedB = parseInt(valB) || 99999;
            return parsedA - parsedB;
        });

        lbContainer.innerHTML = '';

        sorted.forEach(player => {
            const rank = (isTheoreticalMode && player['t_' + activeMetric] !== 99999) ? player['t_' + activeMetric] : player[activeMetric];
            if (parseInt(rank) === 99999) return;

            const meta = getMarkerConfig(rank);
            const flagUrl = player.nationality === 'SK' ? 'https://flagcdn.com/w20/sk.png' : 'https://flagcdn.com/w20/cz.png';

            const item = document.createElement('div');
            item.className = 'czsk-lb-item';
            item.innerHTML = `
                <div class="czsk-lb-rank" style="color: ${meta.color}">#${rank}</div>
                <div class="czsk-lb-name">${player.name}</div>
                <img src="${flagUrl}" class="czsk-flag-img">
            `;

            item.onclick = () => {
                if (mapInstance && mapMarkers[player.profile_link]) {
                    mapInstance.closePopup();

                    const targetZoom = 10;
                    mapInstance.flyTo([player.lat, player.lng], targetZoom, { duration: 0.5 });

                    setTimeout(() => {
                        if (mapMarkers[player.profile_link]) {
                            mapMarkers[player.profile_link].openPopup();
                        }
                    }, 550);
                }
            };

            lbContainer.appendChild(item);
        });
    }

    function initLeaflet(info) {
        darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_48i2_1_0cafb22dc17a74c880f6326e', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 18,
            minZoom: 6
        });

        lightTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_48i2_1_0cafb22dc17a74c880f6326e', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 18,
            minZoom: 6
        });

        mapInstance = L.map('czsk-leaflet-map', {
            center: [49.2, 17.5],
            zoom: 7,
            zoomControl: false,
            wheelPxPerZoomLevel: 120,
            layers: isDarkMode ? [darkTileLayer] : [lightTileLayer]
        });

        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

        const mapContainer = document.getElementById('czsk-leaflet-map');
        const modalContainer = document.querySelector('.czsk-map-modal');

        if (modalContainer) {
            modalContainer.addEventListener('animationend', () => {
                if (mapInstance) {
                    mapInstance.invalidateSize(true);
                    if (cachedPlayers.length > 0) renderPins(cachedPlayers);
                }
            });
        }

        const ro = new ResizeObserver(() => {
            if (mapInstance) {
                mapInstance.invalidateSize(true);
                if (cachedPlayers.length > 0) renderPins(cachedPlayers);
            }
        });
        ro.observe(mapContainer);

        let shakeTicks = 0;
        const wakeUpLeaflet = setInterval(() => {
            if (mapInstance) {
                mapInstance.invalidateSize(true);
                if (cachedPlayers.length > 0) renderPins(cachedPlayers);
            }
            shakeTicks++;
            if (shakeTicks >= 15) clearInterval(wakeUpLeaflet);
        }, 100);

        prefetchPlayers((players) => {
            if (mapInstance) {
                mapInstance.invalidateSize(true);
                renderPins(players);
            }
        });

        setupPinSubmission(info);
        setupAutocomplete();
    }

    function renderPins(players) {
        if (!mapInstance) return;

        const filteredPlayers = activeNatFilter === 'ALL' ? players : players.filter(p => p.nationality === activeNatFilter);

        renderLeaderboard(filteredPlayers);

        mapInstance.eachLayer(layer => {
            if (layer instanceof L.Marker) mapInstance.removeLayer(layer);
        });

        mapMarkers = {};

        filteredPlayers.forEach(player => {
            const valOff = parseInt(player[activeMetric]) || 99999;
            const valTheo = parseInt(player['t_' + activeMetric]) || 99999;

            const activeRank = (isTheoreticalMode && valTheo !== 99999) ? valTheo : valOff;
            const meta = getMarkerConfig(activeRank);

            const flagUrl = player.nationality === 'SK' ? 'https://flagcdn.com/w20/sk.png' : 'https://flagcdn.com/w20/cz.png';

            const starIcon = L.divIcon({
                className: 'czsk-star-marker-container',
                html: `
                    <div class="czsk-star-inner">
                        <svg viewBox="0 0 24 24" width="28" height="28" style="overflow: visible; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.8));">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                  fill="${meta.color}"
                                  stroke="#101216"
                                  stroke-width="1.5"
                                  stroke-linejoin="round" />
                        </svg>
                        <span class="czsk-star-name" style="color: ${meta.color}; border: 1px solid ${meta.color}50;">
                            ${player.name} <img src="${flagUrl}" style="width:12px; height:auto; border-radius:1px; margin-bottom:1px;">
                        </span>
                    </div>
                `,
                iconSize: [120, 60],
                iconAnchor: [60, 30]
            });

            const marker = L.marker([player.lat, player.lng], { icon: starIcon }).addTo(mapInstance);

            mapMarkers[player.profile_link] = marker;

            let safeLink = player.profile_link;
            if (!safeLink.startsWith('http://') && !safeLink.startsWith('https://')) safeLink = 'https://' + safeLink;

            const formatDisplayRank = (key) => {
                const off = parseInt(player[key]) || 99999;
                const theo = parseInt(player['t_' + key]) || 99999;
                const strOff = off !== 99999 ? `#${off}` : '—';
                const strTheo = theo !== 99999 ? `#${theo}` : '—';
                return (isTheoreticalMode && theo !== 99999) ? `${strTheo} <span style="font-size:12px; color:#888;">(${strOff})</span>` : strOff;
            };

            marker.bindPopup(`
                <div style="font-size:14px; font-family:sans-serif; min-width:200px; line-height:1.3;">
                    <div style="display:flex; justify-content:center; align-items:center; gap:8px; margin-bottom:10px;">
                        <strong style="color:#ff9800; font-size:20px;">${player.name}</strong>
                        <img src="${flagUrl}" class="czsk-flag-img" style="margin:0; width:20px;">
                    </div>

                    <div style="background:#11141c; border-radius:8px; padding:10px; margin-bottom:12px; display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div style="${activeMetric === 'rank_packs' ? 'color:' + meta.color + '; font-weight:bold;' : 'color:#aaa;'} font-size: 12px;">
                            📦 S packy<br><span style="font-size:17px; display:block; margin-top:4px;">${formatDisplayRank('rank_packs')}</span>
                        </div>
                        <div style="${activeMetric === 'rank_nopacks' ? 'color:' + meta.color + '; font-weight:bold;' : 'color:#aaa;'} font-size: 12px;">
                            📄 Bez packů<br><span style="font-size:17px; display:block; margin-top:4px;">${formatDisplayRank('rank_nopacks')}</span>
                        </div>
                        <div style="${activeMetric === 'rank_hardest' ? 'color:' + meta.color + '; font-weight:bold;' : 'color:#aaa;'} font-size: 12px;">
                            💀 Nejtěžší<br><span style="font-size:17px; display:block; margin-top:4px;">${formatDisplayRank('rank_hardest')}</span>
                        </div>
                        <div style="${activeMetric === 'rank_extremes' ? 'color:' + meta.color + '; font-weight:bold;' : 'color:#aaa;'} font-size: 12px;">
                            🏆 Extrémy<br><span style="font-size:17px; display:block; margin-top:4px;">${formatDisplayRank('rank_extremes')}</span>
                        </div>
                    </div>

                    <div style="text-align:center;">
                        <a href="${safeLink}" style="background:#ff9800; color:#121316; font-size:14px; font-weight:bold; text-decoration:none; display:block; padding: 10px 12px; border-radius: 6px; box-sizing:border-box;">Zobrazit AREDL profil</a>
                    </div>
                </div>
            `);
        });
    }

    function setupAutocomplete() {
        const input = document.getElementById('czsk-input-city');
        const list = document.getElementById('czsk-autocomplete-list');
        let debounceTimer;

        input.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            const query = this.value.trim();

            if (query.length < 3) {
                list.style.display = 'none';
                return;
            }

            list.innerHTML = '<div class="czsk-autocomplete-loading">Hledám...</div>';
            list.style.display = 'block';

            debounceTimer = setTimeout(() => {
                const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=cz,sk&format=json&limit=5`;

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    headers: { 'User-Agent': 'AREDL-CZSK-Community-Map/18.5' },
                    onload: function (res) {
                        try {
                            const data = JSON.parse(res.responseText);
                            list.innerHTML = '';

                            if (data.length > 0) {
                                data.forEach(item => {
                                    const div = document.createElement('div');
                                    div.className = 'czsk-autocomplete-item';
                                    const cleanName = item.display_name.split(',').slice(0, 3).join(', ');
                                    div.textContent = cleanName;

                                    div.onclick = () => {
                                        input.value = item.name || item.display_name.split(',')[0];
                                        list.style.display = 'none';
                                    };
                                    list.appendChild(div);
                                });
                            } else {
                                list.innerHTML = '<div class="czsk-autocomplete-loading" style="color:#ff6b6b;">Žádné výsledky nenalezeny.</div>';
                            }
                        } catch (e) {}
                    }
                });
            }, 400);
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !list.contains(e.target)) {
                list.style.display = 'none';
            }
        });
    }

    function setupPinSubmission(info) {
        const btn = document.getElementById('czsk-submit-location');
        const statusMsg = document.getElementById('czsk-status-msg');

        btn.onclick = () => {
            const name = document.getElementById('czsk-input-name').value.trim();
            const rawLink = document.getElementById('czsk-input-link').value.trim();
            const link = normalizeUrl(rawLink);
            const city = document.getElementById('czsk-input-city').value.trim();
            const nationality = document.getElementById('czsk-input-nat').value;

            if (!name || !link) {
                statusMsg.textContent = 'Musíš si otevřít svůj vlastní AREDL profil, abys mohl přidat lokaci.';
                statusMsg.style.color = '#ff6b6b';
                return;
            }
            if (!city) {
                statusMsg.textContent = 'Prosím vyplň Město.';
                statusMsg.style.color = '#ff6b6b';
                return;
            }

            statusMsg.textContent = 'Zjišťuji souřadnice...';
            statusMsg.style.color = '#ff9800';

            const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&countrycodes=cz,sk&format=json&limit=1`;

            GM_xmlhttpRequest({
                method: 'GET',
                url: geocodeUrl,
                headers: { 'User-Agent': 'AREDL-CZSK-Community-Map/18.5' },
                onload: function (geoRes) {
                    try {
                        const geoData = JSON.parse(geoRes.responseText);
                        if (!geoData || geoData.length === 0) {
                            statusMsg.textContent = 'Město/okres v CZ/SK nenalezeno.';
                            statusMsg.style.color = '#ff6b6b';
                            return;
                        }

                        const jitterLat = (Math.random() - 0.5) * 0.002;
                        const jitterLng = (Math.random() - 0.5) * 0.002;
                        const lat = parseFloat(geoData[0].lat) + jitterLat;
                        const lng = parseFloat(geoData[0].lon) + jitterLng;

                        statusMsg.textContent = 'Ukládám do databáze...';

                        GM_xmlhttpRequest({
                            method: 'POST',
                            url: BACKEND_URL,
                            headers: { 'Content-Type': 'application/json' },
                            data: JSON.stringify({
                                name: name,
                                profile_link: link,
                                city: city,
                                lat: lat,
                                lng: lng,
                                nationality: nationality,
                                rank_packs: info.oPacks,
                                rank_nopacks: info.oNoPacks,
                                rank_hardest: info.oHardest,
                                rank_extremes: info.oExtremes,
                                t_rank_packs: info.tPacks,
                                t_rank_nopacks: info.tNoPacks,
                                t_rank_hardest: info.tHardest,
                                t_rank_extremes: info.tExtremes
                            }),
                            onload: function (postRes) {
                                try {
                                    const postJson = JSON.parse(postRes.responseText);
                                    if (postJson.status === 'success') {
                                        statusMsg.textContent = 'Úspěšně přidáno/aktualizováno!';
                                        statusMsg.style.color = '#4cd137';

                                        GM_setValue('czsk_saved_name', name);
                                        GM_setValue('czsk_saved_link', link);
                                        GM_setValue('czsk_saved_city', city);
                                        GM_setValue('czsk_saved_lat', lat);
                                        GM_setValue('czsk_saved_lng', lng);
                                        GM_setValue('czsk_saved_nat', nationality);
                                        GM_setValue('czsk_saved_r_packs', info.oPacks);
                                        GM_setValue('czsk_saved_r_nopacks', info.oNoPacks);
                                        GM_setValue('czsk_saved_r_hardest', info.oHardest);
                                        GM_setValue('czsk_saved_r_extremes', info.oExtremes);
                                        GM_setValue('czsk_saved_t_packs', info.tPacks);
                                        GM_setValue('czsk_saved_t_nopacks', info.tNoPacks);
                                        GM_setValue('czsk_saved_t_hardest', info.tHardest);
                                        GM_setValue('czsk_saved_t_extremes', info.tExtremes);

                                        GM_setValue('czsk_players_cache_time', 0);

                                        prefetchPlayers((players) => {
                                            if (mapInstance) {
                                                mapInstance.invalidateSize(true);
                                                renderPins(players);
                                                mapInstance.setView([lat, lng], 10);
                                            }
                                        });
                                    } else {
                                        statusMsg.textContent = postJson.message || 'Chyba při ukládání do databáze.';
                                        statusMsg.style.color = '#ff6b6b';
                                    }
                                } catch (e) {
                                    statusMsg.textContent = 'Chyba při čtení odpovědi serveru.';
                                    statusMsg.style.color = '#ff6b6b';
                                }
                            },
                            onerror: function () {
                                statusMsg.textContent = 'Nepodařilo se připojit k Vercel API.';
                                statusMsg.style.color = '#ff6b6b';
                            }
                        });

                    } catch (e) {
                        statusMsg.textContent = 'Chyba geokódovací služby.';
                        statusMsg.style.color = '#ff6b6b';
                    }
                },
                onerror: function () {
                    statusMsg.textContent = 'Chyba sítě při geokódování.';
                    statusMsg.style.color = '#ff6b6b';
                }
            });
        };
    }

    function injectNavButton() {
        if (document.getElementById('czsk-nav-btn')) return;

        const navContainer = document.querySelector('header nav ul') || document.querySelector('header nav > div') || document.querySelector('header nav');

        const btn = document.createElement('button');
        btn.id = 'czsk-nav-btn';
        btn.innerHTML = `<span>🗺️</span> CZ/SK MAPA`;
        btn.onclick = (e) => {
            e.preventDefault();
            openMapModal();
        };

        if (navContainer) {
            btn.className = 'czsk-nav-btn';
            navContainer.appendChild(btn);
        } else {
            btn.className = 'czsk-nav-btn czsk-floating-btn';
            document.body.appendChild(btn);
        }
    }

    let navInjectTimeout;
    const observer = new MutationObserver(() => {
        if (navInjectTimeout) return;
        navInjectTimeout = setTimeout(() => {
            injectNavButton();
            navInjectTimeout = null;
        }, 500);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    injectNavButton();
})();
