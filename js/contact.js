/* ============================================================
   Contact Form Handler (Static - no backend)
   ============================================================ */
App.contact = (function() {
  'use strict';

  function init() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();

      var name = document.getElementById('contact-name').value.trim();
      var email = document.getElementById('contact-email').value.trim();
      var subject = document.getElementById('contact-subject').value.trim();
      var message = document.getElementById('contact-message').value.trim();

      if (!name || !email || !message) {
        App.ui.showToast('Please fill in all required fields.', 'error');
        return;
      }

      // Simulate sending (FYP1 - no backend)

      App.ui.showToast('Message sent! (Demo - no backend in FYP1)', 'success');
      form.reset();
    });
  }

  return {
    init: init
  };
})();
