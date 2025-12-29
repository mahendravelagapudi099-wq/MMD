import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { db } from "../utils/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getTransactionStatus, getProvider, getContract, getExplorerUrl, connectWallet } from "../utils/blockchain";
import { hashCertificateData, formatDate } from "../utils/helpers";
import {
    ShieldCheck,
    Search,
    QrCode,
    AlertCircle,
    CheckCircle2,
    ExternalLink,
    Download,
    Loader2,
    ArrowLeft,
    Calendar,
    User,
    BookOpen,
    Hash,
    Share2,
    Printer,
    Award,
    Zap,
    History
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const VerificationPage = () => {
    const { certId: urlCertId } = useParams();
    const navigate = useNavigate();

    const [certId, setCertId] = useState(urlCertId || "");
    const [searchType, setSearchType] = useState("certId"); // certId | studentId
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0); // 1: Chain, 2: DB, 3: Hash
    const [result, setResult] = useState(null); // { valid: bool, data: {}, chain: {}, reason: string }
    const [error, setError] = useState("");
    const [showReceipt, setShowReceipt] = useState(false);
    const [explorerUrl, setExplorerUrl] = useState("");
    const [walletAddress, setWalletAddress] = useState("");

    // Manual Form States
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualData, setManualData] = useState({
        studentName: "",
        studentId: "",
        courseName: "",
        grade: ""
    });
    const [mismatchInfo, setMismatchInfo] = useState(null);

    useEffect(() => {
        if (urlCertId && urlCertId !== "public") {
            const sanitizedId = urlCertId.trim().replace(/\/$/, "");
            setCertId(sanitizedId);
            handleVerify(sanitizedId);
        } else if (urlCertId === "public") {
            setCertId("");
            setResult(null);
            setError("");
        }
        checkConnection();
    }, [urlCertId]);

    const checkConnection = async () => {
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ method: "eth_accounts" });
            if (accounts.length > 0) setWalletAddress(accounts[0]);
        }
    };

    const handleConnect = async () => {
        try {
            setError("");
            const addr = await connectWallet();
            if (addr) setWalletAddress(addr);
        } catch (err) {
            setError(err.message || "Failed to connect wallet.");
        }
    };

    const handleVerify = async (idToVerify) => {
        const targetId = (idToVerify || certId || "").trim().replace(/\/$/, "");
        if (!targetId || targetId === "public") return;

        setLoading(true);
        setResult(null);
        setError("");

        try {
            // Step 0: Find CertID if searched by StudentID
            let finalCertId = targetId;

            if (searchType === "studentId" && !idToVerify) {
                setStep(1); // Re-use step 1 label or add a "finding" label
                const q = query(collection(db, "certificates"), where("studentId", "==", targetId));
                const snap = await getDocs(q);
                if (snap.empty) {
                    setResult({ valid: false, reason: "NOT_FOUND" });
                    return;
                }
                // Take first one. In a real system, we'd handle duplicates but for now we follow ID match.
                finalCertId = snap.docs[0].id;
            }

            // Step 1: Check blockchain
            setStep(1);
            const contract = await getContract();
            if (!contract) {
                throw new Error("Blockchain provider unavailable. Please connect MetaMask.");
            }

            const chainData = await contract.verifyCertificate(finalCertId);
            const [exists, isValid, certHashOnChain] = chainData;

            if (!exists) {
                setResult({ valid: false, reason: "NOT_FOUND" });
                return;
            }

            if (!isValid) {
                setResult({ valid: false, reason: "REVOKED" });
                return;
            }

            // Step 2: Get details from DB
            setStep(2);
            const certDoc = await getDoc(doc(db, "certificates", finalCertId));
            if (!certDoc.exists()) {
                setResult({ valid: false, reason: "METADATA_MISSING" });
                return;
            }
            const dbData = certDoc.data();

            // Step 3: Verify Hash Integrity
            setStep(3);
            const calculatedHash = hashCertificateData({
                studentName: dbData.studentName,
                studentId: dbData.studentId,
                courseName: dbData.courseName,
                grade: dbData.grade,
                issueDate: dbData.issueDate,
                email: dbData.email,
                certId: finalCertId
            });

            if (calculatedHash !== certHashOnChain) {
                setResult({ valid: false, reason: "TAMPERED" });
                return;
            }

            // Success
            setResult({
                valid: true,
                data: dbData,
                chain: {
                    hash: certHashOnChain,
                    txHash: dbData.txHash,
                    blockNumber: dbData.blockNumber,
                    timestamp: dbData.timestamp?.toDate() || new Date(dbData.issueDate)
                }
            });

            const url = await getExplorerUrl("tx", dbData.txHash);
            setExplorerUrl(url);

        } catch (err) {
            console.error(err);
            setError(err.message || "An unexpected error occurred during verification.");
        } finally {
            setLoading(false);
            setStep(0);
        }
    };

    const handleManualVerify = async () => {
        if (!certId || !manualData.studentName || !manualData.studentId || !manualData.courseName || !manualData.grade) {
            setError("Please fill in all fields.");
            return;
        }

        setLoading(true);
        setResult(null);
        setError("");
        setMismatchInfo(null);

        try {
            let actualCertId = certId;

            // If user provides Student ID in the "Cert ID" box or we are in manual, 
            // we should try to resolve it if it's not a valid CertID format
            if (!actualCertId.startsWith('CERT-')) {
                const q = query(collection(db, "certificates"), where("studentId", "==", certId));
                const snap = await getDocs(q);
                if (!snap.empty) actualCertId = snap.docs[0].id;
            }

            // Step 1: Check blockchain
            setStep(1);
            const contract = await getContract();
            if (!contract) throw new Error("Blockchain provider unavailable.");

            const chainData = await contract.verifyCertificate(actualCertId);
            const [exists, isValid, certHashOnChain] = chainData;

            if (!exists) {
                setResult({ valid: false, reason: "NOT_FOUND" });
                return;
            }

            // Step 2: Get DB details
            setStep(2);
            const certDoc = await getDoc(doc(db, "certificates", actualCertId));
            const dbData = certDoc.exists() ? certDoc.data() : null;

            // Step 3: Hash manual inputs
            setStep(3);
            const manualHash = hashCertificateData({
                ...manualData,
                certId: actualCertId,
                issueDate: dbData?.issueDate || "",
                email: dbData?.email || ""
            });

            if (manualHash === certHashOnChain) {
                setResult({
                    valid: true,
                    data: dbData || { ...manualData, certId: actualCertId },
                    chain: {
                        hash: certHashOnChain,
                        txHash: dbData?.txHash || "0x...",
                        blockNumber: dbData?.blockNumber || 0
                    }
                });
            } else {
                setMismatchInfo({
                    submitted: manualData,
                    original: dbData || null
                });
                setResult({ valid: false, reason: "TAMPERED" });
            }

        } catch (err) {
            console.error(err);
            setError(err.message || "Manual verification failed.");
        } finally {
            setLoading(false);
            setStep(0);
        }
    };

    const generateReport = async () => {
        const element = document.getElementById("verification-report");
        if (!element) return;

        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Verification_Report_${result.data.certId}.pdf`);
        } catch (err) {
            console.error("PDF Fail:", err);
        }
    };



    return (
        <div className="min-h-[80vh]">
            {loading ? <LoadingState step={step} /> :
                result ? (result.valid ?
                    <ValidResult
                        result={result}
                        setResult={setResult}
                        generateReport={generateReport}
                        setShowReceipt={setShowReceipt}
                    /> :
                    <InvalidResult
                        result={result}
                        setResult={setResult}
                        setMismatchInfo={setMismatchInfo}
                        mismatchInfo={mismatchInfo}
                        certId={certId}
                    />) :
                    <SearchState
                        isManualMode={isManualMode}
                        setIsManualMode={setIsManualMode}
                        searchType={searchType}
                        setSearchType={setSearchType}
                        certId={certId}
                        setCertId={setCertId}
                        manualData={manualData}
                        setManualData={setManualData}
                        handleVerify={handleVerify}
                        handleManualVerify={handleManualVerify}
                        walletAddress={walletAddress}
                        handleConnect={handleConnect}
                    />}

            {error && !loading && (
                <div className="max-w-md mx-auto mt-8 p-4 bg-red-50 border-l-4 border-error text-error rounded-r-2xl text-xs font-bold flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Internal Receipt Modal */}
            {showReceipt && result && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] p-10 max-w-2xl w-full shadow-2xl space-y-8 relative overflow-hidden animate-in zoom-in-95">
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                            <History className="h-40 w-40" />
                        </div>

                        <div className="flex items-center justify-between border-b border-gray-100 pb-6 relative">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                    <ShieldCheck className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Ledger Receipt</h3>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">On-Chain Proof of Existence</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowReceipt(false)}
                                className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center hover:bg-gray-100 transition"
                            >
                                <ArrowLeft className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                            <ReceiptRow label="Transaction Hash" value={result.chain.txHash} mono />
                            <ReceiptRow label="Block Number" value={`#${result.chain.blockNumber}`} />
                            <ReceiptRow label="Network Status" value="Confirmed (Local)" status="success" />
                            <ReceiptRow label="Verification Date" value={new Date().toLocaleString()} />
                        </div>

                        <div className="p-6 bg-gray-900 rounded-[2rem] space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cryptographic Seal</label>
                            <p className="font-mono text-[10px] text-gray-400 break-all leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10">
                                {result.chain.hash}
                            </p>
                        </div>

                        <div className="flex gap-4">
                            {!explorerUrl.includes('local-proof') && (
                                <a
                                    href={explorerUrl}
                                    target="_blank"
                                    className="flex-1 py-4 bg-gray-900 text-white rounded-2xl text-center font-black text-xs hover:bg-black transition flex items-center justify-center gap-2"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    External Explorer
                                </a>
                            )}
                            <button
                                onClick={() => setShowReceipt(false)}
                                className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-xs hover:bg-blue-600 transition shadow-xl shadow-blue-100"
                            >
                                Close Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SearchState = ({
    isManualMode,
    setIsManualMode,
    searchType,
    setSearchType,
    certId,
    setCertId,
    manualData,
    setManualData,
    handleVerify,
    handleManualVerify,
    walletAddress,
    handleConnect
}) => (
    <div className="max-w-2xl mx-auto space-y-12 py-12 px-4">
        <div className="text-center space-y-4">
            <div className="h-24 w-24 bg-blue-50 text-primary rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="h-12 w-12" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">Public Registry</h1>
            <p className="text-gray-500 font-medium text-base md:text-lg">Instant cryptographic verification of MDM credentials.</p>

            {!walletAddress && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-4">
                    <button
                        onClick={handleConnect}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-black text-xs hover:bg-blue-600 transition shadow-lg shadow-blue-100 active:scale-95"
                    >
                        <Zap className="h-3 w-3 fill-white" />
                        Connect MetaMask to Verify
                    </button>
                    <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Required for On-Chain Validation</p>
                </div>
            )}
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 space-y-8">
            <div className="flex bg-gray-50 p-1.5 rounded-2xl relative items-center gap-1.5">
                <button
                    onClick={() => setIsManualMode(false)}
                    className={`flex-1 py-3 px-2 md:px-4 rounded-xl text-[10px] md:text-sm font-black transition-all ${!isManualMode ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                    Search ID
                </button>
                <button
                    onClick={() => setIsManualMode(true)}
                    className={`flex-1 py-3 px-2 md:px-4 rounded-xl text-[10px] md:text-sm font-black transition-all ${isManualMode ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                    Claim Checker
                </button>
                <Link
                    to="/scan"
                    className="h-10 w-10 md:h-12 md:w-12 bg-white border border-gray-100 rounded-xl md:rounded-2xl flex items-center justify-center text-gray-400 hover:text-primary transition shadow-md hover:shadow-primary/10 group flex-shrink-0"
                    title="Scan QR Code"
                >
                    <QrCode className="h-5 w-5 md:h-6 md:w-6 group-hover:scale-110 transition-transform font-bold" />
                </Link>
            </div>

            {!isManualMode ? (
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-end px-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Search By Field</label>
                            <select
                                className="text-[10px] font-black uppercase text-primary bg-transparent outline-none cursor-pointer"
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value)}
                            >
                                <option value="certId">Certificate ID</option>
                                <option value="studentId">Student ID</option>
                            </select>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-300 group-focus-within:text-primary transition" />
                            <input
                                autoFocus
                                type="text"
                                placeholder={searchType === "certId" ? "CERT-2024..." : "MRG-2025..."}
                                className="w-full pl-16 pr-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-blue-100 transition-all outline-none text-lg font-bold tracking-tight"
                                value={certId}
                                onChange={(e) => setCertId(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => handleVerify()}
                        className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xl hover:bg-blue-600 transition shadow-xl shadow-blue-100 flex items-center justify-center space-x-3 active:scale-95"
                    >
                        <span>Verify {searchType === "certId" ? "ID" : "Student"}</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-5 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <ManualInput label="Certificate ID" placeholder="CERT-..." value={certId} onChange={(v) => setCertId(v)} />
                        <ManualInput label="Student ID" placeholder="MRG-..." value={manualData.studentId} onChange={(v) => setManualData({ ...manualData, studentId: v })} />
                        <ManualInput label="Full Name" placeholder="Student Name" value={manualData.studentName} onChange={(v) => setManualData({ ...manualData, studentName: v })} />
                        <ManualInput label="Course" placeholder="Course Name" value={manualData.courseName} onChange={(v) => setManualData({ ...manualData, courseName: v })} />
                        <div className="md:col-span-2">
                            <ManualInput label="Grade / Status" placeholder="e.g. First Class" value={manualData.grade} onChange={(v) => setManualData({ ...manualData, grade: v })} />
                        </div>
                    </div>
                    <button
                        onClick={handleManualVerify}
                        className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xl hover:bg-blue-600 transition shadow-xl shadow-blue-100 flex items-center justify-center space-x-3 active:scale-95 mt-4"
                    >
                        <Zap className="h-6 w-6 fill-white" />
                        <span>Run Security Check</span>
                    </button>
                </div>
            )}

            <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-gray-300">Identity Trust</span>
                <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <div className="flex justify-center flex-wrap gap-8 opacity-40 grayscale">
                <div className="flex items-center space-x-2">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Ethereum Security</span>
                </div>
                <div className="flex items-center space-x-2">
                    <Award className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Global Standards</span>
                </div>
            </div>
        </div>
    </div>
);

const LoadingState = ({ step }) => (
    <div className="max-w-md mx-auto py-24 text-center space-y-10">
        <div className="relative h-32 w-32 mx-auto">
            <div className="absolute inset-0 border-8 border-gray-50 rounded-full" />
            <div className="absolute inset-0 border-8 border-primary border-t-transparent rounded-full animate-spin" />
            <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 text-primary animate-pulse" />
        </div>

        <div className="space-y-6">
            <h2 className="text-3xl font-black text-gray-900">Validating Cryptography</h2>
            <div className="space-y-3 px-12">
                <StepItem label="Checking Ledger" active={step === 1} done={step > 1} />
                <StepItem label="Retrieving Metadata" active={step === 2} done={step > 2} />
                <StepItem label="Analyzing Integrity" active={step === 3} done={step > 3} />
            </div>
        </div>
    </div>
);

const StepItem = ({ label, active, done }) => (
    <div className={`flex items-center space-x-3 transition-opacity ${active ? 'opacity-100' : 'opacity-40'}`}>
        <div className={`h-2 w-2 rounded-full ${done ? 'bg-success' : active ? 'bg-primary animate-ping' : 'bg-gray-300'}`} />
        <span className={`text-xs font-black uppercase tracking-widest ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
    </div>
);

const ValidResult = ({ result, setResult, generateReport, setShowReceipt }) => (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Status Banner */}
        <div className="bg-success/5 border-2 border-success/20 p-8 rounded-[3rem] flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="h-20 w-20 bg-success text-white rounded-[2rem] flex items-center justify-center shadow-lg shadow-green-100">
                <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="flex-1 space-y-1">
                <h2 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    Status: VERIFIED
                    <span className="text-success text-3xl">✅</span>
                </h2>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Certificate: <span className="text-success">AUTHENTIC</span></p>
            </div>
            <button
                onClick={() => setResult(null)}
                className="px-6 py-3 bg-white border-2 border-gray-100 rounded-2xl text-xs font-black text-gray-400 hover:text-gray-900 transition"
            >
                Verify Another
            </button>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
            {/* Registry Details */}
            <section className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-50 space-y-10">
                <div className="flex items-center space-x-3 pb-6 border-b border-gray-50">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-black text-gray-900">Registry Details</h3>
                </div>

                <div className="space-y-6">
                    <DetailRow icon={User} label="Recipient" value={result.data.studentName} subValue={result.data.studentId} />
                    <DetailRow icon={Award} label="Course" value={result.data.courseName} />
                    <DetailRow icon={Hash} label="Grade / Status" value={result.data.grade} />
                    <DetailRow icon={Calendar} label="Issue Date" value={formatDate(result.data.issueDate)} />
                </div>
            </section>

            {/* Blockchain Proof - STRONG EVIDENCE */}
            <section className="bg-gray-900 p-10 rounded-[3rem] shadow-2xl text-white space-y-10 relative overflow-hidden ring-4 ring-primary/20">
                <div className="absolute top-0 right-0 p-10 opacity-5">
                    <Zap className="h-32 w-32" />
                </div>

                <div className="flex items-center justify-between border-b border-white/10 pb-6 relative">
                    <div className="flex items-center space-x-3">
                        <History className="h-6 w-6 text-primary" />
                        <h3 className="text-xl font-black italic tracking-tight">Blockchain Truth</h3>
                    </div>
                    <div className="px-3 py-1 bg-primary/20 rounded-lg border border-primary/50 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-primary">Live State</span>
                    </div>
                </div>

                <div className="space-y-6 relative">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Global ID</label>
                        <p className="font-mono text-xs text-primary font-bold break-all mt-1">{result.data.certId}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Transaction</label>
                            <p className="font-mono text-[10px] text-gray-300 truncate mt-1">{result.chain.txHash}</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Block</label>
                            <p className="font-mono text-[10px] text-gray-300 mt-1">#{result.chain.blockNumber}</p>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cryptographic Hash</label>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mt-2">
                            <p className="font-mono text-[10px] text-gray-400 break-all leading-relaxed">{result.chain.hash}</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex gap-4 relative">
                    <button
                        onClick={() => setShowReceipt(true)}
                        className="flex-1 bg-white text-gray-900 py-4 rounded-2xl font-black text-xs text-center hover:bg-gray-100 transition flex items-center justify-center gap-2 shadow-xl shadow-black/20"
                    >
                        <History className="h-4 w-4" />
                        Internal Receipt
                    </button>
                    <button
                        onClick={generateReport}
                        className="flex-1 bg-primary text-white py-4 rounded-2xl font-black text-xs text-center hover:bg-blue-600 transition flex items-center justify-center gap-2"
                    >
                        <Printer className="h-4 w-4" />
                        Get Report
                    </button>
                </div>
            </section>
        </div>

        {/* Hidden Report for PDF */}
        <div className="fixed -left-[2000px] top-0 shadow-none pointer-events-none">
            <div id="verification-report" className="w-[800px] p-20 bg-white border-[20px] border-blue-50 space-y-12">
                <div className="flex justify-between items-center">
                    <ShieldCheck className="h-12 w-12 text-primary" />
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Verification Report</p>
                        <p className="text-xs font-mono text-gray-500">Generated: {new Date().toLocaleString()}</p>
                    </div>
                </div>

                <div className="space-y-4 text-center">
                    <h1 className="text-4xl font-black text-gray-900">Certificate Status: VALID</h1>
                    <p className="text-success font-bold">Cryptographically Verified on Polygon Blockchain</p>
                </div>

                <div className="grid grid-cols-2 gap-10 border-t border-b border-gray-100 py-10">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Merit Details</p>
                        <p className="font-bold">Student: {result.data.studentName}</p>
                        <p className="font-bold">Course: {result.data.courseName}</p>
                        <p className="font-bold">ID: {result.data.certId}</p>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Network Info</p>
                        <p className="text-xs font-mono break-all">TX: {result.chain.txHash}</p>
                        <p className="text-xs font-mono">Block: {result.chain.blockNumber}</p>
                        <p className="text-xs font-mono break-all">Hash: {result.chain.hash}</p>
                    </div>
                </div>

                <div className="text-center pt-8">
                    <p className="text-[8px] font-black uppercase tracking-[0.5em] text-gray-200">
                        MDM - MERIT DOCUMENTATION MANAGEMENT • SECURE REGISTRY
                    </p>
                </div>
            </div>
        </div>
    </div>
);

const InvalidResult = ({ result, setResult, setMismatchInfo, mismatchInfo, certId }) => (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-10 animate-in zoom-in-95">
        {/* Security Alert Banner */}
        <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[3rem] flex flex-col md:flex-row items-center gap-6 text-center md:text-left shadow-2xl shadow-red-100/50">
            <div className="h-20 w-20 bg-error text-white rounded-[2rem] flex items-center justify-center shadow-lg shadow-red-200 animate-pulse">
                <AlertCircle className="h-10 w-10" />
            </div>
            <div className="flex-1 space-y-1">
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">
                    {result.reason === "TAMPERED" ? "FAKE DETECTED" : "Verification Failed"}
                </h2>
                <p className="text-error font-bold">
                    {result.reason === "TAMPERED" ? "Security Alert: Data mismatch with blockchain record." : "We couldn't validate this credential."}
                </p>
            </div>
            <button
                onClick={() => { setResult(null); setMismatchInfo(null); }}
                className="px-6 py-3 bg-white border-2 border-gray-100 rounded-2xl text-xs font-black text-gray-400 hover:text-gray-900 transition"
            >
                Back to Search
            </button>
        </div>

        {result.reason === "TAMPERED" && mismatchInfo && (
            <div className="grid md:grid-cols-2 gap-8">
                {/* Scenario B Comparison */}
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-dashed border-red-100 space-y-6">
                    <div className="flex items-center space-x-3 text-error">
                        <AlertCircle className="h-5 w-5" />
                        <h3 className="text-lg font-black uppercase tracking-tight">Submitted Details</h3>
                    </div>
                    <div className="space-y-4 opacity-70">
                        <StaticRow label="Student ID" value={mismatchInfo.submitted.studentId} />
                        <StaticRow label="Course Name" value={mismatchInfo.submitted.courseName} />
                        <StaticRow label="Submitted Grade" value={mismatchInfo.submitted.grade} color="text-error" />
                    </div>
                </div>

                <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl text-white space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ShieldCheck className="h-24 w-24" />
                    </div>
                    <div className="flex items-center space-x-3 text-primary relative">
                        <CheckCircle2 className="h-5 w-5" />
                        <h3 className="text-lg font-black uppercase tracking-tight">Ledger Reality</h3>
                    </div>
                    <div className="space-y-4 relative">
                        <StaticRow label="Student ID" value={mismatchInfo.original?.studentId || "Verified Record"} dark />
                        <StaticRow label="Course Name" value={mismatchInfo.original?.courseName || "Authentic Merit"} dark />
                        <StaticRow label="Original Grade" value={mismatchInfo.original?.grade || "Different Value"} color="text-primary" dark />
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 text-left space-y-4 max-w-2xl mx-auto">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                How we detected this
            </h4>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
                Every certificate has a unique <strong>Cryptographic Seal</strong> derived from its data (Grade, Student ID, etc.).
                Even changing a single letter or a "+" to a "-" changes this seal.
                The blockchain confirms that the record for ID <span className="font-mono text-primary font-bold">{certId}</span> exists,
                but its digital seal does NOT match the details you provided.
            </p>
        </div>
    </div>
);

const DetailRow = ({ icon: Icon, label, value, subValue }) => (
    <div className="flex gap-4 group">
        <div className="h-10 w-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition">
            <Icon className="h-5 w-5" />
        </div>
        <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-300">{label}</label>
            <p className="text-base font-bold text-gray-900">{value}</p>
            {subValue && <p className="text-[10px] font-black text-primary uppercase">{subValue}</p>}
        </div>
    </div>
);

const ReceiptRow = ({ label, value, mono, status }) => (
    <div className="space-y-1">
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">{label}</label>
        <div className="flex items-center gap-2">
            <p className={`text-sm font-bold text-gray-900 ${mono ? 'font-mono break-all' : ''}`}>
                {value}
            </p>
            {status === 'success' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
        </div>
    </div>
);

const StaticRow = ({ label, value, color = "text-gray-900", dark }) => (
    <div className="space-y-0.5">
        <label className={`text-[8px] font-black uppercase tracking-widest ${dark ? 'text-gray-500' : 'text-gray-300'}`}>{label}</label>
        <p className={`text-sm font-bold ${dark && color === 'text-gray-900' ? 'text-white' : color}`}>{value}</p>
    </div>
);

const ManualInput = ({ label, placeholder, value, onChange }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
        <input
            type="text"
            placeholder={placeholder}
            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-blue-100 transition-all outline-none text-sm font-bold"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

export default VerificationPage;
