import { useEffect } from 'react';

export default function GoogleAnalytics() {
  useEffect(() => {
    const loadGoogleAnalytics = () => {
      // Check if already loaded
      if ((window as any).gtag) return;

      // Load Google Analytics script
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-8HGMBD1PJJ';
      document.head.appendChild(script);

      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      function gtag(...args: any[]) {
        window.dataLayer.push(args);
      }
      gtag('js', new Date());
      gtag('config', 'G-8HGMBD1PJJ');

      // Make gtag available globally
      (window as any).gtag = gtag;
    };

    // Check initial consent status
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (cookieConsent === 'accepted') {
      loadGoogleAnalytics();
    }

    // Listen for consent changes
    const handleConsentAccepted = () => {
      loadGoogleAnalytics();
    };

    window.addEventListener('cookie-consent-accepted', handleConsentAccepted);

    return () => {
      window.removeEventListener('cookie-consent-accepted', handleConsentAccepted);
    };
  }, []);

  return null;
}
