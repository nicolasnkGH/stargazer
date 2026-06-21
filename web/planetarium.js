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
        .attr('fill', d => {
            const t = (d.type || '').toLowerCase();
            if (t.includes('star')) return '#fbbf24';
            if (t.includes('cluster')) return '#38bdf8';
            if (t.includes('nebula')) return '#f472b6';
            if (t.includes('galaxy')) return '#a855f7';
            return '#cbd5e1';
        })
        .style('stroke', 'rgba(255,255,255,0.8)')
        .style('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .style('filter', 'drop-shadow(0 0 8px rgba(255,255,255,0.6))')
        .on('mouseover', function(d, i) {
            d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2.5);
            tooltip.style('opacity', 1)
                   .html(`<strong>${d.name}</strong><br>Mag ${d.magnitude || '?'}`)
                   .style('left', (d3.event.pageX + 15) + 'px')
                   .style('top', (d3.event.pageY - 25) + 'px');
        })
        .on('mousemove', function(d, i) {
            tooltip.style('left', (d3.event.pageX + 15) + 'px')
                   .style('top', (d3.event.pageY - 25) + 'px');
        })
        .on('mouseout', function(d, i) {
            d3.select(this).attr('stroke', 'rgba(255,255,255,0.8)').attr('stroke-width', 1.5);
            tooltip.style('opacity', 0);
        })
        .on('click', function(d, i) {
            const panel = document.getElementById('pl-details-panel');
            panel.style.display = 'block';
            
            document.getElementById('pld-name').textContent = d.name;
            document.getElementById('pld-type').textContent = d.type || 'Object';
            document.getElementById('pld-mag').textContent = d.magnitude || 'Unknown';
            
            // Format RA/Dec nicely
            const raStr = d.ra_hours != null ? `${d.ra_hours.toFixed(2)}h` : '?';
            const decStr = d.dec_degrees != null ? `${d.dec_degrees.toFixed(2)}°` : '?';
            document.getElementById('pld-radec').textContent = `${raStr} / ${decStr}`;
            
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
  
  // Star click handler for SIMBAD
  d3.select('#celestial-container canvas').on('click', function() {
    const proj = Celestial.mapProjection;
    if(!proj) return;
    const p = d3.mouse(this);
    const coords = proj.invert(p); // [ra_deg, dec_deg]
    if(!coords) return;
    
    // Check if pl-details-panel is open, if so, don't trigger the star modal! (We clicked a known target)
    if(document.getElementById('pl-details-panel').style.display === 'block') {
      // Actually, if we clicked the map but NOT a target, we want to hide it or show star modal.
      // D3 mouse events on the canvas itself trigger if we didn't hit a target.
    }
    
    const modal = document.getElementById('star-modal');
    if(!modal) return;
    modal.style.display = 'block';
    
    document.getElementById('star-modal-title').textContent = "Star Info";
    document.getElementById('star-modal-body').innerHTML = '<p style="margin:0; text-align:center;">Scanning SIMBAD Database...</p>';
    
    let ra = coords[0];
    if (ra < 0) ra += 360;
    const dec = coords[1];

    fetch(`/api/star?ra=${ra}&dec=${dec}`)
      .then(r => r.json())
      .then(data => {
        if(data.error) throw new Error();
        document.getElementById('star-modal-title').textContent = data.name.replace('* ', '');
        document.getElementById('star-modal-body').innerHTML = `
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span style="color:#94a3b8;">Spectral Type</span>
            <span style="color:#e2e8f0; font-family:monospace;">${data.spectral_type}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#94a3b8;">Distance</span>
            <span style="color:#e2e8f0; font-family:monospace;">${data.distance}</span>
          </div>
        `;
      })
      .catch(e => {
        document.getElementById('star-modal-body').innerHTML = '<p style="color:#ef4444; margin:0; text-align:center;">Could not resolve star data at this location.</p>';
      });
  });
  
  document.getElementById('close-star-btn')?.addEventListener('click', () => {
    document.getElementById('star-modal').style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', initPlanetarium);
