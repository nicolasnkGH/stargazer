const API_BASE = window.location.hostname.includes('nick-t.net')
  ? 'https://stargazerapi.nick-t.net'
  : `http://${window.location.hostname}:8181`;

async function fetchAPI(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function initPlanetarium() {
  const urlParams = new URLSearchParams(window.location.search);
  const abbr = urlParams.get('c') || 'Sco';
  
  // Night Mode Toggle
  const nightBtn = document.getElementById('btn-night-mode');
  if (nightBtn) {
    nightBtn.addEventListener('click', () => {
      document.body.classList.toggle('night-mode');
    });
  }
  
  // Fetch data
  const constRes = await fetchAPI(`/constellation_window?abbr=${abbr}`);
  const targetRes = await fetchAPI(`/targets?constellation=${abbr}`);
  
  const targets = (targetRes && targetRes.targets) ? targetRes.targets : [];
  
  // Set title to a static instruction since the user can pan around
  document.getElementById('pl-title').textContent = `Interactive Sky Map`;
  
  const validTargets = targets.filter(t => t.ra_hours != null && t.dec_degrees != null);
  
  let centerRa = 0;
  let centerDec = 0;

  if (constRes && constRes.ra_hours != null && constRes.dec_degrees != null) {
    centerRa = constRes.ra_hours * 15;
    centerDec = constRes.dec_degrees;
  } else if (validTargets.length > 0) {
    centerRa = d3.mean(validTargets, d => d.ra_hours) * 15;
    centerDec = d3.mean(validTargets, d => d.dec_degrees);
  }

  const config = {
    container: "celestial-container",
    width: 0,
    projection: "stereographic",
    transform: "equatorial",
    center: [centerRa, centerDec],
    zoomlevel: 3.5, // Slightly zoomed out for elegant full-constellation view
    interactive: true,
    controls: true, // Show controls on the dedicated page
    datapath: "https://cdn.jsdelivr.net/npm/d3-celestial@0.7.32/data/",
    stars: { show: true, limit: 6.0, colors: true, names: true, propername: true, size: 5 },
    dsos: { show: true, limit: 6, names: true, size: 5 },
    constellations: {
      show: true, names: true, namesType: "la", lines: true,
      lineStyle: { stroke: "#60a5fa", width: 1.5, opacity: 0.5 },
      nameStyle: { fill: "#94a3b8", align: "center", baseline: "middle", font: ["14px Space Grotesk, sans-serif"] }
    },
    mw: { show: true, style: { fill: "#ffffff", opacity: 0.1 } },
    lines: { graticule: { show: false }, equatorial: { show: false } },
    background: { fill: "transparent", stroke: "transparent", opacity: 0 } // Let the CSS background show through slightly if possible
  };

  Celestial.display(config);

  // Add custom targets layer
  Celestial.add({
    type: "raw",
    callback: function(error, json) {
      if (error) return;
    },
    redraw: function() {
      const proj = Celestial.mapProjection;
      const svg = Celestial.container;
      const tooltip = d3.select('#ac-map-tooltip');

      const nodes = svg.selectAll('.custom-target')
        .data(validTargets, d => d.name);
        
      nodes.enter()
        .append('circle')
        .attr('class', 'custom-target');
        
      nodes.attr('cx', d => {
          const pt = proj([d.ra_hours * 15, d.dec_degrees]);
          return pt ? pt[0] : -100;
        })
        .attr('cy', d => {
          const pt = proj([d.ra_hours * 15, d.dec_degrees]);
          return pt ? pt[1] : -100;
        })
        .attr('r', d => Math.max(4, 8 - (d.magnitude || 5)/2))
        .style('fill', '#a855f7')
        .style('stroke', '#fff')
        .style('stroke-width', '1px')
        .style('cursor', 'pointer')
            
            // Format Difficulty with color
            const diffEl = document.getElementById('pld-diff');
            let diffColor = 'var(--text-secondary)';
            const diffStr = (d.difficulty || '').toLowerCase();
            if (diffStr.includes('easy') || diffStr.includes('naked')) diffColor = '#4ade80';
            else if (diffStr.includes('medium')) diffColor = '#f59e0b';
            else if (diffStr.includes('hard')) diffColor = '#f87171';
            
            diffEl.textContent = (d.difficulty || 'Unknown').replace('_', ' ');
            diffEl.style.color = diffColor;
            
            document.getElementById('pld-alt').textContent = d.altitude_deg != null ? `${d.altitude_deg}° ${d.direction}` : 'Unknown';
            
            document.getElementById('pld-desc').innerHTML = d.description || 'No description available for this target.';
        });
        
      nodes.exit().remove();
    }
  });
}

document.addEventListener('DOMContentLoaded', initPlanetarium);
