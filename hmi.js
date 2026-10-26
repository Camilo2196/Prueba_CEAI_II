export const zoomer = (el, w, h, cb) => {
    let vw = {x:0, y:0, z:1};
    return {
        vw,
        zoom: f => {
            vw.z = Math.max(0.3, Math.min(4, vw.z * f));
            if(cb) cb();
        },
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
            const txtColor = isActive ? '#fff' : 'var(--tx)';
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
    sym: {
        n: 'Símbolo', k: '', wr: 0, w: 60, h: 60,
        r: (o, v) => `<g transform="scale(1.5)">${o.sym ? '<circle cx="20" cy="20" r="15" fill="none" stroke="var(--tx)"/>' : ''}</g>`
    }
};