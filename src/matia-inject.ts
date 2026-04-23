// MATIA COLOR INJECTION - Runs on every page load
// Injects pink branding directly into the DOM, bypassing CSS compilation

export function injectMATIAColors() {
  // Create style element that injects MATIA pink (#d1007d) into ALL elements
  const style = document.createElement('style');
  style.textContent = `
    /* MATIA FINAL COLOR OVERRIDE - Injected at runtime */
    :root {
      --primary: 211, 0, 125 !important;
      --accent: 211, 0, 125 !important;
      --matia-pink: #d1007d !important;
    }
    
    * {
      --matia-active: #d1007d !important;
    }
    
    body, html {
      background: linear-gradient(135deg, #fff0f7 0%, #ffe6f0 100%) !important;
    }
    
    button, [role="button"], input[type="button"], input[type="submit"] {
      background-color: #d1007d !important;
      border-color: #d1007d !important;
      color: white !important;
    }
    
    input, textarea, select {
      border-color: #d1007d !important;
    }
    
    input:focus, textarea:focus, select:focus {
      outline-color: #d1007d !important;
      border-color: #d1007d !important;
      box-shadow: 0 0 0 3px rgba(209, 0, 125, 0.1) !important;
    }
    
    a, [role="link"] {
      color: #d1007d !important;
    }
    
    h1, h2, h3, h4, h5, h6 {
      color: #d1007d !important;
    }
  `;
  
  document.head.insertAdjacentElement('beforeend', style);
}

// Run on document ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectMATIAColors);
} else {
  injectMATIAColors();
}
