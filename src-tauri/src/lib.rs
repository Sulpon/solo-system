// Atlas is a real Next.js application (Route Handlers, a Supabase auth
// proxy/middleware, cookie-based session refresh - see the repo audit in
// this milestone's report) - it is NOT statically exported. This shell
// therefore always points its window at a real, running Next.js server
// rather than Tauri's bundled static-asset protocol:
//
// - In development, `tauri.conf.json`'s `beforeDevCommand`/`devUrl` already
//   run `npm run dev` and wait for it to be reachable before this binary
//   even starts, so `setup()` just needs to open a window at that URL.
// - In a release build, there is no separately-running dev server, so this
//   file spawns the bundled Next.js "standalone" server (see
//   `npm run build:desktop`) as a child process first, waits for it to
//   start accepting connections, then opens the window - and kills that
//   child process again when Atlas exits, so no orphaned server survives a
//   closed window.
//
// Milestone 3 adds a system tray, a global shortcut, and window position/
// size persistence on top of that unchanged foundation. All of it lives
// here (or in the small plugins registered below) rather than in the
// frontend - see app/(app)/_lib/desktop/ for the JS-side half of this
// boundary (still just "show/hide the existing focus-companion window,"
// never a second window or a second way to create one).
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{
    AppHandle, LogicalPosition, Manager, Monitor, Position, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg(not(debug_assertions))]
use std::process::Child;
#[cfg(not(debug_assertions))]
use std::sync::Mutex;
use tauri::RunEvent;

#[cfg(not(debug_assertions))]
const APP_PORT: u16 = 3000;
#[cfg(debug_assertions)]
const DEV_URL: &str = "http://localhost:3000";

#[cfg(not(debug_assertions))]
struct ServerProcess(Mutex<Option<Child>>);

// The base URL the running Next.js server is reachable at - resolved once in
// setup() (differs between `next dev` in debug builds and the bundled
// standalone server in release builds) and stashed in managed state so the
// tray/global-shortcut paths (which have no JS execution context to ask the
// main window to compute this) can build the Focus Companion's URL the same
// way create_main_window built the main window's.
struct AppBaseUrl(String);

