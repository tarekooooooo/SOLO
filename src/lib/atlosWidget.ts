export interface AtlosPayOptions {
  merchantId: string;
  orderId: string;
  orderAmount: number;
  orderCurrency: 'USD';
  postbackUrl?: string;
  userName?: string;
  userEmail?: string;
  noBuyCrypto?: boolean;
  onSuccess?: () => void;
  onCanceled?: () => void;
  onCompleted?: () => void;
  language?: string;
  theme?: 'light' | 'dark';
}

interface AtlosWidget {
  Pay: (options: AtlosPayOptions) => void;
}

declare global {
  interface Window {
    atlos?: AtlosWidget;
  }
}

let widgetPromise: Promise<AtlosWidget> | null = null;

export function loadAtlosWidget(): Promise<AtlosWidget> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('ATLOS widget is available only in a browser.'));
  }
  if (window.atlos?.Pay) return Promise.resolve(window.atlos);
  if (widgetPromise) return widgetPromise;

  widgetPromise = new Promise<AtlosWidget>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://atlos.io/packages/app/atlos.js';
    script.async = true;
    script.onload = () => {
      if (window.atlos?.Pay) resolve(window.atlos);
      else reject(new Error('ATLOS widget loaded without the Pay method.'));
    };
    script.onerror = () => reject(new Error('Could not load the ATLOS payment widget.'));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    widgetPromise = null;
    throw error;
  });

  return widgetPromise;
}
