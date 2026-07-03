/* ============================================================
   Chatbot Icon (Static placeholder for FYP2)
   ============================================================ */
App.chatbot = (function() {
  'use strict';

  function init() {
    var chatbotBtn = document.getElementById('chatbot-btn');
    if (!chatbotBtn) return;

    chatbotBtn.addEventListener('click', function() {
      App.ui.showToast('AI Assistant is coming in FYP2! 🚀', 'info');
    });
  }

  return {
    init: init
  };
})();
