// app/page.tsx
// @ts-nocheck
"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- Configuration ---
const GRADE_OPTIONS = ['Year 12', 'Year 11', 'Year 10'];
const SUBJECT_OPTIONS = ['Math', 'English']; 
const LANGUAGE_OPTIONS = ['Japanese', 'Vietnamese', 'English', 'Chinese'];

// チュートリアルコンテンツ
const tutorialContent = [
    { id: "all", label: "Home", icon: "🏠", description: "See all posts from everyone." },
    { id: "question", label: "Q&A", icon: "❓", description: "Ask questions and help others." },
    { id: "tip", label: "Tips", icon: "💡", description: "Share useful school life hacks." }, 
    { id: "news", label: "News", icon: "📢", description: "Check official announcements." },
    { id: "materials", label: "Materials", icon: "📚", description: "Share and find study materials." },
];

// --- Type Definitions ---
type Comment = { id: string; content: string; user_id: string; created_at: string; };
type Post = { id: number; content: string; type: string; user_email?: string; created_at: string; likes_count: number; has_liked: boolean; comments: Comment[]; };
type Material = { id: number; title: string; file_url: string; subject?: string; grade?: string; unit?: string; description?: string; language?: string; };

// SelectInput Component (CSSクラスを使用するように変更)
interface SelectInputProps { value: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void; options: string[]; placeholder: string; }
const SelectInput: React.FC<SelectInputProps> = ({ value, onChange, options, placeholder }) => (
    <select className="select-input" value={value} onChange={onChange}>
        {placeholder.startsWith('All') && <option value="">{placeholder}</option>}
        {!placeholder.startsWith('All') && <option value="" disabled>{placeholder}</option>}
        {options.map((opt: string) => ( <option key={opt} value={opt}>{opt}</option> ))}
    </select>
);

// GuidedTourModal (ダークテーマ対応)
const GuidedTourModal: React.FC<{ 
    currentStep: number; onNext: () => void; onBack: () => void;
    onClose: () => void; onSetTab: (tabId: string) => void; totalSteps: number; 
}> = ({ currentStep, onNext, onBack, onClose, onSetTab, totalSteps }) => {
    if (currentStep < 0) return null;
    const stepData = tutorialContent[currentStep];
    const isLastStep = currentStep === totalSteps - 1;
    const isFirstStep = currentStep === 0;
    useEffect(() => { if (currentStep >= 0) onSetTab(stepData.id); }, [currentStep, stepData.id, onSetTab]);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '24px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>🎓 Tutorial Step {currentStep + 1}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-color)' }}>&times;</button>
                </div>
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-color)' }}>
                        <span style={{ fontSize: '1.5rem' }}>{stepData.icon}</span> {stepData.label}
                    </h3>
                    <p style={{ color: '#8899A6', marginTop: '8px', lineHeight: '1.5' }}>{stepData.description}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button onClick={onBack} disabled={isFirstStep} style={{ padding: '8px 16px', borderRadius: '20px', background: 'var(--secondary-color)', color: 'var(--text-color)', border: 'none', cursor: isFirstStep ? 'default' : 'pointer', opacity: isFirstStep ? 0.5 : 1 }}>Back</button>
                    <button onClick={isLastStep ? onClose : onNext} style={{ padding: '8px 16px', borderRadius: '20px', background: 'var(--primary-color)', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>{isLastStep ? 'Finish' : 'Next'}</button>
                </div>
            </div>
        </div>
    );
};

