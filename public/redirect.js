// Handle redirect from 404.html for SPA routing on GitHub Pages
(function() {
  var redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  if (redirect && redirect !== location.href) {
    history.replaceState(null, null, redirect);
  }
  // Also handle ?p= query param redirect
  var search = window.location.search;
  if (search && search.indexOf('?p=') === 0) {
    var path = decodeURIComponent(search.slice(3));
    history.replaceState(null, null, '/finance-dashboard' + path);
  }
})();
