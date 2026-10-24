// Pups in My City: swap an episode's thumbnail for the YouTube player when someone presses play.
(function () {
  document.querySelectorAll('[data-yt]').forEach(function (box) {
    var a = box.querySelector('a');
    if (!a) return;
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return; // let people open YouTube in a new tab
      e.preventDefault();
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(box.getAttribute('data-yt')) + '?autoplay=1&rel=0&playsinline=1';
      f.title = box.getAttribute('data-title') || 'Pups in My City episode';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      f.setAttribute('loading', 'lazy');
      box.replaceChildren(f);
      box.classList.add('is-playing');
      f.focus();
    });
  });
})();
