/* global React, ReactDOM, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakToggle */
const { useEffect } = React;

const CARTS = [
  { id:'crystal-cathedral-3d', name:'Crystal Cathedral', genre:'Showcase',  color:'#7ad9ff', featured:true },
  { id:'f-zero-nova-3d',       name:'F-Zero Nova',      genre:'Racer',     color:'#ff6ed3' },
  { id:'cyberpunk-city-3d',    name:'Cyberpunk City',   genre:'Open World',color:'#c886ff' },
  { id:'minecraft-demo',       name:'Voxel World',      genre:'Voxel',     color:'#88e58a' },
  { id:'demoscene',            name:'Tron Demoscene',   genre:'Audio FX',  color:'#ffd166' },
  { id:'adventure-comic-3d',   name:'Noir Adventure',   genre:'Cel Shade', color:'#e8e8e8' },
  { id:'dungeon-crawler-3d',   name:'Dungeon Crawler',  genre:'RPG',       color:'#ff8a4a' },
  { id:'pbr-showcase',         name:'PBR Showcase',     genre:'Materials', color:'#a0b8d0' },
  { id:'model-viewer-3d',      name:'Model Viewer',     genre:'GLTF',      color:'#7ad9ff' },
  { id:'hero-demo',            name:'Hero Prototype',   genre:'Action',    color:'#ff6ed3' },
  { id:'fps-demo-3d',          name:'FPS Combat',       genre:'Shooter',   color:'#ff5252' },
  { id:'mystical-realm-3d',    name:'Mystical Realm',   genre:'Fantasy',   color:'#c886ff' },
];

function Cart({ cart, idx, showStripes }) {
  const img = `public/assets/cart-thumbs/${cart.id}.png`;
  return (
    <a className={`cart ${cart.featured ? 'featured' : ''}`} href={`./console.html?demo=${cart.id}`} target="_blank" rel="noopener" style={{'--cart-color': cart.color}}>
      <div className="cart-shell">
        <div className="cart-top"></div>
        <span className="cart-screw tl"></span>
        <span className="cart-screw tr"></span>
        <span className="cart-screw bl"></span>
        <span className="cart-screw br"></span>
        {showStripes && <div className="cart-stripe"></div>}
        <div className="cart-label">
          <img src={img} alt={cart.name} loading="lazy" />
        </div>
        <div className="cart-plate">
          <div className="cart-plate-name">{cart.name}</div>
          <div className="cart-plate-meta">
            <span className="genre">{cart.genre}</span>
            <span>{String(idx + 1).padStart(3, '0')}</span>
          </div>
        </div>
      </div>
      <div className="cart-action">
        <span>Insert disc</span>
        <span className="arrow"></span>
      </div>
    </a>
  );
}

function App() {
  const [t, setTweak] = useTweaks(window.__TWEAK_DEFAULTS);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', t.accent);
  }, [t.accent]);

  // Apply shape class to the grid host so CSS .cart-shape-* rules cascade.
  useEffect(() => {
    const grid = document.getElementById('cart-grid');
    if (!grid) return;
    grid.classList.remove('cart-shape-slim', 'cart-shape-arcade');
    if (t.shape === 'slim')   grid.classList.add('cart-shape-slim');
    if (t.shape === 'arcade') grid.classList.add('cart-shape-arcade');
  }, [t.shape]);

  return (
    <>
      {CARTS.map((c, i) => <Cart key={c.id} cart={c} idx={i} showStripes={t.showStripes} />)}
      <TweaksPanel title="Tweaks">
        <TweakSection title="Cart shell">
          <TweakRadio
            label="Shape"
            value={t.shape}
            options={['classic', 'slim', 'arcade']}
            onChange={(v) => setTweak('shape', v)}
          />
          <TweakToggle
            label="Genre stripe"
            value={t.showStripes}
            onChange={(v) => setTweak('showStripes', v)}
          />
        </TweakSection>
        <TweakSection title="Palette">
          <TweakColor
            label="Accent"
            value={t.accent}
            options={['#5cd9ff', '#7af5c8', '#ff6ed3', '#ffb547', '#c886ff']}
            onChange={(v) => setTweak('accent', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

const gridEl = document.getElementById('cart-grid');
if (gridEl) ReactDOM.createRoot(gridEl).render(<App />);
