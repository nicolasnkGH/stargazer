document.addEventListener("DOMContentLoaded", function() {
  const wrapper = document.getElementById("css-solar-system-wrapper");
  const universe = document.getElementById("universe");
  const solarsys = document.getElementById("solar-system");

  if (!wrapper || !universe || !solarsys) return;

  const init = function() {
    wrapper.classList.remove('view-2D', 'opening');
    wrapper.classList.add("view-3D");
    
    setTimeout(() => {
      wrapper.classList.remove('hide-UI');
      wrapper.classList.add("set-speed");
    }, 2000);
  };

  const setView = function(view) { 
    universe.className = '';
    universe.classList.add(...view.split(' ')); 
  };

  // If we ever add controls back, these listeners handle them:
  const toggleData = document.getElementById("toggle-data");
  if (toggleData) {
    toggleData.addEventListener("click", function(e) {
      wrapper.classList.toggle("data-open");
      wrapper.classList.toggle("data-close");
      e.preventDefault();
    });
  }

  const toggleControls = document.getElementById("toggle-controls");
  if (toggleControls) {
    toggleControls.addEventListener("click", function(e) {
      wrapper.classList.toggle("controls-open");
      wrapper.classList.toggle("controls-close");
      e.preventDefault();
    });
  }

  const dataLinks = document.querySelectorAll("#data a");
  dataLinks.forEach(link => {
    link.addEventListener("click", function(e) {
      const ref = this.className.replace('active', '').trim();
      solarsys.className = '';
      solarsys.classList.add(ref);
      
      dataLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');
      e.preventDefault();
    });
  });

  const setViewBtn = document.querySelector(".set-view");
  if (setViewBtn) {
    setViewBtn.addEventListener("click", function() { 
      wrapper.classList.toggle("view-3D");
      wrapper.classList.toggle("view-2D");
    });
  }

  const setZoomBtn = document.querySelector(".set-zoom");
  if (setZoomBtn) {
    setZoomBtn.addEventListener("click", function() { 
      wrapper.classList.toggle("zoom-large");
      wrapper.classList.toggle("zoom-close");
    });
  }

  const setSpeedBtn = document.querySelector(".set-speed");
  if (setSpeedBtn) {
    setSpeedBtn.addEventListener("click", function() { setView("scale-stretched set-speed"); });
  }

  const setSizeBtn = document.querySelector(".set-size");
  if (setSizeBtn) {
    setSizeBtn.addEventListener("click", function() { setView("scale-s set-size"); });
  }

  const setDistBtn = document.querySelector(".set-distance");
  if (setDistBtn) {
    setDistBtn.addEventListener("click", function() { setView("scale-d set-distance"); });
  }

  init();
});
