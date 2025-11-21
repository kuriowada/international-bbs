"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- Type Definitions ---
type Post = {
  id: number;
  content: string;
  type: string;
  user_email?: string;
  created_at: string;
};

type Material = {
  id: number;
  title: string;
  file_url: string;
  subject?: string;
};

export default function Home() {
  // --- State Management ---
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedType, setSelectedType] = useState("question");
  const [activeTab, setActiveTab] = useState("all"); // Tab switching
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [materialTitle, setMaterialTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // --- Initialization ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchPosts();
        fetchMaterials();
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchPosts();
        fetchMaterials();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (data) setPosts(data);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from("materials").select("*").order("created_at", { ascending: false });
    if (data) setMaterials(data);
  };

  // --- Actions ---

  // ▼▼▼ Google Login Added Here ▼▼▼
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) alert(error.message);
  };
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  const handleUpload = async () => {
    if (!uploadFile || !materialTitle) return alert("Please select a title and a file.");
    setLoading(true);
    try {
      const fileName = `${Date.now()}_${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage.from("materials").upload(fileName, uploadFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(fileName);
      const { error: dbError } = await supabase.from("materials").insert([{ title: materialTitle, file_url: publicUrl, subject: "general" }]);
      if (dbError) throw dbError;
      alert("Upload successful!");
      setMaterialTitle("");
      setUploadFile(null);
      fetchMaterials();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!inputText) return;
    await supabase.from("posts").insert([{ content: inputText, type: selectedType }]);
    setInputText("");
    fetchPosts();
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };
  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Check your email!");
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- UI Components ---
  const getTypeBadge = (type: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm";
    switch (type) {
      case "question": return <span className={`${baseClasses} bg-gradient-to-r from-green-400 to-teal-500`}>Q&A</span>;
      case "news": return <span className={`${baseClasses} bg-gradient-to-r from-red-400 to-pink-500`}>News</span>;
      case "tip": return <span className={`${baseClasses} bg-gradient-to-r from-orange-400 to-yellow-500`}>Tips</span>;
      default: return <span className={`${baseClasses} bg-gray-400`}>Other</span>;
    }
  };

  // ==========================================
  // ▼▼▼ VIEW (JSX) ▼▼▼
  // ==========================================

  // 1. Login Screen (Centered, Desktop optimized)
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="flex w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[600px]">
          {/* Left: Image/Branding Area */}
          <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 items-center justify-center p-12 text-white">
            <div>
              <h1 className="text-5xl font-extrabold mb-6">Global<br/>Campus</h1>
              <p className="text-lg opacity-90">Connect with students worldwide.<br/>Share knowledge, ask questions.</p>
            </div>
          </div>
          {/* Right: Login Form */}
          <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Log In</h2>
            <div className="space-y-5">
              
              {/* ▼▼▼ Google Button Added Here ▼▼▼ */}
              <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-50 transition shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>

              <div className="flex items-center gap-4 my-2">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-gray-400 text-sm font-medium">or</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>
              {/* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */}

              <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-black" type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-black" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">Log In</button>
              <button onClick={handleSignUp} className="w-full text-gray-500 py-4 hover:text-blue-600 transition font-bold">Create an account</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Main Dashboard (3-Column Layout for Desktop)
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="max-w-7xl mx-auto flex items-start gap-8 px-4 py-8">
        
        {/* === [LEFT COLUMN] Navigation Sidebar === */}
        <nav className="hidden md:block w-64 sticky top-8 shrink-0">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8 px-2">
              GC
            </h1>
            <ul className="space-y-2">
              {[
                { id: "all", label: "Home", icon: "🏠" },
                { id: "question", label: "Q&A", icon: "❓" },
                { id: "news", label: "News", icon: "📢" },
                { id: "materials", label: "Materials", icon: "📚" },
              ].map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-3 ${
                      activeTab === item.id
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span> {item.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-8 border-t border-gray-100">
              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-gray-400 hover:text-red-500 font-bold text-sm transition">
                Log Out
              </button>
            </div>
          </div>
        </nav>

        {/* === [CENTER COLUMN] Main Feed === */}
        <main className="flex-1 min-w-0">
          
          {/* Mode: Material Sharing */}
          {activeTab === "materials" ? (
            <div className="space-y-6">
              {/* Upload Card */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Shared Materials</h2>
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">File Storage</span>
                </div>
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none"
                      placeholder="Document Title..."
                      value={materialTitle}
                      onChange={(e) => setMaterialTitle(e.target.value)}
                    />
                    <div className="relative">
                        <input type="file" className="hidden" id="fileUpload" onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)} />
                        <label htmlFor="fileUpload" className="block w-full p-3 bg-gray-50 rounded-xl text-center text-gray-500 cursor-pointer hover:bg-gray-100 border border-dashed border-gray-300 transition">
                          {uploadFile ? "📄 " + uploadFile.name : "📁 Select File"}
                        </label>
                    </div>
                  </div>
                  <button onClick={handleUpload} disabled={loading} className="h-24 w-32 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl transition shadow-md shadow-yellow-200">
                    {loading ? "..." : "Upload"}
                  </button>
                </div>
              </div>

              {/* Grid View for Files */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {materials.map((mat) => (
                  <div key={mat.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition border border-gray-100">
                    <div className="h-48 bg-gray-100 relative overflow-hidden">
                      {mat.file_url ? (
                        <img src={mat.file_url} alt={mat.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-4xl">📄</div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <a href={mat.file_url} target="_blank" className="bg-white text-black px-4 py-2 rounded-full font-bold text-sm hover:scale-105 transition">Open</a>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-800 truncate">{mat.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">Shared by user</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Mode: Feed Timeline */
            <div className="space-y-6">
              {/* Post Input */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0"></div>
                  <div className="flex-1">
                    <textarea
                      className="w-full bg-transparent text-lg outline-none placeholder-gray-400 resize-none h-20"
                      placeholder="What's happening on campus?"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                      <div className="flex gap-2">
                          <select
                            className="bg-gray-50 px-3 py-2 rounded-lg text-sm font-bold text-gray-600 outline-none cursor-pointer hover:bg-gray-100 transition"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                          >
                            <option value="question">❓ Q&A</option>
                            <option value="news">📢 News</option>
                            <option value="tip">💡 Tips</option>
                          </select>
                      </div>
                      <button onClick={handlePost} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold transition shadow-md shadow-blue-200">
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feed List */}
              {posts.filter(p => activeTab === "all" || p.type === activeTab).map((post) => (
                <div key={post.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                        <div>
                          <p className="font-bold text-gray-900">Student User</p>
                          <p className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {getTypeBadge(post.type)}
                    </div>
                    <p className="text-gray-800 text-lg leading-relaxed pl-13">{post.content}</p>
                    <div className="flex gap-6 mt-6 pl-13 border-t border-gray-50 pt-4">
                      <button className="text-gray-400 hover:text-red-500 font-bold text-sm flex items-center gap-2 transition">
                        <span>❤️</span> Like
                      </button>
                      <button className="text-gray-400 hover:text-blue-500 font-bold text-sm flex items-center gap-2 transition">
                        <span>💬</span> Comment
                      </button>
                    </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* === [RIGHT COLUMN] Widgets Sidebar === */}
        <aside className="hidden xl:block w-80 sticky top-8 shrink-0 space-y-6">
          {/* Profile Widget */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-400 text-xs uppercase mb-4">Your Profile</h3>
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-green-400 to-blue-500"></div>
               <div>
                  <p className="font-bold text-lg">You</p>
                  <p className="text-xs text-gray-500">{email}</p>
               </div>
            </div>
            <div className="flex justify-between text-center bg-gray-50 p-3 rounded-xl">
               <div><p className="font-bold text-lg">12</p><p className="text-xs text-gray-400">Posts</p></div>
               <div><p className="font-bold text-lg">45</p><p className="text-xs text-gray-400">Likes</p></div>
               <div><p className="font-bold text-lg">3</p><p className="text-xs text-gray-400">Files</p></div>
            </div>
          </div>

          {/* Trending/Info Widget */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-lg text-white">
            <h3 className="font-bold text-lg mb-2">✨ Welcome!</h3>
            <p className="text-sm opacity-90 leading-relaxed mb-4">
              This is the desktop version of Global Campus. Use the left menu to navigate.
            </p>
            <button className="w-full bg-white text-indigo-600 py-2 rounded-lg font-bold text-sm">Learn More</button>
          </div>
        </aside>

      </div>
    </div>
  );
}