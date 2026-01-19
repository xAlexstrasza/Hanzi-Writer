const express = require('express');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const { pinyin } = require('pinyin-pro');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

// --- CONSTANTS ---
const VIEWBOX = "0 0 28.747 28.75";
const PUNCTUATION_REGEX = /[，。、！？：；,.\?!:;“ ”" '（ ）( )]/; 
const PUNCTUATION_GLOBAL = /[，。、！？：；,.\?!:;“ ”" '（ ）( )]/g;

// SVG PATHS (Grid Lines)
const BORDER_PATHS = `
    <line x1=".2" y1="28.55" x2="28.547" y2="28.55" style="fill: none; stroke-miterlimit: 10; stroke-width: .4px;"/>
    <line x1=".2" y1=".2" x2="28.547" y2=".2" style="fill: none; stroke-miterlimit: 10; stroke-width: .4px;"/>
    <line x1=".2" y1="28.55" x2=".2" y2=".2" style="fill: none; stroke-miterlimit: 10; stroke-width: .4px;"/>
    <line x1="28.547" y1="28.55" x2="28.547" y2=".2" style="fill: none; stroke-miterlimit: 10; stroke-width: .4px;"/>
`;

const RICE_GRID_PATHS = `
    <line x1=".2" y1="14.37" x2=".9079" y2="14.37" style="fill: none; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="1.643" y1="14.37" x2="8.7155" y2="14.37" style="fill: none; stroke-dasharray: 0 0 0 0 0 0 .943 .943 .943 .943 .943 .943; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="9.187" y1="14.37" x2="27.5755" y2="14.37" style="fill: none; stroke-dasharray: 0 0 0 0 0 0 .943 .943 .943 .943 .943 .943; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="27.8391" y1="14.37" x2="28.547" y2="14.37" style="fill: none; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="14.373" y1="28.5466" x2="14.373" y2="27.8379" style="fill: none; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="14.373" y1="27.107" x2="14.373" y2="20.0337" style="fill: none; stroke-dasharray: 0 0 0 0 0 0 .9431 .9431 .9431 .9431 .9431 .9431; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="14.373" y1="19.5621" x2="14.373" y2="1.1715" style="fill: none; stroke-dasharray: 0 0 0 0 0 0 .9431 .9431 .9431 .9431 .9431 .9431; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="14.373" y1=".908" x2="14.373" y2=".2" style="fill: none; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1=".2" y1="28.55" x2=".7669" y2="27.983" style="fill: none; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="1.2623" y1="27.4877" x2="6.5776" y2="22.1717" style="fill: none; stroke-dasharray: 0 0 0 0 0 0 1.0023 1.0023 1.0023 1.0023 1.0023 1.0023; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="6.932" y1="21.8173" x2="27.8391" y2=".908" style="fill: none; stroke-dasharray: 0 0 0 0 0 0 1.0023 1.0023 1.0023 1.0023 1.0023 1.0023; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="27.9801" y1=".767" x2="28.547" y2=".2" style="fill: none; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="28.547" y1="28.55" x2="27.9801" y2="27.983" style="fill: none; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="27.4847" y1="27.4877" x2="22.1694" y2="22.1717" style="fill: none; stroke-dasharray: 0 0 0 0 0 0 1.0023 1.0023 1.0023 1.0023 1.0023 1.0023; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="21.815" y1="21.8173" x2=".9079" y2=".908" style="fill: none; stroke-dasharray: 0 0 0 0 0 0 1.0023 1.0023 1.0023 1.0023 1.0023 1.0023; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1=".8374" y1=".8375" x2=".2705" y2=".2705" style="fill: none; stroke-miterlimit: 10; stroke-width: .1333px;"/>
`;

const CROSS_GRID_PATHS = `
    <line x1=".2" y1="14.37" x2=".9079" y2="14.37" style="fill: none; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="1.643" y1="14.37" x2="8.7155" y2="14.37" style="fill: none; stroke-dasharray: 0 0 0 0 0 0 .943 .943 .943 .943 .943 .943; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="9.187" y1="14.37" x2="27.5755" y2="14.37" style="fill: none; stroke-dasharray: 0 0 0 0 0 0 .943 .943 .943 .943 .943 .943; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="27.8391" y1="14.37" x2="28.547" y2="14.37" style="fill: none; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="14.373" y1="28.5466" x2="14.373" y2="27.8379" style="fill: none; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="14.373" y1="27.107" x2="14.373" y2="20.0337" style="fill: none; stroke-dasharray: 0 0 0 0 0 0 .9431 .9431 .9431 .9431 .9431 .9431; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="14.373" y1="19.5621" x2="14.373" y2="1.1715" style="fill: none; stroke-dasharray: 0 0 0 0 0 0 .9431 .9431 .9431 .9431 .9431 .9431; stroke-miterlimit: 10; stroke-width: .1333px;"/>
    <line x1="14.373" y1=".908" x2="14.373" y2=".2" style="fill: none; stroke-miterlimit: 10; stroke-width: .1333px;"/>
`;

const CELL_WIDTH = 28.367;
const COLS_PER_ROW = 20;

// --- HELPERS ---
async function getCharStrokes(char) {
    if (!char || !char.trim()) return null;
    try {
        const url = `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(char)}.json`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return data.strokes; 
    } catch (e) { return null; }
}

async function getCharMeta(char) {
    if (!char) return { pinyin: '', def: '' };
    if (PUNCTUATION_REGEX.test(char)) return { pinyin: '', def: '' };

    let pinyinStr = "";
    try { pinyinStr = pinyin(char); } catch (e) {}
    let def = "";
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=${encodeURIComponent(char)}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data[0] && data[0][0] && data[0][0][0]) def = data[0][0][0];
        }
    } catch (e) {}
    return { pinyin: pinyinStr, def };
}

