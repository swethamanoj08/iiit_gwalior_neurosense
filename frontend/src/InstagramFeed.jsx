import React, { useState, useEffect, useRef } from 'react';
import { Home, Search, MessageCircle, Heart, PlusSquare, User, MoreHorizontal, Bookmark, Share2, ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';
import './InstagramFeed.css';

const InstagramFeed = () => {
  const [posts, setPosts] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);

  // Modals & UI States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState('post'); // post | story
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);

  // Post Creation
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState(null);
  const [newPostPreview, setNewPostPreview] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Interaction States
  const [commentInputs, setCommentInputs] = useState({});
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [savedPosts, setSavedPosts] = useState(new Set());
  const [showBigHeart, setShowBigHeart] = useState(null);

  const username = 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const pRes = await fetch(`http://localhost:8002/get_posts?username=${username}`);
      const pData = await pRes.json();
      setPosts(pData);

      const sRes = await fetch(`http://localhost:8002/get_stories?username=${username}`);
      const sData = await sRes.json();
      setStories(sData);

      const uRes = await fetch(`http://localhost:8002/get_all_users`);
      const uData = await uRes.json();
      setSuggestedUsers((uData || []).filter(u => u.username !== username).slice(0, 5));

      const fRes = await fetch(`http://localhost:8000/api/friends_wellness?username=${username}`);
      const fData = await fRes.json();
      setFriends(fData || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewPostImage(file);
      setNewPostPreview(URL.createObjectURL(file));
    }
  };

  const handleShare = async () => {
    if (!newPostContent.trim() && !newPostImage) return;
    setCreateLoading(true);
    let imageUrl = '';

    try {
      if (newPostImage) {
        const formData = new FormData();
        formData.append('file', newPostImage);
        const uploadRes = await fetch('http://localhost:8002/upload_image', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.image_url) imageUrl = uploadData.image_url;
      }

      const endpoint = createType === 'post' ? 'create_post' : 'create_story';
      await fetch(`http://localhost:8002/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          content: newPostContent,
          image_url: imageUrl,
          caption: newPostContent
        })
      });

      setIsCreateOpen(false);
      setNewPostContent('');
      setNewPostImage(null);
      setNewPostPreview('');
      fetchData();
    } catch (err) {
      console.error("Share Error:", err);
      alert("Failed to share.");
    } finally {
      setCreateLoading(false);
    }
  };

  const toggleLike = async (postId) => {
    const isLiked = likedPosts.has(postId);
    const newLiked = new Set(likedPosts);
    if (isLiked) newLiked.delete(postId);
    else {
        newLiked.add(postId);
        setShowBigHeart(postId);
        setTimeout(() => setShowBigHeart(null), 800);
    }
    setLikedPosts(newLiked);
    try {
      await fetch(`http://localhost:8002/like_post/${postId}`, {
        method: 'POST'
      });
    } catch (err) { console.error(err); }
  };

  const submitComment = async (postId, e) => {
    if (e && e.key !== 'Enter') return;
    const comment = commentInputs[postId];
    if (!comment || !comment.trim()) return;

    try {
      await fetch(`http://localhost:8002/comment/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment })
      });
      setCommentInputs({ ...commentInputs, [postId]: '' });
      fetchData(); // Refresh to show new comment
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setStoryProgress(0);
    } else {
      setIsStoryViewerOpen(false);
    }
  };

  return (
    <div className="ig-wrapper">
      
      {/* ── SIDEBAR (BACK AS BEFORE) ── */}
      <div className="ig-sidebar">
        <div className="ig-logo">
          <span>Instagram</span>
        </div>
        
        <div className="ig-nav">
          <div className="ig-nav-item active">
            <div className="ig-nav-icon"><Home size={24} /></div> Home
          </div>
          <div className="ig-nav-item">
            <div className="ig-nav-icon"><Search size={24} /></div> Explore
          </div>
          <div className="ig-nav-item">
            <div className="ig-nav-icon"><MessageCircle size={24} /></div> Messages
          </div>
          <div className="ig-nav-item" onClick={() => setIsCreateOpen(true)}>
            <div className="ig-nav-icon"><PlusSquare size={24} /></div> Create
          </div>
          <div className="ig-nav-item">
            <div className="ig-nav-icon">
               <div className="ig-avatar-initial" style={{width:'24px', height:'24px', fontSize:'12px'}}>{username[0].toUpperCase()}</div>
            </div> 
            Profile
          </div>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="ig-main">
        <div className="ig-feed-container">
          
          <div className="ig-feed">
            <div className="ig-stories">
              <div className="ig-story-item current-user" onClick={() => setIsCreateOpen(true)}>
                <div className="ig-story-ring ig-story-add">
                  <div className="ig-story-img" style={{fontSize:'24px', color:'#555'}}>+</div>
                </div>
                <span className="ig-story-user">Your story</span>
              </div>
              
              {stories.map((s, idx) => (
                <div key={s.id} className="ig-story-item" onClick={() => { setCurrentStoryIndex(idx); setIsStoryViewerOpen(true); setStoryProgress(0); }}>
                  <div className="ig-story-ring">
                    <div className="ig-story-img" style={{display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'bold'}}>
                      {s.username[0].toUpperCase()}
                    </div>
                  </div>
                  <span className="ig-story-user">{s.username}</span>
                </div>
              ))}
            </div>

            <div className="feed-list">
              {loading && <div style={{textAlign:'center', marginTop:'40px', color:'#a8a8a8'}}>Syncing feed...</div>}
              
              {posts.map((p) => (
                <div key={p.id} className="ig-post">
                  <div className="ig-post-header">
                    <div className="ig-post-author">
                      <div className="ig-avatar-initial" style={{width:'32px', height:'32px', fontSize:'14px'}}>{p.username[0].toUpperCase()}</div>
                      <span className="ig-post-name">{p.username}</span>
                      <span className="ig-post-time">• Just now</span>
                    </div>
                    <button className="ig-icon-btn"><MoreHorizontal size={20}/></button>
                  </div>

                  <div className="ig-post-media" onDoubleClick={() => toggleLike(p.id)}>
                    {p.image_url ? (
                      <img src={p.image_url} alt="Wellness" />
                    ) : (
                      <div className="ig-post-media-text">{p.content}</div>
                    )}
                    {showBigHeart === p.id && (
                      <div className="big-heart-overlay">
                        <Heart size={80} fill="white" color="white" />
                      </div>
                    )}
                  </div>

                  <div className="ig-post-actions">
                    <div className="ig-actions-left">
                      <button className="ig-icon-btn" onClick={()=>toggleLike(p.id)}>
                        <Heart size={24} fill={likedPosts.has(p.id) ? "#ff3040" : "transparent"} color={likedPosts.has(p.id) ? "#ff3040" : "currentColor"} />
                      </button>
                      <button className="ig-icon-btn"><MessageCircle size={24} /></button>
                      <button className="ig-icon-btn"><Share2 size={24} /></button>
                    </div>
                    <button className="ig-icon-btn">
                      <Bookmark size={24} />
                    </button>
                  </div>

                  <div className="ig-post-likes">{p.likes?.toLocaleString() || 0} likes</div>
                  <div className="ig-post-caption">
                    <strong>{p.username}</strong> {p.content}
                  </div>

                  {/* Comment Feed */}
                  {p.comments && p.comments.length > 0 && (
                    <div className="ig-post-comments" style={{marginTop:'8px', borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:'8px'}}>
                      {p.comments.map((c, i) => (
                        <div key={i} className="ig-comment-item" style={{fontSize:'13px', marginBottom:'4px'}}>
                          <strong style={{marginRight:'6px'}}>admin</strong> {c}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment Input */}
                  <div className="ig-add-comment" style={{marginTop:'12px', display:'flex', alignItems:'center', gap:'10px', background:'rgba(255,255,255,0.03)', borderRadius:'8px', padding:'0 10px'}}>
                    <input 
                      placeholder="Add a comment..." 
                      className="ig-comment-input"
                      style={{flex:1, background:'transparent', border:'none', color:'white', fontSize:'13px', padding:'8px 0', outline:'none'}}
                      value={commentInputs[p.id] || ''}
                      onChange={e => setCommentInputs({...commentInputs, [p.id]: e.target.value})}
                      onKeyDown={e => submitComment(p.id, e)}
                    />
                    <button 
                      style={{background:'none', border:'none', color:'#0095f6', fontWeight:600, fontSize:'13px', cursor:'pointer'}}
                      onClick={() => submitComment(p.id, null)}
                    >
                      Post
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ig-right-panel">
            <div className="ig-rp-user">
              <div className="ig-rp-user-info">
                <div className="ig-avatar-initial" style={{width:'44px', height:'44px', fontSize:'18px'}}>{username[0].toUpperCase()}</div>
                <div>
                  <div className="ig-rp-name">{username}</div>
                  <div className="ig-rp-sub">{friends.length} Mutual Friends</div>
                </div>
              </div>
              <div className="ig-rp-action">Switch</div>
            </div>

            <div className="ig-rp-header">
              <span>Suggested for you</span>
              <span style={{color:'#f5f5f5', cursor:'pointer', fontSize:'12px'}}>See All</span>
            </div>

            {suggestedUsers.map(u => (
              <div key={u.username} className="ig-suggest-item">
                <div className="ig-suggest-info">
                  <div className="ig-avatar-initial" style={{width:'32px', height:'32px', fontSize:'14px', background:'#262626'}}>{u.username[0].toUpperCase()}</div>
                  <div className="ig-suggest-details">
                    <span className="ig-rp-name">{u.username}</span>
                    <span className="ig-rp-sub">Suggested</span>
                  </div>
                </div>
                <div className="ig-rp-action">Follow</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── REFINED CREATE MODAL (Instagram.py Style) ── */}
      {isCreateOpen && (
        <div className="ig-modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="ig-create-modal" onClick={e => e.stopPropagation()}>
            <div className="ig-modal-header">
              <span className="ig-modal-title">Create New Post</span>
              <button className="ig-btn-share" onClick={handleShare} disabled={createLoading}>
                {createLoading ? 'Sharing...' : 'Share'}
              </button>
            </div>

            <div className="ig-create-body">
              <div className="ig-user-intro">
                <div className="ig-avatar-initial">{username[0].toUpperCase()}</div>
                <textarea 
                  className="ig-creation-input" 
                  placeholder="What's on your mind?"
                  value={newPostContent}
                  onChange={e => setNewPostContent(e.target.value)}
                />
              </div>

              <div className="ig-upload-zone" onClick={() => fileInputRef.current.click()}>
                <input type="file" hidden ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
                {newPostPreview ? (
                  <div className="ig-preview-box">
                    <img src={newPostPreview} alt="Preview" />
                    <button style={{position:'absolute', top:10, right:10, background:'rgba(0,0,0,0.6)', border:'none', color:'white', borderRadius:'50%', cursor:'pointer'}} onClick={(e)=>{e.stopPropagation(); setNewPostPreview(''); setNewPostImage(null);}}>✕</button>
                  </div>
                ) : (
                  <>
                    <ImageIcon size={48} color="#555" />
                    <p style={{fontSize:'18px', color:'#a8a8a8'}}>Upload Media</p>
                    <p style={{fontSize:'13px', color:'#737373'}}>Drag and drop or click to browse</p>
                  </>
                )}
              </div>
            </div>

            <div className="ig-modal-footer">
              <button className="ig-switch-btn" onClick={() => setCreateType(createType === 'post' ? 'story' : 'post')}>
                Switch to {createType === 'post' ? 'Story' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STORY VIEWER ── */}
      {isStoryViewerOpen && stories[currentStoryIndex] && (
        <div className="ig-modal-overlay" onClick={() => setIsStoryViewerOpen(false)}>
           <div className="ig-create-modal" style={{maxWidth:'400px', height:'600px', position:'relative'}}>
              <div style={{position:'absolute', top:10, left:10, right:10, height:2, background:'rgba(255,255,255,0.2)', zIndex:10}}>
                <div style={{height:'100%', background:'#fff', width:`${storyProgress}%`}}></div>
              </div>
              <img src={stories[currentStoryIndex].image_url} alt="Story" style={{width:'100%', height:'100%', objectFit:'cover'}} />
              <button style={{position:'absolute', top:20, right:20, background:'none', border:'none', color:'white', fontSize:'24px', cursor:'pointer'}} onClick={()=>setIsStoryViewerOpen(false)}>✕</button>
           </div>
        </div>
      )}

    </div>
  );
};

export default InstagramFeed;
