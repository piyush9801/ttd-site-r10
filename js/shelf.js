/* The Work · the record shelf. One spine is pulled out at a time; click (or Enter) another to swap. */
(function () {
  var sh = document.querySelector('.sh'); if (!sh) return;
  sh.addEventListener('click', function (e) {
    var b = e.target.closest('.sp-b'); if (!b) return;
    var sp = b.parentNode; if (sp.classList.contains('on')) return;
    [].forEach.call(sh.querySelectorAll('.sp'), function (o) {
      var on = o === sp; o.classList.toggle('on', on); o.firstElementChild.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
  });
})();