async function generateStrokeHeaderHTML(char) {
    if (PUNCTUATION_REGEX.test(char)) return "";
    const strokes = await getCharStrokes(char);
    if (!strokes) return "";
    let html = `<div class="stroke-steps-container">`;
    const ghostPaths = strokes.map(s => `<path d="${s}" fill="#ddd" />`).join('');
    for (let i = 0; i < strokes.length; i++) {
        let activePaths = "";
        for (let j = 0; j <= i; j++) activePaths += `<path d="${strokes[j]}" fill="#000" />`;
        html += `<div class="stroke-box"><svg viewBox="0 0 1024 1024"><g transform="scale(1, -1) translate(0, -900)">${ghostPaths}${activePaths}</g></svg></div>`;
    }
    html += `</div>`;
    return html;
}

// --- SVG GENERATOR ---
function getGridSVGContent(config) {
    const color = config.color || '#000';
    const opacity = config.opacity || 0.4;
    const style = config.style || 'mi';

    let internalLines = "";
    if (style === 'mi') internalLines = RICE_GRID_PATHS;
    else if (style === 'cross') internalLines = CROSS_GRID_PATHS;

    return `
        <g stroke="${color}">
            ${BORDER_PATHS}
            <g opacity="${opacity}">
                ${internalLines}
            </g>
        </g>
    `;
}

