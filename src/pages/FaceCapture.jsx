import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Camera,
  Play,
  Square,
  Upload,
  Check,
  ChevronRight,
  ArrowLeft,
  User,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import AxiosInstance from "../utilities/AxiosInstance";
import Sidebar from "../layouts/Sidebar";
import Navbar from "../layouts/Navbar";

export default function FaceCapture() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMenuTab, setActiveMenuTab] = useState("Employees");

  const [loading, setLoading] = useState(false);
  const [extractLoading, setExtractLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [employee, setEmployee] = useState(null);

  const [activeTab, setActiveTab] = useState("Up"); // 'Up', 'Down', 'Left', 'Right'
  const [stream, setStream] = useState(null);
  const [isCameraRunning, setIsCameraRunning] = useState(false);

  const [captures, setCaptures] = useState({
    Up: [],
    Down: [],
    Left: [],
    Right: [],
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Fetch employee data
    if (id) {
      AxiosInstance.get(`/employees/${id}`)
        .then((res) => setEmployee(res.data))
        .catch((err) => {
          console.error(err);
          toast.error("Failed to load employee details");
        });
    }
  }, [id]);

  useEffect(() => {
    // Cleanup stream on unmount
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraRunning(true);
      toast.success("Camera activated");
    } catch (err) {
      console.error("Error accessing webcam", err);
      toast.error("Cannot access webcam. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCameraRunning(false);
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !isCameraRunning) return;

    const maxCaptures = 5;
    if (captures[activeTab].length >= maxCaptures) {
      toast.error(`Maximum captures reached for ${activeTab} view.`);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageUrl = canvas.toDataURL("image/jpeg", 0.8);

    setCaptures((prev) => ({
      ...prev,
      [activeTab]: [...prev[activeTab], imageUrl],
    }));
  };

  const removeSnapshot = (tab, index) => {
    setCaptures((prev) => {
      const newArray = [...prev[tab]];
      newArray.splice(index, 1);
      return { ...prev, [tab]: newArray };
    });
  };

  const getTotalCaptures = () => {
    return (
      captures.Up.length +
      captures.Down.length +
      captures.Left.length +
      captures.Right.length
    );
  };

  const dataURLtoFile = async (dataurl, filename) => {
    const res = await fetch(dataurl);
    const blob = await res.blob();
    return new File([blob], filename, { type: "image/jpeg" });
  };

  const handleUpload = async () => {
    if (captures.Up.length + captures.Down.length !== 10) {
      toast.error(
        "Please capture exactly 10 images for the Front (Up + Down) View.",
      );
      return;
    }
    if (captures.Right.length !== 5) {
      toast.error("Please capture exactly 5 images for the Right Side View.");
      return;
    }
    if (captures.Left.length !== 5) {
      toast.error("Please capture exactly 5 images for the Left Side View.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();

      const employeeInfo = employee || {};
      const empName = employeeInfo.name || employeeInfo.firstName || "Unknown";
      const empID = employeeInfo.employeeId || employeeInfo._id || "ID";

      const frontDataUrls = [...captures.Up, ...captures.Down];
      for (let i = 0; i < frontDataUrls.length; i++) {
        formData.append(
          "frontView",
          await dataURLtoFile(
            frontDataUrls[i],
            `${empName}_${empID}_front_${i}.jpg`,
          ),
        );
      }
      for (let i = 0; i < captures.Right.length; i++) {
        formData.append(
          "rightSide",
          await dataURLtoFile(
            captures.Right[i],
            `${empName}_${empID}_right_${i}.jpg`,
          ),
        );
      }
      for (let i = 0; i < captures.Left.length; i++) {
        formData.append(
          "leftSide",
          await dataURLtoFile(
            captures.Left[i],
            `${empName}_${empID}_left_${i}.jpg`,
          ),
        );
      }

      const response = await AxiosInstance.post("/employees/face", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(response.data?.message || "Images uploaded successfully!");
      setSubmitted(true);
      stopCamera();
    } catch (error) {
      console.error("Error submitting images:", error);
      toast.error(error.response?.data?.message || "Error uploading images.");
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!employee) {
      toast.error("Employee details not found.");
      return;
    }

    const allImages = [
      ...captures.Up,
      ...captures.Down,
      ...captures.Left,
      ...captures.Right,
    ];

    if (allImages.length === 0) {
      toast.error("Please capture face images first.");
      return;
    }

    setExtractLoading(true);

    try {
      const formData = new FormData();

      formData.append("id", employee.employeeId || employee._id);
      formData.append(
        "name",
        `${employee.firstName} ${employee.lastName}`.trim(),
      );

      const files = await Promise.all(
        allImages.map((img, index) => dataURLtoFile(img, `image_${index}.jpg`)),
      );

      files.forEach((file) => {
        formData.append("image", file);
      });

      // Forward training request to backend which will relay to Flask service
      const res = await AxiosInstance.post(`/employees/face/train`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Training Response:", res.data);

      toast.success(res.data?.message || "Face model trained successfully!");
      // navigate("/admin-dashboard");
    } catch (err) {
      console.error("Training Error:", err);

      console.log("Status:", err.response?.status);
      console.log("Headers:", err.response?.headers);
      console.log("Response:", err.response?.data);

      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Training failed",
      );
    } finally {
      setExtractLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800 lg:pl-56">
      {/* Sidebar */}
      <Sidebar
        variant="admin"
        activeTab={activeMenuTab}
        onTabChange={(tab) => {
          setActiveMenuTab(tab);
          navigate("/admin-dashboard");
        }}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Navbar */}
      <Navbar
        title="Face Capture"
        onMobileMenuOpen={() => setMobileMenuOpen(true)}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 pt-[60px]">
        <main className="flex-1 p-6 md:p-8">
          {/* Hidden canvas for snapshots */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Header Breadcrumb */}
          <div className="max-w-6xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                <button
                  onClick={() => navigate("/admin-dashboard")}
                  className="hover:text-amber-500 transition-colors cursor-pointer"
                >
                  Employees
                </button>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-slate-700">Face Capture & Extract</span>
              </div>
            </div>
            <button
              onClick={() => navigate("/admin-dashboard")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-sm font-bold transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
            {/* LEFT COLUMN: CAPTURE */}
            <div className="sticky top-6 h-[calc(100vh-3rem)] bg-white rounded-3xl p-6 border-2 border-amber-100 shadow-sm flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-amber-500 w-1/2 leading-tight">
                  Employee Face Capture
                </h2>
                <div className="bg-amber-50 px-4 py-2 rounded-full border border-amber-100 flex items-center gap-2 max-w-[50%] overflow-hidden">
                  <span className="text-sm font-bold text-amber-700 truncate">
                    {employee
                      ? `${employee.employeeId || employee._id} | ${employee.firstName}`
                      : "Loading..."}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl mb-6">
                <button
                  onClick={() => setActiveTab("Up")}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    activeTab === "Up"
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  front ({captures.Up.length}/5)
                </button>
                <button
                  onClick={() => setActiveTab("Down")}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    activeTab === "Down"
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  up/down ({captures.Down.length}/5)
                </button>
                <button
                  onClick={() => setActiveTab("Left")}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    activeTab === "Left"
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Left ({captures.Left.length}/5)
                </button>
                <button
                  onClick={() => setActiveTab("Right")}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    activeTab === "Right"
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Right ({captures.Right.length}/5)
                </button>
              </div>

              {/* Camera Viewport */}
              <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden mb-6 flex items-center justify-center border-4 border-slate-900">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover transform scale-x-[-1] ${isCameraRunning ? "block" : "hidden"}`}
                />

                {!isCameraRunning && (
                  <div className="flex flex-col items-center justify-center text-slate-400 absolute inset-0 z-10 bg-black">
                    <div className="w-16 h-16 rounded-full border-2 border-slate-700 flex items-center justify-center mb-4">
                      <Camera className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1">
                      Camera is Stopped
                    </h3>
                    <p className="text-sm">
                      Click "Start Camera" to activate live feed
                    </p>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 mb-6">
                {!isCameraRunning ? (
                  <button
                    onClick={startCamera}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Start Camera
                  </button>
                ) : (
                  <button
                    onClick={takeSnapshot}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 border border-slate-200 transition-all"
                  >
                    <Camera className="w-5 h-5" />
                    Capture
                  </button>
                )}

                <button
                  onClick={stopCamera}
                  disabled={!isCameraRunning}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold border transition-all ${
                    isCameraRunning
                      ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                      : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <Square className="w-5 h-5 fill-current" />
                  Stop Camera
                </button>
              </div>

              {/* Guidelines */}
              <div className="mt-auto bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">
                    {activeTab} View Guidelines:
                  </h4>
                  <p className="text-sm text-slate-500">
                    {activeTab === "Up" &&
                      "Tilt your head upwards slightly to capture the under-chin and neck profile."}
                    {activeTab === "Down" &&
                      "Tilt your head downwards slightly to capture the top of the head profile."}
                    {activeTab === "Left" &&
                      "Turn your head to the left to capture the left profile clearly."}
                    {activeTab === "Right" &&
                      "Turn your head to the right to capture the right profile clearly."}
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: PREVIEW & EXTRACT */}
            <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <h2 className="text-2xl font-bold text-violet-600 w-1/3 leading-tight">
                  Preview & Extract
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    disabled={loading || submitted || getTotalCaptures() === 0}
                    onClick={handleUpload}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-all ${
                      submitted
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : submitted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {submitted ? "Submitted" : "Submit Images"}
                  </button>
                  <button
                    disabled={extractLoading || !submitted}
                    onClick={handleExtract}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 font-bold text-sm disabled:opacity-50 transition-all shadow-sm"
                  >
                    {extractLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Extract
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {getTotalCaptures() === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                    <div className="w-20 h-20 mb-4 bg-slate-50 rounded-full flex items-center justify-center">
                      <Camera className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="font-bold text-slate-700 text-lg mb-2">
                      No Captures Yet
                    </h3>
                    <p className="text-slate-500 text-sm">
                      Start the webcam and click the capture button to snapshot
                      employee frames. Captured files will render here.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
                    {["Up", "Down", "Left", "Right"].map((tab) => {
                      if (captures[tab].length === 0) return null;
                      return (
                        <div key={tab}>
                          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            {tab} View Captures ({captures[tab].length})
                          </h3>
                          <div className="grid grid-cols-5 sm:grid-cols-5 gap-3">
                            {captures[tab].map((src, idx) => (
                              <div
                                key={idx}
                                className="relative group aspect-square bg-black rounded-xl overflow-hidden border border-slate-200 shadow-sm"
                              >
                                <img
                                  src={src}
                                  alt="Capture"
                                  className="w-full h-full object-cover transform scale-x-[-1]"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    onClick={() => removeSnapshot(tab, idx)}
                                    className="text-xs font-bold bg-rose-500 text-white px-3 py-1.5 rounded-full hover:bg-rose-600 transition-colors shadow-md cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
