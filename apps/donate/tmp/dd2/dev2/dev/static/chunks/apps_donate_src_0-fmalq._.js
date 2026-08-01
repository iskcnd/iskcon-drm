(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/donate/src/lib/i18n.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** UI strings for the donation page. Category/campaign content comes from the
 *  database (name_i18n etc.); these are the fixed chrome strings.
 *  Tamil/Hindi drafted by Claude — needs native review before launch (D25). */ __turbopack_context__.s([
    "I18N",
    ()=>I18N
]);
const I18N = {
    en: {
        tagline: 'Hare Krishna Movement',
        heroverse: 'patraṁ puṣpaṁ phalaṁ toyam…',
        herotitle: 'Whatever you offer with love, Krishna accepts.',
        herosub: 'Your seva lights the lamps, dresses the Deities, and feeds every soul who walks into His home. Not one rupee sits idle — it becomes prasadam, garlands, and grace.',
        herocta: 'Offer Your Seva ↓',
        livecampaign: '🪔 Live Campaign',
        raised: 'raised of',
        donors: 'devotees joined',
        daysleft: 'days to go',
        campcta: 'Be Part of It',
        choosetitle: 'Choose Your Seva',
        choosesub: 'Every offering, small or large, reaches His altar.',
        t80g: '80G Tax Benefit',
        tsecure: 'Bank-grade Secure',
        treceipt: 'Instant Receipt',
        tdirect: 'Directly to Temple',
        gitatr: '"Charity given out of duty, at the right place and time, to a worthy person, without expectation of return — that charity is in the mode of goodness."',
        foot80g: 'Donations are eligible for deduction under Section 80G of the Income Tax Act. Form 10BE is issued as per Income-tax rules.',
        footind: '🇮🇳 We currently accept donations from within India only.',
        stickybtn: '🪔 Offer Seva Now',
        continue: 'Continue →',
        customph: 'Any amount from the heart',
        sevadate: 'Seva date — birthday, anniversary, or any special day',
        sevadatehint: 'We will perform this seva and offer prayers in your name on this day.',
        monthlytxt: 'Make this my monthly Nitya Seva. A small seva every month keeps a lamp burning in your name, every single day.',
        phoneline: 'Let us know who this offering is from, so the blessings reach the right name.',
        mobile: 'Mobile number',
        mobilehint: "Donated before? Enter your number — we'll fill everything for you.",
        welcomeback: '🙏 Welcome back',
        whoisthis: 'This number is in our records. Who is offering seva today?',
        someonenew: "I'm someone new — enter my details",
        fullname: 'Full name',
        fullnameph: 'Full legal name, as on your receipt',
        email: 'Email',
        addrlabel: 'Address (for your receipt & Form 10BE)',
        addrph: 'House / street / area',
        pinlabel: 'PIN code',
        panlabel: 'PAN (optional below ₹50,000)',
        pannudge: '💡 Add your PAN to receive <b>Form 10BE (80G tax benefit)</b>. Required for donations of ₹50,000 or more.',
        wapptxt: 'Send my receipt and Form 10BE on WhatsApp, with darshan updates',
        prasadamtxt: 'I wish to receive prasadam at this address as a blessing',
        topay: 'Proceed to Offering →',
        youroffering: 'Your offering',
        sevadateshort: 'Seva date',
        permonth: '/ month',
        payuname: 'Pay securely with PayU',
        payusub: 'UPI · Cards · Netbanking · Wallets',
        failsafe: 'If PayU is ever unavailable, we switch you to Razorpay or Easebuzz automatically — your seva never fails.',
        backup: 'Automatic backup',
        secureline: '🔒 256-bit encrypted · PCI-DSS compliant · acknowledgement receipt issued instantly',
        offer: 'Offer',
        close: 'Close',
        addressneeded: 'One small step — we need your address for the receipt.',
        paybusy: 'Preparing your offering…',
        payfailed: 'That payment did not go through. Trying the next secure option…'
    },
    ta: {
        tagline: 'ஹரே கிருஷ்ணா இயக்கம்',
        heroverse: 'பத்ரம் புஷ்பம் பலம் தோயம்…',
        herotitle: 'அன்புடன் அளிப்பதை எல்லாம் கிருஷ்ணர் ஏற்கிறார்.',
        herosub: 'உங்கள் சேவை தீபங்களை ஏற்றுகிறது, பகவானை அலங்கரிக்கிறது, அவர் இல்லத்திற்கு வரும் ஒவ்வொருவருக்கும் உணவளிக்கிறது. ஒரு ரூபாய் கூட வீணாவதில்லை — அது பிரசாதமாகவும், மாலையாகவும், அருளாகவும் மாறுகிறது.',
        herocta: 'உங்கள் சேவையை அளியுங்கள் ↓',
        livecampaign: '🪔 நடப்பு இயக்கம்',
        raised: 'திரட்டப்பட்டது /',
        donors: 'பக்தர்கள் இணைந்துள்ளனர்',
        daysleft: 'நாட்கள் உள்ளன',
        campcta: 'இதில் பங்கேற்க',
        choosetitle: 'உங்கள் சேவையைத் தேர்வு செய்யுங்கள்',
        choosesub: 'சிறிய பெரிய எந்த காணிக்கையும் அவரது திருமுன் சேரும்.',
        t80g: '80G வரி சலுகை',
        tsecure: 'பாதுகாப்பான பரிவர்த்தனை',
        treceipt: 'உடனடி ரசீது',
        tdirect: 'நேரடியாக ஆலயத்திற்கு',
        gitatr: '"தக்க இடத்தில், தக்க நேரத்தில், தகுதியானவருக்கு, பிரதிபலன் எதிர்பாராமல் கடமையாக செய்யப்படும் தானமே சாத்வீக தானம்."',
        foot80g: 'நன்கொடைகள் வருமான வரிச் சட்டம் பிரிவு 80G-இன் கீழ் வரி விலக்கு பெறத் தகுதியானவை. படிவம் 10BE வருமான வரி விதிகளின்படி வழங்கப்படும்.',
        footind: '🇮🇳 தற்போது இந்தியாவிற்குள் இருந்து மட்டுமே நன்கொடைகள் ஏற்கப்படுகின்றன.',
        stickybtn: '🪔 இப்போது சேவை அளியுங்கள்',
        continue: 'தொடரவும் →',
        customph: 'மனதிலிருந்து எந்த தொகையும்',
        sevadate: 'சேவை நாள் — பிறந்தநாள், திருமண நாள், அல்லது சிறப்பு நாள்',
        sevadatehint: 'இந்த நாளில் உங்கள் பெயரில் சேவையும் பிரார்த்தனையும் செய்யப்படும்.',
        monthlytxt: 'இதை எனது மாதாந்திர நித்ய சேவையாக்குங்கள். மாதம் ஒரு சிறு சேவை — தினமும் உங்கள் பெயரில் ஒரு தீபம்.',
        phoneline: 'இந்த காணிக்கை யாரிடமிருந்து என்பதை தெரிவியுங்கள் — ஆசீர்வாதம் சரியான பெயரை சேரட்டும்.',
        mobile: 'கைபேசி எண்',
        mobilehint: 'முன்பு நன்கொடை அளித்துள்ளீர்களா? எண்ணை உள்ளிடுங்கள் — மற்றதை நாங்கள் நிரப்புகிறோம்.',
        welcomeback: '🙏 மீண்டும் வருக',
        whoisthis: 'இந்த எண் எங்கள் பதிவுகளில் உள்ளது. இன்று யார் சேவை அளிக்கிறார்?',
        someonenew: 'நான் புதியவர் — என் விவரங்களை உள்ளிடுகிறேன்',
        fullname: 'முழு பெயர்',
        fullnameph: 'ரசீதில் வர வேண்டிய முழு சட்டப்பூர்வ பெயர்',
        email: 'மின்னஞ்சல்',
        addrlabel: 'முகவரி (ரசீது & படிவம் 10BE-க்கு)',
        addrph: 'வீடு / தெரு / பகுதி',
        pinlabel: 'PIN குறியீடு',
        panlabel: 'PAN (₹50,000-க்கு கீழ் விருப்பம்)',
        pannudge: '💡 படிவம் 10BE (80G வரி சலுகை) பெற PAN சேர்க்கவும். ₹50,000 அல்லது அதற்கு மேல் கட்டாயம்.',
        wapptxt: 'ரசீதும் படிவம் 10BE-யும் வாட்ஸ்அப்பில் அனுப்பவும்',
        prasadamtxt: 'இந்த முகவரிக்கு பிரசாதம் பெற விரும்புகிறேன்',
        topay: 'காணிக்கைக்கு செல்லவும் →',
        youroffering: 'உங்கள் காணிக்கை',
        sevadateshort: 'சேவை நாள்',
        permonth: '/ மாதம்',
        payuname: 'PayU மூலம் பாதுகாப்பாக செலுத்துங்கள்',
        payusub: 'UPI · கார்டுகள் · நெட்பேங்கிங்',
        failsafe: 'PayU கிடைக்காவிட்டால், தானாக Razorpay அல்லது Easebuzz-க்கு மாற்றுவோம் — உங்கள் சேவை தடைபடாது.',
        backup: 'தானியங்கி மாற்று',
        secureline: '🔒 256-bit குறியாக்கம் · உடனடி ஒப்புகை ரசீது',
        offer: 'அளியுங்கள்',
        close: 'மூடு',
        addressneeded: 'ஒரு சிறு படி — ரசீதுக்கு உங்கள் முகவரி தேவை.',
        paybusy: 'உங்கள் காணிக்கை தயாராகிறது…',
        payfailed: 'அந்த கட்டணம் நிறைவேறவில்லை. அடுத்த பாதுகாப்பான வழியை முயற்சிக்கிறோம்…'
    },
    hi: {
        tagline: 'हरे कृष्ण आंदोलन',
        heroverse: 'पत्रं पुष्पं फलं तोयम्…',
        herotitle: 'प्रेम से अर्पित हर वस्तु कृष्ण स्वीकार करते हैं।',
        herosub: 'आपकी सेवा दीप जलाती है, विग्रहों का श्रृंगार करती है, और उनके घर आने वाली हर आत्मा को भोजन कराती है। एक भी रुपया व्यर्थ नहीं जाता — वह प्रसादम्, माला और कृपा बन जाता है।',
        herocta: 'अपनी सेवा अर्पित करें ↓',
        livecampaign: '🪔 चालू अभियान',
        raised: 'एकत्रित /',
        donors: 'भक्त जुड़े',
        daysleft: 'दिन शेष',
        campcta: 'इसका हिस्सा बनें',
        choosetitle: 'अपनी सेवा चुनें',
        choosesub: 'छोटी हो या बड़ी, हर भेंट उनके चरणों तक पहुँचती है।',
        t80g: '80G कर लाभ',
        tsecure: 'पूर्ण सुरक्षित',
        treceipt: 'तुरंत रसीद',
        tdirect: 'सीधे मंदिर को',
        gitatr: '"उचित स्थान, उचित समय और सुपात्र को, बिना प्रतिफल की आशा के, कर्तव्य समझकर दिया गया दान सात्त्विक दान कहलाता है।"',
        foot80g: 'दान आयकर अधिनियम की धारा 80G के अंतर्गत कर-कटौती योग्य हैं। फॉर्म 10BE आयकर नियमों के अनुसार जारी होता है।',
        footind: '🇮🇳 वर्तमान में केवल भारत के भीतर से दान स्वीकार किए जाते हैं।',
        stickybtn: '🪔 अभी सेवा अर्पित करें',
        continue: 'आगे बढ़ें →',
        customph: 'हृदय से कोई भी राशि',
        sevadate: 'सेवा तिथि — जन्मदिन, सालगिरह या कोई विशेष दिन',
        sevadatehint: 'इस दिन आपके नाम से सेवा और प्रार्थना की जाएगी।',
        monthlytxt: 'इसे मेरी मासिक नित्य सेवा बनाएं। हर माह की छोटी सेवा — हर दिन आपके नाम का दीपक।',
        phoneline: 'बताएं यह भेंट किसकी ओर से है, ताकि आशीर्वाद सही नाम तक पहुँचे।',
        mobile: 'मोबाइल नंबर',
        mobilehint: 'पहले दान किया है? नंबर डालें — बाकी हम भर देंगे।',
        welcomeback: '🙏 पुनः स्वागत है',
        whoisthis: 'यह नंबर हमारे रिकॉर्ड में है। आज कौन सेवा अर्पित कर रहा है?',
        someonenew: 'मैं नया हूँ — मेरा विवरण भरूँगा',
        fullname: 'पूरा नाम',
        fullnameph: 'रसीद हेतु पूरा वैधानिक नाम',
        email: 'ईमेल',
        addrlabel: 'पता (रसीद व फॉर्म 10BE हेतु)',
        addrph: 'मकान / गली / क्षेत्र',
        pinlabel: 'PIN कोड',
        panlabel: 'PAN (₹50,000 से कम पर वैकल्पिक)',
        pannudge: '💡 फॉर्म 10BE (80G कर लाभ) हेतु PAN जोड़ें। ₹50,000 या अधिक के दान पर अनिवार्य।',
        wapptxt: 'रसीद और फॉर्म 10BE WhatsApp पर भेजें',
        prasadamtxt: 'मैं इस पते पर प्रसादम् प्राप्त करना चाहता/चाहती हूँ',
        topay: 'भेंट की ओर बढ़ें →',
        youroffering: 'आपकी भेंट',
        sevadateshort: 'सेवा तिथि',
        permonth: '/ माह',
        payuname: 'PayU से सुरक्षित भुगतान करें',
        payusub: 'UPI · कार्ड · नेटबैंकिंग',
        failsafe: 'यदि PayU उपलब्ध न हो, हम स्वतः Razorpay या Easebuzz पर ले जाएंगे — आपकी सेवा कभी नहीं रुकेगी।',
        backup: 'स्वचालित विकल्प',
        secureline: '🔒 256-bit एन्क्रिप्टेड · तुरंत पावती रसीद',
        offer: 'अर्पित करें',
        close: 'बंद करें',
        addressneeded: 'एक छोटा कदम — रसीद के लिए आपका पता चाहिए।',
        paybusy: 'आपकी भेंट तैयार हो रही है…',
        payfailed: 'वह भुगतान पूरा नहीं हुआ। अगला सुरक्षित विकल्प आज़मा रहे हैं…'
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/donate/src/lib/launch.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "launchPayment",
    ()=>launchPayment,
    "retryNextGateway",
    ()=>retryNextGateway
]);
'use client';
function launchPayment(res, { onRazorpayDone, onRazorpayFail } = {}) {
    const p = res.payment;
    if (!p) throw new Error('No payment payload');
    if (p.method === 'redirect') {
        window.location.assign(p.url);
        return;
    }
    if (p.method === 'POST') {
        // PayU hosted checkout: build and submit a real form.
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = p.action;
        Object.entries(p.fields).forEach(([k, v])=>{
            const i = document.createElement('input');
            i.type = 'hidden';
            i.name = k;
            i.value = v;
            form.appendChild(i);
        });
        document.body.appendChild(form);
        form.submit();
        return;
    }
    if (p.method === 'checkout-js') {
        loadRazorpay().then(()=>{
            const rzp = new window.Razorpay({
                key: p.keyId,
                order_id: p.orderId,
                amount: p.amount,
                currency: p.currency,
                name: 'ISKCON Chennai',
                description: 'Seva Offering',
                prefill: p.prefill,
                theme: {
                    color: '#571617'
                },
                handler: async (r)=>{
                    const v = await fetch('/api/payments/razorpay/verify', {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json'
                        },
                        body: JSON.stringify({
                            orderRef: res.orderRef,
                            ...r
                        })
                    }).then((x)=>x.json());
                    if (v.ok && v.status === 'paid') {
                        window.location.assign(`/thank-you?status=success&receipt=${encodeURIComponent(v.receiptNo)}&t=${v.receiptToken}`);
                    } else if (onRazorpayFail) onRazorpayFail();
                },
                modal: {
                    ondismiss: async ()=>{
                        await fetch('/api/payments/razorpay/verify', {
                            method: 'POST',
                            headers: {
                                'content-type': 'application/json'
                            },
                            body: JSON.stringify({
                                orderRef: res.orderRef,
                                failed: true
                            })
                        }).catch(()=>{});
                        if (onRazorpayFail) onRazorpayFail();
                    }
                }
            });
            rzp.open();
            if (onRazorpayDone) onRazorpayDone();
        });
    }
}
function loadRazorpay() {
    return new Promise((resolve, reject)=>{
        if (window.Razorpay) return resolve();
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}
async function retryNextGateway(donationId, failedGateway, hooks) {
    const r = await fetch(`/api/donations/${donationId}/retry`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            failedGateway
        })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'No fallback available');
    launchPayment(data, {
        ...hooks,
        onRazorpayFail: ()=>retryNextGateway(donationId, data.gateway, hooks).catch(()=>{
                window.location.assign(`/thank-you?status=failed&donation=${donationId}&gateway=${data.gateway}&final=1`);
            })
    });
    return data;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/donate/src/app/DonateClient.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DonateClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$i18n$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/donate/src/lib/i18n.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$launch$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/donate/src/lib/launch.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
const fmt = (n)=>'₹' + Number(n).toLocaleString('en-IN');
function Mandala({ className }) {
    const petals = [];
    for(let i = 0; i < 12; i++){
        const a = i * 30;
        petals.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M100 26 C113 50 113 68 100 84 C87 68 87 50 100 26Z",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.4",
            transform: `rotate(${a} 100 100)`
        }, 'a' + i, false, {
            fileName: "[project]/apps/donate/src/app/DonateClient.js",
            lineNumber: 12,
            columnNumber: 17
        }, this));
        petals.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M100 42 C107 56 107 66 100 76 C93 66 93 56 100 42Z",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: ".9",
            transform: `rotate(${a + 15} 100 100)`
        }, 'b' + i, false, {
            fileName: "[project]/apps/donate/src/app/DonateClient.js",
            lineNumber: 13,
            columnNumber: 17
        }, this));
        petals.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
            cx: "100",
            cy: "18",
            r: "2.4",
            fill: "currentColor",
            transform: `rotate(${a + 15} 100 100)`
        }, 'c' + i, false, {
            fileName: "[project]/apps/donate/src/app/DonateClient.js",
            lineNumber: 14,
            columnNumber: 17
        }, this));
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: className,
        "aria-hidden": "true",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            viewBox: "0 0 200 200",
            children: [
                petals,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                    cx: "100",
                    cy: "100",
                    r: "14",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "1.4"
                }, void 0, false, {
                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                    lineNumber: 19,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                    cx: "100",
                    cy: "100",
                    r: "7",
                    fill: "currentColor",
                    opacity: ".45"
                }, void 0, false, {
                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                    lineNumber: 20,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                    cx: "100",
                    cy: "100",
                    r: "60",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: ".8"
                }, void 0, false, {
                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                    lineNumber: 21,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                    cx: "100",
                    cy: "100",
                    r: "78",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: ".8",
                    strokeDasharray: "3 6"
                }, void 0, false, {
                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                    lineNumber: 22,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                    cx: "100",
                    cy: "100",
                    r: "94",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "1.4",
                    strokeDasharray: "1 7",
                    strokeLinecap: "round"
                }, void 0, false, {
                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                    lineNumber: 23,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/donate/src/app/DonateClient.js",
            lineNumber: 18,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/donate/src/app/DonateClient.js",
        lineNumber: 17,
        columnNumber: 5
    }, this);
}
_c = Mandala;
const Feather = (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        viewBox: "0 0 60 110",
        "aria-hidden": "true",
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M30 108 C30 70 30 55 30 42",
                stroke: "#7A5D10",
                strokeWidth: "2",
                fill: "none"
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                lineNumber: 31,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                cx: "30",
                cy: "30",
                rx: "17",
                ry: "24",
                fill: "#2E6E63"
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                lineNumber: 32,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                cx: "30",
                cy: "32",
                rx: "11",
                ry: "16",
                fill: "#C9A227"
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                lineNumber: 32,
                columnNumber: 63
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                cx: "30",
                cy: "34",
                rx: "6.5",
                ry: "10",
                fill: "#174D63"
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                lineNumber: 33,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: "30",
                cy: "35",
                r: "3",
                fill: "#571617"
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                lineNumber: 33,
                columnNumber: 64
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/apps/donate/src/app/DonateClient.js",
        lineNumber: 30,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c1 = Feather;
function DonateClient({ categories, campaigns, videoId }) {
    _s();
    const [lang, setLang] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('en');
    const t = (k)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$i18n$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["I18N"][lang] && __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$i18n$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["I18N"][lang][k] || __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$i18n$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["I18N"].en[k] || k;
    const tr = (obj)=>obj && (obj[lang] || obj.en) || '';
    const [sel, setSel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null); // {kind:'category'|'campaign', item}
    const [step, setStep] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(1);
    const [amount, setAmount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [custom, setCustom] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [sevaDate, setSevaDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [monthly, setMonthly] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [phone, setPhone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [people, setPeople] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [personId, setPersonId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        name: '',
        email: '',
        addressLine: '',
        pincode: '',
        pan: '',
        whatsappOptin: true,
        prasadam: false
    });
    const [needsAddressOnly, setNeedsAddressOnly] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [busy, setBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const sheetRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const lastFocus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const pbar = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DonateClient.useEffect": ()=>{
            document.documentElement.lang = lang;
        }
    }["DonateClient.useEffect"], [
        lang
    ]);
    // campaign progress animation
    const camp = campaigns[0];
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DonateClient.useEffect": ()=>{
            if (!camp || !pbar.current) return;
            const pct = camp.goal_amount ? Math.min(100, camp.raised / camp.goal_amount * 100) : 0;
            const el = pbar.current;
            const io = new IntersectionObserver({
                "DonateClient.useEffect": (e, o)=>{
                    if (e[0].isIntersecting) {
                        el.style.width = pct + '%';
                        o.disconnect();
                    }
                }
            }["DonateClient.useEffect"]);
            io.observe(el);
            return ({
                "DonateClient.useEffect": ()=>io.disconnect()
            })["DonateClient.useEffect"];
        }
    }["DonateClient.useEffect"], [
        camp
    ]);
    const presets = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "DonateClient.useMemo[presets]": ()=>sel ? sel.item.presets || [] : []
    }["DonateClient.useMemo[presets]"], [
        sel
    ]);
    const isMonthlyCat = sel?.kind === 'category' && sel.item.kind === 'monthly';
    const isDatedCat = sel?.kind === 'category' && sel.item.kind === 'dated';
    function openSheet(kind, item) {
        lastFocus.current = document.activeElement;
        setSel({
            kind,
            item
        });
        const p = item.presets || [];
        setAmount(p[1]?.amount || p[0]?.amount || item.min_amount || 501);
        setCustom('');
        setStep(1);
        setError('');
        setPeople(null);
        setPersonId(null);
        setNeedsAddressOnly(false);
        setPhone('');
        setTimeout(()=>sheetRef.current?.focus(), 60);
    }
    function closeSheet() {
        setSel(null);
        lastFocus.current?.focus?.();
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DonateClient.useEffect": ()=>{
            const onKey = {
                "DonateClient.useEffect.onKey": (e)=>{
                    if (!sel) return;
                    if (e.key === 'Escape') closeSheet();
                    if (e.key === 'Tab' && sheetRef.current) {
                        const f = [
                            ...sheetRef.current.querySelectorAll('button,[href],input,select')
                        ].filter({
                            "DonateClient.useEffect.onKey.f": (el)=>el.offsetParent !== null
                        }["DonateClient.useEffect.onKey.f"]);
                        if (!f.length) return;
                        const first = f[0], last = f[f.length - 1];
                        if (e.shiftKey && document.activeElement === first) {
                            last.focus();
                            e.preventDefault();
                        } else if (!e.shiftKey && document.activeElement === last) {
                            first.focus();
                            e.preventDefault();
                        }
                    }
                }
            }["DonateClient.useEffect.onKey"];
            document.addEventListener('keydown', onKey);
            return ({
                "DonateClient.useEffect": ()=>document.removeEventListener('keydown', onKey)
            })["DonateClient.useEffect"];
        }
    }["DonateClient.useEffect"], [
        sel
    ]);
    async function lookup(v) {
        setPhone(v);
        const digits = v.replace(/\D/g, '');
        setPeople(null);
        setPersonId(null);
        if (digits.length === 10) {
            try {
                const r = await fetch('/api/lookup', {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        mobile: digits
                    })
                });
                const d = await r.json();
                if (r.ok && d.people?.length) setPeople(d.people);
            } catch  {}
        }
    }
    async function submitDonation() {
        setBusy(true);
        setError('');
        const digits = phone.replace(/\D/g, '');
        const body = {
            categorySlug: sel.kind === 'category' ? sel.item.slug : null,
            campaignSlug: sel.kind === 'campaign' ? sel.item.slug : null,
            amount,
            sevaDate: isDatedCat ? sevaDate || null : null,
            isRecurring: isMonthlyCat && monthly,
            prasadam: form.prasadam,
            personId,
            newPerson: personId ? needsAddressOnly ? {
                addressLine: form.addressLine,
                pincode: form.pincode,
                pan: form.pan || null
            } : null : {
                name: form.name,
                mobile: digits,
                email: form.email || null,
                pan: form.pan || null,
                whatsappOptin: form.whatsappOptin,
                addressLine: form.addressLine,
                pincode: form.pincode
            }
        };
        try {
            const r = await fetch('/api/donations', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const data = await r.json();
            if (!r.ok) {
                if (/address/i.test(data.error || '')) {
                    setNeedsAddressOnly(true);
                    setStep(2);
                    setError(t('addressneeded'));
                } else setError(data.error || 'Something went wrong. Nothing was charged.');
                setBusy(false);
                return;
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$launch$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["launchPayment"])(data, {
                onRazorpayDone: ()=>setBusy(false),
                onRazorpayFail: ()=>{
                    setError(t('payfailed'));
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$launch$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["retryNextGateway"])(data.donationId, data.gateway).catch(()=>window.location.assign(`/thank-you?status=failed&donation=${data.donationId}&final=1`));
                }
            });
        } catch  {
            setError('Network error. Nothing was charged — please try again.');
            setBusy(false);
        }
    }
    const chosenImpact = presets.find((p)=>p.amount === amount);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Mandala, {
                className: "mandala mandala-tl"
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                lineNumber: 158,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Mandala, {
                className: "mandala mandala-br"
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                lineNumber: 158,
                columnNumber: 49
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Mandala, {
                className: "mandala mandala-ml"
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                lineNumber: 159,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Mandala, {
                className: "mandala mandala-mr"
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                lineNumber: 159,
                columnNumber: 49
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "page",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                        className: "site",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "h-inner",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "crest",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                        src: "/logo.png",
                                        alt: "ISKCON Chennai lotus emblem"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                        lineNumber: 164,
                                        columnNumber: 36
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                    lineNumber: 164,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "brand",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                            children: "ISKCON Chennai"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 165,
                                            columnNumber: 36
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: t('tagline')
                                        }, void 0, false, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 165,
                                            columnNumber: 57
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                    lineNumber: 165,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                                    className: "lang",
                                    "aria-label": "Language",
                                    children: [
                                        'en',
                                        'ta',
                                        'hi'
                                    ].map((l)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            lang: l,
                                            "aria-pressed": lang === l,
                                            onClick: ()=>setLang(l),
                                            children: l === 'en' ? 'EN' : l === 'ta' ? 'தமிழ்' : 'हिंदी'
                                        }, l, false, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 168,
                                            columnNumber: 17
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                    lineNumber: 166,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                            lineNumber: 163,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                        lineNumber: 162,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hero",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "video-ph",
                                        role: "img",
                                        "aria-label": "Darshan at ISKCON Chennai"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                        lineNumber: 178,
                                        columnNumber: 13
                                    }, this),
                                    videoId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("iframe", {
                                        className: "hero-video",
                                        title: "ISKCON Chennai darshan video",
                                        tabIndex: -1,
                                        "aria-hidden": "true",
                                        src: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&playsinline=1&rel=0&modestbranding=1`,
                                        allow: "autoplay; encrypted-media"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                        lineNumber: 180,
                                        columnNumber: 15
                                    }, this) : null,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "hero-txt",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "verse",
                                                lang: "sa",
                                                children: t('heroverse')
                                            }, void 0, false, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 185,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                children: t('herotitle')
                                            }, void 0, false, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 186,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                children: t('herosub')
                                            }, void 0, false, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 187,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "#sevas",
                                                className: "btn-gold",
                                                children: t('herocta')
                                            }, void 0, false, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 188,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                        lineNumber: 184,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                lineNumber: 177,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "garland",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                lineNumber: 192,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "content",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "divider",
                                        "aria-hidden": "true",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Feather, {}, void 0, false, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 195,
                                            columnNumber: 57
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                        lineNumber: 195,
                                        columnNumber: 13
                                    }, this),
                                    camp ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "section",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "campaign",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Feather, {
                                                    className: "corner-feather"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 200,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "badge",
                                                    children: t('livecampaign')
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 201,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    children: tr(camp.title_i18n)
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 202,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "c-line",
                                                    children: tr(camp.line_i18n)
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 203,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "progress-wrap",
                                                    role: "progressbar",
                                                    "aria-valuenow": camp.goal_amount ? Math.round(camp.raised / camp.goal_amount * 100) : 0,
                                                    "aria-valuemin": 0,
                                                    "aria-valuemax": 100,
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "progress-bar",
                                                        ref: pbar
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                        lineNumber: 205,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 204,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "c-stats",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                    children: fmt(camp.raised)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 208,
                                                                    columnNumber: 26
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    children: [
                                                                        t('raised'),
                                                                        " ",
                                                                        fmt(camp.goal_amount)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 208,
                                                                    columnNumber: 51
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 208,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                textAlign: 'center'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                    children: camp.donors.toLocaleString('en-IN')
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 209,
                                                                    columnNumber: 58
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    children: t('donors')
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 209,
                                                                    columnNumber: 102
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 209,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                textAlign: 'right'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                    children: camp.ends_on ? Math.max(0, Math.ceil((new Date(camp.ends_on) - Date.now()) / 86400000)) : '—'
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 210,
                                                                    columnNumber: 57
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    children: t('daysleft')
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 210,
                                                                    columnNumber: 159
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 210,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 207,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    className: "btn-gold",
                                                    onClick: ()=>openSheet('campaign', camp),
                                                    children: t('campcta')
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 212,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 199,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                        lineNumber: 198,
                                        columnNumber: 15
                                    }, this) : null,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "section",
                                        id: "sevas",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "sec-title",
                                                children: t('choosetitle')
                                            }, void 0, false, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 218,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "sec-sub",
                                                children: t('choosesub')
                                            }, void 0, false, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 219,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "flute-motif",
                                                viewBox: "0 0 200 40",
                                                "aria-hidden": "true",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                                        x: "8",
                                                        y: "16",
                                                        width: "184",
                                                        height: "9",
                                                        rx: "4.5",
                                                        fill: "#C9A227"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                        lineNumber: 221,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                                        x: "8",
                                                        y: "16",
                                                        width: "184",
                                                        height: "4",
                                                        rx: "2",
                                                        fill: "#E7BE45"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                        lineNumber: 221,
                                                        columnNumber: 85
                                                    }, this),
                                                    [
                                                        60,
                                                        78,
                                                        96,
                                                        114,
                                                        132,
                                                        150
                                                    ].map((cx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                                            cx: cx,
                                                            cy: "20.5",
                                                            r: "2.2",
                                                            fill: "#571617"
                                                        }, cx, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 222,
                                                            columnNumber: 58
                                                        }, this))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 220,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                        lineNumber: 217,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "seva-wrap",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Mandala, {
                                                className: "cats-mandala"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 227,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "cats",
                                                children: categories.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        className: "cat",
                                                        onClick: ()=>openSheet('category', c),
                                                        children: [
                                                            c.tag ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "tagpill",
                                                                children: c.tag
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                lineNumber: 231,
                                                                columnNumber: 30
                                                            }, this) : null,
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "arch",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "icon",
                                                                    "aria-hidden": "true",
                                                                    children: c.icon
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 232,
                                                                    columnNumber: 44
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                lineNumber: 232,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                                children: tr(c.name_i18n) || c.slug
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                lineNumber: 233,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                children: tr(c.line_i18n)
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                lineNumber: 234,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "from",
                                                                children: [
                                                                    t('offer'),
                                                                    " ",
                                                                    fmt(c.presets?.[0]?.amount || c.min_amount),
                                                                    "+"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                lineNumber: 235,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, c.slug, true, {
                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                        lineNumber: 230,
                                                        columnNumber: 19
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 228,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                        lineNumber: 226,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                        className: "trust",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                        "aria-hidden": "true",
                                                        children: "🧾"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                        lineNumber: 242,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: t('t80g')
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                        lineNumber: 242,
                                                        columnNumber: 47
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 242,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                        "aria-hidden": "true",
                                                        children: "🔒"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                        lineNumber: 243,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: t('tsecure')
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                        lineNumber: 243,
                                                        columnNumber: 47
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 243,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                        "aria-hidden": "true",
                                                        children: "⚡"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                        lineNumber: 244,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: t('treceipt')
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                        lineNumber: 244,
                                                        columnNumber: 46
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 244,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                        "aria-hidden": "true",
                                                        children: "🛕"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                        lineNumber: 245,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: t('tdirect')
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                        lineNumber: 245,
                                                        columnNumber: 47
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 245,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                        lineNumber: 241,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "quote",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "sk",
                                                lang: "sa",
                                                children: [
                                                    "दातव्यमिति यद्दानं दीयतेऽनुपकारिणे ।",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                        lineNumber: 249,
                                                        columnNumber: 81
                                                    }, this),
                                                    "देशे काले च पात्रे च तद्दानं सात्त्विकं स्मृतम् ॥"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 249,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "tr",
                                                children: t('gitatr')
                                            }, void 0, false, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 250,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "ref",
                                                children: "Bhagavad-gītā 17.20"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                lineNumber: 251,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                        lineNumber: 248,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                lineNumber: 194,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                        lineNumber: 176,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                        className: "site",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                children: "ISKCON Chennai"
                            }, void 0, false, {
                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                lineNumber: 257,
                                columnNumber: 11
                            }, this),
                            " — Hare Krishna Land, Off ECR, Bhaktivedanta Swami Rd., Akkarai, Sholinghanallur, Chennai - 600119",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                lineNumber: 257,
                                columnNumber: 130
                            }, this),
                            t('foot80g'),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                lineNumber: 258,
                                columnNumber: 25
                            }, this),
                            "Unique Regn. No. (80G): AAATI0017PF20219 · Regd. under Maharashtra Public Trust Act 1950, Regn. No. F-2179 (Bom)",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                lineNumber: 259,
                                columnNumber: 123
                            }, this),
                            "info@iskconchennai.org · Mobile: 6385042108",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                lineNumber: 260,
                                columnNumber: 54
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                lineNumber: 260,
                                columnNumber: 60
                            }, this),
                            t('footind')
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                        lineNumber: 256,
                        columnNumber: 9
                    }, this),
                    !sel && categories.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "sticky-cta",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>openSheet('category', categories[0]),
                            children: t('stickybtn')
                        }, void 0, false, {
                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                            lineNumber: 265,
                            columnNumber: 39
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                        lineNumber: 265,
                        columnNumber: 11
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                lineNumber: 161,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: 'sheet-mask' + (sel ? ' open' : ''),
                onClick: closeSheet
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                lineNumber: 270,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: 'sheet' + (sel ? ' open' : ''),
                role: "dialog",
                "aria-modal": "true",
                "aria-labelledby": "sheetTitle",
                tabIndex: -1,
                ref: sheetRef,
                children: sel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "sheet-head",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "handle",
                                    "aria-hidden": "true"
                                }, void 0, false, {
                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                    lineNumber: 275,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    id: "sheetTitle",
                                    children: [
                                        sel.kind === 'campaign' ? tr(sel.item.title_i18n) : tr(sel.item.name_i18n),
                                        " ",
                                        sel.item.icon || '🪔'
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                    lineNumber: 276,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "x",
                                    onClick: closeSheet,
                                    "aria-label": t('close'),
                                    children: "✕"
                                }, void 0, false, {
                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                    lineNumber: 277,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                            lineNumber: 274,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "sheet-body",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "steps",
                                    "aria-hidden": "true",
                                    children: [
                                        1,
                                        2,
                                        3
                                    ].map((n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                            className: step >= n ? 'done' : ''
                                        }, n, false, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 280,
                                            columnNumber: 79
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                    lineNumber: 280,
                                    columnNumber: 15
                                }, this),
                                error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "err",
                                    role: "alert",
                                    children: error
                                }, void 0, false, {
                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                    lineNumber: 281,
                                    columnNumber: 24
                                }, this) : null,
                                step === 1 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "emo-line",
                                            children: tr(sel.item.emo_i18n) || tr(sel.item.line_i18n)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 285,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "amounts",
                                            children: presets.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    className: "amt",
                                                    "aria-pressed": amount === p.amount && !custom,
                                                    onClick: ()=>{
                                                        setAmount(p.amount);
                                                        setCustom('');
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                            children: fmt(p.amount)
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 290,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: tr(p.impact)
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 290,
                                                            columnNumber: 47
                                                        }, this)
                                                    ]
                                                }, p.amount, true, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 288,
                                                    columnNumber: 23
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 286,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "custom-amt",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    "aria-hidden": "true",
                                                    children: "₹"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 294,
                                                    columnNumber: 47
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "tel",
                                                    inputMode: "numeric",
                                                    placeholder: t('customph'),
                                                    "aria-label": t('customph'),
                                                    value: custom,
                                                    onChange: (e)=>{
                                                        setCustom(e.target.value);
                                                        const v = parseInt(e.target.value || 0);
                                                        if (v > 0) setAmount(v);
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 295,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 294,
                                            columnNumber: 19
                                        }, this),
                                        isDatedCat ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "field",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    htmlFor: "sevaDate",
                                                    children: t('sevadate')
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 300,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "date",
                                                    id: "sevaDate",
                                                    value: sevaDate,
                                                    onChange: (e)=>setSevaDate(e.target.value)
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 301,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "hint",
                                                    children: t('sevadatehint')
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 302,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 299,
                                            columnNumber: 21
                                        }, this) : null,
                                        isMonthlyCat ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "check",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "checkbox",
                                                    id: "monthlyChk",
                                                    checked: monthly,
                                                    onChange: (e)=>setMonthly(e.target.checked)
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 307,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    htmlFor: "monthlyChk",
                                                    children: t('monthlytxt')
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 308,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 306,
                                            columnNumber: 21
                                        }, this) : null,
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            className: "btn-pay",
                                            onClick: ()=>{
                                                setError('');
                                                setStep(2);
                                            },
                                            children: t('continue')
                                        }, void 0, false, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 311,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                    lineNumber: 284,
                                    columnNumber: 17
                                }, this) : null,
                                step === 2 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "emo-line",
                                            children: t('phoneline')
                                        }, void 0, false, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 317,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "field",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    htmlFor: "phone",
                                                    children: t('mobile')
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 319,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "tel",
                                                    id: "phone",
                                                    inputMode: "numeric",
                                                    maxLength: 10,
                                                    placeholder: "98400 12345",
                                                    value: phone,
                                                    onChange: (e)=>lookup(e.target.value),
                                                    "aria-describedby": "phoneHint"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 320,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "hint",
                                                    id: "phoneHint",
                                                    children: t('mobilehint')
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 322,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 318,
                                            columnNumber: 19
                                        }, this),
                                        people && !personId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "masked-card",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mc-title",
                                                    children: t('welcomeback')
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 327,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mc-prompt",
                                                    children: t('whoisthis')
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 328,
                                                    columnNumber: 23
                                                }, this),
                                                people.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        className: "mc-person",
                                                        onClick: ()=>{
                                                            setPersonId(p.person_id);
                                                            setError('');
                                                            setStep(3);
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "av",
                                                                "aria-hidden": "true",
                                                                children: "🙏"
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                lineNumber: 331,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                        children: p.mask
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                        lineNumber: 332,
                                                                        columnNumber: 33
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        children: p.area
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                        lineNumber: 332,
                                                                        columnNumber: 48
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                lineNumber: 332,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "go",
                                                                "aria-hidden": "true",
                                                                children: "→"
                                                            }, void 0, false, {
                                                                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                lineNumber: 333,
                                                                columnNumber: 27
                                                            }, this)
                                                        ]
                                                    }, p.person_id, true, {
                                                        fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                        lineNumber: 330,
                                                        columnNumber: 25
                                                    }, this)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    className: "btn-line",
                                                    onClick: ()=>setPeople(null),
                                                    children: t('someonenew')
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 336,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 326,
                                            columnNumber: 21
                                        }, this) : null,
                                        !people || needsAddressOnly ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                !needsAddressOnly ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "field",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                    htmlFor: "fname",
                                                                    children: t('fullname')
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 344,
                                                                    columnNumber: 50
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    id: "fname",
                                                                    placeholder: t('fullnameph'),
                                                                    autoComplete: "name",
                                                                    value: form.name,
                                                                    onChange: (e)=>setForm({
                                                                            ...form,
                                                                            name: e.target.value
                                                                        })
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 345,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 344,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "field",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                    htmlFor: "femail",
                                                                    children: t('email')
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 346,
                                                                    columnNumber: 50
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    id: "femail",
                                                                    type: "email",
                                                                    placeholder: "you@example.com",
                                                                    autoComplete: "email",
                                                                    value: form.email,
                                                                    onChange: (e)=>setForm({
                                                                            ...form,
                                                                            email: e.target.value
                                                                        })
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 347,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 346,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true) : null,
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "row2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "field",
                                                            style: {
                                                                flex: 2
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                    htmlFor: "faddr",
                                                                    children: t('addrlabel')
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 351,
                                                                    columnNumber: 68
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    id: "faddr",
                                                                    placeholder: t('addrph'),
                                                                    autoComplete: "street-address",
                                                                    value: form.addressLine,
                                                                    onChange: (e)=>setForm({
                                                                            ...form,
                                                                            addressLine: e.target.value
                                                                        })
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 352,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 351,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "field",
                                                            style: {
                                                                flex: 1
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                    htmlFor: "fpin",
                                                                    children: t('pinlabel')
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 353,
                                                                    columnNumber: 68
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    id: "fpin",
                                                                    type: "tel",
                                                                    inputMode: "numeric",
                                                                    maxLength: 6,
                                                                    placeholder: "600119",
                                                                    autoComplete: "postal-code",
                                                                    value: form.pincode,
                                                                    onChange: (e)=>setForm({
                                                                            ...form,
                                                                            pincode: e.target.value
                                                                        })
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 354,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 353,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 350,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "nudge",
                                                    dangerouslySetInnerHTML: {
                                                        __html: t('pannudge')
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 356,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "field",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "fpan",
                                                            children: t('panlabel')
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 357,
                                                            columnNumber: 46
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            id: "fpan",
                                                            placeholder: "ABCDE1234F",
                                                            style: {
                                                                textTransform: 'uppercase'
                                                            },
                                                            autoComplete: "off",
                                                            value: form.pan,
                                                            onChange: (e)=>setForm({
                                                                    ...form,
                                                                    pan: e.target.value.toUpperCase()
                                                                })
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 358,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 357,
                                                    columnNumber: 23
                                                }, this),
                                                !needsAddressOnly ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "check",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    type: "checkbox",
                                                                    id: "wapp",
                                                                    checked: form.whatsappOptin,
                                                                    onChange: (e)=>setForm({
                                                                            ...form,
                                                                            whatsappOptin: e.target.checked
                                                                        })
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 361,
                                                                    columnNumber: 50
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                    htmlFor: "wapp",
                                                                    children: t('wapptxt')
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 362,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 361,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "check",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    type: "checkbox",
                                                                    id: "pras",
                                                                    checked: form.prasadam,
                                                                    onChange: (e)=>setForm({
                                                                            ...form,
                                                                            prasadam: e.target.checked
                                                                        })
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 363,
                                                                    columnNumber: 50
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                    htmlFor: "pras",
                                                                    children: t('prasadamtxt')
                                                                }, void 0, false, {
                                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                                    lineNumber: 364,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 363,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true) : null
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 341,
                                            columnNumber: 21
                                        }, this) : null,
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            className: "btn-pay",
                                            onClick: ()=>{
                                                setError('');
                                                setStep(3);
                                            },
                                            children: t('topay')
                                        }, void 0, false, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 370,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                    lineNumber: 316,
                                    columnNumber: 17
                                }, this) : null,
                                step === 3 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "summary",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "s-row",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: sel.kind === 'campaign' ? tr(sel.item.title_i18n) : tr(sel.item.name_i18n)
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 377,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: chosenImpact ? tr(chosenImpact.impact) : ''
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 377,
                                                            columnNumber: 133
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 377,
                                                    columnNumber: 21
                                                }, this),
                                                isDatedCat && sevaDate ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "s-row",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: t('sevadateshort')
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 378,
                                                            columnNumber: 70
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: sevaDate
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 378,
                                                            columnNumber: 103
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 378,
                                                    columnNumber: 47
                                                }, this) : null,
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "s-row total",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: t('youroffering')
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 379,
                                                            columnNumber: 50
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: [
                                                                fmt(amount),
                                                                isMonthlyCat && monthly ? ' ' + t('permonth') : ''
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 379,
                                                            columnNumber: 82
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 379,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 376,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            className: "gateway primary",
                                            onClick: submitDonation,
                                            disabled: busy,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "gw-logo gw-payu",
                                                    "aria-hidden": "true",
                                                    children: "PayU"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 382,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                            children: t('payuname')
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 383,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: t('payusub')
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 383,
                                                            columnNumber: 49
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 383,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 381,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "failsafe",
                                            children: t('failsafe')
                                        }, void 0, false, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 385,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "gateway",
                                            "aria-disabled": "true",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "gw-logo gw-rzp",
                                                    "aria-hidden": "true",
                                                    children: "Rzp"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 386,
                                                    columnNumber: 65
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                            children: "Razorpay"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 386,
                                                            columnNumber: 133
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: t('backup')
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 386,
                                                            columnNumber: 148
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 386,
                                                    columnNumber: 127
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 386,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "gateway",
                                            "aria-disabled": "true",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "gw-logo gw-ezb",
                                                    "aria-hidden": "true",
                                                    children: "Ezb"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 387,
                                                    columnNumber: 65
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                            children: "Easebuzz"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 387,
                                                            columnNumber: 133
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: t('backup')
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                            lineNumber: 387,
                                                            columnNumber: 148
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                                    lineNumber: 387,
                                                    columnNumber: 127
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 387,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            className: "btn-pay",
                                            onClick: submitDonation,
                                            disabled: busy,
                                            children: busy ? t('paybusy') : `🪔 ${t('offer')} ${fmt(amount)}`
                                        }, void 0, false, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 388,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "secure-line",
                                            children: t('secureline')
                                        }, void 0, false, {
                                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                            lineNumber: 391,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/donate/src/app/DonateClient.js",
                                    lineNumber: 375,
                                    columnNumber: 17
                                }, this) : null
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/donate/src/app/DonateClient.js",
                            lineNumber: 279,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true) : null
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/DonateClient.js",
                lineNumber: 271,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(DonateClient, "bTlfuY6BIwLVGIksIL6Hft4mgoc=");
_c2 = DonateClient;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "Mandala");
__turbopack_context__.k.register(_c1, "Feather");
__turbopack_context__.k.register(_c2, "DonateClient");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=apps_donate_src_0-fmalq._.js.map