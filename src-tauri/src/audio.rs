// Audio engine backed by LibVLC via vlc-rs.
//
// Token-in-URL pattern is used exclusively for authenticated media URLs.
// Do NOT switch to HTTP header auth — LibVLC does not reliably forward
// custom headers on Windows (CLAUDE.md critical lesson 2).

use vlc::{Instance, Media, MediaPlayer, MediaPlayerAudioEx};

pub struct AudioPlayer {
    instance: Instance,
    media_player: MediaPlayer,
}

// SAFETY: libvlc is internally thread-safe. The vlc-rs wrappers are thin raw-pointer
// holders with no non-thread-safe Drop or interior mutability outside of libvlc itself.
unsafe impl Send for AudioPlayer {}
unsafe impl Sync for AudioPlayer {}

impl AudioPlayer {
    pub fn new() -> Result<Self, String> {
        let instance = Instance::new()
            .ok_or_else(|| "Failed to initialize LibVLC instance".to_string())?;
        let media_player = MediaPlayer::new(&instance)
            .ok_or_else(|| "Failed to create LibVLC media player".to_string())?;
        Ok(Self { instance, media_player })
    }

    /// Load media from `url`. The caller must append `?token={jwt}` before
    /// calling this — do not use HTTP headers for auth (they are unreliable).
    pub fn load(&self, url: &str) -> Result<(), String> {
        let media = Media::new_location(&self.instance, url)
            .ok_or_else(|| format!("Failed to create LibVLC media from URL: {url}"))?;
        self.media_player.set_media(&media);
        Ok(())
    }

    pub fn play(&self) -> Result<(), String> {
        self.media_player
            .play()
            .map_err(|_| "LibVLC play() returned an error".to_string())
    }

    pub fn pause(&self) {
        self.media_player.pause();
    }

    /// Seek to `secs` seconds from the start.
    pub fn seek(&self, secs: f64) -> Result<(), String> {
        // set_time takes milliseconds
        self.media_player.set_time((secs * 1000.0) as i64);
        Ok(())
    }

    pub fn set_speed(&self, rate: f32) -> Result<(), String> {
        self.media_player
            .set_rate(rate)
            .map_err(|_| "LibVLC set_rate() returned an error".to_string())
    }

    /// Set playback volume. VLC range is 0–200 (100 = 100 %).
    pub fn set_volume(&self, vol: i32) -> Result<(), String> {
        self.media_player
            .set_volume(vol)
            .map_err(|_| "LibVLC set_volume() returned an error".to_string())
    }

    /// Returns current playback position in seconds.
    pub fn position(&self) -> f64 {
        // get_time returns milliseconds, or None if no media is loaded
        self.media_player.get_time().unwrap_or(0) as f64 / 1000.0
    }

    /// Returns total media duration in seconds.
    pub fn duration(&self) -> f64 {
        // duration() on Media returns milliseconds
        self.media_player
            .get_media()
            .and_then(|m| m.duration())
            .unwrap_or(0) as f64
            / 1000.0
    }

    pub fn is_playing(&self) -> bool {
        self.media_player.is_playing()
    }
}
