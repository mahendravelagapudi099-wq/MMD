import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Camera, FlipHorizontal, AlertCircle, Loader2 } from "lucide-react";

const QRScannerPage = () => {
    const navigate = useNavigate();
    const [scanned, setScanned] = useState(false);
    const [error, setError] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const scannerRef = useRef(null);

    useEffect(() => {
        // Function to start the scanner
        const startScanner = async () => {
            try {
                // Initialize Html5Qrcode
                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                };

                // Request camera and start scanning
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        onScanSuccess(decodedText);
                    },
                    (errorMessage) => {
                        // Ignore frequent failure logs
                    }
                );
                setIsCameraActive(true);
            } catch (err) {
                console.error("Camera execution error:", err);
                setError("Camera access denied or device not found.");
            }
        };

        const onScanSuccess = async (decodedText) => {
            if (scanned) return;
            setScanned(true);

            // Immediately stop scanner
            if (scannerRef.current) {
                try {
                    await scannerRef.current.stop();
                    setIsCameraActive(false);
                } catch (e) {
                    console.error("Stop failing", e);
                }
            }

            // Attempt to parse data-carrying QR (Zero-Trust)
            let certId = "";
            let qrProof = null;

            try {
                const parsed = JSON.parse(decodedText);
                if (parsed.v === 1 && parsed.id && parsed.data) {
                    certId = parsed.id;
                    qrProof = parsed.data;
                }
            } catch (e) {
                // Fallback to URL parsing or direct ID
                certId = decodedText.trim();
                if (certId.includes("/verify/")) {
                    const segments = certId.split("/verify/");
                    certId = segments[segments.length - 1].split("?")[0].replace(/\/$/, "");
                }
            }

            // Navigate
            if (qrProof) {
                navigate(`/verify/${certId}`, { state: { proof: qrProof } });
            } else {
                navigate(`/verify/${certId}`);
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop()
                    .then(() => setIsCameraActive(false))
                    .catch(err => console.error("Scanner cleanup fail", err));
            }
        };
    }, [navigate]);

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
                <div className="h-12 w-12" />
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

                    {/* Loading/Success Overlays */}
                    {!isCameraActive && !error && !scanned && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="h-10 w-10 text-primary animate-spin" />
                            <p className="text-[10px] font-black uppercase text-gray-400">Initializing Optical Node...</p>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 bg-red-50/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center space-y-4">
                            <AlertCircle className="h-12 w-12 text-error" />
                            <h3 className="font-black text-gray-900 uppercase tracking-tight">Camera Required</h3>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                            >
                                Retry Setup
                            </button>
                        </div>
                    )}

                    {scanned && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="h-20 w-20 bg-success text-white rounded-[2rem] flex items-center justify-center shadow-lg animate-bounce">
                                <ShieldCheck className="h-10 w-10 font-bold" />
                            </div>
                            <p className="font-black text-gray-900 uppercase tracking-widest text-sm">Decoding Hash...</p>
                        </div>
                    )}

                    {/* Static Viewfinder corners */}
                    <div className="absolute top-8 left-8 h-8 w-8 border-t-4 border-l-4 border-primary rounded-tl-lg pointer-events-none" />
                    <div className="absolute top-8 right-8 h-8 w-8 border-t-4 border-r-4 border-primary rounded-tr-lg pointer-events-none" />
                    <div className="absolute bottom-8 left-8 h-8 w-8 border-b-4 border-l-4 border-primary rounded-bl-lg pointer-events-none" />
                    <div className="absolute bottom-8 right-8 h-8 w-8 border-b-4 border-r-4 border-primary rounded-br-lg pointer-events-none" />
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

            <div className="text-center pt-4">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">
                    Cryptographical Verification Tunnel
                </p>
            </div>
        </div>
    );
};

export default QRScannerPage;