// Generates the SVG for a full row of boxes
async function generateRowImage(rowItems, rowType, gridConfig) {
    const cellSVG = getGridSVGContent(gridConfig);

    let gridContent = "";
    for (let i = 0; i < COLS_PER_ROW; i++) {
        gridContent += `<g transform="translate(${i * CELL_WIDTH}, 0)">${cellSVG}</g>`;
    }

    let charLayer = "";
    
    // Exercise mode handles its own simple text, so we skip complex logic
    if (rowType !== 'exercise') {
        for (let i = 0; i < COLS_PER_ROW; i++) {
            const item = rowItems[i]; 
            // If item is null (empty row padding), just skip drawing chars
            if (!item || !item.char) continue;

            const char = item.char;
            let opacity = 1.0;
            // Shadow logic: if Single mode, first char is black, rest are grey
            if (rowType === 'single' && i > 0) opacity = 0.3;

            // 1. Draw Hanzi
            const strokes = await getCharStrokes(char);
            if (strokes) {
                let pathData = strokes.map(s => `<path d="${s}" />`).join('');
                const scale = CELL_WIDTH / 1024; 
                charLayer += `
                    <g transform="translate(${i * CELL_WIDTH}, 0)">
                        <g transform="scale(${scale}, -${scale}) translate(0, -900)" fill="#000" opacity="${opacity}">
                            ${pathData}
                        </g>
                    </g>
                `;
            }

            // 2. Draw "Merged" Punctuation
            if (item.punc) {
                // Default position (works well for 。)
                let puncX = 23; 
                let puncY = 25;

                // SPECIAL LOGIC: Move Comma (，) further right
                if (item.punc === '，' || item.punc === ',') {
                    puncX = 25; // Moved right to 25 per request
                }

                charLayer += `
                    <g transform="translate(${i * CELL_WIDTH}, 0)">
                        <text x="${puncX}" y="${puncY}" font-family="KaiTi, serif" font-size="10" fill="#000" font-weight="bold">${item.punc}</text>
                    </g>
                `;
            }
        }
    }

    const finalSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" width="567.34" height="28.75" viewBox="0 0 567.34 28.75">
            <g>${gridContent}</g>
            <g>${charLayer}</g>
        </svg>
    `;
    return `data:image/svg+xml;base64,${Buffer.from(finalSVG).toString('base64')}`;
}

// --- EXPRESS ROUTE ---
app.post('/generate-pdf', async (req, res) => {
    const { text, genMode, spacing, margins, boxSize, shadowCount, numberOffset, gridConfig } = req.body;
    
    console.log(`🚀 Processing PDF: Mode [${genMode}]`);

    const safeShadowCount = (shadowCount === undefined) ? 1 : shadowCount;
    const safeSpacing = spacing || { row: 14 };
    const safeMargins = margins || { top: 5.5, left: 6 };
    const safeBoxSize = boxSize || 10;
    const safeNumOffset = numberOffset || 0;
    const safeGridConfig = gridConfig || { style: 'mi', color: '#e74c3c', opacity: 0.5 };
    
    let rowDataList = [];
    let htmlContent = "";

    // =========================================================
    // MODE: EXERCISE
    // =========================================================
    if (genMode === 'exercise') {
        const normalizedText = (text || "").replace(/\r\n/g, '\n');
        const blocks = normalizedText.split(/(?=^\d+\.)/gm).map(b => b.trim()).filter(b => b);

        let bodyHTML = `<div class="page" style="padding-top:${safeMargins.top}mm; padding-left:${safeMargins.left}mm;">`;
        
        for (let block of blocks) {
            const match = block.match(/^(\d+\.)\s*([\s\S]*)/);
            let numberPart = "";
            let textPart = block;
            if (match) { numberPart = match[1]; textPart = match[2]; }

            const isDoubleDigit = numberPart.length > 2;
            const leftPos = isDoubleDigit ? "8mm" : "10mm";

            const formattedText = textPart.replace(/\n/g, '<br>');
            const rowImageSrc = await generateRowImage(new Array(20).fill(null), 'exercise', safeGridConfig);
            
            bodyHTML += `
            <div class="exercise-wrapper" style="margin-bottom: ${safeSpacing.row}mm; width: ${(safeBoxSize * 20) + 15}mm;">
                <div class="exercise-number" style="top: ${(10 + safeNumOffset)}mm; left: ${leftPos};">${numberPart}</div>
                <div class="exercise-content">
                    <div class="exercise-text">${formattedText}</div>
                    <div class="grid-row" style="width: ${safeBoxSize * 20}mm; height: ${safeBoxSize}mm;">
                        <img class="row-img" src="${rowImageSrc}" />
                    </div>
                </div>
            </div>
            `;
        }
        bodyHTML += `</div>`;

        htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page { size: 215.9mm 279.4mm; margin: 0; }
                * { box-sizing: border-box; }
                body { margin: 0; padding: 0; font-family: "KaiTi", "Kaiti SC", serif; }
                .page { width: 215.9mm; min-height: 279.4mm; overflow: visible; }
                .exercise-wrapper { position: relative; padding-left: 12mm; page-break-inside: avoid; }
                .exercise-number { position: absolute; width: 10mm; font-weight: bold; font-size: 11pt; }
                .exercise-content { width: 100%; }
                .exercise-text { font-size: 11pt; line-height: 1.4; margin-bottom: 2mm; font-weight: bold; color: #000; }
                .grid-row { display: block; }
                .row-img { width: 100%; height: 100%; display: block; }
            </style>
        </head>
        <body>${bodyHTML}</body>
        </html>`;
    } 
    
    // =========================================================
    // MODE: STANDARD (Single & Continuous)
    // =========================================================
    else {
         if (genMode === 'single') {
            const cleanText = text ? text.replace(PUNCTUATION_GLOBAL, '').replace(/[\r\n\s]/g, '') : "";
            const inputChars = cleanText.split('');

            for (let char of inputChars) {
                let rowArr = new Array(20).fill(null);
                const item = { char: char, punc: null };
                rowArr[0] = item; 
                for (let s = 1; s <= safeShadowCount && s < 20; s++) rowArr[s] = item;
                rowDataList.push({ items: rowArr, type: 'single' });
            }

        } else {
            const cleanText = text ? text.replace(/[\r\n\s]/g, '') : "";
            let mergedItems = [];
            for (let i = 0; i < cleanText.length; i++) {
                const char = cleanText[i];
                if (PUNCTUATION_REGEX.test(char)) {
                    if (mergedItems.length > 0) {
                        mergedItems[mergedItems.length - 1].punc = char;
                    } 
                } else {
                    mergedItems.push({ char: char, punc: null });
                }
            }

            for (let i = 0; i < mergedItems.length; i += 20) {
                let chunk = mergedItems.slice(i, i + 20);
                while (chunk.length < 20) chunk.push(null);
                rowDataList.push({ items: chunk, type: 'sentence' });
            }
        }

        // --- NEW: FILL PAGE TO 20 ROWS ---
        // Ensure total rows is a multiple of 20, or at least 20 if empty
        const remainder = rowDataList.length % 20;
        if (remainder > 0 || rowDataList.length === 0) {
            const needed = (rowDataList.length === 0) ? 20 : (20 - remainder);
            for(let k=0; k < needed; k++) {
                // Add empty padding row
                rowDataList.push({ 
                    items: new Array(20).fill(null), 
                    type: 'sentence' // Use sentence type to render empty boxes easily
                });
            }
        }

        const ROWS_PER_PAGE = 20;
        let pagesHTML = "";
        const openPage = () => `<div class="page">`;
        const closePage = () => `</div>`;
        
        pagesHTML += openPage();
        let rowsInThisPage = 0;
        
        for (let rowObj of rowDataList) {
            if (rowsInThisPage >= ROWS_PER_PAGE) {
                pagesHTML += closePage() + openPage();
                rowsInThisPage = 0;
            }

            const rowImageSrc = await generateRowImage(rowObj.items, rowObj.type, safeGridConfig);
            
            const top = safeMargins.top + (rowsInThisPage * safeSpacing.row);
            const left = safeMargins.left;
            const cssRowWidth = safeBoxSize * 20; 

            let headerHTML = "";
            // Header Logic:
            // 1. Single Mode: Only if it has a valid char (not padding)
            if (rowObj.type === 'single' && rowObj.items[0] && rowObj.items[0].char) {
                const item = rowObj.items[0]; 
                const meta = await getCharMeta(item.char); 
                const strokeDiagrams = await generateStrokeHeaderHTML(item.char); 
                headerHTML = `<div class="header-row" style="width: ${cssRowWidth}mm;"><span class="pinyin-single">${meta.pinyin}</span>${strokeDiagrams}<div class="definition-box">${meta.def}</div></div>`;
            } 
            // 2. Sentence Mode: If it's a padding row (null items), this loop produces empty pinyin cells, which is fine
            else if (rowObj.type === 'sentence') {
                let pinyinCells = "";
                for (let i = 0; i < 20; i++) {
                    const item = rowObj.items[i];
                    let py = "";
                    if(item && item.char) { try { py = pinyin(item.char); } catch(e) {} }
                    pinyinCells += `<div class="cell-box" style="width: ${safeBoxSize}mm;">${py}</div>`;
                }
                headerHTML = `<div class="header-row" style="width: ${cssRowWidth}mm; justify-content: flex-start;">${pinyinCells}</div>`;
            }

            pagesHTML += `
                <div class="row-container" style="top: ${top}mm; left: ${left}mm; width: ${cssRowWidth}mm; height: ${safeBoxSize}mm;">
                    ${headerHTML}
                    <img class="row-img" src="${rowImageSrc}" />
                </div>
            `;
            rowsInThisPage++;
        }
        pagesHTML += closePage();

        htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page { size: 215.9mm 279.4mm; margin: 0; }
                * { box-sizing: border-box; }
                body { margin: 0; padding: 0; font-family: "KaiTi", serif; }
                .page { width: 215.9mm; height: 279.4mm; position: relative; overflow: hidden; page-break-after: always; }
                .row-container { position: absolute; }
                .header-row { position: absolute; bottom: 100%; left: 0; height: 4mm; display: flex; align-items: center; line-height: 1; }
                .pinyin-single { font-size: 10pt; font-weight: bold; margin-right: 8px; margin-left: 12px; font-family: "Times New Roman", serif; }
                .cell-box { height: 100%; display: flex; align-items: flex-end; justify-content: center; font-size: 8pt; font-family: "Times New Roman", serif; flex-shrink: 0; padding-bottom: 2px; }
                .stroke-steps-container { display: flex; gap: 2px; margin-right: 8px; height: 100%; align-items: center; }
                .stroke-box { width: 3.5mm; height: 3.5mm; } 
                .stroke-box svg { width: 100%; height: 100%; }
                .definition-box { font-size: 8pt; color: #444; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: Arial, sans-serif; }
                .row-img { width: 100%; height: 100%; display: block; }
            </style>
        </head>
        <body>${pagesHTML}</body>
        </html>`;
    }

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({ width: '215.9mm', height: '279.4mm', printBackground: true });
    await browser.close();
    console.log("✅ PDF Generated");
    res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdfBuffer.length });
    res.send(pdfBuffer);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});