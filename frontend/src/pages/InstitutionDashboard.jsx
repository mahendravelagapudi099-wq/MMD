import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { db, auth } from "../utils/firebase";
import {
    collection,
    doc,
    setDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp
} from "firebase/firestore";
import { issueCertificateOnChain, connectWallet, getTransactionHistory } from "../utils/blockchain";
import { generateCertId, hashCertificateData, formatDate } from "../utils/helpers";
import { sendCertificateEmail } from "../utils/emailUtils";
import { onAuthStateChanged } from "firebase/auth";
import {
    PlusCircle,
    Search,
    Download,
    ShieldCheck,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2,
    QrCode,
    ChevronLeft,
    ChevronRight,
    Filter,
    BarChart3,
    Users,
    Calendar,
    Zap,
    History,
    Mail
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const InstitutionDashboard = () => {
    // --- State ---
    const [formData, setFormData] = useState({
        studentName: "",
        studentId: "",
        courseName: "",
        grade: "First Class",
        issueDate: new Date().toISOString().split("T")[0],
        email: "",
        institutionName: "MDM Maritime Academy"
    });

    const [loading, setLoading] = useState(false);
    const [issuingStep, setIssuingStep] = useState(0); // 1: Hashing, 2: Chain, 3: Confirm, 4: DB, 5: Done
    const [showConfirm, setShowConfirm] = useState(false);
    const [successData, setSuccessData] = useState(null);
    const [error, setError] = useState("");
    const [walletAddress, setWalletAddress] = useState("");

    const [certificates, setCertificates] = useState([]);
    const [txHistory, setTxHistory] = useState([]);
    const [stats, setStats] = useState({ total: 0, month: 0, today: 0, pending: 0, rate: 100 });
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [txLimit, setTxLimit] = useState(3);
    const [loadingTx, setLoadingTx] = useState(false);
    const itemsPerPage = 10;

    // --- Fetch Data ---
    const fetchCertificates = async (userId) => {
        const uid = userId || auth.currentUser?.uid;
        if (!uid) return;

        try {
            const q = query(
                collection(db, "certificates"),
                where("issuerId", "==", uid)
            );
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)); // Sort client-side to avoid index requirement

            setCertificates(data);
            calculateStats(data);
            fetchTxHistory();
        } catch (err) {
            console.error("Error fetching certificates:", err);
        }
    };

    const fetchTxHistory = async (newLimit = txLimit) => {
        setLoadingTx(true);
        try {
            const history = await getTransactionHistory(newLimit);
            setTxHistory(history);
            setTxLimit(newLimit);
        } finally {
            setLoadingTx(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchCertificates(user.uid);
            } else {
                setCertificates([]);
                setStats({ total: 0, month: 0, today: 0, pending: 0, rate: 100 });
            }
        });

        checkConnection();

        if (window.ethereum) {
            window.ethereum.on("accountsChanged", (accounts) => {
                setWalletAddress(accounts[0] || "");
            });
        }

        return () => unsubscribe();
    }, []);

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

    const calculateStats = (data) => {
        const now = new Date();
        const today = now.toISOString().split("T")[0];
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const statsObj = {
            total: data.length,
            today: data.filter(c => c.issueDate === today).length,
            month: data.filter(c => {
                const d = new Date(c.issueDate);
                return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
            }).length,
            pending: data.filter(c => c.status === "pending").length,
            rate: data.length > 0 ? (data.filter(c => c.status === "confirmed").length / data.length) * 100 : 100
        };
        setStats(statsObj);
    };

    // --- Handlers ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        if (!formData.studentName || !formData.studentId || !formData.courseName || !formData.issueDate) {
            setError("Please fill in all required fields.");
            return false;
        }
        if (new Date(formData.issueDate) > new Date()) {
            setError("Issue date cannot be in the future.");
            return false;
        }
        return true;
    };

    const startIssuance = (e) => {
        e.preventDefault();
        if (validate()) {
            setError("");
            setShowConfirm(true);
        }
    };

    const processIssuance = async () => {
        setShowConfirm(false);
        setLoading(true);
        setError("");
        setIssuingStep(1); // Hashing

        try {
            const certId = generateCertId();
            const certHash = hashCertificateData({ ...formData, certId });

            setIssuingStep(2); // Connecting to blockchain
            let currentAddr = walletAddress;
            if (!currentAddr) {
                currentAddr = await connectWallet();
                if (!currentAddr) throw new Error("Please connect MetaMask.");
                setWalletAddress(currentAddr);
            }

            setIssuingStep(3); // Submitting transaction
            const tx = await issueCertificateOnChain(certId, certHash);

            setIssuingStep(4); // Waiting for confirmation
            const receipt = await tx.wait();

            setIssuingStep(5); // Saving to database
            const certData = {
                certId,
                ...formData,
                certHash,
                txHash: receipt.hash,
                blockNumber: Number(receipt.blockNumber),
                issuerAddress: walletAddress,
                issuerId: auth.currentUser.uid,
                timestamp: serverTimestamp(),
                status: "confirmed"
            };

            await setDoc(doc(db, "certificates", certId), certData);

            // Trigger Automated Email (Step 1 of Workflow)
            if (certData.email) {
                try {
                    await sendCertificateEmail(certData);
                } catch (emailErr) {
                    console.error("Auto-email failed:", emailErr);
                    // We don't block the UI success for email failure, but we log it.
                }
            }

            setSuccessData(certData);
            setIssuingStep(6); // Done
            setFormData(prev => ({
                studentName: "",
                studentId: "",
                courseName: "",
                grade: "First Class",
                issueDate: new Date().toISOString().split("T")[0],
                email: "",
                institutionName: prev.institutionName
            }));
            fetchCertificates();
        } catch (err) {
            console.error(err);
            setError(err.reason || err.message || "Failed to issue certificate.");
            setIssuingStep(0);
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        const headers = ["Cert ID,Student Name,Student ID,Course,Grade,Issue Date,Hash,TxHash\n"];
        const rows = certificates.map(c =>
            `${c.certId},${c.studentName},${c.studentId},${c.courseName},${c.grade},${c.issueDate},${c.certHash},${c.txHash}`
        ).join("\n");

        const blob = new Blob([headers + rows], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Certificates_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
    };

    // --- Filtered Data ---
    const filteredCerts = useMemo(() => {
        return certificates.filter(c => {
            const matchesSearch = c.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.certId.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDate = filterDate ? c.issueDate === filterDate : true;
            return matchesSearch && matchesDate;
        });
    }, [certificates, searchTerm, filterDate]);

    const paginatedCerts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredCerts.slice(start, start + itemsPerPage);
    }, [filteredCerts, currentPage]);

    const totalPages = Math.ceil(filteredCerts.length / itemsPerPage);

    // --- Sub-components ---
    const StepIndicator = ({ step, label, currentStep }) => (
        <div className={`flex items-center space-x-3 transition-all ${currentStep >= step ? 'text-primary font-bold' : 'text-gray-300'}`}>
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs border-2 ${currentStep > step ? 'bg-primary border-primary text-white' :
                currentStep === step ? 'border-primary animate-pulse' : 'border-gray-200'
                }`}>
                {currentStep > step ? "✓" : step}
            </div>
            <span className="text-sm">{label}</span>
            {currentStep === step && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
    );

    return (
        <div className="py-8 space-y-10 max-w-7xl mx-auto px-4">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="h-10 w-10 text-primary" />
                        Registry Management
                    </h1>
                    <p className="text-gray-500 font-medium">Issue, manage, and track blockchain-verified credentials.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    {walletAddress ? (
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end text-right pr-2 border-r border-gray-100">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Wallet</span>
                                <span className="text-[11px] font-mono font-bold text-gray-900 truncate w-24">
                                    {walletAddress}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-xl">
                                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-success">Shield Active</span>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={handleConnect}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-black text-xs hover:bg-blue-600 transition shadow-lg shadow-blue-100 active:scale-95"
                        >
                            <Zap className="h-3 w-3 fill-white" />
                            Connect MetaMask
                        </button>
                    )}
                </div>
            </header>

            {/* Stats Board */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: "Total Certificates", val: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Issued This Month", val: stats.month, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
                    { label: "Issued Today", val: stats.today, icon: Zap, color: "text-yellow-600", bg: "bg-yellow-50" },
                    { label: "Pending", val: stats.pending, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
                    { label: "Success Rate", val: `${Math.round(stats.rate)}%`, icon: BarChart3, color: "text-green-600", bg: "bg-green-50" },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition group">
                        <div className={`h-10 w-10 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition`}>
                            <s.icon className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
                        <p className="text-2xl font-black text-gray-900">{s.val}</p>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-10">
                {/* Issuance Form */}
                <section className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <ShieldCheck className="h-32 w-32" />
                    </div>

                    <div className="space-y-2 relative">
                        <h2 className="text-2xl font-black text-gray-900">Issue Certificate</h2>
                        <p className="text-sm text-gray-500">Create a permanent record for a student.</p>
                    </div>

                    <form onSubmit={startIssuance} className="space-y-5">
                        <div className="grid gap-5">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Student Name</label>
                                <input
                                    type="text"
                                    name="studentName"
                                    required
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-50 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    placeholder="e.g. John Doe"
                                    value={formData.studentName}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Institution Name</label>
                                <input
                                    type="text"
                                    name="institutionName"
                                    required
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-50 rounded-2xl focus:bg-white focus:border-primary transition-all outline-none"
                                    placeholder="e.g. MREM College"
                                    value={formData.institutionName}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Student ID</label>
                                <input
                                    type="text"
                                    name="studentId"
                                    required
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-50 rounded-2xl focus:bg-white focus:border-primary transition-all outline-none uppercase font-bold tracking-tight"
                                    placeholder="e.g. CS2024001"
                                    value={formData.studentId}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Course Name</label>
                                <input
                                    type="text"
                                    name="courseName"
                                    required
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-50 rounded-2xl focus:bg-white focus:border-primary transition-all outline-none"
                                    placeholder="e.g. Full Stack Development"
                                    value={formData.courseName}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Grade</label>
                                    <select
                                        name="grade"
                                        className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-50 rounded-2xl focus:bg-white focus:border-primary transition-all outline-none"
                                        value={formData.grade}
                                        onChange={handleInputChange}
                                        disabled={loading}
                                    >
                                        <option>First Class</option>
                                        <option>Second Class</option>
                                        <option>Third Class</option>
                                        <option>Pass</option>
                                        <option>Distinction</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Issue Date</label>
                                    <input
                                        type="date"
                                        name="issueDate"
                                        required
                                        className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-50 rounded-2xl focus:bg-white focus:border-primary transition-all outline-none"
                                        value={formData.issueDate}
                                        onChange={handleInputChange}
                                        max={new Date().toISOString().split("T")[0]}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email (Optional)</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-50 rounded-2xl focus:bg-white focus:border-primary transition-all outline-none"
                                    placeholder="student@example.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-600 transition flex items-center justify-center space-x-3 shadow-xl shadow-blue-100 disabled:opacity-50 active:scale-95"
                        >
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <PlusCircle className="h-6 w-6" />}
                            <span>{loading ? "Processing..." : "Issue to Blockchain"}</span>
                        </button>
                    </form>

                    {/* Transaction Steps */}
                    {issuingStep > 0 && issuingStep < 6 && (
                        <div className="pt-4 space-y-4 border-t border-gray-50 animate-in fade-in slide-in-from-bottom-2">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Transaction Pulse</h4>
                            <div className="space-y-3">
                                <StepIndicator step={1} label="Calculating Hash" currentStep={issuingStep} />
                                <StepIndicator step={2} label="Blockchain Connection" currentStep={issuingStep} />
                                <StepIndicator step={3} label="Submitting to Polygon" currentStep={issuingStep} />
                                <StepIndicator step={4} label="Waiting Confirmation" currentStep={issuingStep} />
                                <StepIndicator step={5} label="Global Storage" currentStep={issuingStep} />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 border-l-4 border-error rounded-r-2xl text-error text-xs font-bold animate-in bounce-in">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                <span>{error}</span>
                            </div>
                        </div>
                    )}
                </section>

                {/* Registry Explorer & Mini Explorer */}
                <section className="lg:col-span-2 space-y-8">
                    {/* Mini Explorer Card */}
                    <div className="bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden text-white border border-white/5">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <History className="h-24 w-24" />
                        </div>

                        <div className="flex items-center justify-between mb-8 relative">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center">
                                    <History className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">Mini Explorer</h3>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Local Transaction Pulse</p>
                                </div>
                            </div>
                            <button
                                onClick={fetchTxHistory}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition border border-white/10"
                            >
                                Refresh
                            </button>
                        </div>

                        <div className="space-y-4 relative">
                            {loadingTx && (
                                <div className="absolute inset-0 bg-gray-900/10 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
                                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                </div>
                            )}
                            {txHistory.length > 0 ? (
                                <>
                                    {txHistory.map((tx, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 group hover:border-primary/50 transition duration-300">
                                            <div className="flex items-center gap-4">
                                                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                                                <div className="max-w-[200px] md:max-w-xs">
                                                    <p className="font-mono text-[10px] text-gray-300 group-hover:text-white transition truncate">{tx.hash}</p>
                                                    <p className="text-[9px] font-black text-gray-500 uppercase flex items-center gap-2">
                                                        <span>Block #{tx.blockNumber}</span>
                                                        <span className="opacity-20">•</span>
                                                        <span>{new Date(tx.timestamp * 1000).toLocaleTimeString()}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="px-3 py-1 bg-success/10 text-success text-[8px] font-black uppercase tracking-widest rounded-lg flex-shrink-0">
                                                Confirmed
                                            </span>
                                        </div>
                                    ))}
                                    {txHistory.length >= txLimit && (
                                        <button
                                            onClick={() => fetchTxHistory(txLimit + 3)}
                                            className="w-full py-3 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400 rounded-xl border border-dashed border-white/10 transition"
                                        >
                                            Load More History
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="py-10 text-center opacity-30">
                                    <History className="h-10 w-10 mx-auto mb-2" />
                                    <p className="text-[10px] font-black uppercase">No local transactions found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                                <input
                                    type="text"
                                    placeholder="Search by student, ID or certificate ref..."
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="date"
                                        className="pl-9 pr-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white transition-all"
                                        value={filterDate}
                                        onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
                                    />
                                </div>
                                <button
                                    onClick={exportCSV}
                                    className="flex items-center space-x-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition shadow-lg active:scale-95"
                                >
                                    <Download className="h-4 w-4" />
                                    <span>Export</span>
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
                                        <th className="pb-4 px-2">Cert ID</th>
                                        <th className="pb-4">Student</th>
                                        <th className="pb-4">Course</th>
                                        <th className="pb-4 text-center">Date</th>
                                        <th className="pb-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedCerts.map((cert) => (
                                        <tr key={cert.id} className="group hover:bg-gray-50/50 transition duration-300">
                                            <td className="py-5 px-2">
                                                <Link to={`/verify/${cert.certId}`} className="text-primary font-black hover:underline tracking-tight">
                                                    {cert.certId.split('-').slice(-1)}
                                                </Link>
                                            </td>
                                            <td className="py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900">{cert.studentName}</span>
                                                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-tight">{cert.studentId}</span>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-600 truncate max-w-[150px]">{cert.courseName}</span>
                                                    <span className="text-[10px] text-primary italic font-bold">{cert.grade}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 text-center text-xs font-bold text-gray-500">
                                                {formatDate(cert.issueDate)}
                                            </td>
                                            <td className="py-5 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${cert.status === 'confirmed' ? 'bg-green-100 text-success' : 'bg-orange-100 text-orange-600'
                                                    }`}>
                                                    {cert.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedCerts.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="py-20 text-center">
                                                <div className="flex flex-col items-center opacity-20">
                                                    <QrCode className="h-16 w-16 mb-2" />
                                                    <p className="font-black">No records found matching your search</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                                <p className="text-xs font-bold text-gray-400">
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCerts.length)} of {filteredCerts.length}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-20 transition"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <span className="text-sm font-black w-8 text-center">{currentPage}</span>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-20 transition"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="text-center space-y-4">
                            <div className="h-20 w-20 bg-blue-50 text-primary rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                                <ShieldCheck className="h-10 w-10" />
                            </div>
                            <h3 className="text-3xl font-black text-gray-900">Verify & Issue</h3>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                You are about to anchor this certificate to the blockchain. This action is <span className="text-gray-900 font-bold underline">permanent and immutable</span>.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-3xl p-6 space-y-4">
                            <div className="flex justify-between items-center px-2">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Student</span>
                                <span className="font-bold text-gray-900">{formData.studentName}</span>
                            </div>
                            <div className="flex justify-between items-center px-2">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Course</span>
                                <span className="font-bold text-gray-900">{formData.courseName}</span>
                            </div>
                            <div className="flex justify-between items-center px-2">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Institution</span>
                                <span className="font-bold text-gray-900">{formData.institutionName}</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-4 px-6 rounded-2xl font-black border-2 border-gray-100 text-gray-400 hover:bg-gray-50 transition active:scale-95"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={processIssuance}
                                className="flex-1 py-4 px-6 rounded-2xl font-black bg-primary text-white hover:bg-blue-600 shadow-xl shadow-blue-100 transition active:scale-95"
                            >
                                Confirm Issuance
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {successData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3.5rem] p-12 max-w-xl w-full shadow-2xl space-y-10 relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 right-0 p-12 bg-green-50 rounded-bl-[5rem] -mr-16 -mt-16 pointer-events-none" />

                        <div className="text-center space-y-3 relative z-10">
                            <CheckCircle className="h-16 w-16 text-success mx-auto drop-shadow-lg" />
                            <h3 className="text-4xl font-black text-gray-900 tracking-tight">Success!</h3>
                            <p className="text-gray-500 font-medium">
                                The certificate has been anchored successfully.
                                {successData.email && " An automated notification has been sent to the student."}
                            </p>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-10 bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100">
                            <div className="bg-white p-4 rounded-3xl shadow-lg shadow-gray-200/50 hover:scale-105 transition duration-500">
                                <QRCodeSVG
                                    value={`${window.location.origin}/verify/${successData.certId}`}
                                    size={140}
                                    level={"H"}
                                    includeMargin={true}
                                />
                            </div>
                            <div className="space-y-4 flex-1">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Registry ID</label>
                                    <p className="font-mono text-lg font-black text-primary tracking-tighter">{successData.certId}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Student</label>
                                    <p className="font-bold text-gray-900">{successData.studentName}</p>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Link
                                        to={`/verify/${successData.certId}`}
                                        className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-xs font-black text-center hover:bg-black transition"
                                    >
                                        View On-Chain
                                    </Link>
                                    <a
                                        href={`mailto:${successData.email}?subject=Your Certificate is Ready!&body=Hello ${successData.studentName}, your certificate for ${successData.courseName} from ${successData.institutionName} has been issued and anchored on the blockchain. Verifiable at: ${window.location.origin}/verify/${successData.certId}`}
                                        className="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-black text-center hover:bg-blue-600 transition flex items-center justify-center gap-2"
                                    >
                                        <Mail className="h-3 w-3" />
                                        Share to Student
                                    </a>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setSuccessData(null)}
                            className="w-full py-5 rounded-[1.8rem] font-black bg-white border-4 border-gray-100 text-gray-900 hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm active:scale-95"
                        >
                            Done, Return to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstitutionDashboard;
