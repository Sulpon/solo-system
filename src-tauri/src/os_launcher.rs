// Phase 19 - Atlas OS v1's application launcher. This is the ONLY place
// Atlas ever spawns a desktop process, and it never runs a caller-supplied
// path or command: the frontend can only ever send a short `application_id`
// string (see app/(app)/_lib/os/application-registry.ts for the mirrored,
// user-facing side of this same registry - JARVIS resolves natural language
// to one of these same ids before it ever reaches here). `resolve_launch_path`
// below is the single source of truth for what each id is allowed to launch;
// there is no path from an id to an arbitrary executable, shell command, or
// argument list.
//
// Verification is real, not assumed: every candidate path is checked with
// `Path::exists()` BEFORE anything is spawned, so "not installed" is
// reported honestly instead of firing a launch that silently does nothing
// (a known limitation of Windows' `start`/`ShellExecute`-style launching,
// which this deliberately avoids - see the Phase 19 report).
use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;

#[derive(Serialize)]
pub struct LaunchApplicationResult {
    pub success: bool,
    pub application_id: String,
    pub error_code: Option<String>,
    pub message: Option<String>,
}

fn env_path(var: &str) -> Option<PathBuf> {
    std::env::var(var).ok().map(PathBuf::from)
}

// Each entry is a short, hardcoded list of the well-known install locations
// real installers for that application actually use on Windows - not a
// filesystem search, not a registry query, not a PATH lookup. A custom,
// non-default install location will honestly report "not found" (see the
// Phase 19 report's Known Limitations) rather than guess.
fn candidate_paths(application_id: &str) -> Vec<PathBuf> {
    match application_id {
        "chrome" => [env_path("ProgramFiles"), env_path("ProgramFiles(x86)"), env_path("LOCALAPPDATA")]
            .into_iter()
            .flatten()
            .map(|base| base.join("Google").join("Chrome").join("Application").join("chrome.exe"))
            .collect(),
        "edge" => [env_path("ProgramFiles(x86)"), env_path("ProgramFiles")]
            .into_iter()
            .flatten()
            .map(|base| base.join("Microsoft").join("Edge").join("Application").join("msedge.exe"))
            .collect(),
        "vscode" => {
            let mut paths = Vec::new();
            if let Some(local_app_data) = env_path("LOCALAPPDATA") {
                paths.push(local_app_data.join("Programs").join("Microsoft VS Code").join("Code.exe"));
            }
            if let Some(program_files) = env_path("ProgramFiles") {
                paths.push(program_files.join("Microsoft VS Code").join("Code.exe"));
            }
            paths
        }
        "spotify" => env_path("APPDATA").into_iter().map(|base| base.join("Spotify").join("Spotify.exe")).collect(),
        // A Windows built-in, always present - kept specifically so a
        // native-integration test can verify a real launch succeeds without
        // depending on any third-party app being installed in CI (see the
        // Phase 19 report's testing section).
        "notepad" => env_path("SystemRoot").into_iter().map(|base| base.join("System32").join("notepad.exe")).collect(),
        _ => Vec::new(),
    }
}

fn resolve_launch_path(application_id: &str) -> Option<PathBuf> {
    candidate_paths(application_id).into_iter().find(|path| path.exists())
}

#[tauri::command]
pub fn launch_application(application_id: String) -> LaunchApplicationResult {
    let candidates = candidate_paths(&application_id);
    if candidates.is_empty() {
        return LaunchApplicationResult {
            success: false,
            application_id: application_id.clone(),
            error_code: Some("APPLICATION_NOT_SUPPORTED".to_string()),
            message: Some(format!("\"{application_id}\" is not a registered application.")),
        };
    }

    let Some(path) = resolve_launch_path(&application_id) else {
        return LaunchApplicationResult {
            success: false,
            application_id: application_id.clone(),
            error_code: Some("APPLICATION_NOT_FOUND".to_string()),
            message: Some(format!("Could not find an installed copy of \"{application_id}\" in its known locations.")),
        };
    };

    match Command::new(&path).spawn() {
        Ok(_) => LaunchApplicationResult { success: true, application_id, error_code: None, message: None },
        Err(error) => LaunchApplicationResult {
            success: false,
            application_id: application_id.clone(),
            error_code: Some("LAUNCH_FAILED".to_string()),
            message: Some(format!("Found \"{application_id}\" but could not launch it ({error}).")),
        },
    }
}

// Phase 19 - native-side tests. Deliberately never spawns Chrome/Edge/
// VS Code/Spotify (their presence in CI or a dev machine is not
// guaranteed) - "notepad" is a Windows built-in that is always present,
// making it the one safe application id these tests can genuinely launch
// end-to-end and assert real success on, exactly the "safe test mechanism"
// approach the Phase 19 spec asks for. Everything else here is pure
// path-resolution logic with no process spawned at all.
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unregistered_application_has_no_candidate_paths() {
        assert!(candidate_paths("photoshop").is_empty());
    }

    #[test]
    fn every_registered_application_has_at_least_one_candidate_path() {
        for id in ["chrome", "edge", "vscode", "spotify", "notepad"] {
            assert!(!candidate_paths(id).is_empty(), "{id} should have at least one candidate path");
        }
    }

    #[test]
    fn notepad_a_windows_builtin_is_always_resolvable() {
        // Real filesystem check, not a guess - proves resolve_launch_path
        // does honest pre-flight verification rather than assuming success.
        assert!(resolve_launch_path("notepad").is_some());
    }

    #[test]
    fn unsupported_application_returns_structured_failure_without_attempting_a_launch() {
        let result = launch_application("photoshop".to_string());
        assert!(!result.success);
        assert_eq!(result.error_code.as_deref(), Some("APPLICATION_NOT_SUPPORTED"));
    }

    // Native integration: genuinely spawns the real, built-in Notepad and
    // asserts the command's own report of success is real, not assumed.
    #[test]
    fn launching_notepad_genuinely_succeeds() {
        let result = launch_application("notepad".to_string());
        assert!(result.success, "expected notepad to launch successfully: {:?}", result.message);
        assert_eq!(result.error_code, None);
    }
}