export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [userRole, setUserRole] = useState('student'); 
  const [inputText, setInputText] = useState("");
  const [selectedType, setSelectedType] = useState("question");
  const [activeTab, setActiveTab] = useState("all"); 
  const [email, setEmail] = useState(""); // Login handled in separate page usually, but keeping for structure
  
  const [materialTitle, setMaterialTitle] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [materialGrade, setMaterialGrade] = useState(GRADE_OPTIONS[0]);
  const [materialSubject, setMaterialSubject] = useState(SUBJECT_OPTIONS[0]);
  const [materialUnit, setMaterialUnit] = useState(''); 
  const [materialDescription, setMaterialDescription] = useState(''); 
  const [uploadLanguage, setUploadLanguage] = useState(LANGUAGE_OPTIONS[0]); 

  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  
  const [currentTourStep, setCurrentTourStep] = useState(-1);
  const totalTourSteps = tutorialContent.length;

  const [showCommentInput, setShowCommentInput] = useState({}); 
  const [commentInputs, setCommentInputs] = useState({}); 

  // ツアー制御
  const startTour = () => setCurrentTourStep(0);
  const nextStep = () => setCurrentTourStep((prev) => Math.min(prev + 1, totalTourSteps - 1));
  const backStep = () => setCurrentTourStep((prev) => Math.max(prev - 1, 0));
  const endTour = () => setCurrentTourStep(-1);

  const fetchUserRole = async () => {
    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) return;
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (data?.role) setUserRole(data.role);
    else await supabase.from("users").insert({ id: user.id, role: 'student' });
  };
  
  const fetchPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user ? user.id : '00000000-0000-0000-0000-000000000000'; 
    const { data: posts, error } = await supabase.from('posts').select(`*, likes_count:likes(count), user_has_liked:likes(count).eq('user_id', '${currentUserId}'), comments (id, content, created_at, user_id)`).order('created_at', { ascending: false });
    if (error) { console.error("Error:", error); return; }
    const formattedPosts = posts?.map((post) => ({ ...post, likes_count: post.likes_count?.[0]?.count || 0, has_liked: post.user_has_liked?.[0]?.count > 0, comments: post.comments || [] })); 
    if (formattedPosts) setPosts(formattedPosts);
  };
  
  const fetchMaterials = async () => {
    let query = supabase.from("materials").select("*").order("created_at", { ascending: false });
    if (filterLanguage) query = query.eq('language', filterLanguage);
    if (filterGrade) query = query.eq('grade', filterGrade);
    if (filterSubject) query = query.eq('subject', filterSubject);
    const { data } = await query;
    if (data) setMaterials(data);
  };
  
  useEffect(() => { if (activeTab === 'materials') fetchMaterials(); }, [filterLanguage, filterGrade, filterSubject, activeTab]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { 
        setSession(session); 
        if (session) { fetchPosts(); fetchMaterials(); fetchUserRole(); }
        // 未ログイン時は本来ここでリダイレクト処理などを入れる
    });
  }, []);

  const handleLikeToggle = async (postId) => { 
      if (loading) return; setLoading(true);
      try { await supabase.rpc('toggle_like', { post_id_input: postId, user_id_input: session.user.id }); fetchPosts(); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const handleCommentSubmit = async (postId) => {
      if (!commentInputs[postId] || loading) return; setLoading(true);
      await supabase.from("comments").insert([{ post_id: postId, user_id: session.user.id, content: commentInputs[postId] }]);
      setCommentInputs(prev => ({ ...prev, [postId]: '' })); fetchPosts(); setLoading(false);
  };
  const handleUpload = async () => {
    if (!uploadFile || !materialTitle) return alert("Fill fields"); setLoading(true);
    const fileName = `${Date.now()}_${uploadFile.name}`;
    await supabase.storage.from("materials").upload(fileName, uploadFile);
    const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(fileName);
    await supabase.from("materials").insert([{ title: materialTitle, file_url: publicUrl, subject: materialSubject, grade: materialGrade, unit: materialUnit, description: materialDescription, language: uploadLanguage }]);
    alert("Uploaded!"); setMaterialTitle(""); setUploadFile(null); fetchMaterials(); setLoading(false);
  };
  const handleDeleteMaterial = async (id, url) => { if(confirm("Delete?")) { await supabase.from("materials").delete().eq("id", id); fetchMaterials(); }};
  const handlePost = async () => { if (!inputText) return; await supabase.from("posts").insert([{ content: inputText, type: selectedType, user_email: session.user.email }]); setInputText(""); fetchPosts(); };
  const handleDeletePost = async (id) => { if(confirm("Delete?")) { await supabase.from("posts").delete().eq("id", id); fetchPosts(); }};
  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = "/login"; }; // ログアウト後はログイン画面へ

  const getTypeBadge = (type) => {
    let className = "badge ";
    switch (type) {
      case "question": className += "badge-q"; break;
      case "news": className += "badge-n"; break;
      case "tip": className += "badge-t"; break;
      default: className += "badge-q"; 
    }
    return <span className={className}>{type.toUpperCase()}</span>;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
      {/* Mobile Header */}
      <div className="mobile-header">
          <h1 className="logo">GC</h1>
          <button onClick={() => setCurrentTourStep(0)} className="tutorial-btn">🎓 Tutorial</button>
      </div>

      <div className="container" style={{ paddingTop: '80px' }}>
        {/* PC Sidebar */}
        <nav className="sidebar hidden xl:block">
            <h1 className="logo">GC</h1>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {tutorialContent.map((item) => (
                <li key={item.id} className="sidebar-nav-item" style={{ marginBottom: '4px' }}>
                  <button onClick={() => setActiveTab(item.id)} className={activeTab === item.id ? 'active' : ''}>
                    <span style={{ fontSize: '20px' }}>{item.icon}</span> {item.label}
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '12px', marginTop: '16px', background: 'none', border: 'none', color: '#E0245E', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>🚪</span> Log Out
            </button>
        </nav>

        {/* Main Feed */}
        <main className="main-content">
          {activeTab === "materials" ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="card">
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-color)' }}>Filter Materials</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <SelectInput value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)} options={LANGUAGE_OPTIONS} placeholder="All Languages"/>
                      <SelectInput value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} options={GRADE_OPTIONS} placeholder="All Grades"/>
                      <SelectInput value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} options={SUBJECT_OPTIONS} placeholder="All Subjects"/>
                  </div>
              </div>
              <div className="card">
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-color)' }}>Upload Material</h2>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" className="text-input" placeholder="Title" value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <SelectInput value={uploadLanguage} onChange={(e) => setUploadLanguage(e.target.value)} options={LANGUAGE_OPTIONS} placeholder="Select Language"/>
                          <SelectInput value={materialGrade} onChange={(e) => setMaterialGrade(e.target.value)} options={GRADE_OPTIONS} placeholder="Select Grade"/>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <SelectInput value={materialSubject} onChange={(e) => setMaterialSubject(e.target.value)} options={SUBJECT_OPTIONS} placeholder="Select Subject"/>
                          <input type="text" className="text-input" placeholder="Unit/Topic" value={materialUnit} onChange={(e) => setMaterialUnit(e.target.value)} />
                    </div>
                    <textarea className="text-input" style={{ height: '80px', resize: 'none' }} placeholder="Description" value={materialDescription} onChange={(e) => setMaterialDescription(e.target.value)} />
                    <div style={{ paddingTop: '8px' }}>
                        <input type="file" style={{ color: 'var(--text-color)' }} onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)} />
                    </div>
                  </div>
                  <button onClick={handleUpload} disabled={loading} className="btn-post" style={{ height: '50px', width: '100px', borderRadius: '10px' }}>Upload</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {materials.map((mat) => (
                  <div key={mat.id} className="material-card card">
                    <div className="material-card-image-placeholder">
                      <span style={{ fontSize: '40px' }}>📄</span>
                      <a href={mat.file_url} target="_blank">Open</a>
                    </div>
                    <div className="material-card-content">
                      <h3 className="material-card-title">{mat.title}</h3>
                      <p className="material-card-meta">{mat.grade} / {mat.subject}</p>
                      {userRole === 'admin' && <button onClick={() => handleDeleteMaterial(mat.id, mat.file_url)} className="material-delete-btn">Delete</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Post Input Area */}
              <div className="card">
                <div className="post-input-container">
                  <div className="post-input-avatar"></div>
                  <div style={{ flex: 1 }}>
                    <textarea className="post-textarea" placeholder="What's happening?" value={inputText} onChange={(e) => setInputText(e.target.value)} />
                    <div className="post-form-footer">
                      <select className="post-type-select" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                        <option value="question">❓ Q&A</option>
                        {userRole === 'admin' ? <option value="news">📢 News</option> : <option value="news" disabled>📢 News (Admin Only)</option>}
                        <option value="tip">💡 Tips</option>
                      </select>
                      <button onClick={handlePost} className="btn-post">Post</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Posts Feed */}
              {posts.filter(p => activeTab === "all" || p.type === activeTab).map((post) => (
                <div key={post.id} className="card" style={{ paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3B82F6' }}></div>
                        <div>
                            <p style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-color)' }}>Student User</p>
                            <p style={{ fontSize: '13px', color: '#8899A6' }}>{new Date(post.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {getTypeBadge(post.type)}
                    </div>
                    <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '16px', paddingLeft: '52px', color: 'var(--text-color)' }}>{post.content}</p>
                    
                    <div className="post-actions">
                      <button onClick={() => handleLikeToggle(post.id)} className={post.has_liked ? 'liked' : ''}>
                          <span>{post.has_liked ? '❤️' : '🤍'}</span> {post.likes_count || 0}
                      </button>
                      <button onClick={() => setShowCommentInput(prev => ({ ...prev, [post.id]: !prev[post.id] }))}>
                          <span>💬</span> {post.comments.length || 0}
                      </button>
                      {userRole === 'admin' && <button onClick={() => handleDeletePost(post.id)} style={{ marginLeft: 'auto', color: '#E0245E' }}>Delete</button>}
                    </div>
                    
                    {showCommentInput[post.id] && (
                        <div className="comment-input-area">
                            <div style={{ marginBottom: '16px' }}>
                                {post.comments.length > 0 ? (
                                    post.comments.map(comment => (
                                        <div key={comment.id} className="comment-area">
                                            <p style={{ margin: 0 }}>{comment.content}</p>
                                            <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#8899A6' }}>{new Date(comment.created_at).toLocaleString()}</p>
                                        </div>
                                    ))
                                ) : (<p style={{ fontSize: '12px', color: '#8899A6', fontStyle: 'italic' }}>No comments yet.</p>)}
                            </div>
                            <textarea className="text-input" style={{ minHeight: '60px', resize: 'none', marginBottom: '8px' }} placeholder="Post your reply" value={commentInputs[post.id] || ''} onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button onClick={() => setShowCommentInput(prev => ({ ...prev, [post.id]: false }))} className="btn-comment-action btn-comment-close">Close</button>
                                <button onClick={() => handleCommentSubmit(post.id)} disabled={loading || !commentInputs[post.id]} className="btn-comment-action btn-comment-send">Reply</button>
                            </div>
                        </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right Sidebar (Desktop) */}
        <aside className="hidden xl:block w-80 sticky top-8 shrink-0">
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px' }}>
                <div className="profile-card-header">Your Profile</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div className="profile-avatar-gradient"></div>
                    <div>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-color)' }}>You ({userRole})</p>
                        <p style={{ fontSize: '12px', color: '#8899A6' }}>{session?.user.email || email}</p>
                    </div>
                </div>
                <div className="profile-stats-container">
                    <div><p className="profile-stat-item">12</p><p className="profile-stat-label">Posts</p></div>
                    <div><p className="profile-stat-item">45</p><p className="profile-stat-label">Likes</p></div>
                    <div><p className="profile-stat-item">3</p><p className="profile-stat-label">Files</p></div>
                </div>
            </div>
          </div>
          <div className="welcome-card">
            <h3>✨ Welcome!</h3>
            <p>This is the desktop version of Global Campus. Use the left menu to navigate.</p>
            <button onClick={startTour} className="welcome-card-button">Learn More (Tutorial)</button>
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="mobile-nav">
          {tutorialContent.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={activeTab === item.id ? 'active' : ''}>
                  {item.icon}
              </button>
          ))}
      </div>
      
      <GuidedTourModal currentStep={currentTourStep} onNext={nextStep} onBack={backStep} onClose={endTour} onSetTab={setActiveTab} totalSteps={totalTourSteps} />
    </div>
  );
}