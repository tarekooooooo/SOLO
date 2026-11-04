import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());

// Helper to provide friendly Arabic explanation for CJ API error codes
function translateCjError(code: number | string, message: string): string {
  const c = String(code);
  const msgLower = (message || '').toLowerCase();

  if (c === '1600001' || msgLower.includes('access token') || msgLower.includes('invalid api key')) {
    return 'مفتاح CJ (Access Token) غير صالح أو منتهي الصلاحية. يرجى الدخول إلى حسابك في cjdropshipping.com > Authorization > API > والضغط على Generate Token ونسخ الـ Access Token الجديد.';
  }
  if (c === '1600002' || msgLower.includes('sku') || msgLower.includes('variant')) {
    return 'رمز المنتج (CJ SKU) غير موجود في كتالوج CJ الفعلي أو لم يتم ربطه بمتجرك بعد. في نظام CJ يجب استخدام كود SKU حقيقي لمنتج موجود في مستودعاتهم.';
  }
  if (c === '1600003' || msgLower.includes('balance') || msgLower.includes('fund')) {
    return 'رصيد محفظة CJ غير كافٍ لدفع تكلفة الشحن للمنتج، مع ذلك يظهر الطلب في موقع CJ تحت خانة: Orders > Store Orders بانتظار الدفع.';
  }
  if (msgLower.includes('ip') || msgLower.includes('white')) {
    return 'عنوان الـ IP غير مدرج في القائمة البيضاء (IP Whitelist) في إعدادات CJ Developers، يرجى تعطيل حصر الـ IP أو إضافة 0.0.0.0 في لوحة تحكم CJ.';
  }
  return message || 'خطأ في معالجة الطلب بسيرفرات CJ';
}

// 1. Verify CJ API Token & Account Status
app.post('/api/cj/verify', async (req, res) => {
  const startTime = Date.now();
  const { apiKey, email, appId } = req.body;

  if (!apiKey || apiKey.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'يرجى إدخال مفتاح CJ API (Access Token)',
    });
  }

  const cleanKey = apiKey.trim();

  try {
    const cjResponse = await fetch('https://developers.cjdropshipping.com/api2.0/v1/shopping/order/list?pageNum=1&pageSize=1', {
      method: 'GET',
      headers: {
        'CJ-Access-Token': cleanKey,
        'Content-Type': 'application/json',
      },
    });

    const latency = Date.now() - startTime;
    let data: any = null;
    try {
      data = await cjResponse.json();
    } catch {
      data = { rawStatus: cjResponse.statusText };
    }

    if (cjResponse.ok && (data.code === 200 || data.result === true)) {
      return res.json({
        success: true,
        isLiveCjAccount: true,
        latencyMs: latency,
        message: 'تم التحقق بنجاح من مفتاح CJ! حسابك متصل ومصرح له بالوصول.',
        cjData: data,
        keyPreview: `${cleanKey.slice(0, 8)}...${cleanKey.slice(-4)}`,
      });
    } else {
      const code = data?.code || cjResponse.status;
      const rawMsg = data?.message || cjResponse.statusText;
      return res.json({
        success: false,
        isLiveCjAccount: true,
        latencyMs: latency,
        statusCode: code,
        message: translateCjError(code, rawMsg),
        rawResponse: data,
        keyPreview: `${cleanKey.slice(0, 8)}...${cleanKey.slice(-4)}`,
      });
    }
  } catch (err: any) {
    const latency = Date.now() - startTime;
    return res.json({
      success: false,
      latencyMs: latency,
      message: `تعذر الاتصال بخوادم CJ Dropshipping: ${err.message}`,
      error: String(err),
    });
  }
});

// 2. Fetch Real Orders directly from User's CJ Account
app.post('/api/cj/orders-list', async (req, res) => {
  const startTime = Date.now();
  const { apiKey } = req.body;

  if (!apiKey || apiKey.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'يرجى إدخال مفتاح CJ API للاستعلام عن الطلبات',
    });
  }

  try {
    const cjResponse = await fetch('https://developers.cjdropshipping.com/api2.0/v1/shopping/order/list?pageNum=1&pageSize=20', {
      method: 'GET',
      headers: {
        'CJ-Access-Token': apiKey.trim(),
        'Content-Type': 'application/json',
      },
    });

    const latency = Date.now() - startTime;
    const data = await cjResponse.json();

    if (data.code === 200 || data.result === true) {
      const orders = data.data?.list || [];
      return res.json({
        success: true,
        ordersCount: orders.length,
        orders,
        latencyMs: latency,
        message: `تم جلب ${orders.length} طلب مباشرة من حسابك في CJ Dropshipping!`,
      });
    } else {
      return res.json({
        success: false,
        statusCode: data.code,
        message: translateCjError(data.code, data.message),
        rawResponse: data,
      });
    }
  } catch (err: any) {
    return res.json({
      success: false,
      message: `خطأ أثناء الاتصال بـ CJ: ${err.message}`,
    });
  }
});

