
let heicLoadedPromise = null;

export function loadHeic() {
  if (heicLoadedPromise == null) {
    heicLoadedPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.onload = resolve;
      script.onerror = reject;
      script.src = "https://cdn.jsdelivr.net/npm/heic-to@1.3.0/dist/iife/heic-to.js";
      document.head.appendChild(script);
    });
  }
  return heicLoadedPromise;
}
