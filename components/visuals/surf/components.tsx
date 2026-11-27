// Figures for posts/the-math-behind-counter-strike-surfing.md
//
// Embed in the post with:  <div className="surf" id="fig1"></div>
//
// Each figure is a static page under public/surf-figs/, shown in an iframe: loaded when it comes near
// the viewport, unloaded when it's far away (so only a few WebGL contexts are alive at once), and sized
// to its content by a postMessage from the page.

import React, { useEffect, useRef, useState } from 'react';

const BASE = '/surf-figs/surfmath/v2/';

export const SURF_FIGS: Record<string, { src: string; h: number; m: number }> = {
    fig1: { src: '07-runs.html?fig=wr&post=1&bare=1', h: 456, m: 245 },
    fig2: { src: '01-moving.html?fig=f-vel&bare=1', h: 374, m: 806 },
    fig3: { src: '01-moving.html?fig=f-acc&bare=1', h: 327, m: 692 },
    fig4: { src: '01-moving.html?fig=f-air&bare=1', h: 627, m: 1329 },
    fig5: { src: '02-air.html?fig=f-code&bare=1', h: 217, m: 466 },
    fig6: { src: '02-air.html?fig=f-spiral&bare=1', h: 318, m: 685 },
    fig7: { src: '05-ramps.html?fig=f1&bare=1', h: 286, m: 493 },
    fig8: { src: '05-ramps.html?fig=f2&bare=1', h: 327, m: 661 },
    fig9: { src: '05-ramps.html?fig=fB&bare=1', h: 446, m: 316 },
    fig10: { src: '05-ramps.html?fig=f-transfer&bare=1', h: 399, m: 282 },
    fig11: { src: '06-maps.html?fig=3&only=surf_10x_final,surf_greatriver,surf_japan_v2,surf_machine&bare=1', h: 930, m: 1969 },
    fig12: { src: '06-maps.html?fig=4&only=surf_fruits,surf_vegetables&bare=1', h: 461, m: 981 },
    fig13: { src: '08-craft.html?fig=f-curve3&bare=1', h: 398, m: 290 },
    fig14: { src: '08-craft.html?fig=f-boost3&bare=1', h: 378, m: 290 },
    fig15: { src: '04-goldsrc.html?fig=f-cube&cap=3500&bare=1', h: 346, m: 750 },
    fig16: { src: '03-quake.html?fig=1&bare=1&notouch=1', h: 565, m: 444 },
    fig17: { src: '03-quake.html?fig=2&bare=1&notouch=1', h: 606, m: 504 },
    fig18: { src: '03-quake.html?fig=3&bare=1&notouch=1', h: 499, m: 524 },
    fig19: { src: '03-games.html?fig=1&bare=1', h: 398, m: 420 },
    fig20: { src: '10-bot.html?fig=f-leet&bare=1', h: 436, m: 288 },
    fig21: { src: '10-bot.html?fig=f-tasin&bare=1', h: 235, m: 300 },
    fig22: { src: '10-bot.html?fig=f-fork&bare=1&notouch=1', h: 346, m: 477 },
    fig23: { src: '10-bot.html?fig=f-code&bare=1', h: 626, m: 900 },
    fig24: { src: '10-bot.html?fig=f-search&bare=1', h: 528, m: 351 },
    fig25: { src: '06-maps.html?fig=f-pipeline&bare=1', h: 464, m: 300 },
};

export function SurfVisual({ id, caption }: { id: string; caption?: string }) {
    const fig = SURF_FIGS[id];
    const wrap = useRef<HTMLDivElement>(null);
    const frame = useRef<HTMLIFrameElement>(null);
    const [live, setLive] = useState(false);
    const [shown, setShown] = useState(false);   // iframe stays hidden until its page has loaded, over a light grey box
    // starting height before the page reports its own: measured at desktop (697 px) and phone (362 px) widths
    const [height, setHeight] = useState(fig ? fig.h : 0);

    useEffect(() => {
        if (!fig || !wrap.current) return;
        if (wrap.current.clientWidth < 600) setHeight(fig.m);
        // load ahead of the reader; unload once well out of view
        const near = new IntersectionObserver(([e]) => { if (e.isIntersecting) setLive(true); }, { rootMargin: '800px 0px' });
        const far = new IntersectionObserver(([e]) => { if (!e.isIntersecting) { setLive(false); setShown(false); } }, { rootMargin: '2400px 0px' });
        near.observe(wrap.current); far.observe(wrap.current);
        const onMessage = (m: MessageEvent) => {
            if (m.data && m.data.surfFig && frame.current && m.source === frame.current.contentWindow) setHeight(m.data.h);
        };
        window.addEventListener('message', onMessage);
        return () => { near.disconnect(); far.disconnect(); window.removeEventListener('message', onMessage); };
    }, [id]);

    if (!fig) return null;
    return (
        <div style={{ margin: '28px 0' }}>
        <div ref={wrap} className="surf-fig" style={{ height: caption ? height - 8 : height, background: '#f7f7f9', borderRadius: 6, overflow: 'hidden' }}>
            {live ? (
                <iframe
                    ref={frame}
                    src={BASE + fig.src}
                    title={`Figure ${id.replace('fig', '')}`}
                    scrolling="no"
                    onLoad={() => setShown(true)}
                    style={{ width: '100%', height: '100%', border: 0, display: 'block', overflow: 'hidden', opacity: shown ? 1 : 0, transition: 'opacity 0.2s' }}
                />
            ) : null}
        </div>
        {/* the frame above is 8px shorter (only empty space is cut) so the caption sits close without overlapping the iframe, which phones draw on top */}
        {caption ? <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--light-text)', margin: 0 }}>{caption}</p> : null}
        </div>
    );
}
