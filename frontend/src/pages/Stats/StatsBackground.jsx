import React, { useEffect } from 'react';
import './StatsBackground.css';

const StatsBackground = () => {
  useEffect(() => {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, frame = 0;
    let animationId;
    let clockInterval;

    const TEAL  = '0,201,177';
    const BLUE  = '0,212,255';
    const PURP  = '124,106,247';
    const ORG   = '247,162,106';

    function resize(){
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    let gridOff = 0;
    const gridNodes = [];
    function initNodes(){
      gridNodes.length = 0;
      const cols = Math.ceil(W/56)+2;
      const rows = Math.ceil(H/56)+2;
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          if(Math.random()<0.08){
            gridNodes.push({
              gc:c, gr:r,
              pulse:Math.random()*Math.PI*2,
              speed:Math.random()*0.025+0.01,
              color:[TEAL,BLUE,PURP,ORG][Math.floor(Math.random()*4)],
            });
          }
        }
      }
    }
    initNodes();

    function drawGrid(){
      const G = 56;
      const off = gridOff % G;
      ctx.lineWidth=0.5;
      for(let x=-G+off; x<W+G; x+=G){
        const nx = x/W; const glow = Math.sin(nx*Math.PI)*0.04+0.015;
        ctx.strokeStyle=`rgba(${TEAL},${glow})`;
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
      }
      for(let y=-G+off; y<H+G; y+=G){
        const ny=y/H; const glow=Math.sin(ny*Math.PI)*0.04+0.015;
        ctx.strokeStyle=`rgba(${TEAL},${glow})`;
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
      }
      gridNodes.forEach(n=>{
        n.pulse+=n.speed;
        const x = (n.gc*G - G + off + gridOff%G);
        const y = (n.gr*G - G + off + gridOff%G);
        const a  = 0.4+0.4*Math.sin(n.pulse);
        const g = ctx.createRadialGradient(x,y,0,x,y,10);
        g.addColorStop(0,`rgba(${n.color},${a*0.25})`);
        g.addColorStop(1,`rgba(${n.color},0)`);
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,10,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=`rgba(${n.color},${a})`;
        ctx.beginPath(); ctx.arc(x,y,2,0,Math.PI*2); ctx.fill();
      });
      gridOff+=0.28;
    }

    const orbs=[
      {fx:0.1, fy:0.15, r:260, c:TEAL,  d:0},
      {fx:0.88,fy:0.8,  r:200, c:PURP,  d:1.8},
      {fx:0.55,fy:0.45, r:160, c:BLUE,  d:3.5},
      {fx:0.2, fy:0.75, r:140, c:ORG,   d:5},
    ];
    function drawOrbs(){
      orbs.forEach(o=>{
        const ox=o.fx*W+Math.sin(frame*0.0035+o.d)*35;
        const oy=o.fy*H+Math.cos(frame*0.0028+o.d)*25;
        const g=ctx.createRadialGradient(ox,oy,0,ox,oy,o.r);
        g.addColorStop(0,`rgba(${o.c},0.08)`);
        g.addColorStop(0.5,`rgba(${o.c},0.025)`);
        g.addColorStop(1,`rgba(${o.c},0)`);
        ctx.fillStyle=g;
        ctx.beginPath(); ctx.arc(ox,oy,o.r,0,Math.PI*2); ctx.fill();
      });
    }

    const bars=[
      {x:0.18,h:0.55,c:TEAL},  {x:0.24,h:0.38,c:PURP},
      {x:0.3, h:0.70,c:TEAL},  {x:0.36,h:0.45,c:ORG},
      {x:0.42,h:0.60,c:BLUE},  {x:0.48,h:0.30,c:PURP},
      {x:0.54,h:0.75,c:TEAL},  {x:0.60,h:0.50,c:ORG},
      {x:0.66,h:0.65,c:BLUE},  {x:0.72,h:0.40,c:TEAL},
      {x:0.78,h:0.55,c:PURP},  {x:0.84,h:0.35,c:ORG},
    ];
    const BASE_Y = 0.82;
    function drawGhostBars(){
      bars.forEach((b,i)=>{
        const bx=b.x*W;
        const bh=(b.h+Math.sin(frame*0.015+i)*0.06)*H*0.25;
        const by=BASE_Y*H - bh;
        const bw=W*0.035;
        const g=ctx.createLinearGradient(bx,by,bx,by+bh);
        g.addColorStop(0,`rgba(${b.c},0.12)`);
        g.addColorStop(1,`rgba(${b.c},0.02)`);
        ctx.fillStyle=g;
        ctx.beginPath();
        const r=4;
        ctx.moveTo(bx+r,by);
        ctx.lineTo(bx+bw-r,by); ctx.quadraticCurveTo(bx+bw,by,bx+bw,by+r);
        ctx.lineTo(bx+bw,by+bh-r); ctx.quadraticCurveTo(bx+bw,by+bh,bx+bw-r,by+bh);
        ctx.lineTo(bx+r,by+bh); ctx.quadraticCurveTo(bx,by+bh,bx,by+bh-r);
        ctx.lineTo(bx,by+r); ctx.quadraticCurveTo(bx,by,bx+r,by);
        ctx.closePath();
        ctx.fill();
      });
    }

    const rings=[
      {cx:0.08, cy:0.32, r:30, pct:0.75, c:TEAL,  phase:0},
      {cx:0.93, cy:0.28, r:24, pct:0.60, c:PURP,  phase:1},
      {cx:0.06, cy:0.65, r:20, pct:0.88, c:BLUE,  phase:2},
      {cx:0.94, cy:0.62, r:26, pct:0.45, c:ORG,   phase:3},
    ];
    function drawGhostRings(){
      rings.forEach(rng=>{
        rng.phase+=0.006;
        const cx=rng.cx*W, cy=rng.cy*H;
        const anim_pct = rng.pct+Math.sin(rng.phase)*0.05;
        ctx.strokeStyle=`rgba(${rng.c},0.08)`;
        ctx.lineWidth=4;
        ctx.beginPath(); ctx.arc(cx,cy,rng.r,0,Math.PI*2); ctx.stroke();
        ctx.strokeStyle=`rgba(${rng.c},0.22)`;
        ctx.lineWidth=4;
        ctx.lineCap='round';
        ctx.beginPath();
        ctx.arc(cx,cy,rng.r,-Math.PI/2,-Math.PI/2+Math.PI*2*anim_pct);
        ctx.stroke();
        ctx.fillStyle=`rgba(${rng.c},0.5)`;
        ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fill();
      });
    }

    let wavePhase=0;
    function drawWave(){
      ctx.strokeStyle=`rgba(${TEAL},0.1)`;
      ctx.lineWidth=1.2;
      ctx.beginPath();
      const y0=H*0.68;
      for(let x=0;x<W;x+=2){
        const t=(x/W)*Math.PI*10+wavePhase;
        let y=y0;
        const p=t%(Math.PI*2);
        if(p>2.7&&p<2.85)      y=y0-55;
        else if(p>2.85&&p<3.0) y=y0+18;
        else if(p>3.0&&p<3.2)  y=y0-8;
        else                   y=y0+Math.sin(t*0.4)*5;
        x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.stroke();

      ctx.strokeStyle=`rgba(${PURP},0.06)`;
      ctx.lineWidth=1;
      ctx.beginPath();
      const y1=H*0.28;
      for(let x=0;x<W;x+=2){
        const t=(x/W)*Math.PI*7+wavePhase*0.8;
        const y=y1+Math.sin(t)*7+Math.sin(t*1.7)*3;
        x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.stroke();

      ctx.strokeStyle=`rgba(${BLUE},0.05)`;
      ctx.lineWidth=1;
      ctx.beginPath();
      const y2=H*0.9;
      for(let x=0;x<W;x+=2){
        const t=(x/W)*Math.PI*5+wavePhase*0.6+2;
        const y=y2+Math.sin(t)*10+Math.sin(t*2)*4;
        x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.stroke();

      wavePhase+=0.014;
    }

    class Particle{
      constructor(){this.reset(true);}
      reset(init){
        this.x=Math.random()*W;
        this.y=init?Math.random()*H:H+5;
        this.vx=(Math.random()-0.5)*0.3;
        this.vy=-Math.random()*0.45-0.1;
        this.r=Math.random()*1.6+0.4;
        this.life=1; this.decay=Math.random()*0.002+0.0007;
        this.color=[TEAL,BLUE,PURP,ORG][Math.floor(Math.random()*4)];
        this.pulse=Math.random()*Math.PI*2;
      }
      update(){
        this.x+=this.vx; this.y+=this.vy;
        this.pulse+=0.015; this.life-=this.decay;
        if(this.life<=0||this.y<-10)this.reset();
      }
      draw(){
        const a=this.life*(0.5+0.15*Math.sin(this.pulse));
        ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${this.color},${a})`; ctx.fill();
      }
    }
    let particles=[];
    function initParticles(){
      particles=Array.from({length:Math.floor(W*H/8000)},()=>new Particle());
    }
    initParticles();
    
    function drawConnections(){
      for(let i=0;i<particles.length;i++){
        for(let j=i+1;j<particles.length;j++){
          const dx=particles[i].x-particles[j].x;
          const dy=particles[i].y-particles[j].y;
          const d=Math.sqrt(dx*dx+dy*dy);
          if(d<90){
            ctx.strokeStyle=`rgba(${TEAL},${(1-d/90)*0.1*particles[i].life*particles[j].life})`;
            ctx.lineWidth=0.5;
            ctx.beginPath(); ctx.moveTo(particles[i].x,particles[i].y);
            ctx.lineTo(particles[j].x,particles[j].y); ctx.stroke();
          }
        }
      }
    }

    function animate(){
      ctx.clearRect(0,0,W,H);
      drawOrbs();
      drawGrid();
      drawGhostBars();
      drawGhostRings();
      drawWave();
      particles.forEach(p=>{p.update();p.draw();});
      drawConnections();
      frame++;
      animationId = requestAnimationFrame(animate);
    }
    animate();
    
    const reinitListener = () => { resize(); initNodes(); initParticles(); }
    window.addEventListener('resize', reinitListener);

    // Floating stat cards
    const cards=[
      {
        icon:'📊', label:'Timetable Progress', val:'33%',
        color:'#00c9b1', accent:'rgba(0,201,177,0.35)',
        badge:'THIS WEEK', badgeBg:'rgba(0,201,177,0.1)', badgeC:'#00c9b1',
        iconBg:'rgba(0,201,177,0.12)',
        barW:33, spark:[40,65,50,80,55,33],
        pos:{top:'8%',left:'4%'}, delay:0.3, bob:'8s',
      },
      {
        icon:'⏱️', label:'Focus Time Today', val:'2h 14m',
        color:'#7c6af7', accent:'rgba(124,106,247,0.35)',
        badge:'ACTIVE', badgeBg:'rgba(124,106,247,0.1)', badgeC:'#7c6af7',
        iconBg:'rgba(124,106,247,0.12)',
        barW:67, spark:[20,35,55,70,60,67],
        pos:{top:'8%',right:'4%'}, delay:0.5, bob:'10s',
      },
      {
        icon:'💓', label:'Wellness Score', val:'84',
        color:'#00c9b1', accent:'rgba(0,201,177,0.35)',
        badge:'LEVEL 12', badgeBg:'rgba(0,201,177,0.08)', badgeC:'#00c9b1',
        iconBg:'rgba(0,201,177,0.12)',
        barW:84, spark:[60,70,65,80,75,84],
        pos:{bottom:'18%',left:'3%'}, delay:0.7, bob:'9s',
      },
      {
        icon:'🧠', label:'Sessions Today', val:'4',
        color:'#00d4ff', accent:'rgba(0,212,255,0.35)',
        badge:'FOCUS', badgeBg:'rgba(0,212,255,0.08)', badgeC:'#00d4ff',
        iconBg:'rgba(0,212,255,0.12)',
        barW:55, spark:[10,20,30,45,50,55],
        pos:{bottom:'18%',right:'3%'}, delay:0.9, bob:'7s',
      },
      {
        icon:'🏆', label:'Certificate Earned', val:'✓',
        color:'#f7a26a', accent:'rgba(247,162,106,0.35)',
        badge:'ACHIEVED', badgeBg:'rgba(247,162,106,0.08)', badgeC:'#f7a26a',
        iconBg:'rgba(247,162,106,0.12)',
        barW:75, spark:[30,40,55,60,70,75],
        pos:{top:'42%',left:'2%'}, delay:1.1, bob:'11s',
      },
      {
        icon:'🔥', label:'Stress Level', val:'12%',
        color:'#f7706a', accent:'rgba(247,112,106,0.35)',
        badge:'LOW', badgeBg:'rgba(247,112,106,0.08)', badgeC:'#f7706a',
        iconBg:'rgba(247,112,106,0.12)',
        barW:12, spark:[45,30,25,18,15,12],
        pos:{top:'42%',right:'2%'}, delay:1.3, bob:'9s',
      },
    ];

    const fl = document.getElementById('floatLayer');
    if (fl && fl.children.length === 0) {
      cards.forEach(c=>{
        const el=document.createElement('div');
        el.className='bg-fcard';
        Object.entries(c.pos).forEach(([k,v])=>el.style[k]=v);
        el.style.setProperty('--accent',c.accent);
        el.style.animationDelay=c.delay+'s';
        el.style.setProperty('--bob',c.bob);
        el.style.width='168px';

        const sparkBars=c.spark.map((v,i)=>`
          <div class="bg-spark-bar" style="height:${v}%;background:${c.color};animation-delay:${i*0.1}s;"></div>
        `).join('');

        el.innerHTML=`
          <div class="bg-fcard-head">
            <div class="bg-fcard-icon" style="background:${c.iconBg};">${c.icon}</div>
            <div class="bg-fcard-badge" style="background:${c.badgeBg};color:${c.badgeC};">${c.badge}</div>
          </div>
          <div class="bg-fcard-val" style="color:${c.color};">${c.val}</div>
          <div class="bg-fcard-label">${c.label}</div>
          <div class="bg-mini-bar">
            <div class="bg-mini-bar-fill" style="background:${c.color};width:${c.barW}%;transition:width 1.5s cubic-bezier(0.34,1.2,0.64,1) ${c.delay+0.3}s;"></div>
          </div>
          <div class="bg-spark">${sparkBars}</div>`;
        fl.appendChild(el);
      });
    }

    // Ticker data
    const tickerData=[
      {label:'Wellness Score',  val:'84',      color:'#00c9b1'},
      {label:'Focus Time',      val:'2h 14m',  color:'#7c6af7'},
      {label:'Tasks Completed', val:'2/6',     color:'#f7a26a'},
      {label:'Stress Level',    val:'12%',     color:'#3dffc0'},
      {label:'Sleep Quality',   val:'7.5h',    color:'#00d4ff'},
      {label:'Sessions',        val:'4 today', color:'#7c6af7'},
      {label:'Level',           val:'12',      color:'#f7a26a'},
      {label:'XP',              val:'650/1000',color:'#00c9b1'},
      {label:'Certificate',     val:'EARNED',  color:'#f7a26a'},
      {label:'Exercise',        val:'60%',     color:'#3dffc0'},
    ];

    const ti=document.getElementById('tickerInner');
    if (ti && ti.children.length === 0) {
      [...tickerData,...tickerData].forEach(d=>{
        const item=document.createElement('div');
        item.className='bg-ticker-item';
        item.innerHTML=`<div class="bg-dot" style="background:${d.color};"></div>${d.label} <span class="bg-ticker-val" style="color:${d.color};">${d.val}</span>`;
        ti.appendChild(item);
      });
    }

    function tick(){
      const n=new Date();
      const clockEl = document.getElementById('liveClock');
      if (clockEl) clockEl.textContent=n.toTimeString().slice(0,8);
      const dateEl = document.getElementById('liveDate');
      if (dateEl) dateEl.textContent=n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}).toUpperCase();
    }
    tick(); 
    clockInterval = setInterval(tick,1000);

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(clockInterval);
      window.removeEventListener('resize', reinitListener);
    };
  }, []);

  return (
    <div className="stats-bg-wrap">
      <canvas id="bgCanvas"></canvas>
      <div className="scanlines"></div>
      <div className="vignette"></div>

      <div className="hud-corner c-tl"></div>
      <div className="hud-corner c-tr"></div>
      <div className="hud-corner c-bl"></div>
      <div className="hud-corner c-br"></div>

      <div className="hud-t h-tl">STATS // WELLNESS_360</div>
      <div className="hud-t h-tr" id="liveClock">--:--:--</div>
      <div className="hud-t h-bl">IIIT HACKATHON 2026</div>
      <div className="hud-t h-br" id="liveDate"></div>

      <div className="watermark">
        <div className="wm-ring">
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="40" fill="none" stroke="rgba(0,201,177,0.08)" strokeWidth="1"/>
            <circle cx="45" cy="45" r="32" fill="none" stroke="rgba(0,201,177,0.12)" strokeWidth="1.5" strokeDasharray="4 3"/>
          </svg>
          <div className="wm-icon">📊</div>
        </div>
        <div className="wm-text">Stats &amp; Progress</div>
      </div>

      <div className="float-layer" id="floatLayer"></div>

      <div className="bg-ticker">
        <div className="bg-ticker-label">LIVE</div>
        <div className="bg-ticker-track">
          <div className="bg-ticker-inner" id="tickerInner"></div>
        </div>
      </div>
    </div>
  );
};

export default StatsBackground;
