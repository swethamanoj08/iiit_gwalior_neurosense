import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Plus, Search, X, Camera, Image as ImageIcon, CheckCircle } from 'lucide-react';
import './Feed.css';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeStory, setActiveStory] = useState(null);

  // Create Post Form
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [isStory, setIsStory] = useState(false); // Toggle to post as story instead

  const username = localStorage.getItem('auth_user') || 'guest';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const pRes = await fetch('/api/get_posts');
      const pData = await pRes.json();
      setPosts(pData);

      const sRes = await fetch('/api/get_stories');
      const sData = await sRes.json();
      setStories(sData);

      const fRes = await fetch(`/api/get_following/${username}`);
      const fData = await fRes.json();
      setFollowing(fData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/search_users?q=${q}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFollow = async (targetUser) => {
    const isFollowing = following.includes(targetUser);
    const endpoint = isFollowing ? 'unfollow' : 'follow';
    
    // Optimistic UI update
    if (isFollowing) {
       setFollowing(prev => prev.filter(u => u !== targetUser));
    } else {
       setFollowing(prev => [...prev, targetUser]);
    }

    try {
       await fetch(`/api/${endpoint}/${targetUser}`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ username })
       });
    } catch (err) {
       console.error(err);
    }
  };

  const handleLike = async (id) => {
    // Optimistic UI update
    setPosts(posts.map(post => post.id === id ? { ...post, likes: post.likes + 1 } : post));
    await fetch(`/api/like_post/${id}`, { method: 'POST' });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);

    let imageUrl = '';
    if (newPostImage) {
       const formData = new FormData();
       formData.append('file', newPostImage);
       try {
         const upRes = await fetch('/api/upload_image', {
            method: 'POST',
            body: formData
         });
         const upData = await upRes.json();
         imageUrl = upData.image_url;
       } catch (err) {
         console.error("Upload failed", err);
         setCreateLoading(false);
         return;
       }
    }

    try {
      if (isStory) {
         await fetch('/api/create_story', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, image_url: imageUrl })
         });
      } else {
         await fetch('/api/create_post', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, content: newPostContent, image_url: imageUrl })
         });
      }
      
      // Reset & Reload
      setIsCreateOpen(false);
      setNewPostContent('');
      setNewPostImage(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="feed-container">
      
      {/* HEADER & SEARCH */}
      <header className="feed-header">
        <h2 className="app-title">WellnessGram</h2>
        
        <div className="search-wrapper">
           <div className="search-bar">
              <Search size={18} className="search-icon" />
              <input 
                 type="text" 
                 placeholder="Search users..." 
                 className="search-input"
                 value={searchQuery}
                 onChange={(e) => handleSearch(e.target.value)}
              />
           </div>
           
           {/* Search Dropdown */}
           {searchResults.length > 0 && searchQuery && (
             <div className="search-dropdown">
                {searchResults.map(u => (
                  <div key={u.username} className="search-user-item" onClick={(e) => { e.stopPropagation(); toggleFollow(u.username); }}>
                     <div className="user-info-flex">
                        {u.avatar_url ? (
                           <img src={u.avatar_url.startsWith('http') ? u.avatar_url : `http://127.0.0.1:8000/static/${u.avatar_url}`} className="avatar-small" />
                        ) : (
                           <div className="avatar-fallback">{u.username[0].toUpperCase()}</div>
                        )}
                        <div className="user-names">
                           <span className="uname">{u.username}</span>
                           <span className="rname">{u.name}</span>
                        </div>
                     </div>
                     {u.username !== username && (
                        <button 
                           onClick={(e) => { e.stopPropagation(); toggleFollow(u.username); }}
                           className={`follow-btn ${following.includes(u.username) ? 'following' : 'not-following'}`}
                        >
                           {following.includes(u.username) ? 'Following' : 'Follow'}
                        </button>
                     )}
                  </div>
                ))}
             </div>
           )}
        </div>

        <button 
          onClick={() => setIsCreateOpen(true)}
          className="create-btn"
        >
          <Plus size={18} strokeWidth={3} /> Post
        </button>
      </header>

      {loading ? <div className="empty-feed" style={{border: 'none', backgroundColor: 'transparent'}}>loading your feed...</div> : (
        <>
          {/* STORIES BAR */}
          <div className="stories-bar">
             {/* Add Story Button */}
             <div className="story-item" onClick={() => { setIsStory(true); setIsCreateOpen(true); }}>
                <div className="story-circle add-story">
                   <Plus size={28} className="story-add-icon" strokeWidth={2.5}/>
                   <div className="story-badge">
                      <Plus size={14} strokeWidth={4}/>
                   </div>
                </div>
                <span className="story-name" style={{color: '#94a3b8'}}>Your story</span>
             </div>

             {stories.map(story => (
                <div key={story.id} className="story-item" onClick={() => setActiveStory(story)}>
                   <div className="story-circle story-gradient">
                      <div className="story-inner">
                         {story.avatar_url ? (
                            <img src={story.avatar_url.startsWith('http') ? story.avatar_url : `http://127.0.0.1:8000/static/${story.avatar_url}`} />
                         ) : (
                            <div className="story-fallback">{story.username[0].toUpperCase()}</div>
                         )}
                      </div>
                   </div>
                   <span className="story-name">{story.username}</span>
                </div>
             ))}
          </div>

          {/* POSTS FEED */}
          <div className="feed-posts">
            {posts.length === 0 && <div className="empty-feed">No posts yet. Be the first to share your journey!</div>}
            
            {posts.map((post, index) => (
              <div key={post.id} className="post-card">
                {/* Post Header */}
                <div className="post-header">
                  <div className="post-author">
                    <div className="post-avatar-wrap">
                       <div className="post-avatar-inner">
                          {post.avatar_url ? (
                             <img src={post.avatar_url.startsWith('http') ? post.avatar_url : `http://127.0.0.1:8000/static/${post.avatar_url}`} />
                          ) : <span>{post.username.charAt(0).toUpperCase()}</span>}
                       </div>
                    </div>
                    <div className="post-author-info">
                       <div className="post-author-name-row">
                          <span className="post-author-name">{post.username}</span>
                          {post.username !== username && !following.includes(post.username) && (
                             <button onClick={() => toggleFollow(post.username)} className="feed-action-btn">• Follow</button>
                          )}
                       </div>
                       <span className="post-time">Just now</span>
                    </div>
                  </div>
                  <button className="post-more-btn"><MoreVertical size={20} /></button>
                </div>

                {/* Post Image */}
                {post.image_url && (
                  <div className="post-image">
                    <img src={post.image_url.startsWith('http') ? post.image_url : `http://127.0.0.1:8000/static/${post.image_url}`} alt="Post content" />
                  </div>
                )}

                {/* Post Actions & Content */}
                <div className="post-footer">
                  <div className="post-actions">
                    <div className="action-group">
                      <button className="action-btn like-btn" onClick={() => handleLike(post.id)}>
                         <Heart size={26} strokeWidth={2} />
                      </button>
                      <button className="action-btn"><MessageCircle size={26} strokeWidth={2}/></button>
                      <button className="action-btn"><Send size={26} strokeWidth={2}/></button>
                    </div>
                    <button className="action-btn"><Bookmark size={26} strokeWidth={2}/></button>
                  </div>
                  
                  <div className="post-likes">{post.likes} likes</div>
                  
                  <div className="post-caption">
                    <strong>{post.username}</strong>
                    <span>{post.content}</span>
                  </div>
                  
                  {/* Comments Section */}
                  {post.comments && post.comments.length > 0 && (
                    <div className="post-comments-link">
                      View all {post.comments.length} comments
                    </div>
                  )}
                  
                  <div className="post-add-comment">
                     <div className="comment-avatar">
                        <span>{username[0].toUpperCase()}</span>
                     </div>
                     <input type="text" placeholder="Add a comment..." className="comment-input" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CREATE POST/STORY MODAL */}
      {isCreateOpen && (
        <div className="modal-overlay">
           <div className="modal-content">
              
              <div className="modal-header">
                 <h3>{isStory ? 'Create New Story' : 'Create New Post'}</h3>
                 <button onClick={() => { setIsCreateOpen(false); setIsStory(false); setNewPostImage(null); }} className="close-btn">
                    <X size={20}/>
                 </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="modal-body">
                 
                 {!isStory && (
                    <div className="create-text-area">
                       <div className="avatar-fallback" style={{flexShrink:0}}>{username[0].toUpperCase()}</div>
                       <textarea 
                          placeholder="What's on your mind?"
                          value={newPostContent}
                          onChange={(e) => setNewPostContent(e.target.value)}
                          required={!newPostImage}
                       ></textarea>
                    </div>
                 )}

                 <div className="image-upload-box">
                    <input 
                       type="file" 
                       accept="image/*" 
                       className="file-input"
                       onChange={(e) => setNewPostImage(e.target.files[0])}
                       required={isStory} 
                    />
                    
                    {newPostImage ? (
                       <div className="upload-success">
                          <CheckCircle size={48}/>
                          <p>Media Selected</p>
                          <span>{newPostImage.name}</span>
                       </div>
                    ) : (
                       <div className="upload-placeholder">
                          <div className="upload-icon-circle">
                            <ImageIcon size={32} />
                          </div>
                          <p className="upload-text">Upload Media</p>
                          <p className="upload-sub">Drag and drop or click to browse</p>
                       </div>
                    )}
                 </div>

                 <div className="modal-footer">
                    <button 
                      type="button" 
                      onClick={() => setIsStory(!isStory)} 
                      className="switch-btn"
                    >
                       {isStory ? 'Switch to Post' : 'Switch to Story'}
                    </button>
                    
                    <button 
                       type="submit"
                       disabled={createLoading}
                       className="submit-btn"
                    >
                       {createLoading ? 'Sharing...' : 'Share'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* STORY VIEWER MODAL */}
      {activeStory && (
         <div className="story-viewer-overlay">
            <div className="story-bg-blur" style={{ backgroundImage: `url(${activeStory.image_url.startsWith('http') ? activeStory.image_url : 'http://127.0.0.1:8000/static/' + activeStory.image_url})` }}></div>
            
            <div className="story-viewer-content">
               
               <div className="story-progress">
                  <div className="progress-bar"></div>
                  <div className="progress-bar dim"></div>
               </div>

               <div className="story-header">
                  <img src={activeStory.avatar_url ? (activeStory.avatar_url.startsWith('http') ? activeStory.avatar_url : `http://127.0.0.1:8000/static/${activeStory.avatar_url}`) : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80'} />
                  <span className="username">{activeStory.username}</span>
                  <span className="time">2h</span>
               </div>
               
               <button onClick={() => setActiveStory(null)} className="story-close"><X size={24}/></button>
               
               <img src={activeStory.image_url.startsWith('http') ? activeStory.image_url : `http://127.0.0.1:8000/static/${activeStory.image_url}`} className="story-image" alt="Story" />
               
               <div className="story-reply">
                   <div className="reply-input-wrapper">
                      <input type="text" placeholder={`Reply to ${activeStory.username}...`} />
                   </div>
                   <button className="reply-action"><Heart size={30} strokeWidth={2.5}/></button>
                   <button className="reply-action"><Send size={30} strokeWidth={2.5}/></button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default Feed;
