import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Camera, FlipHorizontal, AlertCircle } from "lucide-react";

const QRScannerPage = () => {
    const navigate = useNavigate();
    const [scanned, setScanned] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const size = Math.floor(minEdge * 0.7);
                    return { width: size, height: size };
                },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                showFlipCameraButtonIfSupported: true,
                rememberLastUsedCamera: true
            },
            /* verbose= */ false
        );

        const onScanSuccess = (decodedText) => {
            if (!scanned) {
                setScanned(true);
                scanner.clear();

                // Extract CertID from URL if it's a full link, or use the text directly if it's just the ID
                let certId = decodedText.trim();

                // Handle different URL formats or direct IDs
                if (certId.includes("/verify/")) {
                    const segments = certId.split("/verify/");
                    certId = segments[segments.length - 1].split("?")[0].replace(/\/$/, "");
                }

                console.log("Scanned Data:", decodedText);
                console.log("Extracted ID:", certId);

                navigate(`/verify/${certId}`);
            }
        };

        const onScanFailure = (error) => {
            // Failure is normal when no QR is in view, we don't show error unless it's critical
            // console.warn(`QR error: ${error}`);
        };

        scanner.render(onScanSuccess, onScanFailure);

        return () => {
            scanner.clear().catch(err => console.error("Scanner wipe fail", err));
        };
    }, [navigate, scanned]);

    return (
        <div className="max-w-2xl mx-auto py-12 px-4 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center hover:bg-gray-100 transition shadow-sm"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-400 font-bold" />
                </button>
                <div className="flex items-center space-x-2 text-primary">
                    <ShieldCheck className="h-6 w-6 font-bold" />
                    <span className="font-black tracking-tight text-gray-900 uppercase text-xs">Security Protocol</span>
                </div>
                <div className="h-12 w-12" /> {/* Spacer */}
            </div>

            <div className="text-center space-y-3">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">QR Verification</h1>
                <p className="text-gray-500 font-medium">Scan the cryptographic seal on any MDM certificate.</p>
            </div>

            {/* Scanner Area */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-400 rounded-[3rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>

                <div className="relative bg-white p-4 rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden min-h-[300px] flex items-center justify-center">
                    <div id="reader" className="w-full h-full rounded-[2rem] overflow-hidden border-0" />

                    {/* Overlay Decorations */}
                    <div className="absolute top-8 left-8 h-8 w-8 border-t-4 border-l-4 border-primary rounded-tl-lg pointer-events-none" />
                    <div className="absolute top-8 right-8 h-8 w-8 border-t-4 border-r-4 border-primary rounded-tr-lg pointer-events-none" />
                    <div className="absolute bottom-8 left-8 h-8 w-8 border-b-4 border-l-4 border-primary rounded-bl-lg pointer-events-none" />
                    <div className="absolute bottom-8 right-8 h-8 w-8 border-b-4 border-r-4 border-primary rounded-br-lg pointer-events-none" />

                    {scanned && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="h-20 w-20 bg-success text-white rounded-[2rem] flex items-center justify-center shadow-lg animate-bounce">
                                <ShieldCheck className="h-10 w-10 font-bold" />
                            </div>
                            <p className="font-black text-gray-900 uppercase tracking-widest text-sm">Decoding Hash...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50 space-y-2">
                    <Camera className="h-5 w-5 text-primary font-bold" />
                    <h3 className="text-sm font-black text-gray-900">Permissions</h3>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">Ensure camera access is granted in your browser settings for real-time scanning.</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-2">
                    <FlipHorizontal className="h-5 w-5 text-gray-400 font-bold" />
                    <h3 className="text-sm font-black text-gray-900">Manual Entry</h3>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">If scanning fails, you can always type the Certificate ID manually in the Public Registry.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border-l-4 border-error text-error rounded-r-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 font-bold" />
                    <span>Camera Error: {error}</span>
                </div>
            )}

            <div className="text-center pt-4">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">
                    Cryptographical Verification Tunnel
                </p>
            </div>

            {/* Custom styles to fix html5-qrcode's default ugly/broken buttons */}
            <style>{`
                #reader button {
                    background-color: #3b82f6 !important;
                    color: white !important;
                    padding: 10px 20px !important;
                    border-radius: 12px !important;
                    font-weight: 800 !important;
                    text-transform: uppercase !important;
                    font-size: 11px !important;
                    letter-spacing: 0.05em !important;
                    border: none !important;
                    cursor: pointer !important;
                    margin: 10px 5px !important;
                    transition: all 0.2s !important;
                }
                #reader button:hover {
                    background-color: #2563eb !important;
                    transform: translateY(-1px) !important;
                }
                #reader__dashboard_section_csr span {
                    display: block !important;
                    margin-bottom: 10px !important;
                    font-weight: 700 !important;
                    color: #6b7280 !important;
                }
                #reader img {
                    display: none !important;
                }
                #reader__status_span {
                    font-size: 12px !important;
                    font-weight: 700 !important;
                    color: #3b82f6 !important;
                }
            `}</style>
        </div>
    );
};

export default QRScannerPage;
