import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../utils/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    doc,
    getDoc
} from "firebase/firestore";
import { formatDate } from "../utils/helpers";
import { onAuthStateChanged } from "firebase/auth";
import {
    Award,
    ExternalLink,
    Download,
    Share2,
    ShieldCheck,
    QrCode,
    X,
    Copy,
    Mail,
    MessageCircle,
    Linkedin,
    FileText,
    AlertCircle,
    Shapes,
    Loader2,
    CheckCircle2
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const StudentPortal = () => {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedCert, setSelectedCert] = useState(null);
    const [copyStatus, setCopyStatus] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const certificateRef = useRef(null);

    // --- Fetch Certificates ---
    useEffect(() => {
        const fetchMyCertificates = async (user) => {
            if (!user?.email) return;

            setLoading(true);
            try {
                const q = query(
                    collection(db, "certificates"),
                    where("email", "==", user.email)
                );

                const snapshot = await getDocs(q);
                const data = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)); // Client-side sort

                setCertificates(data);
                setError("");
            } catch (err) {
                console.error("Error fetching student certificates:", err);
                setError("Failed to load your certificates. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchMyCertificates(user);
            } else {
                setCertificates([]);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // --- Actions ---
    const handleCopyLink = (certId) => {
        const url = `${window.location.origin}/verify/${certId}`;
        navigator.clipboard.writeText(url);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
    };

    const downloadQR = (certId) => {
        const svg = document.querySelector(`#qr-${certId}`);
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.download = `QR_${certId}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    const generatePDF = async () => {
        if (!certificateRef.current) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(certificateRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff"
            });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("l", "mm", "a4");
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Certificate_${selectedCert.certId}.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
        } finally {
            setDownloading(false);
        }
    };

    const shareSocial = (platform, cert) => {
        const url = `${window.location.origin}/verify/${cert.certId}`;
        const text = `Check out my verified blockchain certificate for ${cert.courseName}!`;

        const links = {
            whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            email: `mailto:?subject=${encodeURIComponent("My Verified Certificate")}&body=${encodeURIComponent(text + "\n\nVerify here: " + url)}`
        };

        window.open(links[platform], "_blank");
    };

    // --- Sub-components ---
    const SkeletonCard = () => (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 animate-pulse">
            <div className="h-12 w-12 bg-gray-100 rounded-2xl" />
            <div className="space-y-2">
                <div className="h-4 w-3/4 bg-gray-100 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 rounded" />
            </div>
            <div className="pt-4 border-t border-gray-50 flex justify-between">
                <div className="h-8 w-20 bg-gray-100 rounded-lg" />
                <div className="h-8 w-20 bg-gray-100 rounded-lg" />
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="py-12 space-y-10">
                <header className="space-y-2">
                    <div className="h-10 w-48 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-4 w-64 bg-gray-50 rounded animate-pulse" />
                </header>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-20 flex flex-col items-center text-center space-y-6">
                <div className="bg-red-50 p-6 rounded-full text-error">
                    <AlertCircle className="h-12 w-12" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Oops! Something went wrong</h2>
                    <p className="text-gray-500 mt-2">{error}</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-600 transition shadow-lg shadow-blue-100"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="py-12 space-y-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div className="space-y-3">
                    <div className="inline-flex items-center space-x-2 bg-blue-50 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                        <Award className="h-4 w-4" />
                        <span>Personal Inventory</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Student Portal</h1>
                    <p className="text-gray-500 font-medium">Verify, share, and manage your academic achievements.</p>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-3">
                    <div className="bg-green-50 p-2 rounded-xl text-success">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Status</p>
                        <p className="text-sm font-bold text-gray-900">All Records Verified</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <section className="px-4">
                {certificates.length === 0 ? (
                    <div className="py-24 flex flex-col items-center text-center space-y-8 bg-gray-50/50 rounded-[4rem] border-2 border-dashed border-gray-100">
                        <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-gray-200/50 relative">
                            <Shapes className="h-20 w-20 text-gray-100" />
                            <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-gray-200" />
                        </div>
                        <div className="max-w-xs space-y-2">
                            <h3 className="text-2xl font-black text-gray-900">No certificates yet</h3>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                Your credentials will appear here automatically once issued by your authorized institution.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {certificates.map((cert) => (
                            <div
                                key={cert.id}
                                className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition duration-700 pointer-events-none">
                                    <Award className="h-32 w-32" />
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="h-14 w-14 bg-blue-50 text-primary rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-primary group-hover:text-white transition duration-500">
                                            <FileText className="h-7 w-7" />
                                        </div>
                                        <span className="bg-green-50 text-success px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                            <ShieldCheck className="h-3 w-3" />
                                            Verified
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        <h3 className="text-xl font-black text-gray-900 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                            {cert.courseName}
                                        </h3>
                                        <p className="text-gray-500 text-sm font-medium">{cert.studentName}</p>
                                    </div>

                                    <div className="flex items-center gap-6 pt-2 border-t border-gray-50">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Issue Date</span>
                                            <span className="text-sm font-bold text-gray-900">{formatDate(cert.issueDate)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Grade</span>
                                            <span className="text-sm font-bold text-primary">{cert.grade}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <button
                                            onClick={() => setSelectedCert(cert)}
                                            className="flex items-center justify-center space-x-2 py-3 bg-gray-900 text-white rounded-xl text-xs font-black hover:bg-black transition active:scale-95"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            <span>Details</span>
                                        </button>
                                        <button
                                            onClick={() => setSelectedCert(cert)} // Simplified for demo, opens modal which has PDF
                                            className="flex items-center justify-center space-x-2 py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-black hover:bg-gray-200 transition active:scale-95"
                                        >
                                            <Download className="h-4 w-4" />
                                            <span>Export</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* --- Detail Modal --- */}
            {selectedCert && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-300 scrollbar-hide">

                        <button
                            onClick={() => setSelectedCert(null)}
                            className="absolute top-6 right-6 p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl transition z-20"
                        >
                            <X className="h-6 w-6" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-5 h-full">
                            {/* Left Column: QR & Meta */}
                            <div className="md:col-span-2 bg-gray-50/50 p-6 md:p-10 flex flex-col items-center justify-center space-y-8 border-b md:border-b-0 md:border-r border-gray-100">
                                <div className="relative group">
                                    <div className="absolute -inset-4 bg-primary/10 rounded-[3rem] blur-2xl group-hover:bg-primary/20 transition duration-700" />
                                    <div className="relative bg-white p-5 rounded-[2.5rem] shadow-xl border-4 border-white shadow-blue-100/50">
                                        <QRCodeSVG
                                            id={`qr-${selectedCert.certId}`}
                                            value={`${window.location.origin}/verify/${selectedCert.certId}`}
                                            size={200}
                                            level={"H"}
                                            includeMargin={true}
                                            fgColor="#1E40AF"
                                        />
                                    </div>
                                </div>

                                <div className="text-center space-y-4 w-full">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Registry Reference</label>
                                        <div className="flex items-center justify-center space-x-2 bg-white px-4 py-2 rounded-xl border border-gray-100 mt-1">
                                            <span className="font-mono text-xs font-black text-primary truncate max-w-[120px]">{selectedCert.certId}</span>
                                            <button onClick={() => handleCopyLink(selectedCert.certId)} className="text-gray-400 hover:text-primary transition">
                                                {copyStatus ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-4 grid grid-cols-1 gap-3">
                                        <button
                                            onClick={() => downloadQR(selectedCert.certId)}
                                            className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-xs font-black text-gray-700 hover:border-primary hover:text-primary transition flex items-center justify-center space-x-2"
                                        >
                                            <QrCode className="h-4 w-4" />
                                            <span>Download QR as PNG</span>
                                        </button>
                                        <a
                                            href={`https://amoy.polygonscan.com/tx/${selectedCert.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full py-3 px-4 bg-blue-50 text-primary rounded-xl text-xs font-black hover:bg-blue-100 transition flex items-center justify-center space-x-2"
                                        >
                                            <ShieldCheck className="h-4 w-4" />
                                            <span>View Blockchain Proof</span>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Actions & Preview */}
                            <div className="md:col-span-3 p-6 md:p-10 space-y-10">
                                <div className="space-y-6">
                                    <header>
                                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">{selectedCert.courseName}</h2>
                                        <p className="text-gray-500 font-medium">Issued by Institution #{selectedCert.issuerId.slice(-4)}</p>
                                    </header>

                                    <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-3xl">
                                        <div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Name</span>
                                            <p className="font-bold text-gray-900">{selectedCert.studentName}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grade Achieved</span>
                                            <p className="font-bold text-primary">{selectedCert.grade}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Share This Merit</h4>
                                    <div className="flex flex-wrap gap-4">
                                        <button onClick={() => shareSocial('linkedin', selectedCert)} className="h-14 w-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition shadow-lg shadow-blue-200">
                                            <Linkedin className="h-6 w-6" />
                                        </button>
                                        <button onClick={() => shareSocial('whatsapp', selectedCert)} className="h-14 w-14 bg-green-500 text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition shadow-lg shadow-green-200">
                                            <MessageCircle className="h-6 w-6" />
                                        </button>
                                        <button onClick={() => shareSocial('email', selectedCert)} className="h-14 w-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition shadow-lg shadow-gray-200">
                                            <Mail className="h-6 w-6" />
                                        </button>
                                        <button onClick={() => handleCopyLink(selectedCert.certId)} className="h-14 w-14 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition shadow-md">
                                            <Copy className="h-6 w-6" />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-50 space-y-4">
                                    <button
                                        onClick={generatePDF}
                                        disabled={downloading}
                                        className="w-full py-5 bg-primary text-white rounded-[1.8rem] font-black text-lg hover:bg-blue-600 transition shadow-xl shadow-blue-100 flex items-center justify-center space-x-3 disabled:opacity-50"
                                    >
                                        {downloading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Download className="h-6 w-6" />}
                                        <span>{downloading ? "Formatting Certificate..." : "Download Official PDF"}</span>
                                    </button>
                                </div>

                                {/* Hidden Certificate Component for PDF Export */}
                                <div className="hidden">
                                    <div
                                        ref={certificateRef}
                                        className="w-[1000px] p-20 bg-white border-[20px] border-blue-50 flex flex-col items-center text-center space-y-10 font-sans"
                                    >
                                        <div className="w-full flex justify-between items-start">
                                            <ShieldCheck className="h-16 w-16 text-primary" />
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-300 tracking-widest uppercase">Official Record</p>
                                                <p className="text-xs font-mono text-gray-400">{selectedCert?.certId}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h1 className="text-6xl font-black text-gray-900 tracking-tighter">Certificate of Completion</h1>
                                            <div className="h-1.5 w-40 bg-primary mx-auto rounded-full" />
                                        </div>

                                        <div className="space-y-6">
                                            <p className="text-xl text-gray-400 font-medium italic">This is to certify that</p>
                                            <h2 className="text-5xl font-black text-primary">{selectedCert?.studentName}</h2>
                                            <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto">
                                                has successfully completed the requirements for the course
                                            </p>
                                            <h3 className="text-3xl font-bold text-gray-900">{selectedCert?.courseName}</h3>
                                            <div className="flex justify-center gap-12 pt-4">
                                                <div className="text-center">
                                                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-300">Grade</p>
                                                    <p className="text-lg font-bold text-gray-900">{selectedCert?.grade}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-300">Institution</p>
                                                    <p className="text-lg font-bold text-gray-900">{selectedCert?.institutionName}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-300">Issue Date</p>
                                                    <p className="text-lg font-bold text-gray-900">{formatDate(selectedCert?.issueDate)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center space-y-4 pt-10 border-t border-gray-50 w-full opacity-60">
                                            <QRCodeSVG
                                                value={`${window.location.origin}/verify/${selectedCert?.certId}`}
                                                size={80}
                                            />
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                                                VERIFIED ON POLYGON BLOCKCHAIN • #{selectedCert?.txHash.slice(0, 12)}...
                                            </p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentPortal;