const FOCUS_COMPANION_LABEL: &str = "focus-companion";
// Must stay numerically identical to FOCUS_COMPANION_WIDTH/HEIGHT/MIN_*/
// SCREEN_MARGIN_* in app/(app)/_lib/desktop/focus-companion-window.ts. Two
// independent "create the Companion" implementations exist because JS needs
// its own (QuestExecutionControl's buttons run in the main window's webview)
// and Rust needs its own (the tray and the global shortcut have no webview
// to call into) - both always find/reuse the SAME native window by the same
// "focus-companion" label, so this is a constants duplication, not a second
// window or a second piece of state.
const FOCUS_COMPANION_WIDTH: f64 = 320.0;
const FOCUS_COMPANION_HEIGHT: f64 = 440.0;
const FOCUS_COMPANION_MIN_WIDTH: f64 = 280.0;
const FOCUS_COMPANION_MIN_HEIGHT: f64 = 340.0;
const SCREEN_MARGIN_RIGHT: f64 = 24.0;
const SCREEN_MARGIN_BOTTOM: f64 = 60.0;
// The minimum on-screen overlap (in physical pixels) a restored window must
// have with some monitor before it's considered "visible enough" - matches
// roughly the Companion's own drag-region header height, so if a window
// clears this bar the user can always still grab it and pull it fully
// on-screen themselves.
const MIN_VISIBLE_OVERLAP_PX: i32 = 40;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Built once up front (not inside setup()) so the exact same Shortcut
    // value can be registered in setup() AND compared against in the
    // plugin's handler below - see Shortcut's PartialEq derive, which is
    // what lets the handler tell "was THIS our Ctrl+Shift+A" apart from any
    // other shortcut a future milestone might register.
    let companion_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyA);
    let companion_shortcut_for_handler = companion_shortcut;

    let builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed && *shortcut == companion_shortcut_for_handler {
                        toggle_focus_companion_window(app);
                    }
                })
                .build(),
        )
        // Fully automatic once registered: restores each window's saved
        // position/size on creation (main and focus-companion alike,
        // whichever side created them) and persists changes as the user
        // moves/resizes, writing to disk on RunEvent::Exit. See
        // ensure_window_within_visible_bounds below for the "saved position
        // is no longer on any monitor" safety net this alone doesn't cover.
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(tauri_plugin_window_state::StateFlags::POSITION | tauri_plugin_window_state::StateFlags::SIZE)
                .build(),
        )
        // A small local plugin (not a published crate - just the same
        // Builder/on_window_ready mechanism tauri-plugin-window-state itself
        // uses above) so ensure_window_within_visible_bounds runs for EVERY
        // window creation regardless of which side created it: Rust
        // (create_main_window/create_focus_companion_window) or JS
        // (app/(app)/_lib/desktop/focus-companion-window.ts's
        // showFocusCompanionWindow, the far more common Companion path via
        // TAKE QUEST). Registered after window-state so its restore always
        // runs first and this only ever corrects an already-restored
        // position, never races it. This only covers window CREATION -
        // see show_focus_companion_window/toggle_focus_companion_window for
        // the same check on the "already exists, just re-showing it" path.
        .plugin(
            // Explicit <Wry, ()> because this is tauri's own generic
            // plugin::Builder<R, C = ()> (unlike the third-party plugin
            // Builders above, which hardcode their own config type
            // internally) - Wry is the same runtime tauri::Builder::default()
            // itself defaults to (and the same one every bare `AppHandle`/
            // `WebviewWindow` in this file already resolves to), and () is
            // the right config type since this plugin takes no
            // tauri.conf.json configuration of its own.
            tauri::plugin::Builder::<tauri::Wry, ()>::new("atlas-window-bounds")
                .on_window_ready(|window| {
                    if let Some(webview_window) = window.app_handle().get_webview_window(window.label()) {
                        ensure_window_within_visible_bounds(&webview_window);
                    }
                })
                .build(),
        )
        // Registered with defaults: OFF until the user opts in from
        // Settings (see app/(app)/_lib/desktop/autostart.ts) and no extra
        // launch arguments - an autostart-triggered launch behaves exactly
        // like a normal one.
        .plugin(tauri_plugin_autostart::Builder::new().build());

    #[cfg(not(debug_assertions))]
    let builder = builder.manage(ServerProcess(Mutex::new(None)));

    let app = builder
        .setup(move |app| {
            let handle = app.handle().clone();

            #[cfg(debug_assertions)]
            let base_url = DEV_URL.to_string();

            #[cfg(not(debug_assertions))]
            let base_url = {
                let child = spawn_atlas_server(&handle)?;
                app.state::<ServerProcess>().0.lock().unwrap().replace(child);
                wait_for_server(APP_PORT);
                format!("http://127.0.0.1:{APP_PORT}")
            };

            app.manage(AppBaseUrl(base_url));

            let main_window = create_main_window(&handle)?;
            // Closing the main window now means "hide to tray," matching
            // how the Companion's own close button already behaves (see
            // Milestone 2) - the ONLY way to fully terminate Atlas going
            // forward is the tray's "Quit Atlas" item, which is the
            // intentional design for a persistent desktop companion (see
            // this milestone's spec). Without a working tray icon this
            // would strand the user with no way back to a hidden main
            // window short of a restart - see the report's Known
            // Limitations for that tradeoff.
            let main_window_to_hide = main_window.clone();
            main_window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = main_window_to_hide.hide();
                }
            });

            if let Err(error) = app.global_shortcut().register(companion_shortcut) {
                #[cfg(debug_assertions)]
                eprintln!(
                    "[Atlas] Could not register the global shortcut Ctrl+Shift+A ({error}). \
                     Another application likely already owns it - the Companion can still be \
                     shown/hidden from the tray or its own window."
                );
                let _ = error;
            }

            build_tray(&handle)?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Atlas");

    app.run(|app_handle, event| {
        // The natural "last window closed" path no longer really happens
        // (both windows hide instead of closing - see above and Milestone
        // 2), so in practice this now only fires via the tray's explicit
        // Quit, which calls AppHandle::exit and triggers this same
        // ExitRequested event. Kept as-is (rather than folded into
        // quit_app) so any other path that might still reach a natural
        // exit - e.g. `taskkill`-adjacent OS shutdown signals Tauri is able
        // to intercept - is covered too.
        if let RunEvent::ExitRequested { .. } = event {
            kill_server_process(app_handle);
        }
    });
}

