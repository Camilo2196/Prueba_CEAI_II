// js/hmi.js
export const zoomer = (el, w, h, cb) => {
    let vw = {x:0, y:0, z:1};
    return {
        vw,
        zoom: f => { vw.z = Math.max(0.3, Math.min(4, vw.z * f)); if(cb) cb(); },
        fit: () => { vw = {x:0, y:0, z:1}; if(cb) cb(); },
        pt: (cx, cy) => {
            const p = el.createSVGPoint(); p.x = cx; p.y = cy;
            return p.matrixTransform(el.getScreenCTM().inverse());
        },
        n: () => vw.z
    };
};

export const WID = {
    btn: {
        n: 'Pulsador', k: 'bit', wr: 1, w: 80, h: 40,
        r: (o, v) => {
            const isNC = o.contact === 'NC';
            const isActive = isNC ? !v : v;
            const color = isActive ? 'var(--ok)' : 'var(--pn)';
            const txtColor = isActive ? '#ffffff' : 'var(--tx)';
            return `<rect x="0" y="0" width="80" height="40" rx="4" fill="${color}" stroke="var(--ln)"/>
                    <text x="40" y="24" text-anchor="middle" fill="${txtColor}">${o.label}</text>`;
        }
    },
    lamp: {
        n: 'Piloto / Lámpara', k: 'bit', wr: 0, w: 40, h: 40,
        r: (o, v) => {
            const colors = { red: '#E2001A', green: '#39A900', yellow: '#FF6A00', blue: '#27e0ff', white: '#ffffff' };
            const base = colors[o.color] || colors.green;
            const fill = v ? base : '#e0e0e0';
            return `<circle cx="20" cy="20" r="16" fill="${fill}" stroke="var(--ln)"/>
                    <text x="45" y="24" fill="var(--tx)">${o.label}</text>`;
        }
    },
    motor: {
        n: 'Motor', k: 'bit', wr: 0, w: 60, h: 60,
        r: (o, v) => `<circle cx="30" cy="30" r="20" fill="${v?'var(--ok)':'var(--pn)'}" stroke="var(--ln)"/>
                      <text x="30" y="34" text-anchor="middle" fill="var(--tx)" font-weight="bold">M</text>
                      <text x="30" y="65" text-anchor="middle" fill="var(--tx)">${o.label}</text>`
    },
    pump: {
        n: 'Bomba', k: 'bit', wr: 0, w: 60, h: 60,
        r: (o, v) => `<circle cx="30" cy="30" r="20" fill="${v?'var(--ok)':'var(--pn)'}" stroke="var(--ln)"/>
                      <path d="M30 15 L45 30 L30 45 Z" fill="var(--tx)"/>
                      <text x="30" y="65" text-anchor="middle" fill="var(--tx)">${o.label}</text>`
    },
    val: {
        n: 'Válvula', k: 'bit', wr: 0, w: 40, h: 40,
        r: (o, v) => `<path d="M10 10 L30 30 V10 L10 30 Z" fill="${v?'var(--ok)':'var(--pn)'}" stroke="var(--ln)"/>
                      <text x="20" y="45" text-anchor="middle" fill="var(--tx)">${o.label}</text>`
    },
    tank: {
        n: 'Tanque', k: 'an', wr: 0, w: 60, h: 80,
        r: (o, v) => {
            const h = Math.max(0, Math.min(60, (v - o.min) / (o.max - o.min || 1) * 60));
            return `<rect x="10" y="10" width="40" height="60" fill="none" stroke="var(--ln)" stroke-width="2"/>
                    <rect x="12" y="${70-h}" width="36" height="${h}" fill="rgba(57,169,0,0.5)"/>
                    <text x="30" y="85" text-anchor="middle" fill="var(--tx)">${o.label}</text>`;
        }
    },
    gauge: {
        n: 'Medidor', k: 'an', wr: 0, w: 80, h: 80,
        r: (o, v) => {
            const a = -135 + 270 * Math.max(0, Math.min(1, (v - o.min) / (o.max - o.min || 1)));
            return `<circle cx="40" cy="40" r="38" fill="var(--pn)" stroke="var(--ln)"/>
                    <path d="M12 68 A 34 34 0 1 1 68 68" fill="none" stroke="var(--ln)" stroke-width="4"/>
                    <line x1="40" y1="40" x2="40" y2="10" stroke="var(--am)" stroke-width="3" transform="rotate(${a} 40 40)"/>
                    <circle cx="40" cy="40" r="6" fill="var(--tx)"/>
                    <text x="40" y="65" text-anchor="middle" font-size="8">${Math.round(v)} ${o.unit||''}</text>`;
        }
    },
    an: {
        n: 'Valor numérico', k: 'an', wr: 0, w: 70, h: 30,
        r: (o, v) => `<rect width="70" height="30" fill="var(--pn)" stroke="var(--ln)"/>
                      <text x="35" y="20" text-anchor="middle" font-family="monospace">${Math.round(v)} ${o.unit||''}</text>`
    },
    bar: {
        n: 'Barra', k: 'an', wr: 0, w: 30, h: 100,
        r: (o, v) => {
            const h = Math.max(0, Math.min(100, (v - o.min) / (o.max - o.min || 1) * 100));
            return `<rect width="30" height="100" fill="var(--pn)" stroke="var(--ln)"/>
                    <rect x="2" y="${100-h}" width="26" height="${h}" fill="var(--cy)"/>
                    <text x="15" y="-5" text-anchor="middle" font-size="9">${Math.round(v)}</text>`
        }
    },
    txt: {
        n: 'Texto estático', k: '', wr: 0, w: 100, h: 20,
        r: (o) => `<text x="0" y="15" font-size="14" fill="var(--tx)">${o.label}</text>`
    },
    sym: {
        n: 'Símbolo ISA 5.1', k: '', wr: 0, w: 60, h: 60,
        r: (o, v) => `<g transform="scale(1.5)">${o.sym ? '<circle cx="20" cy="20" r="15" fill="none" stroke="var(--tx)"/>' : ''}</g>`
    }
};
