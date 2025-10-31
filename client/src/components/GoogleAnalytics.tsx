import { useEffect } from 'react';

export default function GoogleAnalytics() {
  useEffect(() => {
    // Initialize gtag with default consent denied (Google Consent Mode V2)
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    (window as any).gtag = gtag;

    // Set default consent state to denied (GDPR compliant)
    gtag('consent', 'default', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'wait_for_update': 500
    });

    // Initialize gtag
    gtag('js', new Date());
    gtag('config', 'G-8HGMBD1PJJ', {
      'anonymize_ip': true,
      'allow_google_signals': false
    });

    const loadGoogleAnalytics = () => {
      // Check if already loaded
      if (document.querySelector('script[src*="googletagmanager.com/gtag"]')) return;

      // Load Google Analytics script
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-8HGMBD1PJJ';
      document.head.appendChild(script);
    };

    const updateConsent = (granted: boolean) => {
      gtag('consent', 'update', {
        'analytics_storage': granted ? 'granted' : 'denied',
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied'
      });
    };

    // Check initial consent status
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (cookieConsent === 'accepted') {
      loadGoogleAnalytics();
      updateConsent(true);
    } else if (cookieConsent === 'declined') {
      updateConsent(false);
    }

    // Listen for consent changes
    const handleConsentAccepted = () => {
      loadGoogleAnalytics();
      updateConsent(true);
    };

    const handleConsentDeclined = () => {
      updateConsent(false);
    };

    window.addEventListener('cookie-consent-accepted', handleConsentAccepted);
    window.addEventListener('cookie-consent-declined', handleConsentDeclined);

    return () => {
      window.removeEventListener('cookie-consent-accepted', handleConsentAccepted);
      window.removeEventListener('cookie-consent-declined', handleConsentDeclined);
    };
  }, []);

  return null;
}
