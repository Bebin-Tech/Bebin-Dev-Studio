window.applyTheme=function(theme){const valid=['light','dark','aurora'].includes(theme)?theme:'light';document.documentElement.dataset.theme=valid;try{localStorage.setItem('bebin-theme',valid);}catch{}};
try{window.applyTheme(localStorage.getItem('bebin-theme')||'light');}catch{window.applyTheme('light');}
