use std::ffi::CStr;
use std::os::raw::c_char;
use std::ffi::c_void;
use serde::{Deserialize, Serialize};

// Only the FFI symbols needed for from_preset are declared here; the full set
// (set/apply/disable) lives in audio.rs alongside the AudioPlayer that owns the handle.
extern "C" {
    fn libvlc_audio_equalizer_new_from_preset(index: u32) -> *mut c_void;
    fn libvlc_audio_equalizer_release(p_equalizer: *mut c_void);
    fn libvlc_audio_equalizer_get_preamp(p_eq: *mut c_void) -> f32;
    fn libvlc_audio_equalizer_get_amp_at_index(p_eq: *mut c_void, band: u32) -> f32;
    fn libvlc_audio_equalizer_get_band_count() -> u32;
    fn libvlc_audio_equalizer_get_preset_name(index: u32) -> *const c_char;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EqSettings {
    pub enabled: bool,
    pub preamp: f32,
    pub bands: [f32; 10],
    pub preset_name: Option<String>,
}

impl Default for EqSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            preamp: 0.0,
            bands: [0.0; 10],
            preset_name: None,
        }
    }
}

impl EqSettings {
    /// Load one of LibVLC's built-in presets by index into an EqSettings.
    pub fn from_preset(index: u32) -> Self {
        unsafe {
            let eq = libvlc_audio_equalizer_new_from_preset(index);
            if eq.is_null() {
                return Self::default();
            }
            let preamp = libvlc_audio_equalizer_get_preamp(eq);
            let count = (libvlc_audio_equalizer_get_band_count() as usize).min(10);
            let mut bands = [0.0f32; 10];
            for i in 0..count {
                bands[i] = libvlc_audio_equalizer_get_amp_at_index(eq, i as u32);
            }
            let name_ptr = libvlc_audio_equalizer_get_preset_name(index);
            let preset_name = if name_ptr.is_null() {
                None
            } else {
                Some(CStr::from_ptr(name_ptr).to_string_lossy().into_owned())
            };
            libvlc_audio_equalizer_release(eq);
            Self { enabled: true, preamp, bands, preset_name }
        }
    }

    /// Read persisted settings from disk. Returns `Default` if the file does
    /// not exist or cannot be parsed.
    pub fn load() -> Self {
        let path = match eq_path() {
            Some(p) => p,
            None => return Self::default(),
        };
        let bytes = match std::fs::read(&path) {
            Ok(b) => b,
            Err(_) => return Self::default(),
        };
        serde_json::from_slice(&bytes).unwrap_or_default()
    }

    /// Persist settings to disk. Silently ignores I/O failures — the EQ will
    /// still work for the current session; it just won't survive a restart.
    pub fn save(&self) {
        let path = match eq_path() {
            Some(p) => p,
            None => return,
        };
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string_pretty(self) {
            let _ = std::fs::write(&path, json);
        }
    }
}

fn eq_path() -> Option<std::path::PathBuf> {
    directories::ProjectDirs::from("com", "skald", "Skald")
        .map(|dirs| dirs.data_local_dir().join("eq.json"))
}