fn create_main_window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let base_url = app.state::<AppBaseUrl>().0.clone();
    let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(base_url.parse().expect("invalid Atlas server URL")))
        .title("Atlas")
        // A sensible default for the existing dashboard layout - not a
        // cramped mobile-style window. Still fully resizable; this is just
        // the size Atlas opens at on a first-ever launch (tauri-plugin-
        // window-state overrides this with a saved size/position on every
        // later launch).
        .inner_size(1440.0, 900.0)
        .min_inner_size(1024.0, 700.0)
        .resizable(true)
        .center()
        .build()?;

    Ok(window)
}

// The single place both the tray and the global shortcut go through to
// create the Companion window when it doesn't exist yet in the current
// process (e.g. the tray's "Show Focus Companion" clicked before any Quest
// has ever been taken this session) - mirrors
// app/(app)/_lib/desktop/focus-companion-window.ts's showFocusCompanionWindow
// exactly (same label, same size/flags/URL shape) since that's the far more
// common path (TAKE QUEST) and the two must never drift into visibly
// different windows.
fn create_focus_companion_window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let base_url = app.state::<AppBaseUrl>().0.clone();
    let companion_url = format!("{base_url}/focus-companion");
    let (x, y) = compute_default_companion_position(app);

    let window = WebviewWindowBuilder::new(app, FOCUS_COMPANION_LABEL, WebviewUrl::External(companion_url.parse().expect("invalid Focus Companion URL")))
        .title("Atlas Focus")
        .inner_size(FOCUS_COMPANION_WIDTH, FOCUS_COMPANION_HEIGHT)
        .min_inner_size(FOCUS_COMPANION_MIN_WIDTH, FOCUS_COMPANION_MIN_HEIGHT)
        .position(x, y)
        .always_on_top(true)
        .decorations(false)
        .resizable(true)
        .skip_taskbar(true)
        .shadow(true)
        .visible(true)
        .focused(true)
        .build()?;

    Ok(window)
}

fn compute_default_companion_position(app: &AppHandle) -> (f64, f64) {
    match app.primary_monitor() {
        Ok(Some(monitor)) => {
            let scale = monitor.scale_factor();
            let size = monitor.size().to_logical::<f64>(scale);
            let position = monitor.position().to_logical::<f64>(scale);
            (
                position.x + size.width - FOCUS_COMPANION_WIDTH - SCREEN_MARGIN_RIGHT,
                position.y + size.height - FOCUS_COMPANION_HEIGHT - SCREEN_MARGIN_BOTTOM,
            )
        }
        _ => (0.0, 0.0),
    }
}

// Guards against tauri-plugin-window-state restoring a position left over
// from a monitor that's since been disconnected, resized, or rearranged -
// the plugin persists whatever position was last observed but has no way to
// know that position is still valid on THIS launch. Called right after every
// window creation/show, once the (possibly just-restored) position is
// final: if the window doesn't meaningfully overlap any currently-connected
// monitor, it's moved back to the same bottom-right default a first-ever
// launch would use, on whatever monitor is primary now.
fn ensure_window_within_visible_bounds(window: &WebviewWindow) {
    let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size()) else {
        return;
    };
    let Ok(monitors) = window.available_monitors() else {
        return;
    };

    let window_left = position.x;
    let window_top = position.y;
    let window_right = position.x + size.width as i32;
    let window_bottom = position.y + size.height as i32;

    let visible_on_some_monitor = monitors.iter().any(|monitor| overlap_px(window_left, window_top, window_right, window_bottom, monitor) >= MIN_VISIBLE_OVERLAP_PX);

    if visible_on_some_monitor {
        return;
    }

    let (x, y) = compute_default_companion_position(window.app_handle());
    let _ = window.set_position(Position::Logical(LogicalPosition { x, y }));
}

