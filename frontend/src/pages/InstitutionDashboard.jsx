import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { db, auth } from "../utils/firebase";
import {
    collection,
    addDoc,
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
import { issueCertificateOnChain, revokeCertificateOnChain, connectWallet, getTransactionHistory, isAddressAuthorized, getActiveNetwork } from "../utils/blockchain";
import { generateCertId, hashCertificateData, formatDate } from "../utils/helpers";
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
    Mail,
    X,
    FileText,
    ExternalLink
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";

const InstitutionDashboard = () => {
    // --- State ---
    const [formData, setFormData] = useState({
        studentName: "",
        studentId: "",
        courseName: "",
        grade: "First Class",
        issueDate: new Date().toISOString().split("T")[0],
        email: "",
        institutionName: "MDM Maritime Academy",
        certificateType: "Permanent", // Permanent | Provisional
        studentPhotoBase64: "",
        institutionLogoBase64: ""
    });

    const [loading, setLoading] = useState(false);
    const [issuingStep, setIssuingStep] = useState(0); // 1: Hashing, 2: Blockchain, 3: IPFS, 4: Storage, 5: Done
    const [showConfirm, setShowConfirm] = useState(false);
    const [successData, setSuccessData] = useState(null);
    const [error, setError] = useState("");
    const [walletAddress, setWalletAddress] = useState("");
    const [isAuthorized, setIsAuthorized] = useState(true); // Default to true until checked
    const [activeNetwork, setActiveNetwork] = useState(getActiveNetwork());

    const [certificates, setCertificates] = useState([]);
    const [txHistory, setTxHistory] = useState([]);
    const [stats, setStats] = useState({ total: 0, month: 0, today: 0, pending: 0, rate: 100 });
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [txLimit, setTxLimit] = useState(3);
    const [loadingTx, setLoadingTx] = useState(false);
    const [revokingId, setRevokingId] = useState(null);
    const [showRevokeConfirm, setShowRevokeConfirm] = useState(null); // stores the certificate object
    const [students, setStudents] = useState([]);
    const [activeTab, setActiveTab] = useState("registry"); // "registry" | "students"
    const [showAddStudent, setShowAddStudent] = useState(false);
    const [newStudent, setNewStudent] = useState({ studentName: "", studentId: "", email: "" });
    const certificateRef = useRef(null);
    const [generatingPDF, setGeneratingPDF] = useState(false);
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
            fetchStudents(uid);
        } catch (err) {
            console.error("Error fetching certificates:", err);
        }
    };

    const fetchStudents = async (userId) => {
        const uid = userId || auth.currentUser?.uid;
        if (!uid) return;

        try {
            const q = query(
                collection(db, "students"),
                where("issuerId", "==", uid)
            );
            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(data);
        } catch (err) {
            console.error("Error fetching students:", err);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        const uid = auth.currentUser?.uid;
        if (!uid) {
            console.warn("Student addition attempted without authenticated user.");
            setError("You must be logged in to add students.");
            return;
        }

        try {
            setLoading(true);
            setError(""); // Clear previous errors

            await addDoc(collection(db, "students"), {
                ...newStudent,
                issuerId: uid,
                institutionName: formData.institutionName,
                issuerAddress: walletAddress,
                addedAt: serverTimestamp()
            });

            setShowAddStudent(false);
            setNewStudent({ studentName: "", studentId: "", email: "" });
            fetchStudents(uid);
        } catch (err) {
            console.error("Firestore Add Student Error:", err);
            setError(`Failed to add student: ${err.message || "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickIssue = (student) => {
        setFormData(prev => ({
            ...prev,
            studentName: student.studentName,
            studentId: student.studentId,
            email: student.email
        }));
        setActiveTab("registry");
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                const addr = accounts[0] || "";
                console.log(`[Dashboard] Account changed to: ${addr}`);
                setWalletAddress(addr);
                setIsAuthorized(false); // Reset until checked
                checkAuth(addr);
            });
        }

        return () => unsubscribe();
    }, []);

    const checkConnection = async () => {
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ method: "eth_accounts" });
            if (accounts.length > 0) {
                setWalletAddress(accounts[0]);
                checkAuth(accounts[0]);
            }
        }
    };

    const checkAuth = async (address) => {
        if (!address) return;
        setLoading(true);
        try {
            const authorized = await isAddressAuthorized(address);
            setIsAuthorized(authorized);
            if (!authorized) {
                setError(`Wallet ${address.substring(0, 6)}...${address.substring(38)} is not an authorized issuer.`);
            } else {
                if (error && error.includes("not an authorized issuer")) {
                    setError("");
                }
            }
        } catch (err) {
            console.error("Auth check error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            setError("");
            setLoading(true);
            const addr = await connectWallet();
            if (addr) {
                console.log(`[Dashboard] Connected to: ${addr}`);
                setWalletAddress(addr);
                await checkAuth(addr);
            }
        } catch (err) {
            console.error("[Dashboard] Connection error:", err);
            setError(err.message || "Failed to connect wallet.");
        } finally {
            setLoading(false);
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

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData(prev => ({ ...prev, [name]: event.target.result }));
            };
            reader.readAsDataURL(files[0]);
        }
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

    const handleRevoke = async (cert) => {
        setShowRevokeConfirm(null);
        setRevokingId(cert.certId);
        setError("");

        try {
            const tx = await revokeCertificateOnChain(cert.certId);
            const receipt = await tx.wait();

            // Update Firestore
            await setDoc(doc(db, "certificates", cert.certId), {
                status: "revoked",
                revokedAt: serverTimestamp(),
                revokeTxHash: receipt.hash
            }, { merge: true });

            fetchCertificates();
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to revoke certificate.");
        } finally {
            setRevokingId(null);
        }
    };

    const processIssuance = async () => {
        setError("");
        setLoading(true);

        try {
            // Force a fresh authorization check before proceeding
            const currentAddr = await connectWallet();
            console.log(`[Dashboard] Pre-issuance check for: ${currentAddr}`);
            const authorized = await isAddressAuthorized(currentAddr);

            if (!authorized) {
                setIsAuthorized(false);
                throw new Error(`Your wallet (${currentAddr.substring(0, 6)}...) is not an authorized issuer.`);
            }

            setIsAuthorized(true);
            setWalletAddress(currentAddr);
        } catch (err) {
            setError(err.message);
            setLoading(false);
            return;
        }

        setShowConfirm(false);
        setIssuingStep(1); // Calculating Hash

        try {
            const certId = generateCertId();
            const currentCertData = {
                certId,
                ...formData,
                issuerAddress: walletAddress,
                issuerId: auth.currentUser.uid,
                issueDate: formData.issueDate
            };
            const certHash = hashCertificateData(currentCertData);

            setIssuingStep(2); // Connecting to Blockchain
            let currentAddr = walletAddress;
            if (!currentAddr) {
                currentAddr = await connectWallet();
                if (!currentAddr) throw new Error("Please connect MetaMask.");
                setWalletAddress(currentAddr);
                currentCertData.issuerAddress = currentAddr;
            }

            const tx = await issueCertificateOnChain(certId, certHash);
            const receipt = await tx.wait();

            setIssuingStep(3); // Anchoring to IPFS
            const response = await fetch('http://localhost:5000/api/certificates/anchor-to-ipfs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...currentCertData, certHash, txHash: receipt.hash })
            });

            const contentType = response.headers.get("content-type");
            let ipfsData;

            if (contentType && contentType.includes("application/json")) {
                ipfsData = await response.json();
            } else {
                const text = await response.text();
                console.error("Non-JSON response received:", text);
                throw new Error("Server returned an invalid response (not JSON). Please check the backend logs.");
            }

            if (!response.ok) {
                throw new Error(ipfsData.error || `IPFS error: ${response.status} ${response.statusText}`);
            }

            setIssuingStep(4); // Saving to Firestore
            const finalCertData = {
                ...currentCertData,
                certHash,
                txHash: receipt.hash,
                blockNumber: Number(receipt.blockNumber),
                ipfsHash: ipfsData.ipfsHash,
                gatewayUrl: ipfsData.gatewayUrl,
                timestamp: serverTimestamp(),
                status: "confirmed"
            };

            await setDoc(doc(db, "certificates", certId), finalCertData);

            setSuccessData(finalCertData);
            setIssuingStep(5); // Success
            setFormData(prev => ({
                studentName: "",
                studentId: "",
                courseName: "",
                grade: "First Class",
                issueDate: new Date().toISOString().split("T")[0],
                email: "",
                institutionName: prev.institutionName,
                certificateType: "Permanent",
                studentPhotoBase64: "",
                institutionLogoBase64: ""
            }));
            fetchCertificates();

            setTimeout(() => {
                generatePDF(finalCertData);
            }, 1000);

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

    const generatePDF = async (data = successData) => {
        if (!certificateRef.current || !data) return;
        setGeneratingPDF(true);
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
            pdf.save(`Certificate_${data.certId}.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
        } finally {
            setGeneratingPDF(false);
        }
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
        <div className="py-24 space-y-10 max-w-7xl mx-auto px-4">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="h-10 w-10 text-primary" />
                        Registry Management
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-500 font-medium">Issue, manage, and track blockchain-verified credentials.</p>
                        <span className={`px-2 py-0.5 ${activeNetwork.badgeColor} text-white text-[9px] font-black rounded-lg uppercase tracking-widest animate-in fade-in slide-in-from-left-2`}>
                            {activeNetwork.label}
                        </span>
                    </div>
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
                                <div className={`h-2 w-2 rounded-full ${isAuthorized ? 'bg-success' : 'bg-error'} animate-pulse`} />
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isAuthorized ? 'text-success' : 'text-error'}`}>
                                    {isAuthorized ? 'Shield Active' : 'Not Authorized'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={handleConnect}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-black text-xs hover:bg-primary-hover transition shadow-lg shadow-primary/10 active:scale-95 disabled:opacity-50"
                            disabled={loading}
                        >
                            <Zap className="h-3 w-3 fill-white" />
                            {loading ? "Checking..." : (walletAddress ? "Re-sync Wallet" : "Connect MetaMask")}
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
                    <div key={i} className="bg-white p-5 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all duration-300 group">
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
                <section className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-xl border border-border space-y-8 relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
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
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-border rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-hover/20 transition-all outline-none"
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
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-border rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-hover/20 transition-all outline-none"
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
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-border rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-hover/20 transition-all outline-none uppercase font-bold tracking-tight"
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
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-border rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-hover/20 transition-all outline-none"
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
                                        className="w-full px-4 py-3.5 bg-gray-50 border-2 border-border rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-hover/20 transition-all outline-none"
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
                                        className="w-full px-4 py-3.5 bg-gray-50 border-2 border-border rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-hover/20 transition-all outline-none"
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
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-border rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-hover/20 transition-all outline-none"
                                    placeholder="student@example.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Student Photo</label>
                                <input
                                    type="file"
                                    name="studentPhotoBase64"
                                    accept="image/*"
                                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-border rounded-2xl text-[10px] focus:bg-white transition-all outline-none"
                                    onChange={handleFileChange}
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Institution Logo</label>
                                <input
                                    type="file"
                                    name="institutionLogoBase64"
                                    accept="image/*"
                                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-border rounded-2xl text-[10px] focus:bg-white transition-all outline-none"
                                    onChange={handleFileChange}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Certificate Type</label>
                            <select
                                name="certificateType"
                                className="w-full px-5 py-3.5 bg-gray-50 border-2 border-border rounded-2xl focus:bg-white transition-all outline-none"
                                value={formData.certificateType}
                                onChange={handleInputChange}
                                disabled={loading}
                            >
                                <option value="Permanent">Permanent</option>
                                <option value="Provisional">Provisional</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-4 rounded-2xl font-black text-lg hover:bg-primary-hover transition flex items-center justify-center space-x-3 shadow-xl shadow-primary/10 disabled:opacity-50 active:scale-95"
                        >
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <PlusCircle className="h-6 w-6" />}
                            <span>{loading ? "Processing..." : "Issue to Blockchain"}</span>
                        </button>
                    </form>

                    {/* Transaction Steps */}
                    {issuingStep > 0 && issuingStep < 5 && (
                        <div className="pt-4 space-y-4 border-t border-gray-50 animate-in fade-in slide-in-from-bottom-2">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Transaction Pulse</h4>
                            <div className="space-y-3">
                                <StepIndicator step={1} label="Calculating Hash" currentStep={issuingStep} />
                                <StepIndicator step={2} label="Blockchain Sync" currentStep={issuingStep} />
                                <StepIndicator step={3} label="IPFS Anchoring" currentStep={issuingStep} />
                                <StepIndicator step={4} label="Global Storage" currentStep={issuingStep} />
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
                    <div className="bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden text-white border border-white/5 hover:shadow-primary/5 transition-all duration-300">
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

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-border space-y-6 hover:shadow-md transition-all duration-300">
                        {/* Tab Switcher */}
                        <div className="flex bg-gray-50 p-1 rounded-2xl w-fit">
                            <button
                                onClick={() => setActiveTab("registry")}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === "registry" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                Certificate Registry
                            </button>
                            <button
                                onClick={() => setActiveTab("students")}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === "students" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                Student Records
                            </button>
                        </div>

                        {activeTab === "registry" ? (
                            <>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                                        <input
                                            type="text"
                                            placeholder="Search by student, ID or certificate ref..."
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-border rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-hover/10 outline-none transition-all"
                                            value={searchTerm}
                                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="date"
                                                className="pl-9 pr-3 py-3 bg-gray-50 border border-border rounded-xl text-sm outline-none focus:bg-white hover:border-primary-hover focus:border-primary transition-all"
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
                                                <th className="pb-4 text-right">Actions</th>
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
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${cert.status === 'confirmed' ? 'bg-success/10 text-success border border-success/20' :
                                                            cert.status === 'revoked' ? 'bg-red-50 text-error border border-red-100' :
                                                                'bg-warning/10 text-warning border border-warning/20'
                                                            }`}>
                                                            {cert.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-5 text-right flex items-center justify-end gap-2">
                                                        {cert.status === 'confirmed' && (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        if (cert.gatewayUrl) {
                                                                            window.open(cert.gatewayUrl, "_blank");
                                                                        } else {
                                                                            setError("IPFS gateway URL not found for this certificate.");
                                                                            setTimeout(() => setError(""), 5000);
                                                                        }
                                                                    }}
                                                                    className="p-2 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-all"
                                                                    title="View on IPFS (PDF)"
                                                                >
                                                                    <FileText className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => generatePDF(cert)}
                                                                    className="p-2 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-all"
                                                                    title="Download Local PDF"
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        {cert.status !== 'revoked' && (
                                                            <button
                                                                onClick={() => setShowRevokeConfirm(cert)}
                                                                disabled={revokingId === cert.certId}
                                                                className="p-2 text-gray-400 hover:text-error hover:bg-red-50 rounded-lg transition-all"
                                                                title="Revoke Certificate"
                                                            >
                                                                {revokingId === cert.certId ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {paginatedCerts.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" className="py-20 text-center">
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
                            </>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex justify-between items-center">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                                        <input
                                            type="text"
                                            placeholder="Filter students..."
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-border rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-hover/10 outline-none transition-all"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setShowAddStudent(true)}
                                        className="flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition shadow-lg active:scale-95"
                                    >
                                        <PlusCircle className="h-4 w-4" />
                                        <span>Add Student</span>
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
                                                <th className="pb-4 px-2">Student ID</th>
                                                <th className="pb-4">Name</th>
                                                <th className="pb-4">Email</th>
                                                <th className="pb-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {students.filter(s =>
                                                s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
                                            ).map((student) => (
                                                <tr key={student.id} className="group hover:bg-gray-50/50 transition duration-300">
                                                    <td className="py-5 px-2 font-black text-gray-900 uppercase tracking-tight">{student.studentId}</td>
                                                    <td className="py-5 font-bold text-gray-900">{student.studentName}</td>
                                                    <td className="py-5 text-sm text-gray-500 font-medium">{student.email}</td>
                                                    <td className="py-5 text-right">
                                                        <button
                                                            onClick={() => handleQuickIssue(student)}
                                                            className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs font-black hover:bg-primary hover:text-white transition-all transform active:scale-95"
                                                        >
                                                            Quick Issue
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {students.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="py-20 text-center">
                                                        <div className="flex flex-col items-center opacity-20">
                                                            <Users className="h-16 w-16 mb-2" />
                                                            <p className="font-black">No student records found</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
                {/* Revocation Confirmation Modal */}
                {showRevokeConfirm && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                            <div className="text-center space-y-4">
                                <div className="h-20 w-20 bg-red-50 text-error rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                                    <AlertCircle className="h-10 w-10" />
                                </div>
                                <h3 className="text-3xl font-black text-gray-900">Revoke Credential?</h3>
                                <p className="text-gray-500 font-medium leading-relaxed">
                                    You are about to invalidate <span className="text-gray-900 font-bold">{showRevokeConfirm.certId}</span>. This change will be broadcast to the blockchain.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button
                                    onClick={() => setShowRevokeConfirm(null)}
                                    className="flex-1 py-4 px-6 rounded-2xl font-black border-2 border-border text-gray-400 hover:bg-gray-50 transition active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleRevoke(showRevokeConfirm)}
                                    className="flex-1 py-4 px-6 rounded-2xl font-black bg-error text-white hover:bg-red-700 shadow-xl shadow-red-100 transition active:scale-95"
                                >
                                    Confirm Revocation
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirmation Modal */}
                {showConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                            <div className="text-center space-y-4">
                                <div className="h-20 w-20 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
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
                                    className="flex-1 py-4 px-6 rounded-2xl font-black border-2 border-border text-gray-400 hover:bg-gray-50 transition active:scale-95"
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={processIssuance}
                                    className="flex-1 py-4 px-6 rounded-2xl font-black bg-primary text-white hover:bg-primary-hover shadow-xl shadow-primary/10 transition active:scale-95"
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
                                <h3 className="text-4xl font-black text-gray-900 tracking-tight">Proof Anchored!</h3>
                                <p className="text-gray-500 font-medium">
                                    Integrity proof for <span className="font-bold text-gray-900">{successData.certId}</span> has been stored on Polygon.
                                    <br />
                                    <span className="text-[10px] uppercase font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full mt-2 inline-block">Zero Personal Data On-Chain</span>
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
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Integrity Hash (SHA-256)</label>
                                        <p className="font-mono text-[10px] text-gray-900 break-all bg-gray-100 p-2 rounded-lg mt-1">{successData.certHash}</p>
                                    </div>
                                    <div className="pt-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Student ID</label>
                                        <p className="font-bold text-gray-900">{successData.studentId}</p>
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
                                className="w-full py-5 rounded-[1.8rem] font-black bg-white border-4 border-border text-gray-900 hover:bg-gray-50 hover:border-primary-hover transition-all shadow-sm active:scale-95"
                            >
                                Done, Return to Dashboard
                            </button>
                        </div>
                    </div>
                )}

                {/* Add Student Modal */}
                {showAddStudent && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                            <div className="text-center space-y-4">
                                <div className="h-20 w-20 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                                    <Users className="h-10 w-10" />
                                </div>
                                <h3 className="text-3xl font-black text-gray-900">Add New Student</h3>
                                <p className="text-gray-500 font-medium">Create a new student entry in your institution's records.</p>
                            </div>

                            <form onSubmit={handleAddStudent} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. John Doe"
                                        className="w-full px-5 py-3.5 bg-gray-50 border-2 border-border rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-hover/20 transition-all outline-none"
                                        value={newStudent.studentName}
                                        onChange={(e) => setNewStudent({ ...newStudent, studentName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Student ID</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. CS2024001"
                                        className="w-full px-5 py-3.5 bg-gray-50 border-2 border-border rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-hover/20 transition-all outline-none uppercase font-bold tracking-tight"
                                        value={newStudent.studentId}
                                        onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="student@example.com"
                                        className="w-full px-5 py-3.5 bg-gray-50 border-2 border-border rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-hover/20 transition-all outline-none"
                                        value={newStudent.email}
                                        onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddStudent(false)}
                                        className="flex-1 py-4 px-6 rounded-2xl font-black border-2 border-border text-gray-400 hover:bg-gray-50 transition active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-4 px-6 rounded-2xl font-black bg-primary text-white hover:bg-primary-hover shadow-xl shadow-primary/10 transition active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlusCircle className="h-5 w-5" />}
                                        Add Record
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {/* Hidden Certificate Template for PDF Generation */}
                <div className="hidden">
                    <div
                        ref={certificateRef}
                        className="w-[1000px] p-20 bg-white border-[20px] border-blue-50 flex flex-col items-center text-center space-y-10 font-sans"
                    >
                        <div className="w-full flex justify-between items-start">
                            <ShieldCheck className="h-16 w-16 text-primary" />
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-300 tracking-widest uppercase">Official Record</p>
                                <p className="text-xs font-mono text-gray-400">{successData?.certId || "CERT-XXXX-XXXX"}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-6xl font-black text-gray-900 tracking-tighter">Certificate of Completion</h1>
                            <div className="h-1.5 w-40 bg-primary mx-auto rounded-full" />
                        </div>

                        <div className="space-y-6">
                            <p className="text-xl text-gray-400 font-medium italic">This is to certify that</p>
                            <h2 className="text-5xl font-black text-primary">{successData?.studentName || "Student Name"}</h2>
                            <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto">
                                has successfully completed the requirements for the course
                            </p>
                            <h3 className="text-3xl font-bold text-gray-900">{successData?.courseName || "Course Name"}</h3>
                            <div className="flex justify-center gap-12 pt-4">
                                <div className="text-center">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-300">Grade</p>
                                    <p className="text-lg font-bold text-gray-900">{successData?.grade || "Grade"}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-300">Institution</p>
                                    <p className="text-lg font-bold text-gray-900">{successData?.institutionName || "Institution"}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-300">Issue Date</p>
                                    <p className="text-lg font-bold text-gray-900">{formatDate(successData?.issueDate) || "Date"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center space-y-4 pt-10 border-t border-gray-50 w-full opacity-60">
                            <QRCodeSVG
                                value={`${window.location.origin}/verify/${successData?.certId || "CERT-XXXX-XXXX"}`}
                                size={80}
                            />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                                VERIFIED ON POLYGON BLOCKCHAIN • #{successData?.txHash?.slice(0, 12) || "0x..."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstitutionDashboard;
