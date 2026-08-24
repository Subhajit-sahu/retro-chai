import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { sanitizeYouTubeId } from '../../lib/youtube';
import { SITE_CONFIG } from '../../config/site';
import './AdminDashboard.css';

export function AdminDashboard({ isOpen, onClose, onSongsUpdated }) {
  const { user, isAdmin, loading: authLoading, signIn, signOut } = useAdminAuth();

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Admin Data State
  const [adminSongs, setAdminSongs] = useState([]);
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [ytMusicUrl, setYtMusicUrl] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Song Edit / Create Modal State
  const [editingSong, setEditingSong] = useState(null); // null when not editing, object when editing/creating
  const [isNewSong, setIsNewSong] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Fetch all songs (including inactive) for admin
  const fetchAdminCatalogue = async () => {
    if (!isSupabaseConfigured || !supabase || !isAdmin) return;

    try {
      setLoadingData(true);
      const { data: songsData, error: songsErr } = await supabase
        .from('songs')
        .select('*')
        .order('sort_order', { ascending: true });

      if (songsErr) throw songsErr;
      setAdminSongs(songsData || []);

      // Fetch site settings
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('*');

      if (settingsData) {
        settingsData.forEach((row) => {
          if (row.key === 'spotify_url') setSpotifyUrl(row.value);
          if (row.key === 'youtube_music_url') setYtMusicUrl(row.value);
        });
      }
    } catch (err) {
      console.warn('Admin fetch failed:', err);
      setErrorMessage(err.message || 'Failed to load catalogue');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminCatalogue();
    }
  }, [isAdmin]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Open Edit or Add Song Form
  const openEditModal = (song = null) => {
    setFormErrors({});
    if (song) {
      setEditingSong({ ...song });
      setIsNewSong(false);
    } else {
      const nextSortOrder = adminSongs.length > 0
        ? Math.max(...adminSongs.map((s) => s.sort_order || 0)) + 1
        : 1;
      setEditingSong({
        title: '',
        artist: '',
        year: new Date().getFullYear() - 50,
        youtube_id: '',
        artwork_url: '',
        sort_order: nextSortOrder,
        is_active: true
      });
      setIsNewSong(true);
    }
  };

  const closeEditModal = () => {
    setEditingSong(null);
    setFormErrors({});
  };

  // Validate and Save Song
  const handleSaveSong = async (e) => {
    e.preventDefault();
    if (!editingSong) return;

    const errors = {};
    if (!editingSong.title?.trim()) errors.title = 'Title is required';
    if (!editingSong.artist?.trim()) errors.artist = 'Artist is required';

    const cleanYoutubeId = sanitizeYouTubeId(editingSong.youtube_id);
    const hasAudioUrl = Boolean(editingSong.audio_url?.trim());

    if (!cleanYoutubeId && !hasAudioUrl) {
      errors.youtube_id = 'Either a YouTube ID or a Cloud Audio/MP3 URL is required for playback';
    }

    if (editingSong.audio_url && !editingSong.audio_url.startsWith('http')) {
      errors.audio_url = 'Audio URL must start with http:// or https://';
    }

    if (editingSong.artwork_url && !editingSong.artwork_url.startsWith('http')) {
      errors.artwork_url = 'Artwork URL must start with http:// or https://';
    }

    // Active limit check: Max 20 active songs allowed
    const currentActiveCount = adminSongs.filter((s) => s.is_active && s.id !== editingSong.id).length;
    if (editingSong.is_active && currentActiveCount >= SITE_CONFIG.maxActiveSongs) {
      errors.is_active = `Maximum of ${SITE_CONFIG.maxActiveSongs} active songs allowed. Deactivate another song first.`;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setActionMessage('Saving track...');
      setErrorMessage(null);

      const songPayload = {
        title: editingSong.title.trim(),
        artist: editingSong.artist.trim(),
        year: Number(editingSong.year) || null,
        youtube_id: cleanYoutubeId,
        audio_url: editingSong.audio_url?.trim() || null,
        artwork_url: editingSong.artwork_url?.trim() || null,
        sort_order: Number(editingSong.sort_order) || 0,
        is_active: Boolean(editingSong.is_active)
      };

      if (isNewSong) {
        const { error: insertErr } = await supabase
          .from('songs')
          .insert([songPayload]);
        if (insertErr) throw insertErr;
      } else {
        const { error: updateErr } = await supabase
          .from('songs')
          .update(songPayload)
          .eq('id', editingSong.id);
        if (updateErr) throw updateErr;
      }

      setActionMessage('Song saved successfully!');
      closeEditModal();
      await fetchAdminCatalogue();
      if (onSongsUpdated) onSongsUpdated();
    } catch (err) {
      console.warn('Save song error:', err);
      setErrorMessage(`Database rejection: ${err.message}`);
    } finally {
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  // Toggle Song Active state
  const handleToggleActive = async (song) => {
    const nextState = !song.is_active;

    // Check 20 active songs limit
    if (nextState) {
      const activeCount = adminSongs.filter((s) => s.is_active).length;
      if (activeCount >= SITE_CONFIG.maxActiveSongs) {
        setErrorMessage(`Cannot activate song. Maximum limit of ${SITE_CONFIG.maxActiveSongs} active songs reached.`);
        return;
      }
    }

    try {
      const { error: updateErr } = await supabase
        .from('songs')
        .update({ is_active: nextState })
        .eq('id', song.id);

      if (updateErr) throw updateErr;
      await fetchAdminCatalogue();
      if (onSongsUpdated) onSongsUpdated();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Delete Song
  const handleDeleteSong = async (songId) => {
    if (!window.confirm('Are you sure you want to delete this song from the database?')) return;

    try {
      const { error: delErr } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

      if (delErr) throw delErr;
      await fetchAdminCatalogue();
      if (onSongsUpdated) onSongsUpdated();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setActionMessage('Updating links...');
      const updates = [
        supabase.from('site_settings').upsert({ key: 'spotify_url', value: spotifyUrl }),
        supabase.from('site_settings').upsert({ key: 'youtube_music_url', value: ytMusicUrl })
      ];
      await Promise.all(updates);
      setActionMessage('External links updated successfully!');
      if (onSongsUpdated) onSongsUpdated();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div 
        className="admin-modal-container" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Admin Management Portal"
      >
        {/* Modal Header */}
        <div className="admin-modal-header">
          <div className="admin-header-title-box">
            <span className="admin-badge">ADMIN CONTROL</span>
            <h2 className="admin-title">Chai Adda Management</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="admin-close-btn"
            aria-label="Close admin modal"
          >
            ✕
          </button>
        </div>

        {/* Global Notifications */}
        {actionMessage && (
          <div className="admin-toast success" role="status">
            {actionMessage}
          </div>
        )}
        {errorMessage && (
          <div className="admin-toast error" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Modal Body */}
        <div className="admin-modal-content">
          {!isSupabaseConfigured ? (
            <div className="admin-info-card">
              <h3>Supabase Not Configured</h3>
              <p>
                To enable live song catalogue management and Realtime listener count, configure 
                <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file.
              </p>
              <p className="sub-note">
                Chai Adda is currently serving the curated 20-song fallback catalogue in read-only mode.
              </p>
            </div>
          ) : authLoading ? (
            <div className="admin-loading-state">Checking authentication...</div>
          ) : !user ? (
            /* Login View */
            <div className="admin-login-card">
              <h3>Owner Authentication</h3>
              <p className="login-desc">
                Sign in with your Supabase credentials. Only user accounts listed in the{' '}
                <code>admin_users</code> table have write authorization via database RLS.
              </p>
              {authError && <div className="admin-auth-error">{authError}</div>}
              <form onSubmit={handleLogin} className="admin-auth-form">
                <div className="form-group">
                  <label htmlFor="admin-email">Admin Email</label>
                  <input
                    id="admin-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@chaiadda.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="admin-password">Password</label>
                  <input
                    id="admin-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="admin-submit-btn"
                >
                  {authSubmitting ? 'Signing in...' : 'Sign In as Owner'}
                </button>
              </form>
            </div>
          ) : !isAdmin ? (
            /* Access Denied View */
            <div className="admin-denied-card">
              <h3>Access Denied</h3>
              <p>
                You are signed in as <strong>{user.email}</strong>, but your User ID is not present in the{' '}
                <code>public.admin_users</code> database allowlist table.
              </p>
              <div className="user-id-box">
                <span>Your User UUID:</span>
                <code>{user.id}</code>
              </div>
              <p className="sql-hint">
                Run this SQL in your Supabase SQL Editor to grant admin privileges:
              </p>
              <pre className="sql-code-block">
{`INSERT INTO public.admin_users (user_id) 
VALUES ('${user.id}');`}
              </pre>
              <button type="button" onClick={signOut} className="admin-logout-btn">
                Sign Out
              </button>
            </div>
          ) : (
            /* Admin Dashboard Panel */
            <div className="admin-panel-layout">
              {/* Top Controls Bar */}
              <div className="admin-panel-topbar">
                <div className="catalogue-stats">
                  <span className="stats-pill">
                    Active Tracks: <strong>{adminSongs.filter((s) => s.is_active).length} / {SITE_CONFIG.maxActiveSongs}</strong>
                  </span>
                  <span className="stats-pill">
                    Total Songs: <strong>{adminSongs.length}</strong>
                  </span>
                </div>
                <div className="admin-top-actions">
                  <button
                    type="button"
                    onClick={() => openEditModal(null)}
                    className="admin-add-song-btn"
                  >
                    + Add New Track
                  </button>
                  <button
                    type="button"
                    onClick={signOut}
                    className="admin-logout-btn-small"
                  >
                    Sign Out
                  </button>
                </div>
              </div>

              {/* External Links Section */}
              <details className="admin-section-collapsible">
                <summary className="admin-section-title">Configure External Playlist Links</summary>
                <form onSubmit={handleSaveSettings} className="settings-inline-form">
                  <div className="settings-input-group">
                    <label>Spotify URL</label>
                    <input
                      type="url"
                      value={spotifyUrl}
                      onChange={(e) => setSpotifyUrl(e.target.value)}
                      placeholder="https://open.spotify.com/playlist/..."
                    />
                  </div>
                  <div className="settings-input-group">
                    <label>YouTube Music URL</label>
                    <input
                      type="url"
                      value={ytMusicUrl}
                      onChange={(e) => setYtMusicUrl(e.target.value)}
                      placeholder="https://music.youtube.com/playlist/..."
                    />
                  </div>
                  <button type="submit" className="save-settings-btn">
                    Update Links
                  </button>
                </form>
              </details>

              {/* Songs Table */}
              <div className="admin-songs-table-wrapper">
                <table className="admin-songs-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th style={{ width: '50px' }}>Art</th>
                      <th>Title & Artist</th>
                      <th>Year</th>
                      <th>YouTube ID</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminSongs.map((song, idx) => (
                      <tr key={song.id} className={song.is_active ? '' : 'row-inactive'}>
                        <td className="col-idx">{song.sort_order || idx + 1}</td>
                        <td>
                          <img
                            src={song.artwork_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80'}
                            alt=""
                            className="table-art-thumb"
                          />
                        </td>
                        <td>
                          <div className="table-song-title">{song.title}</div>
                          <div className="table-song-artist">{song.artist}</div>
                        </td>
                        <td>{song.year || '—'}</td>
                        <td>
                          <code className="yt-id-tag">{song.youtube_id}</code>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(song)}
                            className={`status-toggle-btn ${song.is_active ? 'active' : 'inactive'}`}
                          >
                            {song.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-actions">
                            <button
                              type="button"
                              onClick={() => openEditModal(song)}
                              className="action-edit-btn"
                              title="Edit song"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSong(song.id)}
                              className="action-del-btn"
                              title="Delete song"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Song Edit / Add Modal */}
        {editingSong && (
          <div className="sub-modal-backdrop" onClick={closeEditModal}>
            <div className="sub-modal-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sub-modal-header">
                <h3>{isNewSong ? 'Add New Curated Track' : 'Edit Track'}</h3>
                <button type="button" onClick={closeEditModal} className="sub-close-btn">✕</button>
              </div>

              <form onSubmit={handleSaveSong} className="edit-song-form">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    required
                    value={editingSong.title || ''}
                    onChange={(e) => setEditingSong({ ...editingSong, title: e.target.value })}
                    placeholder="e.g. Lag Ja Gale"
                  />
                  {formErrors.title && <span className="field-error">{formErrors.title}</span>}
                </div>

                <div className="form-group">
                  <label>Artist *</label>
                  <input
                    type="text"
                    required
                    value={editingSong.artist || ''}
                    onChange={(e) => setEditingSong({ ...editingSong, artist: e.target.value })}
                    placeholder="e.g. Lata Mangeshkar"
                  />
                  {formErrors.artist && <span className="field-error">{formErrors.artist}</span>}
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Year</label>
                    <input
                      type="number"
                      value={editingSong.year || ''}
                      onChange={(e) => setEditingSong({ ...editingSong, year: e.target.value })}
                      placeholder="1964"
                    />
                  </div>
                  <div className="form-group">
                    <label>Sort Order</label>
                    <input
                      type="number"
                      value={editingSong.sort_order || 0}
                      onChange={(e) => setEditingSong({ ...editingSong, sort_order: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Direct Audio Stream URL (Supabase Storage / Cloud MP3)</label>
                  <input
                    type="url"
                    value={editingSong.audio_url || ''}
                    onChange={(e) => setEditingSong({ ...editingSong, audio_url: e.target.value })}
                    placeholder="https://.../storage/v1/object/public/songs/track.mp3"
                  />
                  {formErrors.audio_url && <span className="field-error">{formErrors.audio_url}</span>}
                </div>

                <div className="form-group">
                  <label>YouTube Video ID or URL (Optional Fallback)</label>
                  <input
                    type="text"
                    value={editingSong.youtube_id || ''}
                    onChange={(e) => setEditingSong({ ...editingSong, youtube_id: e.target.value })}
                    placeholder="e.g. s5R83D4-8Yw or https://youtu.be/..."
                  />
                  {formErrors.youtube_id && <span className="field-error">{formErrors.youtube_id}</span>}
                </div>

                <div className="form-group">
                  <label>Artwork Image URL (HTTPS)</label>
                  <input
                    type="url"
                    value={editingSong.artwork_url || ''}
                    onChange={(e) => setEditingSong({ ...editingSong, artwork_url: e.target.value })}
                    placeholder="https://..."
                  />
                  {formErrors.artwork_url && <span className="field-error">{formErrors.artwork_url}</span>}
                </div>

                <div className="form-group-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={editingSong.is_active}
                      onChange={(e) => setEditingSong({ ...editingSong, is_active: e.target.checked })}
                    />
                    <span>Active in Public Playlist (Curated 20)</span>
                  </label>
                  {formErrors.is_active && <span className="field-error">{formErrors.is_active}</span>}
                </div>

                <div className="sub-modal-footer">
                  <button type="button" onClick={closeEditModal} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    Save Track
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