// The shorter side of the overlap rectangle between a window's bounds and
// one monitor, in physical pixels - both 0 (no overlap) and a negative
// result (no overlap, further apart) are treated the same by the caller's
// `>= MIN_VISIBLE_OVERLAP_PX` check.
fn overlap_px(window_left: i32, window_top: i32, window_right: i32, window_bottom: i32, monitor: &Monitor) -> i32 {
    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let monitor_left = monitor_position.x;
    let monitor_top = monitor_position.y;
    let monitor_right = monitor_position.x + monitor_size.width as i32;
    let monitor_bottom = monitor_position.y + monitor_size.height as i32;

    let overlap_width = window_right.min(monitor_right) - window_left.max(monitor_left);
    let overlap_height = window_bottom.min(monitor_bottom) - window_top.max(monitor_top);

    overlap_width.min(overlap_height)
}

fn show_focus_companion_window(app: &AppHandle) {
    match app.get_webview_window(FOCUS_COMPANION_LABEL) {
        Some(window) => {
            ensure_window_within_visible_bounds(&window);
            let _ = window.show();
            let _ = window.set_focus();
        }
        None => {
            let _ = create_focus_companion_window(app);
        }
    }
}

fn hide_focus_companion_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(FOCUS_COMPANION_LABEL) {
        let _ = window.hide();
    }
}

fn toggle_focus_companion_window(app: &AppHandle) {
    match app.get_webview_window(FOCUS_COMPANION_LABEL) {
        Some(window) => {
            if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
            } else {
                ensure_window_within_visible_bounds(&window);
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        None => {
            let _ = create_focus_companion_window(app);
        }
    }
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open_atlas = MenuItem::with_id(app, "open-atlas", "Open Atlas", true, None::<&str>)?;
    let show_companion = MenuItem::with_id(app, "show-companion", "Show Focus Companion", true, None::<&str>)?;
    let hide_companion = MenuItem::with_id(app, "hide-companion", "Hide Focus Companion", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit-atlas", "Quit Atlas", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open_atlas, &show_companion, &hide_companion, &PredefinedMenuItem::separator(app)?, &quit])?;

    // Reuses Atlas's own bundled icon (embedded at compile time, so it
    // works from the installed app's resource layout too) rather than a
    // second, separately-maintained tray-only asset.
    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))?;

    TrayIconBuilder::new()
        .icon(icon)
        .tooltip("Atlas")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open-atlas" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "show-companion" => show_focus_companion_window(app),
            "hide-companion" => hide_focus_companion_window(app),
            "quit-atlas" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}

fn kill_server_process(app: &AppHandle) {
    #[cfg(not(debug_assertions))]
    if let Some(state) = app.try_state::<ServerProcess>() {
        if let Some(mut child) = state.0.lock().unwrap().take() {
            let _ = child.kill();
        }
    }
    let _ = app;
}

#[cfg(not(debug_assertions))]
fn spawn_atlas_server(app: &tauri::AppHandle) -> tauri::Result<Child> {
    use std::process::{Command, Stdio};

    // `npm run build:desktop` (see package.json / tauri.conf.json's
    // beforeBuildCommand) produces `.next/standalone`, which
    // `tauri.conf.json`'s bundle.resources copies into the installed app's
    // resource directory alongside `.next/static` and `public` - Next.js's
    // own documented layout for a self-contained standalone server.
    let resource_dir = app.path().resource_dir()?;
    let standalone_dir = resource_dir.join(".next").join("standalone");
    let server_js = standalone_dir.join("server.js");

    let child = Command::new("node")
        .arg(&server_js)
        .current_dir(&standalone_dir)
        .env("PORT", APP_PORT.to_string())
        .env("HOSTNAME", "127.0.0.1")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| {
            tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!(
                    "Failed to start the Atlas server ({}). Is Node.js installed and on PATH? Milestone 1 relies on the system's Node runtime - see the desktop migration report.",
                    error
                ),
            ))
        })?;

    Ok(child)
}

#[cfg(not(debug_assertions))]
fn wait_for_server(port: u16) {
    use std::net::TcpStream;
    use std::time::Duration;

    // The bundled Next.js standalone server starts in well under this
    // budget in practice; this is a simple readiness poll, not a health
    // check for anything beyond "is something listening yet."
    for _ in 0..60 {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return;
        }
        std::thread::sleep(Duration::from_millis(250));
    }
}
