// Lance les modules de mouvement une fois tous les scripts chargés et les polices prêtes.
(() => {
  const D = window.DIO;
  if (!D || !D.ok) return;
  const go = () => D.start();
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go, go);
})();