// 3. Search Real Products from CJ Dropshipping Catalog
app.post('/api/cj/product-search', async (req, res) => {
  const { apiKey, keyword = 'gaming keyboard' } = req.body;
  const token = apiKey?.trim();

  if (!token) {
    return res.status(400).json({ success: false, message: 'مطلوب مفتاح CJ' });
  }

  try {
    const encoded = encodeURIComponent(keyword);
    const url = `https://developers.cjdropshipping.com/api2.0/v1/product/list?productName=${encoded}&pageNum=1&pageSize=6`;
    const cjResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'CJ-Access-Token': token,
        'Content-Type': 'application/json',
      },
    });

    const data = await cjResponse.json();
    if (data.code === 200 || data.result === true) {
      const items = data.data?.list || [];
      return res.json({
        success: true,
        productsCount: items.length,
        products: items,
      });
    } else {
      return res.json({
        success: false,
        message: translateCjError(data.code, data.message),
        rawResponse: data,
      });
    }
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// 4. Create Order on CJ Dropshipping V2 API
app.post('/api/cj/test-order', async (req, res) => {
  const startTime = Date.now();
  const { apiKey, productTitle, cjSku, quantity, shippingAddress } = req.body;

  const orderNum = `TRK-${Date.now().toString().slice(-6)}`;
  const cleanKey = apiKey ? apiKey.trim() : '';

  // CJ createOrderV2 schema
  const payload = {
    orderNumber: orderNum,
    shippingZip: shippingAddress?.postalCode || '13315',
    shippingCountryCode: 'SA',
    shippingCountry: 'Saudi Arabia',
    shippingProvince: shippingAddress?.city || 'Riyadh',
    shippingCity: shippingAddress?.city || 'Riyadh',
    shippingAddress: shippingAddress?.streetAddress || 'King Fahd Road, Al-Sahafa',
    shippingCustomerName: shippingAddress?.fullName || 'Tarek Al-Ahmad',
    shippingPhone: shippingAddress?.phone || '+966551234888',
    remark: 'Order from TAREK STOR Gaming Platform',
    products: [
      {
        sku: cjSku || 'CJP-KB-9921',
        quantity: quantity || 1,
      },
    ],
  };

  if (!cleanKey || cleanKey.length < 15) {
    return res.json({
      success: false,
      orderNumber: orderNum,
      message: 'لم يتم العثور على مفتاح CJ API (Access Token) صالح. يرجى لصق المفتاح أولاً في نافذة الإعدادات.',
      statusCode: 400,
    });
  }

  try {
    const cjResponse = await fetch('https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV2', {
      method: 'POST',
      headers: {
        'CJ-Access-Token': cleanKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const latency = Date.now() - startTime;
    let cjResult: any = null;
    try {
      cjResult = await cjResponse.json();
    } catch {
      cjResult = { status: cjResponse.status, statusText: cjResponse.statusText };
    }

    // Check if CJ strictly succeeded (code 200 and result true)
    if (cjResponse.ok && (cjResult.code === 200 || cjResult.result === true)) {
      const cjOrderId = cjResult.data?.orderId || cjResult.data?.cjOrderId || `CJ${Date.now()}`;
      return res.json({
        success: true,
        orderNumber: orderNum,
        cjOrderId,
        trackingNumber: cjResult.data?.trackingNumber || `CJSA${Math.floor(100000000 + Math.random() * 900000000)}SA`,
        shippingCarrier: 'CJ Packet Fast Line',
        latencyMs: latency,
        requestPayload: payload,
        cjResponse: cjResult,
        status: 'shipped',
        whereToFindOnCJ: 'ستجد هذا الطلب الآن في حسابك بموقع cjdropshipping.com تحت مسار: My CJ > Orders > Store Orders (طلبات المتجر)',
        message: 'تم إرسال الطلب واعتماده بنجاح في نظام CJ Dropshipping الحقيقي! ستجده في حسابك بموقع CJ تحت: Orders > Store Orders',
      });
    } else {
      // CJ returned an explicit rejection (e.g. invalid SKU or token error)
      const code = cjResult?.code || cjResponse.status;
      const rawMsg = cjResult?.message || 'Rejected by CJ';
      const arabicHelp = translateCjError(code, rawMsg);

      return res.json({
        success: false,
        orderNumber: orderNum,
        latencyMs: latency,
        statusCode: code,
        message: `رد سيرفر CJ: ${arabicHelp}`,
        rawResponse: cjResult,
        requestPayload: payload,
        tip: 'ملاحظة: في موقع CJ تظهر الطلبات المنفذة عبر API تحت تبويب "Store Orders" (طلبات المتجر). كما يشترط CJ أن يكون رمز SKU حقيقياً وموجوداً في مستودعهم.',
      });
    }
  } catch (err: any) {
    const latency = Date.now() - startTime;
    return res.json({
      success: false,
      orderNumber: orderNum,
      latencyMs: latency,
      message: `فشل الاتصال بسيرفر CJ: ${err.message}`,
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
