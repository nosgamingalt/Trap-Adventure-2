(function () {
'use strict';

/* ╔══════════════════════════════════════════════════════════════════╗
   ║  AUDIO CONFIGURATION                                           ║
   ║  Replace each empty string with a direct URL to an MP3 file   ║
   ║                                                                ║
   ║  mainTheme  – The iconic "Cloudberry" track. Search            ║
   ║               SoundCloud or YouTube for an MP3 rip.            ║
   ║  deathSound – The high-pitched death scream / squeak.          ║
   ║  jumpSound  – Short hop blip.                                  ║
   ║  goalSound  – Happy level-complete jingle.                     ║
   ╚══════════════════════════════════════════════════════════════════╝ */
const AUDIO_URLS = {
    mainTheme:  '',
    deathSound: '',
    jumpSound:  '',
    goalSound:  ''
};

/* ─── Constants ─── */
const CW = 800, CH = 480, TS = 32;
const GRAVITY    = 0.52;
const JUMP_FORCE = -10.8;
const MOVE_ACCEL = 0.85;
const MOVE_DECEL = 0.62;
const AIR_ACCEL  = 0.55;
const AIR_DECEL  = 0.18;
const MAX_SPEED  = 3.9;
const MAX_FALL   = 12;
const COYOTE     = 7;
const JUMP_BUF   = 7;
const JUMP_CUT   = 0.38;
const START_LIVES = 20;
const DEATH_FRAMES = 14;

/* Tile IDs */
const T_AIR    = 0;
const T_GROUND = 1;
const T_SUP    = 2;   // spike up
const T_SDN    = 3;   // spike down
const T_SLT    = 4;   // spike left
const T_SRT    = 5;   // spike right
const T_FAKE   = 6;   // fake ground
const T_GOAL   = 7;   // goal flag
const T_SECRET = 8;   // secret room block
const T_CEIL   = 9;   // falling ceiling block

/* Game states */
const ST = { TITLE:0, PLAY:1, DIE:2, LVLUP:3, OVER:4, WIN:5, SECRET:6 };

/* ─── Input ─── */
const inp = { left:false, right:false, jump:false, jp:false };
let jBuf = 0;
function kd(e){
    const c=e.code;
    if(c==='ArrowLeft'||c==='KeyA') inp.left=true;
    if(c==='ArrowRight'||c==='KeyD') inp.right=true;
    if((c==='ArrowUp'||c==='KeyW'||c==='Space')&&!inp.jump){ inp.jump=true; inp.jp=true; }
    if(c==='Enter'||c==='Space') G.action();
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(c)) e.preventDefault();
}
function ku(e){
    const c=e.code;
    if(c==='ArrowLeft'||c==='KeyA') inp.left=false;
    if(c==='ArrowRight'||c==='KeyD') inp.right=false;
    if(c==='ArrowUp'||c==='KeyW'||c==='Space') inp.jump=false;
}
document.addEventListener('keydown',kd);
document.addEventListener('keyup',ku);

/* ─── Audio Manager ─── */
const sfx = {
    _t:null,_d:null,_j:null,_g:null,
    init(){
        try{
            if(AUDIO_URLS.mainTheme){ this._t=new Audio(AUDIO_URLS.mainTheme); this._t.loop=true; this._t.volume=0.25; }
            if(AUDIO_URLS.deathSound){ this._d=new Audio(AUDIO_URLS.deathSound); this._d.volume=0.45; }
            if(AUDIO_URLS.jumpSound){ this._j=new Audio(AUDIO_URLS.jumpSound); this._j.volume=0.3; }
            if(AUDIO_URLS.goalSound){ this._g=new Audio(AUDIO_URLS.goalSound); this._g.volume=0.4; }
        }catch(e){}
    },
    theme(on){ try{ if(this._t){ if(on){this._t.currentTime=0;this._t.play();}else this._t.pause(); }}catch(e){} },
    death(){ try{ if(this._d){this._d.currentTime=0;this._d.play();} }catch(e){} },
    jump(){  try{ if(this._j){this._j.currentTime=0;this._j.play();} }catch(e){} },
    goal(){  try{ if(this._g){this._g.currentTime=0;this._g.play();} }catch(e){} }
};

/* ─── Utility ─── */
function rr(a,b){ return a+Math.random()*(b-a); }
function ri(a,b){ return Math.floor(rr(a,b)); }
function overlap(x1,y1,w1,h1,x2,y2,w2,h2){
    return x1<x2+w2 && x1+w1>x2 && y1<y2+h2 && y1+h1>y2;
}

/* ═══════════════════════════════════════════════
   LEVEL DEFINITIONS
   ═══════════════════════════════════════════════ */

function mkLvl(w,h,psx,psy){
    return {
        w, h,
        tiles: Array.from({length:h},()=>Array(w).fill(T_AIR)),
        ps:{x:psx,y:psy},
        traps:[], platforms:[], blocks:[], projs:[], parts:[],
        fakeTimers:new Map(), activated:new Set()
    };
}
function ground(l,x1,x2,y){ for(let x=x1;x<=x2;x++){ l.tiles[y][x]=T_GROUND; if(y+1<l.h) l.tiles[y+1][x]=T_GROUND; } }
function spike(l,x,y,d){ l.tiles[y][x]=d==='u'?T_SUP:d==='d'?T_SDN:d==='l'?T_SLT:T_SRT; }

function buildLevel1(){
    const l=mkLvl(58,15, 2,12);

    /* Ground sections */
    ground(l,0,8,13);       // start area
    ground(l,10,16,13);     // after first gap
    ground(l,18,20,13);     // small island (fake at 19)
    ground(l,22,29,13);     // mid section
    ground(l,31,38,13);     // late section
    ground(l,40,48,13);     // goal section

    /* Fake floor at tile 19 – sits over a spike pit */
    l.tiles[13][19]=T_FAKE;
    l.tiles[14][19]=T_AIR;
    spike(l,19,14,'u');

    /* Ceiling trap blocks */
    l.tiles[9][25]=T_CEIL; l.tiles[9][26]=T_CEIL;
    l.tiles[10][25]=T_CEIL; l.tiles[10][26]=T_CEIL;

    /* Goal flag */
    l.tiles[13][47]=T_GOAL;

    /* Secret room blocks (rows 4-6, cols 1-3) */
    l.tiles[4][1]=T_SECRET; l.tiles[4][2]=T_SECRET; l.tiles[4][3]=T_SECRET;
    l.tiles[5][1]=T_SECRET;                       l.tiles[5][3]=T_SECRET;
    l.tiles[6][1]=T_SECRET; l.tiles[6][2]=T_SECRET; l.tiles[6][3]=T_SECRET;

    /* ── Traps ── */
    // 1) Hidden spike ahead at tile 12 – trigger zone is 32px before the spike
    l.traps.push({
        type:'spike', tx:12, ty:13,
        rx:352, ry:380, rw:32, rh:32,
        id:'l1s1'
    });
    // 2) Hidden spike at tile 28 – landing after second gap
    l.traps.push({
        type:'spike', tx:28, ty:13,
        rx:864, ry:380, rw:40, rh:32,
        id:'l1s2'
    });
    // 3) Ceiling fall trigger at tile 24
    l.traps.push({
        type:'ceil',
        cells:[{x:25,y:9},{x:26,y:9},{x:25,y:10},{x:26,y:10}],
        rx:736, ry:340, rw:32, rh:140,
        id:'l1c1'
    });
    // 4) Projectile from right wall near tile 35
    l.traps.push({
        type:'proj', sx:1200, sy:388, vx:-5.5, vy:0, pw:12, ph:12,
        rx:1056, ry:340, rw:32, rh:140,
        id:'l1p1'
    });
    // 5) Spike right before goal at tile 46
    l.traps.push({
        type:'spike', tx:46, ty:13,
        rx:1424, ry:380, rw:40, rh:32,
        id:'l1s3'
    });

    l.secretRect = {x:32, y:128, w:96, h:96};
    return l;
}

function buildLevel2(){
    const l=mkLvl(72,15, 2,12);

    /* Sparse ground – mostly pits with platforms */
    ground(l,0,5,13);
    ground(l,28,32,13);
    ground(l,48,52,13);
    ground(l,62,70,13);

    /* Goal */
    l.tiles[13][70]=T_GOAL;

    /* Spikes in pits */
    for(let x=6;x<=27;x++) if(x%3===0) spike(l,x,14,'u');
    for(let x=33;x<=47;x++) if(x%4===1) spike(l,x,14,'u');
    for(let x=53;x<=61;x++) if(x%3===0) spike(l,x,14,'u');

    /* ── Moving Platforms ── */
    // Platform 1: normal horizontal
    l.platforms.push({
        x:192, y:384, w:64, h:14,
        minX:192, maxX:352, dx:1, speed:1.2,
        type:'normal', timer:0, accel:1
    });
    // Platform 2: disappears after contact
    l.platforms.push({
        x:416, y:384, w:64,
