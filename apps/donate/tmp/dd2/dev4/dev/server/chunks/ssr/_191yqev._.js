module.exports = [
"[project]/apps/donate/src/lib/launch.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
}),
"[project]/apps/donate/src/app/thank-you/ThankYouClient.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ThankYouClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$launch$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/donate/src/lib/launch.js [app-ssr] (ecmascript)");
'use client';
;
;
;
const Conch = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: "conch",
        viewBox: "0 0 80 90",
        "aria-hidden": "true",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M40 6 C58 10 66 26 64 44 C62 62 52 74 40 84 C28 74 18 62 16 44 C14 26 22 10 40 6Z",
                fill: "#FDF6E3",
                stroke: "#C9A227",
                strokeWidth: "2"
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                lineNumber: 7,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M40 16 C51 20 56 30 55 43 C54 56 48 66 40 74 C32 66 26 56 25 43 C24 30 29 20 40 16Z",
                fill: "none",
                stroke: "#C9A227",
                strokeWidth: "1.4"
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                lineNumber: 8,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
        lineNumber: 6,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
function ThankYouClient({ status, receipt, token, donation, gateway, final }) {
    const ok = status === 'success';
    const [petals, setPetals] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [retrying, setRetrying] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [retryError, setRetryError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!ok || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        setPetals(Array.from({
            length: 14
        }, (_, i)=>({
                id: i,
                glyph: [
                    '🌸',
                    '🌼',
                    '✨'
                ][i % 3],
                left: Math.random() * 100,
                dur: 4 + Math.random() * 4,
                delay: Math.random() * 3
            })));
    }, [
        ok
    ]);
    async function tryNext() {
        setRetrying(true);
        setRetryError('');
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$donate$2f$src$2f$lib$2f$launch$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["retryNextGateway"])(donation, gateway || 'payu');
        } catch (e) {
            setRetryError('All payment options are unavailable right now. Nothing was charged — please try again later, or contact the temple at 6385042108.');
            setRetrying(false);
        }
    }
    function share() {
        const text = encodeURIComponent('I just offered seva at ISKCON Chennai 🪔 Join me: https://donate.iskconchennai.org');
        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bless",
        role: "main",
        children: [
            petals.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "petal",
                    "aria-hidden": "true",
                    style: {
                        left: p.left + '%',
                        animationDuration: p.dur + 's',
                        animationDelay: p.delay + 's'
                    },
                    children: p.glyph
                }, p.id, false, {
                    fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                    lineNumber: 44,
                    columnNumber: 9
                }, this)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Conch, {}, void 0, false, {
                fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                lineNumber: 47,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "diya",
                "aria-hidden": "true",
                children: "🪔"
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                lineNumber: 48,
                columnNumber: 7
            }, this),
            ok ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        children: "Hare Krishna!"
                    }, void 0, false, {
                        fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                        lineNumber: 51,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "b-name",
                        children: "Your seva has been offered."
                    }, void 0, false, {
                        fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                        lineNumber: 52,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: "May Sri Sri Radha Krishna shower Their choicest blessings upon you and your family. Your offering is already on its way to His altar."
                    }, void 0, false, {
                        fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                        lineNumber: 53,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "receipt-chip",
                        children: [
                            "🧾 Receipt ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                children: [
                                    "#",
                                    receipt
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                                lineNumber: 55,
                                columnNumber: 24
                            }, this),
                            token ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    " · ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: `/api/receipts/${receipt}?t=${token}`,
                                        children: "Download PDF"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                                        lineNumber: 56,
                                        columnNumber: 27
                                    }, this)
                                ]
                            }, void 0, true) : null,
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                                lineNumber: 57,
                                columnNumber: 13
                            }, this),
                            "Form 10BE (80G certificate) follows as per Income-tax rules."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                        lineNumber: 54,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "btn-gold",
                        onClick: share,
                        children: "Share this joy on WhatsApp 💬"
                    }, void 0, false, {
                        fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                        lineNumber: 59,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        children: status === 'invalid' || status === 'error' ? 'Something went wrong' : 'The payment did not complete'
                    }, void 0, false, {
                        fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                        lineNumber: 63,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: "Nothing was charged. Your seva intention is safe with us."
                    }, void 0, false, {
                        fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                        lineNumber: 64,
                        columnNumber: 11
                    }, this),
                    retryError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            color: '#F0DFAE'
                        },
                        children: retryError
                    }, void 0, false, {
                        fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                        lineNumber: 65,
                        columnNumber: 25
                    }, this) : null,
                    donation && !final && !retryError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "btn-gold",
                        onClick: tryNext,
                        disabled: retrying,
                        children: retrying ? 'Switching to a backup gateway…' : 'Try another payment option →'
                    }, void 0, false, {
                        fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                        lineNumber: 67,
                        columnNumber: 13
                    }, this) : null
                ]
            }, void 0, true),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                style: {
                    marginTop: 14
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                    href: "/",
                    children: "← Back to sevas"
                }, void 0, false, {
                    fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                    lineNumber: 73,
                    columnNumber: 36
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
                lineNumber: 73,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/donate/src/app/thank-you/ThankYouClient.js",
        lineNumber: 42,
        columnNumber: 5
    }, this);
}
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime;
}),
];

//# sourceMappingURL=_191yqev._.js.map