const API_BASE = window.location.origin === 'http://localhost:5500' ? 'http://127.0.0.1:8000' : '';

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
  
  // Fetch data
  const constRes = await fetchAPI(`/constellation_window?abbr=${abbr}`);
  const targetRes = await fetchAPI(`/targets?constellation=${abbr}`);
  
  const targets = (targetRes && targetRes.targets) ? targetRes.targets : [];
  
  // Set title
  if (constRes && constRes.name) {
    document.getElementById('pl-title').textContent = `${constRes.emoji || '✨'} ${constRes.name}`;
  } else {
    document.getElementById('pl-title').textContent = `Constellation: ${abbr}`;
  }
  
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
      show: true, names: true, lines: true,
      lineStyle: { stroke: "#60a5fa", width: 1.5, opacity: 0.5 }
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
        .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2.5);
            tooltip.style('opacity', 1)
                   .html(`<strong>${d.name}</strong><br>Mag ${d.magnitude || '?'}`)
                   .style('left', (d3.event.pageX + 15) + 'px')
                   .style('top', (d3.event.pageY - 25) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip.style('left', (d3.event.pageX + 15) + 'px')
                   .style('top', (d3.event.pageY - 25) + 'px');
        })
        .on('mouseout', function(event, d) {
            d3.select(this).attr('stroke', 'rgba(255,255,255,0.8)').attr('stroke-width', 1.5);
            tooltip.style('opacity', 0);
        });
        
      nodes.exit().remove();
    }
  });
}

document.addEventListener('DOMContentLoaded', initPlanetarium);
